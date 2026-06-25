/**
 * 07-apports-rendement.spec.js — Parcours 7 : apports vendange & rendement (Phase 2)
 *
 * Vérifie :
 *   7.1 — Créer un apport poids brut/tare via REST → le trigger calcule
 *          poids_kg net, objectif_kg_hl, coef_extraction_pct, ecart_objectif_kg_hl.
 *   7.2 — apports.html : bouton "Rendement vendange" visible + clic ouvre la modale.
 *
 * Stratégie :
 *   • 7.1 entièrement REST (pas d'UI) : isolé du flux de saisie, rapide, précis.
 *     L'apport de test est créé avec un apporteur PW_TEST_* unique → repérable.
 *   • 7.2 UI seul : vérifie que le bouton + modale fonctionnent (module actif).
 *   • Skip gracieux si aucun lot actif dans le tenant.
 *   • Cleanup systématique dans afterEach (deleteApport de auth.js).
 */
import { test, expect } from '@playwright/test';
import { getJwt, getFirstLotId, deleteApport, SUPABASE_URL, SUPABASE_ANON_KEY } from './helpers/auth.js';

test.describe('Parcours 7 — Apports : rendement & extraction', () => {

  let jwt      = null;
  let tenantId = null;
  let apportId = null;

  test.afterEach(async () => {
    if (apportId && jwt) {
      await deleteApport(jwt, apportId).catch(e =>
        console.warn('[cleanup] deleteApport :', e.message)
      );
      apportId = null;
    }
  });

  /* ──────────────────────────────────────────────────────────────
   * 7.1 — Trigger poids + coef extraction (REST only)
   * ────────────────────────────────────────────────────────────── */
  test('7.1 — trigger poids brut/tare → net + coef_extraction_pct calculés', async ({ page }) => {

    await page.goto('/analyses.html');   // page légère pour init auth
    jwt = await getJwt(page);

    // WB3DB résout le tenant de façon async post-auth — attendre qu'il soit prêt.
    tenantId = await page.waitForFunction(
      () => window.WB3DB?.getCurrentTenant?.()?.id ?? null,
      { timeout: 10_000 }
    ).then(h => h.jsonValue()).catch(() => null);
    if (!tenantId) { test.skip(true, 'Tenant ID non disponible'); return; }

    /* Trouver un lot actif */
    let lotId;
    try { lotId = await getFirstLotId(jwt); }
    catch { test.skip(true, 'Aucun lot actif dans le tenant demo'); return; }

    const TAG   = `PW_TEST_RDT_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const apiH  = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };

    /* ── INSERT : poids brut 1300 kg, tare 300 kg → net 1000 kg ── */
    const rows = await page.evaluate(
      async ({ url, h, payload }) => {
        const r = await fetch(`${url}/rest/v1/apports`, {
          method: 'POST',
          headers: { ...h, 'Prefer': 'return=representation' },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        return { status: r.status, data };
      },
      {
        url: SUPABASE_URL,
        h: apiH,
        payload: {
          tenant_id:           tenantId,
          lot_id:              lotId,
          date_apport:         today,
          apporteur:           TAG,
          cepage_libre:        'Chardonnay',
          poids_brut_kg:       1300,
          tare_kg:             300,
          volume_jus_reel_hl:  8,
          volume_hl:           8,          // estimation = volume réel
        },
      }
    );

    expect(rows.status, `INSERT apport HTTP ${rows.status}`).toBe(201);
    const ap = Array.isArray(rows.data) ? rows.data[0] : rows.data;
    expect(ap?.id, 'apport.id présent').toBeTruthy();
    apportId = ap.id;

    /* ── Vérifier le trigger : poids net = brut − tare ────────── */
    expect(Number(ap.poids_kg), 'poids_kg = 1300 − 300 = 1000').toBeCloseTo(1000, 0);

    /* ── Objectif résolu par le trigger (≥ 1, ≤ 200) ─────────── */
    /* La valeur exacte dépend de l'éventuel override par cépage
     * ou de la tolérance cave. On vérifie juste qu'il est posé. */
    expect(ap.objectif_kg_hl, 'objectif_kg_hl résolu (non null)').not.toBeNull();
    const obj = Number(ap.objectif_kg_hl);
    expect(obj, 'objectif_kg_hl plausible (1–200)').toBeGreaterThanOrEqual(1);
    expect(obj, 'objectif_kg_hl plausible (1–200)').toBeLessThanOrEqual(200);

    /* ── coef_extraction_pct = (vol_jus × obj / poids_net) × 100 */
    /* Pour obj=130 : (8 × 130 / 1000) × 100 = 104 %            */
    const coefAttendu = (8 * obj / 1000) * 100;
    expect(Number(ap.coef_extraction_pct), `coef_extraction_pct ≈ ${coefAttendu.toFixed(1)} %`)
      .toBeCloseTo(coefAttendu, 0);

    /* ── ecart_objectif_kg_hl non null ───────────────────────── */
    /* = poids_net / vol_jus − obj = 1000/8 − obj = 125 − obj   */
    expect(ap.ecart_objectif_kg_hl, 'ecart_objectif_kg_hl calculé (non null)').not.toBeNull();
    const ecartAttendu = 1000 / 8 - obj;
    expect(Number(ap.ecart_objectif_kg_hl), `ecart ≈ ${ecartAttendu.toFixed(2)} kg/hL`)
      .toBeCloseTo(ecartAttendu, 1);
  });

  /* ──────────────────────────────────────────────────────────────
   * 7.2 — Dashboard rendement vendange (UI)
   * ────────────────────────────────────────────────────────────── */
  test('7.2 — apports.html : bouton Rendement visible + modale s\'ouvre', async ({ page }) => {
    await page.goto('/apports.html');

    /* Attendre que la page soit initialisée (FAB visible = auth OK) */
    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });

    /* Le bouton "📊 Rendement vendange" doit être présent */
    const btnRdt = page.locator('#btn-rendement');
    await expect(btnRdt).toBeVisible({ timeout: 8_000 });

    /* Désactiver le mode aide avant le clic (btn-rendement n'a pas data-help
     * mais on neutralise par précaution) */
    await page.evaluate(() => {
      if (typeof WB3Help !== 'undefined') WB3Help.set(false);
      document.body.classList.remove('wb3-help-on');
    });

    /* Cliquer → la modale s'affiche (display:flex via style inline) */
    await btnRdt.click();

    /* La modale est visible (#rdt-modal passe de display:none à display:flex) */
    await expect(page.locator('#rdt-modal')).toBeVisible({ timeout: 10_000 });

    /* Le corps de la modale a chargé son contenu (tableau ou message vide) */
    await expect(page.locator('#rdt-body')).not.toBeEmpty({ timeout: 8_000 });
  });

});
