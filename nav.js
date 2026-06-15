/* nav.js — Barre de navigation latérale WB3 (auto-injectée) */
(function () {
  'use strict';

  // ── API publique : navigation compatible embedded / standalone ────
  // WB3Nav.navigate('operations.html?new=1')
  //   → en mode embedded : route via WB3Shell (pas de double sidebar)
  //   → en mode standalone : window.location.href normal
  // WB3Nav.navigateTop('app.html')
  //   → toujours sur window.top (ex: logout depuis un iframe)
  window.WB3Nav = {
    navigate: function (href) {
      if (window.parent !== window &&
          typeof window.parent.WB3Shell !== 'undefined' &&
          typeof window.parent.WB3Shell.navigate === 'function') {
        try {
          const url = new URL(href, window.location.href);
          url.searchParams.delete('embedded');
          const clean = url.pathname.split('/').pop() + (url.search || '');
          window.parent.WB3Shell.navigate(clean);
          return;
        } catch (e) { /* URL invalide → fallthrough */ }
      }
      window.location.href = href;
    },
    navigateTop: function (href) {
      window.top.location.href = href;
    },

    // Téléchargement de fichier sûr — contourne l'intercepteur de clics
    // nav.js (qui sinon preventDefault + navigation SPA → "Cannot GET /…").
    //   content  : string | Blob (objet déjà construit)
    //   filename : nom du fichier proposé
    //   mimeType : défaut 'application/json' (ignoré si content est un Blob)
    downloadFile: function (content, filename, mimeType) {
      const blob = (content instanceof Blob)
        ? content
        : new Blob([content], { type: mimeType || 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'export.json';
      // Empêche le clic de remonter jusqu'au listener document de nav.js
      a.addEventListener('click', function (ev) { ev.stopPropagation(); });
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Révocation différée : un navigateur lent peut annuler le
      // téléchargement si l'URL blob disparaît trop tôt.
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    },
  };

  // ============================================================
  // Bibliothèque d'icônes SVG (trait fin, famille unique — style Lucide)
  // viewBox 24, stroke=currentColor → se teinte avec le thème / l'état actif.
  // Exposée en global (WB3Icons) pour réemploi (sidebar, sous-menus, etc.).
  // ============================================================
  const _IC = function (inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      inner + '</svg>';
  };
  const ICON = {
    dashboard:      _IC('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
    tank:           _IC('<ellipse cx="12" cy="5" rx="6" ry="2.2"/><path d="M6 5v13c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3V5"/><path d="M6 11.5c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3"/>'),
    wine:           _IC('<path d="M8 22h8"/><path d="M12 15v7"/><path d="M7 3h10l-.6 6.1a4.4 4.4 0 0 1-8.8 0z"/>'),
    grape:          _IC('<path d="M22 5V2l-5.9 5.9"/><circle cx="16.6" cy="15.9" r="2.6"/><circle cx="8.1" cy="7.4" r="2.6"/><circle cx="12.3" cy="11.7" r="2.6"/><circle cx="13.9" cy="5.9" r="2.6"/><circle cx="18.2" cy="10.1" r="2.6"/><circle cx="6.6" cy="13.2" r="2.6"/><circle cx="10.8" cy="17.4" r="2.6"/><circle cx="5" cy="19" r="2.6"/>'),
    calendar:       _IC('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    package:        _IC('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><path d="m7.5 4.27 9 5.15"/>'),
    clipboardCheck: _IC('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>'),
    flask:          _IC('<path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a1.5 1.5 0 0 0 1.3 2.3h12.4A1.5 1.5 0 0 0 19.5 19L14 9.5V3"/><path d="M7.5 15h9"/>'),
    microscope:     _IC('<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 0 0 0-14"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h4v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v3"/>'),
    blend:          _IC('<circle cx="9" cy="9" r="7"/><circle cx="15" cy="15" r="7"/>'),
    bottle:         _IC('<path d="M9.5 2h5"/><path d="M10 2v4"/><path d="M14 2v4"/><path d="M10 6c-1.2 .6-2 1.8-2 3.2V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9.2c0-1.4-.8-2.6-2-3.2"/><path d="M8 13h8"/>'),
    hopper:         _IC('<path d="M3 4h18l-7 9v7h-4v-7z"/><path d="M8 8h8"/>'),
    report:         _IC('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M8 18v-3M12 18v-6M16 18v-2"/>'),
    settings:       _IC('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>'),
    shieldCheck:    _IC('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>'),
    leaf:           _IC('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>'),
    user:           _IC('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    trash:          _IC('<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>'),
    history:        _IC('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
    palette:        _IC('<circle cx="13.5" cy="6.5" r="1.3"/><circle cx="17.5" cy="10.5" r="1.3"/><circle cx="8.5" cy="7.5" r="1.3"/><circle cx="6.5" cy="12.5" r="1.3"/><path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2-4 2.4 2.4 0 0 1-.5-1.5A2.5 2.5 0 0 1 16 14h2a4 4 0 0 0 4-4 10 10 0 0 0-10-8Z"/>'),
    mapPin:         _IC('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    ruler:          _IC('<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>'),
    download:       _IC('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>'),
    upload:         _IC('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/>'),
    list:           _IC('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    trendingUp:     _IC('<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>'),
  };
  window.WB3Icons = ICON;

  // ============================================================
  // Dialogues internes (remplacent alert/confirm/prompt natifs)
  //   await WB3UI.confirm('message', { title, okText, danger })  → bool
  //   await WB3UI.prompt('message',  { value, placeholder })     → string|null
  //   await WB3UI.alert('message',   { title })                  → true
  // CSS thématique injecté à la 1ʳᵉ utilisation.
  // ============================================================
  window.WB3UI = (function () {
    function _esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
    let _css = false;
    function _inject(){
      if (_css) return; _css = true;
      const st = document.createElement('style');
      st.textContent =
        '.wb3-dlg-backdrop{position:fixed;inset:0;background:rgba(12,22,36,.5);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;}' +
        '.wb3-dlg{background:var(--color-bg-elevated,#fff);color:var(--color-ink,#1a1a1a);border-radius:14px;width:min(440px,100%);box-shadow:0 18px 50px rgba(0,0,0,.35);overflow:hidden;animation:wb3dlgIn .14s ease;}' +
        '@keyframes wb3dlgIn{from{transform:translateY(8px) scale(.98);opacity:0}to{transform:none;opacity:1}}' +
        '.wb3-dlg-hd{padding:16px 18px 0;font-weight:700;font-size:15px;}' +
        '.wb3-dlg-bd{padding:12px 18px 18px;}' +
        '.wb3-dlg-msg{font-size:13.5px;color:var(--color-ink-secondary,#444);white-space:pre-wrap;line-height:1.5;}' +
        '.wb3-dlg-input{width:100%;box-sizing:border-box;margin-top:12px;padding:9px 11px;border:1px solid var(--color-border,#ccc);border-radius:8px;font:inherit;background:var(--color-bg,#fff);color:inherit;}' +
        '.wb3-dlg-input:focus{outline:none;border-color:var(--color-primary,#0d6efd);box-shadow:0 0 0 3px rgba(13,110,253,.15);}' +
        '.wb3-dlg-ft{display:flex;justify-content:flex-end;gap:8px;padding:0 18px 18px;}' +
        '.wb3-dlg-btn{padding:8px 16px;border-radius:8px;font:inherit;font-weight:600;font-size:13px;cursor:pointer;border:1px solid transparent;}' +
        '.wb3-dlg-cancel{background:var(--color-bg-subtle,#eee);color:var(--color-ink,#333);border-color:var(--color-border,#ddd);}' +
        '.wb3-dlg-cancel:hover{background:var(--color-border,#e0e0e0);}' +
        '.wb3-dlg-ok{background:var(--color-primary,#0d6efd);color:#fff;}' +
        '.wb3-dlg-ok:hover{filter:brightness(1.06);}' +
        '.wb3-dlg-ok.danger{background:var(--color-danger,#c62828);}' +
        // ── Bottom-sheet (menu d'actions tactile) ──
        '.wb3-sheet-bd{position:fixed;inset:0;background:rgba(12,22,36,.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;animation:wb3sheetBd .15s ease;}' +
        '@keyframes wb3sheetBd{from{opacity:0}to{opacity:1}}' +
        '.wb3-sheet{background:var(--color-bg-elevated,#fff);color:var(--color-ink,#1a1a1a);width:min(520px,100%);border-radius:18px 18px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.3);max-height:82vh;overflow:auto;animation:wb3sheetIn .2s cubic-bezier(.22,1,.36,1);padding-bottom:env(safe-area-inset-bottom,0);}' +
        '@keyframes wb3sheetIn{from{transform:translateY(100%)}to{transform:none}}' +
        '.wb3-sheet-grip{width:36px;height:4px;border-radius:2px;background:var(--color-border,#ccc);margin:8px auto 2px;}' +
        '.wb3-sheet-hd{padding:8px 18px 6px;font-weight:700;font-size:14px;color:var(--color-ink-secondary,#444);}' +
        '.wb3-sheet-item{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:14px 18px;border:none;border-top:1px solid var(--color-border-subtle,#eee);background:none;font:inherit;color:inherit;cursor:pointer;text-align:left;min-height:54px;}' +
        '.wb3-sheet-item:hover{background:var(--color-bg-subtle,#f5f5f5);}' +
        '.wb3-sheet-item:disabled{opacity:.4;cursor:not-allowed;}' +
        '.wb3-sheet-ico{font-size:20px;width:26px;text-align:center;flex-shrink:0;}' +
        '.wb3-sheet-lab{font-weight:600;font-size:14px;}' +
        '.wb3-sheet-desc{font-size:12px;color:var(--color-ink-tertiary,#888);margin-top:1px;}' +
        '.wb3-sheet-cancel{padding:14px 18px;text-align:center;font-weight:600;font-size:14px;color:var(--color-ink-secondary,#555);cursor:pointer;border-top:1px solid var(--color-border,#ddd);}';
      document.head.appendChild(st);
    }

    // Menu d'actions en feuille basse (tactile). opts = { title, items:[{icon,label,desc,onClick,disabled,danger}], cancelText }
    function _openSheet(opts){
      _inject();
      return new Promise(function(resolve){
        const items = (opts.items || []).filter(Boolean);
        const bd = document.createElement('div');
        bd.className = 'wb3-sheet-bd';
        const rows = items.map(function(it, i){
          return '<button class="wb3-sheet-item" data-i="'+i+'"'+(it.disabled?' disabled':'')+'>' +
                   '<span class="wb3-sheet-ico">'+_esc(it.icon||'•')+'</span>' +
                   '<span><span class="wb3-sheet-lab"'+(it.danger?' style="color:var(--color-danger,#c62828)"':'')+'>'+_esc(it.label||'')+'</span>' +
                   (it.desc?'<span class="wb3-sheet-desc">'+_esc(it.desc)+'</span>':'') + '</span>' +
                 '</button>';
        }).join('');
        bd.innerHTML =
          '<div class="wb3-sheet" role="dialog" aria-modal="true">' +
            '<div class="wb3-sheet-grip"></div>' +
            (opts.title ? '<div class="wb3-sheet-hd">'+_esc(opts.title)+'</div>' : '') +
            rows +
            '<div class="wb3-sheet-cancel">'+_esc(opts.cancelText || 'Annuler')+'</div>' +
          '</div>';
        document.body.appendChild(bd);
        function close(){ bd.remove(); document.removeEventListener('keydown', onKey, true); resolve(); }
        bd.addEventListener('mousedown', function(e){ if (e.target===bd) close(); });
        bd.querySelector('.wb3-sheet-cancel').addEventListener('click', close);
        bd.querySelectorAll('.wb3-sheet-item').forEach(function(btn){
          btn.addEventListener('click', function(){
            const it = items[+btn.getAttribute('data-i')];
            if (it && it.disabled) return;
            close();
            if (it && typeof it.onClick === 'function') { try { it.onClick(); } catch(e){ console.error('[WB3UI.sheet]', e); } }
          });
        });
        function onKey(e){ if (e.key==='Escape'){ e.preventDefault(); close(); } }
        document.addEventListener('keydown', onKey, true);
      });
    }
    function _open(opts){
      _inject();
      return new Promise(function(resolve){
        const type = opts.type || 'confirm';
        const danger = !!opts.danger;
        const cancelText = opts.cancelText || 'Annuler';
        const okText = opts.okText || (type==='alert'?'OK':(type==='prompt'?'Valider':'Confirmer'));
        const bd = document.createElement('div');
        bd.className = 'wb3-dlg-backdrop';
        bd.innerHTML =
          '<div class="wb3-dlg" role="dialog" aria-modal="true">' +
            (opts.title ? '<div class="wb3-dlg-hd">'+_esc(opts.title)+'</div>' : '') +
            '<div class="wb3-dlg-bd">' +
              (opts.message ? '<div class="wb3-dlg-msg">'+_esc(opts.message)+'</div>' : '') +
              (type==='prompt' ? '<input class="wb3-dlg-input" type="text" value="'+_esc(opts.value||'')+'" placeholder="'+_esc(opts.placeholder||'')+'">' : '') +
            '</div>' +
            '<div class="wb3-dlg-ft">' +
              (type!=='alert' ? '<button class="wb3-dlg-btn wb3-dlg-cancel">'+_esc(cancelText)+'</button>' : '') +
              '<button class="wb3-dlg-btn wb3-dlg-ok'+(danger?' danger':'')+'">'+_esc(okText)+'</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(bd);
        const input = bd.querySelector('.wb3-dlg-input');
        function close(val){ bd.remove(); document.removeEventListener('keydown', onKey, true); resolve(val); }
        function ok(){ close(type==='prompt' ? (input ? input.value : '') : true); }
        function cancel(){ close(type==='prompt' ? null : (type==='alert' ? true : false)); }
        bd.querySelector('.wb3-dlg-ok').addEventListener('click', ok);
        const cb = bd.querySelector('.wb3-dlg-cancel'); if (cb) cb.addEventListener('click', cancel);
        bd.addEventListener('mousedown', function(e){ if (e.target===bd) cancel(); });
        function onKey(e){
          if (e.key==='Escape'){ e.preventDefault(); cancel(); }
          else if (e.key==='Enter'){ e.preventDefault(); ok(); }
        }
        document.addEventListener('keydown', onKey, true);
        if (input){ input.focus(); input.select(); }
        else bd.querySelector('.wb3-dlg-ok').focus();
      });
    }
    return {
      confirm: function(message, opts){ return _open(Object.assign({ type:'confirm', title:'Confirmation', message:message }, opts||{})); },
      prompt:  function(message, opts){ return _open(Object.assign({ type:'prompt',  message:message }, opts||{})); },
      alert:   function(message, opts){ return _open(Object.assign({ type:'alert',   message:message }, opts||{})); },
      open: _open,
      sheet: function(opts){ return _openSheet(opts||{}); },
    };
  })();

  // ============================================================
  // Carte info-cuve réutilisable (n° · vol réel/total · lot · millésime)
  //   WB3CuveInfo.show(contenantId, 'containerId')  → rend la carte
  //   WB3CuveInfo.card(dataRow)                      → HTML (à partir d'une ligne v_cuverie_etat)
  // S'appuie sur WB3DB.queryCuverieEtat. CSS injecté à la 1ʳᵉ utilisation.
  // ============================================================
  window.WB3CuveInfo = (function () {
    function _esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
    function _fmt(n){ if(n==null||n==='')return '—'; const x=Number(n); if(Number.isNaN(x))return '—'; return (Math.round(x*100)/100).toLocaleString('fr-FR'); }
    let _css=false;
    function _inject(){
      if(_css)return; _css=true;
      const st=document.createElement('style');
      st.textContent =
        '.wb3-cuve-card{border:1px solid var(--color-border,#ddd);border-radius:10px;padding:9px 11px;background:var(--color-bg-subtle,#f6f6f6);margin-top:8px;font-size:var(--text-caption,12px);animation:fade-in .25s cubic-bezier(.22,1,.36,1) both;}' +
        '.wb3-cc-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;}' +
        '.wb3-cc-name{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--color-ink,#1a1a1a);}' +
        '.wb3-cc-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}' +
        '.wb3-cc-lot{color:var(--color-ink-secondary,#555);font-weight:600;text-align:right;}' +
        '.wb3-cc-bar{height:6px;border-radius:4px;background:var(--color-bg-mute,#e5e5e5);overflow:hidden;margin-bottom:6px;}' +
        '.wb3-cc-bar-fill{height:100%;border-radius:4px;transition:width .25s cubic-bezier(.22,1,.36,1);}' +
        '.wb3-cc-stats{display:flex;gap:14px;flex-wrap:wrap;color:var(--color-ink-tertiary,#888);}' +
        '.wb3-cc-stats b{color:var(--color-ink,#1a1a1a);font-variant-numeric:tabular-nums;}';
      document.head.appendChild(st);
    }
    const _COL = { rouge:'#b00020', blanc:'#d4c089', rose:'#d89dad', gris:'#9e9ea0' };
    function card(d){
      if(!d) return '';
      _inject();
      // v_cuverie_etat expose le contenu courant sous volume_total_hl
      // (pas de volume_actuel_hl au niveau vue) ; capacité = capacite_hl.
      const vol = (d.volume_total_hl != null ? d.volume_total_hl : d.volume_actuel_hl);
      const cap = d.capacite_hl;
      const pct = (cap>0 && vol!=null) ? Math.min(100, Math.max(0, (vol/cap)*100)) : 0;
      const lot = d.lot_nom ? `${_esc(d.lot_nom)}${d.millesime?' · '+_esc(d.millesime):''}` : 'Cuve vide';
      const col = _COL[d.couleur] || 'var(--color-primary,#0d6efd)';
      return `<div class="wb3-cuve-card">
        <div class="wb3-cc-top">
          <span class="wb3-cc-name"><span class="wb3-cc-dot" style="background:${col}"></span>${_esc(d.contenant_nom||d.nom||'—')}</span>
          <span class="wb3-cc-lot">${lot}</span>
        </div>
        <div class="wb3-cc-bar"><div class="wb3-cc-bar-fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="wb3-cc-stats">
          <span>Volume réel <b>${_fmt(vol)} hL</b></span>
          <span>Capacité <b>${_fmt(cap)} hL</b></span>
          ${d.cepage?`<span>Cépage <b>${_esc(d.cepage)}</b></span>`:''}
        </div>
      </div>`;
    }
    async function show(contenantId, container){
      const el = (typeof container==='string') ? document.getElementById(container) : container;
      if(!el) return;
      if(!contenantId){ el.innerHTML=''; return; }
      if(!window.WB3DB || !WB3DB.queryCuverieEtat){ el.innerHTML=''; return; }
      try{
        const rows = await WB3DB.queryCuverieEtat({ contenant_id: contenantId, includeArchived:true });
        el.innerHTML = (rows && rows.length) ? card(rows[0]) : '';
      }catch(e){ console.warn('[WB3CuveInfo]', e); el.innerHTML=''; }
    }
    return { card, show };
  })();

  // ============================================================
  // Drawers redimensionnables (drag du bord interne gauche)
  //   Largeur mémorisée PAR MODULE (page) : user_preferences, clé
  //   'drawer_width_<module>'. UNE seule largeur par module, appliquée aux
  //   drawers « standards » (.drawer). Les drawers à largeur figée en inline
  //   (ex. suivi-fa width:75vw, comparatif) sont volontairement exclus
  //   (détection de style.width). Desktop only ; bornes 320–720 px.
  //   Placé AVANT le early-return embarqué → tourne aussi dans les iframes
  //   du shell (qui contiennent des drawers). Pas de cache localStorage :
  //   le drawer est masqué au chargement (translateX) → aucun FOUC.
  // ============================================================
  (function () {
    const MIN = 320, MAX = 720, DEF = 420;
    // Tailles standards « magnétiques » (W6). 320/720 = bornes ; 480 = milieu.
    const SNAPS = [{ w: 320, l: 'compact' }, { w: 480, l: 'confort' }, { w: 720, l: 'large' }];
    const SNAP_TOL = 12;   // tolérance d'accroche (px)
    const pageModule = ((window.location.pathname.split('/').pop() || '')
                          .replace(/\.html$/, '')) || 'index';

    function readW() {
      const v = parseInt(getComputedStyle(document.documentElement)
                  .getPropertyValue('--wb3-drawer-w'), 10);
      return (v && v >= MIN && v <= MAX) ? v : DEF;
    }
    function saveW(w) {
      w = Math.max(MIN, Math.min(MAX, Math.round(w)));
      // Durable par utilisateur. Fire-and-forget sur geste user : jamais
      // dans onAuthStateChange → aucun risque de deadlock auth.
      try {
        if (window.WB3DB && WB3DB.setUserPref) {
          WB3DB.setUserPref('drawer_width_' + pageModule, { width: w }).catch(function () {});
        }
      } catch (e) {}
    }
    function attach(drawer) {
      if (drawer.dataset.gripReady) return;
      if (drawer.style.width) return;   // largeur figée en inline → non redimensionnable
      drawer.dataset.gripReady = '1';
      const grip = document.createElement('div');
      grip.className = 'drawer-grip';
      grip.setAttribute('aria-hidden', 'true');
      grip.title = 'Glisser pour redimensionner · double-clic pour réinitialiser';
      drawer.appendChild(grip);
      // Étiquette « repère » de snap (W6), masquée hors drag.
      const tag = document.createElement('div');
      tag.className = 'drawer-snap-tag';
      tag.setAttribute('aria-hidden', 'true');
      drawer.appendChild(tag);
      let dragging = false, startX = 0, startW = DEF;
      function onMove(e) {
        if (!dragging) return;
        let w = startW - (e.clientX - startX);   // bord gauche : vers la gauche = élargir
        w = Math.max(MIN, Math.min(MAX, w));
        // Snap magnétique vers une taille standard, SAUF si Shift est maintenu
        // (option « pro » : largeur 100% libre). Tolérance SNAP_TOL.
        let label = null;
        if (!e.shiftKey) {
          for (let i = 0; i < SNAPS.length; i++) {
            if (Math.abs(w - SNAPS[i].w) <= SNAP_TOL) {
              w = SNAPS[i].w; label = SNAPS[i].l + ' · ' + SNAPS[i].w + ' px'; break;
            }
          }
        }
        document.documentElement.style.setProperty('--wb3-drawer-w', w + 'px');
        grip.classList.toggle('is-snapped', label !== null);
        if (label) { tag.textContent = label; tag.classList.add('show'); }
        else { tag.classList.remove('show'); }
      }
      function onUp() {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove('wb3-drawer-resizing');
        grip.classList.remove('is-snapped');
        tag.classList.remove('show');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveW(readW());   // persiste la valeur snappée OU libre (W4)
      }
      grip.addEventListener('mousedown', function (e) {
        if (window.innerWidth < 768) return;   // mobile : resize désactivé
        if (e.button !== 0) return;
        dragging = true; startX = e.clientX; startW = readW();
        document.body.classList.add('wb3-drawer-resizing');
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
      });
      grip.addEventListener('dblclick', function () {
        document.documentElement.style.setProperty('--wb3-drawer-w', DEF + 'px');
        saveW(DEF);
        // Feedback discret (flash du grip). Reflow forcé → rejoue à chaque double-clic.
        grip.classList.remove('wb3-grip-flash'); void grip.offsetWidth; grip.classList.add('wb3-grip-flash');
      });
    }
    async function restore() {
      try {
        if (window.WB3Bootstrap && WB3Bootstrap.waitTenant) await WB3Bootstrap.waitTenant(8000);
        if (!window.WB3DB || !WB3DB.getUserPref) return;
        const pref = await WB3DB.getUserPref('drawer_width_' + pageModule);
        const w = pref && Number(pref.width);
        if (w && w >= MIN && w <= MAX) {
          document.documentElement.style.setProperty('--wb3-drawer-w', w + 'px');
        }
      } catch (e) { /* défaut conservé */ }
    }
    // ── Plein écran (W7) : bouton ⤢ injecté dans l'en-tête de CHAQUE drawer
    //   (y compris ceux à largeur figée exclus du grip W4). État non persisté :
    //   on revient en largeur normale au prochain affichage (décision UX).
    function exitFullscreen(drawer) {
      drawer.classList.remove('drawer-fullscreen');
      const b = drawer.querySelector('.drawer-fs-btn');
      if (b) { b.innerHTML = '⤢'; b.title = 'Plein écran'; }
    }
    function attachFs(drawer) {
      if (drawer.dataset.fsReady) return;
      const head = drawer.querySelector('.drawer-head');
      if (!head) return;
      drawer.dataset.fsReady = '1';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drawer-fs-btn';
      btn.title = 'Plein écran';
      btn.setAttribute('aria-label', 'Basculer le plein écran du panneau');
      btn.innerHTML = '⤢';
      btn.addEventListener('click', function () {
        const on = drawer.classList.toggle('drawer-fullscreen');
        btn.innerHTML = on ? '⤡' : '⤢';
        btn.title = on ? 'Quitter le plein écran' : 'Plein écran';
      });
      const closeBtn = head.querySelector('.close-btn');
      if (closeBtn) head.insertBefore(btn, closeBtn); else head.appendChild(btn);

      // À la FERMETURE du drawer (perte de .open), on quitte le plein écran →
      // une réouverture repart en largeur normale (état non persisté).
      new MutationObserver(function () {
        if (!drawer.classList.contains('open') && drawer.classList.contains('drawer-fullscreen')) {
          exitFullscreen(drawer);
        }
      }).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    }

    function init() {
      document.querySelectorAll('.drawer').forEach(function (d) { attach(d); attachFs(d); });
      // Esc quitte le plein écran. Capture + stopPropagation → passe AVANT les
      // closeDrawer() des pages (qui écoutent Esc en bulle) UNIQUEMENT quand un
      // drawer est en plein écran ; sinon on laisse la page gérer Esc (fermeture).
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const fs = document.querySelector('.drawer.drawer-fullscreen');
        if (fs) { e.stopPropagation(); e.preventDefault(); exitFullscreen(fs); }
      }, true);
      restore();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();

  // Mode embarqué (shell iframe) : pas de sidebar, mais on fixe le corps + on délègue la navigation
  if (new URLSearchParams(window.location.search).get('embedded') === '1') {
    // 1. Marque le body pour les règles CSS embedded (cache .wb-header, etc.)
    function _markEmbedded() { document.body.classList.add('embedded'); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _markEmbedded);
    else _markEmbedded();

    // 2. Intercepte tous les clics sur <a> same-origin → délègue au shell parent
    //    Évite le chargement de shell.html dans l'iframe (doublon de sidebar)
    document.addEventListener('click', function(e) {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto:')) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return; // lien externe → comportement natif
        e.preventDefault();
        url.searchParams.delete('embedded');
        const clean = url.pathname.split('/').pop() + (url.search || '');
        if (window.parent !== window && typeof window.parent.WB3Shell !== 'undefined' &&
            typeof window.parent.WB3Shell.navigate === 'function') {
          window.parent.WB3Shell.navigate(clean);
        } else {
          // Fallback : navigation dans le même frame avec embedded=1
          url.searchParams.set('embedded', '1');
          window.location.href = url.href;
        }
      } catch(err) { /* URL invalide : laisser le comportement natif */ }
    });
    return;
  }

  // ============================================================
  // Configuration
  // ============================================================
  const _CUVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16" style="vertical-align:-.15em;display:inline-block" aria-hidden="true"><rect x="3" y="3" width="14" height="13" rx="1.2" fill="#ccd8e4" stroke="#7a96b0" stroke-width="1.3"/><ellipse cx="10" cy="3" rx="7" ry="2.2" fill="#e0eaf4" stroke="#7a96b0" stroke-width="1.3"/><ellipse cx="10" cy="16" rx="7" ry="2.2" fill="#b8cad8" stroke="#7a96b0" stroke-width="1.3"/><line x1="3" y1="8.5" x2="17" y2="8.5" stroke="#7a96b0" stroke-width="0.7"/><line x1="3" y1="12.5" x2="17" y2="12.5" stroke="#7a96b0" stroke-width="0.7"/><line x1="14" y1="17.5" x2="14" y2="20" stroke="#7a96b0" stroke-width="1.6"/></svg>`;

  const NAV_ITEMS = [
    { href: 'dashboard.html',  icon: ICON.dashboard,      label: 'Tableau de bord' },
    { href: 'cuverie.html',    icon: ICON.tank,           label: 'Cuverie' },
    { href: 'lots.html',       icon: ICON.wine,           label: 'Lots' },
    { href: 'apports.html',    icon: ICON.grape,          label: 'Apports' },
    { href: 'reception.html',  icon: ICON.hopper,         label: 'Réception' },
    { href: 'planning.html',   icon: ICON.calendar,       label: 'Planning', module: 'planning' },
    { href: 'operations.html', icon: ICON.clipboardCheck, label: 'Opérations' },
    { href: 'produits.html',   icon: ICON.flask,          label: 'Produits' },
    { href: 'analyses.html',   icon: ICON.microscope,     label: 'Analyses' },
    { href: 'assemblage.html', icon: ICON.blend,          label: 'Assemblage', module: 'assemblage' },
    { href: 'echantillons.html', icon: ICON.bottle,       label: 'Échantillons', module: 'echantillon' },
    { href: 'rapports.html',   icon: ICON.report,         label: 'Rapports' },
    'sep',
    { href: 'parametres.html', icon: ICON.settings,       label: 'Paramètres' },
  ];

  // Pages "filles" → parent dans la nav (pour surlignage correct)
  const PARENT_MAP = {
    'lot-detail.html':       'lots.html',
    'contenant-detail.html': 'cuverie.html',
  };

  const NAV_W   = 220;
  const RAIL_W  = 52;
  const BREAK   = 768;
  const NAV_MIN = 180;   // largeur sidebar mini (drag)
  const NAV_MAX = 400;   // largeur sidebar maxi (drag)
  const LARGE_W = 320;   // plancher de l'état « large » (W3)

  const currentFile  = window.location.pathname.split('/').pop() || 'dashboard.html';
  const activeTarget = PARENT_MAP[currentFile] || currentFile;

  // État sidebar W3 : 'rail' | 'normal' | 'large'. Migration depuis l'ancien
  // flag binaire wb3_nav_collapsed.
  let navState = localStorage.getItem('wb3_nav_state');
  if (navState !== 'rail' && navState !== 'normal' && navState !== 'large') {
    navState = (localStorage.getItem('wb3_nav_collapsed') === '1') ? 'rail' : 'normal';
  }
  let collapsed  = (navState === 'rail');   // compat interne (rail)
  let mobileOpen = false;

  // ============================================================
  // CSS injecté
  // ============================================================
  const css = `
    :root {
      --wb3-nav-w:    ${NAV_W}px;
      --wb3-nav-rail: ${RAIL_W}px;
      --wb3-nav-bg:   #0d2137;
      --wb3-nav-acc:  #e8b04a;
    }

    /* ── Sidebar ── */
    .wb3-nav {
      position: fixed; left: 0; top: 0; bottom: 0;
      width: var(--wb3-nav-w);
      background: var(--wb3-nav-bg);
      display: flex; flex-direction: column;
      z-index: 300;
      transition: width .22s ease, transform .22s ease;
      overflow: hidden;
      box-shadow: 2px 0 16px rgba(0,0,0,.2);
    }
    .wb3-nav.collapsed { width: var(--wb3-nav-rail); }
    .wb3-nav.wb3-large { width: max(var(--wb3-nav-w), ${LARGE_W}px); }

    /* ── Poignée de redimensionnement (3 points, desktop only) ── */
    .wb3-nav-grip {
      position: absolute; top: 0; right: 0; bottom: 0; width: 8px;
      cursor: col-resize; z-index: 310;
      display: flex; align-items: center; justify-content: center;
    }
    .wb3-nav-grip::before {
      content: '⋮'; color: rgba(255,255,255,0);
      font-size: 15px; line-height: 1; transition: color .15s;
    }
    .wb3-nav-grip:hover::before,
    body.wb3-nav-resizing .wb3-nav-grip::before { color: rgba(255,255,255,.5); }
    body.wb3-nav-resizing { cursor: col-resize; user-select: none; }
    body.wb3-nav-resizing .wb3-nav,
    body.wb3-nav-resizing .wb-header,
    body.wb3-nav-resizing .wb-main { transition: none !important; }
    body.wb3-nav-resizing iframe { pointer-events: none; }
    @media (prefers-reduced-motion: reduce) { .wb3-nav-grip::before { transition: none; } }

    @media (max-width: ${BREAK - 1}px) {
      .wb3-nav           { transform: translateX(-100%); width: ${NAV_W}px !important; }
      .wb3-nav.mob-open  { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,.4); }
      .wb3-nav-grip      { display: none; }   /* mobile : resize désactivé */
    }

    /* ── Logo row (hamburger + logo) ── */
    .wb3-nav-logo-row {
      display: flex; align-items: center;
      border-bottom: 1px solid rgba(255,255,255,.09); flex-shrink: 0;
    }
    .wb3-nav-hamburger-top {
      display: flex; align-items: center; justify-content: center;
      width: 52px; height: 50px; flex-shrink: 0;
      border: none; background: none;
      color: rgba(255,255,255,.55); cursor: pointer; font-size: 18px; font-family: inherit;
      transition: color .14s, background .14s;
    }
    .wb3-nav-hamburger-top:hover { color: #fff; background: rgba(255,255,255,.08); }
    @media (max-width: ${BREAK - 1}px) { .wb3-nav-hamburger-top { display: none; } }
    .wb3-nav-logo {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 13px 14px 2px; flex: 1;
      color: #fff; text-decoration: none; overflow: hidden;
    }
    .wb3-nav-logo .n-icon { font-size: 22px; flex-shrink: 0; }
    .wb3-nav-logo img.n-icon { width: 28px; height: 28px; object-fit: contain; display: block; }
    .wb3-nav-logo .n-text {
      font-weight: 700; font-size: 14.5px; letter-spacing: .3px;
      white-space: nowrap; overflow: hidden;
      transition: opacity .18s, max-width .22s; max-width: 200px;
    }
    .wb3-nav.collapsed .wb3-nav-logo .n-text { opacity: 0; max-width: 0; }

    /* ── Scrollable items ── */
    .wb3-nav-items {
      flex: 1; overflow-y: auto; overflow-x: hidden; padding: 7px 0;
    }
    .wb3-nav-items::-webkit-scrollbar { width: 3px; }
    .wb3-nav-items::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 2px; }

    .wb3-nav-sep { height: 1px; background: rgba(255,255,255,.08); margin: 5px 10px; }

    /* ── Nav item ── */
    .wb3-nav-item {
      display: flex; align-items: center; gap: 11px;
      padding: 9px 13px; color: rgba(255,255,255,.65);
      text-decoration: none; font-size: 13px; font-weight: 500;
      border-radius: 8px; margin: 1px 5px;
      transition: background .14s, color .14s;
      position: relative; white-space: nowrap; cursor: pointer;
    }
    .wb3-nav-item:hover { background: rgba(255,255,255,.09); color: rgba(255,255,255,.95); }
    .wb3-nav-item.active {
      background: rgba(232,176,74,.13);
      color: #fff; font-weight: 600;
    }
    .wb3-nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 6px; bottom: 6px;
      width: 3px; border-radius: 0 2px 2px 0;
      background: var(--wb3-nav-acc);
    }
    .wb3-nav-item .n-icon  {
      display: flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; flex-shrink: 0;
    }
    .wb3-nav-item .n-icon svg { width: 18px; height: 18px; display: block; }
    .wb3-nav-item .n-label {
      overflow: hidden; transition: opacity .18s, max-width .22s;
      max-width: 200px;
    }
    .wb3-nav.collapsed .wb3-nav-item .n-label { opacity: 0; max-width: 0; }

    /* Tooltip collapsed (desktop seulement) */
    @media (min-width: ${BREAK}px) {
      .wb3-nav.collapsed .wb3-nav-item { position: relative; }
      .wb3-nav.collapsed .wb3-nav-item:hover::after {
        content: attr(data-label);
        position: absolute; left: calc(var(--wb3-nav-rail) + 6px); top: 50%;
        transform: translateY(-50%);
        background: #1a3a55; color: #fff;
        padding: 5px 10px; border-radius: 6px;
        font-size: 12.5px; white-space: nowrap;
        box-shadow: 0 2px 10px rgba(0,0,0,.35);
        pointer-events: none; z-index: 400;
      }
    }

    /* ── Hamburger injecté dans .wb-header (mobile) ── */
    .wb3-hamburger {
      display: none; align-items: center; justify-content: center;
      background: rgba(255,255,255,.14); border: none; color: #fff;
      font-size: 17px; width: 34px; height: 34px; border-radius: 8px;
      cursor: pointer; flex-shrink: 0; transition: background .14s;
    }
    .wb3-hamburger:hover { background: rgba(255,255,255,.24); }
    @media (max-width: ${BREAK - 1}px) { .wb3-hamburger { display: flex; } }

    /* ── Backdrop mobile ── */
    .wb3-backdrop {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,.5); z-index: 299; backdrop-filter: blur(2px);
    }
    .wb3-backdrop.show { display: block; }

    /* ── Décalage du contenu (desktop) ── */
    @media (min-width: ${BREAK}px) {
      body.wb3-has-nav .wb-header,
      body.wb3-has-nav .wb-main {
        margin-left: var(--wb3-nav-w);
        transition: margin-left .22s ease;
      }
      body.wb3-has-nav.wb3-collapsed .wb-header,
      body.wb3-has-nav.wb3-collapsed .wb-main {
        margin-left: var(--wb3-nav-rail);
      }
      body.wb3-has-nav.wb3-large .wb-header,
      body.wb3-has-nav.wb3-large .wb-main {
        margin-left: max(var(--wb3-nav-w), ${LARGE_W}px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .wb3-nav,
      body.wb3-has-nav .wb-header,
      body.wb3-has-nav .wb-main { transition: none; }
    }
  `;

  // ============================================================
  // Injection CSS
  // ============================================================
  const styleEl = document.createElement('style');
  styleEl.id = 'wb3-nav-css';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Restauration anti-FOUC (cache localStorage, même motif que le thème
  // `wb3_theme`). Source durable PAR utilisateur = user_preferences, restaurée
  // de façon asynchrone par restoreSidebarWidth() une fois le tenant connu.
  (function applyCachedSidebarWidth() {
    try {
      const c = parseInt(localStorage.getItem('wb3_sidebar_width'), 10);
      if (c >= NAV_MIN && c <= NAV_MAX) {
        document.documentElement.style.setProperty('--wb3-nav-w', c + 'px');
      }
    } catch (e) { /* localStorage indispo → largeur par défaut */ }
  })();

  // ============================================================
  // Construction de la nav
  // ============================================================
  function buildNav() {
    const nav = document.createElement('nav');
    nav.id = 'wb3-nav';
    nav.className = 'wb3-nav' +
      (navState === 'rail' ? ' collapsed' : navState === 'large' ? ' wb3-large' : '');
    nav.setAttribute('aria-label', 'Navigation principale');

    // Logo row : hamburger + logo
    const logoRow = document.createElement('div');
    logoRow.className = 'wb3-nav-logo-row';

    const hamburger = document.createElement('button');
    hamburger.id = 'wb3-nav-toggle';
    hamburger.className = 'wb3-nav-hamburger-top';
    hamburger.title = _navStateTitle(navState);
    hamburger.innerHTML = _navStateGlyph(navState);
    hamburger.addEventListener('click', cycleNavState);
    logoRow.appendChild(hamburger);

    const logo = document.createElement('a');
    logo.href = 'app.html';
    logo.className = 'wb3-nav-logo';
    logo.innerHTML = `<img class="n-icon" src="img/icon-wineblender-192.png" alt="WineBlender" /><span class="n-text">WineBlender 3</span>`;
    logoRow.appendChild(logo);

    nav.appendChild(logoRow);

    // Items
    const items = document.createElement('div');
    items.className = 'wb3-nav-items';

    NAV_ITEMS.forEach(item => {
      if (item === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'wb3-nav-sep';
        items.appendChild(sep);
        return;
      }
      const filename = item.href.split('/').pop();
      const isActive = activeTarget === filename;

      const a = document.createElement('a');
      a.href      = item.href;
      a.className = 'wb3-nav-item' + (isActive ? ' active' : '');
      a.dataset.label = item.label;
      a.setAttribute('aria-current', isActive ? 'page' : 'false');
      a.innerHTML = `<span class="n-icon">${item.icon}</span><span class="n-label">${item.label}</span>`;
      items.appendChild(a);
    });
    nav.appendChild(items);

    // Poignée de redimensionnement (bord droit). Masquée en mobile (CSS).
    const grip = document.createElement('div');
    grip.className = 'wb3-nav-grip';
    grip.id = 'wb3-nav-grip';
    grip.title = 'Glisser pour redimensionner · double-clic pour réinitialiser';
    grip.setAttribute('aria-hidden', 'true');
    nav.appendChild(grip);

    return nav;
  }

  // ── États de la sidebar (W3) : rail → normal → large ────────────
  function _navStateGlyph(s) { return s === 'rail' ? '»' : s === 'large' ? '«' : '☰'; }
  function _navStateTitle(s) {
    return s === 'rail'  ? 'Barre : icônes — clic → normale ( [ )'
         : s === 'large' ? 'Barre : large — clic → icônes ( [ )'
         :                 'Barre : normale — clic → large ( [ )';
  }

  // Applique un état (classes nav + body + bouton) et persiste si demandé.
  function applyNavState(state, persist) {
    navState  = state;
    collapsed = (state === 'rail');
    const nav = document.getElementById('wb3-nav');
    if (nav) {
      nav.classList.toggle('collapsed', state === 'rail');
      nav.classList.toggle('wb3-large', state === 'large');
    }
    document.body.classList.toggle('wb3-collapsed', state === 'rail');
    document.body.classList.toggle('wb3-large',     state === 'large');
    const btn = document.getElementById('wb3-nav-toggle');
    if (btn) { btn.innerHTML = _navStateGlyph(state); btn.title = _navStateTitle(state); }
    try {
      localStorage.setItem('wb3_nav_state', state);
      localStorage.setItem('wb3_nav_collapsed', state === 'rail' ? '1' : '0'); // compat
    } catch (e) {}
    if (persist) persistSidebar();
  }

  // Bouton dédié & touche « [ » : cycle rail → normal → large → rail.
  function cycleNavState() {
    const order = ['rail', 'normal', 'large'];
    applyNavState(order[(order.indexOf(navState) + 1) % 3], true);
  }

  // Cmd/Ctrl+B & expand-avant-resize : bascule rail ↔ normal.
  function toggleCollapse() {
    applyNavState(collapsed ? 'normal' : 'rail', true);
  }

  // ============================================================
  // Redimensionnement de la sidebar (drag du bord droit)
  //   Persistance : user_preferences (module 'ui_sidebar', par user+tenant)
  //   + cache localStorage `wb3_sidebar_width` (anti-FOUC, comme le thème).
  //   Desktop uniquement ; mobile = sidebar en mode hamburger (inchangé).
  // ============================================================
  function readSidebarWidth() {
    const v = parseInt(getComputedStyle(document.documentElement)
                .getPropertyValue('--wb3-nav-w'), 10);
    return (v && v >= NAV_MIN && v <= NAV_MAX) ? v : NAV_W;
  }

  // Persistance combinée largeur (normale, W1) + état (W3) sous la MÊME clé
  // user_preferences 'ui_sidebar' → upsert atomique (pas d'écrasement croisé).
  // Fire-and-forget : geste user, jamais dans onAuthStateChange (pas de deadlock).
  function persistSidebar() {
    const payload = { width: readSidebarWidth(), state: navState };
    try { localStorage.setItem('wb3_sidebar_width', String(payload.width)); } catch (e) {}
    try { localStorage.setItem('wb3_nav_state', payload.state); } catch (e) {}
    try {
      if (window.WB3DB && WB3DB.setUserPref) {
        WB3DB.setUserPref('ui_sidebar', payload).catch(function () {});
      }
    } catch (e) {}
  }
  function saveSidebarWidth(w) {
    w = Math.max(NAV_MIN, Math.min(NAV_MAX, Math.round(w)));
    document.documentElement.style.setProperty('--wb3-nav-w', w + 'px');
    persistSidebar();
  }

  function initResize(nav) {
    const grip = nav.querySelector('.wb3-nav-grip');
    if (!grip) return;
    let dragging = false, startX = 0, startW = NAV_W;

    function onMove(e) {
      if (!dragging) return;
      let w = startW + (e.clientX - startX);
      w = Math.max(NAV_MIN, Math.min(NAV_MAX, w));
      document.documentElement.style.setProperty('--wb3-nav-w', w + 'px');
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('wb3-nav-resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveSidebarWidth(readSidebarWidth());
    }
    grip.addEventListener('mousedown', function (e) {
      if (window.innerWidth < BREAK) return;   // mobile : resize désactivé
      if (e.button !== 0) return;
      if (collapsed) toggleCollapse();         // rail → mode normal AVANT resize
      dragging = true;
      startX = e.clientX;
      startW = readSidebarWidth();
      document.body.classList.add('wb3-nav-resizing');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
    // Double-clic : réinitialiser à la largeur par défaut.
    grip.addEventListener('dblclick', function () {
      document.documentElement.style.setProperty('--wb3-nav-w', NAV_W + 'px');
      saveSidebarWidth(NAV_W);
      // Feedback discret (flash du grip). Reflow forcé → rejoue à chaque double-clic.
      grip.classList.remove('wb3-grip-flash'); void grip.offsetWidth; grip.classList.add('wb3-grip-flash');
    });
  }

  // Restauration durable (user_preferences) une fois le tenant prêt.
  async function restoreSidebarWidth() {
    try {
      if (window.WB3Bootstrap && WB3Bootstrap.waitTenant) await WB3Bootstrap.waitTenant(8000);
      if (!window.WB3DB || !WB3DB.getUserPref) return;
      const pref = await WB3DB.getUserPref('ui_sidebar');
      const w = pref && Number(pref.width);
      if (w && w >= NAV_MIN && w <= NAV_MAX) {
        document.documentElement.style.setProperty('--wb3-nav-w', w + 'px');
        try { localStorage.setItem('wb3_sidebar_width', String(w)); } catch (e) {}
      }
      if (pref && (pref.state === 'rail' || pref.state === 'normal' || pref.state === 'large')) {
        applyNavState(pref.state, false);   // restaure l'état (W3)
      }
    } catch (e) { /* on conserve le cache / défaut */ }
  }

  // ============================================================
  // Backdrop
  // ============================================================
  function buildBackdrop() {
    const bd = document.createElement('div');
    bd.id        = 'wb3-backdrop';
    bd.className = 'wb3-backdrop';
    bd.setAttribute('aria-hidden', 'true');
    bd.addEventListener('click', closeMobile);
    return bd;
  }

  // ============================================================
  // Hamburger dans .wb-header
  // ============================================================
  function injectHamburger() {
    const header = document.querySelector('.wb-header');
    if (!header) return;
    const btn = document.createElement('button');
    btn.id        = 'wb3-hamburger';
    btn.className = 'wb3-hamburger';
    btn.title     = 'Menu navigation';
    btn.setAttribute('aria-label', 'Ouvrir la navigation');
    btn.innerHTML = '☰';
    btn.addEventListener('click', () => mobileOpen ? closeMobile() : openMobile());
    header.prepend(btn);
  }

  function openMobile() {
    mobileOpen = true;
    document.getElementById('wb3-nav').classList.add('mob-open');
    document.getElementById('wb3-backdrop').classList.add('show');
  }
  function closeMobile() {
    mobileOpen = false;
    document.getElementById('wb3-nav').classList.remove('mob-open');
    document.getElementById('wb3-backdrop').classList.remove('show');
  }

  // ============================================================
  // Fermer la nav mobile sur clic d'un lien interne
  // ============================================================
  function bindNavLinks(nav) {
    nav.querySelectorAll('.wb3-nav-item').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth < BREAK) closeMobile();
      });
    });
  }

  // ============================================================
  // Init (attend le DOM)
  // ============================================================
  function init() {
    // Mode fenêtre indépendante (?fs=1, 2ᵉ écran) : aucune sidebar ni header
    // WB3 → cuverie pleine largeur. Les drawers (bloc séparé ci-dessus) restent
    // actifs ; le chrome est masqué par cuverie.html (html.wb3-fs).
    if (new URLSearchParams(window.location.search).get('fs') === '1') return;

    const nav      = buildNav();
    const backdrop = buildBackdrop();

    // Insérer avant tout le contenu existant
    document.body.insertBefore(backdrop, document.body.firstChild);
    document.body.insertBefore(nav,      document.body.firstChild);

    document.body.classList.add('wb3-has-nav');
    applyNavState(navState, false);   // applique rail / normal / large (classes + bouton)

    injectHamburger();
    bindNavLinks(nav);
    initResize(nav);

    // Fermer avec Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileOpen) closeMobile();
    });

    // Raccourcis sidebar (desktop) : « [ » cycle rail→normal→large ;
    // Cmd/Ctrl+B réduit/agrandit (rail↔normal). Aucun conflit clavier dans WB3
    // (seul Ctrl/Cmd+K = recherche est pris). Ignorés si la frappe vise un champ.
    document.addEventListener('keydown', e => {
      if (window.innerWidth < BREAK) return;                 // mobile : aucune interaction
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault(); toggleCollapse();
      } else if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === '[') {
        e.preventDefault(); cycleNavState();
      }
    });

    // Passe asynchrone : masque du menu les modules DÉSACTIVÉS pour la cave
    // (le contexte tenant n'est pas prêt au moment du build initial).
    gateNav();

    // Passe asynchrone : restaure la largeur sauvegardée (user_preferences).
    restoreSidebarWidth();
  }

  // Modules visibles par le rôle CAVISTE (consultation cave + saisie analyse).
  // Les autres rôles voient tout (sous réserve des toggles cave + capacités).
  const CAVISTE_NAV = new Set(['dashboard.html', 'cuverie.html', 'apports.html', 'analyses.html', 'parametres.html']);

  // Masque les items de nav : (1) module coupé pour la cave (mig 074),
  // (2) rôle caviste → seulement Cuverie / Apports / Analyses (+ accueil, paramètres).
  async function gateNav() {
    try {
      if (window.WB3Bootstrap && WB3Bootstrap.waitTenant) await WB3Bootstrap.waitTenant(8000);
      const WB3DB = window.WB3DB;
      if (!WB3DB) return;
      const role = (WB3DB.getCurrentTenant && WB3DB.getCurrentTenant()) ? WB3DB.getCurrentTenant().role : null;
      const isCaviste = role === 'caviste';
      let mods = {};
      if (WB3DB.tenantModules) { try { mods = await WB3DB.tenantModules(); } catch (_) {} }
      document.querySelectorAll('#wb3-nav .wb3-nav-item').forEach(a => {
        const f = (a.getAttribute('href') || '').split('/').pop();
        const cfg = NAV_ITEMS.find(it => it !== 'sep' && it.href.split('/').pop() === f);
        let hide = false;
        if (cfg && cfg.module && mods[cfg.module] === false) hide = true;   // toggle cave
        if (isCaviste && !CAVISTE_NAV.has(f)) hide = true;                   // périmètre caviste
        if (hide) a.style.display = 'none';
      });
    } catch (_) { /* nav reste complète en cas de souci */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // 🔎 Recherche globale (command-palette) — cuves & lots
  //   Déclencheur : bouton dans la topbar (.header-actions) + Ctrl/Cmd+K.
  //   Résultats cliquables → fiche cuve / fiche lot. Lecture seule.
  // ============================================================
  window.WB3Search = (function () {
    let _css = false, _box = null, _cache = null, _items = [], _hi = 0, _loading = false;
    function _esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    function _inject(){
      if (_css) return; _css = true;
      const st = document.createElement('style');
      st.textContent =
        '.wb3-srch-bd{position:fixed;inset:0;background:rgba(12,22,36,.45);z-index:3200;display:flex;align-items:flex-start;justify-content:center;padding:10vh 16px 16px;}' +
        '.wb3-srch{background:var(--color-bg-elevated,#fff);color:var(--color-ink,#1a1a1a);width:min(620px,100%);max-height:70vh;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.4);overflow:hidden;display:flex;flex-direction:column;animation:wb3dlgIn .14s ease;}' +
        '.wb3-srch-in{border:none;outline:none;font:inherit;font-size:16px;padding:16px 18px;background:none;color:inherit;border-bottom:1px solid var(--color-border,#e2e5e9);}' +
        '.wb3-srch-res{overflow:auto;padding:6px 0;}' +
        '.wb3-srch-grp{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--color-ink-tertiary,#999);padding:8px 18px 4px;}' +
        '.wb3-srch-it{display:flex;align-items:center;gap:11px;padding:9px 18px;cursor:pointer;}' +
        '.wb3-srch-it.hi,.wb3-srch-it:hover{background:var(--color-bg-subtle,#f3f4f6);}' +
        '.wb3-srch-ic{font-size:18px;width:24px;text-align:center;flex-shrink:0;}' +
        '.wb3-srch-nm{font-weight:600;font-size:14px;}' +
        '.wb3-srch-sub{font-size:12px;color:var(--color-ink-tertiary,#888);}' +
        '.wb3-srch-empty{padding:18px;color:var(--color-ink-tertiary,#888);font-size:13px;text-align:center;}' +
        '.wb3-srch-trig{display:inline-flex;align-items:center;gap:6px;cursor:pointer;}' +
        '.wb3-srch-kbd{font-size:10px;border:1px solid var(--color-border,#ccc);border-radius:4px;padding:1px 5px;color:var(--color-ink-tertiary,#999);}';
      document.head.appendChild(st);
    }
    async function _load(){
      if (_cache) return _cache;
      if (_loading) return [];
      _loading = true;
      const out = [];
      try {
        const DB = window.WB3DB;
        const [cuves, lots] = await Promise.all([
          (DB && DB.queryCuverieEtat) ? DB.queryCuverieEtat().catch(()=>[]) : Promise.resolve([]),
          (DB && DB.listTable) ? DB.listTable('lots', { order: 'nom' }).catch(()=>[]) : Promise.resolve([]),
        ]);
        (cuves||[]).forEach(c => out.push({
          type:'cuve', icon:'🛢', id:c.contenant_id,
          name:c.contenant_nom||'—',
          sub:[c.lot_nom?`${c.lot_nom}${c.millesime?' '+c.millesime:''}`:'vide',
               (c.volume_total_hl!=null?c.volume_total_hl+' hL':null)].filter(Boolean).join(' · '),
          hay:[c.contenant_nom,c.lot_nom,c.millesime].filter(Boolean).join(' ').toLowerCase(),
          href:`contenant-detail.html?id=${encodeURIComponent(c.contenant_id)}`,
        }));
        (lots||[]).filter(l=>l.actif!==false).forEach(l => out.push({
          type:'lot', icon:'🍷', id:l.id,
          name:l.nom||'—',
          sub:[l.millesime||null, l.statut||null].filter(Boolean).join(' · '),
          hay:[l.nom,l.numero,l.millesime].filter(Boolean).join(' ').toLowerCase(),
          href:`lot-detail.html?id=${encodeURIComponent(l.id)}`,
        }));
      } catch(_) {}
      _loading = false; _cache = out; return out;
    }
    function _render(q){
      const res = _box.querySelector('.wb3-srch-res');
      const t = (q||'').trim().toLowerCase();
      let list = _cache || [];
      if (t) list = list.filter(x => x.hay.includes(t));
      list = list.slice(0, 40);
      _items = list; _hi = 0;
      if (!list.length){ res.innerHTML = `<div class="wb3-srch-empty">${(_cache===null)?'Chargement…':'Aucun résultat'}</div>`; return; }
      const groups = { cuve:[], lot:[] };
      list.forEach((x,i)=>groups[x.type].push({ ...x, i }));
      let html = '';
      if (groups.cuve.length) html += `<div class="wb3-srch-grp">Cuves</div>` + groups.cuve.map(_row).join('');
      if (groups.lot.length)  html += `<div class="wb3-srch-grp">Lots</div>`  + groups.lot.map(_row).join('');
      res.innerHTML = html;
      res.querySelectorAll('.wb3-srch-it').forEach(el=>{
        el.addEventListener('mousedown', e=>{ e.preventDefault(); _go(+el.dataset.i); });
      });
    }
    function _row(x){
      return `<div class="wb3-srch-it${x.i===0?' hi':''}" data-i="${x.i}">`+
        `<span class="wb3-srch-ic">${x.icon}</span>`+
        `<span><div class="wb3-srch-nm">${_esc(x.name)}</div>`+
        (x.sub?`<div class="wb3-srch-sub">${_esc(x.sub)}</div>`:'')+`</span></div>`;
    }
    function _hilite(){ _box.querySelectorAll('.wb3-srch-it').forEach((el,i)=>el.classList.toggle('hi', +el.dataset.i===_hi)); }
    function _go(i){ const x=_items[i]; if(!x) return; close(); (window.top||window).location.href = x.href; }
    function close(){ if(_box){ _box.remove(); _box=null; document.removeEventListener('keydown', _onKey, true); } }
    function _onKey(e){
      if (!_box) return;
      if (e.key==='Escape'){ e.preventDefault(); close(); }
      else if (e.key==='ArrowDown'){ e.preventDefault(); _hi=Math.min(_hi+1,_items.length-1); _hilite(); }
      else if (e.key==='ArrowUp'){ e.preventDefault(); _hi=Math.max(_hi-1,0); _hilite(); }
      else if (e.key==='Enter'){ e.preventDefault(); _go(_hi); }
    }
    async function open(){
      if (_box) return; _inject();
      _box = document.createElement('div'); _box.className='wb3-srch-bd';
      _box.innerHTML = `<div class="wb3-srch" role="dialog" aria-modal="true"><input class="wb3-srch-in" placeholder="Rechercher une cuve, un lot, un millésime…" autocomplete="off"><div class="wb3-srch-res"></div></div>`;
      document.body.appendChild(_box);
      _box.addEventListener('mousedown', e=>{ if(e.target===_box) close(); });
      const inp = _box.querySelector('.wb3-srch-in');
      inp.addEventListener('input', ()=>_render(inp.value));
      document.addEventListener('keydown', _onKey, true);
      inp.focus();
      _render('');                 // affiche « Chargement… »
      await _load(); _render(inp.value);
    }
    return { open, mount: function(){
      _inject();
      // Bouton dans la topbar de la page (si présente).
      document.querySelectorAll('.header-actions').forEach(bar=>{
        if (bar.querySelector('.wb3-srch-trig')) return;
        const b = document.createElement('button');
        b.type='button'; b.className='btn btn--header wb3-srch-trig'; b.title='Recherche (Ctrl/Cmd+K)';
        b.innerHTML = `🔎 <span class="wb3-srch-kbd">⌘K</span>`;
        b.addEventListener('click', open);
        bar.insertBefore(b, bar.firstChild);
      });
      // Raccourci clavier global.
      document.addEventListener('keydown', e=>{
        if ((e.ctrlKey||e.metaKey) && (e.key==='k'||e.key==='K')){ e.preventDefault(); open(); }
      });
    }};
  })();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>WB3Search.mount());
  else WB3Search.mount();
})();
