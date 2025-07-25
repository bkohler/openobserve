// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// Copyright 2025 OpenObserve Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

use std::{any::Any, cmp::Ordering, sync::Arc};

use arrow_schema::{DataType, Field, Schema, SchemaBuilder, SchemaRef, SortOptions};
use async_trait::async_trait;
use config::get_config;
use datafusion::{
    catalog::Session,
    common::{Result, Statistics, ToDFSchema, plan_err, project_schema},
    datasource::{
        TableProvider,
        file_format::parquet::ParquetFormat,
        get_statistics_with_limit,
        listing::{ListingOptions, ListingTableConfig, ListingTableUrl, PartitionedFile},
        physical_plan::{FileScanConfig, ParquetSource},
    },
    error::DataFusionError,
    execution::{
        cache::{cache_manager::FileStatisticsCache, cache_unit::DefaultFileStatisticsCache},
        context::SessionState,
    },
    logical_expr::{Expr, SortExpr, TableProviderFilterPushDown, TableType, utils::conjunction},
    physical_expr::{LexOrdering, PhysicalSortExpr, create_physical_expr, expressions},
    physical_plan::{ExecutionPlan, PhysicalExpr, empty::EmptyExec},
};
use futures::{
    StreamExt,
    future::{self, try_join_all},
    stream,
};
use hashbrown::HashMap;
use helpers::*;
use object_store::ObjectStore;
use parquet_reader::NewParquetFileReaderFactory;
use tokio::sync::Semaphore;

use crate::service::search::index::IndexCondition;

pub mod catalog;
pub mod empty_table;
mod helpers;
pub mod memtable;
mod parquet_reader;
pub mod uniontable;

#[derive(Debug)]
pub(crate) struct NewListingTable {
    table_paths: Vec<ListingTableUrl>,
    /// File fields only
    file_schema: SchemaRef,
    /// File fields + partition columns
    table_schema: SchemaRef,
    diff_rules: HashMap<String, DataType>,
    options: ListingOptions,
    collected_statistics: FileStatisticsCache,
    index_condition: Option<IndexCondition>,
    fst_fields: Vec<String>,
    need_optimize_partition: bool,
}

impl NewListingTable {
    /// Create new [`ListingTable`] that lists the FS to get the files
    /// to scan. See [`ListingTable`] for and example.
    ///
    /// Takes a `ListingTableConfig` as input which requires an `ObjectStore` and `table_path`.
    /// `ListingOptions` and `SchemaRef` are optional.  If they are not
    /// provided the file type is inferred based on the file suffix.
    /// If the schema is provided then it must be resolved before creating the table
    /// and should contain the fields of the file without the table
    /// partitioning columns.
    pub fn try_new(
        config: ListingTableConfig,
        rules: HashMap<String, DataType>,
        index_condition: Option<IndexCondition>,
        fst_fields: Vec<String>,
        need_optimize_partition: bool,
    ) -> Result<Self> {
        let file_schema = config
            .file_schema
            .ok_or_else(|| DataFusionError::Internal("No schema provided.".into()))?;

        let options = config
            .options
            .ok_or_else(|| DataFusionError::Internal("No ListingOptions provided".into()))?;

        // Add the partition columns to the file schema
        let mut builder = SchemaBuilder::from(file_schema.as_ref().to_owned());
        for (part_col_name, part_col_type) in &options.table_partition_cols {
            builder.push(Field::new(part_col_name, part_col_type.clone(), false));
        }

        let table = Self {
            table_paths: config.table_paths,
            file_schema,
            table_schema: Arc::new(builder.finish()),
            diff_rules: rules,
            options,
            collected_statistics: Arc::new(DefaultFileStatisticsCache::default()),
            index_condition,
            fst_fields,
            need_optimize_partition,
        };

        Ok(table)
    }

    /// Set the [`FileStatisticsCache`] used to cache parquet file statistics.
    ///
    /// Setting a statistics cache on the `SessionContext` can avoid refetching statistics
    /// multiple times in the same session.
    ///
    /// If `None`, creates a new [`DefaultFileStatisticsCache`] scoped to this query.
    pub fn with_cache(mut self, cache: Option<FileStatisticsCache>) -> Self {
        self.collected_statistics =
            cache.unwrap_or(Arc::new(DefaultFileStatisticsCache::default()));
        self
    }

    /// If file_sort_order is specified, creates the appropriate physical expressions
    fn try_create_output_ordering(&self) -> Result<Vec<LexOrdering>> {
        create_ordering(&self.table_schema, &self.options.file_sort_order)
    }

    /// Get the list of files for a scan as well as the file level statistics.
    /// The list is grouped to let the execution plan know how the files should
    /// be distributed to different threads / executors.
    async fn list_files_for_scan<'a>(
        &'a self,
        ctx: &'a SessionState,
        limit: Option<usize>,
    ) -> Result<(Vec<Vec<PartitionedFile>>, Statistics)> {
        let store = if let Some(url) = self.table_paths.first() {
            ctx.runtime_env().object_store(url)?
        } else {
            return Ok((vec![], Statistics::new_unknown(&self.file_schema)));
        };
        // list files
        let file_list = future::try_join_all(
            self.table_paths
                .iter()
                .map(|table_path| list_files(store.as_ref(), table_path)),
        )
        .await?;
        let file_list = stream::iter(file_list).flatten();
        // collect the statistics if required by the config
        let files = file_list
            .map(|part_file| async {
                let mut part_file = part_file?;
                if self.options.collect_stat {
                    let statistics = self.do_collect_statistics(ctx, &store, &part_file).await?;
                    part_file.statistics = Some(statistics.clone());
                    Ok((part_file, Arc::new(statistics)))
                        as Result<(PartitionedFile, Arc<Statistics>)>
                } else {
                    Ok((
                        part_file,
                        Arc::new(Statistics::new_unknown(&self.file_schema)),
                    )) as Result<(PartitionedFile, Arc<Statistics>)>
                }
            })
            .boxed()
            .buffered(ctx.config_options().execution.meta_fetch_concurrency);

        let (files, statistics) =
            get_statistics_with_limit(files, self.schema(), limit, self.options.collect_stat)
                .await?;

        let semaphore = std::sync::Arc::new(Semaphore::new(get_config().limit.cpu_num));
        let mut tasks = Vec::with_capacity(files.len());
        for mut file in files.into_iter() {
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let task = tokio::task::spawn(async move {
                let access_plan = generate_access_plan(&file);
                if let Some(access_plan) = access_plan {
                    file.extensions = Some(access_plan as _);
                }
                drop(permit);
                file
            });
            tasks.push(task)
        }
        let files = try_join_all(tasks)
            .await
            .map_err(|e| DataFusionError::External(Box::new(e)))?;

        Ok((
            split_files(files, self.options.target_partitions),
            statistics,
        ))
    }

    /// Collects statistics for a given partitioned file.
    ///
    /// This method first checks if the statistics for the given file are already cached.
    /// If they are, it returns the cached statistics.
    /// If they are not, it infers the statistics from the file and stores them in the cache.
    async fn do_collect_statistics(
        &self,
        ctx: &SessionState,
        store: &Arc<dyn ObjectStore>,
        part_file: &PartitionedFile,
    ) -> Result<Statistics> {
        let statistics_cache = self.collected_statistics.clone();
        match statistics_cache
            .get_with_extra(&part_file.object_meta.location, &part_file.object_meta)
        {
            Some(statistics) => Ok(statistics.as_ref().clone()),
            None => {
                let statistics = self
                    .options
                    .format
                    .infer_stats(ctx, store, self.file_schema.clone(), &part_file.object_meta)
                    .await
                    .map_err(|e| {
                        log::error!(
                            "Failed to infer stats for file: {}, error: {}",
                            part_file.object_meta.location,
                            e
                        );
                        e
                    })?;
                statistics_cache.put_with_extra(
                    &part_file.object_meta.location,
                    statistics.clone().into(),
                    &part_file.object_meta,
                );
                Ok(statistics)
            }
        }
    }

    async fn create_physical_plan(
        &self,
        state: &SessionState,
        conf: FileScanConfig,
        filters: Option<&Arc<dyn PhysicalExpr>>,
    ) -> Result<Arc<dyn ExecutionPlan>> {
        let Some(parquet) = self.options.format.as_any().downcast_ref::<ParquetFormat>() else {
            return plan_err!("ParquetFormat not found");
        };

        let mut predicate = None;
        let mut metadata_size_hint = None;

        // If enable pruning then combine the filters to build the predicate.
        // If disable pruning then set the predicate to None, thus readers
        // will not prune data based on the statistics.
        if parquet.enable_pruning() {
            if let Some(pred) = filters.cloned() {
                predicate = Some(pred);
            }
        }
        if let Some(metadata) = parquet.metadata_size_hint() {
            metadata_size_hint = Some(metadata);
        }

        let mut source = ParquetSource::new(parquet.options().clone());

        let store = state.runtime_env().object_store(&conf.object_store_url)?;
        source = source
            .with_parquet_file_reader_factory(Arc::new(NewParquetFileReaderFactory::new(store)));
        if let Some(predicate) = predicate {
            source = source.with_predicate(Arc::clone(&conf.file_schema), predicate);
        }
        if let Some(metadata_size_hint) = metadata_size_hint {
            source = source.with_metadata_size_hint(metadata_size_hint)
        }

        Ok(conf.with_source(Arc::new(source)).build())
    }
}

#[async_trait]
impl TableProvider for NewListingTable {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn schema(&self) -> SchemaRef {
        Arc::clone(&self.table_schema)
    }

    fn table_type(&self) -> TableType {
        TableType::Base
    }

    async fn scan(
        &self,
        state: &dyn Session,
        projection: Option<&Vec<usize>>,
        filters: &[Expr],
        limit: Option<usize>,
    ) -> Result<Arc<dyn ExecutionPlan>> {
        // TODO (https://github.com/apache/datafusion/issues/11600) remove downcast_ref from here?
        let session_state = state.as_any().downcast_ref::<SessionState>().unwrap();
        let (mut partitioned_file_lists, statistics) =
            self.list_files_for_scan(session_state, limit).await?;

        let projected_schema = project_schema(&self.schema(), projection)?;

        // if no files need to be read, return an `EmptyExec`
        if partitioned_file_lists.is_empty() {
            return Ok(Arc::new(EmptyExec::new(projected_schema)));
        }

        let output_ordering = self.try_create_output_ordering()?;
        match state
            .config_options()
            .execution
            .split_file_groups_by_statistics
            .then(|| {
                output_ordering.first().map(|output_ordering| {
                    FileScanConfig::split_groups_by_statistics(
                        &self.table_schema,
                        &partitioned_file_lists,
                        output_ordering,
                    )
                })
            })
            .flatten()
        {
            Some(Err(e)) => log::debug!("failed to split file groups by statistics: {e}"),
            Some(Ok(new_groups)) => match self.options.target_partitions.cmp(&new_groups.len()) {
                Ordering::Equal => {
                    partitioned_file_lists = new_groups;
                }
                Ordering::Greater => {
                    if self.need_optimize_partition {
                        partitioned_file_lists =
                            repartition_sorted_groups(new_groups, self.options.target_partitions);
                    } else {
                        partitioned_file_lists = new_groups;
                    }
                }
                Ordering::Less => {
                    log::debug!(
                        "attempted to split file groups by statistics, but there were more file groups: {} than target_partitions: {}; falling back to unordered",
                        new_groups.len(),
                        self.options.target_partitions
                    )
                }
            },
            None => {
                log::debug!("did't set split_file_groups_by_statistics");
            } // no ordering required
        };

        log::debug!(
            "after partition, target_partitions: {}, file groups: {}",
            self.options.target_partitions,
            partitioned_file_lists.len()
        );

        // extract types of partition columns
        let table_partition_cols = self
            .options
            .table_partition_cols
            .iter()
            .map(|col| Ok(self.table_schema.field_with_name(&col.0)?.clone()))
            .collect::<Result<Vec<_>>>()?;

        let filters = if let Some(expr) = conjunction(filters.to_vec()) {
            // NOTE: Use the table schema (NOT file schema) here because `expr` may contain
            // references to partition columns.
            let table_df_schema = self.table_schema.as_ref().clone().to_dfschema()?;
            let filters = create_physical_expr(&expr, &table_df_schema, state.execution_props())?;
            Some(filters)
        } else {
            None
        };

        let object_store_url = if let Some(url) = self.table_paths.first() {
            url.object_store()
        } else {
            return Ok(Arc::new(EmptyExec::new(Arc::new(Schema::empty()))));
        };

        let (parquet_projection, filter_projection) =
            if let Some(index_condition) = self.index_condition.as_ref() {
                // get the projection for the filter
                let mut filter_projection =
                    index_condition.get_schema_projection(self.schema(), &self.fst_fields);
                if let Some(v) = projection.as_ref() {
                    filter_projection.extend(v.iter().copied());
                }
                filter_projection.sort();
                filter_projection.dedup();
                // regenerate the projection with the filter_projection
                let projection = projection.as_ref().map(|p| {
                    p.iter()
                        .filter_map(|i| filter_projection.iter().position(|f| f == i))
                        .collect::<Vec<_>>()
                });
                (Some(filter_projection), projection)
            } else {
                (projection.cloned(), None)
            };
        let parquet_projection = parquet_projection.as_ref();
        let filter_projection = filter_projection.as_ref();

        // create the execution plan
        let parquet_exec = self
            .create_physical_plan(
                session_state,
                FileScanConfig::new(
                    object_store_url,
                    Arc::clone(&self.file_schema),
                    self.options.format.file_source(),
                )
                .with_file_groups(partitioned_file_lists)
                .with_statistics(statistics)
                .with_projection(parquet_projection.cloned())
                .with_limit(limit)
                .with_output_ordering(output_ordering)
                .with_table_partition_cols(table_partition_cols),
                filters.as_ref(),
            )
            .await?;

        let projection_exec = apply_projection(
            &self.schema(),
            &self.diff_rules,
            parquet_projection,
            parquet_exec,
        )?;

        // if the index condition can remove filter, we can skip the config
        // feature_query_remove_filter_with_index
        let can_remove_filter = self
            .index_condition
            .as_ref()
            .map(|v| v.can_remove_filter())
            .unwrap_or(true);
        if can_remove_filter || get_config().common.feature_query_remove_filter_with_index {
            apply_filter(
                self.index_condition.as_ref(),
                &projection_exec.schema(),
                &self.fst_fields,
                projection_exec,
                filter_projection,
            )
        } else {
            Ok(projection_exec)
        }
    }

    fn supports_filters_pushdown(
        &self,
        filters: &[&Expr],
    ) -> Result<Vec<TableProviderFilterPushDown>> {
        let support: Vec<_> = filters
            .iter()
            .map(|filter| {
                if expr_applicable_for_cols(
                    &self
                        .options
                        .table_partition_cols
                        .iter()
                        .map(|x| x.0.clone())
                        .collect::<Vec<_>>(),
                    filter,
                ) {
                    // if filter can be handled by partition pruning, it is exact
                    TableProviderFilterPushDown::Exact
                } else {
                    // otherwise, we still might be able to handle the filter with file
                    // level mechanisms such as Parquet row group pruning.
                    TableProviderFilterPushDown::Inexact
                }
            })
            .collect();
        Ok(support)
    }
}

// 1. first get larger group
// 2. split larger groups based on odd and even numbers
// 3. loop until the group reaches the number of partitions
fn repartition_sorted_groups(
    mut groups: Vec<Vec<PartitionedFile>>,
    partition_num: usize,
) -> Vec<Vec<PartitionedFile>> {
    if groups.is_empty() {
        return groups;
    }

    while groups.len() < partition_num {
        let max_index = find_max_group_index(&groups);
        let max_group = groups.remove(max_index);

        // if the max group has less than 3 files, we don't split it further
        // less than 3 will cause repartitionExec issue
        if max_group.len() <= 3 {
            groups.push(max_group);
            break;
        }

        // split max_group into odd and even groups
        let group_cap = max_group.len().div_ceil(2);
        let mut odd_group = Vec::with_capacity(group_cap);
        let mut even_group = Vec::with_capacity(group_cap);

        for (idx, file) in max_group.into_iter().enumerate() {
            if idx % 2 == 0 {
                even_group.push(file);
            } else {
                odd_group.push(file);
            }
        }

        if !odd_group.is_empty() {
            groups.push(odd_group);
        }
        if !even_group.is_empty() {
            groups.push(even_group);
        }
    }

    groups
}

// find the index of the group with the most files
fn find_max_group_index(groups: &[Vec<PartitionedFile>]) -> usize {
    groups
        .iter()
        .enumerate()
        .fold(0, |max_index, (idx, group)| {
            if group.len() > groups[max_index].len() {
                idx
            } else {
                max_index
            }
        })
}

fn create_ordering(schema: &Schema, sort_order: &[Vec<SortExpr>]) -> Result<Vec<LexOrdering>> {
    let mut all_sort_orders = vec![];

    for exprs in sort_order {
        // Construct PhysicalSortExpr objects from Expr objects:
        let mut sort_exprs = LexOrdering::default();
        for sort in exprs {
            match &sort.expr {
                Expr::Column(col) => match expressions::col(&col.name, schema) {
                    Ok(expr) => {
                        sort_exprs.push(PhysicalSortExpr {
                            expr,
                            options: SortOptions {
                                descending: !sort.asc,
                                nulls_first: sort.nulls_first,
                            },
                        });
                    }
                    // Cannot find expression in the projected_schema, stop iterating
                    // since rest of the orderings are violated
                    Err(_) => break,
                },
                expr => {
                    return plan_err!(
                        "Expected single column references in output_ordering, got {expr}"
                    );
                }
            }
        }
        if !sort_exprs.is_empty() {
            all_sort_orders.push(sort_exprs);
        }
    }
    Ok(all_sort_orders)
}
