/* ============================================================
 * toast.js — V4 : système de messages unifié WB3.
 *
 * API canonique :
 *   WB3Toast.show({ level, message, action })
 *     level   ∈ { 'success', 'info', 'warn', 'error' }
 *     message = texte (sans jargon technique)
 *     action  = { label, onClick, timeoutMs } (optionnel)
 *
 *   Raccourcis : WB3Toast.success/info/warn/error(message)
 *
 *   Action destructive « soft-delete UI » (annulable) :
 *   WB3Toast.undoable({ message, label='Annuler', timeoutMs=5000,
 *                       onCommit, onUndo })
 *     → toast info + bouton Annuler. Tant que le délai court, RIEN n'est
 *       commité : onCommit() n'est appelé QU'À expiration ; un clic
 *       « Annuler » annule (onUndo) et empêche le commit.
 *
 * Compat : window.toast(msg, levelOrIsErr) + WB3Toast.legacy(...) routent
 * les anciens appels (msg,'success' | msg,true) vers ce système → aucune
 * réécriture des call-sites.
 *
 * Pile en bas à droite, 3 toasts visibles max. Durées différenciées.
 * Respecte prefers-reduced-motion (apparition sans glissement, via CSS).
 * ============================================================ */
(function () {
  'use strict';

  const MAX_VISIBLE = 3;
  const ICONS = { success: '✓', info: 'ℹ', warn: '⚠', error: '⛔' };
  const DURATIONS = { success: 2500, info: 4000, warn: 6000, error: 8000 };
  const LEVELS = { success: 1, info: 1, warn: 1, error: 1 };

  function _norm(level) { return LEVELS[level] ? level : 'info'; }
  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  let _stack = null;
  function _ensureStack() {
    if (_stack) return _stack;
    _stack = document.createElement('div');
    _stack.className = 'wb3-toast-stack';
    _stack.setAttribute('aria-live', 'polite');
    _stack.setAttribute('role', 'status');
    document.body.appendChild(_stack);
    return _stack;
  }

  function _dismiss(el) {
    if (!el || el._gone) return; el._gone = true;
    clearTimeout(el._timer);
    el.classList.remove('show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
    setTimeout(() => { if (el.parentNode) el.remove(); }, 260);   // filet si pas de transition
  }

  function show(o) {
    o = o || {};
    const level = _norm(o.level);
    const stack = _ensureStack();
    // Plafond : retirer les plus anciens au-delà de MAX_VISIBLE-1.
    const live = [...stack.querySelectorAll('.wb3-toast:not(._gone)')];
    live.slice(0, Math.max(0, live.length - (MAX_VISIBLE - 1))).forEach(_dismiss);

    const el = document.createElement('div');
    el.className = 'wb3-toast wb3-toast--' + level;
    el.innerHTML =
      '<span class="wb3-toast-ic" aria-hidden="true">' + ICONS[level] + '</span>' +
      '<span class="wb3-toast-msg">' + _esc(o.message || '') + '</span>' +
      (o.action ? '<button type="button" class="wb3-toast-act"></button>' : '') +
      '<button type="button" class="wb3-toast-x" aria-label="Fermer">×</button>';

    if (o.action) {
      const ab = el.querySelector('.wb3-toast-act');
      ab.textContent = o.action.label || 'Annuler';
      ab.addEventListener('click', () => { try { o.action.onClick && o.action.onClick(); } catch (e) { console.warn('[V4] action:', e); } _dismiss(el); });
    }
    el.querySelector('.wb3-toast-x').addEventListener('click', () => _dismiss(el));

    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    // Auto-dismiss : error reste jusqu'au clic SAUF si une action/timeout est fournie.
    const ms = (o.action && o.action.timeoutMs) ? o.action.timeoutMs
      : (level === 'error' && !o.action) ? 0 : DURATIONS[level];
    if (ms > 0) el._timer = setTimeout(() => _dismiss(el), ms);
    return el;
  }

  function success(m) { return show({ level: 'success', message: m }); }
  function info(m)    { return show({ level: 'info',    message: m }); }
  function warn(m)    { return show({ level: 'warn',    message: m }); }
  function error(m)   { return show({ level: 'error',   message: m }); }

  // Action destructive annulable (le commit n'a lieu QU'À expiration).
  function undoable(o) {
    o = o || {};
    let done = false;
    const commit = () => { if (done) return; done = true; try { o.onCommit && o.onCommit(); } catch (e) { console.warn('[V4] commit:', e); } };
    const timeoutMs = o.timeoutMs || 5000;
    show({
      level: 'info',
      message: o.message || 'Action effectuée',
      action: {
        label: o.label || 'Annuler',
        timeoutMs,
        onClick: () => { if (done) return; done = true; try { o.onUndo && o.onUndo(); } catch (e) { console.warn('[V4] undo:', e); } },
      },
    });
    // Commit à expiration du délai (même durée que le bouton).
    setTimeout(commit, timeoutMs + 30);
  }

  // Compat anciens appels : toast(msg,'success') OU toast(msg, true) (analyses).
  function legacy(msg, arg) {
    let level = 'info';
    if (arg === true) level = 'error';
    else if (typeof arg === 'string') level = ({ info: 'info', success: 'success', error: 'error', warn: 'warn', warning: 'warn', danger: 'error' })[arg] || 'info';
    return show({ level, message: msg });
  }

  window.WB3Toast = { show, success, info, warn, error, undoable, legacy };
  // Filet global : si une page n'a pas de fonction toast locale.
  if (typeof window.toast !== 'function') window.toast = legacy;
})();

/* ============================================================
 * V7 — Écran d'erreur propre (fetch en échec) + filet global.
 *   WB3Errors.screen(host, { title, message, onRetry })
 *     remplit `host` par un .empty-state d'erreur (jamais de stacktrace
 *     visible) avec un bouton « Réessayer ».
 *   Filet global : une erreur non gérée → toast clair « Réessayer »
 *   (jamais de message technique à l'utilisateur), anti-spam.
 * ============================================================ */
(function () {
  'use strict';
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  function screen(host, o) {
    const el = (typeof host === 'string') ? document.getElementById(host) : host;
    if (!el) return;
    o = o || {};
    el.innerHTML =
      '<div class="empty-state">' +
        '<div class="icon" style="font-size:44px">📡</div>' +
        '<div class="title">' + _esc(o.title || 'Connexion interrompue') + '</div>' +
        '<div class="desc">' + _esc(o.message || "Impossible de charger les données pour le moment. Vérifiez votre connexion, puis réessayez.") + '</div>' +
        '<div class="actions">' +
          '<button class="btn wb3-err-retry">↻ Réessayer</button>' +
          '<a class="btn btn--secondary" href="dashboard.html">Tableau de bord</a>' +
        '</div>' +
      '</div>';
    const rb = el.querySelector('.wb3-err-retry');
    if (rb) rb.addEventListener('click', () => {
      if (typeof o.onRetry === 'function') { try { o.onRetry(); } catch (_) { location.reload(); } }
      else location.reload();
    });
  }

  // Filet global anti-stacktrace : message clair, jamais de détail technique.
  let _lastNet = 0;
  function _netToast() {
    const now = Date.now();
    if (now - _lastNet < 6000) return;     // anti-spam
    _lastNet = now;
    if (window.WB3Toast) WB3Toast.show({
      level: 'error',
      message: 'Une erreur est survenue. Veuillez réessayer.',
      action: { label: 'Réessayer', timeoutMs: 8000, onClick: () => location.reload() },
    });
  }
  window.addEventListener('unhandledrejection', _netToast);

  window.WB3Errors = { screen };
})();

/* ============================================================
 * V6 — Empty state réutilisable (classe .empty-state existante, pas de
 *   variante locale).  WB3Empty.render(host, { icon, title, desc, cta })
 *     cta (optionnel) = { label, onClick }  OU  { label, href }
 *   Pour tout écran qui pourrait être un « trou blanc » (liste vide,
 *   fiche sans données, dashboard sans alertes…).
 * ============================================================ */
(function () {
  'use strict';
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  function html(o) {
    o = o || {};
    let cta = '';
    if (o.cta && o.cta.label) {
      cta = o.cta.href
        ? '<a class="btn" href="' + _esc(o.cta.href) + '">' + _esc(o.cta.label) + '</a>'
        : '<button class="btn wb3-empty-cta">' + _esc(o.cta.label) + '</button>';
    }
    return '<div class="empty-state">' +
      '<div class="icon">' + (o.icon || '📭') + '</div>' +
      '<div class="title">' + _esc(o.title || 'Rien à afficher') + '</div>' +
      (o.desc ? '<div class="desc">' + _esc(o.desc) + '</div>' : '') +
      (cta ? '<div class="actions">' + cta + '</div>' : '') +
      '</div>';
  }
  function render(host, o) {
    const el = (typeof host === 'string') ? document.getElementById(host) : host;
    if (!el) return;
    el.innerHTML = html(o);
    const b = el.querySelector('.wb3-empty-cta');
    if (b && o.cta && typeof o.cta.onClick === 'function') b.addEventListener('click', () => { try { o.cta.onClick(); } catch (_) {} });
  }
  window.WB3Empty = { render, html };
})();
