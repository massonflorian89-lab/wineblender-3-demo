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

// ============================================================
// DÉMO — bannière permanente + widget feedback
// ------------------------------------------------------------
// Actif uniquement si WB3_CONFIG.isDemo === true (cf. config.js).
// Sur la prod Richemer (isDemo absent/false), aucun effet.
// ============================================================
(function () {
  if (!window.WB3_CONFIG || !window.WB3_CONFIG.isDemo) return;

  // ── Styles (injectés une seule fois) ────────────────────────
  var css = ''
    + '.wb3-demo-banner{position:fixed;top:0;left:0;right:0;z-index:9998;'
    +   'background:linear-gradient(90deg,#6a1b2a,#c8a87e);color:#fff;'
    +   'font-size:12px;font-weight:600;padding:6px 12px;text-align:center;'
    +   'letter-spacing:0.3px;box-shadow:0 1px 3px rgba(0,0,0,.2);'
    +   'font-family:system-ui,-apple-system,Segoe UI,sans-serif;}'
    + 'body.wb3-demo-active{padding-top:28px!important;}'
    + '.wb3-demo-fb-btn{position:fixed;bottom:18px;right:18px;z-index:9997;'
    +   'background:#6a1b2a;color:#fff;border:none;border-radius:24px;'
    +   'padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;'
    +   'box-shadow:0 3px 10px rgba(0,0,0,.25);transition:transform .15s;'
    +   'font-family:system-ui,-apple-system,Segoe UI,sans-serif;}'
    + '.wb3-demo-fb-btn:hover{transform:scale(1.05);}'
    + '.wb3-demo-fb-modal{display:none;position:fixed;inset:0;'
    +   'background:rgba(0,0,0,.55);z-index:9999;align-items:center;'
    +   'justify-content:center;padding:16px;}'
    + '.wb3-demo-fb-modal.show{display:flex;}'
    + '.wb3-demo-fb-card{background:#fff;border-radius:12px;padding:22px;'
    +   'max-width:480px;width:100%;box-shadow:0 8px 28px rgba(0,0,0,.3);'
    +   'font-family:system-ui,-apple-system,Segoe UI,sans-serif;}'
    + '.wb3-demo-fb-card h3{margin:0 0 6px;color:#6a1b2a;}'
    + '.wb3-demo-fb-card .hint{font-size:12.5px;color:#666;margin:0 0 12px;}'
    + '.wb3-demo-fb-card textarea{width:100%;min-height:120px;resize:vertical;'
    +   'padding:8px;border:1px solid #ccc;border-radius:6px;font-family:inherit;'
    +   'font-size:14px;box-sizing:border-box;}'
    + '.wb3-demo-fb-status{margin-top:10px;font-size:12.5px;min-height:16px;}'
    + '.wb3-demo-fb-status.ok{color:#1b5e20;}'
    + '.wb3-demo-fb-status.err{color:#b71c1c;}'
    + '.wb3-demo-fb-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;}'
    + '.wb3-demo-fb-actions button{padding:8px 16px;border-radius:6px;'
    +   'border:none;cursor:pointer;font-weight:600;font-size:14px;'
    +   'font-family:inherit;}'
    + '.wb3-demo-fb-actions .cancel{background:#eee;color:#333;}'
    + '.wb3-demo-fb-actions .submit{background:#6a1b2a;color:#fff;}'
    + '.wb3-demo-fb-actions .submit:disabled{opacity:.5;cursor:wait;}';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Bannière ───────────────────────────────────────────────
  var banner = document.createElement('div');
  banner.className = 'wb3-demo-banner';
  banner.innerHTML = '🧪 <strong>DÉMO Wineblender 3</strong> — cave partagée avec les autres testeurs';

  // ── Bouton + modal feedback ────────────────────────────────
  var fbBtn = document.createElement('button');
  fbBtn.className = 'wb3-demo-fb-btn';
  fbBtn.textContent = '💬 Retour';
  fbBtn.style.display = 'none'; // caché tant que pas connecté

  var modal = document.createElement('div');
  modal.className = 'wb3-demo-fb-modal';
  modal.innerHTML =
    '<div class="wb3-demo-fb-card">'
  +   '<h3>Votre retour sur la démo</h3>'
  +   '<p class="hint">Bug, suggestion, ressenti — tout est utile à Florian.</p>'
  +   '<textarea id="wb3-fb-text" placeholder="Décrivez ce que vous avez constaté…"></textarea>'
  +   '<div class="wb3-demo-fb-status" id="wb3-fb-status"></div>'
  +   '<div class="wb3-demo-fb-actions">'
  +     '<button class="cancel" id="wb3-fb-cancel">Annuler</button>'
  +     '<button class="submit" id="wb3-fb-submit">Envoyer</button>'
  +   '</div>'
  +  '</div>';

  function syncFbVisibility() {
    var user = (window.WB3DB && WB3DB.getCurrentUser && WB3DB.getCurrentUser()) || null;
    fbBtn.style.display = user ? '' : 'none';
  }

  function inject() {
    document.body.classList.add('wb3-demo-active');
    document.body.prepend(banner);
    document.body.appendChild(fbBtn);
    document.body.appendChild(modal);

    fbBtn.addEventListener('click', function () {
      document.getElementById('wb3-fb-status').textContent = '';
      modal.classList.add('show');
    });
    document.getElementById('wb3-fb-cancel').addEventListener('click', function () {
      modal.classList.remove('show');
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('show');
    });

    document.getElementById('wb3-fb-submit').addEventListener('click', async function () {
      var text = document.getElementById('wb3-fb-text');
      var status = document.getElementById('wb3-fb-status');
      var btn = document.getElementById('wb3-fb-submit');
      var msg = text.value.trim();

      if (!msg) {
        status.textContent = 'Saisissez un message avant d\'envoyer.';
        status.className = 'wb3-demo-fb-status err';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Envoi…';
      try {
        var user = (window.WB3DB && WB3DB.getCurrentUser && WB3DB.getCurrentUser()) || null;
        var res = await WB3DB.client.from('demo_feedback').insert({
          user_id: user ? user.id : null,
          email:   user ? user.email : null,
          page:    (window.location.pathname.split('/').pop() || 'inconnu'),
          message: msg,
        });
        if (res.error) throw res.error;
        status.textContent = '✓ Merci ! Votre retour est enregistré.';
        status.className = 'wb3-demo-fb-status ok';
        text.value = '';
        setTimeout(function () {
          modal.classList.remove('show');
          status.textContent = '';
        }, 1600);
      } catch (err) {
        status.textContent = 'Erreur : ' + (err.message || err);
        status.className = 'wb3-demo-fb-status err';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Envoyer';
      }
    });

    syncFbVisibility();
    if (window.WB3Auth && WB3Auth.onAuthChange) WB3Auth.onAuthChange(syncFbVisibility);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
}());
