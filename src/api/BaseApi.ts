import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../config/env';

type QueryValue = string | number | boolean;

export interface RequestOptions {
  data?: unknown;
  params?: Record<string, QueryValue>;
  token?: string;
}

/**
 * Thin wrapper over Playwright's APIRequestContext. Services return the raw
 * APIResponse so tests decide what status is expected; there is no hidden
 * retry, fallback or mock that could turn a real failure into a pass.
 */
export abstract class BaseApi {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly baseUrl: string = env.apiUrl,
  ) {}

  protected send(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }
    return this.request.fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      data: options.data,
      params: options.params,
    });
  }
}
