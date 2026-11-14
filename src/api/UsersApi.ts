import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';
import { expectSchema } from './assertions';
import { TokenSchema, UserSchema, type User } from './schemas';
import type { NewCustomer } from '../data/factories';

export class UsersApi extends BaseApi {
  register(customer: NewCustomer): Promise<APIResponse> {
    return this.send('POST', '/users/register', { data: customer });
  }

  login(email: string, password: string): Promise<APIResponse> {
    return this.send('POST', '/users/login', { data: { email, password } });
  }

  me(token?: string): Promise<APIResponse> {
    return this.send('GET', '/users/me', { token });
  }

  /** Registers the customer and returns the created user (asserts 201 + contract). */
  async registerOk(customer: NewCustomer): Promise<User> {
    return expectSchema(await this.register(customer), 201, UserSchema);
  }

  /** Logs in and returns a bearer token (asserts 200 + contract). */
  async tokenFor(email: string, password: string): Promise<string> {
    const body = await expectSchema(await this.login(email, password), 200, TokenSchema);
    return body.access_token;
  }
}
