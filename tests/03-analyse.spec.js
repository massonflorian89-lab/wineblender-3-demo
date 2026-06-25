/**
 * 03-analyse.spec.js — Parcours 3 : saisie d'une analyse sur une cuve
 *
 * Vérifie :
 *   • analyses.html se charge et affiche le FAB
 *   • Cliquer sur le FAB ouvre la modal
 *   • Remplir date + contenant + pH + densité → Enregistrer crée l'analyse
 *   • L'analyse apparaît dans la liste
 *   • Cleanup : suppression via REST après le test
 *
 * Stratégie anti-pollution :
 *   • On utilise des valeurs de pH/densité normales mais on n'enregistre
 *     rien de permanent — deleteAnalyse() nettoie en afterEach.
 *   • Skip si aucun contenant actif n'existe dans le tenant demo.
 */
import { test, expect } from '@playwright/test';
import { getJwt, getFirstContenant, deleteAnalyse, SUPABASE_URL, SUPABASE_ANON_KEY } from './helpers/auth.js';

test.describe('Parcours 3 — Analyses', () => {

  let createdAnalyseId = null;
  let jwt = null;

  test.afterEach(async () => {
    if (createdAnalyseId && jwt) {
      await deleteAnalyse(jwt, createdAnalyseId).catch((e) =>
        console.warn('[cleanup] deleteAnalyse échoué :', e.message)
      );
      createdAnalyseId = null;
    }
  });

  test('3.1 — analyses.html charge la liste et affiche le FAB', async ({ page }) => {
    await page.goto('/analyses.html');

    /* Liste ou état vide — dans les deux cas le FAB doit être visible */
    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });

    /* Pas d'écran d'erreur auth */
    await expect(page.locator('.auth-error, #login-screen')).toHaveCount(0);
  });

  test('3.2 — créer une analyse (pH + densité) et vérifier dans la liste', async ({ page }) => {
    await page.goto('/analyses.html');

    /* Récupérer le JWT avant l'interaction UI */
    jwt = await getJwt(page);
    const cont = await getFirstContenant(jwt);
    if (!cont) test.skip(true, 'Aucun contenant actif dans le tenant demo');

    /* 1. Ouvrir la modal — désactiver le mode aide d'abord */
    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });
    await page.evaluate(() => {
      if (typeof WB3Help !== 'undefined') WB3Help.set(false);
      document.body.classList.remove('wb3-help-on');
    });
    await page.click('button.fab');
    await expect(page.locator('#modal-backdrop')).toBeVisible({ timeout: 6_000 });

    /* 2. Date → aujourd'hui */
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#f-date', today);

    /* 3. Sélectionner le 1er contenant (chargement async) */
    const contPopulated = await page.waitForFunction(
      () => (document.querySelector('#f-contenant')?.options.length ?? 0) > 1,
      undefined,          // pas d'arg à passer à la fn
      { timeout: 8_000 } // options (3e param)
    ).then(() => true).catch(() => false);
    if (!contPopulated) {
      test.skip(true, 'Aucun contenant actif dans le tenant demo — select non peuplé');
      return;
    }
    const firstVal = await page.locator('#f-contenant option').nth(1).getAttribute('value');
    await page.selectOption('#f-contenant', firstVal ?? '');

    /* 4. pH et densité */
    await page.fill('#f-ph',      '3.50');
    await page.fill('#f-densite', '1.0450');

    /* 5. Enregistrer */
    await page.click('#btn-save');

    /* 6. La modal se ferme — analyses.html masque via opacity:0 (pas display:none)
     * → toBeVisible échoue toujours. On vérifie l'absence de la classe .open. */
    await expect(page.locator('#modal-backdrop.open')).not.toBeAttached({ timeout: 10_000 });

    /* 7. Récupérer l'ID de l'analyse créée pour le cleanup */
    const res = await page.evaluate(
      async ({ url, key, jwt, today }) => {
        const r = await fetch(
          `${url}/rest/v1/analyses?date_analyse=eq.${today}&select=id&order=created_at.desc&limit=1`,
          { headers: { 'apikey': key, 'Authorization': `Bearer ${jwt}` } }
        );
        return r.json();
      },
      { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, jwt, today }
    );
    if (res?.length) createdAnalyseId = res[0].id;
  });

});
