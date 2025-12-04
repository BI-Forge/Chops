# E2E Tests with Playwright

This directory contains end-to-end tests for the frontend application using Playwright.

## Structure

```
e2e/
├── auth/              # Authentication tests
├── dashboard/         # Dashboard page tests
├── queries/           # Query history tests
├── navigation/        # Navigation tests
├── ui/                # Visual regression tests
├── fixtures/          # Test fixtures and custom test setup
├── pages/             # Page Object Models
└── utils/             # Test utilities and helpers
```

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### Docker

```bash
# Run E2E tests in Docker
make test-e2e

# Run with UI mode
make test-e2e-ui

# Run in headed mode
make test-e2e-headed
```

## Writing Tests

### Page Object Model

Use Page Object Model pattern for better maintainability:

```typescript
import { Page, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.button = page.getByRole('button', { name: 'Submit' });
  }

  async goto() {
    await this.page.goto('/my-page');
  }

  async clickButton() {
    await this.button.click();
  }
}
```

### Using Fixtures

Use custom fixtures for authenticated tests:

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('authenticated test', async ({ authenticatedPage: page }) => {
  // Page is already authenticated
  await page.goto('/dashboard');
  // ...
});
```

### Mocking API Responses

```typescript
test('test with mocked API', async ({ page }) => {
  await page.route('**/api/v1/endpoint', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: 'test' }),
    });
  });

  await page.goto('/page');
  // ...
});
```

## Best Practices

1. **Use Page Object Model** - Keep selectors and page logic in separate classes
2. **Use data-testid attributes** - Prefer `data-testid` over CSS selectors
3. **Wait for network idle** - Use `waitForLoadState('networkidle')` when needed
4. **Mock API responses** - Don't rely on real backend in E2E tests
5. **Keep tests independent** - Each test should be able to run in isolation
6. **Use meaningful test names** - Describe what the test does
7. **Take screenshots on failure** - Already configured in `playwright.config.ts`

## Configuration

Configuration is in `playwright.config.ts`:
- Test directory: `./e2e`
- Base URL: `http://localhost:3000` (or `PLAYWRIGHT_BASE_URL` env var)
- Browsers: Chromium, Firefox, WebKit
- Mobile viewports: Pixel 5, iPhone 12
- Screenshots: On failure
- Videos: On failure
- Traces: On first retry

## CI/CD

Tests run automatically in CI with:
- Retries: 2
- Workers: 1 (sequential)
- GitHub Actions reporter

