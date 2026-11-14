import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

const BROWSER_TESTS = /tests[\\/](ui|hybrid|a11y|visual)[\\/]/;

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  fullyParallel: true,
  forbidOnly: env.ci,
  retries: env.ci ? 2 : 0,
  // A shared public demo site: keep the load polite.
  workers: env.ci ? 2 : 4,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['allure-playwright', { resultsDir: 'reports/allure-results', detail: false }],
    ['./src/reporting/FailureAnalysisReporter.ts'],
  ],
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
  use: {
    baseURL: env.baseUrl,
    testIdAttribute: 'data-test',
    locale: 'en-US',
    timezoneId: 'Europe/Amsterdam',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'unit', testDir: './tests/unit' },
    { name: 'api', testDir: './tests/api', use: { baseURL: env.apiUrl } },
    {
      name: 'chromium',
      testMatch: BROWSER_TESTS,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: BROWSER_TESTS,
      grepInvert: /@visual|@a11y/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: BROWSER_TESTS,
      grepInvert: /@visual|@a11y/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: BROWSER_TESTS,
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      testMatch: BROWSER_TESTS,
      grep: /@mobile/,
      use: { ...devices['iPhone 15'] },
    },
  ],
});
