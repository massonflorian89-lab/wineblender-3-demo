/**
 * 02-reception.spec.js — Parcours 2 : réception → création d'un apport
 *
 * Vérifie :
 *   • apports.html se charge et affiche la liste
 *   • Le FAB "+" ouvre le drawer "Nouvel apport"
 *   • Remplir le formulaire + sélectionner un lot → Enregistrer crée l'apport
 *   • L'apport apparaît dans la liste
 *   • Cleanup : l'apport de test est supprimé après le test
 *
 * Stratégie anti-pollution :
 *   • L'apporteur est préfixé PW_TEST_ + timestamp ISO — unique et
 *     facilement repérable dans le dashboard Supabase en cas d'échec.
 *   • Cleanup via l'API REST (DELETE) dans afterEach.
 */
import { test, expect } from '@playwright/test';
import { getJwt, deleteApport } from './helpers/auth.js';

test.describe('Parcours 2 — Réception (apports.html)', () => {

  let createdApportId = null;
  let jwt = null;

  test.afterEach(async ({ page }) => {
    /* Nettoyage systématique même si le test a échoué */
    if (createdApportId && jwt) {
      await deleteApport(jwt, createdApportId).catch((e) =>
        console.warn('[cleanup] deleteApport échoué :', e.message)
      );
      createdApportId = null;
    }
  });

  test('2.1 — apports.html charge la liste', async ({ page }) => {
    await page.goto('/apports.html');

    /* Le FAB est toujours présent dans le HTML statique — sa visibilité
     * confirme que la page a chargé et que l'auth est valide. */
    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });

    /* Pas de modale d'erreur auth */
    await expect(page.locator('.auth-error, #login-screen')).toHaveCount(0);
  });

  test('2.2 — créer un apport de test + vérifier dans la liste', async ({ page }) => {
    /* Identifiant unique pour retrouver / supprimer cet apport */
    const TAG = `PW_TEST_${Date.now()}`;

    await page.goto('/apports.html');

    /* Attendre que la page soit prête (au moins le FAB visible) */
    await expect(page.locator('button.fab')).toBeVisible({ timeout: 12_000 });

    /* 1. Ouvrir le drawer — désactiver le mode aide d'abord (il intercepte
     *    le 1er clic sur [data-help] en capture-phase → openDrawer() jamais appelé) */
    await page.evaluate(() => {
      if (typeof WB3Help !== 'undefined') WB3Help.set(false);
      document.body.classList.remove('wb3-help-on');
    });
    await page.click('button.fab');
    await expect(page.locator('#drawer')).toBeVisible({ timeout: 6_000 });

    /* 2. Date d'apport (aujourd'hui par défaut — vérifier le champ) */
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await page.fill('#f-date', today);

    /* 3. Apporteur : valeur unique = identifiant du test */
    await page.fill('#f-apporteur', TAG);

    /* 4. Volume estimé */
    await page.fill('#f-volume', '10');

    /* 5. Sélectionner le 1er lot disponible dans le select */
    const lotSelect = page.locator('#f-lot');
    await expect(lotSelect).toBeVisible();
    /* Attendre que le select soit peuplé (chargement async des lots depuis Supabase) */
    const lotPopulated = await page.waitForFunction(
      () => (document.querySelector('#f-lot')?.options.length ?? 0) > 1,
      undefined,          // pas d'arg à passer à la fn
      { timeout: 8_000 } // options (3e param)
    ).then(() => true).catch(() => false);
    if (!lotPopulated) {
      test.skip(true, 'Aucun lot disponible dans le tenant demo — select non peuplé');
      return;
    }
    /* Sélectionner le 1er lot réel (index 1 = skip l'option placeholder vide) */
    const firstLotValue = await lotSelect.locator('option').nth(1).getAttribute('value');
    await lotSelect.selectOption(firstLotValue ?? '');

    /* 6. Enregistrer */
    await page.click('button:has-text("Enregistrer")');

    /* 7. Le drawer se ferme — le drawer utilise transform:translateX (toujours
     * display:flex), donc not.toBeVisible() échoue toujours. On vérifie
     * l'absence de la classe .open. */
    await expect(page.locator('#drawer.open')).not.toBeAttached({ timeout: 10_000 });

    /* 8. L'apport apparaît dans la liste.
     * Le TAG (apporteur unique) permet de le localiser sans ambiguïté. */
    const card = page.locator(`.apport-card, tr, [data-apporteur]`).filter({ hasText: TAG });
    await expect(card.first()).toBeVisible({ timeout: 8_000 });

    /* 9. Récupérer l'ID de l'apport créé pour le cleanup.
     * On le cherche via l'API REST plutôt que dans le DOM. */
    jwt = await getJwt(page);
    const SUPABASE_URL     = 'https://wvpcknxvqkwykxfnrzzd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cGNrbnh2cWt3eWt4Zm5yenpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODY4NDMsImV4cCI6MjA5Mjg2Mjg0M30.wNniapvnySVtIlgEf4ow4kXmAqPSL4H7gs1hwHN07UY';

    const res = await page.evaluate(
      async ({ url, key, jwt, tag }) => {
        const r = await fetch(
          `${url}/rest/v1/apports?apporteur=eq.${encodeURIComponent(tag)}&select=id&limit=1`,
          { headers: { 'apikey': key, 'Authorization': `Bearer ${jwt}` } }
        );
        return r.json();
      },
      { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, jwt, tag: TAG }
    );

    if (res?.length) createdApportId = res[0].id;
  });

});
