import { expect, type APIResponse } from '@playwright/test';
import type { z } from 'zod';

async function bodyPreview(response: APIResponse): Promise<string> {
  const text = await response.text().catch(() => '<unreadable body>');
  return text.length > 800 ? `${text.slice(0, 800)}…` : text;
}

/** Asserts the HTTP status and puts the method, URL and body in the failure message. */
export async function expectStatus(response: APIResponse, expected: number): Promise<void> {
  if (response.status() !== expected) {
    const preview = await bodyPreview(response);
    expect(
      response.status(),
      `${response.url()} returned ${response.status()}, expected ${expected}. Body: ${preview}`,
    ).toBe(expected);
  }
}

/**
 * Asserts the status, then validates the JSON body against a Zod contract and
 * returns it fully typed. Contract drift fails here with the exact field path.
 */
export async function expectSchema<T extends z.ZodType>(
  response: APIResponse,
  expected: number,
  schema: T,
): Promise<z.infer<T>> {
  await expectStatus(response, expected);
  const json: unknown = await response.json();
  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 10)
      .map((issue) => `  • ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Response from ${response.url()} does not match its contract:\n${issues}`);
  }
  return result.data;
}
