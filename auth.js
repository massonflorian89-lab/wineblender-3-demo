// ============================================================
// wb3/auth.js — Authentification Supabase pour WineBlender 3
// ------------------------------------------------------------
// Gère login, logout, restauration de session, et notification
// des changements d'auth aux autres modules.
// ============================================================

(function(global) {
  'use strict';

  if (!global.WB3DB) {
    throw new Error('[WB3] db.js doit être chargé avant auth.js');
  }

  const client = global.WB3DB.client;
  const listeners = new Set();   // callbacks notifiés à chaque changement d'auth

  // Promesse résolue au tout premier événement onAuthStateChange (SIGNED_IN ou
  // INITIAL_SESSION). C'est la source de vérité fiable, contrairement à getSession()
  // qui peut pendre dans certaines versions du SDK Supabase.
  let _resolveFirstAuthEvent;
  let _firstAuthEventFired = false;
  const _firstAuthEvent = new Promise(resolve => { _resolveFirstAuthEvent = resolve; });
  setTimeout(() => {
    if (!_firstAuthEventFired)
      console.warn('[WB3 auth] _firstAuthEvent timeout 15s — aucun événement auth reçu');
    _resolveFirstAuthEvent(null);
  }, 15000);

  // ----------------------------------------------------------
  // API publique
  // ----------------------------------------------------------

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await global.WB3DB._refreshUserContext();
    notifyListeners();
    return data.user;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('wb3_current_tenant_id');
    await global.WB3DB._refreshUserContext();
    notifyListeners();
  }

  // Mot de passe oublié : envoie un email avec un lien de réinitialisation.
  // redirectTo = la page de connexion courante (app.html) → au clic sur le
  // lien, Supabase y revient avec un jeton et déclenche PASSWORD_RECOVERY.
  // ⚠️ L'URL doit figurer dans Supabase ▸ Authentication ▸ URL Configuration
  //    ▸ Redirect URLs, sinon le lien retombe sur le Site URL par défaut.
  async function requestPasswordReset(email) {
    const redirectTo = window.location.href.split('#')[0].split('?')[0];
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  // Après ouverture du lien de réinitialisation (session de récupération
  // active), définit le nouveau mot de passe du compte connecté.
  async function updatePassword(newPassword) {
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data.user;
  }

  async function getSession() {
    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  async function restoreSession() {
    console.log('[WB3 auth] restoreSession: en attente du premier événement auth…');
    await _firstAuthEvent;
    // _firstAuthEvent se débloque dès l'event auth, mais _refreshUserContext()
    // (memberships + tenants) tourne encore en arrière-plan dans onAuthStateChange.
    // On attend qu'il finisse pour que getCurrentTenant() retourne une valeur.
    await global.WB3DB._refreshUserContext();
    const user = global.WB3DB.getCurrentUser();
    console.log('[WB3 auth] restoreSession: prêt, user =', user?.email || 'null');
    notifyListeners();
    return user;
  }

  // Réception des événements d'auth Supabase (SIGNED_IN, INITIAL_SESSION, SIGNED_OUT…)
  client.auth.onAuthStateChange((event, session) => {
    console.log('[WB3 auth] onAuthStateChange:', event, session?.user?.email || 'no user');
    // 1. Pose state.user IMMÉDIATEMENT (sync) → restoreSession peut retourner avec le user
    global.WB3DB._setUserSync(session);
    // 2. Débloque restoreSession()
    _firstAuthEventFired = true;
    _resolveFirstAuthEvent(session);
    // 3. DEADLOCK supabase-js : NE JAMAIS await une requête client.from()
    //    À L'INTÉRIEUR du callback onAuthStateChange. Le callback s'exécute
    //    pendant que supabase-js tient son verrou auth interne ; une requête
    //    (qui réclame ce même verrou pour le token) se bloquerait jusqu'au
    //    timeout. On DIFFÈRE hors du callback (setTimeout 0) : le callback
    //    rend la main → le verrou se libère → la requête part instantanément.
    //    Le mutex _refreshInFlight côté db.js coalesce avec restoreSession().
    setTimeout(() => {
      Promise.resolve(global.WB3DB._refreshUserContext(session))
        .catch(e => console.warn('[WB3 auth] refresh contexte:', e?.message || e))
        .finally(() => notifyListeners(event, session)); // re-render UI quand tenants prêts
    }, 0);
  });

  // Inscription d'un listener pour réagir aux changements d'auth
  function onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function notifyListeners(event, session) {
    const user = global.WB3DB.getCurrentUser();
    listeners.forEach(cb => {
      try { cb({ user, event, session }); }
      catch(e) { console.error('[WB3 auth] Listener error:', e); }
    });
  }

  // ----------------------------------------------------------
  // Exposition globale
  // ----------------------------------------------------------

  global.WB3Auth = {
    signIn,
    signOut,
    getSession,
    restoreSession,
    onAuthChange,
    requestPasswordReset,
    updatePassword,
  };

})(window);
