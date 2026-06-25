/* wb3-ai.js — Client SSE pour la Edge Function wb3-ai
 *
 * Usage :
 *   const ai = new WB3AI({ onText, onToolStart, onToolDone, onDone, onError })
 *   await ai.ask("Quel est l'état de la cave ?")
 *   ai.abort()  // annule la requête en cours
 */

class WB3AI {
  constructor(callbacks = {}) {
    this._cb     = callbacks;   // { onText, onToolStart, onToolDone, onDone, onError }
    this._ctrl   = null;        // AbortController
    this._history = [];         // historique de la conversation (multi-tour)
  }

  reset() {
    this._history = [];
  }

  abort() {
    this._ctrl?.abort();
    this._ctrl = null;
  }

  // ask(text, { model: 'sonnet'|'haiku' })
  async ask(text, { model = 'sonnet' } = {}) {
    if (!text?.trim()) return;

    // Récupérer le JWT et le tenant courant depuis db.js
    const { data: { session } } = await WB3DB.client.auth.getSession();
    if (!session) { this._emit('error', { message: 'Non authentifié' }); return; }

    const tenantId = WB3DB.getCurrentTenant?.();
    if (!tenantId) { this._emit('error', { message: 'Aucun tenant sélectionné' }); return; }

    const supabaseUrl = window._WB3_CONFIG?.supabaseUrl ?? '';
    const fnUrl = `${supabaseUrl}/functions/v1/wb3-ai`;

    this._history.push({ role: 'user', content: text });
    this._ctrl = new AbortController();

    let resp;
    try {
      resp = await fetch(fnUrl, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type':  'application/json',
        },
        body:   JSON.stringify({ messages: this._history, tenant_id: tenantId, model }),
        signal: this._ctrl.signal,
      });
    } catch (e) {
      if (e.name !== 'AbortError') this._emit('error', { message: e.message });
      return;
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      this._emit('error', { message: err.error ?? `HTTP ${resp.status}` });
      return;
    }

    // Lire le flux SSE
    const reader  = resp.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';
    let   fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          switch (event.type) {
            case 'text':
              fullText += event.content;
              this._emit('text', event);
              break;
            case 'tool_start':
              this._emit('toolStart', event);
              break;
            case 'tool_done':
              this._emit('toolDone', event);
              break;
            case 'done':
              // Mémoriser la réponse complète pour le multi-tour
              if (fullText) {
                this._history.push({ role: 'assistant', content: fullText });
              }
              this._emit('done', event);
              break;
            case 'error':
              this._emit('error', event);
              break;
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') this._emit('error', { message: e.message });
    }
  }

  _emit(name, payload) {
    const fn = this._cb[`on${name.charAt(0).toUpperCase()}${name.slice(1)}`];
    if (typeof fn === 'function') fn(payload);
  }
}

window.WB3AI = WB3AI;
