import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

// Extend base test with custom fixtures
type AuthFixtures = {
  authenticatedPage: Page;
};

// Custom test with authentication
export const test = base.extend<AuthFixtures>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    
    // Mock API responses for login
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'test-jwt-token-12345',
          type: 'Bearer',
          expires_in: 86400,
        }),
      });
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
        }),
      });
    });
    
    // Login before test
    await page.goto('/login');
    await loginPage.login('testuser', 'securepass123');
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    await use(page);
  },
});

export { expect } from '@playwright/test';

