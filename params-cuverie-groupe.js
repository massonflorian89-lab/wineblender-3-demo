/* params-cuverie-groupe.js — Paramètres : groupe Cuverie (barre de sous-onglets + dispatch)
 * Dépend de activeCuverieSubtab (var dans parametres.html → window.*).
 * Les render* appelées depuis _renderCuverieSubContent sont dans leurs propres modules.
 */
'use strict';

// Icône SVG d'un sous-onglet (réutilise WB3Icons ; vide si indispo)
function _subIc(key) {
  const svg = (window.WB3Icons || {})[key];
  return svg ? `<span class="subtab-ic">${svg}</span>` : '';
}

const CUVERIE_SUBTABS = [
  { key:'travees',   ic:'mapPin',    label:'Travées'        },
  { key:'contenants',ic:'tank',      label:'Contenants'     },
  { key:'epalement', ic:'ruler',     label:'Épalement'      },
  { key:'vue',       ic:'dashboard', label:'Vue cuverie'    },
  { key:'import',    ic:'download',  label:'Import cuverie' },
];

// Retourne #cuverie-sub quand le groupe est actif, sinon settings-content
function _getSubRoot() {
  return document.getElementById('cuverie-sub') || document.getElementById('settings-content');
}

function renderCuverieGroup() {
  const root = document.getElementById('settings-content');
  const tabs = CUVERIE_SUBTABS.map(t => `
    <button class="subtab-btn${activeCuverieSubtab === t.key ? ' active' : ''}"
            data-subtab="${t.key}" onclick="setCuverieSubtab('${t.key}')">
      ${_subIc(t.ic)}${t.label}
    </button>`).join('');
  root.innerHTML = `<div class="subtab-bar">${tabs}</div><div id="cuverie-sub"></div>`;
  _renderCuverieSubContent();
}

function setCuverieSubtab(key) {
  activeCuverieSubtab = key;
  document.querySelectorAll('.subtab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.subtab === key)
  );
  _renderCuverieSubContent();
}

function _renderCuverieSubContent() {
  if      (activeCuverieSubtab === 'travees')    renderTravees();
  else if (activeCuverieSubtab === 'contenants') renderContenantsSection();
  else if (activeCuverieSubtab === 'epalement')  renderEpalementSection();
  else if (activeCuverieSubtab === 'vue')        renderCuverieSettings();
  else if (activeCuverieSubtab === 'import')     renderImportSection();
}
