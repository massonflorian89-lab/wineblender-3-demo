/* params-utilisateurs.js — Paramètres : section Utilisateurs (gestion membres du tenant) */
'use strict';

const ROLE_LABELS = { admin: '🛡 Administrateur', maitre_chais: '🍇 Maître de chais', oenologue: '⚗️ Œnologue', caviste: '🧰 Caviste' };

function _roleOptions(sel) {
  return Object.entries(ROLE_LABELS).map(([k, l]) =>
    `<option value="${k}"${k === sel ? ' selected' : ''}>${l}</option>`).join('');
}

async function renderUsersSection() {
  const root = document.getElementById('settings-content');
  if (!WB3DB.isAdmin || !WB3DB.isAdmin()) {
    root.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><div class="title">Réservé aux administrateurs</div></div>`;
    return;
  }
  root.innerHTML = `
    <div class="settings-section-head"><h2>👤 Utilisateurs du compte</h2>
      <p class="muted">Crée des comptes et attribue les rôles — sans passer par le SQL.</p></div>

    <div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4)">
      <h3 style="margin:0 0 var(--space-2)">➕ Ajouter / créer un utilisateur</h3>
      <div class="field-row">
        <div class="field"><label class="field-label">Email *</label>
          <input class="input" type="email" id="u-email" placeholder="prenom@cave.fr" autocomplete="off"></div>
        <div class="field"><label class="field-label">Mot de passe <span class="muted">(nouveau compte)</span></label>
          <input class="input" type="text" id="u-pass" placeholder="≥ 6 caractères (laisser vide = compte existant)" autocomplete="new-password"></div>
        <div class="field"><label class="field-label">Rôle</label>
          <select class="select" id="u-role">${_roleOptions('caviste')}</select></div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:var(--space-2)">
        <button class="btn btn--primary" data-help="Crée le compte d'un membre de l'équipe et choisis son rôle (admin, caviste, lecture). C'est ici que tu donnes l'accès au logiciel." onclick="adminAddUser()">Créer / assigner</button>
      </div>
      <p class="field-help" id="u-hint">Avec mot de passe → crée le compte de connexion. Sans → assigne le rôle à un compte déjà inscrit.</p>
    </div>

    <div class="card" style="padding:var(--space-4)">
      <h3 style="margin:0 0 var(--space-2)">Membres</h3>
      <div id="u-list"><div class="loading-state"><div class="spinner"></div>Chargement…</div></div>
    </div>`;
  await _loadMembers();
}

async function _loadMembers() {
  const box = document.getElementById('u-list');
  if (!box) return;
  try {
    const rows = await WB3DB.adminListMembers();
    if (!rows.length) { box.innerHTML = `<p class="muted">Aucun membre.</p>`; return; }
    box.innerHTML = `<table class="data-table"><thead><tr><th>Email</th><th>Rôle</th><th></th></tr></thead><tbody>${
      rows.map(m => `<tr>
        <td>${escapeHtml(m.email || '—')}${m.is_self ? ' <span class="muted">(vous)</span>' : ''}</td>
        <td><select class="select select--sm" onchange="adminChangeRole('${m.user_id}', this.value)" ${m.is_self ? 'disabled title="Vous ne pouvez pas changer votre propre rôle"' : ''}>${_roleOptions(m.role)}</select></td>
        <td style="text-align:right">${m.is_self ? '' : `<button class="btn btn--ghost btn--sm" onclick="adminRemoveUser('${m.user_id}','${escapeHtml(m.email||'')}')">Retirer</button>`}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    box.innerHTML = `<p style="color:var(--color-danger)">${escapeHtml(WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e))}</p>`;
  }
}

async function adminAddUser() {
  const email = document.getElementById('u-email').value.trim();
  const pass  = document.getElementById('u-pass').value;
  const role  = document.getElementById('u-role').value;
  if (!email) { toast('Email requis', 'error'); return; }
  try {
    const r = await WB3DB.adminCreateUser({ email, password: pass || null, role });
    if (r && r.assignedOnly) toast('Rôle assigné (compte existant). Pour créer de nouveaux comptes, déploie la fonction admin-create-user.', 'success');
    else toast('Utilisateur créé / mis à jour', 'success');
    document.getElementById('u-email').value = '';
    document.getElementById('u-pass').value = '';
    await _loadMembers();
  } catch (e) { toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)), 'error'); }
}

async function adminChangeRole(userId, role) {
  try {
    const rows = await WB3DB.adminListMembers();
    const m = rows.find(x => x.user_id === userId);
    if (!m) { toast('Membre introuvable', 'error'); return; }
    await WB3DB.adminSetMembership(null, m.email, role);
    toast('Rôle mis à jour', 'success');
    await _loadMembers();
  } catch (e) { toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)), 'error'); await _loadMembers(); }
}

async function adminRemoveUser(userId, email) {
  const ok = await WB3UI.confirm(`Retirer ${email || 'cet utilisateur'} du compte ? Son accès sera révoqué (le compte de connexion subsiste).`,
    { title: 'Retirer un membre', okText: 'Retirer', danger: true });
  if (!ok) return;
  try {
    await WB3DB.adminRemoveMembership(null, userId);
    toast('Membre retiré', 'success');
    await _loadMembers();
  } catch (e) { toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)), 'error'); }
}
