import { test, expect } from '../../src/fixtures';
import { ProductPageSchema, expectSchema } from '../../src/api';
import { toCents } from '../../src/utils/money';

/**
 * Hybrid tests use the API for fast, deterministic setup or verification and
 * the UI only for the behaviour under test.
 */
test.describe('API ⇄ UI consistency', { tag: ['@hybrid', '@regression'] }, () => {
  test(
    'a cart built through the API renders line-for-line in the UI',
    { tag: '@smoke' },
    async ({ api, session, checkoutPage }) => {
      const catalogue = await expectSchema(await api.products.list(), 200, ProductPageSchema);
      const products = catalogue.data.filter((p) => p.in_stock && !p.is_rental).slice(0, 2);
      expect(products, 'two buyable products').toHaveLength(2);
      const lines = products.map((p, i) => ({ product: p, quantity: i + 1 }));

      const cartId = await api.carts.createWith(
        lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      );
      await session.useCart(cartId, 3);
      await checkoutPage.open();

      await expect(checkoutPage.rows).toHaveCount(2);
      for (const { product, quantity } of lines) {
        const row = checkoutPage.row(product.name);
        await expect(row.quantity).toHaveValue(String(quantity));
        await expect(row.linePrice).toHaveText(`$${(product.price * quantity).toFixed(2)}`);
      }
      const expectedTotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
      await expect(checkoutPage.cartTotal).toHaveText(`$${expectedTotal.toFixed(2)}`);
    },
  );

  test('an order placed in the UI is recorded by the API with the same total', async ({
    api,
    signedIn: _signedIn,
    customerToken,
    session,
    checkoutPage,
  }) => {
    test.slow(); // full checkout journey against a shared public site
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 2 }]);
    await session.useCart(cartId, 2);

    await checkoutPage.open();
    await checkoutPage.proceedFromCart.click();
    await checkoutPage.proceedFromSignIn.click();
    await checkoutPage.proceedFromAddress.click();
    await checkoutPage.pay('cash-on-delivery');
    await expect(checkoutPage.confirmation).toBeVisible();
    const invoiceNumber = await checkoutPage.invoiceNumber();

    const invoice = await api.invoices.findByNumber(customerToken, invoiceNumber);
    expect(invoice, `invoice ${invoiceNumber} in the customer's history`).toBeDefined();
    expect(toCents(invoice!.total)).toBe(toCents(product.price * 2));
  });
});
