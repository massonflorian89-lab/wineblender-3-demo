/* ============================================================
 * multiselect-touch.js — 9.2 (A) : multi-sélection TACTILE des listes.
 *
 * Convention (pointeur grossier UNIQUEMENT — desktop inchangé) :
 *   - tap COURT sur une ligne  → comportement normal (la page ouvre la fiche) ;
 *   - tap LONG (≥ 450 ms, immobile ≤ 8 px) → entre en MODE multi-sélection
 *     et coche la ligne ; un bandeau « N sélectionnées · ✕ Sortir » s'affiche ;
 *   - en mode, tap COURT = coche/décoche ; ✕ ou Échap = sortir.
 *
 * API : WB3MultiSelect.attach(container, { onChange, rowSelector, getId,
 *        longPressMs, moveTol })
 *   onChange(ids[]) est appelé à chaque changement de sélection.
 *
 * N'intercepte le clic d'ouverture QUE lorsqu'un tap a été « consommé »
 * (long-press, ou tap en mode) → aucune régression du tap simple hors mode.
 * Délégation sur le conteneur → compatible re-render et windowing.
 * Cuverie EXCLUE (elle garde son long-press de drag) : on ne l'attache pas.
 * Styles dans theme.css (.wb3-ms-*). prefers-reduced-motion : pas d'animation.
 * ============================================================ */
(function () {
  'use strict';
  if (window.WB3MultiSelect) return;

  function _coarse() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (_) { return false; } }
  const _INTERACTIVE = 'button, a, input, select, textarea, label, .pin-btn, .cmp-check';

  function attach(container, opts) {
    const el = (typeof container === 'string') ? document.getElementById(container) : container;
    if (!el || el._wb3ms) return;
    el._wb3ms = true;
    if (!_coarse()) return;   // tactile uniquement ; souris/clavier = comportement existant

    opts = opts || {};
    const rowSel = opts.rowSelector || '[data-id]';
    const getId = opts.getId || (tr => tr.dataset.id);
    const LP = opts.longPressMs || 450;
    const TOL = opts.moveTol || 8;

    let mode = false;
    const selected = new Set();
    let banner = null, timer = null, sx = 0, sy = 0, suppress = false, pressed = null;

    function row(t) { const r = t && t.closest ? t.closest(rowSel) : null; return (r && el.contains(r)) ? r : null; }
    function emit() { try { opts.onChange && opts.onChange([...selected]); } catch (e) { console.warn('[9.2A] onChange:', e); } }

    function paintBanner() {
      if (!mode) {
        if (banner) { banner.remove(); banner = null; }
        document.body.classList.remove('wb3-ms-active');
        return;
      }
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'wb3-ms-banner';
        banner.setAttribute('role', 'status');
        banner.innerHTML = '<span class="wb3-ms-count"></span><button type="button" class="wb3-ms-exit" aria-label="Sortir de la sélection">✕ Sortir</button>';
        banner.querySelector('.wb3-ms-exit').addEventListener('click', exit);
        if (el.parentNode) el.parentNode.insertBefore(banner, el);
        document.body.classList.add('wb3-ms-active');
      }
      banner.querySelector('.wb3-ms-count').textContent = selected.size + ' sélectionnée' + (selected.size > 1 ? 's' : '');
    }
    function setSel(r, on) {
      const id = getId(r);
      if (on) { selected.add(id); r.classList.add('wb3-ms-selected'); }
      else { selected.delete(id); r.classList.remove('wb3-ms-selected'); }
    }
    function toggle(r) { setSel(r, !selected.has(getId(r))); emit(); paintBanner(); }
    function enter(r) { mode = true; paintBanner(); toggle(r); }
    function exit() {
      mode = false;
      el.querySelectorAll('.wb3-ms-selected').forEach(x => x.classList.remove('wb3-ms-selected'));
      selected.clear(); emit(); paintBanner();
    }

    el.addEventListener('touchstart', e => {
      if (e.target.closest(_INTERACTIVE)) return;   // boutons/liens : laisser leur action
      const r = row(e.target); if (!r) return;
      pressed = r;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      clearTimeout(timer);
      timer = setTimeout(() => { timer = null; suppress = true; enter(r); }, LP);
    }, { passive: true });

    el.addEventListener('touchmove', e => {
      if (timer && (Math.abs(e.touches[0].clientX - sx) > TOL || Math.abs(e.touches[0].clientY - sy) > TOL)) {
        clearTimeout(timer); timer = null;   // c'est un scroll/drag, pas un long-press
      }
    }, { passive: true });

    el.addEventListener('touchend', () => {
      const r = pressed; pressed = null;
      if (timer) {                       // tap court (le long-press n'a pas eu le temps)
        clearTimeout(timer); timer = null;
        if (mode && r) { suppress = true; toggle(r); }   // en mode : coche, et on bloque l'ouverture
        // hors mode : on laisse le clic natif → la page ouvre la fiche
      }
      // timer null : long-press déjà traité (suppress posé) ou scroll (rien à faire)
    });

    // Bloque le clic qui suit un tap consommé (sinon la fiche s'ouvrirait).
    el.addEventListener('click', e => {
      if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); }
    }, true);

    document.addEventListener('keydown', e => { if (e.key === 'Escape' && mode) exit(); });

    el._wb3msApi = { exit, isActive: () => mode, ids: () => [...selected] };
  }

  window.WB3MultiSelect = { attach };
})();
