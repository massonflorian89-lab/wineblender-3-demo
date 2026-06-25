/**
 * helpers/auth.js — Helpers partagés d'authentification pour les tests.
 *
 * Utilise l'API Supabase (REST) directement pour les opérations de
 * nettoyage (DELETE) afin d'éviter de passer par l'UI.
 */

/** URL et clé anon lues depuis les globals de l'app (même que config.js). */
export const SUPABASE_URL = 'https://wvpcknxvqkwykxfnrzzd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cGNrbnh2cWt3eWt4Zm5yenpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODY4NDMsImV4cCI6MjA5Mjg2Mjg0M30.wNniapvnySVtIlgEf4ow4kXmAqPSL4H7gs1hwHN07UY';

/**
 * Retourne le JWT de l'utilisateur depuis le localStorage Supabase
 * (injecté via storageState). Utile pour les appels API de nettoyage.
 */
export async function getJwt(page) {
  const raw = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return localStorage.getItem(key);
      }
    }
    return null;
  });
  if (!raw) throw new Error('JWT Supabase introuvable dans localStorage');
  const parsed = JSON.parse(raw);
  return parsed?.access_token ?? parsed?.data?.session?.access_token;
}

/**
 * Supprime un apport par son ID via l'API Supabase REST.
 * Utilisé en cleanup après les tests qui créent des apports de test.
 */
export async function deleteApport(jwt, apportId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/apports?id=eq.${apportId}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${jwt}`,
        'Prefer': 'return=minimal',
      },
    }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`deleteApport (${apportId}) HTTP ${res.status}: ${body}`);
  }
}

/**
 * Retourne le premier lot actif du tenant courant (pour le test d'apport).
 * Fail rapide si aucun lot n'existe — le test dépend de données demo.
 */
export async function getFirstLotId(jwt) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lots?select=id,nom&archived=is.false&order=created_at.asc&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${jwt}`,
      },
    }
  );
  const data = await res.json();
  if (!data.length) throw new Error('Aucun lot actif dans le tenant demo — vérifiez les données.');
  return data[0].id;
}

/**
 * Retourne { id, nom } du premier contenant actif du tenant.
 * Retourne null si aucun contenant n'existe (le test devra skip).
 */
export async function getFirstContenant(jwt) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contenants?select=id,nom&actif=is.true&order=created_at.asc&limit=1`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
  );
  const data = await res.json();
  return data?.length ? data[0] : null;
}

/** Supprime une analyse par son ID via REST. */
export async function deleteAnalyse(jwt, analyseId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/analyses?id=eq.${analyseId}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${jwt}`,
        'Prefer': 'return=minimal',
      },
    }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`deleteAnalyse (${analyseId}) HTTP ${res.status}: ${body}`);
  }
}

/** Supprime une opération par son ID via REST. */
export async function deleteOperation(jwt, operationId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/operations?id=eq.${operationId}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${jwt}`,
        'Prefer': 'return=minimal',
      },
    }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`deleteOperation (${operationId}) HTTP ${res.status}: ${body}`);
  }
}
