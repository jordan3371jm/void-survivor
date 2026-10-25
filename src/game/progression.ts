// ---------------------------------------------------------------------------
// Scrigni del tesoro, evoluzione delle armi e oggetti da raccogliere.
// ---------------------------------------------------------------------------
import type { AbilityType, ChestReward, GameState, Pickup, Vector2 } from './types';

/** Arma -> passiva necessaria per l'evoluzione (arma al livello massimo + passiva + scrigno di un boss). */
export const EVOLUTIONS: Partial<Record<AbilityType, AbilityType>> = {
  homing_laser: 'passive_fusion_core',
  photon_gun: 'passive_kinetic_accelerator',
  ion_gun: 'passive_void_tome',
  drone_swarm: 'passive_molecular_replicator',
  gravity_waves: 'passive_gravity_field',
  void_lance: 'passive_void_tome',
  cryo_lance: 'passive_quantum_binder',
  energy_shield: 'passive_plating',
  asteroid_fragment: 'passive_stellar_candelabrum',
  antimatter_bomb: 'passive_quantum_reactor',
  laser_swords: 'passive_fusion_core',
  kinetic_darts: 'passive_kinetic_accelerator',
  meteor: 'passive_stellar_candelabrum',
  neutronium_boomerang: 'passive_neutronium_heart',
  orbiting_satellites: 'passive_quantum_binder',
  plasma_flamethrower: 'passive_pulsar_heart',
  gravity_field: 'passive_gravity_field',
  corrosive_nebula: 'passive_regen_core',
  quantum_bounce: 'passive_quantum_binder',
  ion_storm: 'passive_ionic_thrusters',
  stellar_blackhole: 'passive_cosmic_dust',
  probe_x: 'passive_galactic_crown',
  probe_y: 'passive_galactic_coin',
};

let pid = 0;

export function spawnPickup(state: GameState, pos: Vector2, type: Pickup['type']): void {
  if (!state.pickups) state.pickups = [];
  if (type !== 'chest' && state.pickups.length > 25) return;
  state.pickups.push({ id: `p${pid++}`, type, pos: { x: pos.x, y: pos.y }, t: 0 });
}

/** Possibili oggetti lasciati da un nemico normale. */
export function rollEnemyDrop(state: GameState, pos: Vector2): void {
  const r = Math.random();
  if (r < 0.012) spawnPickup(state, pos, 'heart');
  else if (r < 0.016) spawnPickup(state, pos, 'magnet');
}

/** Calcola il contenuto dello scrigno e lo applica subito. */
function openChest(state: GameState, upgradeAbility: (a: any) => any, applyPassives: () => void): ChestReward[] {
  const p = state.player;
  const rewards: ChestReward[] = [];
  // 1) evoluzione, se possibile (prima arma idonea)
  const owned = new Set(p.abilities.map(a => a.type));
  const evo = p.abilities.find(a => !a.type.startsWith('passive_') && !a.evolved && a.level >= a.maxLevel && EVOLUTIONS[a.type] && owned.has(EVOLUTIONS[a.type]!));
  if (evo) {
    evo.evolved = true;
    evo.damage *= 2.2;
    evo.cooldown = Math.max(0.05, evo.cooldown * 0.7);
    rewards.push({ kind: 'evolve', abilityType: evo.type });
  }
  // 2) fino a 3 potenziamenti di abilita' non al massimo
  const upgradable = p.abilities.filter(a => a.level < a.maxLevel).sort(() => Math.random() - 0.5);
  const count = evo ? 2 : 3;
  for (const a of upgradable.slice(0, count)) {
    const idx = p.abilities.indexOf(a);
    p.abilities[idx] = upgradeAbility(a);
    rewards.push({ kind: 'upgrade', abilityType: a.type, level: a.level + 1 });
  }
  if (rewards.some(r => r.kind === 'upgrade')) applyPassives();
  // 3) monete e cura
  const coins = 100 + 50 * (state.bossesDefeated || 0);
  state.coinsEarned += coins;
  rewards.push({ kind: 'coins', amount: coins });
  const heal = Math.round(p.maxHp * 0.3);
  p.hp = Math.min(p.maxHp, p.hp + heal);
  rewards.push({ kind: 'heal', amount: heal });
  return rewards;
}

/** Raccolta degli oggetti a terra (chiamata ogni frame). */
export function updatePickups(state: GameState, dt: number, upgradeAbility: (a: any) => any, applyPassives: () => void, onSfx: (t: string) => void): void {
  const list = state.pickups;
  if (!list || list.length === 0) return;
  const p = state.player;
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    it.t += dt;
    const dx = p.pos.x - it.pos.x, dy = p.pos.y - it.pos.y;
    const d = Math.hypot(dx, dy);
    // gli oggetti vicini vengono attirati verso la nave
    const attract = it.type === 'chest' ? 170 : Math.max(120, p.magnetRange * 1.3);
    if (d < attract && d > 1) { const sp = 260 * dt; it.pos.x += dx / d * Math.min(sp, d); it.pos.y += dy / d * Math.min(sp, d); }
    if (d > p.radius + 22) continue;
    list.splice(i, 1);
    if (it.type === 'heart') { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25); onSfx('levelup'); }
    else if (it.type === 'magnet') { for (const o of state.expOrbs) o.magnetized = true; onSfx('energy_shield'); }
    else if (it.type === 'chest') { state.chestPending = openChest(state, upgradeAbility, applyPassives); onSfx('levelup'); }
  }
}

export function claimChest(state: GameState): void {
  state.chestPending = null;
}

const TAU = Math.PI * 2;

/** Disegno degli oggetti a terra (coordinate del mondo). */
export function drawPickups(ctx: CanvasRenderingContext2D, state: GameState): void {
  const list = state.pickups;
  if (!list) return;
  for (const it of list) {
    const bob = Math.sin(state.time * 4 + it.pos.x) * 3;
    const x = it.pos.x, y = it.pos.y + bob;
    ctx.save();
    // alone
    ctx.globalCompositeOperation = 'lighter';
    const col = it.type === 'heart' ? '255,60,100' : it.type === 'magnet' ? '80,180,255' : '255,200,60';
    const g = ctx.createRadialGradient(x, y, 2, x, y, it.type === 'chest' ? 60 : 30);
    g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, it.type === 'chest' ? 60 : 30, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (it.type === 'heart') {
      ctx.fillStyle = '#ff3d6e'; ctx.strokeStyle = '#ffd1dc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 9);
      ctx.bezierCurveTo(x - 16, y - 2, x - 9, y - 15, x, y - 6);
      ctx.bezierCurveTo(x + 9, y - 15, x + 16, y - 2, x, y + 9);
      ctx.fill(); ctx.stroke();
    } else if (it.type === 'magnet') {
      ctx.lineWidth = 6; ctx.lineCap = 'butt';
      ctx.strokeStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(x, y, 9, Math.PI, TAU); ctx.stroke();
      ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 9, y + 8); ctx.moveTo(x + 9, y); ctx.lineTo(x + 9, y + 8); ctx.stroke();
    } else {
      // scrigno: base, coperchio, borchie dorate, raggi di luce
      const s = 1 + Math.sin(state.time * 5) * 0.05;
      ctx.translate(x, y); ctx.scale(s, s);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,220,120,0.25)';
      for (let k = 0; k < 8; k++) { const a = state.time * 0.8 + k * TAU / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.12) * 70, Math.sin(a - 0.12) * 70); ctx.lineTo(Math.cos(a + 0.12) * 70, Math.sin(a + 0.12) * 70); ctx.closePath(); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#7c3a12'; ctx.fillRect(-20, -4, 40, 22);
      ctx.fillStyle = '#a3521c'; ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(0, -24, 22, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(-22, -6, 44, 4); ctx.fillRect(-3, -8, 6, 26); ctx.fillRect(-22, 14, 44, 4);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(-4, 2, 8, 7);
    }
    ctx.restore();
  }
}
