import { test, expect } from '../../../src/fixtures';
import { toCents } from '../../../src/utils/money';

test.describe('Cart', { tag: '@regression' }, () => {
  test(
    'adding a product updates the badge and the cart line',
    { tag: ['@smoke', '@mobile'] },
    async ({ api, productPage, checkoutPage }) => {
      const product = await api.products.firstBuyable();

      await productPage.open(product.id);
      await productPage.setQuantity(2);
      await productPage.addToCart();

      await expect(productPage.addedToCartToast).toBeVisible();
      await productPage.nav.expand();
      await expect(productPage.nav.cartQuantity).toHaveText('2');

      await productPage.nav.openCart();
      const row = checkoutPage.row(product.name);
      await expect(row.quantity).toHaveValue('2');
      expect(toCents(await row.linePriceValue())).toBe(toCents(product.price * 2));
      await expect(checkoutPage.cartTotal).toHaveText(`$${(product.price * 2).toFixed(2)}`);
    },
  );

  test('changing the quantity recalculates line and total', async ({ api, session, checkoutPage }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);
    await session.useCart(cartId, 1);

    await checkoutPage.open();
    const row = checkoutPage.row(product.name);
    await row.setQuantity(4);

    await expect(row.linePrice).toHaveText(`$${(product.price * 4).toFixed(2)}`);
    await expect(checkoutPage.cartTotal).toHaveText(`$${(product.price * 4).toFixed(2)}`);
  });

  test('removing the only line empties the cart', async ({ api, session, checkoutPage }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);
    await session.useCart(cartId, 1);

    await checkoutPage.open();
    await checkoutPage.row(product.name).remove();

    await expect(checkoutPage.rows).toHaveCount(0);
  });
});
