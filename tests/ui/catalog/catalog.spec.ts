import { test, expect } from '../../../src/fixtures';
import { CategoryTreeSchema, expectSchema, ProductPageSchema, SearchPageSchema } from '../../../src/api';
import { isSortedAscending, isSortedDescending, parsePrice } from '../../../src/utils/money';
import { z } from 'zod';

test.describe('Catalogue', { tag: '@regression' }, () => {
  test('home page shows a priced product grid', { tag: ['@smoke', '@mobile'] }, async ({ homePage }) => {
    await homePage.open();

    await expect(homePage.productCards).not.toHaveCount(0);
    const first = homePage.cardAt(0);
    await expect(first.name).not.toBeEmpty();
    await expect(first.price).toHaveText(/^\$\d+\.\d{2}$/);
  });

  test(
    'search shows exactly the products the search API returns',
    { tag: '@hybrid' },
    async ({ homePage, api }) => {
      const expected = await expectSchema(await api.products.search('hammer'), 200, SearchPageSchema);
      expect(expected.total, 'the API finds hammers').toBeGreaterThan(0);

      await homePage.open();
      await homePage.search('hammer');

      await expect(homePage.searchCaption).toHaveText('Searched for: hammer');
      await expect(homePage.resultCount).toHaveText(`${expected.total} products found for 'hammer'`);
      await expect
        .poll(async () => (await homePage.visibleNames()).sort())
        .toEqual(expected.data.map((p) => p.name).sort());
    },
  );

  test('search with no match explains that nothing was found', async ({ homePage }) => {
    await homePage.open();
    await homePage.search('zz-no-such-tool-zz');

    await expect(homePage.noResults).toHaveText('There are no products found.');
    await expect(homePage.productCards).toHaveCount(0);
  });

  for (const [sort, isSorted] of [
    ['price,asc', isSortedAscending],
    ['price,desc', isSortedDescending],
  ] as const) {
    test(`sorting by ${sort} orders the grid`, async ({ homePage }) => {
      await homePage.open();
      await homePage.sortBy(sort);

      await expect
        .poll(async () => isSorted((await homePage.productPrices.allInnerTexts()).map(parsePrice)))
        .toBe(true);
    });
  }

  test(
    'category filter shows exactly what the API returns for that category',
    { tag: '@hybrid' },
    async ({ homePage, api }) => {
      const tree = await expectSchema(await api.products.categoryTree(), 200, z.array(CategoryTreeSchema));
      const hammer = tree.flatMap((c) => c.sub_categories ?? []).find((c) => c.slug === 'hammer');
      expect(hammer).toBeDefined();
      const expected = await expectSchema(
        await api.products.list({ by_category: hammer!.id }),
        200,
        ProductPageSchema,
      );

      await homePage.open();
      await homePage.filterByCategory(hammer!.name);

      await expect
        .poll(async () => (await homePage.visibleNames()).sort())
        .toEqual(expected.data.map((p) => p.name).sort());
    },
  );
});
