// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { config as dotenv } from 'dotenv';
dotenv();

const BASE_URL = process.env.WB3_BASE_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  /* Sortie lisible en CI, verbose en local */
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    /* Service worker banni : évite le cache stale-while-revalidate de sw.js */
    serviceWorkers: 'block',
    /* Screenshot seulement en cas d'échec */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    /* — Projet setup : login une seule fois, stocke la session — */
    {
      name: 'setup',
      testMatch: '**/setup.js',
    },
    /* — Tests chrome (desktop) : réutilise la session du setup — */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/session.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Serveur local : npx serve doit être installé (package.json) */
  webServer: {
    command: 'npx serve . -p 3001',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
