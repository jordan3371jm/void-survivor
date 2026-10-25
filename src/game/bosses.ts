// ---------------------------------------------------------------------------
// BOSS: mosse uniche per ogni boss, con preavviso visivo (zone e linee che si
// caricano prima del colpo) e una seconda fase "infuriata" sotto il 50% di vita.
// Ogni boss successivo nella stessa partita e' piu' aggressivo (tier).
// ---------------------------------------------------------------------------
import type { Enemy, EnemyType, GameState, Vector2 } from './types';
import { newId, spawnEnemy, spawnParticles, shieldPulse } from './engine';
import { playShoot } from './audio';

export type HazardStyle =
  | 'superlaser' | 'turbolaser' | 'acid' | 'dash' | 'tail' | 'screech' | 'tentacle' | 'eldritch' | 'eye'
  | 'tractor' | 'grid' | 'ink' | 'whirlpool' | 'blackhole' | 'cosmic' | 'star' | 'void' | 'nova' | 'rift' | 'gaze';

export interface BossHazard {
  id: string;
  kind: 'beam' | 'circle' | 'ring' | 'well';
  style: HazardStyle;
  color: string;
  x: number; y: number;
  angle: number; length: number; width: number; sweep: number;
  /** la direzione segue il giocatore: durante il preavviso (fino al 70%) e/o durante il colpo (rad/s) */
  trackTelegraph: boolean; trackActive: number;
  followBoss?: string;
  radius: number;
  ringSpeed: number; gapAngle: number; gapSize: number; maxRadius: number;
  /** numero di varchi dell'anello, alla stessa distanza tra loro */
  gapCount: number;
  pull: number;
  telegraph: number; active: number; t: number;
  damage: number; continuous: boolean; hit: boolean; harmless: boolean;
}

interface BossAI {
  tier: number;
  cooldown: number;
  lastMove: string;
  enraged: boolean;
  anchor: number;           // secondi in cui il boss resta fermo (sta caricando)
  dash: { vx: number; vy: number; t: number } | null;
  shield: number;           // secondi di scudo (Borg): subisce solo il 25% dei danni
  lastHp: number;
  steps: { at: number; fn: () => void }[];
  time: number;
}

type Move = { id: string; weight: number; phase2Only?: boolean; run: (c: MoveCtx) => number };
interface MoveCtx {
  state: GameState; boss: Enemy; ai: BossAI; tier: number; enraged: boolean;
  dmg: number; speedMul: number; tele: number;
  aim: () => number; at: (delay: number, fn: () => void) => void;
}

const TAU = Math.PI * 2;
const dist = (a: Vector2, b: Vector2) => Math.hypot(a.x - b.x, a.y - b.y);
const ang = (a: Vector2, b: Vector2) => Math.atan2(b.y - a.y, b.x - a.x);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function hazards(state: GameState): BossHazard[] {
  if (!state.bossHazards) state.bossHazards = [];
  return state.bossHazards as BossHazard[];
}

function addHazard(state: GameState, h: Partial<BossHazard> & Pick<BossHazard, 'kind' | 'style' | 'color' | 'x' | 'y' | 'telegraph' | 'active' | 'damage'>): BossHazard {
  const full: BossHazard = {
    id: newId(), angle: 0, length: 0, width: 0, sweep: 0, trackTelegraph: false, trackActive: 0,
    radius: 0, ringSpeed: 0, gapAngle: 0, gapSize: 0, gapCount: 1, maxRadius: 1600, pull: 0, t: 0,
    continuous: false, hit: false, harmless: false, ...h,
  };
  hazards(state).push(full);
  return full;
}

function bullet(state: GameState, x: number, y: number, a: number, speed: number, damage: number, color: string, radius = 7, life = 4) {
  state.projectiles.push({ id: newId(), pos: { x, y }, vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed }, radius, hp: 1, maxHp: 1, damage, fromPlayer: false, lifetime: life, maxLifetime: life, type: 'boss_bolt', color, trail: [] });
}

function summon(state: GameState, boss: Enemy, type: EnemyType, count: number) {
  const normal = state.enemies.filter(e => !e.isBoss).length;
  const n = Math.max(0, Math.min(count, 130 - normal));
  for (let i = 0; i < n; i++) {
    const e = spawnEnemy(state, type);
    const a = (i / Math.max(1, n)) * TAU + rnd(-0.3, 0.3);
    e.pos = { x: boss.pos.x + Math.cos(a) * (boss.radius + 40), y: boss.pos.y + Math.sin(a) * (boss.radius + 40) };
    state.enemies.push(e);
    spawnParticles(state, e.pos, boss.color === '#222222' ? '#88ff44' : '#ffffff', 4);
  }
}

/** Danno al giocatore da un attacco del boss. continuous = danno al secondo (raggi, pozze). */
function hurtPlayer(state: GameState, amount: number, continuous: boolean, dt = 0) {
  const p = state.player;
  if (continuous) {
    if (p.invincibleTimer > 0 && p.invincibleTimer > 1.0) return; // invulnerabilita' lunga (revive)
    p.hp -= Math.max(amount * 0.25, amount - p.armor * 0.5) * dt;
  } else {
    if (p.invincibleTimer > 0) return;
    if (p.shieldHits > 0) { p.shieldHits--; p.invincibleTimer = 0.5; shieldPulse(state); return; }
    p.hp -= Math.max(1, amount - p.armor);
    p.invincibleTimer = 0.6;
    state.screenShake = Math.max(state.screenShake, 0.35);
    spawnParticles(state, p.pos, '#ff3355', 8);
    playShoot('hit');
  }
  if (p.hp <= 0 && p.hasRevive) { p.hp = p.maxHp * 0.5; p.hasRevive = false; p.dustReviveUsed = true; p.invincibleTimer = 2; spawnParticles(state, p.pos, '#ffffff', 14); }
}

function segDist(px: number, py: number, x1: number, y1: number, a: number, len: number): number {
  const dx = Math.cos(a), dy = Math.sin(a);
  const t = Math.max(0, Math.min(len, (px - x1) * dx + (py - y1) * dy));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

// ---------------------------------------------------------------------------
// Mosse condivise (costruttori)
// ---------------------------------------------------------------------------
function beamFromBoss(c: MoveCtx, o: { angle: number; telegraph: number; active: number; width: number; length?: number; dps?: number; burst?: number; style: HazardStyle; color: string; sweep?: number; trackTelegraph?: boolean; trackActive?: number; pull?: number }) {
  return addHazard(c.state, {
    kind: 'beam', style: o.style, color: o.color, x: c.boss.pos.x, y: c.boss.pos.y, followBoss: c.boss.id,
    angle: o.angle, length: o.length ?? 1700, width: o.width, sweep: o.sweep ?? 0,
    trackTelegraph: o.trackTelegraph ?? false, trackActive: o.trackActive ?? 0, pull: o.pull ?? 0,
    telegraph: o.telegraph * c.tele, active: o.active,
    damage: o.dps ?? o.burst ?? 0, continuous: o.dps !== undefined,
  });
}

function strikeZone(c: MoveCtx, x: number, y: number, r: number, telegraph: number, style: HazardStyle, color: string, opts: { linger?: number; dps?: number; burst?: number } = {}) {
  return addHazard(c.state, {
    kind: 'circle', style, color, x, y, radius: r, telegraph: telegraph * c.tele,
    active: opts.linger ?? 0.25, damage: opts.dps ?? opts.burst ?? c.dmg, continuous: opts.dps !== undefined,
  });
}

function lineStrike(c: MoveCtx, cx: number, cy: number, a: number, length: number, width: number, telegraph: number, style: HazardStyle, color: string, burst?: number) {
  // linea centrata in (cx, cy)
  return addHazard(c.state, {
    kind: 'beam', style, color, x: cx - Math.cos(a) * length / 2, y: cy - Math.sin(a) * length / 2,
    angle: a, length, width, telegraph: telegraph * c.tele, active: 0.3, damage: burst ?? c.dmg * 1.1,
  });
}

// Ogni anello ha sempre almeno 3 varchi (larghi almeno 0,8 rad): si puo' sempre schivare
function shockRing(c: MoveCtx, speed: number, width: number, gapSize: number, color: string, style: HazardStyle, gapAngle = Math.random() * TAU, gapCount = 3) {
  gapCount = Math.max(3, gapCount); gapSize = Math.max(0.8, gapSize);
  return addHazard(c.state, {
    kind: 'ring', style, color, x: c.boss.pos.x, y: c.boss.pos.y, radius: c.boss.radius * 0.6,
    ringSpeed: speed * c.speedMul, width, gapAngle, gapSize, gapCount, maxRadius: 1300,
    telegraph: 0.35, active: 6, damage: c.dmg,
  });
}

function dashAt(c: MoveCtx, delay: number, speed = 820) {
  const a = c.aim();
  const d = Math.min(900, dist(c.boss.pos, c.state.player.pos) + 160);
  addHazard(c.state, { kind: 'beam', style: 'dash', color: '#ff3b5c', x: c.boss.pos.x, y: c.boss.pos.y, followBoss: c.boss.id, angle: a, length: d, width: c.boss.radius * 1.4, telegraph: delay * c.tele, active: 0.01, damage: 0, harmless: true });
  c.ai.anchor = Math.max(c.ai.anchor, delay * c.tele);
  c.at(delay * c.tele, () => {
    const s = speed * c.speedMul;
    c.ai.dash = { vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: d / s };
    playShoot('boss_roar');
  });
}

function radialBurst(c: MoveCtx, count: number, speed: number, color: string, offset = 0, radius = 7) {
  for (let i = 0; i < count; i++) bullet(c.state, c.boss.pos.x, c.boss.pos.y, offset + (i / count) * TAU, speed * c.speedMul, c.dmg * 0.55, color, radius);
}

function spiral(c: MoveCtx, arms: number, duration: number, rate: number, speed: number, spin: number, color: string) {
  const total = Math.floor(duration * rate);
  const base = Math.random() * TAU;
  for (let k = 0; k < total; k++) {
    c.at(k / rate, () => {
      for (let a = 0; a < arms; a++) bullet(c.state, c.boss.pos.x, c.boss.pos.y, base + (a / arms) * TAU + k * spin, speed * c.speedMul, c.dmg * 0.5, color, 7);
      if (k % 3 === 0) playShoot('boss_bolt');
    });
  }
}

function predicted(state: GameState, t: number): Vector2 {
  return { x: state.player.pos.x + state.player.vel.x * t, y: state.player.pos.y + state.player.vel.y * t };
}

// ---------------------------------------------------------------------------
// I BOSS
// ---------------------------------------------------------------------------
const BOSS_MOVES: Partial<Record<EnemyType, Move[]>> = {
  // MORTE NERA: superlaser verde, turbolaser rossi, caccia imperiali, trincea
  boss_death_star: [
    { id: 'superlaser', weight: 3, run: c => {
      c.ai.anchor = 2.6 * c.tele;
      playShoot('boss_charge');
      beamFromBoss(c, { angle: c.aim(), telegraph: 1.4, active: 1.15, width: 64 + Math.min(c.tier, 6) * 5, dps: c.dmg * 2.4, style: 'superlaser', color: '#4dff7a', trackTelegraph: true, sweep: c.enraged ? (Math.random() < 0.5 ? -0.45 : 0.45) : 0 });
      c.at(1.4 * c.tele, () => { playShoot('boss_beam'); c.state.screenShake = 0.6; });
      return 2.7;
    } },
    { id: 'turbolaser', weight: 3, run: c => {
      const volleys = c.enraged ? 5 : 3;
      for (let v = 0; v < volleys; v++) c.at(v * 0.38, () => {
        const a = c.aim(); const n = Math.min(7, 5 + Math.floor(c.tier / 3)); // varchi tra i colpi abbastanza larghi da passarci
        for (let i = 0; i < n; i++) bullet(c.state, c.boss.pos.x, c.boss.pos.y, a + (i - (n - 1) / 2) * 0.2, 340 * c.speedMul, c.dmg * 0.5, '#ff4040', 6);
        playShoot('boss_bolt');
      });
      return volleys * 0.38 + 0.4;
    } },
    { id: 'squadron', weight: 1.5, run: c => { summon(c.state, c.boss, 'imperial_probe', 3 + Math.floor(c.tier / 3)); playShoot('boss_roar'); return 0.8; } },
    { id: 'trench', weight: 2, phase2Only: true, run: c => {
      const a = Math.random() < 0.5 ? 0 : Math.PI / 2; const nx = -Math.sin(a), ny = Math.cos(a);
      const gap = Math.floor(rnd(-2, 3));
      playShoot('boss_charge');
      for (let k = -3; k <= 3; k++) {
        if (k === gap) continue;
        const cx = c.state.player.pos.x + nx * k * 130, cy = c.state.player.pos.y + ny * k * 130;
        lineStrike(c, cx, cy, a, 2600, 56, 1.3, 'superlaser', '#4dff7a', c.dmg * 1.4);
      }
      c.at(1.3 * c.tele, () => playShoot('boss_beam'));
      return 2.0;
    } },
  ],

  // REGINA XENOMORFA: acido, balzi, uova/parassiti, coda, urlo
  boss_xenomorph: [
    { id: 'acid', weight: 3, run: c => {
      const n = c.enraged ? 5 : 3;
      for (let i = 0; i < n; i++) c.at(i * 0.2, () => {
        const p = predicted(c.state, 0.7 + i * 0.1);
        strikeZone(c, p.x + rnd(-70, 70), p.y + rnd(-70, 70), 72, 0.85, 'acid', '#8cff3a', { linger: 3.0, dps: c.dmg * 0.9 });
        playShoot('acid');
      });
      return n * 0.2 + 0.9;
    } },
    { id: 'pounce', weight: 3, run: c => {
      // balzi a catena: 2 (3 nella seconda fase), ognuno mirato dove si trova il giocatore
      const jumps = c.enraged ? 3 : 2;
      dashAt(c, 0.7, 900);
      for (let k = 1; k < jumps; k++) c.at(k * 1.25 * c.tele, () => dashAt(c, 0.5, 1000));
      return jumps * 1.25 + 0.4;
    } },
    { id: 'acid_spray', weight: 2.5, run: c => {
      const volleys = c.enraged ? 4 : 3;
      for (let v = 0; v < volleys; v++) c.at(v * 0.32, () => {
        const a = c.aim(); const n = Math.min(9, 7 + Math.floor(c.tier / 3));
        for (let i = 0; i < n; i++) bullet(c.state, c.boss.pos.x, c.boss.pos.y, a + (i - (n - 1) / 2) * 0.2 + (v % 2) * 0.1, 300 * c.speedMul, c.dmg * 0.55, '#8cff3a', 8);
        playShoot('acid');
      });
      return volleys * 0.32 + 0.4;
    } },
    { id: 'brood', weight: 1.5, run: c => { summon(c.state, c.boss, 'parasite', 3 + Math.floor(c.tier / 2)); playShoot('boss_roar'); return 0.8; } },
    { id: 'tail', weight: 2, run: c => {
      c.ai.anchor = 1.35 * c.tele;
      strikeZone(c, c.boss.pos.x, c.boss.pos.y, c.boss.radius + 115, 1.3, 'tail', '#c8ff9a', { burst: c.dmg * 1.1 });
      c.at(1.25 * c.tele, () => playShoot('boss_slam'));
      return 1.3;
    } },
    { id: 'screech', weight: 2, phase2Only: true, run: c => {
      playShoot('boss_roar');
      const base = Math.random() * TAU; const turn = Math.random() < 0.5 ? 0.4 : -0.4;
      for (let k = 0; k < 3; k++) c.at(k * 0.6, () => shockRing(c, 290, 26, 0.9, '#b6ff6a', 'screech', base + k * turn));
      return 1.8;
    } },
  ],

  // CTHULHU: tentacoli, onde di follia, occhi, spirale degli abissi
  boss_cthulhu: [
    { id: 'tentacles', weight: 3, run: c => {
      const n = 4 + Math.floor(c.tier / 2) + (c.enraged ? 2 : 0);
      for (let i = 0; i < n; i++) c.at(i * 0.16, () => {
        const p = c.state.player.pos;
        lineStrike(c, p.x + rnd(-150, 150), p.y + rnd(-150, 150), Math.random() * Math.PI, 460, 48, 0.95, 'tentacle', '#2bd48a', c.dmg * 1.2);
      });
      c.at(0.95 * c.tele, () => playShoot('boss_slam'));
      return n * 0.16 + 1.1;
    } },
    { id: 'madness', weight: 2.5, run: c => {
      // 3 varchi uguali e alla stessa distanza (120 gradi); ogni anello successivo ruota di poco,
      // cosi' basta spostarsi un po' per passare dal varco di un anello a quello del successivo
      const n = c.enraged ? 4 : 3;
      const base = Math.random() * TAU; const turn = Math.random() < 0.5 ? 0.45 : -0.45;
      for (let i = 0; i < n; i++) c.at(i * 0.75, () => { shockRing(c, 240, 24, 0.75, '#41f2a6', 'eldritch', base + i * turn, 3); playShoot('gravity_waves'); });
      return n * 0.75 + 0.6;
    } },
    { id: 'eyes', weight: 2, run: c => {
      for (let i = 0; i < 5; i++) c.at(i * 0.35, () => { strikeZone(c, c.state.player.pos.x, c.state.player.pos.y, 80, 0.95, 'eye', '#ffe66b', { burst: c.dmg }); });
      return 2.6;
    } },
    { id: 'deep_spiral', weight: 2, run: c => { spiral(c, c.enraged ? 3 : 2, 1.8, 9, 190, 0.32, '#3cf0a0'); return 2.0; } },
  ],

  // CUBO BORG: raggio traente, droni, griglia laser, adattamento
  boss_borg_cube: [
    { id: 'tractor', weight: 3, run: c => {
      c.ai.anchor = 3.0 * c.tele;
      beamFromBoss(c, { angle: c.aim(), telegraph: 0.7, active: 2.3, width: 96, length: 1100, dps: c.dmg * 0.7, style: 'tractor', color: '#4dff9a', trackActive: 0.4, pull: 120 });
      c.at(0.7 * c.tele, () => playShoot('boss_beam'));
      return 3.1;
    } },
    { id: 'drones', weight: 2, run: c => { summon(c.state, c.boss, 'drone_sentinel', 4 + Math.floor(c.tier / 2)); playShoot('boss_charge'); return 0.8; } },
    { id: 'grid', weight: 3, run: c => {
      const p = c.state.player.pos; const off = rnd(-60, 60);
      playShoot('boss_charge');
      for (let k = -2; k <= 2; k++) {
        lineStrike(c, p.x + k * 175 + off, p.y, Math.PI / 2, 1400, 30, 1.15, 'grid', '#5cff8c', c.dmg * 1.2);
        lineStrike(c, p.x, p.y + k * 175 + off, 0, 1400, 30, 1.15, 'grid', '#5cff8c', c.dmg * 1.2);
      }
      c.at(1.15 * c.tele, () => playShoot('boss_beam'));
      return 1.8;
    } },
    { id: 'adapt', weight: 2, phase2Only: true, run: c => {
      c.ai.shield = 4.5;
      playShoot('energy_shield');
      for (let i = 0; i < 6; i++) c.at(i * 0.7, () => { radialBurst(c, 16 + c.tier, 210, '#5cff8c', i * 0.2); playShoot('boss_bolt'); });
      return 4.5;
    } },
  ],

  // KRAKEN SPAZIALE: pioggia di tentacoli, inchiostro, gorgo, tentacoli rotanti
  boss_space_kraken: [
    { id: 'rain', weight: 3, run: c => {
      const n = 7 + c.tier + (c.enraged ? 4 : 0);
      for (let i = 0; i < n; i++) c.at(i * 0.11, () => {
        const p = c.state.player.pos; const a = Math.random() * TAU, r = Math.random() < 0.3 ? 0 : rnd(40, 320);
        strikeZone(c, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 60, 0.9, 'tentacle', '#c45cff', { burst: c.dmg });
      });
      c.at(0.9 * c.tele, () => playShoot('boss_slam'));
      return n * 0.11 + 1.0;
    } },
    { id: 'ink', weight: 2, run: c => {
      const p = c.state.player.pos;
      for (let i = 0; i < 3; i++) strikeZone(c, p.x + rnd(-200, 200), p.y + rnd(-200, 200), 140, 0.7, 'ink', '#1a1030', { linger: 4.5, dps: c.dmg * 0.55 });
      playShoot('acid');
      return 1.2;
    } },
    { id: 'whirlpool', weight: 2.5, run: c => {
      c.ai.anchor = 3.2 * c.tele;
      addHazard(c.state, { kind: 'well', style: 'whirlpool', color: '#8f5cff', x: c.boss.pos.x, y: c.boss.pos.y, followBoss: c.boss.id, radius: 420, pull: 120, telegraph: 0.5, active: 3.0, damage: 0, harmless: true });
      spiral(c, 2, 2.8, 6, 170, 0.45, '#d58cff');
      playShoot('stellar_blackhole');
      return 3.3;
    } },
    { id: 'sweep', weight: 2, run: c => {
      const a = c.aim(); const dir = Math.random() < 0.5 ? 1 : -1;
      const n = c.enraged ? 3 : 2;
      for (let i = 0; i < n; i++) beamFromBoss(c, { angle: a - dir * 1.0 + (i * TAU) / n, telegraph: 0.8, active: 1.7, width: 42, length: 560, dps: c.dmg * 1.4, style: 'tentacle', color: '#c45cff', sweep: dir * 1.0 });
      c.ai.anchor = 2.5 * c.tele;
      return 2.6;
    } },
  ],

  // DIVORATORE DI GALASSIE: buco nero, braccia a spirale, raggi cosmici, pioggia di stelle
  boss_galaxy_devourer: [
    { id: 'blackhole', weight: 3, run: c => {
      const p = predicted(c.state, 0.6);
      addHazard(c.state, { kind: 'well', style: 'blackhole', color: '#b15cff', x: p.x, y: p.y, radius: 300, pull: 175, telegraph: 0.8, active: 3.6, damage: c.dmg * 1.6, continuous: true });
      playShoot('stellar_blackhole');
      return 2.2;
    } },
    { id: 'galaxy', weight: 3, run: c => { spiral(c, c.enraged ? 4 : 3, 2.6, 10, 200, 0.22, '#ff7ad9'); return 2.8; } },
    { id: 'cosmic_ray', weight: 2.5, run: c => {
      const n = c.enraged ? 4 : 2; const a = c.aim(); const dir = Math.random() < 0.5 ? 1 : -1;
      c.ai.anchor = 4.2 * c.tele;
      for (let i = 0; i < n; i++) beamFromBoss(c, { angle: a + (i * TAU) / n + dir * 0.6, telegraph: 1.0, active: 3.0, width: 38, length: 950, dps: c.dmg * 1.6, style: 'cosmic', color: '#d9a3ff', sweep: dir * (0.75 + Math.min(c.tier, 8) * 0.02) });
      c.at(1.0 * c.tele, () => playShoot('boss_beam'));
      return 4.2;
    } },
    { id: 'starfall', weight: 2, run: c => {
      const n = 10 + c.tier;
      for (let i = 0; i < n; i++) c.at(i * 0.12, () => {
        const p = c.state.player.pos;
        strikeZone(c, p.x + rnd(-300, 300), p.y + rnd(-300, 300), 55, 0.8, 'star', '#ffd76b', { burst: c.dmg });
        if (i % 3 === 0) playShoot('meteor');
      });
      return n * 0.12 + 0.9;
    } },
  ],

  // IMPERATORE DEL VUOTO: lance, nova oscura, giudizio a croce, teletrasporto
  boss_void_emperor: [
    { id: 'lances', weight: 3, run: c => {
      const n = c.enraged ? 5 : 3; const a = c.aim();
      c.ai.anchor = 1.2 * c.tele;
      for (let i = 0; i < n; i++) beamFromBoss(c, { angle: a + (i - (n - 1) / 2) * 0.32, telegraph: 0.8, active: 0.3, width: 34, burst: c.dmg * 1.3, style: 'void', color: '#ff4dff' });
      c.at(0.8 * c.tele, () => playShoot('void_lance'));
      return 1.4;
    } },
    { id: 'nova', weight: 2.5, run: c => {
      c.ai.anchor = 1.8 * c.tele;
      strikeZone(c, c.boss.pos.x, c.boss.pos.y, c.boss.radius + 80, 1.2, 'nova', '#ff4dff', { burst: c.dmg * 1.4 });
      c.at(1.2 * c.tele, () => { shockRing(c, 330, 30, 1.0, '#ff7aff', 'nova'); playShoot('antimatter_bomb'); c.state.screenShake = 0.5; });
      return 2.0;
    } },
    { id: 'judgment', weight: 3, run: c => {
      const cross = (rot: number) => { const p = c.state.player.pos; lineStrike(c, p.x, p.y, Math.PI / 4 + rot, 1100, 46, 1.0, 'void', '#ffb3ff', c.dmg * 1.3); lineStrike(c, p.x, p.y, -Math.PI / 4 + rot, 1100, 46, 1.0, 'void', '#ffb3ff', c.dmg * 1.3); };
      cross(0); playShoot('boss_charge');
      if (c.enraged) c.at(0.55, () => cross(Math.PI / 4));
      return c.enraged ? 2.0 : 1.5;
    } },
    { id: 'teleport', weight: 2, run: c => {
      spawnParticles(c.state, c.boss.pos, '#ff4dff', 18);
      const a = Math.random() * TAU; const p = c.state.player.pos;
      c.boss.pos = { x: p.x + Math.cos(a) * 280, y: p.y + Math.sin(a) * 280 };
      spawnParticles(c.state, c.boss.pos, '#ffffff', 18);
      playShoot('cryo_lance');
      c.ai.anchor = 0.8;
      c.at(0.45, () => { radialBurst(c, 16 + c.tier, 240, '#ff7aff'); playShoot('boss_bolt'); });
      if (c.enraged) c.at(0.9, () => radialBurst(c, 16 + c.tier, 240, '#ff7aff', Math.PI / (16 + c.tier)));
      return 1.4;
    } },
  ],

  // ORRORE COSMICO (boss finale): sguardi, squarci, tempesta di occhi, evocazioni + mosse degli altri boss
  boss_cosmic_horror: [
    { id: 'gaze', weight: 3, run: c => {
      const n = c.enraged ? 4 : 3; const a = c.aim();
      c.ai.anchor = 3.4 * c.tele;
      for (let i = 0; i < n; i++) beamFromBoss(c, { angle: a + (i - (n - 1) / 2) * 0.7, telegraph: 1.0, active: 2.3, width: 26, length: 1200, dps: c.dmg * 1.3, style: 'gaze', color: '#ffe23d', trackActive: 0.32 });
      c.at(1.0 * c.tele, () => playShoot('boss_beam'));
      return 3.4;
    } },
    { id: 'tear', weight: 2.5, run: c => {
      const n = 5 + Math.floor(c.tier / 3);
      for (let i = 0; i < n; i++) c.at(i * 0.12, () => { const p = c.state.player.pos; lineStrike(c, p.x + rnd(-260, 260), p.y + rnd(-260, 260), Math.random() * Math.PI, 700, 30, 1.2, 'rift', '#ffef7a', c.dmg * 1.3); });
      c.at(1.2 * c.tele, () => playShoot('ion_storm'));
      return n * 0.12 + 1.4;
    } },
    { id: 'eyestorm', weight: 2.5, run: c => {
      const waves = c.enraged ? 6 : 4; const n = 18 + c.tier;
      for (let w = 0; w < waves; w++) c.at(w * 0.45, () => { radialBurst(c, n, 210, w % 2 ? '#ffd23d' : '#ff9a3d', (w % 2) * Math.PI / n, 8); playShoot('boss_bolt'); });
      return waves * 0.45 + 0.5;
    } },
    { id: 'spawn', weight: 1.5, run: c => {
      summon(c.state, c.boss, 'void_stinger', 3); summon(c.state, c.boss, 'nebula_wraith', 2); if (c.enraged) summon(c.state, c.boss, 'kamikaze', 4);
      playShoot('boss_roar'); return 1.0;
    } },
    { id: 'abyss', weight: 2, phase2Only: true, run: c => {
      const p = predicted(c.state, 0.6);
      addHazard(c.state, { kind: 'well', style: 'blackhole', color: '#ffcf3d', x: p.x, y: p.y, radius: 280, pull: 160, telegraph: 0.8, active: 3.0, damage: c.dmg * 1.5, continuous: true });
      const ab = Math.random() * TAU;
      for (let i = 0; i < 3; i++) c.at(0.4 + i * 0.7, () => shockRing(c, 250, 24, 1.0, '#ffe23d', 'eldritch', ab + i * 0.35));
      playShoot('stellar_blackhole');
      return 2.6;
    } },
  ],
};

function getAI(state: GameState, boss: Enemy): BossAI {
  const e = boss as any;
  if (!e.ai) {
    const tier = Math.min(12, state.gameMode === 'boss_rush' ? state.bossRushIndex : Math.max(0, (state.bossSpawnCount || 1) - 1));
    e.ai = { tier, cooldown: 1.6, lastMove: '', enraged: false, anchor: 0, dash: null, shield: 0, lastHp: boss.hp, steps: [], time: 0 } as BossAI;
  }
  return e.ai as BossAI;
}

/** Aggiorna movimento e attacchi di un boss (chiamata ogni frame dal motore). */
export function updateBoss(state: GameState, boss: Enemy, dt: number, toPlayer: Vector2): void {
  const ai = getAI(state, boss);
  ai.time += dt;

  // Scudo di adattamento Borg: restituisce il 75% dei danni subiti dall'ultimo frame
  if (ai.shield > 0) {
    ai.shield -= dt;
    if (boss.hp < ai.lastHp) boss.hp = ai.lastHp - (ai.lastHp - boss.hp) * 0.25;
  }
  ai.lastHp = boss.hp;

  // Seconda fase sotto il 50% di vita
  if (!ai.enraged && boss.hp < boss.maxHp * 0.5) {
    ai.enraged = true;
    (boss as any).enraged = true;
    ai.cooldown = Math.min(ai.cooldown, 0.6);
    state.screenShake = 0.8;
    spawnParticles(state, boss.pos, '#ff2d55', 24);
    playShoot('boss_roar');
  }

  // Passi programmati delle mosse in corso
  for (let i = ai.steps.length - 1; i >= 0; i--) {
    if (ai.time >= ai.steps[i].at) { const s = ai.steps[i]; ai.steps.splice(i, 1); try { s.fn(); } catch (err) { console.warn('[Boss]', err); } }
  }

  // Movimento
  const d = dist(state.player.pos, boss.pos);
  if (ai.dash) {
    boss.vel.x = ai.dash.vx; boss.vel.y = ai.dash.vy;
    ai.dash.t -= dt;
    if (Math.random() < 0.6) spawnParticles(state, boss.pos, boss.color === '#222222' ? '#8cff3a' : '#ff3b5c', 1);
    if (ai.dash.t <= 0) ai.dash = null;
  } else if (ai.anchor > 0) {
    ai.anchor -= dt;
    boss.vel.x *= 0.8; boss.vel.y *= 0.8;
  } else {
    // si avvicina se e' lontano, poi orbita intorno al giocatore a distanza di combattimento
    const orbit = (boss.phaseTimer || 0) * 0.5;
    const approach = d > 330 ? Math.min(1, (d - 330) / 220) : 0;
    const spd = boss.speed * (ai.enraged ? 1.3 : 1);
    boss.vel.x = Math.cos(orbit) * spd * (1 - approach * 0.6) + toPlayer.x * spd * 1.7 * approach;
    boss.vel.y = Math.sin(orbit) * spd * (1 - approach * 0.6) + toPlayer.y * spd * 1.7 * approach;
  }

  // Scelta della prossima mossa
  ai.cooldown -= dt;
  if (ai.cooldown <= 0 && !ai.dash) {
    const all = BOSS_MOVES[boss.type] || [];
    const pool = all.filter(m => (!m.phase2Only || ai.enraged) && m.id !== ai.lastMove);
    if (pool.length === 0) { ai.cooldown = 2; return; }
    let r = Math.random() * pool.reduce((s, m) => s + m.weight, 0);
    let move = pool[0];
    for (const m of pool) { r -= m.weight; if (r <= 0) { move = m; break; } }
    const tier = ai.tier;
    const ctx: MoveCtx = {
      state, boss, ai, tier, enraged: ai.enraged,
      dmg: boss.damage,
      speedMul: 1 + Math.min(tier, 8) * 0.05 + (ai.enraged ? 0.1 : 0),
      tele: Math.max(0.82, 1 - tier * 0.025 - (ai.enraged ? 0.06 : 0)),
      aim: () => ang(boss.pos, state.player.pos),
      at: (delay, fn) => ai.steps.push({ at: ai.time + delay, fn }),
    };
    const duration = move.run(ctx);
    ai.lastMove = move.id;
    const rest = Math.max(0.45, (1.5 - tier * 0.08) * (ai.enraged ? 0.65 : 1));
    ai.cooldown = duration + rest;
  }
}

/** Aggiorna le zone di pericolo dei boss (danni, attrazione) — chiamata ogni frame. */
export function updateBossHazards(state: GameState, dt: number): void {
  const list = hazards(state);
  const p = state.player;
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i];
    h.t += dt;
    if (h.followBoss) {
      const b = state.enemies.find(e => e.id === h.followBoss);
      if (!b) { list.splice(i, 1); continue; }
      h.x = b.pos.x; h.y = b.pos.y;
    }
    const activeT = h.t - h.telegraph;
    if (activeT < 0) {
      if (h.kind === 'beam' && h.trackTelegraph && h.t < h.telegraph * 0.55) h.angle = ang({ x: h.x, y: h.y }, p.pos);
      continue;
    }
    if (activeT > h.active) { list.splice(i, 1); continue; }
    if (h.kind === 'beam') {
      h.angle += h.sweep * dt;
      if (h.trackActive) {
        const want = ang({ x: h.x, y: h.y }, p.pos);
        const diff = Math.atan2(Math.sin(want - h.angle), Math.cos(want - h.angle));
        h.angle += Math.max(-h.trackActive * dt, Math.min(h.trackActive * dt, diff));
      }
      const inBeam = segDist(p.pos.x, p.pos.y, h.x, h.y, h.angle, h.length) < h.width / 2 + p.radius * 0.6;
      if (h.pull && segDist(p.pos.x, p.pos.y, h.x, h.y, h.angle, h.length) < h.width * 1.2) {
        const a = ang(p.pos, { x: h.x, y: h.y }); const k = Math.min(h.pull, p.speed * 0.7); p.pos.x += Math.cos(a) * k * dt; p.pos.y += Math.sin(a) * k * dt;
      }
      if (!h.harmless && inBeam) {
        if (h.continuous) hurtPlayer(state, h.damage, true, dt);
        else if (!h.hit) { h.hit = true; hurtPlayer(state, h.damage, false); }
      }
    } else if (h.kind === 'circle') {
      const inside = dist(p.pos, { x: h.x, y: h.y }) < h.radius + p.radius * 0.5;
      if (!h.harmless && inside) {
        if (h.continuous) hurtPlayer(state, h.damage, true, dt);
        else if (!h.hit) { h.hit = true; hurtPlayer(state, h.damage, false); }
      }
      if (!h.continuous && !h.hit && activeT < dt * 1.5) spawnParticles(state, { x: h.x, y: h.y }, h.color, 6);
      if (!h.continuous) h.hit = true; // il colpo e' istantaneo: solo il primo frame conta
    } else if (h.kind === 'ring') {
      h.radius += h.ringSpeed * dt;
      if (h.radius > h.maxRadius) { list.splice(i, 1); continue; }
      const dd = dist(p.pos, { x: h.x, y: h.y });
      if (!h.hit && Math.abs(dd - h.radius) < h.width / 2 + p.radius * 0.6) {
        const a = ang({ x: h.x, y: h.y }, p.pos);
        let inGap = false;
        for (let g = 0; g < h.gapCount; g++) {
          const ga = h.gapAngle + (g * TAU) / h.gapCount;
          if (Math.abs(Math.atan2(Math.sin(a - ga), Math.cos(a - ga))) <= h.gapSize / 2) { inGap = true; break; }
        }
        if (!inGap) { h.hit = true; hurtPlayer(state, h.damage, false); }
      }
    } else if (h.kind === 'well') {
      const dd = dist(p.pos, { x: h.x, y: h.y });
      if (dd < h.radius && dd > 1) {
        const a = ang(p.pos, { x: h.x, y: h.y });
        const k = Math.min(h.pull * (0.35 + 0.65 * (1 - dd / h.radius)), p.speed * 0.7); // la spinta non supera mai il 70% della velocita' del giocatore
        p.pos.x += Math.cos(a) * k * dt; p.pos.y += Math.sin(a) * k * dt;
      }
      if (!h.harmless && h.continuous && dd < 60) hurtPlayer(state, h.damage, true, dt);
    }
  }
}

/** Rimuove tutte le zone di un boss (quando muore). */
export function clearBossHazards(state: GameState, bossId?: string): void {
  const list = hazards(state);
  for (let i = list.length - 1; i >= 0; i--) if (!bossId || list[i].followBoss === bossId || list[i].followBoss === undefined) list.splice(i, 1);
}

// ---------------------------------------------------------------------------
// DISEGNO
// ---------------------------------------------------------------------------
function drawBeam(ctx: CanvasRenderingContext2D, h: BossHazard, time: number) {
  const charging = h.t < h.telegraph;
  const prog = Math.min(1, h.t / Math.max(0.01, h.telegraph));
  ctx.save();
  ctx.translate(h.x, h.y); ctx.rotate(h.angle);
  if (charging) {
    // preavviso: zona tratteggiata che si riempie
    ctx.globalAlpha = 0.18 + 0.12 * Math.sin(time * 18);
    ctx.fillStyle = h.color;
    ctx.fillRect(0, -h.width / 2, h.length, h.width);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, -h.width / 2 * prog, h.length, h.width * prog);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = h.color; ctx.lineWidth = 2; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(0, -h.width / 2); ctx.lineTo(h.length, -h.width / 2); ctx.moveTo(0, h.width / 2); ctx.lineTo(h.length, h.width / 2); ctx.stroke();
    ctx.setLineDash([]);
    if (h.style === 'dash') { // freccia del balzo
      ctx.fillStyle = h.color; ctx.globalAlpha = 0.6;
      const ax = h.length - 10; ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax - 40, -h.width * 0.4); ctx.lineTo(ax - 40, h.width * 0.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (h.harmless && h.style === 'dash') { ctx.restore(); return; }
  const fade = h.active > 0.4 ? Math.min(1, (h.telegraph + h.active - h.t) / 0.15) : 1 - (h.t - h.telegraph) / Math.max(0.01, h.active);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, fade);
  if (h.style === 'tentacle') {
    // tentacolo: forma affusolata ondulata
    const segs = 18;
    ctx.fillStyle = h.color;
    ctx.beginPath();
    for (let k = 0; k <= segs; k++) { const x = (k / segs) * h.length; const w = h.width * (1 - k / segs * 0.75) / 2; const wob = Math.sin(time * 9 + k * 0.7) * h.width * 0.25; ctx.lineTo(x, -w + wob); }
    for (let k = segs; k >= 0; k--) { const x = (k / segs) * h.length; const w = h.width * (1 - k / segs * 0.75) / 2; const wob = Math.sin(time * 9 + k * 0.7) * h.width * 0.25; ctx.lineTo(x, w + wob); }
    ctx.closePath(); ctx.globalAlpha *= 0.85; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let k = 2; k < segs; k += 3) { const x = (k / segs) * h.length; ctx.beginPath(); ctx.arc(x, Math.sin(time * 9 + k * 0.7) * h.width * 0.25, h.width * 0.12 * (1 - k / segs * 0.6), 0, TAU); ctx.fill(); }
  } else {
    const flick = h.style === 'superlaser' || h.style === 'cosmic' ? 0.85 + 0.15 * Math.sin(time * 60) : 1;
    ctx.fillStyle = h.color;
    ctx.globalAlpha = Math.max(0, fade) * 0.28; ctx.fillRect(0, -h.width * 0.9, h.length, h.width * 1.8);
    ctx.globalAlpha = Math.max(0, fade) * 0.85 * flick; ctx.fillRect(0, -h.width / 2, h.length, h.width);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = Math.max(0, fade) * 0.9; ctx.fillRect(0, -h.width * 0.16, h.length, h.width * 0.32);
    if (h.style === 'tractor') {
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) { const x = ((time * -260 + k * 140) % h.length + h.length) % h.length; ctx.beginPath(); ctx.moveTo(x, -h.width / 2); ctx.lineTo(x - 20, 0); ctx.lineTo(x, h.width / 2); ctx.stroke(); }
    }
    // bagliore all'origine
    ctx.globalAlpha = Math.max(0, fade) * 0.7; ctx.fillStyle = h.color;
    ctx.beginPath(); ctx.arc(0, 0, h.width * 0.9, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, h: BossHazard, time: number) {
  const charging = h.t < h.telegraph;
  ctx.save();
  if (charging) {
    const prog = h.t / Math.max(0.01, h.telegraph);
    ctx.globalAlpha = 0.16 + 0.08 * Math.sin(time * 16);
    ctx.fillStyle = h.color; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.32; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * prog, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = h.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.stroke();
    if (h.style === 'eye') { ctx.fillStyle = '#ffe66b'; ctx.globalAlpha = 0.6 * prog; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.radius * 0.5, h.radius * 0.22 * prog, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * 0.12 * prog, 0, TAU); ctx.fill(); }
    ctx.restore(); return;
  }
  const at = h.t - h.telegraph;
  if (h.continuous) {
    // pozza persistente (acido, inchiostro)
    const life = Math.min(1, (h.active - at) / 0.4, at / 0.2);
    const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
    if (h.style === 'ink') { g.addColorStop(0, 'rgba(10,4,24,0.92)'); g.addColorStop(0.7, 'rgba(40,16,70,0.75)'); g.addColorStop(1, 'rgba(40,16,70,0)'); }
    else { g.addColorStop(0, 'rgba(160,255,80,0.55)'); g.addColorStop(0.7, 'rgba(90,200,40,0.4)'); g.addColorStop(1, 'rgba(90,200,40,0)'); }
    ctx.globalAlpha = Math.max(0, life);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * (1 + 0.04 * Math.sin(time * 4)), 0, TAU); ctx.fill();
    if (h.style === 'acid') { ctx.fillStyle = 'rgba(220,255,160,0.7)'; for (let k = 0; k < 5; k++) { const a = time * 1.5 + k * 1.3; const r = h.radius * (0.2 + 0.5 * ((k * 0.37 + time * 0.3) % 1)); ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 3 + (k % 3), 0, TAU); ctx.fill(); } }
  } else {
    // esplosione istantanea
    const k = Math.min(1, at / Math.max(0.01, h.active));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = h.color; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * (0.9 + 0.3 * k), 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (1 - k) * 0.8; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * 0.45 * (1 - k * 0.5), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawRing(ctx: CanvasRenderingContext2D, h: BossHazard) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = h.color; ctx.lineCap = 'round';
  const step = TAU / h.gapCount;
  const arcs = (lw: number) => {
    ctx.lineWidth = lw;
    for (let g = 0; g < h.gapCount; g++) {
      const a0 = h.gapAngle + g * step + h.gapSize / 2, a1 = h.gapAngle + (g + 1) * step - h.gapSize / 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, a0, a1); ctx.stroke();
    }
  };
  ctx.globalAlpha = 0.25; arcs(h.width * 2.2);
  ctx.globalAlpha = 0.9; arcs(h.width);
  ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.7; arcs(h.width * 0.3);
  ctx.restore();
}

function drawWell(ctx: CanvasRenderingContext2D, h: BossHazard, time: number) {
  const charging = h.t < h.telegraph;
  ctx.save();
  const life = charging ? h.t / Math.max(0.01, h.telegraph) * 0.5 : Math.min(1, (h.telegraph + h.active - h.t) / 0.4);
  ctx.globalAlpha = Math.max(0, life);
  const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
  g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.18, 'rgba(10,0,25,0.85)'); g.addColorStop(0.45, h.style === 'whirlpool' ? 'rgba(80,40,160,0.25)' : 'rgba(120,40,200,0.25)'); g.addColorStop(1, 'rgba(60,20,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
  ctx.strokeStyle = h.color; ctx.lineWidth = 2;
  for (let arm = 0; arm < 4; arm++) {
    ctx.globalAlpha = Math.max(0, life) * 0.55;
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) { const t = k / 30; const r = h.radius * (1 - t) + 20; const a = arm * (TAU / 4) + t * 4 + time * 2.4; const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r; if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }
  if (!h.harmless) { ctx.globalAlpha = Math.max(0, life); ctx.strokeStyle = h.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 58 + 4 * Math.sin(time * 8), 0, TAU); ctx.stroke(); }
  ctx.restore();
}

/** Disegna le zone di pericolo (in coordinate del mondo). */
export function drawBossHazards(ctx: CanvasRenderingContext2D, state: GameState, layer: 'ground' | 'top'): void {
  const list = state.bossHazards as BossHazard[] | undefined;
  if (!list || list.length === 0) return;
  if (layer === 'ground') {
    // a terra, sotto i nemici: pozzi gravitazionali e zone
    for (const h of list) if (h.kind === 'well') drawWell(ctx, h, state.time);
    for (const h of list) if (h.kind === 'circle') drawCircle(ctx, h, state.time);
  } else {
    // sopra: raggi e onde d'urto
    for (const h of list) if (h.kind === 'beam') drawBeam(ctx, h, state.time);
    for (const h of list) if (h.kind === 'ring' && h.t >= h.telegraph) drawRing(ctx, h);
  }
}

/** Scudo esagonale del Borg e aura della seconda fase, disegnati sul boss. */
export function drawBossAura(ctx: CanvasRenderingContext2D, boss: Enemy, time: number): void {
  const ai = (boss as any).ai as BossAI | undefined;
  if (!ai) return;
  ctx.save();
  if (ai.enraged) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 6);
    const g = ctx.createRadialGradient(0, 0, boss.radius * 0.6, 0, 0, boss.radius * 1.5);
    g.addColorStop(0, 'rgba(255,40,80,0)'); g.addColorStop(0.7, 'rgba(255,40,80,0.6)'); g.addColorStop(1, 'rgba(255,40,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, boss.radius * 1.5, 0, TAU); ctx.fill();
  }
  if (ai.shield > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#5cff8c'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 10);
    const R = boss.radius * 1.35;
    ctx.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + time * 0.5; const x = Math.cos(a) * R, y = Math.sin(a) * R; if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    ctx.globalAlpha *= 0.25; ctx.fillStyle = '#5cff8c'; ctx.fill();
  }
  ctx.restore();
}
