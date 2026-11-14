import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';
import { expectSchema } from './assertions';
import { ProductPageSchema, type Product } from './schemas';

export type ProductSort = 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';

export interface ProductQuery {
  page?: number;
  sort?: ProductSort;
  by_category?: string;
  by_brand?: string;
  /** Price range, e.g. `price,10,30`. */
  between?: string;
}

export class ProductsApi extends BaseApi {
  list(query: ProductQuery = {}): Promise<APIResponse> {
    return this.send('GET', '/products', { params: { ...query } });
  }

  get(id: string): Promise<APIResponse> {
    return this.send('GET', `/products/${encodeURIComponent(id)}`);
  }

  search(q: string, page = 1): Promise<APIResponse> {
    return this.send('GET', '/products/search', { params: { q, page } });
  }

  categoryTree(): Promise<APIResponse> {
    return this.send('GET', '/categories/tree');
  }

  brands(): Promise<APIResponse> {
    return this.send('GET', '/brands');
  }

  /** First in-stock, non-rental product on the first page: a safe item to buy. */
  async firstBuyable(): Promise<Product> {
    const page = await expectSchema(await this.list(), 200, ProductPageSchema);
    const product = page.data.find((p) => p.in_stock && !p.is_rental);
    if (!product) {
      throw new Error('No in-stock, non-rental product on the first catalogue page');
    }
    return product;
  }
}
