import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * Runs against a production build served by `next start`, not the dev server,
 * so the tests exercise the same bundle, headers and error pages that ship.
 * Inside the test container the app is started by scripts/ci.sh; locally,
 * `webServer` starts it on demand.
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // A narrow viewport, so the mobile navigation and stacked forms are
      // genuinely exercised rather than assumed to work.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /responsive\.spec\.ts|public-site\.spec\.ts/,
    },
  ],

  // Only used outside the containerised CI run, which starts the server itself.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run start',
          url: 'http://127.0.0.1:3000/api/health',
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
