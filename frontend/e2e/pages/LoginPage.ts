import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Login Page
 */
export class LoginPage {
  readonly page: Page;
  readonly loginForm: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginForm = page.locator('[data-testid="login-form"]').first();
    this.usernameInput = this.loginForm
      .locator('input#username')
      .or(this.loginForm.getByLabel(/username/i))
      .or(this.loginForm.getByPlaceholder(/username/i))
      .or(this.loginForm.locator('input[name="username"]'));
    this.passwordInput = this.loginForm
      .locator('input#password')
      .or(this.loginForm.getByLabel(/password/i))
      .or(this.loginForm.getByPlaceholder(/password|•+/i))
      .or(this.loginForm.locator('input[name="password"]'))
      .or(this.loginForm.locator('input[type="password"]').first());
    this.loginButton = this.loginForm
      .getByTestId('login-submit-button')
      .or(
        this.loginForm
          .locator('button[type="submit"]')
          .filter({ hasText: /sign in|login/i })
          .or(this.loginForm.getByRole('button', { name: /login|sign in/i }))
      );
    this.registerLink = page.getByRole('link', { name: /register|sign up/i });
    this.errorMessage = page.locator('[role="alert"]').or(page.locator('.error')).or(page.locator('.text-red-500'));
  }

  async goto() {
    await this.page.goto('/login');
  }

  async waitForForm() {
    await this.loginForm.waitFor({ state: 'visible' });
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.passwordInput.waitFor({ state: 'visible' });
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async clickRegister() {
    await this.registerLink.click();
  }

  async isLoggedIn(): Promise<boolean> {
    // Check if redirected to dashboard or if auth token exists
    const url = this.page.url();
    return url.includes('/dashboard') || url.includes('/query-history');
  }
}

