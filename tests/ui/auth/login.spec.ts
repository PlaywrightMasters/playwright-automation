import { test, expect } from '../../../src/fixtures';
import { uniqueEmail } from '../../../src/data/factories';

test.describe('Login', { tag: '@regression' }, () => {
  test(
    'customer signs in and lands on their account',
    { tag: ['@smoke', '@mobile'] },
    async ({ page, loginPage, accountPage, customer }) => {
      await loginPage.open();
      await loginPage.login(customer.email, customer.password);

      await expect(page).toHaveURL(/\/account$/);
      await expect(accountPage.title).toHaveText('My account');
      await accountPage.nav.expand();
      await expect(accountPage.nav.userMenu).toContainText(`${customer.first_name} ${customer.last_name}`);
    },
  );

  test('unknown credentials show a generic error', async ({ page, loginPage }) => {
    await loginPage.open();
    await loginPage.login(uniqueEmail('nobody'), 'Any!Password9');

    await expect(loginPage.error).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('empty form shows both required-field errors', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.submit.click();

    await expect(loginPage.emailError).toHaveText('Email is required');
    await expect(loginPage.passwordError).toHaveText('Password is required');
  });

  test('anonymous visitors are sent from /account to the login page', async ({ page, accountPage }) => {
    await accountPage.open();

    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('signing out ends the session', async ({ page, signedIn: _signedIn, accountPage }) => {
    await accountPage.open();
    await expect(accountPage.title).toHaveText('My account');

    await accountPage.nav.logout();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await accountPage.nav.expand();
    await expect(accountPage.nav.signIn).toBeVisible();
    await expect(accountPage.nav.userMenu).not.toBeAttached();
  });
});
