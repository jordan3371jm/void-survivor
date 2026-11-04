// Pilota automatico: muove la nave da sola (schiva nemici, proiettili e attacchi dei boss,
// raccoglie esperienza e oggetti) e sceglie i potenziamenti al level up.
// Ogni frame prova 16 direzioni + "fermo" e sceglie quella con il costo piu' basso.
import type { Ability, GameState, LevelUpChoice, Vector2 } from './types';
import type { BossHazard } from './bosses';
import { EVOLUTION_INFO } from './evolutions';

interface APMemory { dir: Vector2; target: Vector2 | null; retarget: number; }
const memory = new WeakMap<GameState, APMemory>();

const DIRS: Vector2[] = [{ x: 0, y: 0 }];
for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; DIRS.push({ x: Math.cos(a), y: Math.sin(a) }); }
const TAU = Math.PI * 2;
const LOOKAHEAD = [0.18, 0.4, 0.7];

function segDist(px: number, py: number, x: number, y: number, a: number, len: number): number {
  const dx = Math.cos(a), dy = Math.sin(a);
  const t = Math.max(0, Math.min(len, (px - x) * dx + (py - y) * dy));
  return Math.hypot(px - (x + dx * t), py - (y + dy * t));
}

/** Sceglie il bersaglio da raccogliere: esperienza vicina e sicura, cuori se serve, scrigni e magneti sempre. */
function pickTarget(state: GameState): Vector2 | null {
  const p = state.player;
  const near = state.enemies.filter(e => Math.abs(e.pos.x - p.pos.x) < 900 && Math.abs(e.pos.y - p.pos.y) < 900);
  const crowd = (q: Vector2) => {
    let n = 0;
    for (const e of near) { const d = Math.hypot(e.pos.x - q.x, e.pos.y - q.y); if (d < 160 + e.radius) n += e.isBoss ? 6 : 1; }
    return n;
  };
  let best: Vector2 | null = null, bestScore = 0;
  const consider = (pos: Vector2, value: number) => {
    const d = Math.hypot(pos.x - p.pos.x, pos.y - p.pos.y);
    if (d > 1100) return;
    const score = value / (d + 60) / (1 + crowd(pos) * 0.6);
    if (score > bestScore) { bestScore = score; best = pos; }
  };
  for (const o of state.expOrbs) if (!o.magnetized) consider(o.pos, 1 + Math.min(o.value, 20) * 0.15);
  const hpLoss = 1 - p.hp / Math.max(1, p.maxHp);
  for (const k of state.pickups || []) {
    if (k.type === 'chest') consider(k.pos, 40);
    else if (k.type === 'magnet') consider(k.pos, 25);
    else if (k.type === 'heart' && hpLoss > 0.15) consider(k.pos, 4 + hpLoss * 40);
  }
  return best;
}

/** Quanto e' pericoloso trovarsi nel punto q tra tau secondi. */
function danger(state: GameState, q: Vector2, tau: number, enemies: GameState['enemies'], projs: GameState['projectiles'], hz: BossHazard[]): number {
  const pr = state.player.radius;
  let c = 0;
  for (const e of enemies) {
    const ex = e.pos.x + (e.vel?.x || 0) * tau, ey = e.pos.y + (e.vel?.y || 0) * tau;
    const gap = Math.hypot(q.x - ex, q.y - ey) - e.radius - pr;
    const safe = e.isBoss ? 230 : e.pattern === 'kamikaze' ? 130 : 95;
    if (gap < safe) { const k = (safe - gap) / safe; c += (e.isBoss ? 5 : 1.4) * k * k + (gap < 4 ? 8 : 0); }
  }
  for (const b of projs) {
    const bx = b.pos.x + b.vel.x * tau, by = b.pos.y + b.vel.y * tau;
    const gap = Math.hypot(q.x - bx, q.y - by) - b.radius - pr;
    if (gap < 42) { const k = (42 - gap) / 42; c += 6 * k * k + (gap < 0 ? 6 : 0); }
  }
  for (const h of hz) {
    const tActive = h.telegraph - h.t; // secondi prima che colpisca (negativo = gia' attiva)
    if (tActive - tau > 1.2) continue; // troppo lontano nel tempo per preoccuparsene
    const w = h.harmless ? 10 : 22;
    if (h.kind === 'beam') {
      const d = segDist(q.x, q.y, h.x, h.y, h.angle, h.length);
      const m = h.width / 2 + pr + 26;
      if (d < m) c += w * (0.5 + 0.5 * (1 - d / m));
    } else if (h.kind === 'circle') {
      const d = Math.hypot(q.x - h.x, q.y - h.y);
      const m = h.radius + pr + 22;
      if (d < m) c += w * (0.5 + 0.5 * (1 - d / m));
    } else if (h.kind === 'ring') {
      if (h.hit) continue;
      const grow = Math.max(0, tau - Math.max(0, tActive));
      const r = h.radius + h.ringSpeed * grow;
      const d = Math.hypot(q.x - h.x, q.y - h.y);
      if (Math.abs(d - r) < h.width / 2 + pr + 30) {
        const a = Math.atan2(q.y - h.y, q.x - h.x);
        let inGap = false;
        for (let g = 0; g < h.gapCount; g++) {
          const ga = h.gapAngle + (g * TAU) / h.gapCount;
          if (Math.abs(Math.atan2(Math.sin(a - ga), Math.cos(a - ga))) <= h.gapSize / 2 * 0.75) { inGap = true; break; }
        }
        if (!inGap) c += w;
      }
      // anello in arrivo: conviene mettersi in un varco
      if (h.gapCount > 0 && d > r && d - r < 260) {
        const a = Math.atan2(q.y - h.y, q.x - h.x);
        let best = Math.PI;
        for (let g = 0; g < h.gapCount; g++) { const ga = h.gapAngle + (g * TAU) / h.gapCount; best = Math.min(best, Math.abs(Math.atan2(Math.sin(a - ga), Math.cos(a - ga)))); }
        c += 3 * Math.max(0, best - h.gapSize / 3) / Math.PI;
      }
    } else if (h.kind === 'well') {
      const d = Math.hypot(q.x - h.x, q.y - h.y);
      if (d < h.radius) c += 4 * (1 - d / h.radius) + (d < 70 && !h.harmless ? 12 : 0);
    }
  }
  return c;
}

/**
 * Direzione di movimento del pilota automatico (lunghezza 0..1), da mettere in state.touchDir.
 * dt in secondi reali (solo per ammorbidire); le previsioni sono in tempo di gioco.
 */
export function autopilotDir(state: GameState, dt: number): Vector2 | null {
  const p = state.player;
  let mem = memory.get(state);
  if (!mem) { mem = { dir: { x: 0, y: 0 }, target: null, retarget: 0 }; memory.set(state, mem); }
  mem.retarget -= dt;
  if (mem.retarget <= 0) { mem.target = pickTarget(state); mem.retarget = 0.3; }

  const R = 650;
  const enemies = state.enemies.filter(e => Math.abs(e.pos.x - p.pos.x) < R + e.radius && Math.abs(e.pos.y - p.pos.y) < R + e.radius);
  const projs = state.projectiles.filter(b => !b.fromPlayer && Math.abs(b.pos.x - p.pos.x) < R && Math.abs(b.pos.y - p.pos.y) < R);
  const hz = (state.bossHazards as BossHazard[] | undefined) || [];
  const speed = p.speed; // tutto in tempo di gioco: nemici e proiettili si muovono con la stessa scala

  // Senza un bersaglio gira intorno ai nemici (a distanza), cosi' le armi colpiscono e la nave non resta chiusa
  let cx = 0, cy = 0, cn = 0;
  for (const e of enemies) { cx += e.pos.x; cy += e.pos.y; cn++; }

  let bestDir = DIRS[0], bestCost = Infinity;
  for (const dir of DIRS) {
    let cost = 0;
    for (const tau of LOOKAHEAD) {
      const q = { x: p.pos.x + dir.x * speed * tau, y: p.pos.y + dir.y * speed * tau };
      cost += danger(state, q, tau, enemies, projs, hz) * (tau < 0.3 ? 1.3 : 1);
    }
    const moving = dir.x !== 0 || dir.y !== 0;
    if (mem.target && moving) {
      const tx = mem.target.x - p.pos.x, ty = mem.target.y - p.pos.y;
      const td = Math.hypot(tx, ty) || 1;
      cost -= 1.6 * (dir.x * tx + dir.y * ty) / td;
    } else if (cn > 0 && moving) {
      // nessun bersaglio: orbita attorno al gruppo di nemici mantenendo la distanza
      const ax = cx / cn - p.pos.x, ay = cy / cn - p.pos.y;
      const ad = Math.hypot(ax, ay) || 1;
      const radial = (dir.x * ax + dir.y * ay) / ad;
      const tangent = (dir.x * -ay + dir.y * ax) / ad;
      cost -= 0.6 * tangent + (ad < 280 ? -0.8 * radial : 0.4 * radial);
    }
    if (!moving) cost += 0.4; // stare fermi va bene solo se tutto il resto e' peggio
    cost -= 0.35 * (dir.x * mem.dir.x + dir.y * mem.dir.y); // evita di tremolare tra due direzioni
    if (cost < bestCost) { bestCost = cost; bestDir = dir; }
  }

  // Ammorbidisce i cambi di direzione (ma resta reattivo davanti ai pericoli)
  const blend = Math.min(1, dt * 14);
  mem.dir = { x: mem.dir.x + (bestDir.x - mem.dir.x) * blend, y: mem.dir.y + (bestDir.y - mem.dir.y) * blend };
  const len = Math.hypot(mem.dir.x, mem.dir.y);
  if (len < 0.2) return null;
  return len > 1 ? { x: mem.dir.x / len, y: mem.dir.y / len } : mem.dir;
}

/** Sceglie il potenziamento al level up: armi nuove all'inizio, poi porta le armi al massimo (si evolvono). */
export function autopilotChoice(state: GameState, choices: LevelUpChoice[]): LevelUpChoice | null {
  if (!choices.length) return null;
  const abilities: Ability[] = state.player.abilities;
  const actives = abilities.filter(a => !a.type.startsWith('passive_')).length;
  const hpLoss = 1 - state.player.hp / Math.max(1, state.player.maxHp);
  const score = (c: LevelUpChoice): number => {
    if (c.type === 'stat' || !c.abilityType) return 0;
    const t = c.abilityType;
    const passive = t.startsWith('passive_');
    if (c.type === 'ability') {
      if (passive) return 4 + (hpLoss > 0.5 && (t === 'passive_regen_core' || t === 'passive_plating' || t === 'passive_neutronium_heart') ? 3 : 0);
      return actives < 3 ? 10 : actives < 5 ? 8.5 : 5;
    }
    const owned = abilities.find(a => a.type === t);
    if (!owned) return 1;
    if (passive) return 3.5;
    // le armi vicine al massimo valgono di piu': al massimo livello possono evolversi
    const progress = owned.level / Math.max(1, owned.maxLevel);
    return 5 + progress * 3 + (EVOLUTION_INFO[t] ? 1 : 0);
  };
  let best = choices[0], bestScore = -Infinity;
  for (const c of choices) { const s = score(c) + Math.random() * 0.3; if (s > bestScore) { bestScore = s; best = c; } }
  return best;
}
