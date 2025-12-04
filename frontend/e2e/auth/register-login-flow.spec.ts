import { test, expect } from '../fixtures/auth.fixture';
import type { Page, Route } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { mockAuthResponses } from '../utils/api-mocks';

test.describe('Register and Login Flow', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `testuser_${Date.now()}@example.com`,
    password: 'securepass123',
  };

  test('should complete full registration and login flow', async ({ page }: { page: Page }) => {
    // Mock API responses for registration
    await page.route('**/api/v1/auth/register', async (route: Route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.registerSuccess),
      });
    });

    // Mock API responses for login
    await page.route('**/api/v1/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.loginSuccess),
      });
    });

    // Mock API responses for user info
    await page.route('**/api/v1/auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockAuthResponses.userInfo,
          username: testUser.username,
          email: testUser.email,
        }),
      });
    });

    // Step 1: Fill registration form
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.fillUsername(testUser.username);
    await registerPage.fillEmail(testUser.email);
    await registerPage.fillPassword(testUser.password);
    await registerPage.fillConfirmPassword(testUser.password);

    // Step 2: Check terms checkbox using page object to ensure state toggles
    await registerPage.acceptTerms();
    await expect(page.getByTestId('register-terms-checkbox')).toBeChecked();

    const registerButton = page.getByTestId('register-submit-button');
    await expect(registerButton).toBeEnabled();
    await registerButton.click();

    // Wait for registration to complete and redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000, waitUntil: 'commit' });

    // Step 4: Logout
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();

    // Wait for logout to complete and redirect to login page
    await page.waitForURL('**/login', { timeout: 15000, waitUntil: 'commit' });

    // Step 5: Fill login form with the same credentials
    const loginPage = new LoginPage(page);
    await loginPage.waitForForm();
    await loginPage.fillUsername(testUser.username);
    await loginPage.fillPassword(testUser.password);

    // Step 6: Click on "Sign IN" button
    await loginPage.clickLogin();

    // Verify successful login - should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000, waitUntil: 'commit' });
  });
});

