import { test, expect } from '../../src/fixtures';
import { expectSchema, expectStatus, MessageSchema, UserSchema, ValidationErrorSchema } from '../../src/api';
import { buildCustomer, uniqueEmail } from '../../src/data/factories';

test.describe('Users API · registration', { tag: '@api' }, () => {
  test('registers a new customer and never echoes the password', { tag: '@smoke' }, async ({ api }) => {
    const customer = buildCustomer();

    const response = await api.users.register(customer);
    const user = await expectSchema(response, 201, UserSchema);

    expect(user.email).toBe(customer.email);
    expect(user.first_name).toBe(customer.first_name);
    expect(await response.json()).not.toHaveProperty('password');
  });

  test('rejects a duplicate email with 409', async ({ api, customer }) => {
    const duplicate = buildCustomer({ email: customer.email });

    const errors = await expectSchema(await api.users.register(duplicate), 409, ValidationErrorSchema);

    expect(errors.email?.join(' ')).toContain('already exists');
  });

  test('enforces every password rule', async ({ api }) => {
    const weak = buildCustomer({ password: 'short' });

    const errors = await expectSchema(await api.users.register(weak), 422, ValidationErrorSchema);
    const messages = errors.password?.join(' ') ?? '';

    expect(messages).toContain('at least 8 characters');
    expect(messages).toContain('uppercase and one lowercase');
    expect(messages).toContain('symbol');
    expect(messages).toContain('number');
  });
});

test.describe('Users API · authentication', { tag: '@api' }, () => {
  test('issues a token that identifies the customer', { tag: '@smoke' }, async ({ api, customer }) => {
    const token = await api.users.tokenFor(customer.email, customer.password);

    const me = await expectSchema(await api.users.me(token), 200, UserSchema);

    expect(me.id).toBe(customer.id);
    expect(me.email).toBe(customer.email);
  });

  test('rejects a wrong password with 401', async ({ api }) => {
    // A dedicated user: failed attempts count towards an account lock,
    // so the shared worker customer must never receive one.
    const victim = buildCustomer();
    await api.users.registerOk(victim);

    await expectStatus(await api.users.login(victim.email, 'Wrong!Password9'), 401);
  });

  test('rejects an unknown email with 401', async ({ api }) => {
    await expectStatus(await api.users.login(uniqueEmail('nobody'), 'Any!Password9'), 401);
  });

  test('protects /users/me from anonymous calls', async ({ api }) => {
    const body = await expectSchema(await api.users.me(), 401, MessageSchema);
    expect(body.message).toBe('Unauthorized');
  });

  test('rejects a tampered token', async ({ api, customerToken }) => {
    const tampered = `${customerToken.slice(0, -4)}abcd`;
    await expectStatus(await api.users.me(tampered), 401);
  });
});
