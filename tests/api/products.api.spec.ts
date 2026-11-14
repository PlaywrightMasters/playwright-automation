import { test, expect } from '../../src/fixtures';
import {
  BrandSchema,
  CategoryTreeSchema,
  expectSchema,
  MessageSchema,
  ProductPageSchema,
  ProductSchema,
  SearchPageSchema,
} from '../../src/api';
import { isSortedAscending, isSortedDescending } from '../../src/utils/money';
import { z } from 'zod';

test.describe('Products API · catalogue', { tag: '@api' }, () => {
  test('lists the first page under the pagination contract', { tag: '@smoke' }, async ({ api }) => {
    const page = await expectSchema(await api.products.list(), 200, ProductPageSchema);

    expect(page.current_page).toBe(1);
    expect(page.data.length).toBeGreaterThan(0);
    expect(page.data.length).toBeLessThanOrEqual(page.per_page);
    expect(page.total).toBeGreaterThanOrEqual(page.data.length);
  });

  test('pages do not overlap', async ({ api }) => {
    const first = await expectSchema(await api.products.list({ page: 1 }), 200, ProductPageSchema);
    const second = await expectSchema(await api.products.list({ page: 2 }), 200, ProductPageSchema);

    const firstIds = new Set(first.data.map((p) => p.id));
    expect(second.current_page).toBe(2);
    expect(second.data.filter((p) => firstIds.has(p.id))).toEqual([]);
  });

  for (const [sort, isSorted] of [
    ['price,asc', isSortedAscending],
    ['price,desc', isSortedDescending],
  ] as const) {
    test(`sorts by ${sort}`, async ({ api }) => {
      const page = await expectSchema(await api.products.list({ sort }), 200, ProductPageSchema);
      const prices = page.data.map((p) => p.price);

      expect(isSorted(prices), `prices: ${prices.join(', ')}`).toBe(true);
    });
  }

  test('filters by price range', async ({ api }) => {
    const page = await expectSchema(
      await api.products.list({ between: 'price,10,20' }),
      200,
      ProductPageSchema,
    );

    expect(page.data.length).toBeGreaterThan(0);
    for (const product of page.data) {
      expect(product.price, product.name).toBeGreaterThanOrEqual(10);
      expect(product.price, product.name).toBeLessThanOrEqual(20);
    }
  });

  test('filters by category', async ({ api }) => {
    const tree = await expectSchema(await api.products.categoryTree(), 200, z.array(CategoryTreeSchema));
    const hammer = tree.flatMap((c) => c.sub_categories ?? []).find((c) => c.slug === 'hammer');
    expect(hammer, 'the "hammer" sub-category exists').toBeDefined();

    const page = await expectSchema(
      await api.products.list({ by_category: hammer!.id }),
      200,
      ProductPageSchema,
    );

    expect(page.data.length).toBeGreaterThan(0);
    expect(page.data.every((p) => p.category.id === hammer!.id)).toBe(true);
  });

  test('lists brands', async ({ api }) => {
    const brands = await expectSchema(await api.products.brands(), 200, z.array(BrandSchema));
    expect(brands.length).toBeGreaterThan(0);
  });
});

test.describe('Products API · search and detail', { tag: '@api' }, () => {
  test('search returns only matching products', async ({ api }) => {
    const page = await expectSchema(await api.products.search('pliers'), 200, SearchPageSchema);

    expect(page.data.length).toBeGreaterThan(0);
    for (const product of page.data) {
      expect(product.name.toLowerCase()).toContain('pliers');
    }
  });

  test('search with no match returns an empty page', async ({ api }) => {
    const page = await expectSchema(await api.products.search('zz-no-such-tool-zz'), 200, SearchPageSchema);

    expect(page.total).toBe(0);
    expect(page.data).toEqual([]);
  });

  test('detail matches the catalogue entry', async ({ api }) => {
    const listed = await api.products.firstBuyable();

    const detail = await expectSchema(await api.products.get(listed.id), 200, ProductSchema);

    expect(detail).toMatchObject({ id: listed.id, name: listed.name, price: listed.price });
  });

  test('unknown product id returns 404', async ({ api }) => {
    const body = await expectSchema(await api.products.get('01XXXXXXXXXXXXXXXXXXXXXXXX'), 404, MessageSchema);
    expect(body.message).toBe('Requested item not found');
  });
});
