import { test, expect } from '@playwright/test';
import { heuristicAnalysis } from '../../src/reporting/heuristics';
import { sanitize } from '../../src/reporting/redact';
import type { FailureContext } from '../../src/reporting/types';

function failure(errorMessage: string, overrides: Partial<FailureContext> = {}): FailureContext {
  return {
    title: 'example',
    file: 'tests/example.spec.ts',
    project: 'chromium',
    tags: [],
    outcome: 'unexpected',
    attempts: 1,
    errorMessage,
    stack: '',
    ...overrides,
  };
}

test.describe('heuristic failure classification', { tag: '@unit' }, () => {
  const cases: Array<[string, FailureContext, string]> = [
    [
      'flaky outcome wins over the message',
      failure('Timeout 10000ms exceeded', { outcome: 'flaky', attempts: 2 }),
      'flaky-test',
    ],
    ['network failure', failure('page.goto: net::ERR_NAME_NOT_RESOLVED at https://x'), 'environment-issue'],
    ['server error', failure('https://api/x returned 503, expected 200. Body: …'), 'environment-issue'],
    [
      'contract drift',
      failure('Response from https://api/x does not match its contract:\n • price: expected number'),
      'product-bug',
    ],
    [
      'ambiguous locator',
      failure("strict mode violation: getByTestId('x') resolved to 2 elements"),
      'automation-bug',
    ],
    [
      'element never appeared',
      failure("Timeout 10000ms exceeded.\nwaiting for getByTestId('nav-menu')"),
      'automation-bug',
    ],
    ['new a11y violation', failure('New accessibility violations\nExpected: []'), 'product-bug'],
    ['unrecognised', failure('something odd'), 'unknown'],
  ];

  for (const [name, ctx, category] of cases) {
    test(name, () => {
      expect(heuristicAnalysis(ctx).category).toBe(category);
    });
  }
});

test.describe('sanitize', { tag: '@unit' }, () => {
  test('redacts JWTs, bearer tokens and API keys', () => {
    // Synthetic values: {"alg":"none"}.{"sub":"test"}."signature-fake" and a fake key.
    const jwt = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJlLWZha2U';
    const text = `token=${jwt} header=Bearer fake-bearer-value key=sk-ant-FAKE-not-a-real-key`;

    const result = sanitize(text);

    expect(result).not.toContain(jwt);
    expect(result).not.toContain('fake-bearer-value');
    expect(result).not.toContain('not-a-real-key');
    expect(result).toContain('<redacted-jwt>');
  });

  test('strips ANSI colours and truncates long text', () => {
    const result = sanitize(`\u001b[31mred\u001b[39m ${'x'.repeat(50)}`, 20);

    expect(result.startsWith('red ')).toBe(true);
    expect(result).toContain('[truncated]');
  });
});
