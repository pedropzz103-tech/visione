import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 45000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:8081', headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined }, trace: 'retain-on-failure' },
  webServer: { command: 'EXPO_PUBLIC_API_URL=http://127.0.0.1:8787 npm run web --prefix mobile -- --port 8081', url: 'http://127.0.0.1:8081', reuseExistingServer: !process.env.CI, timeout: 120000 }
});
