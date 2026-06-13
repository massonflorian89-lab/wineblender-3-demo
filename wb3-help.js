/* ============================================================
 * wb3-help.js — Mode aide (ⓘ) activable
 * ------------------------------------------------------------
 * Affiche des bulles explicatives sur les éléments porteurs de
 * data-help="texte" (le texte peut contenir du HTML simple, ex. <b>).
 *
 * • Bouton « ⓘ Aide » injecté dans .header-actions (sinon flottant).
 * • État persisté par navigateur (localStorage), ACTIF par défaut
 *   (pour les premières utilisations) ; l'utilisateur le coupe quand
 *   il est à l'aise.
 * • Tactile : tout se fait au CLIC (pas de survol → marche au doigt).
 * • Aucune dépendance, aucune modif de markup requise hors data-help.
 *   Fonctionne avec le contenu rendu dynamiquement (CSS + délégation).
 *
 * Pour documenter un élément : ajouter  data-help="..."  dessus.
 * ============================================================ */
(function () {
  'use strict';
  const KEY = 'wb3_help_on';

  function isOn() { const v = localStorage.getItem(KEY); return v === null ? true : v === '1'; }
  function setOn(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} apply(v); if (!v) closePop(); }

  function injectCSS() {
    if (document.getElementById('wb3-help-css')) return;
    const s = document.createElement('style');
    s.id = 'wb3-help-css';
    s.textContent = `
      #wb3-help-btn.active { box-shadow: 0 0 0 2px rgba(255,255,255,.5) inset; }
      body.wb3-help-on [data-help] {
        outline: 1.5px dashed var(--color-primary, #6a1b2a);
        outline-offset: 2px; cursor: help;
      }
      body.wb3-help-on [data-help]::after {
        content: 'ⓘ'; position: absolute; margin-left: 4px;
        background: var(--color-primary, #6a1b2a); color: #fff;
        font-size: 10px; font-weight: 700; line-height: 15px;
        min-width: 15px; height: 15px; padding: 0 2px; text-align: center;
        border-radius: 8px; vertical-align: super; pointer-events: none;
      }
      .wb3-help-pop {
        position: fixed; max-width: 320px; background: #1c1c1c; color: #fff;
        padding: 11px 13px; border-radius: 9px; font-size: 13px; line-height: 1.45;
        z-index: 99999; box-shadow: 0 10px 34px rgba(0,0,0,.45);
        animation: wb3HelpIn .12s ease;
      }
      .wb3-help-pop b { color: #ffd9a0; }
      .wb3-help-pop .wb3-help-x { float: right; margin: -4px -4px 0 8px; cursor: pointer; opacity: .6; }
      @keyframes wb3HelpIn { from { opacity: 0; transform: translateY(4px); } }
      .wb3-help-banner {
        background: #fff8ef; border: 1px solid #ffcc80; color: #7a4a00;
        border-radius: 8px; padding: 7px 12px; margin: 8px 0; font-size: 12.5px;
      }`;
    document.head.appendChild(s);
  }

  function apply(on) {
    document.body.classList.toggle('wb3-help-on', on);
    const b = document.getElementById('wb3-help-btn');
    if (b) { b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }

  function injectButton() {
    if (document.getElementById('wb3-help-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'wb3-help-btn'; btn.type = 'button'; btn.innerHTML = 'ⓘ Aide';
    btn.title = 'Mode aide : surligne les éléments expliqués. Clique un ⓘ pour voir l\'explication.';
    const host = document.querySelector('.header-actions');
    if (host) { btn.className = 'btn btn--header'; host.insertBefore(btn, host.firstChild); }
    else {
      btn.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:900;padding:8px 13px;'
        + 'border-radius:20px;background:var(--color-primary,#6a1b2a);color:#fff;border:none;'
        + 'box-shadow:0 4px 14px rgba(0,0,0,.25);font-weight:600;cursor:pointer';
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', () => setOn(!isOn()));
  }

  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function showPop(el) {
    closePop();
    const txt = el.getAttribute('data-help'); if (!txt) return;
    pop = document.createElement('div');
    pop.className = 'wb3-help-pop';
    pop.innerHTML = '<span class="wb3-help-x" aria-label="Fermer">✕</span>' + txt;
    document.body.appendChild(pop);
    const r = el.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let top = r.bottom + 8, left = r.left;
    if (left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
    if (top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 8;
    pop.style.top = Math.max(8, top) + 'px';
    pop.style.left = Math.max(8, left) + 'px';
  }

  // Clic en mode aide sur un [data-help] → bulle, et on bloque l'action normale.
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('wb3-help-on')) return;
    if (e.target.closest('.wb3-help-pop')) { closePop(); return; }
    if (e.target.id === 'wb3-help-btn') return;
    const t = e.target.closest('[data-help]');
    if (t) { e.preventDefault(); e.stopPropagation(); showPop(t); }
    else closePop();
  }, true);
  window.addEventListener('scroll', closePop, true);
  window.addEventListener('resize', closePop);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });

  function init() { injectCSS(); injectButton(); apply(isOn()); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.WB3Help = { on: isOn, set: setOn };
})();
