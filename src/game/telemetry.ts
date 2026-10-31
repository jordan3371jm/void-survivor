// ---------------------------------------------------------------------------
// Telemetria Playgama: pochi eventi stabili per capire dove si fermano i giocatori.
// Tutto passa da bridge.analytics.send (nessun dato personale, nomi di eventi fissi).
// ---------------------------------------------------------------------------
import type { GameState } from './types';
import { storageGetItem, storageSetItem } from './storage';

export const GAME_VERSION = '1.8.1';
const TIME_MILESTONES = [180, 300, 600]; // 3, 5 e 10 minuti di partita

function send(name: string, data?: Record<string, string | number | boolean>): void {
  try {
    const a = (window as any).bridge?.analytics;
    if (a && typeof a.send === 'function') a.send(name, { game_version: GAME_VERSION, ...(data || {}) });
  } catch { /* la telemetria non deve mai bloccare il gioco */ }
}

function isFirstRun(): boolean { return storageGetItem('vs_runs_started') === null; }

interface RunTrack { mode: string; first: boolean; times: Set<number>; levelUp: boolean; bossSeen: boolean; bossesDone: number; ended: boolean; }
let run: RunTrack | null = null;

/** Inizio partita */
export function trackRunStart(mode: string): void {
  const first = isFirstRun();
  const n = Number(storageGetItem('vs_runs_started') || 0) + 1;
  storageSetItem('vs_runs_started', String(n));
  run = { mode, first, times: new Set(), levelUp: false, bossSeen: false, bossesDone: 0, ended: false };
  send('progression_started', { step_id: 'run', mode, first_run: first, run_index: Math.min(n, 50) });
}

/** Da chiamare a ogni frame dopo l'aggiornamento del gioco */
export function trackFrame(state: GameState): void {
  if (!run || run.ended) return;
  const base = { mode: run.mode, first_run: run.first };
  for (const t of TIME_MILESTONES) {
    if (state.time >= t && !run.times.has(t)) { run.times.add(t); send('run_time_reached', { ...base, minutes: t / 60, wave: state.wave, level: state.player.level }); }
  }
  if (!run.levelUp && state.player.level >= 2) { run.levelUp = true; send('first_level_up', { ...base, seconds: Math.round(state.time) }); }
  if (!run.bossSeen && state.bossActive) { run.bossSeen = true; send('first_boss_reached', { ...base, seconds: Math.round(state.time), wave: state.wave }); }
  const done = state.bossesDefeated || 0;
  if (done > run.bossesDone) { run.bossesDone = done; if (done === 1) send('first_boss_defeated', { ...base, seconds: Math.round(state.time), wave: state.wave }); }
}

/** Fine partita: vittoria, morte o uscita */
export function trackRunEnd(state: GameState | null, reason: 'death' | 'quit' | 'victory'): void {
  if (!run || run.ended || !state) return;
  run.ended = true;
  const data = { step_id: 'run', mode: run.mode, first_run: run.first, reason, seconds: Math.round(state.time), wave: state.wave, level: state.player.level, bosses: state.bossesDefeated || 0 };
  send(reason === 'victory' ? 'progression_completed' : 'progression_failed', data);
}

export function trackTutorial(completed: boolean, step: number): void {
  send(completed ? 'tutorial_completed' : 'tutorial_skipped', { step });
}

// --- performance_sample: un campione aggregato ogni ~30 s di gioco attivo e visibile ---
let frames: number[] = []; let windowStart = 0; let activeMs = 0;
export function trackPerfFrame(frameMs: number, active: boolean): void {
  const now = performance.now();
  if (!windowStart) windowStart = now;
  if (active && !document.hidden && frameMs > 0 && frameMs < 5000) { frames.push(frameMs); activeMs += frameMs; }
  if (now - windowStart < 30000) return;
  if (frames.length >= 30) {
    const s = [...frames].sort((a, b) => a - b); const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    const fps = frames.map(f => 1000 / f).sort((a, b) => a - b);
    const over = (ms: number) => frames.filter(f => f > ms).length;
    send('performance_sample', {
      target_fps: 60, window_ms: Math.round(now - windowStart), active_ms: Math.round(activeMs), frame_count: frames.length,
      fps_avg: Math.round(1000 * frames.length / activeMs * 10) / 10, fps_p10: Math.round(fps[Math.floor(0.1 * fps.length)] * 10) / 10,
      frame_time_p50_ms: Math.round(q(0.5) * 10) / 10, frame_time_p95_ms: Math.round(q(0.95) * 10) / 10, frame_time_p99_ms: Math.round(q(0.99) * 10) / 10, frame_time_max_ms: Math.round(s[s.length - 1]),
      frames_over_50ms: over(50), frames_over_100ms: over(100), frames_over_250ms: over(250), frames_over_500ms: over(500), frames_over_1000ms: over(1000),
    });
  }
  frames = []; activeMs = 0; windowStart = now;
}
