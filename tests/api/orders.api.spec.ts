import { test, expect } from '../../src/fixtures';
import { expectSchema, expectStatus, InvoiceSchema, PaymentResultSchema } from '../../src/api';
import { buildCustomer } from '../../src/data/factories';
import { toCents } from '../../src/utils/money';
import { z } from 'zod';

test.describe('Orders API · payment and invoices', { tag: '@api' }, () => {
  test('accepts cash on delivery', async ({ api }) => {
    const body = await expectSchema(
      await api.invoices.checkPayment('cash-on-delivery'),
      200,
      PaymentResultSchema,
    );
    expect(body.message).toBe('Payment was successful');
  });

  test('rejects malformed card details field by field', async ({ api }) => {
    const response = await api.invoices.checkPayment('credit-card', {
      credit_card_number: '123',
      expiration_date: '01/2020',
      cvv: '1',
      card_holder_name: 'Test Holder',
    });
    const body = await expectSchema(
      response,
      422,
      z.object({ errors: z.record(z.string(), z.array(z.string())) }),
    );

    expect(Object.keys(body.errors).sort()).toEqual([
      'payment_details.credit_card_number',
      'payment_details.cvv',
      'payment_details.expiration_date',
    ]);
  });

  test(
    'places an order and totals it correctly',
    { tag: '@smoke' },
    async ({ api, customer, customerToken }) => {
      const product = await api.products.firstBuyable();
      const cartId = await api.carts.createWith([{ productId: product.id, quantity: 3 }]);
      const address = await api.invoices.lookupAddressOk();

      const invoice = await api.invoices.createOk(customerToken, {
        cartId,
        address,
        paymentMethod: 'cash-on-delivery',
      });

      expect(invoice.user_id).toBe(customer.id);
      expect(toCents(invoice.subtotal)).toBe(toCents(product.price * 3));
      expect(invoice.billing_city).toBe(address.city);

      const fromHistory = await api.invoices.findByNumber(customerToken, invoice.invoice_number);
      expect(fromHistory, 'the order appears in the customer’s invoice history').toBeDefined();
    },
  );

  test('requires authentication to order', async ({ api }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);
    const address = await api.invoices.lookupAddressOk();

    await expectStatus(
      await api.invoices.create('', { cartId, address, paymentMethod: 'cash-on-delivery' }),
      401,
    );
  });

  test('refuses a city that does not belong to the billing country', async ({ api, customerToken }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);
    const address = {
      street: 'Damrak',
      house_number: '1',
      city: 'Amsterdam',
      state: 'Noord-Holland',
      country: 'NL',
      postcode: '1012LG',
    };

    const body = await expectSchema(
      await api.invoices.create(customerToken, { cartId, address, paymentMethod: 'cash-on-delivery' }),
      422,
      z.object({ billing_country: z.array(z.string()) }),
    );

    expect(body.billing_country[0]).toContain('city does not belong to the selected country');
  });

  test('one customer cannot read another customer’s invoice', async ({ api, customerToken }) => {
    const product = await api.products.firstBuyable();
    const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);
    const address = await api.invoices.lookupAddressOk();
    const invoice = await api.invoices.createOk(customerToken, {
      cartId,
      address,
      paymentMethod: 'cash-on-delivery',
    });

    const other = buildCustomer();
    await api.users.registerOk(other);
    const otherToken = await api.users.tokenFor(other.email, other.password);

    await expectStatus(await api.invoices.get(otherToken, invoice.id), 404);
    await expectSchema(await api.invoices.get(customerToken, invoice.id), 200, InvoiceSchema);
  });

  test(
    'a checked-out cart cannot be invoiced twice',
    {
      annotation: {
        type: 'known defect',
        description:
          'Observed 2026-11-14: a second POST /invoices with the same cart_id returns 201 and a new invoice number, so a double submit creates a duplicate order.',
      },
    },
    async ({ api, customerToken }) => {
      test.fail();
      const product = await api.products.firstBuyable();
      const cartId = await api.carts.createWith([{ productId: product.id, quantity: 1 }]);
      const address = await api.invoices.lookupAddressOk();
      await api.invoices.createOk(customerToken, { cartId, address, paymentMethod: 'cash-on-delivery' });

      const second = await api.invoices.create(customerToken, {
        cartId,
        address,
        paymentMethod: 'cash-on-delivery',
      });

      expect(
        second.status(),
        'the second invoice for the same cart should be refused',
      ).toBeGreaterThanOrEqual(400);
    },
  );
});
