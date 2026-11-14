import { test, expect } from '../../src/fixtures';
import { CartSchema, expectSchema, expectStatus } from '../../src/api';
import { z } from 'zod';

const CartErrorSchema = z.object({
  message: z.string(),
  errors: z.record(z.string(), z.array(z.string())),
});

test.describe('Carts API', { tag: '@api' }, () => {
  test('adds a product to a new cart', { tag: '@smoke' }, async ({ api }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 2 }]);

    const cart = await expectSchema(await api.carts.get(cartId), 200, CartSchema);

    expect(cart.cart_items).toHaveLength(1);
    expect(cart.cart_items[0]).toMatchObject({ product_id: product.id, quantity: 2 });
    expect(cart.cart_items[0]?.product.price).toBe(product.price);
  });

  test('adding the same product again accumulates the quantity', async ({ api }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([
      { productId: product.id, quantity: 1 },
      { productId: product.id, quantity: 2 },
    ]);

    const cart = await expectSchema(await api.carts.get(cartId), 200, CartSchema);

    expect(cart.cart_items).toHaveLength(1);
    expect(cart.cart_items[0]?.quantity).toBe(3);
  });

  test('updates and removes a line', async ({ api }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);

    await expectStatus(await api.carts.updateQuantity(cartId, product.id, 5), 200);
    const updated = await expectSchema(await api.carts.get(cartId), 200, CartSchema);
    expect(updated.cart_items[0]?.quantity).toBe(5);

    await expectStatus(await api.carts.removeItem(cartId, product.id), 204);
    const emptied = await expectSchema(await api.carts.get(cartId), 200, CartSchema);
    expect(emptied.cart_items).toEqual([]);
  });

  test('rejects an unknown product with 422', async ({ api }) => {
    const cartId = await api.carts.createWith([]);

    const body = await expectSchema(
      await api.carts.addItem(cartId, '01XXXXXXXXXXXXXXXXXXXXXXXX', 1),
      422,
      CartErrorSchema,
    );

    expect(body.errors.product_id?.[0]).toContain('invalid');
  });

  test('rejects a zero quantity with 422', async ({ api }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([]);

    const body = await expectSchema(await api.carts.addItem(cartId, product.id, 0), 422, CartErrorSchema);

    expect(body.errors.quantity?.[0]).toContain('at least 1');
  });

  test('a deleted cart is gone', async ({ api }) => {
    const cartId = await api.carts.createWith([]);

    await expectStatus(await api.carts.delete(cartId), 204);
    await expectStatus(await api.carts.get(cartId), 404);
  });
});
