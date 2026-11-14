import type { Locator } from '@playwright/test';
import { parsePrice } from '../utils/money';

/** One line in the checkout cart table. */
export class CartRow {
  readonly title: Locator;
  readonly quantity: Locator;
  readonly unitPrice: Locator;
  readonly linePrice: Locator;
  /** The app gives the delete button no test id or accessible name; its class is the only hook. */
  readonly removeButton: Locator;

  constructor(readonly root: Locator) {
    this.title = root.getByTestId('product-title');
    this.quantity = root.getByTestId('product-quantity');
    this.unitPrice = root.getByTestId('product-price');
    this.linePrice = root.getByTestId('line-price');
    this.removeButton = root.locator('a.btn-danger');
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantity.fill(String(quantity));
    // The cart recalculates on change, which fires on blur.
    await this.quantity.blur();
  }

  async linePriceValue(): Promise<number> {
    return parsePrice(await this.linePrice.innerText());
  }

  async remove(): Promise<void> {
    await this.removeButton.click();
  }
}
