import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

export interface KnownIssue {
  rule: string;
  reason: string;
}

/**
 * Scans the page with axe (WCAG 2.x A/AA), attaches the full result to the
 * report, and fails only on violations that are not on the known-issue list.
 * Known issues stay visible in the report, and when one is fixed the test asks
 * for it to be removed from the list, so the baseline can only get stricter.
 */
export async function expectNoNewViolations(
  page: Page,
  testInfo: TestInfo,
  knownIssues: readonly KnownIssue[] = [],
): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  await testInfo.attach('axe-results.json', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const known = new Set(knownIssues.map((issue) => issue.rule));
  const found = new Set(results.violations.map((v) => v.id));

  const unexpected = results.violations
    .filter((v) => !known.has(v.id))
    .map((v) => `${v.impact ?? 'unknown'} · ${v.id} (${v.nodes.length} node(s)): ${v.help}`);
  expect(unexpected, 'New accessibility violations').toEqual([]);

  const resolved = [...known].filter((rule) => !found.has(rule));
  expect(resolved, 'Known issues no longer present; remove them from the baseline').toEqual([]);
}
