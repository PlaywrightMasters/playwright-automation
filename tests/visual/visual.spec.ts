import { test, expect } from '../../src/fixtures';

/**
 * Component-level visual checks on content that doesn't change with live
 * catalogue data. Baselines are platform-specific, so CI compares them inside
 * the official Playwright Docker image (see README → Visual testing).
 */
test.describe('Visual regression', { tag: '@visual' }, () => {
  test('login form', async ({ loginPage }) => {
    await loginPage.open();

    await expect(loginPage.page.getByTestId('login-form')).toHaveScreenshot('login-form.png');
  });

  test('login form validation state', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.submit.click();
    await expect(loginPage.passwordError).toBeVisible();

    await expect(loginPage.page.getByTestId('login-form')).toHaveScreenshot('login-form-errors.png');
  });
});
