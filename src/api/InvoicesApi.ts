import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';
import { expectSchema } from './assertions';
import {
  InvoicePageSchema,
  InvoiceSchema,
  LookupAddressSchema,
  type Invoice,
  type LookupAddress,
} from './schemas';

export type PaymentMethod =
  'bank-transfer' | 'cash-on-delivery' | 'credit-card' | 'buy-now-pay-later' | 'gift-card';

export interface InvoiceRequest {
  cartId: string;
  address: LookupAddress;
  paymentMethod: PaymentMethod;
  paymentDetails?: Record<string, unknown>;
}

export class InvoicesApi extends BaseApi {
  create(token: string, req: InvoiceRequest): Promise<APIResponse> {
    return this.send('POST', '/invoices', {
      token,
      data: {
        cart_id: req.cartId,
        billing_street: req.address.street,
        billing_house_number: req.address.house_number,
        billing_city: req.address.city,
        billing_state: req.address.state,
        billing_country: req.address.country,
        billing_postal_code: req.address.postcode,
        payment_method: req.paymentMethod,
        payment_details: req.paymentDetails ?? {},
      },
    });
  }

  list(token: string, page = 1): Promise<APIResponse> {
    return this.send('GET', '/invoices', { token, params: { page } });
  }

  get(token: string, invoiceId: string): Promise<APIResponse> {
    return this.send('GET', `/invoices/${invoiceId}`, { token });
  }

  checkPayment(
    paymentMethod: PaymentMethod,
    paymentDetails: Record<string, unknown> = {},
  ): Promise<APIResponse> {
    return this.send('POST', '/payment/check', {
      data: { payment_method: paymentMethod, payment_details: paymentDetails },
    });
  }

  /**
   * The API rejects billing addresses whose city doesn't belong to the country,
   * and it decides that with its own postcode lookup. Real-world addresses are
   * refused, so orders must use the address the lookup returns.
   */
  lookupAddress(country: string, postcode: string, houseNumber: string): Promise<APIResponse> {
    return this.send('GET', '/postcode-lookup', {
      params: { country, postcode, house_number: houseNumber },
    });
  }

  async lookupAddressOk(country = 'NL', postcode = '3511AB', houseNumber = '1'): Promise<LookupAddress> {
    return expectSchema(await this.lookupAddress(country, postcode, houseNumber), 200, LookupAddressSchema);
  }

  /** Looks through every page of the customer's invoices; undefined if absent. */
  async findByNumber(token: string, invoiceNumber: string): Promise<Invoice | undefined> {
    for (let page = 1; ; page++) {
      const result = await expectSchema(await this.list(token, page), 200, InvoicePageSchema);
      const match = result.data.find((invoice) => invoice.invoice_number === invoiceNumber);
      if (match || page >= result.last_page) return match;
    }
  }

  async createOk(token: string, req: InvoiceRequest): Promise<Invoice> {
    return expectSchema(await this.create(token, req), 201, InvoiceSchema);
  }
}
