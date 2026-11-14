import { test, expect } from '../../../src/fixtures';
import { UserSchema, expectSchema } from '../../../src/api';
import { buildCustomer } from '../../../src/data/factories';
import type { RegisterField } from '../../../src/pages/RegisterPage';

test.describe('Registration', { tag: '@regression' }, () => {
  test(
    'a new customer registers in the UI and can then authenticate',
    { tag: '@smoke' },
    async ({ page, registerPage, api }) => {
      const customer = buildCustomer();

      await registerPage.open();
      await registerPage.register(customer);

      await expect(page).toHaveURL(/\/auth\/login$/);
      // Verify the side effect at the source of truth, not just the redirect.
      const token = await api.users.tokenFor(customer.email, customer.password);
      const me = await expectSchema(await api.users.me(token), 200, UserSchema);
      expect(me).toMatchObject({
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      });
    },
  );

  test('submitting an empty form flags every required field', async ({ registerPage }) => {
    const required: Array<[RegisterField, string]> = [
      ['first-name', 'First name is required'],
      ['last-name', 'Last name is required'],
      ['dob', 'Date of Birth is required'],
      ['country', 'Country is required'],
      ['postal_code', 'Postcode is required'],
      ['house_number', 'House number is required'],
      ['street', 'Street is required'],
      ['city', 'City is required'],
      ['state', 'State is required'],
      ['phone', 'Phone is required'],
      ['email', 'Email is required'],
      ['password', 'Password is required'],
    ];

    await registerPage.open();
    await registerPage.submit.click();

    for (const [field, message] of required) {
      await expect.soft(registerPage.errorFor(field), field).toContainText(message);
    }
  });

  test('an email that is already registered is refused', async ({ page, registerPage, customer }) => {
    await registerPage.open();
    await registerPage.register(buildCustomer({ email: customer.email }));

    await expect(page.getByText('A customer with this email address already exists.')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register$/);
  });
});
