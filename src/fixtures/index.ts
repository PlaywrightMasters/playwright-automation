import { test as base, expect } from '@playwright/test';
import { createApi, type ToolshopApi } from '../api';
import { buildCustomer, type NewCustomer } from '../data/factories';
import { AccountPage } from '../pages/AccountPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';
import { RegisterPage } from '../pages/RegisterPage';
import { BrowserSession } from './BrowserSession';

export interface RegisteredCustomer extends NewCustomer {
  id: string;
}

interface WorkerFixtures {
  /** A fresh customer registered once per worker through the API. */
  customer: RegisteredCustomer;
}

interface TestFixtures {
  api: ToolshopApi;
  /**
   * A bearer token for `customer`, issued per test. Toolshop tokens live for
   * five minutes, so a token saved once per run (storageState) would expire
   * part-way through a long cross-browser run.
   */
  customerToken: string;
  /** The page, already signed in as `customer` via the API (no UI login). */
  signedIn: BrowserSession;
  session: BrowserSession;
  homePage: HomePage;
  productPage: ProductPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  accountPage: AccountPage;
  checkoutPage: CheckoutPage;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  customer: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext();
      const customer = buildCustomer();
      const user = await createApi(request).users.registerOk(customer);
      await request.dispose();
      await use({ ...customer, id: user.id });
    },
    { scope: 'worker' },
  ],

  api: async ({ request }, use) => {
    await use(createApi(request));
  },

  customerToken: async ({ api, customer }, use) => {
    await use(await api.users.tokenFor(customer.email, customer.password));
  },

  session: async ({ page }, use) => {
    await use(new BrowserSession(page));
  },

  signedIn: async ({ session, customerToken }, use) => {
    await session.signInWithToken(customerToken);
    await use(session);
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
});

export { expect };
