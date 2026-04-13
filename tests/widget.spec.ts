import { test, expect } from '@playwright/test';

test('widget page has a transparent background for OBS rendering', async ({ page }) => {
  // Navigate to a mock user's widget page using a valid access prefix
  await page.goto('/widget/MEMBERS-testuser123');

  // Ensure the body has the transparent background class or inline style
  const body = await page.locator('body');
  const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  
  // rgba(0, 0, 0, 0) is transparent
  expect(bgColor).toBe('rgba(0, 0, 0, 0)');
  
  // Verify main container renders
  await expect(page.locator('main')).toBeVisible();
});
