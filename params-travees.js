/* params-travees.js — Paramètres : section Travées
 * Dépend de : _getSubRoot() (params-cuverie-groupe.js),
 *             travees (var dans main), loadTravees() / sortTravees() (dans main).
 */
'use strict';

function renderTravees() {
  const root = _getSubRoot();
  root.innerHTML = `
    <h2>📍 Travées</h2>
    <p class="lead">Organise ta cave en travées (zones physiques). Les contenants pourront être affectés à une travée pour faciliter le filtrage et le regroupement.</p>

    <form class="add-form" onsubmit="event.preventDefault(); addTravee()">
      <input class="input" type="text" id="new-travee-nom" maxlength="60" placeholder="Nom de la travée (ex : Travée A, Chai nord, Cellier)">
      <button class="btn" type="submit">+ Ajouter</button>
    </form>

    <div id="travees-list"></div>
  `;
  renderTraveesList();
}

function renderTraveesList() {
  const list = document.getElementById('travees-list');
  if (!travees.length) {
    list.innerHTML = `
      <div class="empty-state" style="padding: var(--space-8) var(--space-4)">
        <div class="icon">📍</div>
        <div class="title">Aucune travée pour l'instant</div>
        <div class="desc">Ajoute ta première travée avec le formulaire ci-dessus.</div>
      </div>`;
    return;
  }

  list.innerHTML = '<div class="sortable-list" id="sortable"></div>';
  const sortable = document.getElementById('sortable');
  travees.forEach((t) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.draggable = true;
    el.dataset.traveeId = t.id;
    el.innerHTML = `
      <span class="order-handle">⋮⋮</span>
      <div class="item-main">
        <div class="nom">${escapeHtml(t.nom)}</div>
        ${t.description ? `<div class="desc">${escapeHtml(t.description)}</div>` : ''}
      </div>
      <div class="item-actions">
        <button title="Renommer" onclick="renameTravee('${t.id}')">✏️</button>
        <button class="danger" title="Supprimer" onclick="deleteTravee('${t.id}')">🗑</button>
      </div>
    `;
    sortable.appendChild(el);
  });
  initTraveesDragDrop(sortable);
}

function initTraveesDragDrop(sortable) {
  const items = [...sortable.querySelectorAll('.list-item[data-travee-id]')];
  let dragId = null;
  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      dragId = item.dataset.traveeId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      items.forEach(el => el.classList.remove('dragging', 'drag-over'));
      dragId = null;
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      items.forEach(el => el.classList.remove('drag-over'));
      if (item.dataset.traveeId !== dragId) item.classList.add('drag-over');
    });
    item.addEventListener('drop', async e => {
      e.preventDefault();
      const destId = item.dataset.traveeId;
      if (!dragId || dragId === destId) return;
      const srcIdx  = travees.findIndex(t => t.id === dragId);
      const destIdx = travees.findIndex(t => t.id === destId);
      if (srcIdx < 0 || destIdx < 0) return;
      const [moved] = travees.splice(srcIdx, 1);
      travees.splice(destIdx, 0, moved);
      dragId = null;
      await reorderTravees();
    });
  });
}

async function reorderTravees() {
  try {
    await Promise.all(travees.map((t, i) => WB3DB.updateRow('travees', t.id, { ordre: (i + 1) * 10 })));
    renderTraveesList();
    toast('Ordre mis à jour', 'success');
  } catch(e) {
    toast('Erreur réordonnancement : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    await loadTravees();
    renderTraveesList();
  }
}

async function addTravee() {
  const input = document.getElementById('new-travee-nom');
  const nom = input.value.trim();
  if (!nom) return;
  try {
    const maxOrdre = travees.length ? Math.max(...travees.map(t => t.ordre)) : 0;
    await WB3DB.insertRow('travees', { nom, ordre: maxOrdre + 1 });
    input.value = '';
    toast('Travée créée', 'success');
  } catch(e) {
    if (e.code === '23505' || /duplicate/i.test(e.message)) {
      toast('Une travée avec ce nom existe déjà', 'error');
    } else {
      toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    }
  }
}

async function renameTravee(id) {
  const t = travees.find(x => x.id === id);
  if (!t) return;
  const newNom = await WB3UI.prompt('Nouveau nom de la travée :', { title:'Renommer la travée', value:t.nom, okText:'Renommer' });
  if (!newNom || newNom.trim() === t.nom) return;
  try {
    await WB3DB.updateRow('travees', id, { nom: newNom.trim() });
    toast('Travée renommée', 'success');
  } catch(e) {
    if (e.code === '23505') toast('Ce nom est déjà utilisé', 'error');
    else toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}

async function deleteTravee(id) {
  const t = travees.find(x => x.id === id);
  if (!t) return;
  if (!(await WB3UI.confirm(`Supprimer la travée "${t.nom}" ?\n\nLes contenants qui lui sont rattachés ne seront pas supprimés (juste désaffectés).`, { title:'Supprimer la travée', okText:'Supprimer', danger:true }))) return;
  try {
    await WB3DB.deleteRow('travees', id);
    toast('Travée supprimée', 'success');
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

async function moveTravee(id, direction) {
  const i = travees.findIndex(t => t.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= travees.length) return;
  const a = travees[i];
  const b = travees[j];
  try {
    await WB3DB.updateRow('travees', a.id, { ordre: b.ordre });
    await WB3DB.updateRow('travees', b.id, { ordre: a.ordre });
    [a.ordre, b.ordre] = [b.ordre, a.ordre];
    sortTravees();
    renderTraveesList();
  } catch(e) { toast('Erreur réordonnancement : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}
