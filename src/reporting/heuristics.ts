import type { FailureAnalysis, FailureContext } from './types';

interface Rule {
  matches: (ctx: FailureContext, message: string) => boolean;
  analysis: FailureAnalysis;
}

const RULES: Rule[] = [
  {
    matches: (ctx) => ctx.outcome === 'flaky',
    analysis: {
      category: 'flaky-test',
      probableRootCause: 'The test failed, then passed on retry: timing or shared-state dependent.',
      suggestedFix:
        'Compare the failed and passed traces; wait for a specific UI/API state instead of time, and isolate test data.',
      confidence: 'high',
    },
  },
  {
    matches: (_ctx, m) => /net::err_|econnrefused|enotfound|etimedout|econnreset|socket hang up/.test(m),
    analysis: {
      category: 'environment-issue',
      probableRootCause: 'The application or its API was unreachable from the test runner.',
      suggestedFix: 'Check BASE_URL / API_URL, network access and whether the demo environment is up.',
      confidence: 'high',
    },
  },
  {
    matches: (_ctx, m) => /returned 5\d\d/.test(m),
    analysis: {
      category: 'environment-issue',
      probableRootCause: 'The API answered with a 5xx server error.',
      suggestedFix: 'Re-run once; if it persists, report the request and response body to the API owners.',
      confidence: 'medium',
    },
  },
  {
    matches: (_ctx, m) => m.includes('does not match its contract'),
    analysis: {
      category: 'product-bug',
      probableRootCause: 'The API response no longer matches its schema (contract drift).',
      suggestedFix:
        'Check the listed field paths against the OpenAPI document; fix the API or update the Zod contract if the change is intended.',
      confidence: 'medium',
    },
  },
  {
    matches: (_ctx, m) => m.includes('new accessibility violations'),
    analysis: {
      category: 'product-bug',
      probableRootCause: 'The page has accessibility violations that are not in the known-issue baseline.',
      suggestedFix: 'Open the attached axe-results.json, fix the markup, or record the issue with a reason.',
      confidence: 'high',
    },
  },
  {
    matches: (_ctx, m) => m.includes('strict mode violation'),
    analysis: {
      category: 'automation-bug',
      probableRootCause: 'A locator matched more than one element.',
      suggestedFix: 'Scope the locator to a container or filter it so it matches exactly one element.',
      confidence: 'high',
    },
  },
  {
    matches: (_ctx, m) => m.includes('tohavescreenshot') || m.includes('screenshot comparison failed'),
    analysis: {
      category: 'product-bug',
      probableRootCause: 'The rendered page differs from the approved visual baseline.',
      suggestedFix:
        'Open the diff image in the report. Update the baseline only if the change is intended (npm run test:visual:update).',
      confidence: 'medium',
    },
  },
  {
    matches: (_ctx, m) => /timeout \d+ms exceeded|timed out/.test(m) && /waiting for|locator/.test(m),
    analysis: {
      category: 'automation-bug',
      probableRootCause:
        'An element never reached the expected state: a stale selector or an unhandled UI state.',
      suggestedFix:
        'Open the trace at the failing step; confirm the selector still exists and which UI state was actually shown.',
      confidence: 'medium',
    },
  },
  {
    matches: (_ctx, m) => /returned 4\d\d, expected/.test(m),
    analysis: {
      category: 'product-bug',
      probableRootCause: 'The API rejected a request the test expected to succeed (or vice versa).',
      suggestedFix:
        'Read the response body in the error; check whether the request data or the API rules changed.',
      confidence: 'low',
    },
  },
  {
    matches: (_ctx, m) => m.includes('expect(') || m.includes('expected'),
    analysis: {
      category: 'product-bug',
      probableRootCause: 'The application showed or returned a value different from the expected one.',
      suggestedFix:
        'Reproduce manually with the trace; if confirmed, file a bug with the screenshot and trace.',
      confidence: 'low',
    },
  },
];

const UNKNOWN: FailureAnalysis = {
  category: 'unknown',
  probableRootCause: 'No rule matched this error.',
  suggestedFix: 'Review the error, screenshot and trace manually.',
  confidence: 'low',
};

/** Deterministic, offline classification used when AI analysis is off or fails. */
export function heuristicAnalysis(ctx: FailureContext): FailureAnalysis {
  const message = ctx.errorMessage.toLowerCase();
  return RULES.find((rule) => rule.matches(ctx, message))?.analysis ?? UNKNOWN;
}
