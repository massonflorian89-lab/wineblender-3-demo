/**
 * 01-auth.spec.js — Parcours 1 : connexion + chargement du shell
 *
 * Vérifie :
 *   • Le formulaire de login est présent sur app.html
 *   • Après login, l'app redirige vers shell.html
 *   • Le shell charge sans erreur JS critique
 *   • La navigation (sidebar ou menu) est visible
 *   • Un rechargement de app.html avec une session active redirige directement vers shell.html
 */
import { test, expect } from '@playwright/test';

test.describe('Parcours 1 — Authentification & shell', () => {

  test('1.1 — shell.html se charge après login (session stockée)', async ({ page }) => {
    /* La storageState injectée par "setup" contient déjà le JWT.
     * On navigue directement vers shell.html : le check d'auth de wb3-init.js
     * doit trouver une session valide et afficher le shell. */
    await page.goto('/shell.html');

    /* Attendre que le shell soit prêt : la sidebar ou le nom du tenant doit apparaître */
    await expect(
      page.locator('.nav-sidebar, #sidebar, #nav, .wb-sidebar, .shell-nav').first()
    ).toBeVisible({ timeout: 12_000 });
  });

  test('1.2 — app.html redirige vers shell.html si session valide', async ({ page }) => {
    /* Avec la session active, app.html appelle renderApp() → window.location = shell.html */
    await page.goto('/app.html');
    await page.waitForURL('**/shell*', { timeout: 12_000 });
    await expect(page).toHaveURL(/shell/);
  });

  test('1.3 — app.html affiche le login si session absente', async ({ browser }) => {
    /* Contexte vierge, sans session stockée */
    const ctx  = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto('/app.html');
    await expect(page.locator('#login-form')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    await ctx.close();
  });

  test('1.4 — login complet via UI (vérifie identifiants demo)', async ({ browser }) => {
    const email    = process.env.WB3_TEST_EMAIL;
    const password = process.env.WB3_TEST_PASSWORD;
    if (!email || !password) test.skip(true, 'WB3_TEST_EMAIL / WB3_TEST_PASSWORD non définis');

    const ctx  = await browser.newContext({
      storageState: undefined,
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();

    await page.goto('/app.html');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#login-btn');
    await page.waitForURL('**/shell*', { timeout: 15_000 });

    /* Le shell est chargé — pas d'erreur bloquante */
    await expect(page).toHaveURL(/shell/);
    /* Aucune page d'erreur ou modale "session expirée" */
    await expect(page.locator('.error-screen, #error-fatal')).toHaveCount(0);

    await ctx.close();
  });

});
