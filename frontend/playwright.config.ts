import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:5175',
    browserName: 'chromium',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  reporter: 'list',
});
