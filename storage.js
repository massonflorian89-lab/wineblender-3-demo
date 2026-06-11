// ============================================================
// wb3-storage.js — Sauvegarde multi-backend robuste
// ------------------------------------------------------------
// Triple persistance pour éviter toute perte de données :
//   1. localStorage           — synchrone, immédiat
//   2. IndexedDB              — async, plus de capacité, survit mieux
//   3. File System Access API — écriture fichier disque (optionnel)
//
// Historique : 20 derniers snapshots horodatés, restaurables.
// ============================================================

(function(global) {
  'use strict';

  const DB_NAME = 'wb3_storage';
  const DB_VERSION = 1;
  const STORE_STATE = 'state';
  const STORE_HISTORY = 'history';
  const MAX_HISTORY = 20;
  const SNAPSHOT_MIN_INTERVAL_MS = 60 * 1000;  // 1 snapshot/minute max

  let dbPromise = null;
  const fileHandles = {};  // key -> FileSystemFileHandle

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_STATE)) {
          db.createObjectStore(STORE_STATE);
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
    return dbPromise;
  }

  async function idbPut(store, value, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      if (key !== undefined) tx.objectStore(store).put(value, key);
      else tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbGet(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGetAll(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbDelete(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  class WB3Storage {
    constructor(key) {
      this.key = key;
      this.lastSnapshotAt = 0;
      this.onStatusChange = null;   // (status: 'saving'|'saved'|'error', ts: number) => void
      this._saveQueue = Promise.resolve();
      this._pendingData = null;
    }

    /**
     * Sauvegarde coalescée : si plusieurs save() arrivent rapprochés,
     * seule la dernière version est écrite (évite les écritures redondantes).
     */
    save(data) {
      this._pendingData = data;
      this._saveQueue = this._saveQueue.then(() => this._flush());
      return this._saveQueue;
    }

    async _flush() {
      if (this._pendingData === null) return;
      const data = this._pendingData;
      this._pendingData = null;
      const ts = Date.now();

      if (this.onStatusChange) this.onStatusChange('saving', ts);

      let json;
      try { json = JSON.stringify(data); }
      catch(e) { if (this.onStatusChange) this.onStatusChange('error', ts); return; }

      // 1. localStorage (synchrone, fiable)
      try { localStorage.setItem(this.key, json); }
      catch(e) { console.warn('[WB3Storage] localStorage write failed:', e); }

      // 2. IndexedDB (async, capacité large)
      try { await idbPut(STORE_STATE, { data, ts }, this.key); }
      catch(e) { console.warn('[WB3Storage] IndexedDB write failed:', e); }

      // 3. Snapshot historique (throttled)
      if (ts - this.lastSnapshotAt > SNAPSHOT_MIN_INTERVAL_MS) {
        this.lastSnapshotAt = ts;
        try {
          await idbPut(STORE_HISTORY, { key: this.key, ts, data });
          await this._pruneHistory();
        } catch(e) { console.warn('[WB3Storage] Snapshot failed:', e); }
      }

      // 4. File System Access API (si activée)
      const handle = fileHandles[this.key];
      if (handle) {
        try {
          const writable = await handle.createWritable();
          await writable.write(json);
          await writable.close();
        } catch(e) {
          console.warn('[WB3Storage] File write failed:', e);
          // Perte d'autorisation probable → on désactive le handle
          if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
            delete fileHandles[this.key];
          }
        }
      }

      if (this.onStatusChange) this.onStatusChange('saved', ts);
    }

    /**
     * Charge l'état. Essaie localStorage puis IndexedDB.
     * Retourne null si aucune sauvegarde trouvée.
     */
    async load() {
      // 1. localStorage (rapide)
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) {
          const data = JSON.parse(raw);
          // Vérifier aussi IDB au cas où IDB aurait une version plus récente
          // (un autre onglet a sauvegardé pendant qu'on était fermé)
          try {
            const idbRec = await idbGet(STORE_STATE, this.key);
            if (idbRec && idbRec.ts) {
              // On privilégie la version localStorage si elle existe,
              // car c'est celle de l'onglet courant
            }
          } catch(_) {}
          return data;
        }
      } catch(e) { console.warn('[WB3Storage] localStorage read failed:', e); }

      // 2. Fallback IndexedDB
      try {
        const rec = await idbGet(STORE_STATE, this.key);
        if (rec && rec.data) return rec.data;
      } catch(e) { console.warn('[WB3Storage] IndexedDB read failed:', e); }

      return null;
    }

    async _pruneHistory() {
      try {
        const all = await idbGetAll(STORE_HISTORY);
        const forKey = all.filter(h => h.key === this.key).sort((a,b) => b.ts - a.ts);
        for (let i = MAX_HISTORY; i < forKey.length; i++) {
          await idbDelete(STORE_HISTORY, forKey[i].id);
        }
      } catch(e) { console.warn('[WB3Storage] Prune failed:', e); }
    }

    async getHistory() {
      try {
        const all = await idbGetAll(STORE_HISTORY);
        return all.filter(h => h.key === this.key).sort((a,b) => b.ts - a.ts);
      } catch(e) { return []; }
    }

    async restoreFromHistory(id) {
      try {
        const all = await idbGetAll(STORE_HISTORY);
        const snap = all.find(h => h.id === id);
        if (snap) {
          await this.save(snap.data);
          return snap.data;
        }
      } catch(e) { console.warn('[WB3Storage] Restore failed:', e); }
      return null;
    }

    async clearAll() {
      try { localStorage.removeItem(this.key); } catch(_) {}
      try { await idbDelete(STORE_STATE, this.key); } catch(_) {}
      try {
        const all = await idbGetAll(STORE_HISTORY);
        for (const h of all.filter(h => h.key === this.key)) {
          await idbDelete(STORE_HISTORY, h.id);
        }
      } catch(_) {}
      delete fileHandles[this.key];
    }

    /**
     * Active la sauvegarde fichier : l'utilisateur choisit un fichier .json
     * et à chaque save() le fichier est mis à jour sur disque.
     * Nécessite Chrome / Edge / Opera. Retourne true si activé.
     */
    async enableFileBackup(suggestedName) {
      if (!window.showSaveFilePicker) return { ok: false, reason: 'unsupported' };
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName || (this.key + '-backup.json'),
          types: [{ description: 'WB3 backup', accept: { 'application/json': ['.json'] } }],
        });
        fileHandles[this.key] = handle;
        return { ok: true, name: handle.name };
      } catch(e) {
        if (e.name === 'AbortError') return { ok: false, reason: 'cancelled' };
        return { ok: false, reason: e.message || 'error' };
      }
    }

    isFileBackupActive() {
      return !!fileHandles[this.key];
    }

    disableFileBackup() {
      delete fileHandles[this.key];
    }
  }

  global.WB3Storage = WB3Storage;

})(window);
