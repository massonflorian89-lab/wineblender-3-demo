/**
 * setup.js — Authentification initiale via l'API Supabase (sans UI navigateur).
 *
 * Appelle directement POST /auth/v1/token pour obtenir access_token + refresh_token,
 * puis construit le fichier tests/.auth/session.json au format storageState Playwright
 * (localStorage injecté dans tous les tests chromium).
 *
 * Plus fiable que passer par le formulaire WB3 : ne dépend pas du boot de l'app.
 */
import { test as setup } from '@playwright/test';
import fs from 'fs/promises';

const SESSION_FILE = 'tests/.auth/session.json';

const SUPABASE_URL      = 'https://wvpcknxvqkwykxfnrzzd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cGNrbnh2cWt3eWt4Zm5yenpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODY4NDMsImV4cCI6MjA5Mjg2Mjg0M30.wNniapvnySVtIlgEf4ow4kXmAqPSL4H7gs1hwHN07UY';
const BASE_URL          = process.env.WB3_BASE_URL || 'http://localhost:3001';

/* Clé localStorage que le SDK supabase-js utilise pour stocker la session. */
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

setup('authentification demo', async ({ request }) => {
  const email    = process.env.WB3_TEST_EMAIL;
  const password = process.env.WB3_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Variables WB3_TEST_EMAIL et WB3_TEST_PASSWORD absentes.\n' +
      'Copiez .env.example en .env et remplissez les identifiants.'
    );
  }

  /* — Login via l'API Supabase (pas de navigateur) — */
  const resp = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        'apikey':       SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email, password },
    }
  );

  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(`Login Supabase échoué (${resp.status()}): ${body}`);
  }

  const session = await resp.json();

  if (!session.access_token) {
    throw new Error(`Réponse Supabase sans access_token : ${JSON.stringify(session)}`);
  }

  /* — Construire le storageState au format Playwright — */
  const storageValue = JSON.stringify({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
    expires_at:    session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    expires_in:    session.expires_in  ?? 3600,
    token_type:    'bearer',
    user:          session.user,
  });

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [
          { name: STORAGE_KEY, value: storageValue },
        ],
      },
    ],
  };

  await fs.mkdir('tests/.auth', { recursive: true });
  await fs.writeFile(SESSION_FILE, JSON.stringify(storageState, null, 2));

  console.log(`[setup] Session stockée pour ${email} (expire dans ${session.expires_in}s)`);
});
