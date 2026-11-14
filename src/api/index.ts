import type { APIRequestContext } from '@playwright/test';
import { CartsApi } from './CartsApi';
import { InvoicesApi } from './InvoicesApi';
import { ProductsApi } from './ProductsApi';
import { UsersApi } from './UsersApi';

export interface ToolshopApi {
  users: UsersApi;
  products: ProductsApi;
  carts: CartsApi;
  invoices: InvoicesApi;
}

export function createApi(request: APIRequestContext): ToolshopApi {
  return {
    users: new UsersApi(request),
    products: new ProductsApi(request),
    carts: new CartsApi(request),
    invoices: new InvoicesApi(request),
  };
}

export * from './schemas';
export { expectSchema, expectStatus } from './assertions';
export type { PaymentMethod } from './InvoicesApi';
