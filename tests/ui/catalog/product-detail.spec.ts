import { test, expect } from '../../../src/fixtures';
import { expectSchema, ProductSchema } from '../../../src/api';

test.describe('Product detail', { tag: '@regression' }, () => {
  test(
    'shows the same name, price and description as the API',
    { tag: '@hybrid' },
    async ({ api, productPage }) => {
      const listed = await api.products.firstBuyable();
      const product = await expectSchema(await api.products.get(listed.id), 200, ProductSchema);

      await productPage.open(product.id);

      await expect(productPage.name).toHaveText(product.name);
      await expect(productPage.unitPrice).toHaveText(product.price.toFixed(2));
      await expect(productPage.description).toHaveText(product.description);
    },
  );

  test('quantity stepper increases and decreases but not below one', async ({ api, productPage }) => {
    const product = await api.products.firstBuyable();
    await productPage.open(product.id);

    await productPage.increaseQuantity.click();
    await productPage.increaseQuantity.click();
    await expect(productPage.quantity).toHaveValue('3');

    await productPage.decreaseQuantity.click();
    await productPage.decreaseQuantity.click();
    await productPage.decreaseQuantity.click();
    await expect(productPage.quantity).toHaveValue('1');
  });

  test(
    'clicking a catalogue card opens that product',
    { tag: '@mobile' },
    async ({ page, homePage, productPage }) => {
      await homePage.open();
      const card = homePage.cardAt(0);
      const name = (await card.name.innerText()).trim();

      await card.open();

      await expect(page).toHaveURL(/\/product\/[0-9A-Z]{26}$/i);
      await expect(productPage.name).toHaveText(name);
    },
  );
});
