import { test } from '../../src/fixtures';
import { expectNoNewViolations, type KnownIssue } from '../../src/utils/accessibility';

/*
 * Baseline recorded 2026-11-14 with axe-core 4.14 (WCAG 2.1 A/AA). Known
 * issues stay visible in the attached report; any other rule failing on these
 * pages fails the test, and a fixed issue must be removed from the list.
 */
const LANGUAGE_BUTTON: KnownIssue = {
  rule: 'label-content-name-mismatch',
  reason: 'Language button shows "EN" but its aria-label is "Select language" (WCAG 2.5.3).',
};
const ICON_BUTTON: KnownIssue = {
  rule: 'button-name',
  reason: 'Icon-only button (.btn-outline-secondary) next to the password field has no accessible name.',
};

const PAGES: Array<{ name: string; path: string; ready: string; known: KnownIssue[] }> = [
  {
    name: 'home',
    path: '/',
    ready: 'product-name',
    known: [
      LANGUAGE_BUTTON,
      { rule: 'list', reason: 'Category filter <ul> elements contain children other than <li>.' },
    ],
  },
  { name: 'login', path: '/auth/login', ready: 'login-submit', known: [LANGUAGE_BUTTON, ICON_BUTTON] },
  {
    name: 'register',
    path: '/auth/register',
    ready: 'register-submit',
    known: [
      LANGUAGE_BUTTON,
      ICON_BUTTON,
      { rule: 'list', reason: 'Password help list (#passwordHelp > ul) contains children other than <li>.' },
    ],
  },
  { name: 'contact', path: '/contact', ready: 'contact-submit', known: [LANGUAGE_BUTTON] },
];

test.describe('Accessibility (WCAG 2.1 A/AA)', { tag: '@a11y' }, () => {
  for (const { name, path, ready, known } of PAGES) {
    test(`${name} page has no new violations`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.getByTestId(ready).first().waitFor();

      await expectNoNewViolations(page, testInfo, known);
    });
  }
});
