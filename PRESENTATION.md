---
marp: true
paginate: true
---

# OpenObserve Codebase Overview
## For CTOs and Technology Leaders

---
# Repository Layout
- Rust backend in `src` directory
- Web frontend in `web` (Vue/Vite)
- Infrastructure tools and tests under `benchmarks`, `deploy`, and `tests`
- Additional data like `ua_regex` and `screenshots`

Output of `tree -L 1 -d` shows top level directories:
```
.
├── benchmarks
├── deploy
├── screenshots
├── src
├── tests
├── ua_regex
└── web
```

---
# Technology Stack
- Rust 2024 edition, published under AGPL-3.0 license
- Key metadata from `Cargo.toml`:
```
[package]
description = "OpenObserve is an observability platform that allows you to capture, search, and analyze your logs, metrics, and traces."
edition = "2024"
license = "AGPL-3.0-only"
name = "openobserve"
```
- Extensive dependency set for async networking, storage, and analytics
- Web UI built with Vue3 and Vite (`web/README.md`)

---
# Feature Highlights
Lines from `README.md` describe major capabilities:
- **Logs, Metrics, Traces** with OpenTelemetry support
- **Real User Monitoring** including session replay
- **Dashboards, Reports, Alerts** with 18+ chart types
- **Pipelines** to enrich or normalize data
- **SQL and PromQL** query options
- **Single binary or HA installations**
- **Versatile storage**: local disk, S3, MinIO, GCS, Azure
- **High availability**, **Dynamic schema**, **Built-in auth**
- **Multilingual UI** with 11 languages

---
# Example Architecture (WebSocket Router)
Excerpt from `src/router/http/ws/mod.rs` documents the architecture:
```
// WebSocket v2 Implementation for Router-Querier Communication
// * `WsHandler`: Main handler for client WebSocket connections
// * `QuerierConnectionPool`: Manages persistent WebSocket connections to querier nodes
// * `SessionManager`: Tracks client sessions and their querier mappings
// * `QuerierConnection`: Handles individual WebSocket connections to querier nodes
// Flow:
// 1. Client establishes WebSocket connection with Router
// 2. Router creates session and validates authentication
// 3. Client sends requests with trace_ids
// 4. Router maps trace_ids to querier nodes using consistent hashing
// 5. Router maintains persistent connections to queriers
// 6. Responses are routed back to clients using trace_ids
```

---
# Testing Infrastructure
- API tests written in Python with `pytest`
```
# pytest-openobserve
## Getting Started
- We use `rye` to manage the python version and environment
- `rye sync`
- `rye run pytest`
```
- UI tests via Cypress as described in `tests/ui-testing/README.md`

---
# Strengths
- Modern Rust codebase with async support
- Rich feature set for observability (logs, metrics, traces, RUM)
- Scalable design with HA and clustering
- Comprehensive web UI and APIs
- Multiple storage backends and flexible deployment options

---
# Challenges / Weak Points
- Large dependency tree and complex build (e.g., `cargo check` may need additional tools)
- AGPL license may affect commercial adoption
- Test TODOs indicate areas for improvement in automation
- Complexity of features may require steep learning curve for new contributors

---
# Conclusion
OpenObserve offers a feature-rich observability platform implemented in Rust with a modern Vue frontend. Its architecture supports scalable deployments and advanced analytics. Evaluate build tooling and licensing implications when adopting.
