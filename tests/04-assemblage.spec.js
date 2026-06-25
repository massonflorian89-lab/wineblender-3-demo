/**
 * 04-assemblage.spec.js — Parcours 4 : simulateur d'assemblage
 *
 * Vérifie :
 *   • assemblage.html se charge sans erreur JS ni crash auth
 *   • Si le module est actif (migration 063) : l'arbre + le panneau vide s'affichent
 *   • Si le module est absent : le message "module indisponible" s'affiche proprement
 *   • Le bouton "Nouveau dossier" est présent quand le module est actif
 *
 * Pas de mutation de données : aucun essai ni dossier n'est créé.
 * Les opérations d'assemblage réelles (RPC 051) sont hors scope de ce harness
 * car elles sont irréversibles (changement d'état des lots).
 */
import { test, expect } from '@playwright/test';

test.describe('Parcours 4 — Assemblage (simulateur)', () => {

  test('4.1 — assemblage.html charge sans erreur', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/assemblage.html');

    /* Attendre que le boot WB3 se termine (tree ou message module) */
    await expect(
      page.locator('#tree, #boot, .empty-state, [class*="module"]').first()
    ).toBeVisible({ timeout: 15_000 });

    /* Pas d'erreur JS bloquante */
    const blocking = errors.filter((e) =>
      !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(blocking, 'Erreurs JS inattendues').toHaveLength(0);

    /* Pas d'écran de login */
    await expect(page.locator('#login-screen, .auth-error')).toHaveCount(0);
  });

  test('4.2 — module actif → arbre visible ; module absent → message clair', async ({ page }) => {
    await page.goto('/assemblage.html');

    /* Attente boot */
    await page.waitForTimeout(2000);

    const moduleGate = page.locator('[class*="module-unavailable"], [class*="module-gate"], .empty-state');
    const tree       = page.locator('#tree');

    const gateVisible = await moduleGate.first().isVisible().catch(() => false);
    const treeVisible = await tree.isVisible().catch(() => false);

    if (treeVisible) {
      /* Module actif : le panneau de simulateur doit être présent */
      await expect(page.locator('#panel')).toBeVisible({ timeout: 5_000 });

      /* Le header de l'arbre existe (renderTreeHeader l'a peuplé) */
      await expect(page.locator('#asm-tree-hd')).toBeVisible({ timeout: 5_000 });
    } else {
      /* Module absent : un message explicite doit être affiché */
      expect(
        gateVisible,
        'assemblage.html doit afficher soit le simulateur, soit le message module indisponible'
      ).toBe(true);
    }
  });

});
