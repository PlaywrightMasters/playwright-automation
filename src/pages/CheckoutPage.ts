import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { CartRow } from '../components/CartRow';
import type { PaymentMethod } from '../api/InvoicesApi';

/**
 * The four-step checkout wizard at /checkout: cart → sign in → billing
 * address → payment. All steps live in the DOM at once; only one is visible.
 */
export class CheckoutPage extends BasePage {
  readonly rows: Locator;
  readonly cartTotal: Locator;
  readonly proceedFromCart: Locator;
  readonly proceedFromSignIn: Locator;
  readonly proceedFromAddress: Locator;
  readonly alreadySignedIn: Locator;
  readonly paymentMethod: Locator;
  readonly finishButton: Locator;
  readonly paymentSuccess: Locator;
  readonly confirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.rows = page.locator('tbody tr').filter({ has: page.getByTestId('product-title') });
    this.cartTotal = page.getByTestId('cart-total');
    this.proceedFromCart = page.getByTestId('proceed-1');
    this.proceedFromSignIn = page.getByTestId('proceed-2');
    this.proceedFromAddress = page.getByTestId('proceed-3');
    this.alreadySignedIn = page.getByText(/you are already logged in/i);
    this.paymentMethod = page.getByTestId('payment-method');
    this.finishButton = page.getByTestId('finish');
    this.paymentSuccess = page.getByTestId('payment-success-message');
    // The confirmation has no test id; its element id is the most stable hook.
    this.confirmation = page.locator('#order-confirmation');
  }

  async open(): Promise<void> {
    await this.page.goto('/checkout');
  }

  row(productName: string): CartRow {
    // Exact match: "Pliers" must not also select "Combination Pliers".
    return new CartRow(
      this.rows.filter({
        has: this.page.getByTestId('product-title').getByText(productName, { exact: true }),
      }),
    );
  }

  addressField(name: 'country' | 'postal_code' | 'house_number' | 'street' | 'city' | 'state'): Locator {
    return this.page.getByTestId(name);
  }

  /** Selects a payment method and confirms; cash on delivery needs no details. */
  async pay(method: PaymentMethod): Promise<void> {
    await this.paymentMethod.selectOption(method);
    await this.finishButton.click(); // "Check payment"
    await this.paymentSuccess.waitFor();
    await this.finishButton.click(); // "Confirm"
  }

  async invoiceNumber(): Promise<string> {
    const text = await this.confirmation.innerText();
    const match = /INV-\d+/.exec(text);
    if (!match) {
      throw new Error(`No invoice number in confirmation text: "${text}"`);
    }
    return match[0];
  }
}
