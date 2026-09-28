import { defineConfig, devices } from '@playwright/test';
import { FRONTEND_URL, webServer } from './tests/servers';

export default defineConfig({
  testDir: './tests/e2e',
  // Specs share one seeded database, so run them serially for predictable counts.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer,
});
