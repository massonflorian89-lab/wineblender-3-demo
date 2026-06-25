/**
 * 06-baremage.spec.js — Parcours 6 : barémage creux → volume (Phase 1)
 *
 * Vérifie :
 *   6.1 — parametres.html section Épalement se charge (modèles + cuves)
 *   6.2 — wb3_volume_from_mesure interpole correctement via RPC
 *          (données éphémères : modèle 3 points créé + nettoyé par le test)
 *
 * Stratégie :
 *   • Données de test entièrement via REST (sans passer par l'UI de saisie) :
 *     isole le test du flux de saisie, tourne en < 5 s.
 *   • Sélectionne le premier contenant sans calibration existante pour ne pas
 *     écraser les données de production.
 *   • Skip gracieux si tous les contenants sont déjà calibrés.
 *   • Cleanup systématique dans afterEach (DELETE en cascade via FK).
 */
import { test, expect } from '@playwright/test';
import { getJwt, SUPABASE_URL, SUPABASE_ANON_KEY } from './helpers/auth.js';

test.describe('Parcours 6 — Barémage (creux → volume)', () => {

  let jwt        = null;
  let tenantId   = null;
  let modeleId   = null;   // baremage_modele créé par le test (cleanup)
  let baremageId = null;   // contenant_baremage créé par le test (cleanup)

  test.afterEach(async () => {
    if (!jwt) return;
    const h = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Prefer': 'return=minimal',
    };
    /* Supprimer dans l'ordre FK : contenant_baremage d'abord, modele ensuite
     * (les points sont supprimés en CASCADE sur baremage_modele). */
    if (baremageId) {
      await fetch(`${SUPABASE_URL}/rest/v1/contenant_baremage?id=eq.${baremageId}`,
        { method: 'DELETE', headers: h }).catch(() => {});
      baremageId = null;
    }
    if (modeleId) {
      await fetch(`${SUPABASE_URL}/rest/v1/baremage_modele?id=eq.${modeleId}`,
        { method: 'DELETE', headers: h }).catch(() => {});
      modeleId = null;
    }
  });

  test('6.1 — parametres.html section Épalement se charge', async ({ page }) => {
    await page.goto('/parametres.html');

    /* Attendre que la section par défaut ("Mon profil") soit rendue : preuve que
     * l'IIFE async a terminé son init (click handlers attachés, renderSection() appelé).
     * Cliquer avant ce point = les handlers ne sont pas encore en place. */
    await expect(
      page.locator('#settings-content h2').filter({ hasText: /Mon profil/i })
    ).toBeVisible({ timeout: 15_000 });

    /* Désactiver le mode aide */
    await page.evaluate(() => {
      if (typeof WB3Help !== 'undefined') WB3Help.set(false);
      document.body.classList.remove('wb3-help-on');
    });

    /* Cliquer sur "Cuverie" dans la nav des paramètres (préciser #settings-nav
     * pour ne pas ambigüité avec la nav principale du shell) */
    await page.click('#settings-nav [data-section="cuverie_group"]');

    /* Le sous-onglet "Épalement" apparaît dans la barre des subtabs */
    await expect(page.locator('[data-subtab="epalement"]')).toBeVisible({ timeout: 8_000 });
    await page.click('[data-subtab="epalement"]');

    /* La section barémage rend son titre (h2) */
    await expect(
      page.locator('h2').filter({ hasText: /Épalement/i })
    ).toBeVisible({ timeout: 15_000 });

    /* Le compteur "X / Y cuve(s) calibrée(s)" est présent */
    await expect(
      page.locator('text=/cuve|modèle/i').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('6.2 — wb3_volume_from_mesure interpole creux → volume (RPC)', async ({ page }) => {

    /* ── Initialisation auth ──────────────────────────────────── */
    await page.goto('/analyses.html');
    jwt = await getJwt(page);

    tenantId = await page.evaluate(() => window.WB3DB?.getCurrentTenant?.()?.id);
    if (!tenantId) { test.skip(true, 'Tenant ID non disponible'); return; }

    const apiH = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };

    /* ── Trouver un contenant sans calibration existante ─────── */
    const [allConts, allBars] = await page.evaluate(
      async ({ url, key, jwt }) => {
        const h = { 'apikey': key, 'Authorization': `Bearer ${jwt}` };
        const [rc, rb] = await Promise.all([
          fetch(`${url}/rest/v1/contenants?select=id,nom&actif=is.true&order=nom`, { headers: h }),
          fetch(`${url}/rest/v1/contenant_baremage?select=contenant_id`, { headers: h }),
        ]);
        return [await rc.json(), await rb.json()];
      },
      { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, jwt }
    );

    const calibratedIds = new Set((allBars || []).map(b => b.contenant_id));
    const uncal = (allConts || []).find(c => !calibratedIds.has(c.id));

    if (!uncal) {
      test.skip(true, 'Tous les contenants ont déjà une calibration — skip pour ne pas écraser les données de prod');
      return;
    }
    const contenantId = uncal.id;

    /* ── 1. Créer un modèle d'abaque test ────────────────────── */
    const modData = await page.evaluate(
      async ({ url, h, tenant_id }) => {
        const r = await fetch(`${url}/rest/v1/baremage_modele`, {
          method: 'POST',
          headers: { ...h, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            tenant_id,
            nom: `PW_TEST_BAREMAGE_${Date.now()}`,
            capacite_nominale_hl: 400,
          }),
        });
        return r.json();
      },
      { url: SUPABASE_URL, h: apiH, tenant_id: tenantId }
    );
    expect(modData?.[0]?.id, 'Modèle barémage créé').toBeTruthy();
    modeleId = modData[0].id;

    /* ── 2. Points creux→volume (3 paliers linéaires) ────────── */
    await page.evaluate(
      async ({ url, h, tenant_id, modele_id }) => {
        await fetch(`${url}/rest/v1/baremage_modele_point`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify([
            { tenant_id, modele_id, creux_cm: 0,   volume_hl: 400 },
            { tenant_id, modele_id, creux_cm: 100,  volume_hl: 200 },
            { tenant_id, modele_id, creux_cm: 200,  volume_hl: 0   },
          ]),
        });
      },
      { url: SUPABASE_URL, h: apiH, tenant_id: tenantId, modele_id: modeleId }
    );

    /* ── 3. Calibration contenant → modèle ───────────────────── */
    const barData = await page.evaluate(
      async ({ url, h, tenant_id, contenant_id, modele_id }) => {
        const r = await fetch(`${url}/rest/v1/contenant_baremage`, {
          method: 'POST',
          headers: { ...h, 'Prefer': 'return=representation' },
          body: JSON.stringify({ tenant_id, contenant_id, modele_id, hauteur_totale_cm: 200 }),
        });
        return r.json();
      },
      { url: SUPABASE_URL, h: apiH, tenant_id: tenantId, contenant_id: contenantId, modele_id: modeleId }
    );
    expect(barData?.[0]?.id, 'Calibration contenant créée').toBeTruthy();
    baremageId = barData[0].id;

    /* ── 4. RPC wb3_volume_from_mesure : creux 50 cm ─────────── */
    /* Points : [0→400], [100→200], [200→0]
     * Pour creux = 50 : interpolation entre (0,400) et (100,200)
     * = 400 + (200−400) × (50−0) / (100−0) = 400 − 100 = 300 hL */
    const vol = await page.evaluate(
      async ({ url, h, tenant_id, contenant_id }) => {
        const r = await fetch(`${url}/rest/v1/rpc/wb3_volume_from_mesure`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            p_tenant_id:    tenant_id,
            p_contenant_id: contenant_id,
            p_mesure_cm:    50,
          }),
        });
        return r.json();
      },
      { url: SUPABASE_URL, h: apiH, tenant_id: tenantId, contenant_id: contenantId }
    );

    expect(Number(vol), 'creux 50 cm → 300 hL (interpolation linéaire)').toBeCloseTo(300, 0);
  });

});
