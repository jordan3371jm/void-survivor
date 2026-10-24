// Salvataggi tramite Playgama Bridge Storage (bridge.storage).
//
// Regola Playgama: i progressi NON vanno scritti direttamente in localStorage ma sempre
// tramite il modulo Storage del Bridge (salvataggio cloud dove la piattaforma lo offre).
//
// Come funziona:
//  - all'avvio (main.tsx) preloadStorage() legge le chiavi note con UNA sola chiamata
//    bridge.storage.get([...]) e le tiene in una cache in memoria;
//  - storageGetItem / storageSetItem lavorano in modo sincrono sulla cache, quindi il resto
//    del codice non cambia;
//  - le scritture sono raggruppate e inviate con UNA chiamata bridge.storage.set(chiavi, valori);
//  - le chiavi dinamiche (es. dati per utente) si caricano a richiesta con loadStorageKeys().

const cache = new Map<string, string>();
const dirty = new Set<string>();
const sessionMemory = new Map<string, string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

/** Chiavi fisse del gioco, caricate insieme all'avvio. */
export const STORAGE_KEYS = [
  'voidSurvivorsStore',
  'loginRewards',
  'dailyChallenges',
  'voidSurvivorsLocalUser',
  'voidSurvivorsLocalScores',
];

function storageApi(): any | null {
  try {
    const b = (window as any).bridge;
    return b && b.storage && typeof b.storage.get === 'function' ? b.storage : null;
  } catch {
    return null;
  }
}

function fill(keys: string[], res: any): void {
  keys.forEach((key, i) => {
    const v = Array.isArray(res) ? res[i] : res && typeof res === 'object' ? res[key] : null;
    if (v !== null && v !== undefined) cache.set(key, typeof v === 'string' ? v : JSON.stringify(v));
  });
}

/** Carica nella cache le chiavi indicate (se non ci sono gia'). Non lancia mai errori. */
export async function loadStorageKeys(keys: string[]): Promise<void> {
  const st = storageApi();
  const missing = keys.filter((k) => !cache.has(k));
  if (missing.length === 0) return;
  if (!st) {
    // Nessun Bridge (es. sito fuori da Playgama o prova in locale): senza questo i progressi si perdevano a ogni ricarica.
    for (const k of missing) {
      try { const v = window.localStorage.getItem(k); if (v !== null) cache.set(k, v); } catch { /* storage non disponibile */ }
    }
    return;
  }
  try {
    fill(missing, await st.get(missing));
  } catch (e) {
    console.warn('[Storage] lettura fallita per', missing, e);
  }
}

/** Da chiamare all'avvio, dopo l'inizializzazione del Bridge. */
export async function preloadStorage(): Promise<void> {
  attachListeners();
  await loadStorageKeys(STORAGE_KEYS);
}

export function storageGetItem(key: string): string | null {
  return cache.has(key) ? (cache.get(key) as string) : null;
}

/** Invia subito al Bridge tutte le modifiche in sospeso (una sola chiamata). */
export function flushStorage(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (dirty.size === 0) return;
  const keys = Array.from(dirty);
  dirty.clear();
  const st = storageApi();
  if (!st || typeof st.set !== 'function') {
    // Nessun Bridge: salva in localStorage come riserva.
    for (const k of keys) {
      try { const v = cache.get(k); if (v !== undefined) window.localStorage.setItem(k, v); } catch { /* quota piena o storage non disponibile */ }
    }
    return;
  }
  const requeue = () => keys.forEach((k) => dirty.add(k));
  try {
    const r = st.set(keys, keys.map((k) => cache.get(k)));
    if (r && typeof r.catch === 'function') r.catch(requeue);
  } catch {
    requeue();
  }
}

export function storageSetItem(key: string, value: string): void {
  attachListeners();
  cache.set(key, value);
  dirty.add(key);
  if (!flushTimer) flushTimer = setTimeout(flushStorage, 300);
}

export function storageRemoveItem(key: string): void {
  cache.delete(key);
  dirty.delete(key);
  const st = storageApi();
  if (!st || typeof st.delete !== 'function') {
    try { window.localStorage.removeItem(key); } catch { /* ignora */ }
    return;
  }
  try {
    const r = st.delete([key]);
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch {
    /* ignora */
  }
}

// Dati di sessione (non persistenti): restano solo in memoria
export function sessionGetItem(key: string): string | null {
  return sessionMemory.has(key) ? (sessionMemory.get(key) as string) : null;
}
export function sessionSetItem(key: string, value: string): void {
  sessionMemory.set(key, value);
}
export function sessionRemoveItem(key: string): void {
  sessionMemory.delete(key);
}

// Salva subito quando la scheda viene nascosta o chiusa
function attachListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushStorage(); });
  window.addEventListener('pagehide', flushStorage);
  window.addEventListener('beforeunload', flushStorage);
}
