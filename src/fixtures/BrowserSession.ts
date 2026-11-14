import type { Page } from '@playwright/test';

/**
 * Puts API-created state into the browser before the app boots.
 *
 * The Angular app keeps its JWT in localStorage['auth-token'] and the cart in
 * sessionStorage['cart_id' | 'cart_quantity']. Each value is written once per
 * tab (guarded by a sessionStorage marker), so a later in-app sign-out or
 * order confirmation isn't undone on the next navigation.
 */
export class BrowserSession {
  constructor(private readonly page: Page) {}

  async signInWithToken(token: string): Promise<void> {
    await this.page.addInitScript((value) => {
      // Init scripts also run in iframes; keep the token out of third-party frames.
      if (window !== window.top) return;
      if (!sessionStorage.getItem('__qa_token_seeded')) {
        localStorage.setItem('auth-token', value);
        sessionStorage.setItem('__qa_token_seeded', '1');
      }
    }, token);
  }

  async useCart(cartId: string, totalQuantity: number): Promise<void> {
    await this.page.addInitScript(
      ([id, quantity]) => {
        if (window !== window.top) return;
        if (!sessionStorage.getItem('__qa_cart_seeded')) {
          sessionStorage.setItem('cart_id', id);
          sessionStorage.setItem('cart_quantity', quantity);
          sessionStorage.setItem('__qa_cart_seeded', '1');
        }
      },
      [cartId, String(totalQuantity)] as const,
    );
  }
}
