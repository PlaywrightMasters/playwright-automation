import type { Locator, Page } from '@playwright/test';

/** Top navigation shared by every page. Handles the collapsed mobile menu. */
export class NavBar {
  readonly toggler: Locator;
  readonly home: Locator;
  readonly signIn: Locator;
  readonly userMenu: Locator;
  readonly signOut: Locator;
  readonly myInvoices: Locator;
  readonly cart: Locator;
  readonly cartQuantity: Locator;

  constructor(private readonly page: Page) {
    this.toggler = page.locator('button.navbar-toggler');
    this.home = page.getByTestId('nav-home');
    this.signIn = page.getByTestId('nav-sign-in');
    this.userMenu = page.getByTestId('nav-menu');
    this.signOut = page.getByTestId('nav-sign-out');
    this.myInvoices = page.getByTestId('nav-my-invoices');
    this.cart = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
  }

  /** On narrow viewports the links sit behind a hamburger button. */
  async expand(): Promise<void> {
    if ((await this.toggler.isVisible()) && (await this.toggler.getAttribute('aria-expanded')) !== 'true') {
      await this.toggler.click();
    }
  }

  async openCart(): Promise<void> {
    await this.expand();
    await this.cart.click();
  }

  async goToSignIn(): Promise<void> {
    await this.expand();
    await this.signIn.click();
  }

  async logout(): Promise<void> {
    await this.expand();
    await this.userMenu.click();
    await this.signOut.click();
  }
}
