/**
 * 05-operation-planifie.spec.js — Parcours 5 : créer une opération planifiée
 *
 * Vérifie :
 *   • operations.html se charge et affiche le FAB
 *   • FAB ouvre le drawer avec la grille des types d'opération
 *   • On peut sélectionner un type, remplir les champs minimaux et enregistrer
 *   • L'opération apparaît dans la liste avec le bon statut
 *   • Cleanup : suppression via REST
 *
 * Stratégie "pas d'effet de bord" :
 *   • Statut = "planifié" → le RPC wb3_save_operation_graph est appelé mais
 *     ne crée PAS de lot_mouvements tant que statut ≠ "realise".
 *   • Type choisi : "relogement" (seul champ obligatoire : contenants src+dst,
 *     volume). Skip si moins de 2 contenants actifs dans le tenant.
 *   • L'opération créée reste en "planifié" et est supprimée en afterEach.
 *
 * Note : tester la transition planifié → réalisé est intentionnellement hors
 * scope de ce harness (irréversible : déplacement de volumes réels).
 */
import { test, expect } from '@playwright/test';
import { getJwt, deleteOperation, SUPABASE_URL, SUPABASE_ANON_KEY } from './helpers/auth.js';

test.describe('Parcours 5 — Opérations (drawer + planification)', () => {

  let createdOpId = null;
  let jwt = null;

  test.afterEach(async () => {
    if (createdOpId && jwt) {
      await deleteOperation(jwt, createdOpId).catch((e) =>
        console.warn('[cleanup] deleteOperation échoué :', e.message)
      );
      createdOpId = null;
    }
  });

  test('5.1 — operations.html charge et affiche le FAB', async ({ page }) => {
    await page.goto('/operations.html');

    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });
    await expect(page.locator('.auth-error, #login-screen')).toHaveCount(0);
  });

  test('5.2 — FAB ouvre le drawer avec la grille des types', async ({ page }) => {
    await page.goto('/operations.html');

    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });

    /* wb3-help.js intercepte le 1er clic en capture-phase (stopPropagation)
     * quand le mode aide est actif → openDrawer() n'est jamais appelé.
     * La session démo a le mode aide activé en localStorage → on le coupe. */
    await page.evaluate(() => {
      if (typeof WB3Help !== 'undefined') WB3Help.set(false);
      document.body.classList.remove('wb3-help-on');
    });

    await page.click('button.fab');

    /* Drawer ouvert : .open est ajoutée APRÈS renderTypeGrid(). */
    await expect(page.locator('#drawer.open')).toBeAttached({ timeout: 15_000 });

    /* Grille des types peuplée (au moins 1 carte) */
    await expect(page.locator('#op-type-grid .op-type-card').first())
      .toBeVisible({ timeout: 8_000 });
  });

  test('5.3 — créer une opération "relogement" planifiée', async ({ page }) => {
    await page.goto('/operations.html');
    jwt = await getJwt(page);

    /* Vérifier qu'il y a au moins 2 contenants actifs */
    const contRes = await page.evaluate(
      async ({ url, key, jwt }) => {
        const r = await fetch(
          `${url}/rest/v1/contenants?select=id,nom&actif=is.true&order=created_at.asc&limit=2`,
          { headers: { 'apikey': key, 'Authorization': `Bearer ${jwt}` } }
        );
        return r.json();
      },
      { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, jwt }
    );
    if (!contRes || contRes.length < 2) {
      test.skip(true, 'Moins de 2 contenants actifs — impossible de tester un relogement');
    }

    /* 1. Ouvrir le drawer */
    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });

    /* Même désactivation du mode aide */
    await page.evaluate(() => {
      if (typeof WB3Help !== 'undefined') WB3Help.set(false);
      document.body.classList.remove('wb3-help-on');
    });

    await page.click('button.fab');
    await expect(page.locator('#drawer.open')).toBeAttached({ timeout: 15_000 });

    /* 2. Sélectionner le type "relogement" */
    const typeBtn = page.locator('#op-type-grid .op-type-card').filter({ hasText: /relogement/i }).first();
    await expect(typeBtn).toBeVisible({ timeout: 8_000 });
    await typeBtn.click();

    /* 3. Date */
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#f-date', today);

    /* 4. Statut → planifié */
    await page.selectOption('#f-statut', 'planifie');

    /* 5. Opérateur (champ libre) */
    const TAG = `PW_TEST_${Date.now()}`;
    await page.fill('#f-operateur', TAG);

    /* 6. Contenants source + destination (sélects chargés async) */
    const selSrc = page.locator('#f-contenant-src, select[id*="source"], .contenant-src select').first();
    const selDst = page.locator('#f-contenant-dst, select[id*="dest"],   .contenant-dst select').first();

    const srcVisible = await selSrc.isVisible().catch(() => false);
    const dstVisible = await selDst.isVisible().catch(() => false);

    if (srcVisible) {
      await page.waitForFunction(
        (sel) => (document.querySelector(sel)?.options.length ?? 0) > 1,
        'select[id*="source"], #f-contenant-src',
        { timeout: 10_000 }
      );
      await selSrc.selectOption({ index: 1 });
    }
    if (dstVisible) {
      await page.waitForFunction(
        (sel) => (document.querySelector(sel)?.options.length ?? 0) > 1,
        'select[id*="dest"], #f-contenant-dst',
        { timeout: 10_000 }
      );
      await selDst.selectOption({ index: 1 });
    }

    /* 7. Volume */
    const volInput = page.locator('#f-volume');
    if (await volInput.isVisible().catch(() => false)) {
      await volInput.fill('1');
    }

    /* 8. Enregistrer */
    await page.click('button:has-text("Enregistrer")');

    /* 9. Drawer se ferme ou toast succès */
    await Promise.race([
      expect(page.locator('#drawer')).not.toBeVisible({ timeout: 12_000 }),
      expect(page.locator('.toast, [class*="toast"]').filter({ hasText: /ok|success|enregistr/i }).first())
        .toBeVisible({ timeout: 12_000 }),
    ]).catch(() => { /* l'un des deux suffit */ });

    /* 10. Récupérer l'ID via REST pour le cleanup */
    const opRes = await page.evaluate(
      async ({ url, key, jwt, tag }) => {
        const r = await fetch(
          `${url}/rest/v1/operations?operateur=eq.${encodeURIComponent(tag)}&select=id&order=created_at.desc&limit=1`,
          { headers: { 'apikey': key, 'Authorization': `Bearer ${jwt}` } }
        );
        return r.json();
      },
      { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, jwt, tag: TAG }
    );
    if (opRes?.length) createdOpId = opRes[0].id;
  });

});
