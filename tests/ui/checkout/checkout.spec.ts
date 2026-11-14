import { test, expect } from '../../../src/fixtures';

test.describe('Checkout', { tag: '@regression' }, () => {
  test(
    'signed-in customer buys a product with cash on delivery',
    { tag: '@smoke' },
    async ({ api, signedIn: _signedIn, productPage, checkoutPage }) => {
      test.slow(); // full four-step journey against a shared public site
      const product = await api.products.firstBuyable();

      await test.step('add the product to the cart', async () => {
        await productPage.open(product.id);
        await productPage.addToCart();
        await expect(productPage.addedToCartToast).toBeVisible();
        await productPage.nav.openCart();
      });

      await test.step('cart → sign-in step recognises the session', async () => {
        await expect(checkoutPage.row(product.name).title).toBeVisible();
        await checkoutPage.proceedFromCart.click();
        await expect(checkoutPage.alreadySignedIn).toBeVisible();
        await checkoutPage.proceedFromSignIn.click();
      });

      await test.step('billing address is filled from the profile', async () => {
        await expect(checkoutPage.addressField('country')).toHaveValue('NL');
        await expect(checkoutPage.addressField('city')).not.toHaveValue('');
        await checkoutPage.proceedFromAddress.click();
      });

      await test.step('pay and confirm', async () => {
        await checkoutPage.pay('cash-on-delivery');
        await expect(checkoutPage.confirmation).toContainText(
          /Thanks for your order! Your invoice number is INV-\d+/,
        );
      });
    },
  );

  test('payment must be chosen before confirming', async ({
    api,
    signedIn: _signedIn,
    session,
    checkoutPage,
  }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);
    await session.useCart(cartId, 1);

    await checkoutPage.open();
    await checkoutPage.proceedFromCart.click();
    await checkoutPage.proceedFromSignIn.click();
    await checkoutPage.proceedFromAddress.click();

    await expect(checkoutPage.paymentMethod).toBeVisible();
    await expect(checkoutPage.finishButton).toBeDisabled();
  });
});
