import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Dashboard Page
 */
export class DashboardPage {
  readonly page: Page;
  readonly nodeSelector: Locator;
  readonly metricsCards: Locator;
  readonly charts: Locator;
  readonly sidebar: Locator;
  readonly userMenuToggle: Locator;
  readonly logoutButton: Locator;
  readonly mobileMenuButton: Locator;
  readonly mobileMenuPanel: Locator;
  readonly mobileLogoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nodeSelector = page.locator('[data-testid="node-selector"]').or(page.locator('select, [role="combobox"]').first());
    this.metricsCards = page.locator('[data-testid="metric-card"]').or(page.locator('.metric-card'));
    this.charts = page.locator('[data-testid="chart"]').or(page.locator('canvas, svg'));
    this.sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav, aside'));
    this.userMenuToggle = this.sidebar.locator('[data-testid="user-menu-toggle"]:visible');
    this.logoutButton = this.sidebar.locator('[data-testid="user-menu-logout"]:visible');
    this.mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    this.mobileMenuPanel = page.locator('[data-testid="mobile-menu"]');
    this.mobileLogoutButton = this.mobileMenuPanel.locator('[data-testid="mobile-menu-logout"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async selectNode(nodeName: string) {
    await this.nodeSelector.click();
    await this.page.getByText(nodeName).click();
  }

  async getMetricCard(title: string): Promise<Locator> {
    return this.page.locator('[data-testid="metric-card"]', { hasText: title });
  }

  async logout() {
    if (await this.userMenuToggle.count()) {
      await this.logoutViaSidebar();
      return;
    }

    await this.logoutViaMobileMenu();
  }

  private async logoutViaSidebar() {
    const toggle = this.userMenuToggle.first();
    try {
      await toggle.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      await this.logoutViaMobileMenu();
      return;
    }

    await toggle.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100);
    if (!(await toggle.isVisible())) {
      await this.logoutViaMobileMenu();
      return;
    }
    try {
      await toggle.click();
    } catch {
      const handle = await toggle.elementHandle();
      if (handle) {
        await handle.evaluate((node: HTMLElement) => node.click());
      } else {
        await this.logoutViaMobileMenu();
        return;
      }
    }

    const logoutBtn = this.logoutButton.first();
    await logoutBtn.waitFor({ state: 'visible', timeout: 5000 });
    await logoutBtn.scrollIntoViewIfNeeded();
    try {
      await logoutBtn.click();
    } catch {
      const handle = await logoutBtn.elementHandle();
      if (handle) {
        await handle.evaluate((node: HTMLElement) => node.click());
      } else {
        await this.logoutViaMobileMenu();
      }
    }
  }

  private async logoutViaMobileMenu() {
    const menuButton = this.mobileMenuButton.first();
    try {
      await menuButton.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      throw new Error('Mobile menu button not available');
    }

    await menuButton.click();

    await this.mobileMenuPanel.waitFor({ state: 'visible', timeout: 5000 });
    const mobileLogout = this.mobileLogoutButton.first();
    await mobileLogout.waitFor({ state: 'visible', timeout: 5000 });
    await mobileLogout.click();
  }

  async isVisible(): Promise<boolean> {
    return await this.page.url().includes('/dashboard');
  }
}

