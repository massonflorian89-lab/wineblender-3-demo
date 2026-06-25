'use strict';

// Appliquer le thème sauvegardé dès que le script se charge
(function() {
  var t = localStorage.getItem('wb3_theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
}());

// ============================================================
// WB3Bootstrap — attente du tenant actif
// ------------------------------------------------------------
// Usage :
//   const tenant = await WB3Bootstrap.waitTenant();        // 10 s
//   const tenant = await WB3Bootstrap.waitTenant(8000);    // 8 s
//   if (!tenant) { /* afficher erreur */ return; }
//   document.getElementById('tenant-pill').textContent = `🏢 ${tenant.nom} · ${tenant.role}`;
// ============================================================

window.WB3Bootstrap = (function () {
  async function waitTenant(maxMs) {
    maxMs = maxMs !== undefined ? maxMs : 10000;
    let tenant  = WB3DB.getCurrentTenant();
    let waited  = 0;
    while (!tenant && waited < maxMs) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      tenant = WB3DB.getCurrentTenant();
    }
    return tenant || null;
  }

  return { waitTenant };
}());

// ============================================================
// WB3AppBoot — bootstrap complet session + tenant
// ------------------------------------------------------------
// Centralise le triplet (restoreSession / getCurrentUser / waitTenant)
// que chaque page dupliquait dans son init().
//
// Usage :
//   const ctx = await WB3AppBoot.requireReadyContext();
//   if (!ctx) {
//     document.getElementById('content').innerHTML = '<erreur tenant>';
//     return;
//   }
//   const { tenant } = ctx;
//   document.getElementById('tenant-pill').textContent = `🏢 ${tenant.nom} · ${tenant.role}`;
//
// Options :
//   maxWaitMs     (default 10000) : timeout attente tenant
//   redirectOnAuth (default true) : redirect vers app.html si non authentifié
// ============================================================

window.WB3AppBoot = (function () {
  async function requireReadyContext(opts) {
    const maxWaitMs     = (opts && opts.maxWaitMs     !== undefined) ? opts.maxWaitMs     : 10000;
    const redirectOnAuth = (opts && opts.redirectOnAuth !== undefined) ? opts.redirectOnAuth : true;

    try { await WB3Auth.restoreSession(); } catch(e) { console.error('[WB3] restoreSession:', e); }

    if (!WB3DB.getCurrentUser()) {
      if (redirectOnAuth) window.location.href = 'app.html';
      return null;
    }

    const tenant = await WB3Bootstrap.waitTenant(maxWaitMs);
    if (!tenant) return null;

    return { user: WB3DB.getCurrentUser(), tenant };
  }

  return { requireReadyContext };
}());
