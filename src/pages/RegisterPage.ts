import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { NewCustomer } from '../data/factories';

export type RegisterField =
  | 'first-name'
  | 'last-name'
  | 'dob'
  | 'country'
  | 'postal_code'
  | 'house_number'
  | 'street'
  | 'city'
  | 'state'
  | 'phone'
  | 'email'
  | 'password';

export class RegisterPage extends BasePage {
  readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.submit = page.getByTestId('register-submit');
  }

  field(name: RegisterField): Locator {
    return this.page.getByTestId(name);
  }

  errorFor(name: RegisterField): Locator {
    return this.page.getByTestId(`${name}-error`);
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/register');
    await this.submit.waitFor();
  }

  async fill(customer: NewCustomer): Promise<void> {
    await this.field('first-name').fill(customer.first_name);
    await this.field('last-name').fill(customer.last_name);
    await this.field('dob').fill(customer.dob);
    await this.field('country').selectOption(customer.address.country);
    await this.field('postal_code').fill(customer.address.postal_code);
    await this.field('house_number').fill(customer.address.house_number);
    await this.field('street').fill(customer.address.street);
    await this.field('city').fill(customer.address.city);
    await this.field('state').fill(customer.address.state);
    await this.field('phone').fill(customer.phone);
    await this.field('email').fill(customer.email);
    await this.field('password').fill(customer.password);
  }

  async register(customer: NewCustomer): Promise<void> {
    await this.fill(customer);
    await this.submit.click();
  }
}
