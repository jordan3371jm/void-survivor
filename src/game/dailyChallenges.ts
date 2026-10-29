import { storageGetItem, storageSetItem } from './storage';
import type { Language } from './i18n';
// Missioni giornaliere, settimanali e mensili.
// Ogni periodo estrae le sue missioni da un elenco in modo deterministico (stesse missioni per tutto il periodo).

export type MissionPeriod = 'daily' | 'weekly' | 'monthly';
export type MissionKind =
  | 'kills' | 'bosses' | 'coins' | 'runs' | 'chests' | 'evolutions' | 'playtime' | 'boss_rush' // si sommano
  | 'survive' | 'level' | 'wave';                                                               // record in una partita

export interface Mission { id: string; kind: MissionKind; target: number; coins: number; diamonds: number; }
export interface MissionProgress { current: number; claimed: boolean; }
export interface MissionsPeriodState { key: string; missions: Mission[]; progress: Record<string, MissionProgress>; }
export interface MissionsState { daily: MissionsPeriodState; weekly: MissionsPeriodState; monthly: MissionsPeriodState; }
export interface RunSummary { kills: number; time: number; level: number; wave: number; bosses: number; coins: number; chests?: number; evolutions?: number; bossRush?: boolean; }

const STORAGE_KEY = 'dailyChallenges';
const ADDITIVE: MissionKind[] = ['kills', 'bosses', 'coins', 'runs', 'chests', 'evolutions', 'playtime', 'boss_rush'];

const m = (kind: MissionKind, target: number, coins: number, diamonds: number): Mission => ({ id: `${kind}_${target}`, kind, target, coins, diamonds });

const POOLS: Record<MissionPeriod, { pool: Mission[]; count: number }> = {
  daily: {
    count: 6,
    pool: [
      m('runs', 2, 150, 1), m('runs', 3, 250, 2),
      m('kills', 300, 200, 2), m('kills', 800, 400, 4),
      m('survive', 180, 200, 2), m('survive', 360, 400, 4),
      m('level', 12, 200, 2), m('level', 20, 400, 4),
      m('wave', 6, 250, 2), m('wave', 10, 450, 4),
      m('bosses', 1, 500, 5),
      m('coins', 800, 200, 2), m('coins', 2000, 400, 4),
      m('chests', 1, 400, 4),
      m('playtime', 600, 300, 3),
    ],
  },
  weekly: {
    count: 6,
    pool: [
      m('runs', 10, 1000, 10), m('runs', 15, 1500, 15),
      m('kills', 4000, 1200, 12), m('kills', 8000, 2000, 20),
      m('bosses', 5, 1500, 15), m('bosses', 8, 2200, 22),
      m('survive', 600, 1200, 12), m('wave', 18, 1500, 15),
      m('level', 35, 1200, 12),
      m('chests', 4, 1500, 15),
      m('evolutions', 1, 1800, 18),
      m('coins', 12000, 1200, 12),
      m('boss_rush', 2, 1200, 12),
      m('playtime', 3600, 1500, 15),
    ],
  },
  monthly: {
    count: 6,
    pool: [
      m('runs', 40, 5000, 50),
      m('kills', 25000, 6000, 60), m('kills', 40000, 8000, 80),
      m('bosses', 25, 6000, 60),
      m('survive', 900, 5000, 50), m('wave', 28, 6000, 60),
      m('level', 50, 5000, 50),
      m('chests', 15, 6000, 60),
      m('evolutions', 5, 7000, 70),
      m('coins', 60000, 5000, 50),
      m('boss_rush', 8, 5000, 50),
      m('playtime', 14400, 6000, 60),
    ],
  },
};

function pad(n: number) { return String(n).padStart(2, '0'); }
export function periodKey(period: MissionPeriod, d = new Date()): string {
  if (period === 'daily') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (period === 'monthly') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  // settimana ISO (inizia il lunedi')
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${pad(Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7))}`;
}

/** Millisecondi fino al prossimo rinnovo del periodo (ora locale). */
export function msUntilReset(period: MissionPeriod, now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (period === 'weekly') { const day = now.getDay() || 7; next.setDate(now.getDate() + (8 - day)); }
  if (period === 'monthly') { next.setFullYear(now.getFullYear(), now.getMonth() + 1, 1); }
  return Math.max(0, next.getTime() - now.getTime());
}

function hashCode(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Estrae le missioni del periodo: una per tipo, ordine deterministico dal seme. */
function pickMissions(period: MissionPeriod, key: string): Mission[] {
  const { pool, count } = POOLS[period];
  let seed = hashCode(period + key);
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const shuffled = [...pool].sort(() => rnd() - 0.5);
  const out: Mission[] = []; const kinds = new Set<MissionKind>();
  for (const mi of shuffled) { if (out.length >= count) break; if (!kinds.has(mi.kind)) { out.push(mi); kinds.add(mi.kind); } }
  return out;
}

function freshPeriod(period: MissionPeriod): MissionsPeriodState {
  const key = periodKey(period);
  return { key, missions: pickMissions(period, key), progress: {} };
}

export function getMissionsState(): MissionsState {
  let saved: Partial<MissionsState> = {};
  try { const raw = storageGetItem(STORAGE_KEY); if (raw) saved = JSON.parse(raw); } catch { /* dati vecchi o corrotti */ }
  const state = {} as MissionsState;
  let changed = false;
  for (const period of ['daily', 'weekly', 'monthly'] as MissionPeriod[]) {
    const cur = saved[period];
    if (cur && cur.key === periodKey(period) && Array.isArray(cur.missions) && cur.progress) state[period] = cur;
    else { state[period] = freshPeriod(period); changed = true; }
  }
  if (changed) saveMissionsState(state);
  return state;
}

export function saveMissionsState(state: MissionsState): void {
  storageSetItem(STORAGE_KEY, JSON.stringify(state));
}

/** Registra una partita conclusa in tutte le missioni attive. */
export function recordRunForDailyChallenges(run: RunSummary): void {
  const state = getMissionsState();
  const value: Record<MissionKind, number> = {
    kills: run.kills, bosses: run.bosses, coins: Math.round(run.coins), runs: 1, chests: run.chests || 0, evolutions: run.evolutions || 0,
    playtime: Math.floor(run.time), boss_rush: run.bossRush ? 1 : 0, survive: Math.floor(run.time), level: run.level, wave: run.wave,
  };
  for (const period of ['daily', 'weekly', 'monthly'] as MissionPeriod[]) {
    const ps = state[period];
    for (const mi of ps.missions) {
      const pr = ps.progress[mi.id] || (ps.progress[mi.id] = { current: 0, claimed: false });
      pr.current = ADDITIVE.includes(mi.kind) ? pr.current + value[mi.kind] : Math.max(pr.current, value[mi.kind]);
      pr.current = Math.min(pr.current, mi.target);
    }
  }
  saveMissionsState(state);
}

/** Riscuote una missione completata; restituisce la ricompensa o null. */
export function claimMission(state: MissionsState, period: MissionPeriod, id: string): { coins: number; diamonds: number } | null {
  const mi = state[period].missions.find(x => x.id === id);
  const pr = state[period].progress[id];
  if (!mi || !pr || pr.claimed || pr.current < mi.target) return null;
  pr.claimed = true;
  saveMissionsState(state);
  return { coins: mi.coins, diamonds: mi.diamonds };
}

export function countClaimable(state = getMissionsState()): number {
  let n = 0;
  for (const period of ['daily', 'weekly', 'monthly'] as MissionPeriod[]) {
    for (const mi of state[period].missions) { const pr = state[period].progress[mi.id]; if (pr && !pr.claimed && pr.current >= mi.target) n++; }
  }
  return n;
}

const fmtTime = (s: number) => { const mm = Math.floor(s / 60); return s >= 3600 ? `${Math.floor(s / 3600)}h${mm % 60 ? ' ' + (mm % 60) + 'm' : ''}` : `${mm} min`; };

/** Testo della missione nella lingua scelta. */
export function missionText(mi: Mission, lang: Language): string {
  const n = mi.target;
  const T: Record<MissionKind, [string, string, string, string, string, string]> = {
    kills: [`Elimina ${n} nemici`, `Defeat ${n} enemies`, `Elimina ${n} enemigos`, `Élimine ${n} ennemis`, `击败${n}个敌人`, `Pokonaj wrogów: ${n}`],
    bosses: [`Sconfiggi ${n} boss`, `Defeat ${n} bosses`, `Derrota ${n} jefes`, `Vaincs ${n} boss`, `击败${n}个Boss`, `Pokonaj bossów: ${n}`],
    coins: [`Guadagna ${n} monete`, `Earn ${n} coins`, `Gana ${n} monedas`, `Gagne ${n} pièces`, `赚取${n}金币`, `Zdobądź monety: ${n}`],
    runs: [`Gioca ${n} partite`, `Play ${n} runs`, `Juega ${n} partidas`, `Joue ${n} parties`, `进行${n}场游戏`, `Zagraj rozgrywki: ${n}`],
    chests: [`Apri ${n} scrigni dei boss`, `Open ${n} boss chests`, `Abre ${n} cofres de jefe`, `Ouvre ${n} coffres de boss`, `打开${n}个Boss宝箱`, `Otwórz skrzynie bossów: ${n}`],
    evolutions: [`Evolvi ${n} armi`, `Evolve ${n} weapons`, `Evoluciona ${n} armas`, `Fais évoluer ${n} armes`, `进化${n}把武器`, `Ewoluuj bronie: ${n}`],
    playtime: [`Gioca per ${fmtTime(n)} in totale`, `Play for ${fmtTime(n)} in total`, `Juega ${fmtTime(n)} en total`, `Joue ${fmtTime(n)} au total`, `累计游戏${fmtTime(n)}`, `Graj łącznie przez ${fmtTime(n)}`],
    boss_rush: [`Completa ${n} partite Boss Rush`, `Play ${n} Boss Rush runs`, `Juega ${n} partidas Boss Rush`, `Joue ${n} parties Boss Rush`, `进行${n}场Boss Rush`, `Zagraj rozgrywki Boss Rush: ${n}`],
    survive: [`Sopravvivi ${fmtTime(n)} in una partita`, `Survive ${fmtTime(n)} in one run`, `Sobrevive ${fmtTime(n)} en una partida`, `Survis ${fmtTime(n)} en une partie`, `单局存活${fmtTime(n)}`, `Przetrwaj ${fmtTime(n)} w jednej rozgrywce`],
    level: [`Raggiungi il livello ${n}`, `Reach level ${n}`, `Alcanza el nivel ${n}`, `Atteins le niveau ${n}`, `达到${n}级`, `Osiągnij poziom ${n}`],
    wave: [`Raggiungi l'ondata ${n}`, `Reach wave ${n}`, `Alcanza la oleada ${n}`, `Atteins la vague ${n}`, `到达第${n}波`, `Dotrzyj do fali ${n}`],
  };
  const idx = ({ it: 0, en: 1, es: 2, fr: 3, zh: 4, pl: 5 } as Record<string, number>)[lang] ?? 1;
  return T[mi.kind][idx];
}

/** Valore leggibile del progresso (minuti per le missioni a tempo). */
export function missionValue(mi: Mission, v: number): string {
  return mi.kind === 'survive' || mi.kind === 'playtime' ? `${Math.floor(v / 60)}/${Math.floor(mi.target / 60)} min` : `${Math.floor(v)}/${mi.target}`;
}
