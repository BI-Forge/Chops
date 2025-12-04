import { Page, expect } from '@playwright/test';

/**
 * Utility functions for E2E tests
 */

/**
 * Wait for API response
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Mock API response
 */
export async function mockAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status = 200
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for element to be visible and stable
 */
export async function waitForStableElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  
  // Wait for element to be stable (no animations)
  await page.waitForTimeout(300);
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  const boundingBox = await element.boundingBox();
  if (!boundingBox) return false;
  
  const viewport = page.viewportSize();
  if (!viewport) return false;
  
  return (
    boundingBox.x >= 0 &&
    boundingBox.y >= 0 &&
    boundingBox.x + boundingBox.width <= viewport.width &&
    boundingBox.y + boundingBox.height <= viewport.height
  );
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  fullPage = false
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage,
  });
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Check accessibility (basic checks)
 */
export async function checkAccessibility(page: Page): Promise<void> {
  // Check for images without alt text
  const imagesWithoutAlt = page.locator('img:not([alt])');
  const count = await imagesWithoutAlt.count();
  if (count > 0) {
    console.warn(`Found ${count} images without alt text`);
  }

  // Check for buttons without accessible names
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  for (let i = 0; i < buttonCount; i++) {
    const button = buttons.nth(i);
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    if (!text?.trim() && !ariaLabel) {
      console.warn(`Button at index ${i} has no accessible name`);
    }
  }
}

