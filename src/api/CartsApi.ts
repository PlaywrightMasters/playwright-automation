import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';
import { expectSchema, expectStatus } from './assertions';
import { CartCreatedSchema } from './schemas';

export interface CartLine {
  productId: string;
  quantity: number;
}

export class CartsApi extends BaseApi {
  create(): Promise<APIResponse> {
    return this.send('POST', '/carts');
  }

  addItem(cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.send('POST', `/carts/${cartId}`, { data: { product_id: productId, quantity } });
  }

  get(cartId: string): Promise<APIResponse> {
    return this.send('GET', `/carts/${cartId}`);
  }

  updateQuantity(cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.send('PUT', `/carts/${cartId}/product/quantity`, {
      data: { product_id: productId, quantity },
    });
  }

  removeItem(cartId: string, productId: string): Promise<APIResponse> {
    return this.send('DELETE', `/carts/${cartId}/product/${productId}`);
  }

  delete(cartId: string): Promise<APIResponse> {
    return this.send('DELETE', `/carts/${cartId}`);
  }

  /** Creates a cart holding the given lines and returns its id. */
  async createWith(lines: CartLine[]): Promise<string> {
    const { id } = await expectSchema(await this.create(), 201, CartCreatedSchema);
    for (const line of lines) {
      await expectStatus(await this.addItem(id, line.productId, line.quantity), 200);
    }
    return id;
  }
}
