import { describe, it, expect } from 'vitest';
import { createInitialState, updateGame, spawnEnemy, applyLevelUpChoice, applyShopStats } from '../engine';
import type { GameState, Projectile } from '../types';

const DT = 1 / 60;

/** Stato "vuoto": nessuna arma e nessun nemico, cosi' ogni test controlla solo cio' che mette in scena. */
function emptyState(mode: GameState['gameMode'] = 'normal'): GameState {
  const s = createInitialState('starter', mode);
  s.player.abilities = [];
  s.enemies = [];
  s.projectiles = [];
  return s;
}

function bullet(x: number, y: number, damage: number): Projectile {
  return { id: 'b1', pos: { x, y }, vel: { x: 0, y: 0 }, radius: 6, hp: 1, maxHp: 1, damage, fromPlayer: true, lifetime: 2, maxLifetime: 2, type: 'photon_shot', color: '#fff', trail: [] };
}

/** Fa avanzare la partita scegliendo sempre la prima carta del level up e chiudendo gli scrigni. */
function run(s: GameState, seconds: number, each?: (s: GameState) => void) {
  for (let i = 0; i < seconds / DT && !s.gameOver; i++) {
    if (s.levelUpPending && s.levelUpChoices.length) applyLevelUpChoice(s, s.levelUpChoices[0]);
    if (s.chestPending) s.chestPending = null;
    each?.(s);
    updateGame(s, DT);
  }
}

describe('nemici gia\' distrutti nello stesso frame', () => {
  it('non fanno danno da contatto', () => {
    const s = emptyState();
    const e = spawnEnemy(s, 'asteroid_medium');
    e.pos = { ...s.player.pos }; e.hp = 0; e.damage = 50;
    s.enemies.push(e);
    const hp = s.player.hp;
    updateGame(s, DT);
    expect(s.player.hp).toBe(hp);
  });

  it('un nemico vivo invece fa danno', () => {
    const s = emptyState();
    const e = spawnEnemy(s, 'asteroid_medium');
    e.pos = { ...s.player.pos }; e.damage = 50;
    s.enemies.push(e);
    const hp = s.player.hp;
    updateGame(s, DT);
    expect(s.player.hp).toBeLessThan(hp);
  });

  it('non assorbono i proiettili: il colpo arriva al nemico vivo dietro', () => {
    const s = emptyState();
    const where = { x: s.player.pos.x + 300, y: s.player.pos.y };
    const dead = spawnEnemy(s, 'asteroid_medium'); dead.pos = { ...where }; dead.hp = 0; dead.vel = { x: 0, y: 0 }; dead.speed = 0;
    const alive = spawnEnemy(s, 'asteroid_medium'); alive.pos = { ...where }; alive.hp = alive.maxHp = 1000; alive.vel = { x: 0, y: 0 }; alive.speed = 0;
    s.enemies.push(dead, alive);
    s.projectiles.push(bullet(where.x, where.y, 40));
    updateGame(s, DT);
    expect(alive.hp).toBeLessThan(1000);
  });
});

describe('partita simulata', () => {
  it('3 minuti di modalita\' normale senza valori non validi e con il tetto dei nemici', () => {
    const s = createInitialState('starter', 'normal');
    s.player.hp = s.player.maxHp = 1e9; // il giocatore non muore: si controlla la simulazione
    run(s, 180, st => {
      expect(Number.isFinite(st.player.pos.x) && Number.isFinite(st.player.pos.y)).toBe(true);
      expect(st.enemies.filter(e => !e.isBoss && !e.isMini).length).toBeLessThanOrEqual(270 + 20);
    });
    expect(s.kills).toBeGreaterThan(0);
    expect(s.player.level).toBeGreaterThan(1);
    expect(s.player.abilities.length).toBeGreaterThan(0);
  });

  it('Boss Rush: sconfiggere tutti gli 8 boss da' + "'" + ' la vittoria', () => {
    const s = createInitialState('starter', 'boss_rush');
    s.player.hp = s.player.maxHp = 1e9;
    run(s, 600, st => { for (const e of st.enemies) if (e.isBoss && e.hp > 0) e.hp = 0; });
    expect(s.gameOver).toBe(true);
    expect(s.victory).toBe(true);
    expect(s.bossRushIndex).toBe(8);
  });
});

describe('level up', () => {
  it('scegliere una carta aggiunge o potenzia un\'abilita\'', () => {
    const s = createInitialState('starter', 'normal');
    s.player.hp = s.player.maxHp = 1e9;
    run(s, 60, undefined);
    const total = s.player.abilities.reduce((n, a) => n + a.level, 0);
    expect(total).toBeGreaterThanOrEqual(s.player.level);
  });
});

describe('difficolta\' adattata ai potenziamenti del negozio', () => {
  it('senza potenziamenti i nemici restano quelli di sempre', () => {
    const base = createInitialState('starter', 'normal');
    const e0 = spawnEnemy(base, 'star_raider');
    const s = createInitialState('starter', 'normal');
    applyShopStats(s, {});
    const e1 = spawnEnemy(s, 'star_raider');
    expect(e1.damage).toBeCloseTo(e0.damage);
    expect(e1.speed).toBeCloseTo(e0.speed);
    expect(e1.maxHp).toBeCloseTo(e0.maxHp);
  });

  it('piu\' potenziamenti rendono i nemici piu\' forti, ma la nave cresce sempre di piu\'', () => {
    const mid = createInitialState('starter', 'normal'); applyShopStats(mid, { maxHp: 385, shipSpeed: 388, critChance: 15.6, critDamage: 305, regeneration: 1 });
    const top = createInitialState('starter', 'normal'); applyShopStats(top, { maxHp: 600, shipSpeed: 530, critChance: 27.4, critDamage: 424, regeneration: 1.8 });
    expect(mid.shopScale!.damage).toBeGreaterThan(1);
    expect(top.shopScale!.damage).toBeGreaterThan(mid.shopScale!.damage);
    // la vita della nave cresce piu' del danno dei nemici: comprare conviene sempre
    expect(top.player.maxHp / top.shopScale!.damage).toBeGreaterThan(mid.player.maxHp / mid.shopScale!.damage);
    expect(mid.player.maxHp / mid.shopScale!.damage).toBeGreaterThan(100);
  });
});
