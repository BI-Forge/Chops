import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Queries Page
 */
export class QueriesPage {
  readonly page: Page;
  readonly queryTable: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.queryTable = page.locator('[data-testid="query-table"]').or(page.locator('table').first());
    this.searchInput = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]'));
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.pagination = page.locator('[data-testid="pagination"]').or(page.locator('.pagination'));
  }

  async goto() {
    await this.page.goto('/query-history');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async getTableRows(): Promise<Locator> {
    return this.queryTable.locator('tbody tr');
  }

  async clickRow(index: number) {
    const rows = await this.getTableRows();
    await rows.nth(index).click();
  }
}

