// ============================================================
// wb3/db.js — Couche d'accès Supabase pour WineBlender 3
// ------------------------------------------------------------
// Toute interaction avec la base passe par ce module.
// Aucun appel à `supabase` ne doit se faire ailleurs dans le code.
// (sécurité + portabilité : si on change de backend un jour,
//  il n'y a qu'un fichier à toucher).
// ============================================================

(function(global) {
  'use strict';

  if (!global.WB3_CONFIG) {
    throw new Error('[WB3] config.js doit être chargé avant db.js');
  }
  if (!global.supabase || !global.supabase.createClient) {
    throw new Error('[WB3] Le SDK @supabase/supabase-js doit être chargé avant db.js');
  }

  // Client Supabase initialisé une fois pour toute l'app
  const client = global.supabase.createClient(
    global.WB3_CONFIG.url,
    global.WB3_CONFIG.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  // Tables avec soft-delete (colonne archived_at, migration 043).
  // listTable / queryAnalyses filtrent archived_at IS NULL par défaut.
  const SOFT_DELETE_TABLES = new Set([
    'apports', 'contenants', 'produits_catalogue', 'produits_lots', 'analyses',
  ]);

  // Compteur pour garantir des noms de canaux Realtime uniques
  // (évite la collision si 2 abonnements sur la même table/tenant).
  let _realtimeSeq = 0;

  // État runtime — partagé entre tous les modules WB3
  const state = {
    user: null,       // Utilisateur Supabase courant (ou null si déconnecté)
    tenants: [],      // Tenants auxquels l'user appartient
    currentTenantId: null,  // Tenant actif (cache localStorage)
    membership: null, // Le membership pour le tenant courant
  };

  // ----------------------------------------------------------
  // Helpers internes
  // ----------------------------------------------------------

  function requireTenant() {
    if (!state.currentTenantId) {
      throw new Error('[WB3] Aucun tenant actif — utilise WB3DB.setCurrentTenant() après login.');
    }
    return state.currentTenantId;
  }

  function ensureLoggedIn() {
    if (!state.user) throw new Error('[WB3] Utilisateur non authentifié.');
    return state.user;
  }

  // ----------------------------------------------------------
  // Contrôle de capacités backend (socle 2 — migration 053)
  // ----------------------------------------------------------
  // Empêche le frontend de tourner en mode dégradé silencieux quand une
  // migration critique manque. Une capacité CRITIQUE absente bloque
  // (bannière au chargement + erreur explicite à l'action). Une capacité
  // RECOMMANDÉE absente n'empêche pas l'usage mais signale un dégradé.
  // window.WB3_DEV_MODE = true autorise localement les fallbacks non
  // atomiques (chantier) ; en prod, jamais.

  // cap → libellé migration (pour le message utilisateur).
  const CRITICAL_CAPABILITIES = {
    wb3_save_operation_graph:           'migration 022/040 (opérations)',
    wb3_corrective_stock_restore:       'migration 050 (restauration stock corrective)',
    wb3_convert_multilot_to_assemblage: 'migration 051 (conversion multi-lots → assemblage)',
    tenant_guard:                       'migration 052 (sécurité multi-tenant des RPC)',
    produit_stock_guard:                'migration 040 (garde stock produit)',
    operation_lock:                     'migration 037/038 (verrou opérations réalisées)',
    wb3_apply_apport:                   'migration 084 (apports atomiques + journal)',
    wb3_save_lot_graph_motif:           'migration 085 (édition de lot journalisée)',
    wb3_scission_lot:                   'migration 086 (scission de lot journalisée)',
  };
  const RECOMMENDED_CAPABILITIES = {
    wb3_apply_ajustement: 'migration 015 (ajustements de volume)',
    wb3_etat_cave_at:     'migration 087 (état de cave à une date)',
    v_cuverie_etat:       'migration 048 (états cuverie enrichis)',
    analyses_temperature: 'migration 049 (température des analyses)',

    // ── Modules VENDANGE (060→068) — recommandés au niveau global
    //    (non bloquants pour l'app entière) ; le blocage est PAR MODULE
    //    via MODULE_CAPABILITIES + ensureModule(). ──────────────────
    baremage:                  'migration 060 (barémage / épalement)',
    wb3_volume_from_mesure:    'migration 060 (calcul volume épalement)',
    apports_rendement:         'migration 062 (rendement vendange)',
    apport_rendement_cepage:   'migration 062 (rendement par cépage)',
    v_rendement_jour_cepage:   'migration 062 (dashboard rendement)',
    essai:                     'migration 063 (simulateur assemblage)',
    essai_dossier:             'migration 063 (dossiers d\'essais)',
    tache:                     'migration 064 (planning / tâches)',
    fiche_travail:             'migration 064 (fiches de travail)',
    tache_detail:              'migration 065 (détail structuré des tâches)',
    fiche_numero:              'migration 065 (numérotation des fiches)',
    tache_creneau:             'migration 070 (créneau d\'équipe 3×8)',
    inventaire:                'migration 066 (inventaire)',
    inventaire_ligne:          'migration 066 (lignes d\'inventaire)',
    wb3_set_inventaire_statut: 'migration 067 (verrou inventaire clos)',
    fiche_travail_compteur:    'migration 068 (N° de fiche atomique)',
  };

  // Capacités requises PAR MODULE. Si l'une manque, le module s'affiche
  // « indisponible » sur sa page (via ensureModule), sans bloquer le reste
  // de l'app. `caps` = capacités SQL minimales pour que le module fonctionne.
  const MODULE_CAPABILITIES = {
    epalement:         { label: 'Épalement (barémage)',        migration: '060/061', caps: ['baremage', 'wb3_volume_from_mesure'] },
    apports_rendement: { label: 'Rendement vendange',          migration: '062',     caps: ['apports_rendement', 'v_rendement_jour_cepage'] },
    assemblage:        { label: 'Simulateur d\'assemblage',    migration: '063',     caps: ['essai', 'essai_dossier'] },
    planning:          { label: 'Planning / fiches de travail',migration: '064',     caps: ['tache', 'fiche_travail'] },  // tache_creneau (070) = OPTIONNEL : dégradé dans la page, ne bloque pas le module
    inventaire:        { label: 'Inventaire',                  migration: '066',     caps: ['inventaire', 'inventaire_ligne'] },
  };

  let _capCache = null;

  // Renvoie { ok, installed, version, capabilities, missingCritical[], missingRecommended[] }.
  //  - installed=false : la fonction 053 elle-même est absente → on ne peut
  //    pas introspecter. On NE bloque PAS (les gardes par action restent le
  //    filet de sécurité), on signale juste « vérification indisponible ».
  //  - ok=false avec installed=true et missingCritical non vide → blocage.
  async function checkBackendCapabilities({ force = false } = {}) {
    if (_capCache && !force) return _capCache;
    let capabilities = {}, version = null, installed = true;
    try {
      const { data, error } = await client.rpc('wb3_schema_capabilities');
      if (error) {
        if (error.code === 'PGRST202') installed = false;
        else throw error;
      } else {
        capabilities = (data && data.capabilities) || {};
        version      = (data && data.schema_version) || null;
      }
    } catch (e) {
      console.warn('[WB3] checkBackendCapabilities échec:', e);
      installed = false;
    }
    const missingCritical = installed
      ? Object.keys(CRITICAL_CAPABILITIES).filter(k => capabilities[k] === false)
      : [];
    const missingRecommended = installed
      ? Object.keys(RECOMMENDED_CAPABILITIES).filter(k => capabilities[k] === false)
      : [];
    _capCache = {
      ok: installed && missingCritical.length === 0,
      installed, version, capabilities,
      missingCritical, missingRecommended,
      labels: { ...CRITICAL_CAPABILITIES, ...RECOMMENDED_CAPABILITIES },
    };
    return _capCache;
  }

  // Garde par action : lève une erreur claire si une capacité critique
  // manque ET qu'on n'est pas en WB3_DEV_MODE. Utilisée avant les
  // opérations qui dépendent d'une RPC précise (anti-fallback dangereux).
  async function requireCapability(cap) {
    if (global.WB3_DEV_MODE) return true;
    const c = await checkBackendCapabilities();
    if (!c.installed) return true; // introspection indisponible → on laisse passer (filet par action)
    if (c.capabilities[cap] === false) {
      const label = (CRITICAL_CAPABILITIES[cap] || RECOMMENDED_CAPABILITIES[cap] || cap);
      throw new Error('[WB3] Backend incomplet : ' + label + ' requise. Action bloquée pour garantir la cohérence des données. Contactez l\'administrateur.');
    }
    return true;
  }

  // Disponibilité d'un MODULE vendange (planning, assemblage, inventaire,
  // épalement, rendement). Renvoie { available, unknown, missing[], label,
  // migration }. unknown=true si l'introspection 053/069 est indisponible
  // (db.js ne bloque alors pas — le filet par action prend le relais).
  // Flags « module activé pour cette cave » (mig 074) — caché par tenant.
  // Ligne absente ⇒ activé par défaut. { module_key: bool }.
  let _tenantModulesCache = { tid: null, map: null };
  async function getTenantModulesMap() {
    const tid = getCurrentTenantId();
    if (!tid) return {};
    if (_tenantModulesCache.tid === tid && _tenantModulesCache.map) return _tenantModulesCache.map;
    const map = {};
    try {
      const { data, error } = await client.rpc('wb3_tenant_modules', { p_tenant_id: tid });
      if (!error && Array.isArray(data)) data.forEach(r => { map[r.module_key] = r.enabled; });
    } catch (_) { /* RPC absente (mig 074 non appliquée) → tout activé */ }
    _tenantModulesCache = { tid, map };
    return map;
  }
  function _clearTenantModulesCache() { _tenantModulesCache = { tid: null, map: null }; }

  async function checkModule(moduleKey) {
    const m = MODULE_CAPABILITIES[moduleKey];
    if (!m) return { available: true, unknown: false, missing: [] };
    if (global.WB3_DEV_MODE) return { available: true, unknown: false, missing: [], label: m.label, migration: m.migration };
    // (1) Désactivé pour cette cave par le créateur de l'app (prioritaire).
    const mods = await getTenantModulesMap();
    if (mods[moduleKey] === false) {
      return { available: false, disabled: true, unknown: false, missing: [], label: m.label, migration: m.migration };
    }
    // (2) Migration présente ?
    const c = await checkBackendCapabilities();
    if (!c.installed) return { available: true, unknown: true, missing: [], label: m.label, migration: m.migration };
    const missing = m.caps.filter(cap => c.capabilities[cap] === false);
    return { available: missing.length === 0, unknown: false, missing, label: m.label, migration: m.migration };
  }

  // Garde de page : si le module est indisponible, injecte un état clair
  // « module indisponible » dans `container` et renvoie false. Sinon true.
  // HTML auto-porté (styles inline + variables thème) → pas de dépendance CSS.
  async function ensureModule(moduleKey, container) {
    const r = await checkModule(moduleKey);
    if (r.available || r.unknown) return true;
    const el = (typeof container === 'string') ? document.getElementById(container) : container;
    if (el) {
      // Deux cas : (a) module DÉSACTIVÉ pour la cave ; (b) migration absente.
      const body = r.disabled
        ? 'Ce module a été <b>désactivé pour cette cave</b> par le créateur de '
          + 'l\'application. Contactez-le pour l\'activer.'
        : 'La <b>migration ' + (r.migration || '?') + '</b> n\'est pas appliquée sur la base de données.<br>'
          + 'Demandez à l\'administrateur d\'exécuter les scripts SQL manquants, puis rechargez la page.';
      const foot = r.disabled
        ? ''
        : '<div style="margin-top:12px;font-size:11.5px;color:var(--color-ink-tertiary,#999)">'
          + 'Capacité(s) manquante(s) : ' + r.missing.join(', ') + '</div>';
      el.innerHTML =
        '<div style="max-width:540px;margin:48px auto;text-align:center;padding:30px 28px;' +
        'border:1px solid var(--color-border,#ddd);border-radius:16px;background:var(--color-bg-elevated,#fff);' +
        'box-shadow:0 8px 32px rgba(0,0,0,.06)">' +
          '<div style="font-size:42px;line-height:1;margin-bottom:10px">' + (r.disabled ? '🚫' : '🧩') + '</div>' +
          '<div style="font-weight:700;font-size:17px;color:var(--color-ink,#1a1a1a);margin-bottom:8px">' +
            'Module « ' + (r.label || moduleKey) + ' » ' + (r.disabled ? 'désactivé' : 'indisponible') + '</div>' +
          '<div style="color:var(--color-ink-secondary,#555);font-size:13.5px;line-height:1.55">' + body + '</div>' +
          foot +
        '</div>';
    }
    return false;
  }

  // ----------------------------------------------------------
  // errMsg(e) — normalise une erreur Supabase/PostgREST en phrase lisible.
  //   • PRÉSERVE les messages métier RAISE (« Stock insuffisant… ») ;
  //   • traduit les SQLSTATE cryptiques (RLS 42501, unicité 23505, etc.) ;
  //   • robuste aux objets bruts (jamais « [object Object] »).
  // À utiliser dans les catch d'actions utilisateur :
  //   toast('Erreur : ' + WB3DB.errMsg(e), 'error')
  // ----------------------------------------------------------
  const _ERR_FRIENDLY = {
    '23505': 'Doublon : cette valeur existe déjà.',
    '23503': 'Action impossible : cet élément est référencé ailleurs.',
    '23514': 'Valeur non autorisée (contrainte de validation).',
    '23502': 'Un champ obligatoire est manquant.',
    '42501': 'Action non autorisée (droits insuffisants).',
    'PGRST301': 'Session expirée — reconnecte-toi.',
  };
  function errMsg(e) {
    if (!e) return 'Erreur inconnue.';
    if (typeof e === 'string') return e;
    const code = e.code || e.errorCode || '';
    const raw  = (e.message || e.msg || e.error_description || e.details || '').toString().trim();
    // RLS : message Postgres systématiquement cryptique → phrase claire.
    if (code === '42501' || /row-level security|violates row-level/i.test(raw)) return _ERR_FRIENDLY['42501'];
    // Contraintes : si le texte brut est le jargon Postgres, on traduit ;
    // sinon (RAISE métier lisible) on garde le message tel quel.
    if (code && _ERR_FRIENDLY[code] &&
        (!raw || /duplicate key|violates|null value|constraint|invalid input/i.test(raw))) {
      return _ERR_FRIENDLY[code];
    }
    if (raw) return raw;                 // message métier / déjà lisible
    if (code) return 'Erreur (' + code + ').';
    return 'Erreur inattendue.';
  }

  // ----------------------------------------------------------
  // Gestion des comptes (admin du tenant) — évite le SQL manuel.
  //   Rôles : admin | oenologue | maitre_chais | caviste (mig 073).
  // ----------------------------------------------------------
  async function adminListMembers(tenantId) {
    const tid = tenantId || getCurrentTenantId();
    const { data, error } = await client.rpc('wb3_admin_list_members', { p_tenant_id: tid });
    if (error) throw error;
    return data || [];
  }
  async function adminSetMembership(tenantId, email, role) {
    const tid = tenantId || getCurrentTenantId();
    const { data, error } = await client.rpc('wb3_admin_set_membership',
      { p_tenant_id: tid, p_email: email, p_role: role });
    if (error) throw error;
    return data; // user_id
  }
  async function adminRemoveMembership(tenantId, userId) {
    const tid = tenantId || getCurrentTenantId();
    const { error } = await client.rpc('wb3_admin_remove_membership',
      { p_tenant_id: tid, p_user_id: userId });
    if (error) throw error;
  }
  // Crée un VRAI compte de connexion + rôle via l'Edge Function (service role
  // côté serveur). Si la fonction n'est pas déployée, repli sur l'assignation
  // d'un compte déjà existant (adminSetMembership) — message clair sinon.
  async function adminCreateUser({ tenantId, email, password, role }) {
    const tid = tenantId || getCurrentTenantId();
    try {
      const { data, error } = await client.functions.invoke('admin-create-user',
        { body: { tenant_id: tid, email, password, role } });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      return data; // { ok, user_id, reused }
    } catch (_) {
      // Edge Function indisponible → tente une simple assignation de rôle.
      const uid = await adminSetMembership(tid, email, role);
      return { ok: true, user_id: uid, assignedOnly: true };
    }
  }

  // ----------------------------------------------------------
  // Plateforme (créateur de l'app) — modules par cave (mig 074).
  // ----------------------------------------------------------
  let _platformAdminCache = null;
  async function isPlatformAdmin() {
    if (_platformAdminCache !== null) return _platformAdminCache;
    try {
      const { data, error } = await client.rpc('is_platform_admin');
      _platformAdminCache = !error && data === true;
    } catch (_) { _platformAdminCache = false; }
    return _platformAdminCache;
  }
  async function platformListTenants() {
    const { data, error } = await client.rpc('wb3_platform_list_tenants');
    if (error) throw error;
    return data || [];
  }
  async function platformListTenantModules(tenantId) {
    const { data, error } = await client.rpc('wb3_platform_list_tenant_modules', { p_tenant_id: tenantId });
    if (error) throw error;
    return data || [];
  }
  async function platformSetTenantModule(tenantId, moduleKey, enabled) {
    const { error } = await client.rpc('wb3_platform_set_tenant_module',
      { p_tenant_id: tenantId, p_module_key: moduleKey, p_enabled: enabled });
    if (error) throw error;
    _clearTenantModulesCache(); // au cas où on modifie la cave courante
  }

  // ----------------------------------------------------------
  // API publique : Auth (déléguée par auth.js, méthodes ici juste pour les helpers utilitaires)
  // ----------------------------------------------------------

  // Helper synchrone : pose state.user immédiatement (sans attendre une requête)
  function _setUserSync(session) {
    state.user = session?.user || null;
    console.debug('[WB3] _setUserSync: user =', state.user?.email || 'null');
  }

  // Mutex : si plusieurs appels arrivent en parallèle, ils partagent la même promesse.
  // MAIS : si le précédent appel a échoué (ex: timeout SDK Supabase), on retente automatiquement
  // au prochain appel — utile car les events SIGNED_IN puis INITIAL_SESSION arrivent en cascade
  // et le 1er pend sur memberships, le 2e doit pouvoir relancer.
  let _refreshInFlight   = null;
  let _lastRefreshFailed = false;

  async function _refreshUserContext(sessionFromEvent) {
    if (_refreshInFlight) {
      console.debug('[WB3] _refreshUserContext: déjà en cours, on attend');
      await _refreshInFlight;
      // Si le précédent a échoué ET qu'on a une session → retry
      if (_lastRefreshFailed && state.user) {
        console.debug('[WB3] _refreshUserContext: précédent a échoué, on retente');
        _refreshInFlight = _doRefreshUserContext(sessionFromEvent).finally(() => { _refreshInFlight = null; });
        return _refreshInFlight;
      }
      return;
    }
    // Court-circuit : appelé sans session (depuis restoreSession) et contexte déjà prêt
    if (sessionFromEvent === undefined && !_lastRefreshFailed && state.currentTenantId) {
      return;
    }
    _refreshInFlight = _doRefreshUserContext(sessionFromEvent).finally(() => { _refreshInFlight = null; });
    return _refreshInFlight;
  }

  async function _doRefreshUserContext(sessionFromEvent) {
    console.debug('[WB3] _refreshUserContext: début');
    let user = null;
    if (sessionFromEvent !== undefined) {
      // Session fournie par onAuthStateChange — pas d'appel réseau, fiable
      user = sessionFromEvent?.user || null;
      console.debug('[WB3] _refreshUserContext: session via event, user =', user?.email || 'null');
    } else {
      // Fallback : appel getSession (rare, peut pendre)
      try {
        console.debug('[WB3] _refreshUserContext: appel getSession() (fallback)');
        const result = await Promise.race([
          client.auth.getSession(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('getSession timeout 6s')), 6000)),
        ]);
        user = result?.data?.session?.user || null;
        console.debug('[WB3] _refreshUserContext: getSession OK, user =', user?.email || 'null');
      } catch(e) {
        console.warn('[WB3] getSession failed (fallback):', e);
        user = state.user; // preserve existing user on network failure
      }
    }
    state.user = user;
    if (!user) {
      state.tenants = [];
      state.currentTenantId = null;
      state.membership = null;
      return;
    }
    // Charger memberships + tenants. ÉCHEC RAPIDE volontaire : 1 seule
    // tentative, timeout court (6s). La requête memberships peut PENDRE
    // (cause racine = RLS côté base, correctif en cours) → mieux vaut
    // dégrader en quelques secondes que bloquer l'UI 30s+. Filet : retry
    // au prochain event auth (_lastRefreshFailed). On NE reset PAS
    // state.tenants → on garde l'état précédent éventuel.
    _lastRefreshFailed = false;
    const _ATT_TIMEOUT = 6000;
    try {
      console.debug('[WB3] Chargement memberships pour user_id =', user.id);
      const memResult = await Promise.race([
        client.from('memberships').select('role, tenant_id').eq('user_id', user.id),
        new Promise((_, rej) => setTimeout(() => rej(new Error('memberships timeout 6s')), _ATT_TIMEOUT)),
      ]);
      if (memResult.error) throw memResult.error;
      const memberships = memResult.data;
      console.debug('[WB3] memberships chargés:', memberships);

      if (!memberships?.length) {
        console.warn('[WB3] Aucun membership pour cet utilisateur');
        state.tenants = [];
        state.currentTenantId = null;
        state.membership = null;
        return;
      }

      const tenantIds = memberships.map(m => m.tenant_id);
      console.debug('[WB3] Chargement tenants pour ids =', tenantIds);
      const tResult = await Promise.race([
        client.from('tenants').select('id, nom, slug').in('id', tenantIds),
        new Promise((_, rej) => setTimeout(() => rej(new Error('tenants timeout 6s')), _ATT_TIMEOUT)),
      ]);
      if (tResult.error) throw tResult.error;
      const tenants = tResult.data;
      console.debug('[WB3] tenants chargés:', tenants);

      // Affecter SEULEMENT après succès complet
      state.tenants = memberships.map(m => {
        const t = tenants.find(x => x.id === m.tenant_id);
        return {
          id:   m.tenant_id,
          nom:  t?.nom  || '(inconnu)',
          slug: t?.slug || '?',
          role: m.role,
        };
      });
      console.debug('[WB3] state.tenants final:', state.tenants);
    } catch(e) {
      _lastRefreshFailed = true;
      console.warn('[WB3] Chargement memberships/tenants échoué (échec rapide — retry au prochain event auth):', e.message);
      // NE PAS reset state.tenants : on garde l'état précédent éventuel
      return;
    }

    // Restaure le tenant courant depuis localStorage si valide,
    // sinon prend le premier tenant disponible
    const savedTenantId = localStorage.getItem('wb3_current_tenant_id');
    const valid = state.tenants.find(t => t.id === savedTenantId);
    state.currentTenantId = valid ? valid.id : (state.tenants[0]?.id || null);
    state.membership = state.tenants.find(t => t.id === state.currentTenantId) || null;
  }

  function getCurrentUser()    { return state.user; }
  function getTenants()        { return state.tenants.slice(); }
  function getCurrentTenant()  { return state.membership; }
  function getCurrentTenantId(){ return state.currentTenantId; }
  function getCurrentRole()    { return state.membership?.role || null; }
  function isAdmin()           { return state.membership?.role === 'admin'; }
  function isPrivileged()      { return ['admin', 'oenologue', 'maitre_chais'].includes(state.membership?.role); }
  function isAdmin()           { return state.membership?.role === 'admin'; }

  // Autorisations fines par rôle (cf. PERMISSIONS.md). Un caviste est
  // opérationnel ; ces actions « décision » sont réservées aux privilégiés.
  // Centralisé ici pour faire évoluer la matrice en un seul point.
  const ROLE_PERMISSIONS = {
    'planning.edit':    'privileged',  // créer/éditer des tâches (caviste = coche « fait »)
    'assemblage.edit':  'privileged',  // créer/modifier des essais d'assemblage
    'qualite.edit':     'privileged',  // modifier les seuils analytiques
    'produits.manage':  'privileged',  // gérer le catalogue produits (≠ consommer)
    'corbeille.access': 'privileged',  // suppressions définitives
  };
  function can(perm) {
    const need = ROLE_PERMISSIONS[perm];
    if (!need) return true;                  // perm inconnue → autorisé (pas de régression)
    if (need === 'admin')      return isAdmin();
    if (need === 'privileged') return isPrivileged();
    return true;
  }

  function setCurrentTenant(tenantId) {
    const t = state.tenants.find(x => x.id === tenantId);
    if (!t) throw new Error('[WB3] Tenant non accessible : ' + tenantId);
    state.currentTenantId = tenantId;
    state.membership = t;
    localStorage.setItem('wb3_current_tenant_id', tenantId);
    _clearTenantModulesCache(); // flags modules dépendent du tenant
  }

  // ----------------------------------------------------------
  // API publique : helpers métier (factorisation du tenant_id)
  // ----------------------------------------------------------

  // Wrapper générique pour les SELECT — ajoute automatiquement le tenant_id
  async function listTable(tableName, options = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client.from(tableName).select(options.select || '*').eq('tenant_id', tenantId);
    // Soft-delete : masque les lignes archivées sauf includeArchived:true
    if (SOFT_DELETE_TABLES.has(tableName) && !options.includeArchived) {
      q = q.is('archived_at', null);
    }
    if (options.filter) {
      for (const [col, val] of Object.entries(options.filter)) {
        q = q.eq(col, val);
      }
    }
    // Plage de période (filtre liste) — scope serveur. options.date_col = colonne.
    if (options.date_col && options.date_from) q = q.gte(options.date_col, options.date_from);
    if (options.date_col && options.date_to)   q = q.lte(options.date_col, options.date_to);
    if (options.order) q = q.order(options.order, { ascending: options.ascending ?? true });
    if (options.limit && options.offset != null) q = q.range(options.offset, options.offset + options.limit - 1);
    else if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  // Wrapper générique pour les INSERT — pose automatiquement le tenant_id
  async function insertRow(tableName, payload) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from(tableName)
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Wrapper générique pour les UPDATE
  // Filtre explicite sur tenant_id : défense en profondeur (RLS reste autorité finale)
  async function updateRow(tableName, id, patch) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from(tableName)
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Wrapper générique pour les DELETE
  // Filtre explicite sur tenant_id : défense en profondeur (RLS reste autorité finale)
  async function deleteRow(tableName, id) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  }

  // ----------------------------------------------------------
  // API publique : Realtime
  // ----------------------------------------------------------

  // Abonnement Realtime standardisé à une table (filtré par tenant).
  //
  //   subscribeTable('lots', payload => { ... })
  //   subscribeTable('lots', cb, { event: 'UPDATE' })   // INSERT|UPDATE|DELETE|*
  //
  // Garanties :
  //   • nom de canal unique → pas de collision si plusieurs abonnements
  //   • callback protégé par try/catch (une erreur UI ne tue pas le canal)
  //   • erreurs de canal (CHANNEL_ERROR / TIMED_OUT) loguées
  //   • nettoyage via client.removeChannel (évite les fuites de canaux)
  //
  // Retour : fonction de désabonnement (idempotente).
  function subscribeTable(tableName, callback, opts = {}) {
    const tenantId = requireTenant();
    const evt = opts.event || '*';
    const chanName = `wb3-${tableName}-${tenantId}-${++_realtimeSeq}`;

    const channel = client
      .channel(chanName)
      .on('postgres_changes',
        { event: evt, schema: 'public', table: tableName, filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          try { callback(payload); }
          catch (e) { console.error(`[WB3 realtime] callback ${tableName}:`, e); }
        }
      )
      .subscribe((status, err) => {
        // CLOSED est l'état normal d'un désabonnement propre (navigation /
        // removeChannel) → on n'alerte que sur les vraies erreurs de canal.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[WB3 realtime] ${tableName} → ${status}`, err || '');
        }
      });

    let _done = false;
    return function unsubscribe() {
      if (_done) return;
      _done = true;
      try { client.removeChannel(channel); }
      catch (_) { try { channel.unsubscribe(); } catch (__) {} }
    };
  }

  // Abonnement groupé : plusieurs tables, un seul désabonnement.
  //
  //   const off = subscribeMany(
  //     ['apports','analyses','lot_mouvements','lot_filiation','lot_contenants'],
  //     (table, payload) => reloadSomething(table)
  //   );
  //   // plus tard : off();
  //
  // Le callback reçoit (tableName, payload).
  function subscribeMany(tableNames, callback, opts = {}) {
    const unsubs = (tableNames || []).map(t =>
      subscribeTable(t, (payload) => callback(t, payload), opts)
    );
    return function unsubscribeAll() { unsubs.forEach(u => u()); };
  }

  // ----------------------------------------------------------
  // API publique : préférences utilisateur (par module)
  // ----------------------------------------------------------

  // Lit les préférences utilisateur pour un module donné.
  // Retourne {} si aucune préférence n'est encore définie.
  async function getUserPref(module) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const userId = state.user.id;
    try {
      const { data, error } = await client
        .from('user_preferences')
        .select('data')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('module', module)
        .maybeSingle();
      if (error) throw error;
      return data?.data || {};
    } catch(e) {
      console.warn('[WB3] getUserPref failed:', e);
      return {};
    }
  }

  // Met à jour (upsert) les préférences utilisateur pour un module.
  // Le contenu est un objet JSON libre.
  async function setUserPref(module, data) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const userId = state.user.id;
    const { error } = await client
      .from('user_preferences')
      .upsert({
        user_id:    userId,
        tenant_id:  tenantId,
        module,
        data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,tenant_id,module' });
    if (error) throw error;
  }

  // ----------------------------------------------------------
  // API publique : numérotation des lots (côté client pour MVP,
  // à migrer côté serveur ou en trigger Postgres en phase 6)
  // ----------------------------------------------------------

  // Calcule le numéro racine d'un lot d'apport :
  // L-YYYY-JJJ-CÉPAGE-COULEUR-SEQ
  async function nextLotNumeroApport({ date, cepage, couleur }) {
    const tenantId = requireTenant();
    const d = new Date(date);
    const year = d.getFullYear();
    // Jour julien (1 à 366)
    const start = new Date(d.getFullYear(), 0, 0);
    const dayOfYear = String(Math.floor((d - start) / 86400000)).padStart(3, '0');
    const cepageCode = (cepage || '').slice(0, 3).toUpperCase();
    const prefix = `L-${year}-${dayOfYear}-${cepageCode}-${couleur}-`;

    // Cherche la dernière séquence du jour pour ce cépage/couleur
    const { data, error } = await client
      .from('lots')
      .select('numero_lot')
      .eq('tenant_id', tenantId)
      .like('numero_lot', prefix + '%')
      .order('numero_lot', { ascending: false })
      .limit(1);
    if (error) throw error;

    let seq = 1;
    if (data?.length) {
      const lastSeq = parseInt(data[0].numero_lot.slice(prefix.length).split('.')[0], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return prefix + String(seq).padStart(3, '0');
  }

  // ----------------------------------------------------------
  // API domaine : requêtes avec jointures (à préférer aux accès client directs)
  // Toutes ces fonctions posent le tenant_id et retournent les données enrichies.
  // ----------------------------------------------------------

  // Lots avec leurs cépages et contenants
  async function queryLots(options = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('lots')
      .select(`
        *,
        lot_cepages(pourcentage, cepages(id, nom)),
        lot_contenants(id, volume_hl, date_affectation, contenants(id, nom, type, capacite_hl))
      `)
      .eq('tenant_id', tenantId);

    if (options.id)       q = q.eq('id', options.id);
    if (options.archived === false) q = q.eq('archived', false);
    if (options.actif !== undefined) q = q.eq('actif', options.actif);
    if (options.statut) q = q.eq('statut', options.statut);
    if (options.millesime) q = q.eq('millesime', options.millesime);
    if (options.couleur) q = q.eq('couleur', options.couleur);
    // Plage de période (filtre liste) sur created_at — scope serveur.
    if (options.date_from) q = q.gte('created_at', options.date_from);
    if (options.date_to)   q = q.lte('created_at', options.date_to + 'T23:59:59');
    q = q.order(options.order || 'nom', { ascending: options.ascending ?? true });
    // Pagination serveur optionnelle (limit/offset) — inutilisée par défaut.
    if (options.limit && options.offset != null) q = q.range(options.offset, options.offset + options.limit - 1);
    else if (options.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  // Cuverie : contenants avec leurs lots en cours (jointure optimisée)
  async function queryCuverieData(options = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('contenants')
      .select(`
        *,
        lot_contenants(
          volume_hl,
          date_affectation,
          lots(id, nom, couleur, statut, millesime,
               volume_initial_hl, volume_actuel_hl,
               notes, actif, date_entree,
               appellation, destination, type_lot,
               numero_lot)
        )
      `)
      .eq('tenant_id', tenantId);

    if (options.id)             q = q.eq('id', options.id);
    if (options.actif !== undefined) q = q.eq('actif', options.actif);
    q = q.order(options.order || 'nom', { ascending: options.ascending ?? true });

    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  // État cuverie complet en 1 round-trip via la vue v_cuverie_etat
  // (migration 048). Remplace l'agrégation JS (lotsMap/volume/pct).
  // N'altère PAS queryCuverieData (conservé pour compat).
  // RLS appliquée par la vue (security_invoker) ; .eq tenant_id =
  // défense en profondeur + perf (index tenant_id).
  async function queryCuverieEtat(options = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('v_cuverie_etat')
      .select('*')
      .eq('tenant_id', tenantId);

    if (options.contenant_id)        q = q.eq('contenant_id', options.contenant_id);
    if (options.statut)              q = q.eq('statut', options.statut);
    if (options.travee_id)           q = q.eq('travee_id', options.travee_id);
    if (options.niveau_alerte)       q = q.eq('niveau_alerte', options.niveau_alerte);
    if (options.actif !== undefined) q = q.eq('actif', options.actif);
    // Par défaut on masque les contenants archivés (cohérent UI cuverie)
    if (!options.includeArchived)    q = q.is('archived_at', null);

    q = q.order(options.order || 'contenant_nom',
                { ascending: options.ascending ?? true });

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // Analyses avec références lot et contenant
  async function queryAnalyses(options = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('analyses')
      .select(`
        *,
        lots(id, nom, couleur, statut, millesime),
        contenants(id, nom, type, capacite_hl)
      `)
      .eq('tenant_id', tenantId);

    if (!options.includeArchived) q = q.is('archived_at', null);
    if (options.lot_id)          q = q.eq('lot_id', options.lot_id);
    if (options.lot_ids?.length) q = q.in('lot_id', options.lot_ids);
    if (options.contenant_id) q = q.eq('contenant_id', options.contenant_id);
    if (options.date_from)    q = q.gte('date_analyse', options.date_from);
    if (options.date_to)      q = q.lte('date_analyse', options.date_to);
    q = q.order(options.order || 'date_analyse', { ascending: options.ascending ?? false });
    if (options.limit && options.offset != null) q = q.range(options.offset, options.offset + options.limit - 1);
    else if (options.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  // Journal d'audit (audit_log). RLS : ne renvoie des lignes qu'aux
  // membres role=admin du tenant — un non-admin obtient une liste vide.
  async function queryAuditLog(options = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('audit_log')
      .select('id,created_at,table_name,record_id,action,changed_fields,actor,old_data,new_data')
      .eq('tenant_id', tenantId);

    if (options.table_name) q = q.eq('table_name', options.table_name);
    if (options.action)     q = q.eq('action', options.action);
    if (options.record_id)  q = q.eq('record_id', options.record_id);
    if (options.date_from)  q = q.gte('created_at', options.date_from);
    if (options.date_to)    q = q.lte('created_at', options.date_to);

    q = q.order('created_at', { ascending: false })
         .limit(options.limit || 200);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // Opérations avec lots, contenants et produits impliqués
  async function queryOperations(options = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('operations')
      .select(`
        *,
        operation_lots(id, role, volume_hl, lots(id, nom, couleur, statut, millesime)),
        operation_contenants(id, role, volume_hl, contenants(id, nom, type)),
        operation_produits(id, produit_lot_id, quantite, unite, notes,
          produits_lots(id, produits_catalogue(id, nom, categorie)))
      `)
      .eq('tenant_id', tenantId);

    if (options.id)             q = q.eq('id', options.id);
    if (options.type_operation) q = q.eq('type_operation', options.type_operation);
    if (options.statut)         q = q.eq('statut', options.statut);
    if (options.date_from)      q = q.gte('date_operation', options.date_from);
    if (options.date_to)        q = q.lte('date_operation', options.date_to);
    q = q.order(options.order || 'date_operation', { ascending: options.ascending ?? false })
         .order('created_at', { ascending: options.ascending ?? false });
    if (options.limit && options.offset != null) q = q.range(options.offset, options.offset + options.limit - 1);
    else if (options.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  // Toutes les données d'un lot pour la page lot-detail (jointures enrichies)
  async function getLotDetail(lotId) {
    ensureLoggedIn();
    const tenantId = requireTenant();

    const { data: lot, error: lotErr } = await client
      .from('lots')
      .select('*, lot_cepages(pourcentage, cepages(id,nom,couleur)), lot_contenants(id,volume_hl,contenants(id,nom,capacite_hl))')
      .eq('id', lotId)
      .eq('tenant_id', tenantId)
      .single();
    if (lotErr || !lot) throw lotErr || new Error('Lot introuvable');

    const { data: apports } = await client
      .from('apports')
      .select('id,numero,date_apport,apporteur,provenance,poids_kg,volume_hl,statut,cepage_libre,millesime,degre_probable')
      .eq('lot_id', lotId)
      .eq('tenant_id', tenantId)
      .order('date_apport', { ascending: false });

    const { data: opLots } = await client
      .from('operation_lots')
      .select(`id, role, volume_hl, notes,
        operations(id, type_operation, date_operation, heure_operation,
                   reference, volume_hl, operateur, statut, notes)`)
      .eq('lot_id', lotId)
      .eq('tenant_id', tenantId);

    const validOpLots = (opLots || []).filter(ol => ol.operations);
    const opIds = validOpLots.map(ol => ol.operations.id);

    let prodByOp = {}, contByOp = {}, othersByOp = {};
    if (opIds.length) {
      const [prRes, ocRes, olRes] = await Promise.all([
        client.from('operation_produits')
          .select('operation_id, produit_lot_id, quantite, unite, produits_lots(id, numero_lot, dluo, unite, produits_catalogue(id, nom, categorie, concentration, concentration_libelle, unite_stock, dose_max))')
          .in('operation_id', opIds),
        client.from('operation_contenants')
          .select('operation_id, role, volume_hl, contenants(id,nom)')
          .in('operation_id', opIds),
        client.from('operation_lots')
          .select('operation_id, role, volume_hl, lots(id,nom,couleur,millesime)')
          .in('operation_id', opIds)
          .neq('lot_id', lotId),
      ]);
      prodByOp   = _groupByKey(prRes.data || [], 'operation_id');
      contByOp   = _groupByKey(ocRes.data || [], 'operation_id');
      othersByOp = _groupByKey(olRes.data || [], 'operation_id');
    }

    return { lot, apports: apports || [], opLots: validOpLots, prodByOp, contByOp, othersByOp };
  }

  // Toutes les données d'un contenant pour la page contenant-detail
  async function getContenantDetail(contenantId) {
    ensureLoggedIn();
    const tenantId = requireTenant();

    const { data: cont, error: contErr } = await client
      .from('contenants')
      .select('*, travees(id,nom)')
      .eq('id', contenantId)
      .eq('tenant_id', tenantId)
      .single();
    if (contErr || !cont) throw contErr || new Error('Contenant introuvable');

    const { data: lotConts } = await client
      .from('lot_contenants')
      .select('volume_hl, lots(id,nom,couleur,millesime,statut,volume_actuel_hl)')
      .eq('contenant_id', contenantId)
      .eq('tenant_id', tenantId);

    const { data: opConts } = await client
      .from('operation_contenants')
      .select(`id, role, volume_hl, notes,
        operations(id, type_operation, date_operation, reference, operateur, statut, notes, volume_hl)`)
      .eq('contenant_id', contenantId)
      .eq('tenant_id', tenantId);

    const validOpConts = (opConts || []).filter(oc => oc.operations);
    const opIds = validOpConts.map(oc => oc.operations.id);

    let lotsByOp = {}, prodByOp = {};
    if (opIds.length) {
      const [lRes, pRes] = await Promise.all([
        client.from('operation_lots')
          .select('operation_id, role, lots(id,nom,couleur,millesime)')
          .in('operation_id', opIds),
        client.from('operation_produits')
          .select('operation_id, produit_lot_id, quantite, unite, produits_lots(id, numero_lot, dluo, unite, produits_catalogue(id, nom, categorie, concentration, concentration_libelle, unite_stock, dose_max))')
          .in('operation_id', opIds),
      ]);
      lotsByOp = _groupByKey(lRes.data || [], 'operation_id');
      prodByOp = _groupByKey(pRes.data || [], 'operation_id');
    }

    const { data: analyses } = await client
      .from('analyses')
      .select('*, lots(id,nom,couleur,millesime)')
      .eq('contenant_id', contenantId)
      .eq('tenant_id', tenantId)
      .order('date_analyse', { ascending: false });

    return { cont, lotConts: lotConts || [], opConts: validOpConts, lotsByOp, prodByOp, analyses: analyses || [] };
  }

  // Stock produits avec catalogue joint, trié par DLUO croissant (nulls en dernier)
  async function getProduitLots() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('produits_lots')
      // dose_max ajouté pour permettre le garde-fou R2 (hint live + confirm
      // save si dose > dose_max). Sans ça, pc.dose_max était toujours
      // undefined → garde-fou inactif.
      .select('*, produits_catalogue(id,nom,categorie,fournisseur,unite_stock,concentration,concentration_libelle,dose_max)')
      .eq('tenant_id', tenantId)
      .order('dluo', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data || [];
  }

  // Journal comptable des mouvements de stock d'un lot produit (socle 3,
  // mig 054). Lit la vue lisible v_stock_produits_detail (jointures
  // lot/catalogue/op). Tri antéchronologique. Sans produitLotId : tous les
  // mouvements du tenant (limités).
  async function queryProduitMouvements(produitLotId = null, { limit = 200 } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('v_stock_produits_detail')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (produitLotId) q = q.eq('produit_lot_id', produitLotId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // Tolérances métier effectives du tenant (socle 6, mig 056) : défauts
  // fusionnés avec les overrides wb3_tolerances. Cache process (rechargé
  // via { force:true }). Si la fonction n'existe pas encore (PGRST202,
  // migration 056 non appliquée), renvoie {} → l'appelant retombe sur ses
  // valeurs en dur historiques (pas de rupture).
  let _tolCache = null;
  async function getTolerances({ force = false } = {}) {
    if (_tolCache && !force) return _tolCache;
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_get_tolerances', { p_tenant_id: tenantId });
    if (error) {
      if (error.code === 'PGRST202') { _tolCache = {}; return _tolCache; }
      throw error;
    }
    _tolCache = data || {};
    return _tolCache;
  }

  // Écriture centralisée d'un override de tolérance (mig 056). UPSERT sur
  // wb3_tolerances (RLS : privilégié seulement — un caviste sera refusé par
  // la policy). Invalide le cache. Point d'écriture UNIQUE pour les seuils
  // (cf. prompt socle "ne pas écrire depuis plusieurs endroits dispersés").
  async function setTolerance(cle, value, { kind = 'num' } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!cle) throw new Error('[WB3] setTolerance: clé requise.');
    const row = { tenant_id: tenantId, cle };
    if (kind === 'bool')      row.bloquant   = !!value;
    else if (kind === 'text') row.valeur_txt = String(value);
    else {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error('[WB3] setTolerance: valeur numérique invalide.');
      row.valeur_num = n;
    }
    const { error } = await client
      .from('wb3_tolerances')
      .upsert(row, { onConflict: 'tenant_id,cle' });
    if (error) throw error;
    _tolCache = null;  // invalide le cache → prochain getTolerances rafraîchit
  }

  // Suppression d'un override → la clé retombe sur le défaut de
  // wb3_get_tolerances. Invalide le cache.
  async function resetTolerance(cle) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!cle) throw new Error('[WB3] resetTolerance: clé requise.');
    const { error } = await client
      .from('wb3_tolerances')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('cle', cle);
    if (error) throw error;
    _tolCache = null;
  }

  // ── Barémage / calibration contenants (mig 060, Sprint Vendange) ──
  // Volume réel depuis une mesure. mode : 'creux' (haut cheminée, défaut)
  // ou 'jauge_bas' (hauteur liquide depuis le bas). Abaque interpolé sinon linéaire.
  async function volumeFromMesure(contenantId, mesureCm, mode = 'creux') {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_volume_from_mesure', {
      p_tenant_id: tenantId, p_contenant_id: contenantId,
      p_mesure_cm: mesureCm, p_mode: mode,
    });
    if (error) throw error;
    return data;  // numeric hL ou null si pas de calibration
  }

  // Niveau 1 (linéaire) : lecture/écriture du barémage d'un contenant.
  async function getBaremage(contenantId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('contenant_baremage').select('*')
      .eq('tenant_id', tenantId).eq('contenant_id', contenantId).maybeSingle();
    if (error) throw error;
    return data || null;
  }
  async function listBaremages() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('contenant_baremage').select('*').eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  }
  async function saveBaremage(contenantId, fields) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('contenant_baremage')
      .upsert({ tenant_id: tenantId, contenant_id: contenantId, ...fields },
              { onConflict: 'tenant_id,contenant_id' });
    if (error) throw error;
  }

  // ── Modèles d'abaque (partagés, Option B) ──────────────────────
  async function listModeles() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('baremage_modele').select('*').eq('tenant_id', tenantId)
      .order('nom', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  // Upsert d'un modèle par nom. Retourne l'id du modèle.
  async function saveModele({ nom, capacite_nominale_hl = null, notes = null }) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!nom) throw new Error('[WB3] saveModele: nom requis.');
    const { data, error } = await client.from('baremage_modele')
      .upsert({ tenant_id: tenantId, nom, capacite_nominale_hl, notes },
              { onConflict: 'tenant_id,nom' })
      .select('id').single();
    if (error) throw error;
    return data.id;
  }
  async function deleteModele(modeleId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('baremage_modele')
      .delete().eq('tenant_id', tenantId).eq('id', modeleId);
    if (error) throw error;
  }
  async function getModelePoints(modeleId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('baremage_modele_point').select('creux_cm, volume_hl')
      .eq('tenant_id', tenantId).eq('modele_id', modeleId)
      .order('creux_cm', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  // Remplace tous les points d'un modèle (import). points = [{creux_cm, volume_hl}]
  // Dédupliqué par creux_cm arrondi à 2 décimales (= précision de la colonne
  // numeric(10,2)) → évite "duplicate key" quand deux valeurs source arrondissent
  // au même centième. Dernier point gagnant.
  async function replaceModelePoints(modeleId, points) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error: delErr } = await client.from('baremage_modele_point')
      .delete().eq('tenant_id', tenantId).eq('modele_id', modeleId);
    if (delErr) throw delErr;
    if (!points || !points.length) return 0;
    const byCreux = new Map();
    points.forEach(p => {
      if (p.creux_cm == null || p.volume_hl == null) return;
      const c = Math.round(Number(p.creux_cm) * 100) / 100;
      const v = Number(p.volume_hl);
      if (Number.isNaN(c) || Number.isNaN(v)) return;
      byCreux.set(c, v);  // dédupe : dernier gagnant
    });
    const rows = [...byCreux.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([creux_cm, volume_hl]) => ({ tenant_id: tenantId, modele_id: modeleId, creux_cm, volume_hl }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await client.from('baremage_modele_point').insert(rows.slice(i, i + 500));
      if (error) throw error;
    }
    return rows.length;
  }

  // ── Rendement vendange (apports, mig 062) ──────────────────────
  // Coeff de rendement par cépage (override du défaut tenant 130 kg/hL).
  async function listRendementCepage() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('apport_rendement_cepage').select('*').eq('tenant_id', tenantId)
      .order('cepage', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function saveRendementCepage(cepage, rendement_kg_hl) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!cepage) throw new Error('[WB3] saveRendementCepage: cépage requis.');
    const { error } = await client.from('apport_rendement_cepage')
      .upsert({ tenant_id: tenantId, cepage, rendement_kg_hl: Number(rendement_kg_hl) },
              { onConflict: 'tenant_id,cepage' });
    if (error) throw error;
  }
  async function deleteRendementCepage(cepage) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('apport_rendement_cepage')
      .delete().eq('tenant_id', tenantId).eq('cepage', cepage);
    if (error) throw error;
  }
  // Rendement agrégé par jour/cépage (vue v_rendement_jour_cepage).
  async function queryRendementJourCepage({ from = null, to = null } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client.from('v_rendement_jour_cepage').select('*').eq('tenant_id', tenantId);
    if (from) q = q.gte('date_apport', from);
    if (to)   q = q.lte('date_apport', to);
    const { data, error } = await q.order('date_apport', { ascending: false }).order('cepage');
    if (error) throw error;
    return data || [];
  }

  // ── Essais d'assemblage / échantillons (mig 063, Phase 3) ──────
  // Arborescence de dossiers + essais figés (snapshot). created_by posé par trigger.
  async function listEssaiDossiers() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.from('essai_dossier')
      .select('*').eq('tenant_id', tenantId).order('nom', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function createEssaiDossier(nom, parentId = null) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!nom) throw new Error('[WB3] createEssaiDossier: nom requis.');
    const { data, error } = await client.from('essai_dossier')
      .insert({ tenant_id: tenantId, nom, parent_id: parentId })
      .select('*').single();
    if (error) throw error;
    return data;
  }
  async function renameEssaiDossier(id, nom) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('essai_dossier')
      .update({ nom }).eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;
  }
  async function moveEssaiDossier(id, parentId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('essai_dossier')
      .update({ parent_id: parentId || null }).eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;
  }
  async function deleteEssaiDossier(id) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('essai_dossier')
      .delete().eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;  // RLS : privilégié seulement
  }

  // Essais (liste légère sans le gros JSONB par défaut, ou complet via full:true)
  async function listEssais({ dossierId, full = false } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const cols = full ? '*' : 'id, dossier_id, nom, snapshot_at, created_by, created_at, updated_at';
    let q = client.from('essai').select(cols).eq('tenant_id', tenantId);
    if (dossierId === null)      q = q.is('dossier_id', null);
    else if (dossierId)          q = q.eq('dossier_id', dossierId);
    const { data, error } = await q.order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function getEssai(id) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.from('essai')
      .select('*').eq('tenant_id', tenantId).eq('id', id).single();
    if (error) throw error;
    return data;
  }
  async function createEssai({ nom, dossier_id = null, lignes = [], params = {}, resultat = {}, notes = null }) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!nom) throw new Error('[WB3] createEssai: nom requis.');
    const { data, error } = await client.from('essai')
      .insert({ tenant_id: tenantId, nom, dossier_id, lignes, params, resultat, notes })
      .select('*').single();
    if (error) throw error;
    return data;
  }
  async function updateEssai(id, fields) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('essai')
      .update(fields).eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;
  }
  async function deleteEssai(id) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('essai')
      .delete().eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;  // RLS : créateur ou privilégié
  }
  // Copie : duplique un essai (nouveau snapshot_at = maintenant ? non — on
  // garde le snapshot d'origine ; c'est une COPIE de l'essai figé).
  async function copyEssai(id, newNom = null) {
    ensureLoggedIn();
    const src = await getEssai(id);
    return createEssai({
      nom: newNom || (src.nom + ' (copie)'),
      dossier_id: src.dossier_id,
      lignes: src.lignes, params: src.params, resultat: src.resultat,
      notes: src.notes,
    });
  }

  // ── Planning / fiches de travail (mig 064, Phase 4) ────────────
  // Tâches planifiées : liste filtrable par plage de dates / statut / personne.
  async function listTaches({ from = null, to = null, statut = null, assignee = null, contenantId = null } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client.from('tache').select('*').eq('tenant_id', tenantId);
    if (from)        q = q.gte('date_prevue', from);
    if (to)          q = q.lte('date_prevue', to);
    if (statut)      q = q.eq('statut', statut);
    if (assignee)    q = q.eq('assignee', assignee);
    if (contenantId) q = q.eq('contenant_id', contenantId);
    const { data, error } = await q
      .order('date_prevue', { ascending: true })
      .order('ordre', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function createTache(fields) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!fields?.date_prevue) throw new Error('[WB3] createTache: date_prevue requise.');
    const { data, error } = await client.from('tache')
      .insert({ tenant_id: tenantId, ...fields })
      .select('*').single();
    if (error) throw error;
    return data;
  }
  async function updateTache(id, fields) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('tache')
      .update(fields).eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;
  }
  // Bascule de statut avec horodatage « fait »
  async function setTacheStatut(id, statut) {
    const patch = { statut };
    patch.done_at = (statut === 'fait') ? new Date().toISOString() : null;
    return updateTache(id, patch);
  }
  async function deleteTache(id) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('tache')
      .delete().eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;  // RLS : créateur ou privilégié
  }
  // Duplique une tâche (nouvelle ligne, statut remis à 'a_faire').
  // overrides : ex. { date_prevue, creneau } pour copier vers un autre jour.
  async function copyTache(id, overrides = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data: src, error } = await client.from('tache')
      .select('*').eq('tenant_id', tenantId).eq('id', id).single();
    if (error) throw error;
    const fields = {
      date_prevue: src.date_prevue, type: src.type, titre: src.titre, note: src.note,
      contenant_id: src.contenant_id, contenant_nom: src.contenant_nom, lot_nom: src.lot_nom,
      assignee: src.assignee, priorite: src.priorite, ordre: src.ordre,
      detail: src.detail, creneau: src.creneau ?? null,
      statut: 'a_faire',
      ...overrides,
    };
    return createTache(fields);
  }

  // Entête/consignes d'une fiche de travail (jour [, personne]).
  async function getFicheTravail(dateFiche, assignee = '') {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.from('fiche_travail')
      .select('*')
      .eq('tenant_id', tenantId).eq('date_fiche', dateFiche).eq('assignee', assignee || '')
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }
  // Get-or-create : garantit l'existence de la fiche (donc l'attribution du N°
  // auto par le trigger mig 065) dès qu'on l'ouvre/imprime, même sans consignes.
  async function getOrCreateFicheTravail(dateFiche, assignee = '') {
    const existing = await getFicheTravail(dateFiche, assignee);
    if (existing) return existing;
    const tenantId = requireTenant();
    const { data, error } = await client.from('fiche_travail')
      .insert({ tenant_id: tenantId, date_fiche: dateFiche, assignee: assignee || '' })
      .select('*').single();
    if (error) {
      // Course possible (création concurrente) : on relit.
      const again = await getFicheTravail(dateFiche, assignee);
      if (again) return again;
      throw error;
    }
    return data;
  }
  // Upsert sur la contrainte (tenant_id, date_fiche, assignee).
  async function saveFicheTravail(dateFiche, assignee = '', { titre = null, consignes = null } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.from('fiche_travail')
      .upsert({ tenant_id: tenantId, date_fiche: dateFiche, assignee: assignee || '', titre, consignes },
              { onConflict: 'tenant_id,date_fiche,assignee' })
      .select('*').single();
    if (error) throw error;
    return data;
  }

  // ── Inventaire (cuves & produits, mig 066) ─────────────────────
  async function listInventaires(type = null) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client.from('inventaire').select('*').eq('tenant_id', tenantId);
    if (type) q = q.eq('type', type);
    const { data, error } = await q.order('date_inventaire', { ascending: false })
                                   .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function createInventaire({ type, date_inventaire = null, libelle = null, notes = null }) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!['cuve', 'produit'].includes(type)) throw new Error('[WB3] createInventaire: type cuve|produit requis.');
    const row = { tenant_id: tenantId, type, libelle, notes };
    if (date_inventaire) row.date_inventaire = date_inventaire;
    const { data, error } = await client.from('inventaire').insert(row).select('*').single();
    if (error) throw error;
    return data;
  }
  // Insertion en masse des lignes (snapshot du théorique au lancement).
  async function addInventaireLignes(inventaireId, lignes = []) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    if (!lignes.length) return [];
    const rows = lignes.map(l => ({
      tenant_id: tenantId, inventaire_id: inventaireId,
      ref_id: l.ref_id || null, ref_label: l.ref_label || null, ref_detail: l.ref_detail || null,
      unite: l.unite || null,
      qte_theorique: l.qte_theorique != null ? l.qte_theorique : null,
      qte_comptee:   l.qte_comptee   != null ? l.qte_comptee   : null,
      explication:   l.explication || null,
    }));
    const { data, error } = await client.from('inventaire_ligne').insert(rows).select('*');
    if (error) throw error;
    return data || [];
  }
  async function getInventaireLignes(inventaireId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.from('inventaire_ligne')
      .select('*').eq('tenant_id', tenantId).eq('inventaire_id', inventaireId)
      .order('ref_label', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function updateInventaireLigne(id, fields) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('inventaire_ligne')
      .update(fields).eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;
  }
  // Clôture / réouverture via RPC durcie (mig 067) : garde tenant + privilège
  // côté base. L'UI ne fait que masquer le bouton ; la base est protectrice.
  async function setInventaireStatut(id, statut) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_set_inventaire_statut', {
      p_tenant_id: tenantId, p_inventaire_id: id, p_statut: statut,
    });
    if (error) {
      if (error.code === 'PGRST202') {
        throw new Error('Clôture indisponible : migration 067 (verrou inventaire) non appliquée.');
      }
      throw error;
    }
    return data;
  }
  async function deleteInventaire(id) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.from('inventaire')
      .delete().eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;   // RLS : privilégié (cascade sur les lignes)
  }

  // Historique des lots pour un contenant donné (vue côté cuve)
  async function queryContenantLotHistory(contenantId) {
    ensureLoggedIn();
    const tenantId = requireTenant();

    const { data: events, error } = await client
      .from('lot_contenants_history')
      .select('id, type_evt, volume_hl, date_evt, lot_id')
      .eq('contenant_id', contenantId)
      .eq('tenant_id', tenantId)
      .order('date_evt', { ascending: false });
    if (error) throw error;

    const lotIds = [...new Set((events || []).map(e => e.lot_id).filter(Boolean))];
    let lotsMap = {};
    if (lotIds.length) {
      const { data: lotsData } = await client
        .from('lots').select('id, nom, couleur, millesime, statut, numero_lot')
        .in('id', lotIds).eq('tenant_id', tenantId);
      (lotsData || []).forEach(l => { lotsMap[l.id] = l; });
    }
    return (events || []).map(e => ({ ...e, lot: lotsMap[e.lot_id] }));
  }

  // Lot présent dans une cuve À UNE DATE donnée (résolution historique).
  // Sert à affecter une analyse au BON lot, y compris en saisie a posteriori :
  // on prend le lot résident à la date de l'analyse, pas celui d'aujourd'hui.
  //   - dateISO : 'YYYY-MM-DD' (ou null → maintenant).
  //   - Renvoie { lot_id, lot, date_evt } ou null.
  // Algo : événements lot_contenants_history (entree/sortie/backfill) ≤ fin de
  // journée ; pour chaque lot on garde son dernier événement ; les lots dont le
  // dernier événement n'est PAS 'sortie' sont présents ; on retient l'entrée la
  // plus récente. Repli : lot courant via lot_contenants si aucun historique.
  async function lotInContenantAtDate(contenantId, dateISO) {
    if (!contenantId) return null;
    const cutoff = dateISO ? (dateISO + 'T23:59:59.999Z') : null;
    let hist = [];
    try { hist = await queryContenantLotHistory(contenantId); } catch (e) { hist = []; }

    if (hist.length) {
      // hist trié date_evt DESC. On filtre ≤ cutoff, puis 1ʳᵉ occurrence/lot = la + récente.
      const ev = cutoff ? hist.filter(e => e.date_evt <= cutoff) : hist;
      const lastByLot = {};
      ev.forEach(e => { if (!(e.lot_id in lastByLot)) lastByLot[e.lot_id] = e; });
      const present = Object.values(lastByLot).filter(e => e.type_evt !== 'sortie');
      if (present.length) {
        present.sort((a, b) => (a.date_evt < b.date_evt ? 1 : -1)); // entrée la + récente
        const e = present[0];
        return { lot_id: e.lot_id, lot: e.lot || null, date_evt: e.date_evt };
      }
      // historique présent mais cuve vide à cette date → null (pas de repli courant
      // qui fausserait une saisie a posteriori).
      if (cutoff) return null;
    }

    // Repli (aucun historique) : lot courant dans la cuve via lot_contenants.
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('lot_contenants')
      .select('lot_id, date_affectation, lots(id, nom, couleur, millesime, statut, numero_lot)')
      .eq('contenant_id', contenantId).eq('tenant_id', tenantId)
      .order('date_affectation', { ascending: false }).limit(1);
    if (error || !data || !data.length) return null;
    return { lot_id: data[0].lot_id, lot: data[0].lots || null, date_evt: data[0].date_affectation };
  }

  // Parcours cuves d'un lot : toutes les entrées/sorties depuis lot_contenants_history
  async function queryLotContenantHistory(lotId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('lot_contenants_history')
      .select('id, type_evt, volume_hl, date_evt, notes, contenant_id, contenant_nom_snap')
      .eq('lot_id', lotId)
      .eq('tenant_id', tenantId)
      .order('date_evt', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // Journal des mouvements physiques d'un lot (lot_mouvements, source de vérité depuis v5)
  async function getLotMouvements(lotId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('lot_mouvements')
      .select('id, operation_id, type_operation, lot_id, contenant_source_id, contenant_dest_id, volume_hl, date_mouvement, sens, contenant_source:contenants!contenant_source_id(id,nom), contenant_dest:contenants!contenant_dest_id(id,nom)')
      .eq('lot_id', lotId)
      .eq('tenant_id', tenantId)
      .order('date_mouvement', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // Journal des mouvements physiques d'une cuve (lot_mouvements, source de vérité depuis v5)
  async function getContenantMouvements(contenantId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('lot_mouvements')
      .select('id, operation_id, type_operation, lot_id, contenant_source_id, contenant_dest_id, volume_hl, date_mouvement, sens, lot:lots!lot_id(id,nom,couleur,millesime), contenant_source:contenants!contenant_source_id(id,nom), contenant_dest:contenants!contenant_dest_id(id,nom)')
      .or(`contenant_source_id.eq.${contenantId},contenant_dest_id.eq.${contenantId}`)
      .eq('tenant_id', tenantId)
      .order('date_mouvement', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // Recherche globale : lots + contenants (pour la page traçabilité sans param)
  async function searchEntities(query) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const like = `%${query.trim()}%`;
    const [lotsRes, contenantsRes] = await Promise.all([
      client.from('lots')
        .select('id, nom, couleur, millesime, statut, numero_lot, volume_actuel_hl')
        .eq('tenant_id', tenantId)
        .or(`nom.ilike.${like},numero_lot.ilike.${like}`)
        .order('nom').limit(12),
      client.from('contenants')
        .select('id, nom, type, capacite_hl')
        .eq('tenant_id', tenantId)
        .ilike('nom', like)
        .order('nom').limit(8),
    ]);
    return { lots: lotsRes.data || [], contenants: contenantsRes.data || [] };
  }

  // Timeline globale : lot_mouvements + analyses pour une période (page traçabilité mode global)
  async function getGlobalTimeline({ lot_id, contenant_id, date_from, date_to, limit = 80 } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();

    let mvtQ = client.from('lot_mouvements')
      .select('id, operation_id, type_operation, lot_id, contenant_source_id, contenant_dest_id, volume_hl, date_mouvement, sens, lot:lots!lot_id(id,nom,couleur,millesime), contenant_source:contenants!contenant_source_id(id,nom), contenant_dest:contenants!contenant_dest_id(id,nom)')
      .eq('tenant_id', tenantId)
      .order('date_mouvement', { ascending: false })
      .limit(limit);
    if (lot_id)       mvtQ = mvtQ.eq('lot_id', lot_id);
    if (contenant_id) mvtQ = mvtQ.or(`contenant_source_id.eq.${contenant_id},contenant_dest_id.eq.${contenant_id}`);
    if (date_from)    mvtQ = mvtQ.gte('date_mouvement', date_from);
    if (date_to)      mvtQ = mvtQ.lte('date_mouvement', date_to);

    let anlQ = client.from('analyses')
      .select('*, lots(id,nom,couleur,millesime), contenants(id,nom)')
      .eq('tenant_id', tenantId)
      .order('date_analyse', { ascending: false })
      .limit(limit);
    if (lot_id)       anlQ = anlQ.eq('lot_id', lot_id);
    if (contenant_id) anlQ = anlQ.eq('contenant_id', contenant_id);
    if (date_from)    anlQ = anlQ.gte('date_analyse', date_from);
    if (date_to)      anlQ = anlQ.lte('date_analyse', date_to);

    const [mvtRes, anlRes] = await Promise.all([mvtQ, anlQ]);
    if (mvtRes.error) throw mvtRes.error;
    if (anlRes.error) throw anlRes.error;
    return { mouvements: mvtRes.data || [], analyses: anlRes.data || [] };
  }

  // Filiation d'un lot : parents (ce lot est issu de) + enfants (ce lot a alimenté)
  async function queryLotFiliation(lotId) {
    ensureLoggedIn();
    const tenantId = requireTenant();

    const [parRes, chilRes] = await Promise.all([
      client.from('lot_filiation')
        .select('id, parent_id, volume_hl, source_type, operation_id, operations(type_operation, date_operation, reference)')
        .eq('lot_id', lotId).eq('tenant_id', tenantId),
      client.from('lot_filiation')
        .select('id, lot_id, volume_hl, source_type, operation_id, operations(type_operation, date_operation, reference)')
        .eq('parent_id', lotId).eq('tenant_id', tenantId),
    ]);
    if (parRes.error)  throw parRes.error;
    if (chilRes.error) throw chilRes.error;

    const allIds = [...new Set([
      ...parRes.data.map(r => r.parent_id),
      ...chilRes.data.map(r => r.lot_id),
    ])];

    let lotsMap = {};
    if (allIds.length) {
      const { data, error } = await client
        .from('lots').select('id, nom, couleur, millesime, statut, numero_lot')
        .in('id', allIds).eq('tenant_id', tenantId);
      if (error) throw error;
      (data || []).forEach(l => { lotsMap[l.id] = l; });
    }

    return {
      parents:  parRes.data.map(r  => ({ ...r,  lot: lotsMap[r.parent_id] })),
      children: chilRes.data.map(r => ({ ...r,  lot: lotsMap[r.lot_id]    })),
    };
  }

  // Chaîne de filiation récursive d'un lot (ancêtres + descendants) via RPC
  async function getLotChain(lotId, depth = 4) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_lot_chain', {
      p_tenant_id: tenantId,
      p_lot_id:    lotId,
      p_depth:     depth,
    });
    if (error) throw error;
    return data || [];
  }

  // Delta sync des liens manuels (source_type='manual') pour un lot enfant.
  // Ne touche jamais les liens source_type='assemblage' créés par les opérations.
  // desiredParents : [{ parent_id, volume_hl }]
  async function syncLotFiliation(lotId, desiredParents) {
    const tenantId = requireTenant();
    const valid = (desiredParents || []).filter(d => d.parent_id && d.parent_id !== lotId);

    // Lire uniquement les liens manuels pour le delta sync
    const { data: current, error } = await client
      .from('lot_filiation').select('id, parent_id, volume_hl')
      .eq('lot_id', lotId).eq('tenant_id', tenantId).eq('source_type', 'manual');
    if (error) throw error;

    const currentMap = new Map(current.map(c => [c.parent_id, c]));
    const desiredMap = new Map(valid.map(d => [d.parent_id, d]));

    const toDelete = current.filter(c => !desiredMap.has(c.parent_id));
    const toInsert = valid.filter(d => !currentMap.has(d.parent_id));
    const toUpdate = valid.filter(d => {
      const c = currentMap.get(d.parent_id);
      return c && (c.volume_hl ?? null) !== (d.volume_hl ?? null);
    });

    _checkResults(await Promise.all([
      ...toDelete.map(c => client.from('lot_filiation').delete().eq('id', c.id).eq('tenant_id', tenantId)),
      ...toInsert.map(d => client.from('lot_filiation').insert({
        lot_id: lotId, parent_id: d.parent_id, volume_hl: d.volume_hl ?? null,
        tenant_id: tenantId, source_type: 'manual',
      })),
      ...toUpdate.map(d => {
        const c = currentMap.get(d.parent_id);
        return client.from('lot_filiation').update({ volume_hl: d.volume_hl ?? null })
          .eq('id', c.id).eq('tenant_id', tenantId);
      }),
    ]));
  }

  // Prochain numéro séquentiel d'apport pour l'année donnée (délègue à la fonction SQL)
  async function nextApportNumero(year) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('next_apport_numero', {
      p_tenant_id: tenantId,
      p_year: year,
    });
    if (error) throw error;
    return data;
  }

  function _groupByKey(arr, key) {
    const map = {};
    (arr || []).forEach(item => {
      const k = item[key];
      if (!map[k]) map[k] = [];
      map[k].push(item);
    });
    return map;
  }

  // ----------------------------------------------------------
  // API domaine : cycle de vie (annulation / archivage)
  // Principe WB3 : on clôture plus qu'on ne détruit.
  // ----------------------------------------------------------

  // Archiver un lot (le sort des vues courantes, conserve l'historique)
  async function archiveLot(id) {
    return updateRow('lots', id, { archived: true, actif: false });
  }

  // Annuler une opération (statut → 'annule', non supprimée)
  // ⚠️ DÉPRÉCIÉ — bloqué par le trigger _wb3_op_lock_check (mig 037/038/040)
  // qui refuse statut realise → annule. Conservé pour rétro-compat
  // d'éventuels appels en planifié uniquement. Pour annuler les effets
  // d'une opération RÉALISÉE, utiliser createCorrectiveOperation ci-dessous
  // (crée une opération inverse — chemin durci normal).
  async function cancelOperation(id) {
    return updateRow('operations', id, { statut: 'annule' });
  }

  // Crée une opération corrective inverse d'une opération RÉALISÉE.
  // Lit l'op originale (type, date, lots, contenants, produits), swap
  // les rôles source ⇄ destination (pour les types ayant un sens
  // directionnel), pré-remplit un payload prêt à passer à
  // saveOperationGraphAtomic. Retourne le payload ou exécute la sauvegarde
  // selon le mode passé.
  //
  // Mode 'preview' (default) : retourne un brouillon
  //   { payload, lots, contenants, produits, sourceOpId }
  // sans rien écrire — le front peut afficher un drawer pré-rempli pour
  // confirmation / ajustement avant submit (laisse à l'utilisateur la
  // dernière main + permet d'éditer date/notes).
  //
  // Mode 'apply' : exécute saveOperationGraphAtomic directement, retourne
  // l'id de l'op corrective créée.
  //
  // Limites :
  //   • Les types sans direction src/dst (analyse, levurage, sulfitage,
  //     ouillage, …) n'ont pas d'inverse logique → on lève une erreur
  //     explicite "Type X non inversible — utiliser deleteRow si besoin".
  //   • L'op originale reste en place (immutable via trigger), c'est la
  //     somme algébrique des deux qui rétablit l'état.
  //   • Filiation : non inversée automatiquement (cas assemblage complexe ;
  //     à traiter manuellement via lot-detail si nécessaire).
  // Conversion atomique cuve multi-lots → assemblage via RPC (mig 051).
  // Crée le nouveau lot + l'op assemblage dans UNE transaction Postgres →
  // pas de lot orphelin si l'op échoue. Lève une erreur { code:'PGRST202' }
  // si la RPC n'est pas appliquée → l'appelant (cuverie.html) bascule sur
  // le fallback JS avec rollback explicite.
  // newLot     : { nom, couleur, statut, millesime, notes, reference? }
  // sourceLots : [{ lot_id, volume_hl }]
  // Retour : { new_lot_id, operation_id }
  async function convertMultilotToAssemblage(contenantId, newLot, sourceLots) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    // Socle 2 : en prod, exiger la RPC atomique (pas de fallback JS dangereux).
    // En WB3_DEV_MODE, on laisse passer → l'appelant pourra basculer en fallback.
    await requireCapability('wb3_convert_multilot_to_assemblage');
    const { data, error } = await client.rpc('wb3_convert_multilot_to_assemblage', {
      p_tenant_id:    tenantId,
      p_contenant_id: contenantId,
      p_new_lot:      newLot,
      p_source_lots:  sourceLots,
    });
    if (error) {
      if (error.code === 'PGRST202') {
        throw Object.assign(new Error('RPC wb3_convert_multilot_to_assemblage introuvable (migration 051 requise)'), { code: 'PGRST202' });
      }
      throw error;
    }
    return data;  // { new_lot_id, operation_id }
  }

  async function createCorrectiveOperation(sourceOpId, mode = 'preview') {
    ensureLoggedIn();
    const tenantId = requireTenant();

    // Lecture op originale + graphes liés (réutilise queryOperations).
    const { data: op, error: opErr } = await client
      .from('operations')
      .select(`*,
        operation_lots(lot_id, role, volume_hl),
        operation_contenants(contenant_id, role, volume_hl),
        operation_produits(produit_lot_id, quantite, unite)`)
      .eq('id', sourceOpId).eq('tenant_id', tenantId)
      .single();
    if (opErr || !op) throw opErr || new Error('Opération source introuvable');

    if (op.statut !== 'realise') {
      throw new Error('Opération corrective : la source doit être en statut "realise" (statut courant : ' + op.statut + ')');
    }

    // Types ayant un sens directionnel (src/dst inversibles) OU portant
    // un effet sur le stock produit (la corrective ré-incrémente le stock
    // via la branche R4 ci-dessous, sans modifier les rôles).
    // Pour les types "traite/implique" sans direction (sulfitage, levurage,
    // collage, etc.), la corrective ne fait AUCUN effet physique (le SO2
    // ajouté reste dans le vin) — c'est uniquement une annulation
    // administrative + ré-incrément stock pour la cohérence comptable.
    const REVERSIBLE = new Set([
      // Avec source/destination (swap roles + ré-incrément stock si applicable)
      'relogement', 'soutirage', 'transfert', 'ecoulage', 'filtration', 'assemblage',
      // Avec produits (rôles inchangés, ré-incrément stock uniquement)
      'sulfitage', 'levurage', 'enzymage', 'malo', 'collage',
    ]);
    if (!REVERSIBLE.has(op.type_operation)) {
      throw new Error(
        'Type "' + op.type_operation + '" non inversible automatiquement. '
        + 'Créez une opération corrective manuellement, ou supprimez l\'op si réellement nécessaire.'
      );
    }

    // Swap roles source ⇄ destination sur contenants ET lots (pour
    // assemblage : sources↔destination échangées).
    const swapRole = r => r === 'source' ? 'destination' : (r === 'destination' ? 'source' : r);

    // Fix T8 — résolution des volume_hl NULL : si l'op originale a été
    // saisie sans préciser le volume par contenant (volume implicite
    // « tout le contenu »), la corrective doit forcer une valeur explicite.
    // Sans ça, _wb3_apply_op_effects (mig 035) côté destination
    // exécute UPDATE volume_hl = COALESCE(v_lc,0) + COALESCE(NULL,0) = 0
    // → la cuve récupère une ligne lot_contenants avec volume=0 au lieu
    // du volume attendu.
    // Stratégie : pour chaque contenant sans volume, prendre le volume
    // courant de lot_contenants du lot principal au moment de la lecture.
    // Note : c'est une heuristique pour les flow 1-lot. Pour les assemblages
    // complexes multi-lots × multi-contenants, l'utilisateur doit valider
    // manuellement (preview mode).
    const principalLotId = (op.operation_lots || [])
      .find(ol => ol.role !== 'destination')?.lot_id
      || (op.operation_lots || [])[0]?.lot_id
      || null;
    let resolvedVols = {}; // contenant_id → volume_hl courant pour ce lot
    if (principalLotId) {
      const { data: lcs } = await client
        .from('lot_contenants')
        .select('contenant_id, volume_hl')
        .eq('lot_id', principalLotId).eq('tenant_id', tenantId);
      (lcs || []).forEach(lc => { resolvedVols[lc.contenant_id] = Number(lc.volume_hl); });
    }
    const resolveVol = (oc) => {
      if (oc.volume_hl != null) return oc.volume_hl;
      // Si la source (post-swap = ancienne destination) a un volume
      // résolu via lot_contenants, on l'utilise pour les deux côtés.
      const swapped = swapRole(oc.role);
      // Pour la source (avant swap = destination originale), on prend
      // le volume actuel dans cette cuve.
      const v = resolvedVols[oc.contenant_id];
      return (v != null && v > 0) ? v : oc.volume_hl;
    };

    const lots = (op.operation_lots || []).map(ol => ({
      lot_id:    ol.lot_id,
      role:      swapRole(ol.role),
      volume_hl: ol.volume_hl,
    }));
    const contenants = (op.operation_contenants || []).map(oc => ({
      contenant_id: oc.contenant_id,
      role:         swapRole(oc.role),
      volume_hl:    resolveVol(oc),
    }));
    // Produits : on NE recopie PAS (annuler un sulfitage en re-désulfitant
    // n'a aucun sens physique — les types reversible ici ne portent
    // normalement pas de produits, c'est défense-en-profondeur).
    const produits = [];

    const todayIso = new Date().toISOString().slice(0, 10);
    const payload = {
      type_operation:  op.type_operation,
      date_operation:  todayIso,
      heure_operation: null,
      reference:       (op.reference ? op.reference + ' — CORR' : 'CORR ' + sourceOpId.slice(0, 8)),
      operateur:       op.operateur || null,
      statut:          'realise',
      volume_hl:       op.volume_hl,
      notes:           'Opération corrective inverse de ' + sourceOpId
                       + (op.notes ? ' (note source : ' + op.notes + ')' : ''),
      meta:            { corrective_of: sourceOpId },
    };

    if (mode === 'preview') {
      return { payload, lots, contenants, produits, sourceOpId };
    }
    // mode === 'apply'
    // Socle 2 : si l'op source porte des produits, la corrective DOIT pouvoir
    // ré-incrémenter le stock atomiquement (RPC 050). On le vérifie AVANT de
    // créer quoi que ce soit → pas d'état incohérent (op créée / stock non
    // restauré) en prod. En WB3_DEV_MODE, le fallback non atomique reste permis.
    const originalProds = op.operation_produits || [];
    if (originalProds.length) {
      await requireCapability('wb3_corrective_stock_restore');
    }
    const savedId = await saveOperationGraphAtomic(payload, { opId: null, lots, contenants, produits });

    // R4 — Ré-incrémenter le stock produit si l'op source avait des produits.
    // Voie privilégiée : RPC SQL wb3_corrective_stock_restore (mig 050)
    // → SELECT FOR UPDATE atomique + idempotent via meta.stock_restored_at.
    // Fallback UPDATE JS direct (non atomique) : RÉSERVÉ AU MODE DEV
    // (window.WB3_DEV_MODE = true). En prod, la capacité a déjà été exigée
    // plus haut (requireCapability) → on n'arrive ici avec PGRST202 qu'en
    // dev local avant migration 050.
    if (originalProds.length) {
      const { error: rpcErr } = await client.rpc('wb3_corrective_stock_restore', {
        p_tenant_id:        tenantId,
        p_corrective_op_id: savedId,
      });
      if (rpcErr) {
        if (rpcErr.code === 'PGRST202' && global.WB3_DEV_MODE) {
          // Fallback DEV uniquement : mig 050 pas encore appliquée. Pattern
          // identique mais non atomique (race condition théorique).
          console.warn('[WB3-DEV corrective] RPC 050 introuvable, fallback UPDATE direct (WB3_DEV_MODE=true)');
          for (const op_prod of originalProds) {
            if (!op_prod.produit_lot_id || !(Number(op_prod.quantite) > 0)) continue;
            try {
              const { data: pl, error: rE } = await client
                .from('produits_lots')
                .select('id, quantite_actuelle')
                .eq('id', op_prod.produit_lot_id).eq('tenant_id', tenantId)
                .single();
              if (rE || !pl) {
                console.warn('[WB3 corrective] produit_lot introuvable :', op_prod.produit_lot_id);
                continue;
              }
              const newStock = (Number(pl.quantite_actuelle) || 0) + Number(op_prod.quantite);
              const { error: uE } = await client
                .from('produits_lots')
                .update({ quantite_actuelle: newStock })
                .eq('id', op_prod.produit_lot_id).eq('tenant_id', tenantId);
              if (uE) console.warn('[WB3 corrective] update stock KO :', uE);
            } catch (e) {
              console.warn('[WB3 corrective] ré-incrément stock KO :', e);
            }
          }
        } else if (rpcErr.code === 'PGRST202') {
          // PGRST202 hors dev : la RPC 050 manque mais la capacité n'a pas
          // pu être vérifiée en amont (introspection indisponible). On le
          // signale fort plutôt que de laisser un stock non restauré en
          // silence (l'op corrective est créée et tracée — auditable).
          console.error('[WB3 corrective] RPC 050 absente — stock NON restauré :', rpcErr);
          throw new Error('[WB3] Stock produit non restauré : migration 050 requise. L\'opération corrective a été créée mais le stock n\'a pas pu être ré-incrémenté. Contactez l\'administrateur.');
        } else {
          console.warn('[WB3 corrective] RPC stock_restore KO :', rpcErr);
        }
      }
    }

    return savedId;
  }

  // ── Apport atomique via RPC (migration 084 — P4) ──────────────
  // Upsert apport + matérialisation cuve + journal lot_mouvements dans
  // UNE transaction Postgres. Remplace insertRow/updateRow('apports')
  // + la matérialisation best-effort côté client (supprimée) :
  //   création  → entrée en cuve journalisée (sens='entree')
  //   édition   → resynchronisation par delta (l'ancien code ne
  //               resynchronisait JAMAIS à l'édition)
  //   statut='annule' → démat + journal 'sortie' (idempotent)
  // Retourne { ok, apport, warnings[] } — warnings = capacité dépassée
  // ou désynchronisation historique détectée (non bloquants).
  async function applyApport(payload, { apportId = null } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    await requireCapability('wb3_apply_apport');
    const { data, error } = await client.rpc('wb3_apply_apport', {
      p_tenant_id: tenantId,
      p_apport_id: apportId,
      p_apport:    payload,
    });
    if (error) {
      if (error.code === 'PGRST202') {
        throw new Error('[WB3] wb3_apply_apport introuvable — migration 084 requise.');
      }
      throw error;
    }
    return data;
  }

  // ── Réception coopérative (mig 090 — bilan journalier) ────────
  // Rattache (ou édite) une cuve de jus à un bilan jour. typeJus ∈
  // egouttage|presse|autre. Crée l'entête du jour si absente.
  async function receptionRattacher(date, contenantId, typeJus, volumeHl,
                                    { lotId = null, source = 'baremage', ligneId = null } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_reception_rattacher', {
      p_tenant_id: tenantId, p_date: date, p_contenant_id: contenantId,
      p_type_jus: typeJus, p_volume_hl: volumeHl,
      p_lot_id: lotId, p_source: source, p_ligne_id: ligneId,
    });
    if (error) {
      if (error.code === 'PGRST202') throw new Error('[WB3] wb3_reception_rattacher introuvable — migration 090 requise.');
      throw error;
    }
    return data;
  }

  async function receptionDetacher(ligneId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { error } = await client.rpc('wb3_reception_detacher', {
      p_tenant_id: tenantId, p_ligne_id: ligneId,
    });
    if (error) throw error;
    return true;
  }

  async function receptionSetStatut(date, statut) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_reception_set_statut', {
      p_tenant_id: tenantId, p_date: date, p_statut: statut,
    });
    if (error) throw error;
    return data;
  }

  // Cuves où du jus est entré le jour J + flag rattaché (mig 091).
  // Filet anti-oubli. Best-effort : RPC absente → tableau vide.
  async function receptionCandidats(date) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_reception_candidats', {
      p_tenant_id: tenantId, p_date: date,
    });
    if (error) {
      if (error.code === 'PGRST202') return [];
      throw error;
    }
    return data || [];
  }

  // Bilan(s) réception jour (vue v_bilan_reception_jour). Optionnel from/to.
  async function queryBilanReceptionJour({ from = null, to = null } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client.from('v_bilan_reception_jour').select('*').eq('tenant_id', tenantId);
    if (from) q = q.gte('date_reception', from);
    if (to)   q = q.lte('date_reception', to);
    const { data, error } = await q.order('date_reception', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // Lignes de rattachement (cuves) d'un bilan jour, avec nom de cuve.
  async function listReceptionCuves(receptionJourId) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client
      .from('reception_jour_cuve')
      .select('*, contenants(id,nom,type,capacite_hl)')
      .eq('tenant_id', tenantId).eq('reception_jour_id', receptionJourId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // Suggestions d'autocomplétion apport (mig 089) : valeurs distinctes
  // apporteur / provenance / cépage du tenant pour les datalists du
  // formulaire (anti-fautes de frappe, sans référentiel structuré).
  // Best-effort : si la RPC manque (089 non appliquée), listes vides.
  async function apportSuggestions() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_apport_suggestions', { p_tenant_id: tenantId });
    if (error) {
      if (error.code === 'PGRST202') return { apporteurs: [], provenances: [], cepages: [] };
      throw error;
    }
    return data || { apporteurs: [], provenances: [], cepages: [] };
  }

  // Annuler un apport (statut → 'annule', non supprimé).
  // Depuis la mig 084 : simple délégation à la RPC atomique, qui défait
  // la matérialisation en cuve ET journalise la sortie dans
  // lot_mouvements. Idempotent (no-op volumique si déjà annulé).
  async function cancelApport(id) {
    const res = await applyApport({ statut: 'annule' }, { apportId: id });
    return res.apport;
  }

  // ── État de la cave à une date passée (migration 087 — P7) ────
  // Reconstruction par rejeu inverse du journal lot_mouvements depuis
  // l'état actuel. Retourne { ok, date, fiabilite, borne_fiabilite,
  // volumes_null_ignores, lignes:[{contenant_*, lot_*, volume_hl}] }.
  // fiabilite='partielle' si date < borne de scellement (2026-06-12).
  async function etatCaveAt(dateStr) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    await requireCapability('wb3_etat_cave_at');
    const { data, error } = await client.rpc('wb3_etat_cave_at', {
      p_tenant_id: tenantId,
      p_date:      dateStr,
    });
    if (error) {
      if (error.code === 'PGRST202') {
        throw new Error('[WB3] wb3_etat_cave_at introuvable — migration 087 requise.');
      }
      throw error;
    }
    return data;
  }

  // ── Scission de lot via RPC (migration 086 — P6) ──────────────
  // Le contenu d'une cuve passe du lot source à un NOUVEAU lot (numéro
  // auto, filiation 'manual', couple sortie/entrée journalisé dans
  // lot_mouvements) — atomique. Remplace le repointage DELETE+INSERT
  // client-side de cuverie.html. Exige que le lot source existe encore
  // dans une autre cuve (sinon : simple renommage, refusé par la RPC).
  async function scissionLot(lotSourceId, contenantId, nouveauNom) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    await requireCapability('wb3_scission_lot');
    const { data, error } = await client.rpc('wb3_scission_lot', {
      p_tenant_id:     tenantId,
      p_lot_source_id: lotSourceId,
      p_contenant_id:  contenantId,
      p_nouveau_nom:   nouveauNom,
    });
    if (error) {
      if (error.code === 'PGRST202') {
        throw new Error('[WB3] wb3_scission_lot introuvable — migration 086 requise.');
      }
      throw error;
    }
    return data; // { ok, lot }
  }

  // ── Soft-delete uniforme (archived_at) ────────────────────────
  // Archive une ligne au lieu de la supprimer (traçabilité préservée).
  // table ∈ SOFT_DELETE_TABLES. Réversible via restore().
  async function softDelete(table, id) {
    if (!SOFT_DELETE_TABLES.has(table)) {
      throw new Error(`[WB3] softDelete non supporté pour la table "${table}"`);
    }
    return updateRow(table, id, { archived_at: new Date().toISOString() });
  }

  // Restaure une ligne archivée (archived_at → NULL).
  async function restore(table, id) {
    if (!SOFT_DELETE_TABLES.has(table)) {
      throw new Error(`[WB3] restore non supporté pour la table "${table}"`);
    }
    return updateRow(table, id, { archived_at: null });
  }

  // Export JSON complet du tenant courant (via RPC wb3_export_tenant).
  async function exportTenant() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_export_tenant', {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    return data;
  }

  // ----------------------------------------------------------
  // API domaine : synchronisation de graphes métier (delta)
  //
  // Principe : calcul de toInsert / toUpdate / toDelete au lieu
  // de "supprimer tout + réinsérer". Respecte les policies DELETE
  // durcies sur les tables de liaison (admin + oenologue uniquement).
  // ----------------------------------------------------------

  // Helpers internes partagés par les sync
  function _checkResults(results) {
    for (const r of results) { if (r && r.error) throw r.error; }
  }

  // ── lot_cepages ───────────────────────────────────────────
  // Pas de tenant_id propre : sécurité assurée par RLS via lot_id.
  // DELETE restreint aux rôles privilégiés (migration 016).
  // desiredCepages : [{ cepage_id, pourcentage }]
  async function syncLotCepages(lotId, desiredCepages) {
    const valid = (desiredCepages || []).filter(d => d.cepage_id);

    const { data: current, error } = await client
      .from('lot_cepages')
      .select('cepage_id, pourcentage')
      .eq('lot_id', lotId);
    if (error) throw error;

    const currentMap = new Map(current.map(c => [c.cepage_id, c]));
    const desiredMap = new Map(valid.map(d => [d.cepage_id, d]));

    const toDelete = current.filter(c => !desiredMap.has(c.cepage_id));
    const toInsert = valid.filter(d => !currentMap.has(d.cepage_id));
    const toUpdate = valid.filter(d => {
      const c = currentMap.get(d.cepage_id);
      return c && String(c.pourcentage ?? '') !== String(d.pourcentage ?? '');
    });

    _checkResults(await Promise.all([
      ...toDelete.map(c =>
        client.from('lot_cepages').delete()
          .eq('lot_id', lotId).eq('cepage_id', c.cepage_id)
      ),
      ...toInsert.map(d =>
        client.from('lot_cepages').insert({
          lot_id: lotId, cepage_id: d.cepage_id,
          pourcentage: d.pourcentage ?? null,
        })
      ),
      ...toUpdate.map(d =>
        client.from('lot_cepages').update({ pourcentage: d.pourcentage ?? null })
          .eq('lot_id', lotId).eq('cepage_id', d.cepage_id)
      ),
    ]));
  }

  // ── lot_contenants ────────────────────────────────────────
  // desiredContenants : [{ lc_id?, contenant_id, volume_hl }]
  // lc_id = lot_contenants.id — null pour les nouvelles lignes
  async function syncLotContenants(lotId, desiredContenants) {
    const tenantId = requireTenant();
    const valid = (desiredContenants || []).filter(d => d.contenant_id);

    const { data: current, error } = await client
      .from('lot_contenants')
      .select('id, contenant_id, volume_hl')
      .eq('lot_id', lotId)
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const keepIds = new Set(valid.filter(d => d.lc_id).map(d => d.lc_id));
    const toDelete = current.filter(c => !keepIds.has(c.id));
    const toInsert = valid.filter(d => !d.lc_id);
    const toUpdate = valid.filter(d => {
      if (!d.lc_id) return false;
      const c = current.find(c => c.id === d.lc_id);
      return c && (c.volume_hl ?? null) !== (d.volume_hl ?? null);
    });

    const today = new Date().toISOString().slice(0, 10);
    _checkResults(await Promise.all([
      ...toDelete.map(c =>
        client.from('lot_contenants').delete()
          .eq('id', c.id).eq('tenant_id', tenantId)
      ),
      ...toInsert.map(d =>
        client.from('lot_contenants').insert({
          lot_id: lotId, contenant_id: d.contenant_id,
          tenant_id: tenantId, volume_hl: d.volume_hl ?? null,
          date_affectation: today,
        })
      ),
      ...toUpdate.map(d =>
        client.from('lot_contenants').update({ volume_hl: d.volume_hl ?? null })
          .eq('id', d.lc_id).eq('tenant_id', tenantId)
      ),
    ]));
  }

  // ── Orchestrateur lot complet ─────────────────────────────
  // Retourne l'id du lot créé ou mis à jour.
  async function saveLotGraph(lotPayload, { lotId = null, cepages = [], contenants = [] } = {}) {
    let id = lotId;
    if (id) {
      await updateRow('lots', id, lotPayload);
    } else {
      const row = await insertRow('lots', lotPayload);
      id = row.id;
    }
    await Promise.all([
      syncLotCepages(id, cepages),
      syncLotContenants(id, contenants),
    ]);
    return id;
  }

  // ── operation_lots ────────────────────────────────────────
  // desiredLots : [{ lot_id, role, volume_hl }]
  // Clé naturelle : (lot_id, role)
  async function syncOperationLots(operationId, desiredLots) {
    const tenantId = requireTenant();
    const valid = (desiredLots || []).filter(d => d.lot_id);

    const { data: current, error } = await client
      .from('operation_lots')
      .select('id, lot_id, role, volume_hl')
      .eq('operation_id', operationId)
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const nk = r => `${r.lot_id}::${r.role}`;
    const currentMap = new Map(current.map(c => [nk(c), c]));
    const desiredMap = new Map(valid.map(d => [nk(d), d]));

    const toDelete = current.filter(c => !desiredMap.has(nk(c)));
    const toInsert = valid.filter(d => !currentMap.has(nk(d)));
    const toUpdate = valid.filter(d => {
      const c = currentMap.get(nk(d));
      return c && (c.volume_hl ?? null) !== (d.volume_hl ?? null);
    });

    _checkResults(await Promise.all([
      ...toDelete.map(c =>
        client.from('operation_lots').delete()
          .eq('id', c.id).eq('tenant_id', tenantId)
      ),
      ...toInsert.map(d =>
        client.from('operation_lots').insert({
          operation_id: operationId, lot_id: d.lot_id, role: d.role,
          volume_hl: d.volume_hl ?? null, tenant_id: tenantId,
        })
      ),
      ...toUpdate.map(d => {
        const c = currentMap.get(nk(d));
        return client.from('operation_lots').update({ volume_hl: d.volume_hl ?? null })
          .eq('id', c.id).eq('tenant_id', tenantId);
      }),
    ]));
  }

  // ── operation_contenants ──────────────────────────────────
  // desiredContenants : [{ contenant_id, role, volume_hl }]
  // Clé naturelle : (contenant_id, role)
  async function syncOperationContenants(operationId, desiredContenants) {
    const tenantId = requireTenant();
    const valid = (desiredContenants || []).filter(d => d.contenant_id);

    const { data: current, error } = await client
      .from('operation_contenants')
      .select('id, contenant_id, role, volume_hl')
      .eq('operation_id', operationId)
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const nk = r => `${r.contenant_id}::${r.role}`;
    const currentMap = new Map(current.map(c => [nk(c), c]));
    const desiredMap = new Map(valid.map(d => [nk(d), d]));

    const toDelete = current.filter(c => !desiredMap.has(nk(c)));
    const toInsert = valid.filter(d => !currentMap.has(nk(d)));
    const toUpdate = valid.filter(d => {
      const c = currentMap.get(nk(d));
      return c && (c.volume_hl ?? null) !== (d.volume_hl ?? null);
    });

    _checkResults(await Promise.all([
      ...toDelete.map(c =>
        client.from('operation_contenants').delete()
          .eq('id', c.id).eq('tenant_id', tenantId)
      ),
      ...toInsert.map(d =>
        client.from('operation_contenants').insert({
          operation_id: operationId, contenant_id: d.contenant_id, role: d.role,
          volume_hl: d.volume_hl ?? null, tenant_id: tenantId,
        })
      ),
      ...toUpdate.map(d => {
        const c = currentMap.get(nk(d));
        return client.from('operation_contenants').update({ volume_hl: d.volume_hl ?? null })
          .eq('id', c.id).eq('tenant_id', tenantId);
      }),
    ]));
  }

  // ── operation_produits ────────────────────────────────────
  // desiredProduits : [{ produit_lot_id, quantite, unite }]
  // Clé naturelle : produit_lot_id (un seul lot produit par opération)
  async function syncOperationProduits(operationId, desiredProduits) {
    const tenantId = requireTenant();
    const valid = (desiredProduits || []).filter(d => d.produit_lot_id);

    const { data: current, error } = await client
      .from('operation_produits')
      .select('id, produit_lot_id, quantite, unite')
      .eq('operation_id', operationId)
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const currentMap = new Map(current.map(c => [c.produit_lot_id, c]));
    const desiredMap = new Map(valid.map(d => [d.produit_lot_id, d]));

    const toDelete = current.filter(c => !desiredMap.has(c.produit_lot_id));
    const toInsert = valid.filter(d => !currentMap.has(d.produit_lot_id));
    const toUpdate = valid.filter(d => {
      const c = currentMap.get(d.produit_lot_id);
      return c && (
        (c.quantite ?? null) !== (d.quantite ?? null) ||
        (c.unite ?? '') !== (d.unite ?? '')
      );
    });

    _checkResults(await Promise.all([
      ...toDelete.map(c =>
        client.from('operation_produits').delete()
          .eq('id', c.id).eq('tenant_id', tenantId)
      ),
      ...toInsert.map(d =>
        client.from('operation_produits').insert({
          operation_id: operationId, produit_lot_id: d.produit_lot_id,
          quantite: d.quantite ?? null, unite: d.unite ?? null, tenant_id: tenantId,
        })
      ),
      ...toUpdate.map(d => {
        const c = currentMap.get(d.produit_lot_id);
        return client.from('operation_produits')
          .update({ quantite: d.quantite ?? null, unite: d.unite ?? null })
          .eq('id', c.id).eq('tenant_id', tenantId);
      }),
    ]));
  }

  // ── Orchestrateur opération complète ─────────────────────
  // Retourne l'id de l'opération créée ou mise à jour.
  async function saveOperationGraph(opPayload, { opId = null, lots = [], contenants = [], produits = [] } = {}) {
    let id = opId;
    if (id) {
      await updateRow('operations', id, opPayload);
    } else {
      const row = await insertRow('operations', opPayload);
      id = row.id;
    }
    await Promise.all([
      syncOperationLots(id, lots),
      syncOperationContenants(id, contenants),
      syncOperationProduits(id, produits),
    ]);
    return id;
  }

  // ── produits_lots ─────────────────────────────────────────
  // desiredLots : [{ id?, numero_lot, quantite_initiale, quantite_actuelle, unite, dluo }]
  // id = produits_lots.id — null pour les nouvelles lignes
  async function saveProduitLotsGraph(produitId, desiredLots) {
    const tenantId = requireTenant();
    const desired = desiredLots || [];

    const { data: current, error } = await client
      .from('produits_lots')
      .select('id')
      .eq('produit_id', produitId)
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const keepIds = new Set(desired.filter(d => d.id).map(d => d.id));
    const toDelete = current.filter(c => !keepIds.has(c.id));
    const toInsert = desired.filter(d => !d.id);
    const toUpdate = desired.filter(d => d.id);

    await Promise.all([
      ...toDelete.map(c => deleteRow('produits_lots', c.id)),
      ...toInsert.map(d => {
        const { id: _id, ...rest } = d;
        return insertRow('produits_lots', { produit_id: produitId, ...rest });
      }),
      ...toUpdate.map(d => {
        const { id, ...rest } = d;
        return updateRow('produits_lots', id, rest);
      }),
    ]);
  }

  // ── Import batch apports ──────────────────────────────────
  // apportRows : tableau de lignes SANS tenant_id — le service le pose.
  // Insertion par batches de 100 pour respecter les limites PostgREST.
  // Retourne le nombre de lignes insérées.
  async function importApportsBatch(apportRows) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const rows = apportRows.map(r => ({ ...r, tenant_id: tenantId }));
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await client.from('apports').insert(rows.slice(i, i + 100));
      if (error) throw error;
      inserted += Math.min(100, rows.length - i);
    }
    return inserted;
  }

  // ── Orchestrateur lot atomique via RPC (migration 020) ────
  // Équivalent transactionnel de saveLotGraph : lot + cépages + contenants
  // validés ou annulés ensemble dans une transaction Postgres.
  // Signature identique à saveLotGraph.
  // En environnement consolidé (migrations 020+ appliquées) : aucun fallback.
  // En dev local avant migrations : définir window.WB3_DEV_MODE = true pour activer le fallback JS.
  async function saveLotGraphAtomic(lotPayload, { lotId = null, cepages = [], contenants = [], motif = null } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    // mig 085 (P5) : signature avec p_motif — les deltas de volume sont
    // journalisés dans lot_mouvements, motif obligatoire au-delà de
    // AJUSTEMENT_SEUILS.MINEUR (0,5 % — seuil dupliqué côté SQL).
    await requireCapability('wb3_save_lot_graph_motif');
    const { data, error } = await client.rpc('wb3_save_lot_graph', {
      p_tenant_id:  tenantId,
      p_lot_id:     lotId,
      p_lot:        lotPayload,
      p_cepages:    cepages,
      p_contenants: contenants,
      p_motif:      motif || null,
    });
    if (error) {
      if (error.code === 'PGRST202') {
        if (window.WB3_DEV_MODE) {
          console.warn('[WB3-DEV] wb3_save_lot_graph introuvable — fallback JS non atomique (WB3_DEV_MODE=true)');
          return saveLotGraph(lotPayload, { lotId, cepages, contenants });
        }
        throw new Error('[WB3] wb3_save_lot_graph introuvable — migration 020 requise. Dev local : définissez window.WB3_DEV_MODE = true.');
      }
      throw error;
    }
    return data;
  }

  // ── Orchestrateur opération atomique via RPC (migration 022) ─
  // Équivalent transactionnel de saveOperationGraph.
  // Fallback dev uniquement via window.WB3_DEV_MODE = true.
  async function saveOperationGraphAtomic(opPayload, { opId = null, lots = [], contenants = [], produits = [] } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const { data, error } = await client.rpc('wb3_save_operation_graph', {
      p_tenant_id:  tenantId,
      p_op_id:      opId,
      p_op:         opPayload,
      p_lots:       lots,
      p_contenants: contenants,
      p_produits:   produits,
    });
    if (error) {
      if (error.code === 'PGRST202') {
        if (window.WB3_DEV_MODE) {
          console.warn('[WB3-DEV] wb3_save_operation_graph introuvable — fallback JS non atomique (WB3_DEV_MODE=true)');
          return saveOperationGraph(opPayload, { opId, lots, contenants, produits });
        }
        throw new Error('[WB3] wb3_save_operation_graph introuvable — migration 022 requise. Dev local : définissez window.WB3_DEV_MODE = true.');
      }
      throw error;
    }
    return data;
  }

  // ----------------------------------------------------------
  // Constantes ajustements (déclarées AVANT l'objet export car
  // référencées par celui-ci ; const non hoistée → sinon TDZ).
  // ----------------------------------------------------------

  // Seuils de justification (% absolu de variation)
  // Modifier ici pour changer les règles pour tout le logiciel.
  const AJUSTEMENT_SEUILS = {
    MINEUR:    0.5,   // <= 0.5 %  : motif court suffisant
    MODERE:    2.0,   // > 0.5 %  <= 2 %  : commentaire obligatoire
    IMPORTANT: 5.0,   // > 2 %    <= 5 %  : justification détaillée obligatoire
    // > 5 % : alerte critique + justification obligatoire
  };

  // Catalogue des types d'ajustement (pour partage avec le front)
  const AJUSTEMENT_TYPES = {
    complement_de_plein:      { icon: '💧', label: 'Complément de plein', sens: 'entree' },
    ouillage:                 { icon: '🪣', label: 'Ouillage',            sens: 'entree' },
    ajustement_volume:        { icon: '⚖️', label: 'Ajustement volume',  sens: 'auto'   },
    correction_jauge:         { icon: '📏', label: 'Correction de jauge', sens: 'auto'   },
    perte_technique:          { icon: '📉', label: 'Perte technique',     sens: 'sortie' },
    correction_administrative:{ icon: '📋', label: 'Correction admin.',   sens: 'audit'  },
  };

  // ----------------------------------------------------------
  // Exposition globale
  // ----------------------------------------------------------

  global.WB3DB = {
    // ⚠️ Client Supabase brut — usage avancé uniquement.
    // Toute requête directe DOIT inclure .eq('tenant_id', WB3DB.getCurrentTenantId()).
    // Préférer les méthodes domaine ci-dessous quand elles couvrent le besoin.
    client,

    // État
    getCurrentUser,
    getTenants,
    getCurrentTenant,
    getCurrentTenantId,
    getCurrentRole,
    isAdmin,
    isPrivileged,
    setCurrentTenant,
    _refreshUserContext,
    _setUserSync,

    // CRUD générique
    listTable,
    insertRow,
    updateRow,
    deleteRow,

    // Realtime
    subscribeTable,
    subscribeMany,

    // Préférences utilisateur
    getUserPref,
    setUserPref,

    // Requêtes domaine (jointures enrichies — à utiliser à la place de client.from())
    queryLots,
    queryCuverieData,
    queryCuverieEtat,
    queryAnalyses,
    queryAuditLog,
    queryOperations,
    getLotDetail,
    getContenantDetail,
    getProduitLots,
    queryProduitMouvements,
    getTolerances,
    setTolerance,
    resetTolerance,
    volumeFromMesure,
    getBaremage,
    listBaremages,
    saveBaremage,
    listModeles,
    saveModele,
    deleteModele,
    getModelePoints,
    replaceModelePoints,
    listRendementCepage,
    saveRendementCepage,
    deleteRendementCepage,
    queryRendementJourCepage,
    listEssaiDossiers,
    createEssaiDossier,
    renameEssaiDossier,
    moveEssaiDossier,
    deleteEssaiDossier,
    listEssais,
    getEssai,
    createEssai,
    updateEssai,
    deleteEssai,
    copyEssai,

    // Planning / fiches de travail (mig 064, Phase 4)
    listTaches,
    createTache,
    updateTache,
    setTacheStatut,
    deleteTache,
    copyTache,
    getFicheTravail,
    getOrCreateFicheTravail,
    saveFicheTravail,

    // Inventaire (cuves & produits, mig 066)
    listInventaires,
    createInventaire,
    addInventaireLignes,
    getInventaireLignes,
    updateInventaireLigne,
    setInventaireStatut,
    deleteInventaire,

    nextApportNumero,

    // Cycle de vie (annulation / archivage)
    archiveLot,
    cancelOperation,
    applyApport,
    apportSuggestions,
    receptionRattacher,
    receptionDetacher,
    receptionSetStatut,
    receptionCandidats,
    queryBilanReceptionJour,
    listReceptionCuves,
    cancelApport,
    scissionLot,
    etatCaveAt,
    createCorrectiveOperation,
    convertMultilotToAssemblage,
    softDelete,
    restore,

    // Export tenant complet
    exportTenant,

    // Contrôle de capacités backend (socle 2 + modules vendange 069)
    checkBackendCapabilities,
    requireCapability,
    checkModule,
    ensureModule,
    tenantModules: getTenantModulesMap,   // { module_key: enabled } pour la cave courante
    errMsg,

    // Autorisations fines par rôle (cf. PERMISSIONS.md)
    can,

    // Gestion des comptes (admin) — mig 073
    isAdmin,
    adminListMembers,
    adminSetMembership,
    adminRemoveMembership,
    adminCreateUser,

    // Plateforme — modules par cave (mig 074)
    isPlatformAdmin,
    platformListTenants,
    platformListTenantModules,
    platformSetTenantModule,

    // Numérotation
    nextLotNumeroApport,

    // Graphes métier (delta — remplacent les delete+reinsert)
    saveLotGraph,
    saveLotGraphAtomic,
    syncLotCepages,
    syncLotContenants,
    saveOperationGraph,
    saveOperationGraphAtomic,
    syncOperationLots,
    syncOperationContenants,
    syncOperationProduits,
    saveProduitLotsGraph,

    // Import batch
    importApportsBatch,

    // Filiation de lots
    queryLotFiliation,
    getLotChain,
    syncLotFiliation,

    // Parcours cuves
    queryLotContenantHistory,
    queryContenantLotHistory,
    lotInContenantAtDate,

    // Journal des mouvements physiques
    getLotMouvements,
    getContenantMouvements,

    // Recherche et timeline globale (traçabilité)
    searchEntities,
    getGlobalTimeline,

    // Contrôle qualité traçabilité
    runDiagnostics,

    // Ajustements de volume contrôlés
    AJUSTEMENT_SEUILS,
    AJUSTEMENT_TYPES,
    applyAjustement,
    getAjustements,
    getAjustementSeuils,
  };
  // ─────────────────────────────────────────────────────────────────
  // DIAGNOSTICS QUALITÉ TRAÇABILITÉ
  // Retourne { alertes: [], duree_ms: N }
  // Chaque alerte : { id, gravite, categorie, type, message, detail, entite, lien, detecte_le }
  // ─────────────────────────────────────────────────────────────────
  async function runDiagnostics() {
    ensureLoggedIn();
    const tenantId = requireTenant();
    const today = new Date().toISOString().slice(0, 10);
    const alertes = [];
    const t0 = performance.now();

    // Workflow 4 — Phase A.1 : charger les tolérances tenant (mig 056).
    // Fallback sur les valeurs historiques si la migration n'est pas appliquée.
    let _tol = {};
    try { _tol = await getTolerances(); } catch(_) {}
    const T = {
      ph_min:   Number(_tol.ph_min   ?? 2.8),
      ph_max:   Number(_tol.ph_max   ?? 4.2),
      tav_min:  Number(_tol.tav_min  ?? 7),
      tav_max:  Number(_tol.tav_max  ?? 17),
      av_max:   Number(_tol.av_max   ?? 1.5),
      so2_libre_max: Number(_tol.so2_libre_max ?? 120),
      temp_max: Number(_tol.temp_max ?? 30),
    };

    const OP_LBL = {
      soutirage:'Soutirage', assemblage:'Assemblage', sulfitage:'Sulfitage',
      collage:'Collage', filtration:'Filtration', levurage:'Levurage',
      enzymage:'Enzymage', chaptalisation:'Chaptalisation', acidification:'Acidification',
      desacidification:'Désacidification', malo:'Malo',
      mise_en_bouteille:'Mise en bouteille', autre:'Autre',
    };

    function add(gravite, categorie, type, message, detail, entite, lien) {
      alertes.push({
        id: `${type}_${entite?.id || alertes.length}`,
        gravite, categorie, type,
        message, detail: detail || null,
        entite: entite || null, lien: lien || null,
        detecte_le: today,
      });
    }

    // ── BATCH PARALLÈLE ────────────────────────────────────────────
    const [
      r_lots, r_lc, r_mvtSansOp, r_opsPlani,
      r_opsAnnulees, r_analysesOrph, r_analysesExt,
      r_opsSouts, r_apports, r_filiation, r_ajustsGros,
    ] = await Promise.allSettled([

      // Lots actifs
      client.from('lots')
        .select('id,nom,couleur,millesime,statut,volume_actuel_hl')
        .eq('tenant_id', tenantId)
        .not('statut', 'eq', 'sorti'),

      // lot_contenants (cohérence volumes + capacité cuves)
      client.from('lot_contenants')
        .select('lot_id,contenant_id,volume_hl,lots(id,nom,couleur,millesime,statut,volume_actuel_hl),contenants(id,nom,capacite_hl,type)')
        .eq('tenant_id', tenantId),

      // Mouvements sans opération liée
      client.from('lot_mouvements')
        .select('id,type_operation,date_mouvement,volume_hl,sens,lot:lots!lot_id(id,nom,couleur)')
        .eq('tenant_id', tenantId)
        .is('operation_id', null)
        .order('date_mouvement', { ascending: false })
        .limit(50),

      // Opérations brouillon dans le passé
      client.from('operations')
        .select('id,type_operation,date_operation,statut,reference,op_lots(lots(id,nom,couleur))')
        .eq('tenant_id', tenantId)
        .eq('statut', 'brouillon')
        .lt('date_operation', today)
        .order('date_operation', { ascending: false })
        .limit(50),

      // Opérations annulées (pour détecter mouvements résiduels)
      client.from('operations')
        .select('id,type_operation,date_operation,reference,op_lots(lots(id,nom,couleur))')
        .eq('tenant_id', tenantId)
        .eq('statut', 'annule')
        .order('date_operation', { ascending: false })
        .limit(200),

      // Analyses orphelines (ni lot ni contenant)
      client.from('analyses')
        .select('id,date_analyse,type_analyse')
        .eq('tenant_id', tenantId)
        .is('lot_id', null)
        .is('contenant_id', null),

      // Analyses aux valeurs analytiques extrêmes (seuils depuis wb3_tolerances)
      client.from('analyses')
        .select('id,date_analyse,ph,tav,acidite_volatile,so2_libre,temperature,lot:lots!lot_id(id,nom,couleur),contenant:contenants!contenant_id(id,nom)')
        .eq('tenant_id', tenantId)
        .or(`ph.lt.${T.ph_min},ph.gt.${T.ph_max},tav.lt.${T.tav_min},tav.gt.${T.tav_max},acidite_volatile.gt.${T.av_max},so2_libre.gt.${T.so2_libre_max},temperature.gt.${T.temp_max}`)
        .order('date_analyse', { ascending: false })
        .limit(50),

      // Ops soutirage/assemblage/filtration réalisées (pour détecter mouvement manquant)
      client.from('operations')
        .select('id,type_operation,date_operation,reference,op_lots(lots(id,nom,couleur))')
        .eq('tenant_id', tenantId)
        .eq('statut', 'realise')
        .in('type_operation', ['soutirage', 'assemblage', 'filtration', 'mise_en_bouteille'])
        .order('date_operation', { ascending: false })
        .limit(200),

      // Apports (pour vérifier si un lot a une origine connue)
      client.from('apports')
        .select('lot_id')
        .eq('tenant_id', tenantId),

      // Filiation (idem)
      client.from('lot_filiation')
        .select('lot_id')
        .eq('tenant_id', tenantId),

      // Ajustements importants (delta_pct absolu > 5%)
      client.from('ajustements_volume')
        .select('id,type_operation,delta_hl,delta_pct,motif,date_operation,lot:lots!lot_id(id,nom,couleur),contenant:contenants!contenant_id(id,nom)')
        .eq('tenant_id', tenantId)
        .or('delta_pct.gt.5,delta_pct.lt.-5')
        .order('date_operation', { ascending: false })
        .limit(30),
    ]);

    // ── EXTRACTION ─────────────────────────────────────────────────
    const lots         = r_lots.value?.data        || [];
    const lcs          = r_lc.value?.data          || [];
    const mvtsSansOp   = r_mvtSansOp.value?.data   || [];
    const opsPlani     = r_opsPlani.value?.data     || [];
    const opsAnnulees  = r_opsAnnulees.value?.data  || [];
    const analysesOrph = r_analysesOrph.value?.data || [];
    const analysesExt  = r_analysesExt.value?.data  || [];
    const opsSouts     = r_opsSouts.value?.data     || [];
    const apports      = r_apports.value?.data      || [];
    const filiation    = r_filiation.value?.data    || [];
    const ajustsGros   = r_ajustsGros.value?.data   || [];

    // ── CHECK 1 : Volume lot négatif ───────────────────────────────
    lots.filter(l => (l.volume_actuel_hl ?? 0) < 0).forEach(l => {
      add('critique', 'volumes', 'lot_volume_negatif',
        `Volume négatif sur le lot "${l.nom}"`,
        `Volume actuel : ${Number(l.volume_actuel_hl).toFixed(2)} hL — probablement un mouvement de sortie non compensé`,
        { type: 'lot', id: l.id, nom: l.nom },
        `lot-detail.html?id=${l.id}`);
    });

    // ── CHECK 2 : Cohérence volume lot vs somme lot_contenants ─────
    const lotVolMap = {};
    lcs.forEach(lc => {
      if (!lc.lots) return;
      if (!lotVolMap[lc.lot_id]) lotVolMap[lc.lot_id] = { lot: lc.lots, sum: 0 };
      lotVolMap[lc.lot_id].sum += Number(lc.volume_hl) || 0;
    });
    Object.values(lotVolMap).forEach(({ lot, sum }) => {
      if (lot.statut === 'sorti' || lot.statut === 'conditionne') return;
      const actuel = Number(lot.volume_actuel_hl) || 0;
      const diff = Math.abs(actuel - sum);
      if (diff < 0.5) return;
      add(diff > 10 ? 'critique' : 'avertissement', 'volumes', 'lot_volume_incoherent',
        `Volume incohérent sur le lot "${lot.nom}" : ${actuel.toFixed(2)} hL déclaré, ${sum.toFixed(2)} hL en cuves`,
        `Écart de ${diff.toFixed(2)} hL — peut indiquer un mouvement non enregistré`,
        { type: 'lot', id: lot.id, nom: lot.nom },
        `lot-detail.html?id=${lot.id}`);
    });

    // ── CHECK 3 : Cuve dépassant sa capacité ──────────────────────
    const cuveVolMap = {};
    lcs.forEach(lc => {
      if (!lc.contenants) return;
      if (!cuveVolMap[lc.contenant_id]) cuveVolMap[lc.contenant_id] = { cont: lc.contenants, sum: 0 };
      cuveVolMap[lc.contenant_id].sum += Number(lc.volume_hl) || 0;
    });
    Object.values(cuveVolMap).forEach(({ cont, sum }) => {
      if (!cont.capacite_hl || cont.capacite_hl <= 0) return;
      const pct = (sum / cont.capacite_hl) * 100;
      if (pct > 100) {
        add('critique', 'volumes', 'contenant_depassement_capacite',
          `La cuve "${cont.nom}" dépasse sa capacité (${pct.toFixed(0)}% remplie)`,
          `${sum.toFixed(2)} hL stockés pour une capacité de ${cont.capacite_hl} hL`,
          { type: 'contenant', id: cont.id, nom: cont.nom },
          `contenant-detail.html?id=${cont.id}`);
      } else if (pct > 95) {
        add('info', 'volumes', 'contenant_quasi_plein',
          `La cuve "${cont.nom}" est quasi-pleine (${pct.toFixed(0)}%)`,
          `${sum.toFixed(2)} hL sur ${cont.capacite_hl} hL de capacité`,
          { type: 'contenant', id: cont.id, nom: cont.nom },
          `contenant-detail.html?id=${cont.id}`);
      }
    });

    // ── CHECK 4 : Mouvements sans opération liée ──────────────────
    mvtsSansOp.forEach(m => {
      const lot = m.lot;
      add('avertissement', 'tracabilite', 'mouvement_sans_operation',
        `Mouvement physique sans opération liée${lot ? ` sur le lot "${lot.nom}"` : ''}`,
        `${m.type_operation || m.sens || '?'} · ${m.volume_hl != null ? m.volume_hl + ' hL' : ''} · ${m.date_mouvement || ''}`,
        lot ? { type: 'lot', id: lot.id, nom: lot.nom } : null,
        lot ? `lot-detail.html?id=${lot.id}` : 'tracabilite.html');
    });

    // ── CHECK 5 : Opération planifiée non validée dans le passé ───
    opsPlani.forEach(op => {
      const firstLot = op.op_lots?.[0]?.lots;
      const daysLate = Math.floor((new Date(today) - new Date(op.date_operation)) / 86400000);
      add('avertissement', 'operations', 'operation_planifiee_passee',
        `${OP_LBL[op.type_operation] || op.type_operation || 'Opération'} planifiée non validée depuis ${daysLate} jour${daysLate > 1 ? 's' : ''}`,
        `Prévue le ${op.date_operation}${op.reference ? ` · Réf : ${op.reference}` : ''}`,
        firstLot
          ? { type: 'lot', id: firstLot.id, nom: firstLot.nom }
          : { type: 'operation', id: op.id, nom: op.reference || (OP_LBL[op.type_operation] || op.type_operation) },
        firstLot ? `lot-detail.html?id=${firstLot.id}` : 'operations.html');
    });

    // ── CHECK 6 : Analyses orphelines ─────────────────────────────
    analysesOrph.forEach(a => {
      add('avertissement', 'analyses', 'analyse_orpheline',
        `Analyse du ${a.date_analyse || '?'} sans lot ni cuve rattachée`,
        `Type : ${a.type_analyse || 'non précisé'} — rattacher cette analyse à un lot ou une cuve`,
        { type: 'analyse', id: a.id, nom: `Analyse du ${a.date_analyse || '?'}` },
        'analyses.html');
    });

    // ── CHECK 7 : Valeurs analytiques extrêmes ─────────────────────
    analysesExt.forEach(a => {
      const flags = [];
      if (a.ph != null && a.ph < T.ph_min)  flags.push(`pH ${a.ph} trop bas (min ${T.ph_min})`);
      if (a.ph != null && a.ph > T.ph_max)  flags.push(`pH ${a.ph} trop élevé (max ${T.ph_max})`);
      if (a.tav != null && a.tav < T.tav_min) flags.push(`TAV ${a.tav} %vol trop bas (min ${T.tav_min})`);
      if (a.tav != null && a.tav > T.tav_max) flags.push(`TAV ${a.tav} %vol trop élevé (max ${T.tav_max})`);
      if (a.acidite_volatile != null && a.acidite_volatile > T.av_max)
        flags.push(`AV ${a.acidite_volatile} g/L dépasse le seuil de ${T.av_max}`);
      if (a.so2_libre != null && a.so2_libre > T.so2_libre_max)
        flags.push(`SO₂ libre ${a.so2_libre} mg/L dépasse le seuil de ${T.so2_libre_max}`);
      if (a.temperature != null && a.temperature > T.temp_max)
        flags.push(`Température ${a.temperature}°C dépasse le seuil de ${T.temp_max}°C`);
      if (!flags.length) return;
      const ref = a.lot || a.contenant;
      const refType = a.lot ? 'lot' : 'contenant';
      const lien = a.lot
        ? `lot-detail.html?id=${a.lot.id}`
        : a.contenant ? `contenant-detail.html?id=${a.contenant.id}` : 'analyses.html';
      add('critique', 'analyses', 'analyse_valeur_extreme',
        `Valeur analytique anormale${ref ? ` sur "${ref.nom}"` : ''}`,
        flags.join(' · '),
        ref ? { type: refType, id: ref.id, nom: ref.nom }
            : { type: 'analyse', id: a.id, nom: `Analyse du ${a.date_analyse}` },
        lien);
    });

    // ── CHECK 8 : Lot à stade avancé sans origine connue ──────────
    const STATUTS_AVANCES = new Set(['vin', 'elevage', 'vin_filtre', 'pre_mise', 'conditionne']);
    const apportsIds   = new Set(apports.map(a => a.lot_id));
    const filiationIds = new Set(filiation.map(f => f.lot_id));
    lots.filter(l => STATUTS_AVANCES.has(l.statut)).forEach(l => {
      if (!apportsIds.has(l.id) && !filiationIds.has(l.id)) {
        add('avertissement', 'tracabilite', 'lot_sans_origine',
          `Le lot "${l.nom}" est au stade ${l.statut} sans origine connue`,
          `Aucun apport vendange ni filiation d\'assemblage enregistrés pour ce lot`,
          { type: 'lot', id: l.id, nom: l.nom },
          `tracabilite.html?id=${l.id}`);
      }
    });

    // ── CHECK 11 : Ajustements avec écart important (> 5%) ────────
    ajustsGros.forEach(a => {
      const pct  = Number(a.delta_pct);
      const sign = pct >= 0 ? '+' : '';
      const ref  = a.lot || a.contenant;
      const lien = a.lot
        ? `tracabilite.html?id=${a.lot.id}`
        : a.contenant ? `tracabilite.html?contenant=${a.contenant.id}` : 'tracabilite.html';
      add('avertissement', 'volumes', 'ajustement_volume_important',
        `Ajustement de cave important${ref ? ` sur "${ref.nom}"` : ''} : ${sign}${pct.toFixed(2)}%`,
        `${OP_LBL[a.type_operation] || a.type_operation} · écart ${sign}${Number(a.delta_hl).toFixed(2)} hL · ${a.date_operation}${a.motif ? ` · Motif : ${a.motif}` : ''}`,
        ref ? { type: a.lot ? 'lot' : 'contenant', id: ref.id, nom: ref.nom } : null,
        lien);
    });

    // ── BATCH 2 : Requêtes dépendantes ─────────────────────────────

    // CHECK 9 : Opérations annulées avec mouvements physiques résiduels
    if (opsAnnulees.length > 0) {
      const annuleeIds = opsAnnulees.map(o => o.id);
      const { data: mvtsAnn } = await client.from('lot_mouvements')
        .select('operation_id,lot:lots!lot_id(id,nom,couleur)')
        .eq('tenant_id', tenantId)
        .in('operation_id', annuleeIds);
      const annMvtMap = new Map();
      (mvtsAnn || []).forEach(m => { if (!annMvtMap.has(m.operation_id)) annMvtMap.set(m.operation_id, m.lot); });
      opsAnnulees.filter(op => annMvtMap.has(op.id)).forEach(op => {
        const lot = annMvtMap.get(op.id);
        add('critique', 'operations', 'operation_annulee_avec_effets',
          `Opération annulée avec des mouvements physiques non révoqués`,
          `${OP_LBL[op.type_operation] || op.type_operation} du ${op.date_operation}${op.reference ? ` · Réf : ${op.reference}` : ''} — vérifier et supprimer les mouvements liés`,
          lot ? { type: 'lot', id: lot.id, nom: lot.nom }
              : { type: 'operation', id: op.id, nom: op.reference || op.type_operation },
          lot ? `tracabilite.html?id=${lot.id}` : 'tracabilite.html');
      });
    }

    // CHECK 10 : Ops soutirage/assemblage réalisées sans mouvement physique
    if (opsSouts.length > 0) {
      const soutIds = opsSouts.map(o => o.id);
      const { data: mvtsForSouts } = await client.from('lot_mouvements')
        .select('operation_id')
        .eq('tenant_id', tenantId)
        .in('operation_id', soutIds);
      const opsWithMvt = new Set((mvtsForSouts || []).map(m => m.operation_id));
      opsSouts.filter(op => !opsWithMvt.has(op.id)).forEach(op => {
        const firstLot = op.op_lots?.[0]?.lots;
        add('avertissement', 'tracabilite', 'operation_sans_mouvement',
          `${OP_LBL[op.type_operation] || op.type_operation} réalisé(e) sans mouvement physique enregistré`,
          `Opération du ${op.date_operation}${op.reference ? ` · Réf : ${op.reference}` : ''} — le journal des mouvements est incomplet`,
          firstLot
            ? { type: 'lot', id: firstLot.id, nom: firstLot.nom }
            : { type: 'operation', id: op.id, nom: op.reference || (OP_LBL[op.type_operation] || op.type_operation) },
          firstLot ? `tracabilite.html?id=${firstLot.id}` : 'tracabilite.html');
      });
    }

    // ── TRI : critique > avertissement > info ──────────────────────
    const GRAV_ORDER = { critique: 0, avertissement: 1, info: 2 };
    alertes.sort((a, b) => GRAV_ORDER[a.gravite] - GRAV_ORDER[b.gravite]);

    return { alertes, duree_ms: Math.round(performance.now() - t0) };
  }

  // ─────────────────────────────────────────────────────────────────
  // AJUSTEMENTS DE VOLUME CONTRÔLÉS
  // (AJUSTEMENT_SEUILS / AJUSTEMENT_TYPES déclarés plus haut,
  //  juste avant l'objet export — voir section "Exposition globale")
  // ─────────────────────────────────────────────────────────────────

  // Applique un ajustement atomiquement via RPC Postgres
  async function applyAjustement({ operation_id, type, lot_id, contenant_id, delta_hl, volume_cible, motif, operateur, date }) {
    ensureLoggedIn();
    const tenantId = requireTenant();

    const { data, error } = await client.rpc('wb3_apply_ajustement', {
      p_tenant_id:    tenantId,
      p_operation_id: operation_id || null,
      p_type:         type,
      p_lot_id:       lot_id,
      p_contenant_id: contenant_id || null,
      p_delta_hl:     delta_hl    != null ? delta_hl    : null,
      p_volume_cible: volume_cible != null ? volume_cible : null,
      p_motif:        motif    || null,
      p_operateur:    operateur || null,
      p_date:         date     || new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
    if (data && !data.ok) throw new Error(data.message || 'Erreur lors de l\'ajustement');
    return data;
  }

  // Récupère le journal des ajustements (pour affichage dans fiches)
  async function getAjustements({ lot_id, contenant_id, operation_id, limit = 50 } = {}) {
    ensureLoggedIn();
    const tenantId = requireTenant();
    let q = client
      .from('ajustements_volume')
      .select('id,type_operation,lot_id,contenant_id,volume_avant_hl,volume_apres_hl,delta_hl,delta_pct,motif,operateur,date_operation,created_at,operation_id,lot:lots!lot_id(id,nom,couleur,millesime),contenant:contenants!contenant_id(id,nom,type)')
      .eq('tenant_id', tenantId)
      .order('date_operation', { ascending: false })
      .limit(limit);
    if (lot_id)       q = q.eq('lot_id', lot_id);
    if (contenant_id) q = q.eq('contenant_id', contenant_id);
    if (operation_id) q = q.eq('operation_id', operation_id);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // Seuils d'ajustement paramétrables : lit user_preferences si défini, sinon AJUSTEMENT_SEUILS
  async function getAjustementSeuils() {
    try {
      const prefs = await getUserPref('ajustement_seuils');
      if (prefs && typeof prefs === 'object' && prefs.MINEUR != null) {
        return { ...AJUSTEMENT_SEUILS, ...prefs };
      }
    } catch(_) {}
    return { ...AJUSTEMENT_SEUILS };
  }

})(window);
