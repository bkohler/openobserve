// logsPage.js
import { expect } from '@playwright/test';
const { chromium } = require('playwright');
import { dateTimeButtonLocator, relative30SecondsButtonLocator, absoluteTabLocator, Past30SecondsValue } from '../pages/CommonLocator.js';
import logData from '../cypress/fixtures/log.json';

export class LogsPage {
  constructor(page) {

    this.page = page;

    this.orgDropdown = '[data-test="navbar-organizations-select"]';
    this.defaultOrgOption = this.page.getByRole('option', { name: 'default', exact: true }).locator('div').nth(2);
    this.logsMenuItem = page.locator('[data-test="menu-link-\\/logs-item"]');
    this.indexDropDown = page.locator('[data-test="logs-search-index-list"]').getByText('arrow_drop_down');
    this.streamToggle = page.locator('[data-test="log-search-index-list-stream-toggle-default"] div');
    this.exploreButton = page.getByRole('button', { name: 'Explore' });
    this.timestampColumnMenu = page.locator('[data-test="log-table-column-1-_timestamp"] [data-test="table-row-expand-menu"]');

    this.filterMessage = page.locator('div:has-text("info Adjust filter parameters and click \'Run query\'")');

    this.dateTimeButton = dateTimeButtonLocator;
    this.relative30SecondsButton = page.locator(relative30SecondsButtonLocator);

    this.sqlModeToggle = this.page.getByRole('switch', { name: 'SQL Mode' }).locator('div').nth(2)

    this.absoluteTab = absoluteTabLocator;

    this.homeButton = "[name ='home']";


    this.timeZoneDropdown = "//label[contains(@class,'timezone-select')]";
    this.timeZoneOption = (zone) => `role=option[name="${zone}"]`;
    this.dateSelector = (day) => `//div[contains(@class,'q-date__calendar-item--in')]/button/span[contains(@class,'q-btn__content')]/span[text()='${day}']`;
    this.monthSelector = (month) => `//span[text() ='${month}']`;
    this.yearSelector = (year) => `//span[text() ='${year}']`;
    this.startTimeField = "input[class = 'q-field__native q-placeholder']:nth-of-type(2)";
    this.endTimeField = "input[class = 'q-field__native q-placeholder']:nth-of-type(3)";
    this.scheduleText = "//i[text() ='schedule']/following-sibling::span";
    this.calendarDate = "//div[contains(@class,'q-date__calendar-item--in')]/button/span[contains(@class,'q-btn__content')]/span[text()='";
    this.startTimeInput = "input[class = 'q-field__native q-placeholder']:nth-child(2)";
    this.endTimeInput = "input[class = 'q-field__native q-placeholder']:nth-child(3)";
    this.timezoneSelector = "//label[contains(@class,'timezone-select')]";

    this.streamDropdown = '[data-test="log-search-index-list-select-stream"]';
    this.queryButton = "[data-test='logs-search-bar-refresh-btn']";
    this.queryEditor = '[data-test="logs-search-bar-query-editor"]';
    this.quickModeToggle = '[data-test="logs-search-bar-quick-mode-toggle-btn"]';

    this.profileButton = page.locator('[data-test="header-my-account-profile-icon"]');
    this.signOutButton = page.getByText('Sign Out');

    // Search Partition locators
    this.searchPartitionButton = page.locator('[data-test="logs-search-partition-btn"]');
    this.partitionDropdown = page.locator('[data-test="logs-search-partition-dropdown"]');
    this.partitionOption = (option) => page.getByRole('option', { name: option });
    this.partitionValueInput = page.locator('[data-test="logs-search-partition-value-input"]');
    this.partitionApplyButton = page.locator('[data-test="logs-search-partition-apply-btn"]');
    this.partitionClearButton = page.locator('[data-test="logs-search-partition-clear-btn"]');
    this.partitionActiveIndicator = page.locator('[data-test="logs-search-partition-active"]');

  }

  async selectOrganization() {
    await this.page.locator(this.orgDropdown).getByText('arrow_drop_down').click();
    await this.defaultOrgOption.click();
  }


  async navigateToLogs() {
    // Click on Logs menu item
    await this.page.locator(this.homeButton).hover();
    await this.logsMenuItem.click();
    await this.page.waitForTimeout(3000);
    // await expect(this.page.locator('[data-test="logs-search-no-stream-selected-text"]')).toContainText('info Select a stream and press \'Run query\' to continue. Additionally, you can apply additional filters and adjust the date range to enhance search.');
  }

  async validateLogsPage() {
    await expect(this.page.locator('[data-test="logs-search-no-stream-selected-text"]')).toContainText('info Select a stream and press \'Run query\' to continue. Additionally, you can apply additional filters and adjust the date range to enhance search.');
  }

  async logsPageDefaultMultiOrg() {
    await this.page.waitForTimeout(2000);
    await this.page.reload();
    await this.page.locator('[data-test="navbar-organizations-select"]').getByText('arrow_drop_down').click();
    await this.page.waitForTimeout(2000);
    await this.page.getByRole('option', { name: 'defaulttestmulti' }).locator('div').nth(2).click();
  }

  async logsPageURLValidation() {
    // TODO: fix the test
    // await expect(this.page).not.toHaveURL(/default/);
  }

  async selectIndexAndStream() {
    // Select index and stream
    await this.indexDropDown.click();
    await this.streamToggle.first().click();
    // await this.page.waitForTimeout(3000);
    await this.streamToggle.nth(2).click();
  }

  async selectIndexAndStreamJoin() {
    await this.page.locator('[data-test="logs-search-index-list"]').getByText('arrow_drop_down').click();
    await this.page.waitForTimeout(3000);
    await this.page.locator('[data-test="log-search-index-list-stream-toggle-default"] div').first().click();
    await this.page.waitForTimeout(3000);
    await this.page.locator('[data-test="log-search-index-list-stream-toggle-e2e_automate"] div').first().click();
    await this.page.waitForTimeout(3000);
  }

  async selectRunQuery() {

    await this.page.locator(this.queryButton).click();
    await this.page.waitForTimeout(5000);
  }

  async setTimeToPast30Seconds() {
    // Set the time filter to the last 30 seconds
    await expect(this.page.locator(this.dateTimeButton)).toBeVisible();
    await this.page.locator(this.dateTimeButton).click();
    await this.relative30SecondsButton.click();

  }

  async verifyTimeSetTo30Seconds() {
    // Verify that the time filter displays "Past 30 Seconds"
    await expect(this.page.locator(this.dateTimeButton)).toContainText(Past30SecondsValue);
  }

  async enableSQLMode() {
    await this.sqlModeToggle.click();
  }

  async setDateTime() {
    await expect(this.page.locator(this.dateTimeButton)).toBeVisible();
    await this.page.locator(this.dateTimeButton).click();
    await this.page.locator(this.absoluteTab).click();
    await this.page.waitForTimeout(1000);

  }

  async setAbsoluteDate(year, month, day, currentMonth, currentYear) {
    // await this.page.locator(this.dateTimeButton).click();
    // await this.page.getByText(" Absolute ").click();

    if (currentMonth.includes(month) && year === currentYear.toString()) {
      await this.page.locator(this.calendarDate + day + "']").dblclick();
    } else if (year === currentYear.toString()) {
      await this.page.getByText(currentMonth).click();
      await this.page.locator("//span[text() ='" + month + "']").click();
      await this.page.locator("//span[text() ='" + day + "']").dblclick();
    } else {
      await this.page.getByText(currentMonth).click();
      await this.page.locator("//span[text() ='" + month + "']").click();
      await this.page.locator("//span[text() ='" + currentYear + "']").click();
      await this.page.locator("//span[text() ='" + year + "']").click();
      await this.page.locator("//span[text() ='" + day + "']").dblclick();
    }
  }

  async setStartAndEndTime(startTime, endTime) {
    await this.page.locator(this.startTimeInput).fill(startTime);
    await this.page.locator(this.endTimeInput).fill(endTime);
  }

  async setTimeRange(startTime, endTime) {
    await this.page.locator(this.startTimeField).fill(startTime);
    await this.page.locator(this.endTimeField).fill(endTime);
  }

  async verifySchedule(expectedTime) {
    const schedule = await this.page.locator(this.scheduleText).textContent();
    expect(schedule).toEqual(expectedTime);
  }

  async setTimeZone(zone) {
    await this.page.locator(this.timeZoneDropdown).click();
    await this.page.getByRole(this.timeZoneOption(zone)).click();
  }

  async changeTimeZone() {
    await this.page.locator("//label[contains(@class,'timezone-select')]").click()
    await this.page.getByRole('option', { name: 'Asia/Dubai' }).click()
  }

  async verifyDateTime(startTime, endTime) {
    await expect(this.page.locator(this.dateTimeButton)).toContainText(`${startTime} - ${endTime}`);
  }

  async copyShare() {
    const browser = await chromium.launch();

    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const page = await context.newPage();
    await page.locator("[title ='Share Link']").click();
    const copiedUrl = await page.evaluate(() => navigator.clipboard.readText())
    console.log(copiedUrl);
    // console.log(Copied text: ${copiedUrl})
    const newpage = await context.newPage()
    await newpage.waitForTimeout(5000)
    await newpage.goto(copiedUrl)
    console.log(newpage.url())
    expect(copiedUrl).toContain('short')
  }

  async getScheduleText() {
    return await this.page.locator("//button[(@data-test ='date-time-btn')]/span[contains(@class,'q-btn__content')]/span").textContent();
  }

  async selectStream(stream) {
    await this.page.waitForTimeout(4000);
    await this.page.locator(this.streamDropdown).click({ force: true });
    await this.page.locator("div.q-item").getByText(`${stream}`).first().click({ force: true });
  }

  async applyQuery() {
    const search = this.page.waitForResponse(logData.applyQuery);
    await this.page.waitForTimeout(3000);
    await this.page.locator("[data-test='logs-search-bar-refresh-btn']").click({
      force: true,
    });
    await expect.poll(async () => (await search).status()).toBe(200);
  }

  async applyQueryButton(expectedUrl) {
    const searchResponse = this.page.waitForResponse(expectedUrl);
    await this.page.waitForTimeout(3000);
    await this.page.locator(this.queryButton).click({ force: true });
    await expect.poll(async () => (await searchResponse).status()).toBe(200);
  }

  async clearAndRunQuery() {
    await this.page.locator(this.queryButton).click();
    await this.page.getByRole('switch', { name: 'SQL Mode' }).locator('div').nth(2).click();
    await this.page.locator(this.queryEditor).click();
    await this.page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.waitForTimeout(3000);
    await this.page.locator(this.queryButton).click();
    await this.page.getByText("SQL query is missing or invalid. Please submit a valid SQL statement.").click();
  }


  async kubernetesContainerName() {
    await this.page.getByLabel('Expand "kubernetes_container_name"').click();
    await this.page.waitForTimeout(5000);
    await this.page.locator('[data-test="logs-search-subfield-add-kubernetes_container_name-ziox"] [data-test="log-search-subfield-list-equal-kubernetes_container_name-field-btn"]').click();

  }

  async kubernetesContainerNameJoin() {
    await this.page
      .locator('[data-test="logs-search-bar-query-editor"]')
      .locator(".inputarea")
      .fill('SELECT a.kubernetes_container_name , b.kubernetes_container_name  FROM "default" as a join "e2e_automate" as b on a.kubernetes_container_name  = b.kubernetes_container_name');
    await this.page.waitForTimeout(5000);
  }

  async kubernetesContainerNameJoinLimit() {
    await this.page
      .locator('[data-test="logs-search-bar-query-editor"]')
      .locator(".inputarea")
      .fill('SELECT a.kubernetes_container_name , b.kubernetes_container_name  FROM "default" as a join "e2e_automate" as b on a.kubernetes_container_name  = b.kubernetes_container_name LIMIT 10');
    await this.page.waitForTimeout(5000);
  }


  async kubernetesContainerNameJoinLike() {
    await this.page
      .locator('[data-test="logs-search-bar-query-editor"]')
      .locator(".inputarea")
      .fill('SELECT a.kubernetes_container_name , b.kubernetes_container_name  FROM "default" as a join "e2e_automate" as b on a.kubernetes_container_name  = b.kubernetes_container_name WHERE a.kubernetes_container_name LIKE "%ziox%"');
    await this.page.waitForTimeout(5000);
  }

  async kubernetesContainerNameLeftJoin() {
    await this.page
      .locator('[data-test="logs-search-bar-query-editor"]')
      .locator(".inputarea")
      .fill('SELECT a.kubernetes_container_name , b.kubernetes_container_name  FROM "default" as a LEFT JOIN "e2e_automate" as b on a.kubernetes_container_name  = b.kubernetes_container_name');
    await this.page.waitForTimeout(5000);
  }

  async kubernetesContainerNameRightJoin() {
    await this.page
      .locator('[data-test="logs-search-bar-query-editor"]')
      .locator(".inputarea")
      .fill('SELECT a.kubernetes_container_name , b.kubernetes_container_name  FROM "default" as a RIGHT JOIN "e2e_automate" as b on a.kubernetes_container_name  = b.kubernetes_container_name');
    await this.page.waitForTimeout(5000);
  }

  async kubernetesContainerNameFullJoin() {
    await this.page
      .locator('[data-test="logs-search-bar-query-editor"]')
      .locator(".inputarea")
      .fill('SELECT a.kubernetes_container_name , b.kubernetes_container_name  FROM "default" as a FULL JOIN "e2e_automate" as b on a.kubernetes_container_name  = b.kubernetes_container_name');
    await this.page.waitForTimeout(5000);
  }

  async displayCountQuery() {
    await this.page.waitForTimeout(4000);
    await expect(this.page.getByRole('heading', { name: 'Error while fetching' })).not.toBeVisible();
  }

  async validateResult() {
    await this.page.waitForTimeout(10000);
    await expect(this.page.locator('[data-test="logs-search-search-result"]')).toBeVisible();
    await this.page.locator('td[data-test="log-table-column-0-source"]').nth(0).click();
    await expect(this.page.locator('[data-test="log-expand-detail-key-kubernetes_container_name-text"]')).toBeVisible();

  }




  async signOut() {
    await this.profileButton.click();
    await this.signOutButton.click();
  }

  async displayTwoStreams() {
    await expect(this.page.locator('[data-test="logs-search-index-list"]')).toContainText('default, e2e_automate');
  }

  async verifyQuickModeToggle() {
    await expect(this.page.locator(this.quickModeToggle)).toBeVisible();
  }

  async clickQuickModeToggle() {

    // Get the toggle button element
    const toggleButton = await this.page.$('[data-test="logs-search-bar-quick-mode-toggle-btn"] > .q-toggle__inner');
    // Evaluate the class attribute to determine if the toggle is in the off state
    const isSwitchedOff = await toggleButton.evaluate(node => node.classList.contains('q-toggle__inner--falsy'));
    // If the toggle is switched off, click on it to switch it on
    if (isSwitchedOff) {
      await toggleButton.click();

    }

  }

  async clickInterestingFields() {

    await this.page.locator('[data-cy="index-field-search-input"]').fill("kubernetes_container_name");
    await this.page.waitForTimeout(2000);
    await this.page.locator('[data-test="log-search-index-list-interesting-kubernetes_container_name-field-btn"]').first().click();
    await this.page.waitForTimeout(2000);
  }

  async validateInterestingFields() {
    await expect(this.page.locator('[data-test="logs-search-bar-query-editor"]').getByText(/kubernetes_container_name/).first()).toBeVisible();
  }

  async validateInterestingFieldsQuery() {
    await this.page.waitForSelector('[data-test="logs-search-bar-query-editor"]');
    await expect(this.page.locator('[data-test="logs-search-bar-query-editor"]').locator('text=kubernetes_container_name FROM "default"')
    ).toBeVisible();
  }

  async addRemoveInteresting() {

    await this.page.locator('[data-cy="index-field-search-input"]').clear();
    await this.page.locator('[data-cy="index-field-search-input"]').fill("job");
    await this.page.waitForTimeout(2000);
    await this.page.locator('[data-test="log-search-index-list-interesting-job-field-btn"]').last().click({ force: true, });
    await this.page.locator('[data-cy="search-bar-refresh-button"] > .q-btn__content').click({ force: true, });
    await this.page.locator('[data-test="log-search-index-list-interesting-job-field-btn"]').last().click({ force: true, });
    await expect(this.page.locator('[data-test="logs-search-bar-query-editor"]')).not.toHaveText(/job/);

  }


  async setDateTimeToToday() {
    // Set up route interception and apply filters
    await this.page.route('**/api/default/_search**', (route) => route.continue());;

    // Click on the date-time button
    await expect(this.page.locator(this.dateTimeButton)).toBeVisible();
    await this.page.locator(this.dateTimeButton).click();

    // Select the absolute date-time tab
    await this.page.locator('[data-test="date-time-absolute-tab"]').click();

    // Select the current date
    const date = new Date().getDate();
    await this.page.getByRole('button', { name: date.toString(), exact: true }).last().click();
    await this.page.getByRole('button', { name: date.toString(), exact: true }).last().click();

    // Fill the start time
    const startTimeInput = this.page.locator(".startEndTime td:nth-child(1) input");
    await startTimeInput.click();
    await startTimeInput.fill("");
    await startTimeInput.type("000000");

    // Wait briefly for UI stability
    // await this.page.waitForTimeout(2000);
    await this.page.waitForSelector('.startEndTime td:nth-child(2) input', { state: 'visible' });


    // Fill the end time
    const endTimeInput = this.page.locator(".startEndTime td:nth-child(2) input");
    await endTimeInput.click();
    await endTimeInput.fill("");
    await this.page.waitForTimeout(2000);
    await endTimeInput.type("235900");
    await this.page.locator('[data-test="logs-logs-toggle"]', { state: 'visible' }).click();
    await this.page.locator('[data-test="logs-search-bar-refresh-btn"]').click();

    // Wait briefly for search results to load
    await this.page.waitForTimeout(2000);

    // Validate the date range of the log entries
    const startDate = new Date();
    startDate.setHours(0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59);

    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")} 00:00:00`;
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")} 23:59:59`;

    const rows = await this.page.locator('[data-test="logs-search-result-logs-table"] tbody:nth-of-type(2) tr').all();

    for (let i = 2; i < rows.length; i++) {
      const dateText = await rows[i].locator('td:first-child div div:nth-child(2) span span').textContent();
      if (dateText) {
        const date = new Date(dateText.trim());
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        // Check if the parsed date is valid
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date format: ${dateText}`);
        }

        expect(date >= startDate && date <= endDate).toBeTruthy();
      }
    }

    await expect(this.page.locator('[data-test="logs-search-result-logs-table"]')).toBeVisible();
  }

  async selectStreamAndStreamTypeForLogs(stream) {

    await this.page.locator('[data-test="log-search-index-list-select-stream"]').click();
    await this.page.waitForTimeout(2000);
    await this.page.locator('[data-test="log-search-index-list-select-stream"]').fill(stream);
    await this.page.waitForTimeout(2000);
    await this.page.waitForSelector(`[data-test="log-search-index-list-stream-toggle-${stream}"] div`, { state: "visible" });
    await this.page.waitForTimeout(2000);
    await this.page.locator(`[data-test="log-search-index-list-stream-toggle-${stream}"] div`).first().click();
}

async toggleHistogram() {
  await this.page.waitForSelector('[data-test="logs-search-bar-show-histogram-toggle-btn"]');
  await this.page.locator('[data-test="logs-search-bar-show-histogram-toggle-btn"] div').nth(2).click();
}

async checkErrorVisible() {
  return this.page.getByRole('heading', { name: 'Error while fetching' }).isVisible();
}

async getErrorDetails() {
  return this.page.locator('[data-test="logs-search-search-result"]').getByRole('heading');
}

async selectIndexStreamDefault() {
  await this.page.locator('[data-test="logs-search-index-list"]').getByText('arrow_drop_down').click();
  await this.page.waitForTimeout(3000);
  await this.page.locator('[data-test="log-search-index-list-stream-toggle-default"] div').first().click();

}

async clearAndFillQueryEditor(query) {
  const editor = this.page.locator('[data-test="logs-search-bar-query-editor"]').locator(".inputarea");
  await editor.fill(''); // Clear the editor
  await this.page.waitForTimeout(1000); // Optional: adjust or remove as per your needs
  await editor.fill(query); // Fill with the new query
}

async waitForSearchResultAndCheckText(expectedText) {
  const locator = this.page.locator('[data-test="logs-search-search-result"]').getByRole('heading');
  await locator.waitFor(); // Wait for the element to be visible
  await expect(locator).toContainText(expectedText);
}

async executeQueryWithKeyboardShortcut() {
  // Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
  await this.page.keyboard.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
}

async executeQueryWithKeyboardShortcutTest() {
  // Set up date/time filter
  await this.page.locator('[data-test="date-time-btn"]').click({ force: true });
  await this.page.locator('[data-test="date-time-relative-15-m-btn"] > .q-btn__content > .block').click({ force: true });

  // Ensure the query editor is visible and clickable before typing
  const queryEditor = this.page.locator('[data-test="logs-search-bar-query-editor"]');
  await expect(queryEditor).toBeVisible();
  await queryEditor.click();
  await this.page.keyboard.type("match_all('code')");

  // Execute query using keyboard shortcut
  await this.executeQueryWithKeyboardShortcut();

  // Verify that the expected log table column is visible
  await expect(this.page.locator('[data-test="log-table-column-0-source"]')).toBeVisible();
}

async executeQueryWithKeyboardShortcutAfterClickingElsewhere() {
  // Set up date/time filter
  await this.page.locator('[data-test="date-time-btn"]').click({ force: true });
  await this.page.locator('[data-test="date-time-relative-15-m-btn"] > .q-btn__content > .block').click({ force: true });

  // Click elsewhere on the screen first
  await this.page.locator('[data-test="logs-search-bar"]').click();

  // Ensure the query editor is visible and clickable before typing
  const queryEditor = this.page.locator('[data-test="logs-search-bar-query-editor"]');
  await expect(queryEditor).toBeVisible();
  await queryEditor.click();
  await this.page.keyboard.type("match_all('code')");

  // Execute query using keyboard shortcut
  await this.executeQueryWithKeyboardShortcut();

  // Verify that the expected log table column is visible
  await expect(this.page.locator('[data-test="log-table-column-0-source"]')).toBeVisible();
}

async executeQueryWithKeyboardShortcutWithDifferentQuery() {
  // Set up date/time filter
  await this.page.locator('[data-test="date-time-btn"]').click({ force: true });
  await this.page.locator('[data-test="date-time-relative-15-m-btn"] > .q-btn__content > .block').click({ force: true });

  // Ensure the query editor is visible and clickable before typing
  const queryEditor = this.page.locator('[data-test="logs-search-bar-query-editor"]');
  await expect(queryEditor).toBeVisible();
  await queryEditor.click();
  await this.page.keyboard.type("str_match_ignore_case(kubernetes_container_name, 'ziox')");

  // Execute query using keyboard shortcut
  await this.executeQueryWithKeyboardShortcut();

  // Verify that the expected log table column is visible
  await expect(this.page.locator('[data-test="log-table-column-0-source"]')).toBeVisible();
}

async executeQueryWithKeyboardShortcutWithSQLMode() {
  // Set up date/time filter
  await this.page.locator('[data-test="date-time-btn"]').click({ force: true });
  await this.page.locator('[data-test="date-time-relative-15-m-btn"] > .q-btn__content > .block').click({ force: true });

  // Enable SQL mode
  await this.sqlModeToggle.click();

  // Ensure the query editor is visible and clickable before typing
  const queryEditor = this.page.locator('[data-test="logs-search-bar-query-editor"]');
  await expect(queryEditor).toBeVisible();
  await queryEditor.click();
  await this.page.keyboard.type('SELECT COUNT(_timestamp) AS xyz, _timestamp FROM "e2e_automate" Group by _timestamp ORDER BY _timestamp DESC');

  // Execute query using keyboard shortcut
  await this.executeQueryWithKeyboardShortcut();

  // Verify that the expected log table column is visible
  await expect(this.page.locator('[data-test="logs-search-result-bar-chart"]')).toBeVisible();
}

async executeQueryWithErrorHandling() {
  // Fill query editor with invalid query
  await this.page.locator('[data-test="logs-search-bar-query-editor"]').getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill('match_all(\'invalid\')');
  
  // Click refresh button and verify error
  await this.page.locator('[data-test="logs-search-bar-refresh-btn"]').click();
  await this.page.locator('[data-test="logs-search-error-message"]').click();
  
  // Reset filters
  await this.page.locator('[data-test="logs-search-bar-reset-filters-btn"]').click();
  
  // Toggle histogram
  await this.page.locator('[data-test="logs-search-bar-show-histogram-toggle-btn"] div').first().click();
  
  // Click first line and refresh
  await this.page.locator('.view-line').first().click();
  await this.page.locator('[data-test="logs-search-bar-refresh-btn"]').click();
  
  // Verify no data message
  await this.page.getByText('warning No data found for').click();
  
  // Click on result detail
  await this.page.locator('[data-test="logs-search-result-detail-undefined"]').click();
}

// New methods for histogram query test
async executeHistogramQuery(query) {
  await this.page.locator('[data-test="logs-search-bar-query-editor"] > .monaco-editor').click();
  await this.page.keyboard.type(query);
  await this.page.waitForTimeout(2000);
}

async toggleHistogramAndExecute() {
  await this.page.locator('[data-test="logs-search-bar-show-histogram-toggle-btn"] div').nth(2).click();
  await this.page.waitForTimeout(1000);
  await this.page.locator('[data-test="logs-search-bar-refresh-btn"]').click();
}

async verifyHistogramState() {
  const isHistogramOff = await this.page.locator('[data-test="logs-search-bar-show-histogram-toggle-btn"]')
    .evaluate(el => el.getAttribute('aria-checked') === 'false');
  expect(isHistogramOff).toBeTruthy();
}

async verifySearchPartitionResponse() {
  const searchPartitionPromise = this.page.waitForResponse(response => 
    response.url().includes('/api/default/_search_partition') && 
    response.request().method() === 'POST'
  );
  
  const searchPartitionResponse = await searchPartitionPromise;
  const searchPartitionData = await searchPartitionResponse.json();

  expect(searchPartitionData).toHaveProperty('partitions');
  expect(searchPartitionData).toHaveProperty('histogram_interval');
  expect(searchPartitionData).toHaveProperty('order_by', 'asc');

  return searchPartitionData;
}

async captureSearchCalls() {
  const searchCalls = [];
  this.page.on('response', async response => {
    if (response.url().includes('/api/default/_search') && 
        response.request().method() === 'POST') {
      const requestData = await response.request().postDataJSON();
      searchCalls.push({
        start_time: requestData.query.start_time,
        end_time: requestData.query.end_time,
        sql: requestData.query.sql
      });
    }
  });
  await this.page.waitForTimeout(2000);
  return searchCalls;
}

async verifyStreamingModeResponse() {
  const searchPromise = this.page.waitForResponse(response => 
    response.url().includes('/api/default/_search') && 
    response.request().method() === 'POST'
  );
  
  const searchResponse = await searchPromise;
  expect(searchResponse.status()).toBe(200);
  
  const searchData = await searchResponse.json();
  expect(searchData).toBeDefined();
  expect(searchData.hits).toBeDefined();
}

async clickExplore() {
  try {
    // Wait for the explore button to be visible and clickable
    await this.exploreButton.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.exploreButton.first().waitFor({ state: 'attached', timeout: 10000 });
    
    // Click the button and wait for any network requests to complete
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.exploreButton.first().click()
    ]);
    
    // Wait for the results to load
    await this.page.waitForTimeout(3000);
  } catch (error) {
    console.error('Error in clickExplore:', error);
    throw error;
  }
}

async openTimestampMenu() {
  try {
    // Wait for the table to be visible first
    await this.page.waitForSelector('[data-test="logs-search-result-logs-table"]', { state: 'visible', timeout: 10000 });
    
    // Wait for the timestamp column to be visible
    await this.page.waitForSelector('[data-test="log-table-column-1-_timestamp"]', { state: 'visible', timeout: 10000 });
    
    // Wait for the menu button to be visible and clickable
    await this.timestampColumnMenu.waitFor({ state: 'visible', timeout: 10000 });
    
    // Ensure the menu button is in viewport
    await this.timestampColumnMenu.scrollIntoViewIfNeeded();
    
    // Click the menu and wait for any network requests to complete
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.timestampColumnMenu.click({ force: true })
    ]);
    
    // Wait for the menu to open
    await this.page.waitForTimeout(1000);
  } catch (error) {
    console.error('Error in openTimestampMenu:', error);
    // Try alternative approach if first attempt fails
    try {
      await this.page.waitForTimeout(2000); // Give more time for the table to load
      await this.timestampColumnMenu.click({ force: true });
      await this.page.waitForTimeout(1000);
    } catch (retryError) {
      console.error('Error in openTimestampMenu retry:', retryError);
      throw retryError;
    }
  }
}

}
