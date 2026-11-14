import type { Locator } from '@playwright/test';
import { parsePrice } from '../utils/money';

/** One product tile on the catalogue grid. */
export class ProductCard {
  readonly name: Locator;
  readonly price: Locator;
  readonly outOfStock: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByTestId('product-name');
    this.price = root.getByTestId('product-price');
    this.outOfStock = root.getByTestId('out-of-stock');
  }

  async priceValue(): Promise<number> {
    return parsePrice(await this.price.innerText());
  }

  async open(): Promise<void> {
    await this.root.click();
  }
}
