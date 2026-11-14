import { faker } from '@faker-js/faker';

export interface NewCustomer {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  email: string;
  password: string;
  address: {
    street: string;
    house_number: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
}

/** Globally unique, clearly fake address on the reserved example.com domain. */
export function uniqueEmail(prefix = 'qa'): string {
  const stamp = Date.now().toString(36);
  const random = faker.string.alphanumeric({ length: 8, casing: 'lower' });
  return `${prefix}.${stamp}.${random}@example.com`;
}

/** Satisfies the API rules: 8+ chars with upper, lower, digit and symbol. */
export function strongPassword(): string {
  return `Qa!${faker.string.alphanumeric({ length: 10, casing: 'mixed' })}7x`;
}

export function buildCustomer(overrides: Partial<NewCustomer> = {}): NewCustomer {
  const dob = faker.date.birthdate({ mode: 'age', min: 21, max: 65 });
  return {
    first_name: faker.person.firstName().slice(0, 40),
    last_name: faker.person.lastName().slice(0, 20),
    dob: dob.toISOString().slice(0, 10),
    phone: faker.string.numeric(10),
    email: uniqueEmail(),
    password: strongPassword(),
    address: {
      street: faker.location.street().slice(0, 70),
      house_number: String(faker.number.int({ min: 1, max: 300 })),
      city: faker.location.city().slice(0, 40),
      state: faker.location.state().slice(0, 40),
      country: 'NL',
      postal_code: '3511AB',
    },
    ...overrides,
  };
}
