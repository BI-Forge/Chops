import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Register Page
 */
export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly fallbackRegisterButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;
  readonly termsCheckbox: Locator;
  readonly termsCheckboxControl: Locator;
  readonly termsCheckboxLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder(/username/i).or(page.locator('input[id="username"]'));
    this.emailInput = page.getByPlaceholder(/email/i).or(page.locator('input[id="reg-email"]'));
    this.passwordInput = page.getByPlaceholder(/password/i).or(page.locator('input[id="reg-password"]'));
    this.confirmPasswordInput = page.getByPlaceholder(/confirm/i).or(page.locator('input[id="confirm-password"]'));
    this.registerButton = page
      .locator('[data-testid="register-submit-button"]')
      .or(page.getByRole('button', { name: /create account|register|sign up/i }));
    this.fallbackRegisterButton = page.getByRole('button', { name: /create account|register|sign up/i });
    this.loginLink = page.getByRole('link', { name: /login|sign in/i });
    this.errorMessage = page.locator('[role="alert"]').or(page.locator('.error')).or(page.locator('.text-red-500'));
    this.termsCheckbox = page
      .locator('[data-testid="register-terms-checkbox"]')
      .or(page.locator('input[type="checkbox"]').first());
    this.termsCheckboxControl = this.termsCheckbox.locator('xpath=ancestor::label[1]');
    this.termsCheckboxLabel = page
      .locator('[data-testid="register-terms-checkbox-label"]')
      .or(page.locator('label').filter({ hasText: /terms|conditions/i }));
  }

  async goto() {
    await this.page.goto('/login');
    // Switch to register tab
    await this.page.getByRole('button', { name: /sign up|register/i }).click();
    // Wait for register form to be visible
    await this.usernameInput.waitFor({ state: 'visible' });
  }

  async register(username: string, email: string, password: string, confirmPassword?: string) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    
    await this.acceptTerms();
    await this.clickRegister();
  }

  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async clickRegister() {
    const primaryButton = this.registerButton.first();
    const secondaryButton = this.fallbackRegisterButton.first();

    try {
      await primaryButton.waitFor({ state: 'visible', timeout: 5000 });
      await primaryButton.scrollIntoViewIfNeeded();
      await primaryButton.click();
    } catch {
      try {
        await primaryButton.click({ force: true });
      } catch {
        await secondaryButton.waitFor({ state: 'visible', timeout: 5000 });
        await secondaryButton.scrollIntoViewIfNeeded();
        await secondaryButton.click({ force: true });
      }
    }
  }

  async acceptTerms() {
    const checkbox = this.termsCheckbox.first();
    await checkbox.waitFor({ state: 'attached' });

    if (await checkbox.isChecked()) {
      return;
    }

    const control = this.termsCheckboxControl.first();
    try {
      await control.click({ force: true });
    } catch {
      await this.termsCheckboxLabel.first().click({ force: true });
    }

    if (!(await checkbox.isChecked())) {
      try {
        await checkbox.setChecked(true, { force: true });
      } catch {
        // ignore and try next fallback
      }
    }

    if (!(await checkbox.isChecked())) {
      const handle = await checkbox.elementHandle();
      if (handle) {
        await this.page.evaluate((node: Element) => {
          const input = node as HTMLInputElement;
          input.checked = true;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }, handle);
      }
    }

    if (!(await checkbox.isChecked())) {
      throw new Error('Failed to accept terms and conditions checkbox');
    }
  }

  async clickLogin() {
    await this.loginLink.click();
  }

  async isRegistered(): Promise<boolean> {
    // Check if redirected to dashboard after registration
    const url = this.page.url();
    return url.includes('/dashboard') || url.includes('/query-history');
  }
}

