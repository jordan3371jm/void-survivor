import { GameState, Player, Enemy, Projectile, Particle, ExpOrb, Star, Nebula, Ability, AbilityType, LevelUpChoice, Vector2, EnemyType, ShipType, DamageNumber, GameMode } from './types';
import { playShoot, playPassiveSound, playHit } from './audio';
import { getAbilityInfo } from './abilityInfo';
import { updateBoss, updateBossHazards, clearBossHazards, drawBossHazards, drawBossAura } from './bosses';
import { updatePickups, drawPickups, spawnPickup, rollEnemyDrop } from './progression';
import { ensureProbe, updateProbes, drawProbes } from './probes';
export { getAbilityInfo } from './abilityInfo';

let idCounter = 0;
const genId = () => `e${idCounter++}`;

// ---------------------------------------------------------------------------
// SPRITE: immagini di nemici, boss e sfondo (public/assets). Se un'immagine non
// e' ancora caricata (o manca) il motore usa il disegno vettoriale originale.
// ---------------------------------------------------------------------------
type SpriteMode = 'up' | 'down' | 'spin' | 'fixed';
const SPRITE_DEFS: Partial<Record<EnemyType, { file: string; scale: number; mode: SpriteMode }>> = {
  asteroid_small: { file: 'asteroid', scale: 1.25, mode: 'spin' },
  asteroid_medium: { file: 'asteroid', scale: 1.25, mode: 'spin' },
  asteroid_large: { file: 'asteroid', scale: 1.25, mode: 'spin' },
  drone_sentinel: { file: 'drone_sentinel', scale: 1.35, mode: 'fixed' },
  star_raider: { file: 'star_raider', scale: 1.5, mode: 'up' },
  void_crawler: { file: 'void_crawler', scale: 1.55, mode: 'up' },
  nebula_wraith: { file: 'nebula_wraith', scale: 1.6, mode: 'fixed' },
  cosmic_leech: { file: 'cosmic_leech', scale: 2.8, mode: 'up' },
  star_jelly: { file: 'star_jelly', scale: 1.6, mode: 'fixed' },
  void_worm: { file: 'void_worm', scale: 1.8, mode: 'up' },
  star_beetle: { file: 'star_beetle', scale: 1.55, mode: 'up' },
  cosmic_moth: { file: 'cosmic_moth', scale: 1.7, mode: 'fixed' },
  void_stinger: { file: 'void_stinger', scale: 1.55, mode: 'up' },
  star_scorpion: { file: 'star_scorpion', scale: 1.55, mode: 'down' },
  cosmic_crab: { file: 'cosmic_crab', scale: 1.5, mode: 'fixed' },
  void_spider: { file: 'void_spider', scale: 1.6, mode: 'up' },
  star_fish: { file: 'star_fish', scale: 1.45, mode: 'spin' },
  cosmic_squid: { file: 'cosmic_squid', scale: 1.7, mode: 'up' },
  star_destroyer: { file: 'star_destroyer', scale: 1.5, mode: 'up' },
  imperial_probe: { file: 'imperial_probe', scale: 1.5, mode: 'fixed' },
  kamikaze: { file: 'kamikaze', scale: 1.55, mode: 'up' },
  parasite: { file: 'parasite', scale: 1.35, mode: 'spin' },
  swarm: { file: 'swarm', scale: 1.7, mode: 'up' },
  guardian: { file: 'guardian.svg', scale: 1.5, mode: 'fixed' },
  boss_death_star: { file: 'boss_death_star', scale: 1.1, mode: 'fixed' },
  boss_xenomorph: { file: 'boss_xenomorph', scale: 1.25, mode: 'fixed' },
  boss_cthulhu: { file: 'boss_cthulhu', scale: 1.25, mode: 'fixed' },
  boss_borg_cube: { file: 'boss_borg_cube', scale: 1.2, mode: 'fixed' },
  boss_space_kraken: { file: 'boss_space_kraken', scale: 1.25, mode: 'fixed' },
  boss_galaxy_devourer: { file: 'boss_galaxy_devourer', scale: 1.2, mode: 'spin' },
  boss_void_emperor: { file: 'boss_void_emperor', scale: 1.25, mode: 'fixed' },
  boss_cosmic_horror: { file: 'boss_cosmic_horror', scale: 1.25, mode: 'fixed' },
};

const ASSET_BASE: string = ((import.meta as any).env && (import.meta as any).env.BASE_URL) || '/';
const spriteCache: Record<string, HTMLImageElement> = {};

function loadImage(path: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = spriteCache[path];
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = `${ASSET_BASE}assets/${path}`;
    spriteCache[path] = img;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Avvia subito il download di tutte le immagini (chiamata una volta all'avvio). */
export function preloadSprites(): void {
  // Subito: sfondo e nemici normali (servono nei primi secondi di partita).
  loadImage('bg_nebula.webp');
  for (const d of Object.values(SPRITE_DEFS)) {
    if (!d || d.file.startsWith('boss_')) continue;
    loadImage(`enemies/${d.file}${d.file.endsWith('.svg') ? '' : '.webp'}`);
  }
  // Dopo: boss, icone e abilita' (arrivano molto piu' tardi in partita), cosi' non rallentano l'avvio.
  setTimeout(() => {
    for (const d of Object.values(SPRITE_DEFS)) if (d && d.file.startsWith('boss_')) loadImage(`bosses/${d.file}.webp`);
    for (const t of BOSS_ICON_TYPES) loadImage(`icons/${t}.webp`);
    for (const t of ABILITY_SPRITE_TYPES) loadImage(`abilities/${t}.webp`);
  }, 2500);
}

/** Zoom del mondo di gioco: sugli schermi piccoli si vede un'area piu' ampia. */
export function getWorldZoom(width: number): number {
  return width < 768 ? 0.7 : 1.0;
}

/** Immagini delle astronavi (public/assets/ships/<tipo>.webp, 256x256, sfondo trasparente). */
export function getShipSprite(shipType: string): HTMLImageElement | null {
  return loadImage(`ships/${shipType}.webp`);
}

/** Icone delle abilità (public/assets/abilities/<tipo>.webp, 128x128, tonde). */
export function getAbilitySprite(type: string): HTMLImageElement | null {
  return loadImage(`abilities/${type}.webp`);
}

const ABILITY_SPRITE_TYPES = ['photon_gun', 'ion_gun', 'drone_swarm', 'gravity_waves', 'void_lance', 'cryo_lance', 'energy_shield', 'asteroid_fragment', 'antimatter_bomb', 'laser_swords', 'homing_laser', 'kinetic_darts', 'meteor', 'neutronium_boomerang', 'orbiting_satellites', 'plasma_flamethrower', 'gravity_field', 'corrosive_nebula', 'quantum_bounce', 'ion_storm', 'stellar_blackhole', 'probe_x', 'probe_y', 'passive_fusion_core', 'passive_plating', 'passive_neutronium_heart', 'passive_regen_core', 'passive_void_tome', 'passive_stellar_candelabrum', 'passive_kinetic_accelerator', 'passive_quantum_binder', 'passive_molecular_replicator', 'passive_ionic_thrusters', 'passive_gravity_field', 'passive_stellar_fortune', 'passive_galactic_crown', 'passive_cosmic_dust', 'passive_quantum_reactor', 'passive_pulsar_heart', 'passive_galactic_coin'];

const BOSS_ICON_TYPES: EnemyType[] = ['boss_death_star', 'boss_xenomorph', 'boss_cthulhu', 'boss_borg_cube', 'boss_space_kraken', 'boss_galaxy_devourer', 'boss_void_emperor', 'boss_cosmic_horror'];

/** Icona del boss (128x128, sfondo trasparente) oppure null se non ancora caricata. */
export function getBossIcon(type: string): HTMLImageElement | null {
  return loadImage(`icons/${type}.webp`);
}

/** Disegna lo sprite di un nemico/boss centrato sull'origine corrente. Ritorna false se va usato il disegno vettoriale. */
function drawEnemySprite(ctx: CanvasRenderingContext2D, enemy: Enemy, state: GameState): boolean {
  const def = SPRITE_DEFS[enemy.type];
  if (!def) return false;
  const extension = def.file.endsWith('.svg') ? '' : '.webp';
  const img = loadImage(`${enemy.isBoss ? 'bosses' : 'enemies'}/${def.file}${extension}`);
  if (!img) return false;
  const size = Math.max(enemy.radius * 2 * def.scale, enemy.isBoss ? 0 : 44);
  let seed = 0;
  for (let i = 0; i < enemy.id.length; i++) seed = (seed * 31 + enemy.id.charCodeAt(i)) % 997;
  ctx.save();
  if (def.mode === 'up' || def.mode === 'down') {
    const ang = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
    ctx.rotate(ang + (def.mode === 'up' ? Math.PI / 2 : -Math.PI / 2));
  } else if (def.mode === 'spin') {
    ctx.rotate(seed + state.time * (enemy.isBoss ? 0.25 : 0.6));
  }
  // leggero "respiro" per dare vita agli sprite statici
  const pulse = 1 + Math.sin(state.time * (enemy.isBoss ? 1.5 : 3) + seed) * (enemy.isBoss ? 0.02 : 0.04);
  ctx.scale(pulse, pulse);
  if (enemy.isBoss) { ctx.shadowColor = enemy.color; ctx.shadowBlur = 25; }
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  // lampo bianco quando il nemico viene colpito
  const ee = enemy as any;
  if (ee.__lastHp !== undefined && enemy.hp < ee.__lastHp - 0.5) ee.__flash = 0.09;
  ee.__lastHp = enemy.hp;
  if (ee.__flash > 0) {
    ee.__flash -= 1 / 60;
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  }
  ctx.restore();
  return true;
}

/** Sfondo nebulosa: immagine ripetibile senza cuciture, con parallasse lenta e velo scuro per far risaltare il gioco. */
function drawNebulaBackground(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }, width: number, height: number): void {
  const bg = loadImage('bg_nebula.webp');
  if (!bg) return;
  const s = Math.max(0.75, Math.min(width, height) / 1100);
  const tw = bg.naturalWidth * s, th = bg.naturalHeight * s;
  const offX = ((camera.x * 0.08) % tw + tw) % tw, offY = ((camera.y * 0.08) % th + th) % th;
  for (let y = -offY; y < height; y += th) {
    for (let x = -offX; x < width; x += tw) ctx.drawImage(bg, x, y, tw + 1, th + 1);
  }
  // velo scuro: lo sfondo resta bello ma non compete con nemici e proiettili
  ctx.fillStyle = 'rgba(4, 5, 14, 0.28)';
  ctx.fillRect(0, 0, width, height);
}

preloadSprites();

export function createInitialState(shipType: ShipType = 'starter', gameMode: GameMode = 'normal'): GameState {
  const stars: Star[] = [];
  for (let i = 0; i < 100; i++) {
    stars.push({ x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000, size: Math.random() * 2 + 0.5, speed: Math.random() * 0.3 + 0.1, brightness: Math.random(), layer: Math.floor(Math.random() * 3) });
  }
  const nebulae: Nebula[] = [];
  for (let i = 0; i < 5; i++) {
    nebulae.push({ x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000, radius: Math.random() * 300 + 100, color: ['#4a0080', '#003366', '#006644'][Math.floor(Math.random() * 3)], speed: Math.random() * 0.2 + 0.05, opacity: Math.random() * 0.3 + 0.1 });
  }
  let initialAbility: AbilityType = 'homing_laser';
  switch (shipType) {
    case 'fire_ship': initialAbility = 'plasma_flamethrower'; break;
    case 'laser_ship': initialAbility = 'laser_swords'; break;
    case 'electric_ship': initialAbility = 'ion_storm'; break;
    case 'nuclear_ship': initialAbility = 'antimatter_bomb'; break;
    case 'shadow_ship': initialAbility = 'gravity_field'; break;
    case 'mechanical_ship': initialAbility = 'orbiting_satellites'; break;
    case 'bio_ship': initialAbility = 'corrosive_nebula'; break;
    case 'photon_ship': initialAbility = 'photon_gun'; break;
    case 'ion_ship': initialAbility = 'ion_gun'; break;
    case 'drone_ship': initialAbility = 'drone_swarm'; break;
    case 'gravity_ship': initialAbility = 'gravity_waves'; break;
    case 'void_ship': initialAbility = 'void_lance'; break;
    case 'cryo_ship': initialAbility = 'cryo_lance'; break;
    case 'shield_ship': initialAbility = 'energy_shield'; break;
    case 'asteroid_ship': initialAbility = 'asteroid_fragment'; break;
    case 'kinetic_ship': initialAbility = 'kinetic_darts'; break;
    case 'meteor_ship': initialAbility = 'meteor'; break;
    case 'boomerang_ship': initialAbility = 'neutronium_boomerang'; break;
    case 'quantum_ship': initialAbility = 'quantum_bounce'; break;
    case 'blackhole_ship': initialAbility = 'stellar_blackhole'; break;
    case 'probe_x_ship': initialAbility = 'probe_x'; break;
    case 'probe_y_ship': initialAbility = 'probe_y'; break;
    case 'tie_fighter_ship': initialAbility = 'kinetic_darts'; break;
    case 'viper_ship': initialAbility = 'quantum_bounce'; break;
    case 'federation_ship': initialAbility = 'energy_shield'; break;
  }
  // Boss Rush: il Buco Nero (danno a tutto lo schermo) renderebbe la modalita' troppo facile
  if (gameMode === 'boss_rush' && initialAbility === 'stellar_blackhole') initialAbility = 'gravity_waves';
  const player: Player = {
    id: 'player', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, radius: 15, hp: 100, maxHp: 100, damage: 10,
    exp: 0, level: 1, expToNext: 10, speed: 200, magnetRange: 80,
    abilities: [createAbility(initialAbility)], fusions: [],
    invincibleTimer: 0, armor: 0, shootFlash: 0, shieldHits: 0, points: 0,
    currentShip: shipType, abilityAttackBonuses: {},
    weaponPower: 1.0, maxHealthBonus: 0, regenPerSecond: 0, cooldownReduction: 0,
    areaBonus: 0, projectileSpeedBonus: 0, durationBonus: 0, projectileCountBonus: 0,
    moveSpeedBonus: 0, pickupRangeBonus: 0, luckBonus: 0, rarityBonus: 0,
    expBonus: 0, coinBonus: 0, hasRevive: false, curseLevel: 0, critChance: 0, critDamage: 150
  };
  return {
    player, enemies: [], projectiles: [], particles: [], expOrbs: [], drones: [],
    laserSwords: [], orbitingProbes: [], gravityWaves: [], nebulaPools: [], stormHitboxes: [], damageNumbers: [], stars, nebulae,
    camera: { x: 0, y: 0 }, time: 0, wave: 1, waveTimer: 0, gameOver: false,
    paused: false, levelUpPending: false, levelUpChoices: [], score: 0, kills: 0,
    bossActive: false, currentBossType: null, bossNameTimer: 0, screenShake: 0, keys: new Set(), coinsEarned: 0, diamondsEarned: 0,
    reviveUsed: false, revivePending: false, abilityDamageStats: {},
    speedMultiplier: 1.0, speedBoostTimer: 0,
    currentPlayTime: 0, currentLevel: 1, currentWave: 1, currentScore: 0, currentKills: 0,
    gameMode, bossRushIndex: 0, bossesDefeated: 0, victory: false, pickups: [], chestPending: null, rerolls: 2
  };
}

export function createAbility(type: AbilityType): Ability {
  const info = getAbilityInfo(type);
  return { type, level: 1, maxLevel: 5, timer: 0, cooldown: info.baseCooldown, damage: info.baseDamage, area: 50, projectiles: 1, name: info.name, description: info.description, color: info.color, rarity: info.rarity };
}

export function upgradeAbility(ability: Ability): Ability {
  const newLevel = ability.level + 1;
  return { ...ability, level: newLevel, damage: ability.damage * 1.3, area: ability.area * 1.15, projectiles: Math.min(ability.projectiles + (newLevel % 2 === 0 ? 1 : 0), 8), cooldown: Math.max(ability.cooldown * 0.9, 0.05) };
}

export function applySinglePassiveAbility(abilityType: string): void {
  if (abilityType.startsWith('passive_')) playPassiveSound(abilityType);
}

export function applyPassiveAbilities(player: Player): void {
  // Valori di base (nave + shop): catturati UNA volta, prima che le passive li modifichino.
  // Prima: armatura/rigenerazione/fortuna/EXP/salute/velocita venivano accumulate o azzerate
  // a ogni level-up e i potenziamenti permanenti dello shop andavano persi.
  if (!player.base) {
    player.base = { maxHp: player.maxHp, speed: player.speed, magnetRange: player.magnetRange, armor: player.armor, regen: player.regenPerSecond, luck: player.luckBonus, exp: player.expBonus };
  }
  const b = player.base;
  player.weaponPower = 1.0; player.maxHealthBonus = 0; player.regenPerSecond = 0;
  player.cooldownReduction = 0; player.areaBonus = 0; player.projectileSpeedBonus = 0;
  player.durationBonus = 0; player.projectileCountBonus = 0; player.moveSpeedBonus = 0;
  player.pickupRangeBonus = 0; player.luckBonus = 0; player.rarityBonus = 0;
  player.expBonus = 0; player.coinBonus = 0; player.hasRevive = false; player.curseLevel = 0;
  let passiveArmor = 0;
  for (const ability of player.abilities) {
    if (!ability.type.startsWith('passive_')) continue;
    const level = ability.level;
    switch (ability.type) {
      case 'passive_fusion_core': player.weaponPower += 0.10 * level; break;
      case 'passive_plating': passiveArmor += 3 * level; break;
      case 'passive_neutronium_heart': player.maxHealthBonus += 0.20 * level; break;
      case 'passive_regen_core': player.regenPerSecond += 1 * level; break;
      case 'passive_void_tome': player.cooldownReduction += 0.10 * level; break;
      case 'passive_stellar_candelabrum': player.areaBonus += 0.10 * level; break;
      case 'passive_kinetic_accelerator': player.projectileSpeedBonus += 0.10 * level; break;
      case 'passive_quantum_binder': player.durationBonus += 0.10 * level; break;
      case 'passive_molecular_replicator': player.projectileCountBonus += 1 * level; break;
      case 'passive_ionic_thrusters': player.moveSpeedBonus += 0.10 * level; break;
      case 'passive_gravity_field': player.pickupRangeBonus += 0.10 * level; break;
      case 'passive_stellar_fortune': player.luckBonus += 0.10 * level; player.rarityBonus += 10 * level; break;
      case 'passive_galactic_crown': player.expBonus += 0.10 * level; break;
      case 'passive_cosmic_dust': player.hasRevive = !player.dustReviveUsed; break;
      case 'passive_quantum_reactor': player.weaponPower += 0.04 * level; player.projectileSpeedBonus += 0.04 * level; player.durationBonus += 0.04 * level; player.areaBonus += 0.04 * level; player.curseLevel += 20 * level; break;
      // Maledizione: +10% per livello (liv.5 = +50%). Rende i nemici piu' forti, veloci, numerosi e frequenti.
      case 'passive_pulsar_heart': player.curseLevel += 10 * level; break;
      case 'passive_galactic_coin': player.coinBonus += 0.10 * level; break;
    }
  }
  // Ricombina con i valori di base (shop/nave)
  player.armor = b.armor + passiveArmor;
  player.regenPerSecond += b.regen;
  player.luckBonus += b.luck;
  player.expBonus += b.exp;
  const newMaxHp = b.maxHp * (1 + player.maxHealthBonus);
  const hpDelta = newMaxHp - player.maxHp;
  player.maxHp = newMaxHp;
  if (hpDelta > 0) player.hp += hpDelta; else if (player.hp > player.maxHp) player.hp = player.maxHp;
  player.speed = b.speed * (1 + player.moveSpeedBonus);
  player.magnetRange = b.magnetRange * (1 + player.pickupRangeBonus);
}

function dist(a: Vector2, b: Vector2): number { const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function normalize(v: Vector2): Vector2 { const d = Math.sqrt(v.x * v.x + v.y * v.y); if (d === 0) return { x: 0, y: 0 }; return { x: v.x / d, y: v.y / d }; }
function angle(from: Vector2, to: Vector2): number { return Math.atan2(to.y - from.y, to.x - from.x); }
// Impulso dello Scudo Energetico: quando il scudo assorbe un colpo danneggia i nemici vicini.
// Prima lo scudo non faceva alcun danno: le navi con Scudo non potevano uccidere nessuno
// ne' guadagnare esperienza, quindi non potevano mai sbloccare un'arma.
function shieldPulse(state: GameState): void {
  const p = state.player;
  const sh = p.abilities.find(a => a.type === 'energy_shield');
  if (!sh) return;
  const pulseDmg = (10 + 8 * sh.level) * p.weaponPower * (1 + (p.damage - 10) * 0.05);
  const radius = (110 + 10 * sh.level) * (1 + p.areaBonus);
  for (const e of state.enemies) {
    if (dist(p.pos, e.pos) < radius + e.radius) {
      e.hp -= pulseDmg;
      spawnDamageNumber(state, e.pos, pulseDmg, sh.color, false, 'energy_shield');
      spawnParticles(state, e.pos, sh.color, 3);
    }
  }
  spawnParticles(state, p.pos, sh.color, 10);
}
// Numero di satelliti: 3 di base + 1 per livello (max 5) + 1 per ogni punto di bonus quantita'.
// Prima il bonus MOLTIPLICAVA il numero (fino a 30 satelliti con il Replicatore Molecolare) e ogni
// satellite faceva danno pieno sullo stesso nemico: l'abilita' diventava la piu' forte del gioco.
function getSatelliteCount(player: Player, level: number): number {
  return Math.min(level, 5) + 3 + Math.floor(Math.max(0, player.projectileCountBonus));
}
function getNearestEnemy(state: GameState, pos: Vector2, maxDist: number = 1000): Enemy | null { let nearest: Enemy | null = null; let minDist = maxDist; for (const enemy of state.enemies) { const d = dist(pos, enemy.pos); if (d < minDist) { minDist = d; nearest = enemy; } } return nearest; }

export function spawnEnemy(state: GameState, type: EnemyType): Enemy {
  const screenWidth = window.innerWidth; const screenHeight = window.innerHeight;
  const screenDiagonal = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight) / getWorldZoom(screenWidth);
  const spawnDist = Math.max(screenDiagonal * 0.6, 400) + Math.random() * 200;
  const spawnAngle = Math.random() * Math.PI * 2;
  const pos = { x: state.player.pos.x + Math.cos(spawnAngle) * spawnDist, y: state.player.pos.y + Math.sin(spawnAngle) * spawnDist };
  
  // Calcola il moltiplicatore di difficoltà
  // Forza dei nemici legata all'ONDATA: all'inizio sono deboli, poi ogni ondata hanno piu' vita
  // (crescita che accelera nelle ondate avanzate: per questo servono i potenziamenti del negozio)
  const waveIdx = Math.max(0, state.wave - 1);
  let timeMultiplier = 1 + waveIdx * 0.22 + waveIdx * waveIdx * 0.004;
  
  // Modalità Endless: dopo l'onda 40, aumenta la difficoltà del 10% per ogni ondata
  if (state.gameMode === 'endless' && state.wave > 40) {
    const endlessMultiplier = 1 + (state.wave - 40) * 0.1;
    timeMultiplier *= endlessMultiplier;
  }
  const baseEnemies: Record<string, any> = {
    asteroid_small: { radius: 15, hp: 5 * timeMultiplier, speed: 40, expValue: 2, color: '#886644', pattern: 'chase' },
    asteroid_medium: { radius: 30, hp: 8 * timeMultiplier, speed: 25, expValue: 5, color: '#775533', pattern: 'chase' },
    asteroid_large: { radius: 50, hp: 15 * timeMultiplier, speed: 15, expValue: 10, color: '#664422', pattern: 'chase' },
    drone_sentinel: { radius: 16, hp: 6 * timeMultiplier, speed: 50, expValue: 3, color: '#6688ff', pattern: 'chase' },
    star_raider: { radius: 20, hp: 8 * timeMultiplier, speed: 65, expValue: 4, color: '#ff6644', pattern: 'chase' },
    void_crawler: { radius: 18, hp: 7 * timeMultiplier, speed: 55, expValue: 3, color: '#8844ff', pattern: 'chase' },
    nebula_wraith: { radius: 22, hp: 9 * timeMultiplier, speed: 70, expValue: 5, color: '#44ffff', pattern: 'chase' },
    cosmic_leech: { radius: 14, hp: 6 * timeMultiplier, speed: 75, expValue: 3, color: '#ff44aa', pattern: 'chase' },
    star_jelly: { radius: 24, hp: 10 * timeMultiplier, speed: 45, expValue: 5, color: '#aaffff', pattern: 'chase' },
    void_worm: { radius: 26, hp: 12 * timeMultiplier, speed: 60, expValue: 6, color: '#aa44ff', pattern: 'chase' },
    star_beetle: { radius: 17, hp: 7 * timeMultiplier, speed: 65, expValue: 3, color: '#ffaa44', pattern: 'chase' },
    cosmic_moth: { radius: 20, hp: 8 * timeMultiplier, speed: 70, expValue: 4, color: '#ff88ff', pattern: 'chase' },
    void_stinger: { radius: 15, hp: 7 * timeMultiplier, speed: 80, expValue: 3, color: '#ff4488', pattern: 'chase' },
    star_scorpion: { radius: 22, hp: 9 * timeMultiplier, speed: 55, expValue: 4, color: '#ffcc44', pattern: 'chase' },
    cosmic_crab: { radius: 20, hp: 8 * timeMultiplier, speed: 50, expValue: 4, color: '#ff8844', pattern: 'chase' },
    void_spider: { radius: 19, hp: 8 * timeMultiplier, speed: 75, expValue: 4, color: '#aa00ff', pattern: 'chase' },
    star_fish: { radius: 18, hp: 7 * timeMultiplier, speed: 60, expValue: 3, color: '#44aaff', pattern: 'chase' },
    cosmic_squid: { radius: 23, hp: 10 * timeMultiplier, speed: 55, expValue: 5, color: '#ff44ff', pattern: 'chase' },
    star_destroyer: { radius: 25, hp: 20 * timeMultiplier, speed: 40, expValue: 8, color: '#888888', pattern: 'shoot', shootTimer: 0, shootInterval: 2.5 },
    imperial_probe: { radius: 18, hp: 15 * timeMultiplier, speed: 50, expValue: 6, color: '#666666', pattern: 'shoot', shootTimer: 0, shootInterval: 3 },
    kamikaze: { radius: 12, hp: 8 * timeMultiplier, speed: 180, expValue: 3, color: '#ff8800', pattern: 'kamikaze' },
    parasite: { radius: 10, hp: 10 * timeMultiplier, speed: 80, expValue: 5, color: '#ff00ff', pattern: 'parasite' },
    guardian: { radius: 40, hp: 50 * timeMultiplier, speed: 30, expValue: 15, color: '#ffcc00', pattern: 'shoot', shootTimer: 0, shootInterval: 1.5 },
    swarm: { radius: 8, hp: 3 * timeMultiplier, speed: 150, expValue: 1, color: '#88ff88', pattern: 'swarm' },
    boss_death_star: { radius: 80, hp: 1000 * timeMultiplier, speed: 30, expValue: 150, color: '#aaaaaa', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 1.5 },
    boss_xenomorph: { radius: 70, hp: 1800 * timeMultiplier, speed: 62, expValue: 140, color: '#222222', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 1.2 },
    boss_cthulhu: { radius: 90, hp: 2200 * timeMultiplier, speed: 35, expValue: 160, color: '#006644', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 1.8 },
    boss_borg_cube: { radius: 85, hp: 2500 * timeMultiplier, speed: 25, expValue: 170, color: '#004400', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 2 },
    boss_space_kraken: { radius: 95, hp: 2400 * timeMultiplier, speed: 40, expValue: 165, color: '#440066', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 1.6 },
    boss_galaxy_devourer: { radius: 100, hp: 3000 * timeMultiplier, speed: 20, expValue: 200, color: '#220044', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 2.2 },
    boss_void_emperor: { radius: 88, hp: 2600 * timeMultiplier, speed: 45, expValue: 180, color: '#440088', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 1.4 },
    boss_cosmic_horror: { radius: 92, hp: 2800 * timeMultiplier, speed: 38, expValue: 190, color: '#002244', pattern: 'boss', isBoss: true, bossPhase: 0, phaseTimer: 0, shootTimer: 0, shootInterval: 1.7 }
  };
  const base = { ...(baseEnemies[type] || baseEnemies['asteroid_small']) };
  // I boss crescono piu' lentamente dei nemici normali (prima a 20 minuti avevano 11 volte la salute)
  if (type.startsWith('boss_')) { const endlessMul = timeMultiplier / (1 + waveIdx * 0.22 + waveIdx * waveIdx * 0.004); base.hp = (base.hp / timeMultiplier) * (1 + waveIdx * 0.12) * endlessMul; }
  // Boss Rush: la vita cresce sempre, boss dopo boss, fino all'ultimo (1400 -> ~9000)
  if (type.startsWith('boss_') && state.gameMode === 'boss_rush') { const i = state.bossRushIndex || 0; base.hp = 1400 * (1 + i * 0.5) * (1 + i * 0.06); }
  // Maledizione: nemici normali con piu' salute e velocita' (i boss non vengono modificati)
  const curseMul = type.startsWith('boss_') ? 1 : 1 + Math.max(0, state.player.curseLevel) / 100;
  // I danni dei nemici crescono col tempo (prima restavano 10 per tutta la partita: con un po' di armatura si era invincibili)
  // Danni: bassi all'inizio (meta' di prima), +12% per ogni ondata
  const dmgMul = 0.5 * (1 + waveIdx * 0.12) * (state.gameMode === 'endless' && state.wave > 40 ? 1 + (state.wave - 40) * 0.05 : 1);
  return { id: genId(), pos, vel: { x: 0, y: 0 }, radius: base.radius, hp: base.hp * curseMul, maxHp: base.hp * curseMul, damage: (type.startsWith('boss_') ? 30 : type.includes('asteroid') ? 15 : 10) * dmgMul, type, speed: base.speed * curseMul, expValue: base.expValue, color: base.color, pattern: base.pattern, shootTimer: base.shootTimer, shootInterval: base.shootInterval, isBoss: base.isBoss, bossPhase: base.bossPhase, phaseTimer: base.phaseTimer };
}

function spawnParticles(state: GameState, pos: Vector2, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2; const speed = Math.random() * 200 + 50;
    state.particles.push({ pos: { ...pos }, vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed }, life: Math.random() * 0.5 + 0.2, maxLife: 0.7, color, size: Math.random() * 4 + 2, type: 'explosion' });
  }
}

// Danni continui (spade, satelliti, nebulose, campi...): arrivano a piccole frazioni ogni frame.
// Si sommano per nemico e si mostrano ogni 0,3 s, invece di una pioggia di "0".
const continuousDamage = new WeakMap<Vector2, { value: number; shownAt: number }>();

function spawnDamageNumber(state: GameState, pos: Vector2, damage: number, color: string, isCrit: boolean = false, abilityType?: string) {
  // Traccia i danni per abilità (senza arrotondare: i danni per frame valevano sempre 0)
  if (abilityType && damage > 0) {
    state.abilityDamageStats[abilityType] = (state.abilityDamageStats[abilityType] || 0) + damage;
  }
  if (abilityType && damage > 0) playHit(abilityType);
  if (damage < 2 && !isCrit) {
    const acc = continuousDamage.get(pos) || { value: 0, shownAt: -1 };
    acc.value += damage;
    continuousDamage.set(pos, acc);
    if (state.time - acc.shownAt < 0.3 || acc.value < 1) return;
    damage = acc.value; acc.value = 0; acc.shownAt = state.time;
  }
  state.damageNumbers.push({ id: genId(), pos: { x: pos.x + (Math.random() - 0.5) * 20, y: pos.y - 10 }, value: Math.floor(damage), lifetime: 1.0, maxLifetime: 1.0, color: isCrit ? '#ffff00' : color, isCrit });
}

function spawnExpOrb(state: GameState, pos: Vector2, value: number) {
  state.expOrbs.push({ pos: { x: pos.x + (Math.random() - 0.5) * 20, y: pos.y + (Math.random() - 0.5) * 20 }, value, radius: Math.min(4 + value, 10), magnetized: false });
}

function getAbilityTypeFromProjectile(projType: string): string | undefined {
  const mapping: Record<string, string> = {
    'photon_shot': 'photon_gun',
    'ion_shot': 'ion_gun',
    'void_lance': 'void_lance',
    'homing_laser_beam': 'homing_laser',
    'asteroid_frag': 'asteroid_fragment',
    'kinetic_dart': 'kinetic_darts',
    'boomerang_proj': 'neutronium_boomerang',
    'plasma_ball': 'plasma_flamethrower',
    'quantum_bounce_proj': 'quantum_bounce',
    'meteor_proj': 'meteor',
    'antimatter_bomb_proj': 'antimatter_bomb',
    'probe_laser_red': 'probe_x',
    'probe_laser_blue': 'probe_y',
    'cryo_beam': 'cryo_lance'
  };
  return mapping[projType];
}

// Boss Attack System
function processAbilities(state: GameState, dt: number): void {
  const { player } = state;
  for (let i = state.drones.length - 1; i >= 0; i--) {
    const drone = state.drones[i]; drone.lifetime -= dt;
    if (drone.lifetime <= 0) { state.drones.splice(i, 1); continue; }
    // i droni inseguono il nemico piu' vicino (prima vagavano a caso e colpivano raramente)
    const droneTarget = getNearestEnemy(state, drone.pos, 350);
    if (droneTarget) { const want = angle(drone.pos, droneTarget.pos); const diff = Math.atan2(Math.sin(want - drone.angle), Math.cos(want - drone.angle)); drone.angle += diff * Math.min(1, 6 * dt); }
    else drone.angle += (Math.random() - 0.5) * 2 * dt;
    drone.vel.x = Math.cos(drone.angle) * 170; drone.vel.y = Math.sin(drone.angle) * 170;
    drone.pos.x += drone.vel.x * dt; drone.pos.y += drone.vel.y * dt;
    for (const enemy of state.enemies) { if (dist(drone.pos, enemy.pos) < drone.radius + enemy.radius) { enemy.hp -= drone.damage * dt; spawnDamageNumber(state, enemy.pos, drone.damage * dt, drone.color, false, 'drone_swarm'); spawnParticles(state, enemy.pos, drone.color, 1); } }
  }
  for (const sword of state.laserSwords) sword.angle += 3 * dt;
  for (let i = state.gravityWaves.length - 1; i >= 0; i--) {
    const wave = state.gravityWaves[i]; wave.lifetime += dt; wave.radius += wave.expansionSpeed * dt;
    for (const enemy of state.enemies) { const d = dist(wave.pos, enemy.pos); if (d <= wave.radius + enemy.radius && d >= wave.radius - 20 && !wave.damagedEnemies.has(enemy.id)) { enemy.hp -= wave.damage; wave.damagedEnemies.add(enemy.id); spawnDamageNumber(state, enemy.pos, wave.damage, wave.color, false, 'gravity_waves'); spawnParticles(state, enemy.pos, wave.color, 2); } }
    if (wave.lifetime >= wave.maxLifetime || wave.radius >= wave.maxRadius) state.gravityWaves.splice(i, 1);
  }
  for (let i = state.nebulaPools.length - 1; i >= 0; i--) {
    const nebula = state.nebulaPools[i]; nebula.lifetime += dt;
    // Nube d'inchiostro del Kraken: prima danneggiava i nemici (e il boss stesso) invece del giocatore
    if (nebula.hostile) {
      if (player.invincibleTimer <= 0 && dist(nebula.pos, player.pos) < nebula.radius + player.radius) {
        player.hp -= Math.max(0, nebula.damage - player.armor * 0.1) * dt;
        if (player.hp <= 0 && player.hasRevive) { player.hp = player.maxHp * 0.5; player.hasRevive = false; player.dustReviveUsed = true; player.invincibleTimer = 2; }
      }
      if (nebula.lifetime >= nebula.maxLifetime) state.nebulaPools.splice(i, 1);
      continue;
    }
    for (const enemy of state.enemies) { const d = dist(nebula.pos, enemy.pos); if (d < nebula.radius + enemy.radius) { enemy.hp -= nebula.damage * dt; spawnDamageNumber(state, enemy.pos, nebula.damage * dt, nebula.color, false, nebula.source || 'corrosive_nebula'); spawnParticles(state, enemy.pos, nebula.color, 1); } }
    if (nebula.lifetime >= nebula.maxLifetime) state.nebulaPools.splice(i, 1);
  }
  for (let i = state.stormHitboxes.length - 1; i >= 0; i--) {
    const hitbox = state.stormHitboxes[i]; hitbox.lifetime += dt; hitbox.rotation += dt * 2;
    for (const enemy of state.enemies) { const d = dist(hitbox.pos, enemy.pos); if (d < hitbox.radius + enemy.radius) { enemy.hp -= hitbox.damage * dt; spawnDamageNumber(state, enemy.pos, hitbox.damage * dt, hitbox.color, false, 'ion_storm'); spawnParticles(state, enemy.pos, hitbox.color, 1); } }
    if (hitbox.lifetime >= hitbox.maxLifetime) state.stormHitboxes.splice(i, 1);
  }
  // Satelliti orbitanti: il danno e' CONTINUO (ogni frame), non solo nel frame in cui scade la ricarica.
  // Prima il danno veniva applicato per un solo frame ogni 3 secondi (praticamente zero).
  const satAbility = player.abilities.find(a => a.type === 'orbiting_satellites');
  if (satAbility) {
    const sLvl = satAbility.level;
    const sDmg = (satAbility.damage + (player.abilityAttackBonuses['orbiting_satellites'] || 0)) * (1 + (player.damage - 10) * 0.05) * player.weaponPower;
    const satCount = getSatelliteCount(player, sLvl);
    const rotationSpeed = 2 * (1 + player.projectileSpeedBonus);
    const satDistance = Math.min((70 + sLvl * 10) * (1 + player.areaBonus), 200);
    const satRadius = 25 * (1 + player.areaBonus); // area di contatto (come le Spade Laser)
    const satPositions: Vector2[] = [];
    for (let i = 0; i < satCount; i++) {
      const ang = (state.time * rotationSpeed) + (i * Math.PI * 2 / satCount);
      satPositions.push({ x: player.pos.x + Math.cos(ang) * satDistance, y: player.pos.y + Math.sin(ang) * satDistance });
    }
    // Ogni nemico subisce al massimo un colpo per frame, anche se tocca piu' satelliti:
    // piu' satelliti = piu' copertura dell'orbita, non piu' danno sullo stesso bersaglio.
    for (const enemy of state.enemies) {
      if (satPositions.some(sp => dist(sp, enemy.pos) < satRadius + enemy.radius)) {
        enemy.hp -= sDmg * dt;
        spawnDamageNumber(state, enemy.pos, sDmg * dt, satAbility.color, false, 'orbiting_satellites');
        spawnParticles(state, enemy.pos, satAbility.color, 1);
      }
    }
  }
  const cdMul = 1 - Math.min(player.cooldownReduction, 0.8);
  for (const ability of player.abilities) {
    if (ability.type.startsWith('passive_')) continue;
    ability.timer -= dt; if (ability.timer > 0) continue;
    const nearest = getNearestEnemy(state, player.pos, 800);
    // Senza bersaglio l'abilita' riprova al frame successivo (prima sprecava l'intera ricarica).
    // Il Buco Nero resta escluso: parte con la ricarica piena per non sprecarsi sul primo nemico.
    if (!nearest && ability.type !== 'energy_shield' && ability.type !== 'laser_swords') {
      ability.timer = ability.type === 'stellar_blackhole' ? ability.cooldown * cdMul : 0;
      continue;
    }
    // Il Tomo del Vuoto (riduzione ricarica) vale per TUTTE le abilita' (prima solo per alcune)
    ability.timer = Math.max(0.05, ability.cooldown * cdMul);
    const lvl = ability.level;
    const attackBonus = player.abilityAttackBonuses[ability.type] || 0;
    const dmg = (ability.damage + attackBonus) * (1 + (player.damage - 10) * 0.05) * player.weaponPower;
    const projBefore = state.projectiles.length;
    switch (ability.type) {
      case 'photon_gun': {
        const projectileCount = 4 * (1 + player.projectileCountBonus);
        const projectileSpeed = 500 * (1 + player.projectileSpeedBonus);
        const directions = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
        for (let i = 0; i < projectileCount; i++) {
          const dirIndex = i % 4;
          const a = directions[dirIndex];
          state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a) * projectileSpeed, y: Math.sin(a) * projectileSpeed }, radius: 8 + lvl, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 2, maxLifetime: 2, type: 'photon_shot', color: ability.color, trail: [] });
        }
        player.shootFlash = 1; playShoot('photon_gun'); break;
      }
      case 'ion_gun': {
        const projectileCount = 4 * (1 + player.projectileCountBonus);
        const projectileSpeed = 500 * (1 + player.projectileSpeedBonus);
        const directions = [-Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI / 4];
        for (let i = 0; i < projectileCount; i++) {
          const dirIndex = i % 4;
          const a = directions[dirIndex];
          state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a) * projectileSpeed, y: Math.sin(a) * projectileSpeed }, radius: 8 + lvl, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 2, maxLifetime: 2, type: 'ion_shot', color: ability.color, trail: [] });
        }
        player.shootFlash = 1; playShoot('ion_gun'); break;
      }
      case 'void_lance': {
        if (!nearest) break;
        const a = angle(player.pos, nearest.pos);
        state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a) * 500, y: Math.sin(a) * 500 }, radius: 5, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 2, maxLifetime: 2, type: 'void_lance', piercing: lvl + 2, color: ability.color, trail: [] });
        player.shootFlash = 1; playShoot('void_lance'); break;
      }
      case 'quantum_bounce': {
        if (!nearest) break;
        const a = angle(player.pos, nearest.pos);
        const projSpeed = 1000 * (1 + player.projectileSpeedBonus);
        const maxBounces = 5;
        const count = 1 + player.projectileCountBonus;
        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.2;
          state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a + spread) * projSpeed, y: Math.sin(a + spread) * projSpeed }, radius: 10, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 4, maxLifetime: 4, type: 'quantum_bounce_proj', maxBounces: maxBounces, bouncesLeft: maxBounces, color: ability.color, trail: [] });
        }
        player.shootFlash = 1; playShoot('quantum_bounce'); break;
      }
      case 'homing_laser': {
        if (!nearest) break;
        const a = angle(player.pos, nearest.pos);
        const projectileCount = Math.floor(1 * (1 + player.projectileCountBonus));
        const projectileSpeed = 500 * (1 + player.projectileSpeedBonus);
        ability.timer = ability.cooldown * (1 - player.cooldownReduction);
        for (let i = 0; i < projectileCount; i++) {
          const spread = (i - Math.floor(projectileCount / 2)) * 0.1;
          state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a + spread) * projectileSpeed, y: Math.sin(a + spread) * projectileSpeed }, radius: 5, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 1.5, maxLifetime: 1.5, type: 'homing_laser_beam', homing: true, piercing: lvl, color: ability.color, trail: [] });
        }
        player.shootFlash = 1; playShoot('homing_laser'); break;
      }
      case 'drone_swarm': { const count = Math.min(lvl + 1, 5); for (let i = 0; i < count; i++) { const ang = (i / count) * Math.PI * 2; state.drones.push({ id: genId(), pos: { x: player.pos.x + Math.cos(ang) * 30, y: player.pos.y + Math.sin(ang) * 30 }, vel: { x: 0, y: 0 }, radius: 8, damage: dmg * 0.45, lifetime: 5 * (1 + player.durationBonus), maxLifetime: 5 * (1 + player.durationBonus), color: ability.color, angle: Math.random() * Math.PI * 2 }); } playShoot('drone_swarm'); break; }
      case 'gravity_waves': { const maxRadius = (150 + lvl * 30) * (1 + player.areaBonus); const expansionSpeed = 200 + lvl * 20; state.gravityWaves.push({ id: genId(), pos: { ...player.pos }, radius: 0, maxRadius, damage: dmg, color: ability.color, lifetime: 0, maxLifetime: maxRadius / expansionSpeed, expansionSpeed, damagedEnemies: new Set() }); playShoot('gravity_waves'); break; }
      case 'cryo_lance': { 
        const beamCount = 12;
        const rotationSpeed = 0.5;
        const currentAngle = (state.time * rotationSpeed) % (Math.PI * 2);
        const beamAngle = currentAngle;
        const beamSpeed = 400;
        const beamRadius = 8 + lvl * 2;
        const freezeDuration = 5 * (1 + player.durationBonus);
        state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(beamAngle) * beamSpeed, y: Math.sin(beamAngle) * beamSpeed }, radius: beamRadius, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 1.5, maxLifetime: 1.5, type: 'cryo_beam', aoeRadius: 40 + lvl * 10, duration: freezeDuration, color: ability.color, trail: [] });
        playShoot('cryo_lance'); break; 
      }
      case 'energy_shield': { player.shieldHits = lvl; playShoot('energy_shield'); break; }
      case 'laser_swords': { const swordCount = Math.min(lvl, 5); while (state.laserSwords.length > swordCount) state.laserSwords.pop(); while (state.laserSwords.length < swordCount) state.laserSwords.push({ id: genId(), angle: 0, distance: 60, length: 30, damage: dmg, color: ability.color }); const swordBase = state.laserSwords.length > 0 ? state.laserSwords[0].angle : 0; for (let i = 0; i < state.laserSwords.length; i++) { state.laserSwords[i].angle = swordBase + (i / swordCount) * Math.PI * 2; state.laserSwords[i].damage = dmg; state.laserSwords[i].length = (30 + lvl * 5) * (1 + player.areaBonus); } playShoot('laser_swords'); break; }
      case 'plasma_flamethrower': { const baseAngle = nearest ? angle(player.pos, nearest.pos) : Math.random() * Math.PI * 2; const flames = lvl >= 3 ? 2 : 1; for (let fi = 0; fi < flames; fi++) { const randomAngle = baseAngle + (Math.random() - 0.5) * 0.7; state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(randomAngle) * 350, y: Math.sin(randomAngle) * 350 }, radius: 12, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 2, maxLifetime: 2, type: 'plasma_ball', piercing: 3 + lvl, color: ability.color, trail: [] }); } player.shootFlash = 1; playShoot('plasma_flamethrower'); break; }
      case 'gravity_field': { const fieldRadius = (150 + lvl * 20) * (1 + player.areaBonus); ability.timer = ability.cooldown * (1 - player.cooldownReduction); for (const enemy of state.enemies) { const d = dist(player.pos, enemy.pos); if (d < fieldRadius) { const damage = dmg * 0.5; enemy.hp -= damage; spawnDamageNumber(state, enemy.pos, damage, ability.color, false, 'gravity_field'); if (!(enemy.freezeTimer && enemy.freezeTimer > 0)) { if (!(enemy.slowTimer && enemy.slowTimer > 0)) enemy.baseSpeed = enemy.speed; enemy.slowTimer = Math.max(0.05, ability.cooldown * cdMul) + 0.3; enemy.speed = (enemy.baseSpeed || enemy.speed) * 0.7; } const pullDir = normalize({ x: player.pos.x - enemy.pos.x, y: player.pos.y - enemy.pos.y }); enemy.vel.x += pullDir.x * 20; enemy.vel.y += pullDir.y * 20; spawnParticles(state, enemy.pos, ability.color, 1); } } playShoot('gravity_field'); break; }
      case 'corrosive_nebula': { 
        const poolCount = Math.min(lvl, 3); 
        for (let i = 0; i < poolCount; i++) { 
          const baseX = player.pos.x + (Math.random() - 0.5) * 200;
          const baseY = player.pos.y + (Math.random() - 0.5) * 200;
          const baseRadius = (30 + lvl * 5) * (1 + player.areaBonus);
          const subPools = 3 + Math.floor(Math.random() * 3);
          for (let j = 0; j < subPools; j++) {
            const offsetX = (Math.random() - 0.5) * baseRadius * 0.8;
            const offsetY = (Math.random() - 0.5) * baseRadius * 0.8;
            const subRadius = baseRadius * (0.5 + Math.random() * 0.5);
            state.nebulaPools.push({ id: genId(), pos: { x: baseX + offsetX, y: baseY + offsetY }, radius: subRadius, damage: dmg * 0.3, color: ability.color, lifetime: 0, maxLifetime: 3 * (1 + player.durationBonus) });
          }
        } 
        playShoot('corrosive_nebula'); break; 
      }
      case 'ion_storm': { const strikeCount = Math.floor((2 + lvl) * (1 + player.projectileCountBonus)); const radius = 40 * (1 + player.areaBonus); const duration = 2 * (1 + player.durationBonus); const shapes: ('circle' | 'star' | 'square')[] = ['circle', 'star', 'square']; for (let i = 0; i < strikeCount; i++) { const target = state.enemies[Math.floor(Math.random() * state.enemies.length)]; if (target) { state.projectiles.push({ id: genId(), pos: { x: target.pos.x, y: target.pos.y - 300 }, vel: { x: 0, y: 800 * (1 + player.projectileSpeedBonus) }, radius: 8, hp: 1, maxHp: 1, damage: 0, fromPlayer: true, lifetime: 0.5, maxLifetime: 0.5, type: 'lightning_bolt', aoeRadius: radius, color: ability.color, trail: [] }); state.stormHitboxes.push({ id: genId(), pos: { x: target.pos.x, y: target.pos.y }, radius, damage: dmg * 0.4, color: ability.color, lifetime: 0, maxLifetime: duration, shape: shapes[Math.floor(Math.random() * shapes.length)], rotation: 0 }); } } playShoot('ion_storm'); break; }
      case 'stellar_blackhole': { const blackholeDamage = 1000; ability.timer = (135 - 15 * lvl) * (1 - player.cooldownReduction); for (const enemy of state.enemies) { enemy.hp -= blackholeDamage; spawnDamageNumber(state, enemy.pos, blackholeDamage, '#ffffff', false, 'stellar_blackhole'); spawnParticles(state, enemy.pos, '#ffffff', 5); } state.screenShake = 0.5; playShoot('stellar_blackhole'); break; }
      case 'orbiting_satellites': { playShoot('orbiting_satellites'); break; }
      case 'asteroid_fragment': { if (!nearest) break; const a = angle(player.pos, nearest.pos); const fragmentCount = 3 + Math.floor(lvl / 2); for (let i = 0; i < fragmentCount; i++) { const spread = (i - Math.floor(fragmentCount / 2)) * 0.3; state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a + spread) * 400, y: Math.sin(a + spread) * 400 }, radius: 8, hp: 1, maxHp: 1, damage: dmg, fromPlayer: true, lifetime: 3, maxLifetime: 3, type: 'asteroid_frag', piercing: 5 + lvl, color: ability.color, trail: [] }); } player.shootFlash = 1; playShoot('asteroid_fragment'); break; }
      case 'meteor': { const meteorSpeed = 600 * (1 + player.projectileSpeedBonus); const meteorRadius = (15 + lvl * 2) * (1 + player.areaBonus); ability.timer = ability.cooldown * (1 - player.cooldownReduction); state.projectiles.push({ id: genId(), pos: { x: nearest!.pos.x, y: nearest!.pos.y - meteorSpeed * 1.0 }, vel: { x: 0, y: meteorSpeed }, radius: meteorRadius, hp: 1, maxHp: 1, damage: dmg * 2, fromPlayer: true, lifetime: 1.5, maxLifetime: 1.5, type: 'meteor_proj', piercing: 3, aoeRadius: 60 + lvl * 10, color: ability.color, trail: [] }); player.shootFlash = 1; playShoot('meteor'); break; }
      case 'kinetic_darts': { if (!nearest) break; const a = angle(player.pos, nearest.pos); const dartCount = Math.floor((5 + lvl) * (1 + player.projectileCountBonus)); const dartSpeed = 700 * (1 + player.projectileSpeedBonus); ability.timer = ability.cooldown * (1 - player.cooldownReduction); for (let i = 0; i < dartCount; i++) { const spread = (i - Math.floor(dartCount / 2)) * 0.15; state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a + spread) * dartSpeed, y: Math.sin(a + spread) * dartSpeed }, radius: 4, hp: 1, maxHp: 1, damage: dmg * 0.6, fromPlayer: true, lifetime: 1.5, maxLifetime: 1.5, type: 'kinetic_dart', color: ability.color, trail: [] }); } player.shootFlash = 1; playShoot('kinetic_darts'); break; }
      case 'antimatter_bomb': {
        let strongestEnemy: Enemy | null = null;
        for (const enemy of state.enemies) { if (!strongestEnemy || enemy.hp > strongestEnemy.hp) { strongestEnemy = enemy; } }
        if (!strongestEnemy) break;
        const bombRadius = (150 + lvl * 25) * (1 + player.areaBonus);
        const bombDuration = 5 * (1 + player.durationBonus);
        state.nebulaPools.push({ id: genId(), pos: { x: strongestEnemy.pos.x, y: strongestEnemy.pos.y }, radius: bombRadius, damage: dmg * 0.4, color: ability.color, lifetime: 0, maxLifetime: bombDuration, source: 'antimatter_bomb' });
        spawnParticles(state, strongestEnemy.pos, ability.color, 8);
        playShoot('antimatter_bomb'); break;
      }
      case 'neutronium_boomerang': { if (!nearest) break; const a = angle(player.pos, nearest.pos); const boomerangSpeed = 500 * (1 + player.projectileSpeedBonus); ability.timer = ability.cooldown * (1 - player.cooldownReduction); state.projectiles.push({ id: genId(), pos: { ...player.pos }, vel: { x: Math.cos(a) * boomerangSpeed, y: Math.sin(a) * boomerangSpeed }, radius: 10 * (1 + player.areaBonus), hp: 1, maxHp: 1, damage: dmg * 1.5, fromPlayer: true, lifetime: 3, maxLifetime: 3, type: 'boomerang_proj', piercing: 100, color: ability.color, trail: [] }); player.shootFlash = 1; playShoot('neutronium_boomerang'); break; }
      case 'probe_x': case 'probe_y': { ensureProbe(state, ability.type, dmg, lvl); ability.timer = 0.5; break; }
    }
    if (ability.evolved) for (let k = projBefore; k < state.projectiles.length; k++) { const pr = state.projectiles[k]; pr.evolved = true; pr.radius *= 1.3; pr.color = ability.color; }
  }
}

export function updateGame(state: GameState, dt: number): void {
  if (state.gameOver || state.paused || state.levelUpPending || state.chestPending) return;
  // Il timer del gioco accumula il tempo REALE (non influenzato dal speed multiplier)
  state.time += dt;
  // Applica speed multiplier per il gameplay
  const gameDt = dt * state.speedMultiplier;
  // Il timer speed boost viene gestito in App.tsx in tempo reale (non influenzato dal speed multiplier)
  state.waveTimer += gameDt; state.screenShake = Math.max(0, state.screenShake - gameDt);
  
  // Aggiorna statistiche per partita singola
  state.currentPlayTime = (state.currentPlayTime || 0) + dt;
  state.currentLevel = state.player.level;
  state.currentWave = state.wave;
  state.currentScore = state.score;
  if (state.bossNameTimer > 0) state.bossNameTimer -= gameDt;
  // Calcola la durata dell'ondata in base al speed multiplier
  state.wave = Math.floor(state.waveTimer / 30) + 1;
  
  // Logica spawn boss in base alla modalità di gioco
  const bossTypes: EnemyType[] = ['boss_death_star', 'boss_xenomorph', 'boss_cthulhu', 'boss_borg_cube', 'boss_space_kraken', 'boss_galaxy_devourer', 'boss_void_emperor', 'boss_cosmic_horror'];
  
  if (state.gameMode === 'boss_rush') {
    // Modalità Boss Rush: spawn solo boss in sequenza
    if (!state.bossActive && state.bossRushIndex < bossTypes.length) {
      const selectedBoss = bossTypes[state.bossRushIndex];
      state.enemies.push(spawnEnemy(state, selectedBoss));
      state.bossActive = true;
      state.currentBossType = selectedBoss;
      state.bossNameTimer = 3.0;
      state.screenShake = 0.5;
    }
  } else {
    // Modalità normale o endless
    // Un boss ogni 5 ondate, in ordine. Se il boss precedente e' ancora vivo il successivo arriva appena
    // viene sconfitto (prima veniva saltato: ad esempio il boss finale dell'ondata 40 poteva non comparire mai).
    if (state.nextBossWave === undefined) state.nextBossWave = 5;
    if (state.wave >= state.nextBossWave && !state.bossActive) {
      let bossIndex = state.bossSpawnCount || 0;
      state.bossSpawnCount = bossIndex + 1;
      state.nextBossWave = Math.max(state.nextBossWave + 5, state.wave + 1);
      
      // Modalità Endless: dopo l'onda 40, i boss si ripetono con difficoltà crescente
      if (state.gameMode === 'endless' && bossIndex >= bossTypes.length) {
        bossIndex = bossIndex % bossTypes.length;
      } else {
        bossIndex = Math.min(bossIndex, bossTypes.length - 1);
      }
      
      const selectedBoss = bossTypes[bossIndex];
      state.enemies.push(spawnEnemy(state, selectedBoss));
      state.bossActive = true;
      state.currentBossType = selectedBoss;
      state.bossNameTimer = 3.0;
      state.screenShake = 0.5;
    }
  }
  // Spawn nemici normali (solo in modalità normale e endless, non in boss_rush)
  if (state.gameMode !== 'boss_rush') {
    // Maledizione: piu' frequenza (spawnRate) e piu' quantita' (nemici per ogni spawn)
    const curseSpawn = 1 + Math.max(0, state.player.curseLevel) / 100;
    // Durante un boss arrivano il 70% di nemici in meno: lo scontro col boss resta al centro della scena
    const spawnRate = Math.min(1 + state.time / 20, 8) * curseSpawn * (state.bossActive ? 0.3 : 1);
    if (Math.random() < spawnRate * gameDt) {
      const wave1: EnemyType[] = ['asteroid_small', 'swarm', 'drone_sentinel', 'cosmic_leech', 'star_beetle'];
      const wave2: EnemyType[] = ['asteroid_small', 'asteroid_medium', 'drone_sentinel', 'star_raider', 'void_crawler', 'star_fish'];
      const wave3: EnemyType[] = ['asteroid_medium', 'asteroid_large', 'star_raider', 'nebula_wraith', 'star_jelly', 'star_scorpion'];
      const wave4: EnemyType[] = ['asteroid_large', 'nebula_wraith', 'void_worm', 'cosmic_squid', 'void_spider', 'cosmic_moth'];
      const wave5: EnemyType[] = ['asteroid_large', 'void_worm', 'cosmic_squid', 'void_spider', 'star_destroyer', 'imperial_probe', 'kamikaze', 'guardian', 'parasite'];
      let types: EnemyType[];
      if (state.time < 30) types = wave1; else if (state.time < 60) types = wave2; else if (state.time < 120) types = wave3; else if (state.time < 180) types = wave4; else types = wave5;
      const type = types[Math.floor(Math.random() * types.length)];
      if (type === 'swarm') { for (let i = 0; i < Math.round(5 * curseSpawn); i++) state.enemies.push(spawnEnemy(state, 'swarm')); }
      else {
        const extra = curseSpawn - 1; // quantita': 1 nemico + quota di maledizione (parte frazionaria casuale)
        const copies = 1 + Math.floor(extra) + (Math.random() < extra - Math.floor(extra) ? 1 : 0);
        for (let i = 0; i < copies; i++) state.enemies.push(spawnEnemy(state, type));
      }
    }
  }
  const { player, keys } = state; let mx = 0, my = 0;
  if (keys.has('w') || keys.has('arrowup')) my -= 1;
  if (keys.has('s') || keys.has('arrowdown')) my += 1;
  if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
  if (keys.has('d') || keys.has('arrowright')) mx += 1;
  const td = state.touchDir;
  const tdLen = td ? Math.hypot(td.x, td.y) : 0;
  if (td && tdLen > 0.15) { const k = Math.min(1, tdLen) / tdLen; player.vel.x = td.x * k * player.speed; player.vel.y = td.y * k * player.speed; }
  else if (mx !== 0 || my !== 0) { const moveDir = normalize({ x: mx, y: my }); player.vel.x = moveDir.x * player.speed; player.vel.y = moveDir.y * player.speed; }
  else { player.vel.x *= 0.85; player.vel.y *= 0.85; }
  player.pos.x += player.vel.x * gameDt; player.pos.y += player.vel.y * gameDt;
  player.invincibleTimer = Math.max(0, player.invincibleTimer - gameDt);
  player.shootFlash = Math.max(0, player.shootFlash - gameDt * 5);
  if (player.regenPerSecond > 0 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + player.regenPerSecond * gameDt);
  state.camera.x = player.pos.x; state.camera.y = player.pos.y;
  processAbilities(state, gameDt);
  updateProbes(state, gameDt);
  for (const enemy of state.enemies) {
    if (enemy.freezeTimer && enemy.freezeTimer > 0) { enemy.freezeTimer -= gameDt; if (enemy.freezeTimer <= 0) { enemy.freezeTimer = 0; enemy.speed = enemy.baseSpeed || enemy.speed; } }
    if (enemy.slowTimer && enemy.slowTimer > 0) { enemy.slowTimer -= gameDt; if (enemy.slowTimer <= 0) { enemy.slowTimer = 0; if (!(enemy.freezeTimer && enemy.freezeTimer > 0) && enemy.baseSpeed) enemy.speed = enemy.baseSpeed; } }
    const toPlayer = normalize({ x: player.pos.x - enemy.pos.x, y: player.pos.y - enemy.pos.y });
    switch (enemy.pattern) {
      case 'chase': enemy.vel.x = toPlayer.x * enemy.speed; enemy.vel.y = toPlayer.y * enemy.speed; break;
      case 'kamikaze': enemy.vel.x = toPlayer.x * enemy.speed * 1.5; enemy.vel.y = toPlayer.y * enemy.speed * 1.5; break;
      case 'parasite': enemy.vel.x = toPlayer.x * enemy.speed; enemy.vel.y = toPlayer.y * enemy.speed; break;
      case 'shoot': { 
        const d = dist(player.pos, enemy.pos); 
        if (d > 200) { enemy.vel.x = toPlayer.x * enemy.speed; enemy.vel.y = toPlayer.y * enemy.speed; } 
        else { enemy.vel.x *= 0.9; enemy.vel.y *= 0.9; } 
        if (!state.bossActive) {
          enemy.shootTimer = (enemy.shootTimer || 0) + gameDt; 
          if (enemy.shootTimer >= (enemy.shootInterval || 2)) { 
            enemy.shootTimer = 0; 
            const a = angle(enemy.pos, player.pos); 
            state.projectiles.push({ id: genId(), pos: { ...enemy.pos }, vel: { x: Math.cos(a) * 250, y: Math.sin(a) * 250 }, radius: 5, hp: 1, maxHp: 1, damage: enemy.damage, fromPlayer: false, lifetime: 3, maxLifetime: 3, type: 'enemy_bullet', color: '#ff4444', trail: [] }); 
          }
        }
        break; 
      }
      case 'swarm': enemy.vel.x = toPlayer.x * enemy.speed + (Math.random() - 0.5) * 50; enemy.vel.y = toPlayer.y * enemy.speed + (Math.random() - 0.5) * 50; break;
      case 'boss': {
        enemy.phaseTimer = (enemy.phaseTimer || 0) + gameDt;
        updateBoss(state, enemy, gameDt, toPlayer);
        // Boss Rush: senza nemici normali non si guadagnava esperienza (si restava a livello 1 con una sola arma).
        // Ora il boss perde cristalli di esperienza ogni 5% di salute persa.
        if (state.gameMode === 'boss_rush') {
          const anyE = enemy as any;
          if (anyE.expDropHp === undefined) anyE.expDropHp = enemy.maxHp;
          while (enemy.hp > 0 && enemy.hp <= anyE.expDropHp - enemy.maxHp * 0.05) {
            anyE.expDropHp -= enemy.maxHp * 0.05;
            const a = Math.random() * Math.PI * 2;
            spawnExpOrb(state, { x: enemy.pos.x + Math.cos(a) * (enemy.radius + 20), y: enemy.pos.y + Math.sin(a) * (enemy.radius + 20) }, 10 + 4 * state.bossRushIndex);
          }
        }
        break; 
      }
    }
    enemy.pos.x += enemy.vel.x * gameDt; enemy.pos.y += enemy.vel.y * gameDt; enemy.vel.x *= 0.95; enemy.vel.y *= 0.95;
    if (player.invincibleTimer <= 0) {
      const d = dist(player.pos, enemy.pos);
      if (d < player.radius + enemy.radius) {
        if (player.shieldHits > 0) { player.shieldHits--; player.invincibleTimer = 0.5; shieldPulse(state); } else { const enemyDmg = Math.max(1, enemy.damage - player.armor); player.hp -= enemyDmg; player.invincibleTimer = 0.5; state.screenShake = 0.2; }
        spawnParticles(state, player.pos, '#ff0000', 3); playShoot('hit');
        const laserSwordsAbility = player.abilities.find(a => a.type === 'laser_swords');
        if (laserSwordsAbility && enemy.hp > 0) {
          const counterDamage = laserSwordsAbility.damage * player.weaponPower;
          enemy.hp -= counterDamage;
          spawnDamageNumber(state, enemy.pos, counterDamage, '#00ff00', false, 'laser_swords');
          spawnParticles(state, enemy.pos, '#00ff00', 5);
          playShoot('laser_swords');
          if (enemy.hp <= 0) { spawnParticles(state, enemy.pos, enemy.color, 6); }
        }
        if (player.hp <= 0 && player.hasRevive) { player.hp = player.maxHp * 0.5; player.hasRevive = false; player.dustReviveUsed = true; player.invincibleTimer = 2; spawnParticles(state, player.pos, '#ffffff', 12); state.screenShake = 0.5; }
        if (enemy.pattern === 'kamikaze' || enemy.pattern === 'parasite') { enemy.hp = 0; spawnParticles(state, enemy.pos, enemy.color, 6); }
      }
    }
  }
  updateBossHazards(state, gameDt);
  for (const proj of state.projectiles) {
    if (proj.homing && proj.fromPlayer) { const target = getNearestEnemy(state, proj.pos, 500); if (target) { const targetAngle = angle(proj.pos, target.pos); const currentAngle = Math.atan2(proj.vel.y, proj.vel.x); const diff = targetAngle - currentAngle; const turn = Math.atan2(Math.sin(diff), Math.cos(diff)) * 3 * gameDt; const newAngle = currentAngle + turn; const speed = Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y); proj.vel.x = Math.cos(newAngle) * speed; proj.vel.y = Math.sin(newAngle) * speed; } }
    if (proj.type === 'boomerang_proj' && proj.fromPlayer) { const timeElapsed = proj.maxLifetime - proj.lifetime; if (timeElapsed > 1.0) { if (!(proj as any).returning) { (proj as any).returning = true; proj.hitIds = []; } const toP = normalize({ x: player.pos.x - proj.pos.x, y: player.pos.y - proj.pos.y }); const currentSpeed = Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.y * proj.vel.y); proj.vel.x = toP.x * currentSpeed; proj.vel.y = toP.y * currentSpeed; } }
    proj.pos.x += proj.vel.x * gameDt; proj.pos.y += proj.vel.y * gameDt; proj.lifetime -= gameDt;
    if (proj.trail) { proj.trail.push({ ...proj.pos }); if (proj.trail.length > 10) proj.trail.shift(); }
    if (proj.type === 'meteor_proj' && proj.lifetime <= 0.5 && proj.vel.y > 0) { for (const enemy of state.enemies) { const d = dist(proj.pos, enemy.pos); if (d < (proj.aoeRadius || 60)) { enemy.hp -= proj.damage; spawnDamageNumber(state, enemy.pos, proj.damage, proj.color, false, 'meteor'); spawnParticles(state, enemy.pos, proj.color, 3); } } spawnParticles(state, proj.pos, proj.color, 10); state.screenShake = 0.3; proj.lifetime = 0; }
    if (proj.type === 'antimatter_bomb_proj' && proj.lifetime <= 0) {
      state.nebulaPools.push({ id: genId(), pos: { x: proj.pos.x, y: proj.pos.y }, radius: proj.aoeRadius || 100, damage: proj.damage, color: proj.color, lifetime: 0, maxLifetime: proj.duration || 5 });
      spawnParticles(state, proj.pos, proj.color, 12); state.screenShake = 0.4;
    }
    if (proj.type === 'antimatter_explosion') { proj.radius += 300 * gameDt; for (const enemy of state.enemies) { const d = dist(proj.pos, enemy.pos); if (d < proj.radius && d > proj.radius - 30) { enemy.hp -= proj.damage; spawnDamageNumber(state, enemy.pos, proj.damage, proj.color, false, 'antimatter_bomb'); spawnParticles(state, enemy.pos, proj.color, 3); } } }
    if (proj.type === 'cryo_beam') { for (const enemy of state.enemies) { if (dist(proj.pos, enemy.pos) < (proj.aoeRadius || 50)) { if (!(enemy.freezeTimer && enemy.freezeTimer > 0) && !(enemy.slowTimer && enemy.slowTimer > 0)) enemy.baseSpeed = enemy.speed; enemy.freezeTimer = proj.duration || 5; enemy.slowTimer = 0; enemy.speed = 0; spawnParticles(state, enemy.pos, '#00ffff', 2); } } }
    if (proj.fromPlayer) { for (const enemy of state.enemies) { if (proj.piercing && proj.piercing > 0 && proj.hitIds && proj.hitIds.includes(enemy.id)) continue; const d = dist(proj.pos, enemy.pos); if (d < proj.radius + enemy.radius) { 
      // Boomerang contro boss: danno normale e non torna indietro
      if (proj.type === 'boomerang_proj' && enemy.isBoss) {
        const finalDamage = proj.damage / 1.5; // Danno normale (rimuovi il bonus 1.5x)
        const isCrit = Math.random() * 100 < player.critChance;
        const actualDamage = isCrit ? finalDamage * (player.critDamage / 100) : finalDamage;
        enemy.hp -= actualDamage;
        spawnDamageNumber(state, enemy.pos, actualDamage, proj.color, isCrit, 'neutronium_boomerang');
        spawnParticles(state, proj.pos, proj.color, 1);
        proj.lifetime = 0; // Il boomerang viene distrutto
        break;
      }
      
      let finalDamage = proj.damage; const isCrit = Math.random() * 100 < player.critChance; if (isCrit) { finalDamage *= player.critDamage / 100; spawnParticles(state, enemy.pos, '#ffff00', 2); } enemy.hp -= finalDamage; const abilityType = getAbilityTypeFromProjectile(proj.type); spawnDamageNumber(state, enemy.pos, finalDamage, proj.color, isCrit, abilityType); spawnParticles(state, proj.pos, proj.color, 1); if (proj.aoeRadius) { for (const e of state.enemies) { if (dist(proj.pos, e.pos) < proj.aoeRadius && e !== enemy) { let aoeDmg = proj.damage * 0.5; if (isCrit) aoeDmg *= player.critDamage / 100; e.hp -= aoeDmg; spawnDamageNumber(state, e.pos, aoeDmg, proj.color, isCrit, abilityType); } } spawnParticles(state, proj.pos, proj.color, 4); }
    if (proj.type === 'quantum_bounce_proj' && proj.bouncesLeft && proj.bouncesLeft > 0) {
      proj.bouncesLeft--; proj.lastHitEnemy = enemy.id;
      let nextTarget: Enemy | null = null; let minDist2 = Infinity;
      for (const e of state.enemies) { if (e.id === enemy.id || e.hp <= 0) continue; const distToEnemy = dist(proj.pos, e.pos); if (distToEnemy < minDist2 && distToEnemy < 500) { minDist2 = distToEnemy; nextTarget = e; } }
      if (nextTarget) { const newAngle = angle(proj.pos, nextTarget.pos); const speed = Math.hypot(proj.vel.x, proj.vel.y); proj.vel.x = Math.cos(newAngle) * speed; proj.vel.y = Math.sin(newAngle) * speed; spawnParticles(state, proj.pos, proj.color, 8); playShoot('quantum_bounce'); } else { proj.lifetime = 0; }
    } else if (proj.piercing && proj.piercing > 0) { proj.piercing--; (proj.hitIds || (proj.hitIds = [])).push(enemy.id); } else { proj.lifetime = 0; }
    break; } } }
    if (!proj.fromPlayer && player.invincibleTimer <= 0) { const d = dist(proj.pos, player.pos); if (d < proj.radius + player.radius) { if (player.shieldHits > 0) { player.shieldHits--; proj.lifetime = 0; shieldPulse(state); } else { const projDmg = Math.max(1, proj.damage - player.armor); player.hp -= projDmg; player.invincibleTimer = 0.3; proj.lifetime = 0; spawnParticles(state, player.pos, '#ff0000', 2); if (player.hp <= 0 && player.hasRevive) { player.hp = player.maxHp * 0.5; player.hasRevive = false; player.dustReviveUsed = true; player.invincibleTimer = 2; spawnParticles(state, player.pos, '#ffffff', 12); } } } }
  }
  for (const p of state.particles) { p.pos.x += p.vel.x * gameDt; p.pos.y += p.vel.y * gameDt; p.vel.x *= 0.95; p.vel.y *= 0.95; p.life -= gameDt; }
  for (const dmgNum of state.damageNumbers) { dmgNum.lifetime -= gameDt; dmgNum.pos.y -= 30 * gameDt; }
  state.damageNumbers = state.damageNumbers.filter(d => d.lifetime > 0);
  for (const orb of state.expOrbs) { const d = dist(player.pos, orb.pos); if (d < player.magnetRange) orb.magnetized = true; if (orb.magnetized) { const dir = normalize({ x: player.pos.x - orb.pos.x, y: player.pos.y - orb.pos.y }); const speed = 400 + (player.magnetRange - d) * 3; orb.pos.x += dir.x * speed * gameDt; orb.pos.y += dir.y * speed * gameDt; } if (d < player.radius + orb.radius) { state.score += orb.value; const expGained = Math.floor(orb.value * (1 + player.expBonus)); player.exp += expGained; orb.value = 0; } }
  // Spade laser: ogni nemico subisce al massimo un colpo per frame anche se tocca piu' spade
  // (prima con 5 spade il danno sullo stesso nemico si moltiplicava per 5: arma troppo forte)
  if (state.laserSwords.length > 0) {
    const swordTips = state.laserSwords.map(sword => ({ x: player.pos.x + Math.cos(sword.angle) * sword.distance, y: player.pos.y + Math.sin(sword.angle) * sword.distance, sword }));
    for (const enemy of state.enemies) {
      const tip = swordTips.find(tp => dist(tp, enemy.pos) < tp.sword.length + enemy.radius);
      if (tip) { enemy.hp -= tip.sword.damage * gameDt; spawnDamageNumber(state, enemy.pos, tip.sword.damage * gameDt, tip.sword.color, false, 'laser_swords'); spawnParticles(state, enemy.pos, tip.sword.color, 1); }
    }
  }
  updatePickups(state, gameDt, upgradeAbility, () => applyPassiveAbilities(player), playShoot);
  if (player.exp >= player.expToNext && !state.levelUpPending) {
    if (player.level < 100) { 
      player.exp -= player.expToNext; 
      player.level++; 
      player.expToNext = Math.floor(10 + 7 * player.level + 0.6 * player.level * player.level); // curva piu' dolce: prima (x1.4 a livello) dopo 10 minuti si saliva quasi solo di 1 livello ogni 2 minuti
      
      playShoot('levelup');
    }
    else { player.points += Math.floor(player.exp / 10); player.exp = 0; }
    applyPassiveAbilities(player);
    state.levelUpPending = true; state.levelUpChoices = generateLevelUpChoices(state);
  }
  state.enemies = state.enemies.filter(e => {
    if (e.hp <= 0) {
      spawnParticles(state, e.pos, e.color, 4); spawnExpOrb(state, e.pos, e.expValue); state.kills++; state.currentKills = (state.currentKills || 0) + 1; playShoot('explosion');
      let coinsReward = e.isBoss ? 75 : e.type === 'guardian' ? 15 : e.type.includes('asteroid') ? 2 : 2;
      { const rawCoins = coinsReward * (1 + Math.max(0, state.wave - 1) * 0.05) * (1 + player.luckBonus + player.coinBonus); const whole = Math.floor(rawCoins); coinsReward = whole + (Math.random() < rawCoins - whole ? 1 : 0); }
      state.coinsEarned += coinsReward;
      if (e.isBoss) { 
        state.diamondsEarned += 3; 
        state.bossActive = false; 
        state.bossesDefeated = (state.bossesDefeated || 0) + 1;
        clearBossHazards(state, e.id);
        // ricompense del boss: scrigno del tesoro, un cuore e un "rigenera" in piu'
        if (!state.gameOver) { spawnPickup(state, e.pos, 'chest'); spawnPickup(state, { x: e.pos.x + 60, y: e.pos.y }, 'heart'); }
        state.rerolls = (state.rerolls || 0) + 1;
        state.screenShake = 0.8; 
        spawnParticles(state, e.pos, '#ffff00', 20); 
        
        // Modalità Boss Rush: incrementa l'indice del boss
        if (state.gameMode === 'boss_rush') {
          state.bossRushIndex++;
          state.score += 5000; // Bonus punti per ogni boss sconfitto
          if (state.bossRushIndex >= bossTypes.length) { state.gameOver = true; state.victory = true; state.score += 10000; } // tutti i boss sconfitti: vittoria
        }
        
        // Modalità Normale: vittoria quando si sconfigge il boss finale all'onda 40
        if (state.gameMode === 'normal' && e.type === 'boss_cosmic_horror') {
          state.gameOver = true;
          state.victory = true;
          state.score += 10000; // Bonus vittoria
          console.log('[Game] 🏆 Vittoria! Hai completato la modalità normale!');
        }
        
        // Assorbi tutta l'EXP presente sul campo quando muore un boss
        let totalExpFromOrbs = 0;
        for (const orb of state.expOrbs) {
          totalExpFromOrbs += orb.value;
        }
        if (totalExpFromOrbs > 0) {
          const expGained = Math.floor(totalExpFromOrbs * (1 + player.expBonus));
          player.exp += expGained;
          state.score += totalExpFromOrbs;
          spawnParticles(state, player.pos, '#00ffcc', 15);
        }
        state.expOrbs = []; // Svuota tutti gli orbs
        
        // Spawn 5 nuovi orbs per il boss
        for (let i = 0; i < 5; i++) spawnExpOrb(state, { x: e.pos.x + (Math.random() - 0.5) * 100, y: e.pos.y + (Math.random() - 0.5) * 100 }, 20); 
      }
      else if (e.type === 'guardian' && Math.random() < 0.3) state.diamondsEarned += 1;
      if (!e.isBoss) rollEnemyDrop(state, e.pos);
      return false;
    }
    return true;
  });
  state.projectiles = state.projectiles.filter(p => p.lifetime > 0);
  state.particles = state.particles.filter(p => p.life > 0);
  state.expOrbs = state.expOrbs.filter(o => o.value > 0);
  if (state.expOrbs.length > 50) {
    const mergeDistance = 40;
    const cellSize = mergeDistance;
    const grid = new Map<string, number[]>();
    for (let i = 0; i < state.expOrbs.length; i++) {
      const orb = state.expOrbs[i];
      const cellX = Math.floor(orb.pos.x / cellSize);
      const cellY = Math.floor(orb.pos.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(i);
    }
    const mergedOrbs: typeof state.expOrbs = [];
    const processed = new Set<number>();
    for (const [key, indices] of grid) {
      for (const i of indices) {
        if (processed.has(i)) continue;
        let currentOrb = { ...state.expOrbs[i] };
        processed.add(i);
        const [cx, cy] = key.split(',').map(Number);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighborKey = `${cx + dx},${cy + dy}`;
            const neighborIndices = grid.get(neighborKey);
            if (!neighborIndices) continue;
            for (const j of neighborIndices) {
              if (processed.has(j) || j <= i) continue;
              const otherOrb = state.expOrbs[j];
              const distance = Math.hypot(currentOrb.pos.x - otherOrb.pos.x, currentOrb.pos.y - otherOrb.pos.y);
              if (distance < mergeDistance) {
                currentOrb.value += otherOrb.value;
                currentOrb.radius = Math.min(Math.sqrt(currentOrb.value) * 2, 15);
                currentOrb.pos.x = (currentOrb.pos.x + otherOrb.pos.x) / 2;
                currentOrb.pos.y = (currentOrb.pos.y + otherOrb.pos.y) / 2;
                processed.add(j);
              }
            }
          }
        }
        mergedOrbs.push(currentOrb);
      }
    }
    state.expOrbs = mergedOrbs;
  }
  // Limiti ottimizzati per performance - PROTEGGI I BOSS!
  if (state.enemies.length > 150) {
    const bosses = state.enemies.filter(e => e.isBoss);
    const normalEnemies = state.enemies.filter(e => !e.isBoss);
    if (normalEnemies.length > 140) {
      normalEnemies.splice(0, normalEnemies.length - 140);
    }
    state.enemies = [...bosses, ...normalEnemies];
  }
  if (state.projectiles.length > 200) state.projectiles.splice(0, state.projectiles.length - 200);
  if (state.particles.length > 150) state.particles.splice(0, state.particles.length - 150);
  if (state.expOrbs.length > 80) state.expOrbs.splice(0, state.expOrbs.length - 80);
  if (state.damageNumbers.length > 30) state.damageNumbers.splice(0, state.damageNumbers.length - 30);
  if (state.nebulaPools.length > 24) state.nebulaPools.splice(0, state.nebulaPools.length - 24);
  if (state.stormHitboxes.length > 20) state.stormHitboxes.splice(0, state.stormHitboxes.length - 20);
  if (state.gravityWaves.length > 5) state.gravityWaves.splice(0, state.gravityWaves.length - 5);
  if (state.drones.length > 15) state.drones.splice(0, state.drones.length - 15);
  if (player.hp <= 0) {
    if (!state.reviveUsed) { state.revivePending = true; player.hp = 0; }
    else { state.gameOver = true; }
  }
}

function generateLevelUpChoices(state: GameState): LevelUpChoice[] {
  const activeTypes: AbilityType[] = ['photon_gun', 'ion_gun', 'drone_swarm', 'gravity_waves', 'void_lance', 'cryo_lance', 'energy_shield', 'asteroid_fragment', 'antimatter_bomb', 'laser_swords', 'homing_laser', 'kinetic_darts', 'meteor', 'neutronium_boomerang', 'orbiting_satellites', 'plasma_flamethrower', 'gravity_field', 'corrosive_nebula', 'quantum_bounce', 'ion_storm', 'stellar_blackhole', 'probe_x', 'probe_y'];
  const passiveTypes: AbilityType[] = ['passive_fusion_core', 'passive_plating', 'passive_neutronium_heart', 'passive_regen_core', 'passive_void_tome', 'passive_stellar_candelabrum', 'passive_kinetic_accelerator', 'passive_quantum_binder', 'passive_molecular_replicator', 'passive_ionic_thrusters', 'passive_gravity_field', 'passive_stellar_fortune', 'passive_galactic_crown', 'passive_cosmic_dust', 'passive_quantum_reactor', 'passive_pulsar_heart', 'passive_galactic_coin'];
  if (state.gameMode === 'boss_rush') activeTypes.splice(activeTypes.indexOf('stellar_blackhole'), 1); // troppo forte contro i boss
  const ownedAbilities = state.player.abilities;
  const activeAbilities = ownedAbilities.filter(a => !a.type.startsWith('passive_'));
  const passiveAbilities = ownedAbilities.filter(a => a.type.startsWith('passive_'));
  const MAX_ACTIVE = 6, MAX_PASSIVE = 6;
  const canOfferActive = activeAbilities.length < MAX_ACTIVE;
  const canOfferPassive = passiveAbilities.length < MAX_PASSIVE;
  const canOfferUpgrades = ownedAbilities.some(a => a.level < a.maxLevel);
  if (!canOfferActive && !canOfferPassive && !canOfferUpgrades) {
    return [
      { type: 'stat', stat: 'damage', name: 'gold_reward', description: 'gold_reward_desc', icon: '💰', color: '#ffd700' },
      { type: 'stat', stat: 'damage', name: 'gold_reward', description: 'gold_reward_desc', icon: '💰', color: '#ffd700' },
      { type: 'stat', stat: 'damage', name: 'gold_reward', description: 'gold_reward_desc', icon: '💰', color: '#ffd700' }
    ];
  }
  const pool: LevelUpChoice[] = [];
  const ownedTypes = ownedAbilities.map(a => a.type);
  if (canOfferActive || canOfferPassive) {
    let available: AbilityType[] = [];
    if (canOfferActive && !canOfferPassive) available = activeTypes.filter(t => !ownedTypes.includes(t));
    else if (!canOfferActive && canOfferPassive) available = passiveTypes.filter(t => !ownedTypes.includes(t));
    else available = [...activeTypes, ...passiveTypes].filter(t => !ownedTypes.includes(t));
    const filtered = available.filter(type => { const info = getAbilityInfo(type); const rarity = (type === 'passive_quantum_reactor' && ownedTypes.includes('passive_pulsar_heart')) ? 100 : info.rarity; return Math.random() * 100 < rarity + state.player.rarityBonus + state.player.luckBonus * 10; });
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    for (const type of shuffled.slice(0, 2)) { const info = getAbilityInfo(type); pool.push({ type: 'ability', abilityType: type, name: info.name, description: info.description, icon: '🆕', color: info.color }); }
  }
  if (canOfferUpgrades) { const upgradable = ownedAbilities.filter(a => a.level < a.maxLevel); const shuffled = [...upgradable].sort(() => Math.random() - 0.5); for (const ability of shuffled.slice(0, 2)) { const info = getAbilityInfo(ability.type); pool.push({ type: 'upgrade', abilityType: ability.type, name: info.name, description: info.description, icon: '⬆️', color: ability.color }); } }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  while (pool.length < 3) pool.push({ type: 'stat', stat: 'damage', name: 'gold_reward', description: 'gold_reward_desc', icon: '💰', color: '#ffd700' });
  return pool.slice(0, 3);
}

/** "Rigenera": nuove scelte di level up (consuma un utilizzo). */
export function rerollLevelUp(state: GameState): boolean {
  if (!state.levelUpPending || (state.rerolls || 0) <= 0) return false;
  state.rerolls = (state.rerolls || 0) - 1;
  state.levelUpChoices = generateLevelUpChoices(state);
  return true;
}

export function applyLevelUpChoice(state: GameState, choice: LevelUpChoice): void {
  if (choice.type === 'ability' && choice.abilityType) { state.player.abilities.push(createAbility(choice.abilityType)); if (choice.abilityType.startsWith('passive_')) applySinglePassiveAbility(choice.abilityType); }
  else if (choice.type === 'upgrade' && choice.abilityType) { const ability = state.player.abilities.find(a => a.type === choice.abilityType); if (ability) { const idx = state.player.abilities.indexOf(ability); state.player.abilities[idx] = upgradeAbility(ability); if (choice.abilityType.startsWith('passive_')) applySinglePassiveAbility(choice.abilityType); } }
  else if (choice.type === 'stat') state.coinsEarned += 100;
  applyPassiveAbilities(state.player);
  state.levelUpPending = false; state.levelUpChoices = [];
}

export function revivePlayer(state: GameState): void {
  state.player.hp = state.player.maxHp * 0.5;
  state.player.invincibleTimer = 3;
  state.reviveUsed = true;
  state.revivePending = false;
  spawnParticles(state, state.player.pos, '#00ff00', 15);
  spawnParticles(state, state.player.pos, '#ffffff', 10);
  state.screenShake = 0.3;
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number, lang: string = 'it', showDamageNumbers: boolean = true): void {
  const { player, camera } = state;
  const scaleFactor = getWorldZoom(width);
  const isMobile = scaleFactor !== 1;
  const shakeX = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake * 20 : 0;
  const shakeY = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake * 20 : 0;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.save(); ctx.translate(shakeX, shakeY);
  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, width, height);
  drawNebulaBackground(ctx, camera, width, height);
  // stelle vicine in primo piano (parallasse piu' veloce dello sfondo = profondita')
  for (let i = 0; i < state.stars.length; i += 2) {
    const star = state.stars[i];
    const parallax = star.layer === 0 ? 0.2 : star.layer === 1 ? 0.4 : 0.7;
    const px = ((star.x - camera.x * parallax) % width + width) % width;
    const py = ((star.y - camera.y * parallax) % height + height) % height;
    ctx.globalAlpha = 0.35 + star.brightness * 0.45 * (0.75 + 0.25 * Math.sin(state.time * 2 + i));
    ctx.fillStyle = star.layer === 2 ? '#dbeafe' : '#a5b4fc';
    ctx.beginPath(); ctx.arc(px, py, star.size * (star.layer === 2 ? 0.75 : 0.5), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  if (isMobile) { ctx.translate(width / 2, height / 2); ctx.scale(scaleFactor, scaleFactor); ctx.translate(-width / 2, -height / 2); }
  ctx.translate(width / 2 - camera.x, height / 2 - camera.y);
  // Cristalli di esperienza: alone + rombo luminoso (niente shadowBlur, costa poco)
  const orbPulse = 1 + Math.sin(state.time * 6) * 0.12;
  for (const orb of state.expOrbs) {
    const r = Math.max(4, orb.radius) * orbPulse;
    const big = orb.value >= 10;
    ctx.fillStyle = big ? 'rgba(168, 85, 247, 0.22)' : 'rgba(45, 212, 191, 0.2)';
    ctx.beginPath(); ctx.arc(orb.pos.x, orb.pos.y, r * 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = big ? '#c084fc' : '#2dd4bf';
    ctx.beginPath(); ctx.moveTo(orb.pos.x, orb.pos.y - r * 1.3); ctx.lineTo(orb.pos.x + r, orb.pos.y); ctx.lineTo(orb.pos.x, orb.pos.y + r * 1.3); ctx.lineTo(orb.pos.x - r, orb.pos.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath(); ctx.moveTo(orb.pos.x, orb.pos.y - r * 0.8); ctx.lineTo(orb.pos.x + r * 0.35, orb.pos.y - r * 0.1); ctx.lineTo(orb.pos.x - r * 0.35, orb.pos.y - r * 0.1); ctx.closePath(); ctx.fill();
  }
  drawPickups(ctx, state);
  for (const drone of state.drones) { ctx.fillStyle = drone.color; ctx.beginPath(); ctx.arc(drone.pos.x, drone.pos.y, drone.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(drone.pos.x, drone.pos.y, drone.radius * 0.4, 0, Math.PI * 2); ctx.fill(); }
  for (const wave of state.gravityWaves) { const alpha = 1 - (wave.lifetime / wave.maxLifetime); ctx.strokeStyle = wave.color; ctx.lineWidth = 2; ctx.globalAlpha = alpha * 0.5; ctx.beginPath(); ctx.arc(wave.pos.x, wave.pos.y, wave.radius, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  drawBossHazards(ctx, state, 'ground');
  // Ombre morbide sotto i nemici: li "appoggiano" sulla scena invece di sembrare incollati sullo sfondo
  ctx.fillStyle = 'rgba(0, 0, 8, 0.38)';
  for (const enemy of state.enemies) {
    const r = enemy.radius * (enemy.isBoss ? 1.05 : 1.15);
    ctx.beginPath(); ctx.ellipse(enemy.pos.x + r * 0.18, enemy.pos.y + r * 0.42, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const enemy of state.enemies) {
    ctx.save(); ctx.translate(enemy.pos.x, enemy.pos.y);
    ctx.fillStyle = enemy.color;
    if (enemy.isBoss) drawBossAura(ctx, enemy, state.time);
    if (drawEnemySprite(ctx, enemy, state)) {
      if (enemy.isBoss) { ctx.fillStyle = '#333'; ctx.fillRect(-enemy.radius, -enemy.radius - 15, enemy.radius * 2, 8); ctx.fillStyle = '#ff0044'; ctx.fillRect(-enemy.radius, -enemy.radius - 15, enemy.radius * 2 * (enemy.hp / enemy.maxHp), 8); }
      ctx.restore();
      continue;
    }
    if (enemy.type === 'asteroid_small') {
      ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const r = enemy.radius * (0.7 + Math.sin(i * 2.5) * 0.3); if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#555555'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#444444'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.3, -enemy.radius * 0.2, enemy.radius * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'asteroid_medium') { 
      ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const r = enemy.radius * (0.75 + Math.sin(i * 1.8) * 0.25); if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#666666'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#555555'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.4, -enemy.radius * 0.3, enemy.radius * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(enemy.radius * 0.3, enemy.radius * 0.2, enemy.radius * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'asteroid_large') { 
      ctx.beginPath(); for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; const r = enemy.radius * (0.8 + Math.sin(i * 1.5) * 0.2); if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#777777'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#666666'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.5, -enemy.radius * 0.4, enemy.radius * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(enemy.radius * 0.4, enemy.radius * 0.3, enemy.radius * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -enemy.radius * 0.5, enemy.radius * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'drone_sentinel') { 
      ctx.fillStyle = '#4466aa'; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.rotate(state.time * 5); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; ctx.fillStyle = '#3355aa'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * enemy.radius * 0.8, Math.sin(a) * enemy.radius * 0.8, enemy.radius * 0.3, enemy.radius * 0.1, a, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff000066'; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'star_raider') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.moveTo(enemy.radius, 0); ctx.lineTo(enemy.radius * 0.3, -enemy.radius * 0.8); ctx.lineTo(-enemy.radius * 0.8, -enemy.radius * 0.4); ctx.lineTo(-enemy.radius, 0); ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.4); ctx.lineTo(enemy.radius * 0.3, enemy.radius * 0.8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.moveTo(-enemy.radius * 0.5, -enemy.radius * 0.3); ctx.lineTo(-enemy.radius * 0.9, -enemy.radius * 0.6); ctx.lineTo(-enemy.radius * 0.7, -enemy.radius * 0.2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-enemy.radius * 0.5, enemy.radius * 0.3); ctx.lineTo(-enemy.radius * 0.9, enemy.radius * 0.6); ctx.lineTo(-enemy.radius * 0.7, enemy.radius * 0.2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(enemy.radius * 0.3, 0, enemy.radius * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'void_crawler') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, 0, enemy.radius * 0.8, enemy.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { const side = i < 3 ? -1 : 1; const legIndex = i % 3; const legAngle = (legIndex / 3) * Math.PI * 0.6 + Math.PI * 0.2; ctx.beginPath(); ctx.moveTo(side * enemy.radius * 0.5, Math.cos(legAngle) * enemy.radius * 0.3); ctx.lineTo(side * enemy.radius * 1.2, Math.cos(legAngle + Math.sin(state.time * 3 + i) * 0.2) * enemy.radius * 0.8); ctx.stroke(); } ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.2, -enemy.radius * 0.1, enemy.radius * 0.1, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.2, -enemy.radius * 0.1, enemy.radius * 0.1, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'nebula_wraith') { 
      ctx.fillStyle = enemy.color + '88'; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const r = enemy.radius * (0.6 + Math.sin(state.time * 2 + i * 0.5) * 0.3); if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.2, -enemy.radius * 0.1, enemy.radius * 0.15, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.2, -enemy.radius * 0.1, enemy.radius * 0.15, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'cosmic_leech') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, 0, enemy.radius * 0.4, enemy.radius, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff0066'; for (let i = 0; i < 4; i++) { const y = -enemy.radius * 0.6 + (i * enemy.radius * 0.4); ctx.beginPath(); ctx.arc(0, y, enemy.radius * 0.15, 0, Math.PI * 2); ctx.fill(); }
    } else if (enemy.type === 'star_jelly') { 
      ctx.fillStyle = enemy.color + 'aa'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = enemy.radius * (0.7 + Math.sin(state.time * 3 + i * 0.8) * 0.25); if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff44'; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'void_worm') { 
      ctx.fillStyle = enemy.color; for (let i = 0; i < 5; i++) { const segmentY = -enemy.radius * 0.8 + (i * enemy.radius * 0.4); const segmentRadius = enemy.radius * (0.5 - Math.abs(i - 2) * 0.1); ctx.beginPath(); ctx.arc(Math.sin(state.time * 2 + i) * enemy.radius * 0.2, segmentY, segmentRadius, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#ff00ff'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.15, -enemy.radius * 0.8, enemy.radius * 0.1, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.15, -enemy.radius * 0.8, enemy.radius * 0.1, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'star_beetle') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, 0, enemy.radius * 0.8, enemy.radius, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#00000066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -enemy.radius); ctx.lineTo(0, enemy.radius); ctx.stroke(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-enemy.radius * 0.3, -enemy.radius * 0.8); ctx.lineTo(-enemy.radius * 0.6, -enemy.radius * 1.2); ctx.moveTo(enemy.radius * 0.3, -enemy.radius * 0.8); ctx.lineTo(enemy.radius * 0.6, -enemy.radius * 1.2); ctx.stroke();
    } else if (enemy.type === 'cosmic_moth') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, 0, enemy.radius * 0.3, enemy.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = enemy.color + 'aa'; ctx.beginPath(); ctx.ellipse(-enemy.radius * 0.7, 0, enemy.radius * 0.6, enemy.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(enemy.radius * 0.7, 0, enemy.radius * 0.6, enemy.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff44'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.7, 0, enemy.radius * 0.3, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.7, 0, enemy.radius * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'void_stinger') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, enemy.radius * 0.5); ctx.lineTo(-enemy.radius * 0.2, enemy.radius * 1.2); ctx.lineTo(0, enemy.radius * 1.5); ctx.lineTo(enemy.radius * 0.2, enemy.radius * 1.2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.2, -enemy.radius * 0.1, enemy.radius * 0.12, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.2, -enemy.radius * 0.1, enemy.radius * 0.12, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'star_scorpion') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, 0, enemy.radius * 0.7, enemy.radius * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-enemy.radius * 0.8, -enemy.radius * 0.3, enemy.radius * 0.25, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.8, -enemy.radius * 0.3, enemy.radius * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, enemy.radius * 0.4); ctx.quadraticCurveTo(0, enemy.radius * 1.2, enemy.radius * 0.3, enemy.radius * 1.5); ctx.stroke();
    } else if (enemy.type === 'cosmic_crab') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, 0, enemy.radius * 0.8, enemy.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const side = i < 3 ? -1 : 1; const legIndex = i % 3; ctx.beginPath(); ctx.moveTo(side * enemy.radius * 0.6, -enemy.radius * 0.2 + legIndex * enemy.radius * 0.3); ctx.lineTo(side * enemy.radius * 1.3, -enemy.radius * 0.4 + legIndex * enemy.radius * 0.3); ctx.stroke(); } ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.3, -enemy.radius * 0.5, enemy.radius * 0.1, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.3, -enemy.radius * 0.5, enemy.radius * 0.1, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'void_spider') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const side = i < 4 ? -1 : 1; const legIndex = i % 4; const baseAngle = (legIndex / 4) * Math.PI * 0.6 + Math.PI * 0.2; ctx.beginPath(); ctx.moveTo(side * enemy.radius * 0.4, Math.cos(baseAngle) * enemy.radius * 0.3); ctx.quadraticCurveTo(side * enemy.radius * 1.2, Math.cos(baseAngle + Math.sin(state.time * 4 + i) * 0.2) * enemy.radius * 0.8, side * enemy.radius * 1.5, Math.cos(baseAngle) * enemy.radius * 1.2); ctx.stroke(); } ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.15, -enemy.radius * 0.1, enemy.radius * 0.08, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.15, -enemy.radius * 0.1, enemy.radius * 0.08, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'star_fish') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; const outerR = enemy.radius; const innerR = enemy.radius * 0.4; ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR); const a2 = a + Math.PI / 5; ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff44'; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'cosmic_squid') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, -enemy.radius * 0.3, enemy.radius * 0.6, enemy.radius * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const baseX = -enemy.radius * 0.4 + (i * enemy.radius * 0.16); ctx.beginPath(); ctx.moveTo(baseX, enemy.radius * 0.3); ctx.quadraticCurveTo(baseX + Math.sin(state.time * 3 + i) * enemy.radius * 0.3, enemy.radius * 0.8, baseX + Math.sin(state.time * 3 + i + 1) * enemy.radius * 0.4, enemy.radius * 1.3); ctx.stroke(); } ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-enemy.radius * 0.2, -enemy.radius * 0.4, enemy.radius * 0.15, 0, Math.PI * 2); ctx.arc(enemy.radius * 0.2, -enemy.radius * 0.4, enemy.radius * 0.15, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'star_destroyer') { 
      ctx.fillStyle = enemy.color; const shipAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x); ctx.save(); ctx.rotate(shipAngle); ctx.beginPath(); ctx.moveTo(enemy.radius, 0); ctx.lineTo(-enemy.radius * 0.7, -enemy.radius * 0.6); ctx.lineTo(-enemy.radius * 0.4, 0); ctx.lineTo(-enemy.radius * 0.7, enemy.radius * 0.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    } else if (enemy.type === 'imperial_probe') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + state.time; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * enemy.radius, Math.sin(a) * enemy.radius); ctx.stroke(); } ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'kamikaze') { 
      ctx.save(); ctx.rotate(state.time * 8); ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.moveTo(0, -enemy.radius); ctx.lineTo(-enemy.radius * 0.6, enemy.radius * 0.7); ctx.lineTo(enemy.radius * 0.6, enemy.radius * 0.7); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.fillStyle = '#ff440066'; ctx.beginPath(); ctx.arc(0, enemy.radius * 0.5, enemy.radius * 0.4 + Math.sin(state.time * 10) * 3, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.type === 'parasite') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = enemy.color; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + state.time * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * enemy.radius, Math.sin(a) * enemy.radius); ctx.quadraticCurveTo(Math.cos(a + 0.3) * enemy.radius * 1.8, Math.sin(a + 0.3) * enemy.radius * 1.8, Math.cos(a + 0.5) * enemy.radius * 2.2, Math.sin(a + 0.5) * enemy.radius * 2.2); ctx.stroke(); }
    } else if (enemy.type === 'guardian') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + state.time * 0.5; const r = enemy.radius; if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#ff880088'; ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(-enemy.radius, -enemy.radius - 10, enemy.radius * 2, 5); ctx.fillStyle = '#ffcc00'; ctx.fillRect(-enemy.radius, -enemy.radius - 10, enemy.radius * 2 * (enemy.hp / enemy.maxHp), 5);
    } else if (enemy.type === 'swarm') { 
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff66'; ctx.beginPath(); ctx.arc(-1, -1, enemy.radius * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (enemy.isBoss) {
      if (enemy.type === 'boss_death_star') {
        const r = enemy.radius;
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(r * 0.1, r * 0.1, r * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r); gradient.addColorStop(0, '#b8b8b8'); gradient.addColorStop(0.5, '#888888'); gradient.addColorStop(1, '#555555'); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-r, -r * 0.08, r * 2, r * 0.16);
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; for (let i = -r; i < r; i += r * 0.15) { ctx.beginPath(); ctx.moveTo(i, -r * 0.08); ctx.lineTo(i, r * 0.08); ctx.stroke(); }
        ctx.save(); ctx.translate(-r * 0.35, -r * 0.35); const laserGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.25); laserGradient.addColorStop(0, '#4a4a4a'); laserGradient.addColorStop(0.7, '#3a3a3a'); laserGradient.addColorStop(1, '#2a2a2a'); ctx.fillStyle = laserGradient; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * r * 0.22, Math.sin(angle) * r * 0.22); ctx.stroke(); } ctx.fillStyle = '#6a6a6a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.3; for (let i = 0; i < 12; i++) { const angle = (i / 12) * Math.PI * 2; const x1 = Math.cos(angle) * r * 0.4; const y1 = Math.sin(angle) * r * 0.4; const x2 = Math.cos(angle) * r * 0.9; const y2 = Math.sin(angle) * r * 0.9; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.3 + i * 0.2), 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1;
        ctx.save(); ctx.globalAlpha = 0.2; const highlightGradient = ctx.createRadialGradient(-r * 0.4, -r * 0.4, 0, -r * 0.4, -r * 0.4, r * 0.6); highlightGradient.addColorStop(0, '#ffffff'); highlightGradient.addColorStop(1, 'transparent'); ctx.fillStyle = highlightGradient; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.strokeStyle = '#444444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      } else if (enemy.type === 'boss_xenomorph') {
        const r = enemy.radius;
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r); bodyGradient.addColorStop(0, '#3a3a3a'); bodyGradient.addColorStop(0.5, '#1a1a1a'); bodyGradient.addColorStop(1, '#0a0a0a'); ctx.fillStyle = bodyGradient; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.ellipse(0, -r * 0.6, r * 0.5, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(0, -r * 0.8, r * 0.3, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const angle = (i / 4) * Math.PI - Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * r * 0.3, -r * 0.5 + Math.sin(angle) * r * 0.2); ctx.quadraticCurveTo(Math.cos(angle) * r * 0.6, -r * 0.3, Math.cos(angle) * r * 0.7, r * 0.2); ctx.stroke(); }
        ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.3); ctx.lineTo(-r * 0.4, r * 0.7); ctx.lineTo(-r * 0.3, r * 0.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r * 0.2, r * 0.3); ctx.lineTo(r * 0.4, r * 0.7); ctx.lineTo(r * 0.3, r * 0.9); ctx.stroke();
        ctx.fillStyle = '#6a6a6a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.15 + i * r * 0.15, r * 0.4); ctx.lineTo(-r * 0.1 + i * r * 0.15, r * 0.5); ctx.lineTo(-r * 0.2 + i * r * 0.15, r * 0.5); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#88ff00'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(-r * 0.1, r * 0.6, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.15, r * 0.7, r * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4; for (let i = 0; i < 6; i++) { const y = -r * 0.3 + i * r * 0.2; ctx.beginPath(); ctx.moveTo(-r * 0.5, y); ctx.quadraticCurveTo(0, y + r * 0.1, r * 0.5, y); ctx.stroke(); } ctx.globalAlpha = 1;
        ctx.save(); ctx.globalAlpha = 0.15; const highlightGradient = ctx.createRadialGradient(-r * 0.3, -r * 0.5, 0, -r * 0.3, -r * 0.5, r * 0.5); highlightGradient.addColorStop(0, '#ffffff'); highlightGradient.addColorStop(1, 'transparent'); ctx.fillStyle = highlightGradient; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else if (enemy.type === 'boss_cthulhu') {
        const r = enemy.radius;
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r); bodyGradient.addColorStop(0, '#00aa66'); bodyGradient.addColorStop(0.5, '#006644'); bodyGradient.addColorStop(1, '#003322'); ctx.fillStyle = bodyGradient; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#005533'; ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.5, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#00aa66'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const baseAngle = (i / 8) * Math.PI + Math.PI / 2; const waveOffset = Math.sin(state.time * 2 + i) * 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(baseAngle) * r * 0.4, -r * 0.1 + Math.sin(baseAngle) * r * 0.2); ctx.quadraticCurveTo(Math.cos(baseAngle + waveOffset) * r * 0.8, r * 0.3 + Math.sin(baseAngle + waveOffset) * r * 0.4, Math.cos(baseAngle + waveOffset * 2) * r * 1.2, r * 0.6 + Math.sin(baseAngle + waveOffset * 2) * r * 0.3); ctx.stroke(); }
        ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.4, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.4, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000000'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.4, r * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.4, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffaa00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8; for (let i = 0; i < 6; i++) { const angle = (i / 6) * Math.PI * 2 + state.time * 0.5; const distance = r * 0.5; ctx.beginPath(); ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, r * 0.06, 0, Math.PI * 2); ctx.fill(); } ctx.shadowBlur = 0;
        ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.globalAlpha = 0.3 + Math.sin(state.time * 3) * 0.2; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#88ffaa'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { const symbolAngle = (i / 3) * Math.PI * 2 + state.time; const symbolX = Math.cos(symbolAngle) * r * 0.6; const symbolY = Math.sin(symbolAngle) * r * 0.6; ctx.beginPath(); for (let j = 0; j < 5; j++) { const pointAngle = (j / 5) * Math.PI * 2 - Math.PI / 2; const pointX = symbolX + Math.cos(pointAngle) * r * 0.1; const pointY = symbolY + Math.sin(pointAngle) * r * 0.1; if (j === 0) ctx.moveTo(pointX, pointY); else ctx.lineTo(pointX, pointY); } ctx.closePath(); ctx.stroke(); } ctx.globalAlpha = 1;
        ctx.strokeStyle = '#004422'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4; for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(angle + 0.3) * r * 0.5, Math.sin(angle + 0.3) * r * 0.5, Math.cos(angle) * r * 0.7, Math.sin(angle) * r * 0.7); ctx.stroke(); } ctx.globalAlpha = 1;
      } else if (enemy.type === 'boss_borg_cube') {
        const r = enemy.radius; const rotation = state.time * 0.3; ctx.save(); ctx.rotate(rotation);
        ctx.globalAlpha = 0.4; ctx.fillStyle = '#000000'; ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.6, r * 1.6); ctx.globalAlpha = 1;
        const cubeGradient = ctx.createLinearGradient(-r * 0.8, -r * 0.8, r * 0.8, r * 0.8); cubeGradient.addColorStop(0, '#2a2a2a'); cubeGradient.addColorStop(0.5, '#1a1a1a'); cubeGradient.addColorStop(1, '#0a0a0a'); ctx.fillStyle = cubeGradient; ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
        ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 15; ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#004400'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6; for (let i = 0; i < 8; i++) { const x = -r * 0.8 + (i / 7) * r * 1.6; ctx.beginPath(); ctx.moveTo(x, -r * 0.8); ctx.lineTo(x, r * 0.8); ctx.stroke(); } for (let i = 0; i < 8; i++) { const y = -r * 0.8 + (i / 7) * r * 1.6; ctx.beginPath(); ctx.moveTo(-r * 0.8, y); ctx.lineTo(r * 0.8, y); ctx.stroke(); } ctx.globalAlpha = 1;
        const pulseIntensity = (Math.sin(state.time * 3) + 1) / 2; ctx.fillStyle = '#00ff00'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 10 + pulseIntensity * 10; for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2; const distance = r * 0.6; const x = Math.cos(angle) * distance; const y = Math.sin(angle) * distance; ctx.globalAlpha = 0.5 + pulseIntensity * 0.5; ctx.beginPath(); ctx.arc(x, y, r * 0.08, 0, Math.PI * 2); ctx.fill(); } ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.strokeStyle = '#006600'; ctx.lineWidth = 2; ctx.strokeRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6); const cornerSize = r * 0.2; ctx.strokeRect(-r * 0.7, -r * 0.7, cornerSize, cornerSize); ctx.strokeRect(r * 0.5, -r * 0.7, cornerSize, cornerSize); ctx.strokeRect(-r * 0.7, r * 0.5, cornerSize, cornerSize); ctx.strokeRect(r * 0.5, r * 0.5, cornerSize, cornerSize);
        ctx.strokeStyle = '#003300'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5; ctx.strokeRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5); ctx.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); ctx.globalAlpha = 1;
        ctx.fillStyle = '#00ff00'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 20; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(-r * 0.6, -r * 0.6, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.6, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-r * 0.6, r * 0.6, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.6, r * 0.6, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
      } else if (enemy.type === 'boss_space_kraken') {
        const r = enemy.radius;
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.8); bodyGradient.addColorStop(0, '#8800aa'); bodyGradient.addColorStop(0.5, '#550077'); bodyGradient.addColorStop(1, '#330044'); ctx.fillStyle = bodyGradient; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#660088'; ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.6, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round'; for (let i = 0; i < 10; i++) { const baseAngle = (i / 10) * Math.PI * 2; const wave1 = Math.sin(state.time * 2 + i * 0.7) * 0.3; const wave2 = Math.sin(state.time * 1.5 + i * 0.5) * 0.2; const tentacleGradient = ctx.createLinearGradient(Math.cos(baseAngle) * r * 0.5, Math.sin(baseAngle) * r * 0.5, Math.cos(baseAngle + wave1) * r * 1.5, Math.sin(baseAngle + wave1) * r * 1.5); tentacleGradient.addColorStop(0, '#8800aa'); tentacleGradient.addColorStop(1, '#440066'); ctx.strokeStyle = tentacleGradient; ctx.lineWidth = 6 - (i % 3); ctx.beginPath(); ctx.moveTo(Math.cos(baseAngle) * r * 0.6, Math.sin(baseAngle) * r * 0.6); ctx.quadraticCurveTo(Math.cos(baseAngle + wave1) * r * 1.0, Math.sin(baseAngle + wave1) * r * 1.0, Math.cos(baseAngle + wave1 + wave2) * r * 1.4, Math.sin(baseAngle + wave1 + wave2) * r * 1.4); ctx.stroke(); ctx.fillStyle = '#aa00cc'; for (let j = 0; j < 3; j++) { const t = (j + 1) / 4; const suckX = Math.cos(baseAngle + wave1 * t) * r * (0.6 + t * 0.8); const suckY = Math.sin(baseAngle + wave1 * t) * r * (0.6 + t * 0.8); ctx.beginPath(); ctx.arc(suckX, suckY, r * 0.05, 0, Math.PI * 2); ctx.fill(); } }
        ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000000'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.08, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(-r * 0.08, -r * 0.18, r * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#550077'; ctx.globalAlpha = 0.4; for (let i = 0; i < 12; i++) { const spotAngle = (i / 12) * Math.PI * 2; const spotDistance = r * (0.3 + Math.random() * 0.3); ctx.beginPath(); ctx.arc(Math.cos(spotAngle) * spotDistance, Math.sin(spotAngle) * spotDistance, r * 0.08, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
        ctx.fillStyle = '#220033'; ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.3); ctx.lineTo(0, r * 0.5); ctx.lineTo(r * 0.15, r * 0.3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aa00ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.3 + Math.sin(state.time * 2) * 0.2; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (enemy.type === 'boss_galaxy_devourer') {
        const r = enemy.radius; ctx.save(); ctx.rotate(state.time * 0.2);
        const vortexGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r); vortexGradient.addColorStop(0, '#440088'); vortexGradient.addColorStop(0.3, '#220044'); vortexGradient.addColorStop(0.7, '#110022'); vortexGradient.addColorStop(1, '#000000'); ctx.fillStyle = vortexGradient; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8800ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.7; for (let arm = 0; arm < 4; arm++) { const armOffset = (arm / 4) * Math.PI * 2; ctx.beginPath(); for (let i = 0; i < 50; i++) { const t = i / 50; const angle = armOffset + t * Math.PI * 3; const radius = t * r * 0.9; const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); } ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 30; i++) { const starAngle = (i / 30) * Math.PI * 2 + state.time * 0.5; const starDistance = r * (0.2 + (i % 5) * 0.15); const starX = Math.cos(starAngle) * starDistance; const starY = Math.sin(starAngle) * starDistance; const starSize = r * 0.02 + Math.sin(state.time * 3 + i) * r * 0.01; ctx.globalAlpha = 0.5 + Math.sin(state.time * 2 + i) * 0.3; ctx.beginPath(); ctx.arc(starX, starY, starSize, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
        const blackHoleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3); blackHoleGradient.addColorStop(0, '#000000'); blackHoleGradient.addColorStop(0.7, '#110022'); blackHoleGradient.addColorStop(1, '#220044'); ctx.fillStyle = blackHoleGradient; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.35, r * 0.15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 10; for (let i = 0; i < 12; i++) { const particleAngle = (i / 12) * Math.PI * 2 + state.time * 2; const particleDistance = r * (0.4 + Math.sin(state.time + i) * 0.2); const particleX = Math.cos(particleAngle) * particleDistance; const particleY = Math.sin(particleAngle) * particleDistance; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(particleX, particleY, r * 0.03, 0, Math.PI * 2); ctx.fill(); } ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.fillStyle = '#6600cc'; ctx.globalAlpha = 0.2; for (let i = 0; i < 8; i++) { const nebulaAngle = (i / 8) * Math.PI * 2; const nebulaDistance = r * 0.7; ctx.beginPath(); ctx.arc(Math.cos(nebulaAngle) * nebulaDistance, Math.sin(nebulaAngle) * nebulaDistance, r * 0.15, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.restore();
      } else if (enemy.type === 'boss_void_emperor') {
        const r = enemy.radius;
        const auraGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); auraGradient.addColorStop(0, 'rgba(68, 0, 136, 0.3)'); auraGradient.addColorStop(0.5, 'rgba(44, 0, 88, 0.2)'); auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = auraGradient; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2); ctx.fill();
        const bodyGradient = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.8); bodyGradient.addColorStop(0, '#550088'); bodyGradient.addColorStop(0.5, '#330066'); bodyGradient.addColorStop(1, '#220044'); ctx.fillStyle = bodyGradient; ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.5, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#440066'; ctx.beginPath(); ctx.ellipse(-r * 0.5, r * 0.1, r * 0.2, r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.5, r * 0.1, r * 0.2, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#330055'; ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#220044'; ctx.strokeStyle = '#8800ff'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const crownAngle = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.8; const crownX = Math.cos(crownAngle) * r * 0.35; const crownY = -r * 0.5 + Math.sin(crownAngle) * r * 0.1; ctx.beginPath(); ctx.moveTo(crownX - r * 0.05, crownY); ctx.lineTo(crownX, crownY - r * 0.25); ctx.lineTo(crownX + r * 0.05, crownY); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 10; for (let i = 0; i < 5; i++) { const gemAngle = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.8; const gemX = Math.cos(gemAngle) * r * 0.35; const gemY = -r * 0.5 + Math.sin(gemAngle) * r * 0.1; ctx.beginPath(); ctx.arc(gemX, gemY - r * 0.15, r * 0.04, 0, Math.PI * 2); ctx.fill(); } ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.45, r * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.45, r * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000000'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.45, r * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.45, r * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#440066'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.2); ctx.quadraticCurveTo(-r * 0.7, r * 0.5, -r * 0.6, r * 0.8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.quadraticCurveTo(r * 0.7, r * 0.5, r * 0.6, r * 0.8); ctx.stroke();
        ctx.strokeStyle = '#8800ff'; ctx.lineWidth = 3; for (let side = -1; side <= 1; side += 2) { for (let i = 0; i < 3; i++) { const clawX = side * r * 0.6; const clawY = r * 0.8; ctx.beginPath(); ctx.moveTo(clawX, clawY); ctx.lineTo(clawX + side * r * 0.1, clawY + r * 0.15); ctx.stroke(); } }
        ctx.strokeStyle = '#8800ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { const symbolY = r * 0.1 + i * r * 0.2; ctx.beginPath(); ctx.arc(0, symbolY, r * 0.1, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 0.1, symbolY); ctx.lineTo(r * 0.1, symbolY); ctx.moveTo(0, symbolY - r * 0.1); ctx.lineTo(0, symbolY + r * 0.1); ctx.stroke(); } ctx.globalAlpha = 1;
        ctx.fillStyle = '#8800ff'; ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 20; ctx.globalAlpha = 0.3 + Math.sin(state.time * 2) * 0.2; ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      } else if (enemy.type === 'boss_cosmic_horror') {
        const r = enemy.radius;
        ctx.fillStyle = '#002244'; ctx.beginPath(); for (let i = 0; i < 12; i++) { const angle = (i / 12) * Math.PI * 2; const pulse = Math.sin(state.time * 2 + i * 0.5) * 0.15; const radius = r * (0.7 + pulse); const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#001122'; ctx.globalAlpha = 0.5; for (let i = 0; i < 15; i++) { const blobAngle = (i / 15) * Math.PI * 2 + state.time * 0.3; const blobDistance = r * (0.3 + Math.random() * 0.3); const blobX = Math.cos(blobAngle) * blobDistance; const blobY = Math.sin(blobAngle) * blobDistance; ctx.beginPath(); ctx.arc(blobX, blobY, r * 0.1, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
        for (let i = 0; i < 12; i++) { const eyeAngle = (i / 12) * Math.PI * 2 + state.time * 0.5; const eyeDistance = r * (0.2 + (i % 3) * 0.2); const eyeX = Math.cos(eyeAngle) * eyeDistance; const eyeY = Math.sin(eyeAngle) * eyeDistance; const eyeSize = r * 0.08 + Math.sin(state.time * 3 + i) * r * 0.02; ctx.fillStyle = '#ffff00'; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000000'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#004488'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const tentacleAngle = (i / 8) * Math.PI * 2; const wave1 = Math.sin(state.time * 2 + i) * 0.4; const wave2 = Math.cos(state.time * 1.5 + i * 0.7) * 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(tentacleAngle) * r * 0.6, Math.sin(tentacleAngle) * r * 0.6); ctx.bezierCurveTo(Math.cos(tentacleAngle + wave1) * r * 1.0, Math.sin(tentacleAngle + wave1) * r * 1.0, Math.cos(tentacleAngle + wave2) * r * 1.3, Math.sin(tentacleAngle + wave2) * r * 1.3, Math.cos(tentacleAngle + wave1 + wave2) * r * 1.5, Math.sin(tentacleAngle + wave1 + wave2) * r * 1.5); ctx.stroke(); ctx.fillStyle = '#0066aa'; for (let j = 0; j < 3; j++) { const t = (j + 1) / 4; const suckX = Math.cos(tentacleAngle + wave1 * t) * r * (0.6 + t * 0.9); const suckY = Math.sin(tentacleAngle + wave1 * t) * r * (0.6 + t * 0.9); ctx.beginPath(); ctx.arc(suckX, suckY, r * 0.04, 0, Math.PI * 2); ctx.fill(); } }
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) { const toothAngle = (i / 8) * Math.PI * 2; const toothX = Math.cos(toothAngle) * r * 0.2; const toothY = Math.sin(toothAngle) * r * 0.2; ctx.beginPath(); ctx.moveTo(toothX, toothY); ctx.lineTo(toothX + Math.cos(toothAngle) * r * 0.1, toothY + Math.sin(toothAngle) * r * 0.1); ctx.lineTo(toothX + Math.cos(toothAngle + 0.2) * r * 0.05, toothY + Math.sin(toothAngle + 0.2) * r * 0.05); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.2 + Math.sin(state.time * 3 + i) * 0.1; ctx.beginPath(); ctx.arc(0, 0, r * (0.9 + i * 0.1), 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1;
        ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10; for (let i = 0; i < 20; i++) { const particleAngle = (i / 20) * Math.PI * 2 + state.time; const particleDistance = r * (0.8 + Math.sin(state.time * 2 + i) * 0.2); const particleX = Math.cos(particleAngle) * particleDistance; const particleY = Math.sin(particleAngle) * particleDistance; ctx.globalAlpha = 0.5 + Math.sin(state.time * 3 + i) * 0.3; ctx.beginPath(); ctx.arc(particleX, particleY, r * 0.02, 0, Math.PI * 2); ctx.fill(); } ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#333'; ctx.fillRect(-enemy.radius, -enemy.radius - 15, enemy.radius * 2, 8); ctx.fillStyle = '#ff0044'; ctx.fillRect(-enemy.radius, -enemy.radius - 15, enemy.radius * 2 * (enemy.hp / enemy.maxHp), 8);
    } else { ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#00000033'; ctx.beginPath(); ctx.arc(enemy.radius * 0.2, -enemy.radius * 0.2, enemy.radius * 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // Scie luminose dei proiettili (prima erano pallini piatti, quasi invisibili)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const proj of state.projectiles) {
    const tr = proj.trail;
    if (!tr || tr.length < 2) continue;
    const w = Math.max(2, Math.min(proj.radius, 14));
    ctx.strokeStyle = proj.color;
    ctx.globalAlpha = proj.fromPlayer ? 0.28 : 0.22;
    ctx.lineWidth = w * 1.6;
    ctx.beginPath(); ctx.moveTo(tr[0].x, tr[0].y);
    for (let k = 1; k < tr.length; k++) ctx.lineTo(tr[k].x, tr[k].y);
    ctx.lineTo(proj.pos.x, proj.pos.y);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, w * 1.9, 0, Math.PI * 2);
    ctx.fillStyle = proj.color; ctx.fill();
  }
  ctx.restore();
  for (const proj of state.projectiles) { ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); if (proj.type === 'boomerang_proj') { const rotation = state.time * 10; ctx.rotate(rotation); ctx.fillStyle = proj.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-proj.radius, 0); ctx.lineTo(0, -proj.radius * 0.6); ctx.lineTo(proj.radius, 0); ctx.stroke(); } else if (proj.type === 'antimatter_bomb_proj') { ctx.fillStyle = proj.color; ctx.beginPath(); ctx.arc(0, 0, proj.radius, 0, Math.PI * 2); ctx.fill(); } else if (proj.type === 'quantum_bounce_proj') { const rotation = Math.atan2(proj.vel.y, proj.vel.x); ctx.rotate(rotation); ctx.fillStyle = proj.color; ctx.beginPath(); ctx.moveTo(proj.radius * 1.5, 0); ctx.lineTo(0, -proj.radius); ctx.lineTo(-proj.radius * 1.5, 0); ctx.lineTo(0, proj.radius); ctx.closePath(); ctx.fill(); if (proj.bouncesLeft !== undefined && proj.maxBounces !== undefined) { ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(proj.bouncesLeft.toString(), 0, 0); } } else if (proj.type === 'boss_laser_big') { const rotation = Math.atan2(proj.vel.y, proj.vel.x); ctx.rotate(rotation); ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.ellipse(0, 0, proj.radius * 1.5, proj.radius, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, proj.radius * 0.5, 0, Math.PI * 2); ctx.fill(); } else if (proj.type === 'boss_laser_small') { const rotation = Math.atan2(proj.vel.y, proj.vel.x); ctx.rotate(rotation); ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(0, 0, proj.radius * 1.2, proj.radius * 0.7, 0, 0, Math.PI * 2); ctx.fill(); } else if (proj.type === 'acid_blob') { ctx.fillStyle = '#88ff00'; ctx.beginPath(); ctx.arc(0, 0, proj.radius, 0, Math.PI * 2); ctx.fill(); } else if (proj.type === 'tractor_beam') { const rotation = Math.atan2(proj.vel.y, proj.vel.x); ctx.rotate(rotation); ctx.fillStyle = '#00ff00'; ctx.fillRect(-proj.radius * 3, -proj.radius * 0.5, proj.radius * 3, proj.radius); ctx.fillStyle = '#88ff88'; ctx.beginPath(); ctx.arc(0, 0, proj.radius * 0.6, 0, Math.PI * 2); ctx.fill(); } else { if (proj.evolved) { const pulse = 1.6 + Math.sin(state.time * 12 + proj.pos.x * 0.05) * 0.25; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, proj.radius * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; } ctx.fillStyle = proj.color; ctx.beginPath(); ctx.arc(0, 0, proj.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; ctx.beginPath(); ctx.arc(0, 0, proj.radius * 0.45, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  for (const p of state.particles) { const alpha = p.life / p.maxLife; ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'); ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * alpha, 0, Math.PI * 2); ctx.fill(); }
  if (showDamageNumbers) { for (const dmgNum of state.damageNumbers) { const alpha = dmgNum.lifetime / dmgNum.maxLifetime; const fontSize = dmgNum.isCrit ? 18 : 12; ctx.save(); ctx.globalAlpha = alpha; ctx.font = `bold ${fontSize}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = dmgNum.isCrit ? '#ffff00' : dmgNum.color; ctx.fillText(Math.floor(dmgNum.value).toString(), dmgNum.pos.x, dmgNum.pos.y); if (dmgNum.isCrit) { ctx.font = 'bold 9px monospace'; ctx.fillText('CRIT!', dmgNum.pos.x, dmgNum.pos.y - 12); } ctx.restore(); } }
  for (const nebula of state.nebulaPools) { const alpha = 1 - (nebula.lifetime / nebula.maxLifetime); ctx.save(); ctx.globalAlpha = alpha * 0.5; const gradient = ctx.createRadialGradient(nebula.pos.x, nebula.pos.y, 0, nebula.pos.x, nebula.pos.y, nebula.radius); gradient.addColorStop(0, nebula.color + 'cc'); gradient.addColorStop(0.4, nebula.color + '88'); gradient.addColorStop(0.7, nebula.color + '44'); gradient.addColorStop(1, nebula.color + '00'); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(nebula.pos.x, nebula.pos.y, nebula.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = alpha * 0.3; ctx.strokeStyle = nebula.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(nebula.pos.x, nebula.pos.y, nebula.radius * (0.8 + Math.sin(state.time * 5) * 0.1), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = alpha * 0.4; for (let i = 0; i < 4; i++) { const angle = (i / 4) * Math.PI * 2 + state.time * 2; const dist = nebula.radius * 0.5; const px = nebula.pos.x + Math.cos(angle) * dist; const py = nebula.pos.y + Math.sin(angle) * dist; ctx.fillStyle = nebula.color; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  for (const hitbox of state.stormHitboxes) { const alpha = 1 - (hitbox.lifetime / hitbox.maxLifetime); ctx.save(); ctx.translate(hitbox.pos.x, hitbox.pos.y); ctx.rotate(hitbox.rotation); ctx.globalAlpha = alpha * 0.6; ctx.fillStyle = hitbox.color; ctx.strokeStyle = hitbox.color; ctx.lineWidth = 2; if (hitbox.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, hitbox.radius, 0, Math.PI * 2); ctx.fill(); } else if (hitbox.shape === 'star') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const ang = (i * Math.PI) / 5 - Math.PI / 2; const radius = i % 2 === 0 ? hitbox.radius : hitbox.radius * 0.5; const x = Math.cos(ang) * radius; const y = Math.sin(ang) * radius; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); } else if (hitbox.shape === 'square') { const size = hitbox.radius * 1.4; ctx.fillRect(-size / 2, -size / 2, size, size); } ctx.restore(); }
  for (const sword of state.laserSwords) { const sx = player.pos.x + Math.cos(sword.angle) * sword.distance; const sy = player.pos.y + Math.sin(sword.angle) * sword.distance; const ex = sx + Math.cos(sword.angle + Math.PI / 2) * sword.length; const ey = sy + Math.sin(sword.angle + Math.PI / 2) * sword.length; ctx.strokeStyle = sword.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); }
  const orbitingSatellitesAbility = player.abilities.find(a => a.type === 'orbiting_satellites');
  if (orbitingSatellitesAbility) { const satLvl = orbitingSatellitesAbility.level; const satCount = getSatelliteCount(player, satLvl); const rotationSpeed = 2 * (1 + player.projectileSpeedBonus); const satDistance = Math.min((70 + satLvl * 10) * (1 + player.areaBonus), 200); const satRadius = 15 * (1 + player.areaBonus); for (let i = 0; i < satCount; i++) { const ang = (state.time * rotationSpeed) + (i * Math.PI * 2 / satCount); const satX = player.pos.x + Math.cos(ang) * satDistance; const satY = player.pos.y + Math.sin(ang) * satDistance; ctx.save(); ctx.translate(satX, satY); ctx.rotate(ang + Math.PI / 2); ctx.fillStyle = orbitingSatellitesAbility.color; ctx.beginPath(); ctx.arc(0, 0, satRadius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, satRadius * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
  drawProbes(ctx, state);
  const gravityFieldAbility = player.abilities.find(a => a.type === 'gravity_field');
  if (gravityFieldAbility) { const fieldLvl = gravityFieldAbility.level; const fieldRadius = (150 + fieldLvl * 20) * (1 + player.areaBonus); const pulse = Math.sin(state.time * 3) * 0.1 + 0.9; ctx.save(); ctx.globalAlpha = 0.25 * pulse; const gradient = ctx.createRadialGradient(player.pos.x, player.pos.y, 0, player.pos.x, player.pos.y, fieldRadius); gradient.addColorStop(0, gravityFieldAbility.color + '00'); gradient.addColorStop(0.5, gravityFieldAbility.color + '33'); gradient.addColorStop(0.8, gravityFieldAbility.color + '66'); gradient.addColorStop(1, gravityFieldAbility.color + '00'); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(player.pos.x, player.pos.y, fieldRadius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 0.5 * pulse; ctx.strokeStyle = gravityFieldAbility.color; ctx.lineWidth = 2; ctx.setLineDash([5, 10]); ctx.lineDashOffset = -state.time * 20; ctx.beginPath(); ctx.arc(player.pos.x, player.pos.y, fieldRadius * 0.9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 0.3; for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2 + state.time * 0.5; const innerRadius = fieldRadius * 0.3; const outerRadius = fieldRadius * 0.85; const x1 = player.pos.x + Math.cos(ang) * innerRadius; const y1 = player.pos.y + Math.sin(ang) * innerRadius; const x2 = player.pos.x + Math.cos(ang) * outerRadius; const y2 = player.pos.y + Math.sin(ang) * outerRadius; ctx.strokeStyle = gravityFieldAbility.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } ctx.restore(); }
  drawBossHazards(ctx, state, 'top');
  ctx.save(); ctx.translate(player.pos.x, player.pos.y);
  const flash = player.invincibleTimer > 0 && Math.sin(state.time * 30) > 0;
  if (!flash) { 
    const speed = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y); 
    let shipAngle = 0; 
    if (speed > 10) shipAngle = Math.atan2(player.vel.x, -player.vel.y); 
    ctx.rotate(shipAngle); 
    // Detailed ship rendering for all 26 ships
    const r = player.radius;
    const ship = player.currentShip;
    
    const shipSprite = getShipSprite(ship);
    if (shipSprite) {
      // Immagine dell'astronave (public/assets/ships). Se manca, si usa il disegno vettoriale qui sotto.
      const shipSize = r * 3.4;
      ctx.shadowColor = 'rgba(0, 200, 255, 0.35)'; ctx.shadowBlur = 12;
      ctx.drawImage(shipSprite, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
      ctx.shadowBlur = 0;
    } else if (ship === 'fire_ship') {
      // G'quan Heavy Cruiser - corpo allungato con fiamme
      ctx.fillStyle = '#cc3300'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#ff5500'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(-r * 0.25, -r * 0.8); ctx.lineTo(r * 0.25, -r * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#aa2200'; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.3); ctx.lineTo(-r * 1.5, 0); ctx.lineTo(-r * 1.3, r * 0.4); ctx.lineTo(-r * 0.5, r * 0.2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.3); ctx.lineTo(r * 1.5, 0); ctx.lineTo(r * 1.3, r * 0.4); ctx.lineTo(r * 0.5, r * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.ellipse(0, r * 1.1, r * 0.4, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      const flameOffset = Math.sin(state.time * 10) * r * 0.1;
      ctx.fillStyle = '#ff4400'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 1.3); ctx.quadraticCurveTo(-r * 0.1, r * 1.6 + flameOffset, 0, r * 1.8 + flameOffset); ctx.quadraticCurveTo(r * 0.1, r * 1.6 + flameOffset, r * 0.3, r * 1.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffcc00'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 1.3); ctx.quadraticCurveTo(-r * 0.05, r * 1.5 + flameOffset, 0, r * 1.6 + flameOffset); ctx.quadraticCurveTo(r * 0.05, r * 1.5 + flameOffset, r * 0.15, r * 1.3); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'starter') {
      // Romulan Warbird Valdore - elegante e affusolato
      ctx.fillStyle = '#2a4a2a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.4, r * 1.0, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#1a3a1a'; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.2); ctx.quadraticCurveTo(-r * 1.2, -r * 0.5, -r * 1.5, -r * 1.0); ctx.quadraticCurveTo(-r * 1.3, -r * 1.1, -r * 1.1, -r * 0.9); ctx.quadraticCurveTo(-r * 0.8, -r * 0.5, -r * 0.3, -r * 0.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.2); ctx.quadraticCurveTo(r * 1.2, -r * 0.5, r * 1.5, -r * 1.0); ctx.quadraticCurveTo(r * 1.3, -r * 1.1, r * 1.1, -r * 0.9); ctx.quadraticCurveTo(r * 0.8, -r * 0.5, r * 0.3, -r * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#00ff00'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(0, r * 1.0, r * 0.18, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#88ff88'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.15, r * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else if (ship === 'laser_ship') {
      // Cylon Basestar - forma a diamante con occhio rosso
      ctx.fillStyle = '#8a1a1a'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 1.2, 0); ctx.lineTo(0, r * 1.2); ctx.lineTo(-r * 1.2, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#aa2222'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#6a0a0a'; ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r * 0.8); ctx.lineTo(-r * 0.8, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 1; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(0, r * 1.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); ctx.lineTo(r * 1.2, 0); ctx.stroke(); ctx.globalAlpha = 1;
      const corners = [{ x: 0, y: -r * 1.2 }, { x: r * 1.2, y: 0 }, { x: 0, y: r * 1.2 }, { x: -r * 1.2, y: 0 }];
      corners.forEach(c => { ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; });
      ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    } else if (ship === 'electric_ship') {
      // Klingon IKS Negh'Var - gobba centrale con ali a V
      ctx.fillStyle = '#5a5a5a'; ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.6, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.1); ctx.lineTo(-r * 1.8, r * 0.6); ctx.lineTo(-r * 1.6, r * 1.0); ctx.lineTo(-r * 0.4, r * 0.6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.1); ctx.lineTo(r * 1.8, r * 0.6); ctx.lineTo(r * 1.6, r * 1.0); ctx.lineTo(r * 0.4, r * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffff00'; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(-r * 0.175, r * 1.2, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.175, r * 1.2, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'nuclear_ship') {
      // Breen Warship - esagonale con reattore nucleare
      ctx.fillStyle = '#2a3a4a'; ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.8, -r * 0.4); ctx.lineTo(r * 0.8, r * 0.4); ctx.lineTo(0, r * 0.9); ctx.lineTo(-r * 0.8, r * 0.4); ctx.lineTo(-r * 0.8, -r * 0.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#1a2a3a'; ctx.fillRect(-r * 1.3, -r * 0.3, r * 0.5, r * 0.8); ctx.fillRect(r * 0.8, -r * 0.3, r * 0.5, r * 0.8);
      ctx.fillStyle = '#00ff00'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#88ff88'; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#00ccff'; ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(-r * 0.25, r * 0.9, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.25, r * 0.9, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'shadow_ship') {
      // Romulano Bird of Prey - ali a uccello da preda
      ctx.fillStyle = '#2a4a2a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 1.0, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#1a3a1a'; ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(-r * 1.8, -r * 0.6); ctx.lineTo(-r * 1.6, r * 0.3); ctx.lineTo(-r * 0.5, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 1.8, -r * 0.6); ctx.lineTo(r * 1.6, r * 0.3); ctx.lineTo(r * 0.5, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#00ff00'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.9, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.2, r * 0.9, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#88ff88'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else if (ship === 'bio_ship') {
      // Klingon Bird of Prey biologico - texture organica
      ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#4a3a3a'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.4 + i * r * 0.2); ctx.quadraticCurveTo(0, -r * 0.5 + i * r * 0.2, r * 0.3, -r * 0.4 + i * r * 0.2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a1a1a'; ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.2); ctx.quadraticCurveTo(-r * 1.2, r * 0.3, -r * 1.5, r * 0.8); ctx.quadraticCurveTo(-r * 1.4, r * 1.0, -r * 1.3, r * 1.0); ctx.quadraticCurveTo(-r * 0.8, r * 0.7, -r * 0.3, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.quadraticCurveTo(r * 1.2, r * 0.3, r * 1.5, r * 0.8); ctx.quadraticCurveTo(r * 1.4, r * 1.0, r * 1.3, r * 1.0); ctx.quadraticCurveTo(r * 0.8, r * 0.7, r * 0.3, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff3300'; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.85, r * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.2, r * 0.85, r * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff6600'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'tie_fighter_ship') {
      // TIE Fighter - pannelli esagonali con cabina sferica
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(-r * 1.5, -r * 1.2); ctx.lineTo(-r * 0.9, -r * 0.9); ctx.lineTo(-r * 0.9, r * 0.9); ctx.lineTo(-r * 1.5, r * 1.2); ctx.lineTo(-r * 2.1, r * 0.9); ctx.lineTo(-r * 2.1, -r * 0.9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#444444'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 1.5, -r * 1.2); ctx.lineTo(r * 0.9, -r * 0.9); ctx.lineTo(r * 0.9, r * 0.9); ctx.lineTo(r * 1.5, r * 1.2); ctx.lineTo(r * 2.1, r * 0.9); ctx.lineTo(r * 2.1, -r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-r * 0.9, -r * 0.15, r * 0.6, r * 0.3); ctx.fillRect(r * 0.3, -r * 0.15, r * 0.6, r * 0.3);
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#444444'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#00aaff'; ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#66ccff'; ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'viper_ship') {
      // Viper - corpo allungato con ali a V e scia motore
      ctx.fillStyle = '#5a5a5a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.35, r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#777777'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.3); ctx.lineTo(-r * 1.5, -r * 0.7); ctx.lineTo(-r * 1.3, -r * 0.3); ctx.lineTo(-r * 0.35, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.3); ctx.lineTo(r * 1.5, -r * 0.7); ctx.lineTo(r * 1.3, -r * 0.3); ctx.lineTo(r * 0.35, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#00ccff'; ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(0, r * 1.1, r * 0.25, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      const trailOffset = Math.sin(state.time * 10) * r * 0.1;
      ctx.fillStyle = '#00aaff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 1.2); ctx.quadraticCurveTo(0, r * 1.6 + trailOffset, r * 0.15, r * 1.2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#88ccff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.18, r * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else if (ship === 'federation_ship') {
      // Enterprise - disco saucer con gondole warp
      ctx.fillStyle = '#cccccc'; ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 1.1, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#999999'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#dddddd'; ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00aaff'; ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 6;
      [-0.4, 0, 0.4].forEach(pos => { ctx.beginPath(); ctx.arc(r * pos, -r * 0.3, r * 0.06, 0, Math.PI * 2); ctx.fill(); });
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#bbbbbb'; ctx.fillRect(-r * 0.12, -r * 0.1, r * 0.24, r * 0.5);
      ctx.fillStyle = '#aaaaaa'; ctx.beginPath(); ctx.ellipse(0, r * 0.6, r * 0.5, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#999999'; ctx.beginPath(); ctx.roundRect(-r * 1.3, r * 0.3, r * 0.7, r * 0.2, r * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(r * 0.6, r * 0.3, r * 0.7, r * 0.2, r * 0.1); ctx.fill();
      ctx.fillStyle = '#ff3300'; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(-r * 1.25, r * 0.4, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 1.25, r * 0.4, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'mechanical_ship') {
      // Nave meccanica - forma geometrica con ingranaggi
      ctx.fillStyle = '#666666'; ctx.fillRect(-r * 0.6, -r * 0.8, r * 1.2, r * 1.6);
      ctx.strokeStyle = '#888888'; ctx.lineWidth = 2; ctx.strokeRect(-r * 0.6, -r * 0.8, r * 1.2, r * 1.6);
      ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + state.time * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3); ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); ctx.stroke(); }
      ctx.fillStyle = '#ffaa00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'photon_ship') {
      ctx.fillStyle = '#ff3333'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(-r * 0.6, r * 0.2); ctx.lineTo(-r * 0.3, r * 0.8); ctx.lineTo(0, r * 0.5); ctx.lineTo(r * 0.3, r * 0.8); ctx.lineTo(r * 0.6, r * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff6666'; ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.2); ctx.lineTo(-r * 1.0, r * 0.4); ctx.lineTo(-r * 0.8, r * 0.6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.2); ctx.lineTo(r * 1.0, r * 0.4); ctx.lineTo(r * 0.8, r * 0.6); ctx.closePath(); ctx.fill();
    } else if (ship === 'ion_ship') {
      ctx.fillStyle = '#3333ff'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(-r * 0.7, r * 0.1); ctx.lineTo(-r * 0.4, r * 0.8); ctx.lineTo(0, r * 0.5); ctx.lineTo(r * 0.4, r * 0.8); ctx.lineTo(r * 0.7, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6666ff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#0000ff'; ctx.shadowColor = '#4444ff'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Effetto elettrico
      ctx.strokeStyle = '#88aaff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo((Math.random() - 0.5) * r, -r * 0.5); ctx.lineTo((Math.random() - 0.5) * r, r * 0.3); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (ship === 'drone_ship') {
      ctx.fillStyle = '#ffaa00'; ctx.fillRect(-r * 0.5, -r * 0.6, r * 1.0, r * 1.2);
      ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 1.5; ctx.strokeRect(-r * 0.5, -r * 0.6, r * 1.0, r * 1.2);
      ctx.fillStyle = '#ff8800';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.2 + i * r * 0.2, -r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'gravity_ship') {
      ctx.fillStyle = '#aa00ff'; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#8800cc'; ctx.beginPath(); ctx.moveTo(0, -r * 1.0); ctx.lineTo(-r * 0.4, r * 0.2); ctx.lineTo(0, r * 1.0); ctx.lineTo(r * 0.4, r * 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#aa00ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#cc44ff'; ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Anelli gravitazionali rotanti
      ctx.strokeStyle = '#aa00ff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, r * (0.5 + i * 0.25), r * 0.15, state.time * 2 + i, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (ship === 'void_ship') {
      ctx.fillStyle = '#660066'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(-r * 0.5, r * 0.1); ctx.lineTo(-r * 0.3, r * 0.8); ctx.lineTo(0, r * 0.5); ctx.lineTo(r * 0.3, r * 0.8); ctx.lineTo(r * 0.5, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#880088'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Effetto void
      ctx.strokeStyle = '#aa00aa'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + state.time; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (ship === 'cryo_ship') {
      ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(-r * 0.6, r * 0.1); ctx.lineTo(-r * 0.3, r * 0.8); ctx.lineTo(0, r * 0.5); ctx.lineTo(r * 0.3, r * 0.8); ctx.lineTo(r * 0.6, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#88ffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Cristalli di ghiaccio
      ctx.strokeStyle = '#aaffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const d = r * 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * d * 0.5, Math.sin(a) * d * 0.5); ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (ship === 'shield_ship') {
      ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#00cc66'; ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(-r * 0.5, r * 0.3); ctx.lineTo(0, r * 0.8); ctx.lineTo(r * 0.5, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'asteroid_ship') {
      ctx.fillStyle = '#886644'; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const rad = r * (0.8 + Math.sin(i * 3.7) * 0.2); if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#664422'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#664422'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.2, r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
    } else if (ship === 'kinetic_ship') {
      ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(-r * 0.4, r * 0.1); ctx.lineTo(-r * 0.6, r * 0.8); ctx.lineTo(0, r * 0.5); ctx.lineTo(r * 0.6, r * 0.8); ctx.lineTo(r * 0.4, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffaa44'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Scia cinetica
      ctx.fillStyle = '#ff6600'; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.8); ctx.lineTo(0, r * 1.5); ctx.lineTo(r * 0.2, r * 0.8); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    } else if (ship === 'meteor_ship') {
      ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffaa00'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Scia di fuoco
      ctx.fillStyle = '#ff4400'; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 5; i++) { const offset = Math.sin(state.time * 8 + i) * r * 0.2; ctx.beginPath(); ctx.moveTo(-r * 0.3 + i * r * 0.15, r * 0.6); ctx.lineTo(offset, r * 1.5 + i * r * 0.1); ctx.lineTo(r * 0.1 + i * r * 0.15, r * 0.6); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
    } else if (ship === 'boomerang_ship') {
      ctx.fillStyle = '#aaaaff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ccccff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (ship === 'quantum_ship') {
      ctx.fillStyle = '#44ffff'; ctx.beginPath(); ctx.moveTo(0, -r * 1.0); ctx.lineTo(-r * 0.8, 0); ctx.lineTo(0, r * 1.0); ctx.lineTo(r * 0.8, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#88ffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#44ffff'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Effetto quantum
      ctx.strokeStyle = '#44ffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
      for (let i = 0; i < 4; i++) { const scale = 0.5 + i * 0.2; ctx.beginPath(); ctx.moveTo(0, -r * scale); ctx.lineTo(-r * scale * 0.8, 0); ctx.lineTo(0, r * scale); ctx.lineTo(r * scale * 0.8, 0); ctx.closePath(); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (ship === 'blackhole_ship') {
      ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#888888'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      // Disco di accrescimento
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.3, state.time, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (ship === 'probe_x_ship') {
      ctx.fillStyle = '#ff2222'; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cc0000'; ctx.fillRect(-r * 0.25, r * 0.2, r * 0.5, r * 0.6);
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.4); ctx.lineTo(-r * 0.6, r * 0.6); ctx.lineTo(-r * 0.4, r * 0.7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.4); ctx.lineTo(r * 0.6, r * 0.6); ctx.lineTo(r * 0.4, r * 0.7); ctx.closePath(); ctx.fill();
    } else if (ship === 'probe_y_ship') {
      ctx.fillStyle = '#2222ff'; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0000cc'; ctx.fillRect(-r * 0.25, r * 0.2, r * 0.5, r * 0.6);
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#0000ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#4444ff'; ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.4); ctx.lineTo(-r * 0.6, r * 0.6); ctx.lineTo(-r * 0.4, r * 0.7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.4); ctx.lineTo(r * 0.6, r * 0.6); ctx.lineTo(r * 0.4, r * 0.7); ctx.closePath(); ctx.fill();
    } else {
      // Default ship - triangolo con colore specifico
      const shipColorMap: Record<string, string> = { 'starter': '#2a4a2a', 'fire_ship': '#cc3300', 'laser_ship': '#8a1a1a', 'electric_ship': '#5a5a5a', 'nuclear_ship': '#2a3a4a', 'shadow_ship': '#2a4a2a', 'mechanical_ship': '#888888', 'bio_ship': '#3a2a2a', 'photon_ship': '#ff3333', 'ion_ship': '#3333ff', 'drone_ship': '#ffaa00', 'gravity_ship': '#aa00ff', 'void_ship': '#660066', 'cryo_ship': '#00ffff', 'shield_ship': '#00ff88', 'asteroid_ship': '#886644', 'kinetic_ship': '#ff8800', 'meteor_ship': '#ff6600', 'boomerang_ship': '#aaaaff', 'quantum_ship': '#44ffff', 'blackhole_ship': '#000000', 'probe_x_ship': '#ff2222', 'probe_y_ship': '#2222ff', 'tie_fighter_ship': '#2a2a2a', 'viper_ship': '#5a5a5a', 'federation_ship': '#cccccc' };
      const shipColor = shipColorMap[player.currentShip] || '#00ccff';
      ctx.fillStyle = shipColor; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.8, r * 0.5); ctx.lineTo(-r * 0.4, r * 0.7); ctx.lineTo(0, r * 0.4); ctx.lineTo(r * 0.4, r * 0.7); ctx.lineTo(r * 0.8, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -3, 3.5, 0, Math.PI * 2); ctx.fill();
    } 
  }
  if (player.shieldHits > 0) { ctx.strokeStyle = '#00ff8844'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 40 + Math.sin(state.time * 3) * 3, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore(); ctx.restore(); ctx.restore();
  renderUI(ctx, state, width, height, lang);
}

const HUD_FONT = '"Orbitron", "Exo 2", system-ui, sans-serif';
const HUD_BODY_FONT = '"Exo 2", system-ui, sans-serif';

function hudRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hudPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, accent = 'rgba(98, 245, 207, 0.28)'): void {
  hudRoundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(8, 10, 26, 0.72)';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function hudBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number, from: string, to: string): void {
  const v = Math.max(0, Math.min(1, ratio));
  hudRoundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  if (v > 0) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, from); g.addColorStop(1, to);
    hudRoundRect(ctx, x, y, Math.max(h, w * v), h, h / 2);
    ctx.fillStyle = g;
    ctx.fill();
    // riflesso
    hudRoundRect(ctx, x + 2, y + 1, Math.max(0, w * v - 4), Math.max(1, h * 0.35), h / 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();
  }
}

function renderUI(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number, lang: string = 'it') {
  const { player } = state;
  const compact = width < 768 || height < 500;
  const s = compact ? 0.82 : 1.05;
  const m = 12 * s;
  const L = (it: string, en: string, es: string, fr: string, zh: string) => lang === 'it' ? it : lang === 'es' ? es : lang === 'fr' ? fr : lang === 'zh' ? zh : en;

  // Bordo rosso quando la vita e' bassa
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
  if (hpRatio < 0.3) {
    const pulse = 0.35 + Math.sin(state.time * 6) * 0.15;
    const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.75);
    g.addColorStop(0, 'rgba(255, 0, 60, 0)'); g.addColorStop(1, `rgba(255, 0, 60, ${pulse})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
  }

  ctx.save();
  ctx.textBaseline = 'middle';

  // --- Pannello giocatore (alto a sinistra): livello, vita, esperienza ---
  const panelW = Math.min(300 * s, width * 0.5);
  const panelH = 58 * s;
  hudPanel(ctx, m, m, panelW, panelH, 14 * s);
  const badgeR = 19 * s;
  const bx = m + 10 * s + badgeR, by = m + panelH / 2;
  const badgeGrad = ctx.createLinearGradient(bx - badgeR, by - badgeR, bx + badgeR, by + badgeR);
  badgeGrad.addColorStop(0, '#22d3ee'); badgeGrad.addColorStop(1, '#a855f7');
  ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI * 2); ctx.fillStyle = badgeGrad; ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, badgeR - 3 * s, 0, Math.PI * 2); ctx.fillStyle = '#0b0d22'; ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.font = `800 ${(player.level >= 100 ? 11 : 14) * s}px ${HUD_FONT}`;
  ctx.fillText(String(player.level), bx, by + 1 * s);
  ctx.font = `700 ${6.5 * s}px ${HUD_FONT}`; ctx.fillStyle = '#7dd3fc';
  ctx.fillText('LV', bx, by - 10 * s);

  const barX = bx + badgeR + 10 * s;
  const barW = m + panelW - 12 * s - barX;
  const hpY = m + 11 * s, hpH = 16 * s;
  const low = hpRatio < 0.3;
  hudBar(ctx, barX, hpY, barW, hpH, hpRatio, low ? '#ff2d55' : '#10b981', low ? '#ff8a00' : '#6ee7b7');
  ctx.font = `700 ${10.5 * s}px ${HUD_BODY_FONT}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.fillText(`${Math.max(0, Math.ceil(player.hp))} / ${Math.ceil(player.maxHp)}`, barX + barW / 2, hpY + hpH / 2 + 0.5);
  if (player.shieldHits > 0) {
    ctx.textAlign = 'right'; ctx.fillStyle = '#67e8f9'; ctx.font = `700 ${9.5 * s}px ${HUD_BODY_FONT}`;
    ctx.fillText(`◈ ${player.shieldHits}`, barX + barW - 4 * s, hpY + hpH / 2 + 0.5);
  }
  const xpY = hpY + hpH + 7 * s, xpH = 8 * s;
  hudBar(ctx, barX, xpY, barW, xpH, player.expToNext > 0 ? player.exp / player.expToNext : 0, '#22d3ee', '#a855f7');

  // --- Pannello tempo / ondata / uccisioni (alto al centro) ---
  const minutes = Math.floor(state.time / 60); const seconds = Math.floor(state.time % 60);
  const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const waveText = `${L('ONDATA', 'WAVE', 'OLEADA', 'VAGUE', '波次')} ${state.wave}`;
  const killText = `✦ ${state.kills}`;
  // a destra c'e' il pulsante pausa (HTML): il pannello sta prima
  const pauseSpace = 56 * s;
  const tW = (compact ? 104 : 132) * s, tH = 58 * s;
  let tX = width - m - pauseSpace - tW;
  if (tX < m + panelW + 8 * s) tX = Math.max(m + panelW + 8 * s, width - m - pauseSpace - tW);
  const fitsTop = tX + tW <= width - m - pauseSpace + 1;
  const tY = fitsTop ? m : m + panelH + 8 * s;
  if (!fitsTop) tX = m;
  hudPanel(ctx, tX, tY, tW, tH, 14 * s, 'rgba(168, 85, 247, 0.3)');
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${19 * s}px ${HUD_FONT}`;
  ctx.fillText(timeText, tX + tW / 2, tY + 20 * s);
  let infoSize = 9.5 * s;
  ctx.font = `700 ${infoSize}px ${HUD_FONT}`;
  const infoW = ctx.measureText(waveText).width + ctx.measureText(killText).width + 30 * s;
  if (infoW > tW) { infoSize *= tW / infoW; ctx.font = `700 ${infoSize}px ${HUD_FONT}`; }
  ctx.fillStyle = '#c4b5fd'; ctx.textAlign = 'left';
  ctx.fillText(waveText, tX + 12 * s, tY + 43 * s);
  ctx.fillStyle = '#fca5a5'; ctx.textAlign = 'right';
  ctx.fillText(killText, tX + tW - 12 * s, tY + 43 * s);

  // --- Barra del boss (in alto al centro, sotto i pannelli) ---
  if (state.bossActive) {
    const boss = state.enemies.find(e => e.isBoss);
    if (boss) {
      const bw = Math.min(520 * s, width - 2 * m);
      const bh = 12 * s;
      const bX = (width - bw) / 2;
      const bY = Math.max(m + panelH, fitsTop ? 0 : tY + tH) + 26 * s;
      const name = state.currentBossType ? (lang === 'it' ? getBossNameIT(state.currentBossType) : lang === 'es' ? getBossNameES(state.currentBossType) : lang === 'fr' ? getBossNameFR(state.currentBossType) : lang === 'zh' ? getBossNameZH(state.currentBossType) : getBossNameEN(state.currentBossType)) : 'BOSS';
      ctx.textAlign = 'center'; ctx.font = `800 ${11 * s}px ${HUD_FONT}`;
      ctx.fillStyle = Math.sin(state.time * 5) > 0 ? '#ff5577' : '#ffb4c2';
      ctx.fillText(`⚠ ${name} ⚠`, width / 2, bY - 9 * s);
      hudRoundRect(ctx, bX - 3, bY - 3, bw + 6, bh + 6, (bh + 6) / 2);
      ctx.fillStyle = 'rgba(8, 10, 26, 0.75)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255, 45, 85, 0.5)'; ctx.lineWidth = 1; ctx.stroke();
      hudBar(ctx, bX, bY, bw, bh, boss.maxHp > 0 ? boss.hp / boss.maxHp : 0, '#ff2d55', '#a855f7');
    }
  }

  // --- Freccia verso il boss quando e' fuori dallo schermo ---
  const bossOff = state.enemies.find(e => e.isBoss);
  if (bossOff) {
    const z = getWorldZoom(width);
    const sx = (bossOff.pos.x - state.camera.x) * z + width / 2, sy = (bossOff.pos.y - state.camera.y) * z + height / 2;
    const pad = 74 * s;
    if (sx < 0 || sx > width || sy < 0 || sy > height) {
      const a = Math.atan2(sy - height / 2, sx - width / 2);
      const hx = width / 2 - pad, hy = height / 2 - pad;
      const k = Math.min(hx / Math.max(1e-6, Math.abs(Math.cos(a))), hy / Math.max(1e-6, Math.abs(Math.sin(a))));
      const ax = width / 2 + Math.cos(a) * k, ay = height / 2 + Math.sin(a) * k;
      const pulse = 1 + Math.sin(state.time * 6) * 0.12;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(255, 45, 85, 0.9)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18 * s, 0); ctx.lineTo(-10 * s, -13 * s); ctx.lineTo(-4 * s, 0); ctx.lineTo(-10 * s, 13 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      const icon = state.currentBossType ? getBossIcon(state.currentBossType) : null;
      if (icon) { const isz = 30 * s; ctx.drawImage(icon, ax - Math.cos(a) * 30 * s - isz / 2, ay - Math.sin(a) * 30 * s - isz / 2, isz, isz); }
    }
  }

  // --- Abilita' (in basso al centro) ---
  const activeAbilities = player.abilities.filter(a => !a.type.startsWith('passive_'));
  const passiveAbilities = player.abilities.filter(a => a.type.startsWith('passive_'));
  const drawRow = (list: typeof player.abilities, size: number, y: number) => {
    const gap = 6 * s;
    const total = list.length * size + (list.length - 1) * gap;
    let x = (width - total) / 2;
    for (const ability of list) {
      hudRoundRect(ctx, x, y, size, size, size * 0.26);
      ctx.fillStyle = ability.evolved ? 'rgba(60, 40, 5, 0.85)' : 'rgba(8, 10, 26, 0.8)'; ctx.fill();
      ctx.strokeStyle = ability.evolved ? '#fbbf24' : ability.color; ctx.lineWidth = ability.evolved ? 3 : 2; ctx.stroke();
      const pad = size * 0.1;
      drawAbilityIcon(ctx, ability.type, ability.color, x + pad, y + pad, size - pad * 2);
      // livello
      const lvl = ability.evolved ? 'EVO' : String(ability.level);
      const lw = Math.max(13 * s, 7 * s + lvl.length * 6 * s), lh = 12 * s;
      hudRoundRect(ctx, x + size - lw + 3 * s, y + size - lh + 3 * s, lw, lh, lh / 2);
      ctx.fillStyle = ability.evolved ? '#fbbf24' : ability.level >= ability.maxLevel ? '#f59e0b' : '#111427'; ctx.fill();
      ctx.strokeStyle = ability.color; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = `800 ${8 * s}px ${HUD_FONT}`; ctx.textAlign = 'center';
      ctx.fillText(lvl, x + size - lw / 2 + 3 * s, y + size - lh / 2 + 3.5 * s);
      x += size + gap;
    }
  };
  const activeSize = 40 * s, passiveSize = 30 * s;
  const passiveY = height - m - passiveSize - 4 * s;
  const activeY = passiveAbilities.length > 0 ? passiveY - activeSize - 8 * s : height - m - activeSize - 4 * s;
  drawRow(activeAbilities, activeSize, activeY);
  if (passiveAbilities.length > 0) drawRow(passiveAbilities, passiveSize, passiveY);

  ctx.restore();

  if (state.currentBossType && state.bossNameTimer > 0) {
    const alpha = Math.min(1, state.bossNameTimer);
    const bossName = lang === 'it' ? getBossNameIT(state.currentBossType) : lang === 'en' ? getBossNameEN(state.currentBossType) : lang === 'es' ? getBossNameES(state.currentBossType) : lang === 'fr' ? getBossNameFR(state.currentBossType) : getBossNameZH(state.currentBossType);
    ctx.save(); ctx.globalAlpha = alpha;
    // su schermi stretti il titolo del boss viene rimpicciolito per non uscire dallo schermo
    const introScale = Math.min(1, width / 760);
    if (introScale < 1) { ctx.translate(width / 2, height / 2 - 50); ctx.scale(introScale, introScale); ctx.translate(-width / 2, -(height / 2 - 50)); }
    const bgWidth = width * 0.85 / introScale; const bgHeight = 140; const bgX = (width - bgWidth) / 2; const bgY = height / 2 - 110; const centerX = width / 2; const centerY = height / 2 - 50;
    if (state.currentBossType === 'boss_death_star') { const bgGrad = ctx.createLinearGradient(bgX, bgY, bgX + bgWidth, bgY); bgGrad.addColorStop(0, 'rgba(0, 0, 0, 0)'); bgGrad.addColorStop(0.2, 'rgba(20, 20, 40, 0.8)'); bgGrad.addColorStop(0.5, 'rgba(40, 0, 0, 0.9)'); bgGrad.addColorStop(0.8, 'rgba(20, 20, 40, 0.8)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10; for (let i = 0; i < 3; i++) { const y = bgY + 30 + i * 40; ctx.globalAlpha = alpha * (0.3 + i * 0.2); ctx.beginPath(); ctx.moveTo(bgX + 30, y); ctx.lineTo(bgX + bgWidth - 30, y); ctx.stroke(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 42px serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 25; ctx.fillText(bossName, centerX, centerY); ctx.shadowBlur = 40; ctx.globalAlpha = alpha * 0.4; ctx.fillText(bossName, centerX, centerY); ctx.globalAlpha = alpha * 0.7; ctx.fillStyle = '#ff4444'; ctx.font = 'bold 16px serif'; ctx.fillText('GALACTIC EMPIRE', centerX, centerY + 35); }
    else if (state.currentBossType === 'boss_xenomorph') { const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bgWidth / 2); bgGrad.addColorStop(0, 'rgba(0, 40, 0, 0.8)'); bgGrad.addColorStop(0.5, 'rgba(0, 20, 0, 0.6)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.fillStyle = '#00ff00'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 8; for (let i = 0; i < 12; i++) { const dx = bgX + Math.random() * bgWidth; const dy = bgY + Math.random() * bgHeight; ctx.globalAlpha = alpha * (0.2 + Math.random() * 0.3); ctx.beginPath(); ctx.arc(dx, dy, 2 + Math.random() * 4, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#00ff44'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 30; ctx.fillText(bossName, centerX, centerY); ctx.globalAlpha = alpha * 0.3; ctx.fillStyle = '#44ff88'; ctx.fillText(bossName, centerX + 2, centerY + 2); }
    else if (state.currentBossType === 'boss_cthulhu') { const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bgWidth / 2); bgGrad.addColorStop(0, 'rgba(0, 60, 40, 0.9)'); bgGrad.addColorStop(0.4, 'rgba(20, 40, 30, 0.7)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 5; ctx.globalAlpha = alpha * 0.4; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + state.time * 0.5; const r = 60 + Math.sin(state.time * 2 + i) * 20; ctx.beginPath(); ctx.arc(centerX + Math.cos(a) * r, centerY + Math.sin(a) * r, 5, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#88ffaa'; ctx.font = 'bold italic 40px serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 25; ctx.fillText(bossName, centerX, centerY); ctx.globalAlpha = alpha * 0.6; ctx.fillStyle = '#44aa66'; ctx.font = 'italic 14px serif'; ctx.fillText("Ph'nglui mglw'nafh", centerX, centerY + 35); }
    else if (state.currentBossType === 'boss_borg_cube') { const bgGrad = ctx.createLinearGradient(bgX, bgY, bgX, bgY + bgHeight); bgGrad.addColorStop(0, 'rgba(0, 0, 0, 0)'); bgGrad.addColorStop(0.3, 'rgba(0, 30, 0, 0.8)'); bgGrad.addColorStop(0.7, 'rgba(0, 30, 0, 0.8)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 3; ctx.globalAlpha = alpha * 0.3; for (let i = 0; i < 20; i++) { const x = bgX + (i / 20) * bgWidth; ctx.beginPath(); ctx.moveTo(x, bgY); ctx.lineTo(x, bgY + bgHeight); ctx.stroke(); } for (let i = 0; i < 8; i++) { const y = bgY + (i / 8) * bgHeight; ctx.beginPath(); ctx.moveTo(bgX, y); ctx.lineTo(bgX + bgWidth, y); ctx.stroke(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#00ff00'; ctx.font = 'bold 38px monospace'; ctx.textAlign = 'center'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 20; ctx.fillText(bossName, centerX, centerY); ctx.globalAlpha = alpha * 0.7; ctx.fillStyle = '#88ff88'; ctx.font = '14px monospace'; ctx.fillText('RESISTANCE IS FUTILE', centerX, centerY + 35); }
    else if (state.currentBossType === 'boss_space_kraken') { const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bgWidth / 2); bgGrad.addColorStop(0, 'rgba(60, 0, 80, 0.8)'); bgGrad.addColorStop(0.5, 'rgba(30, 0, 60, 0.6)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 3; ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 10; ctx.globalAlpha = alpha * 0.5; for (let i = 0; i < 6; i++) { ctx.beginPath(); const startX = bgX + (i / 6) * bgWidth; ctx.moveTo(startX, bgY + bgHeight); for (let j = 0; j < 5; j++) { const cx = startX + Math.sin(state.time * 2 + i + j) * 30; const cy = bgY + bgHeight - (j / 5) * bgHeight; ctx.lineTo(cx, cy); } ctx.stroke(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#ff44ff'; ctx.font = 'bold 44px serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 25; ctx.fillText(bossName, centerX, centerY); }
    else if (state.currentBossType === 'boss_galaxy_devourer') { const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bgWidth / 2); bgGrad.addColorStop(0, 'rgba(40, 0, 60, 0.9)'); bgGrad.addColorStop(0.3, 'rgba(20, 0, 40, 0.7)'); bgGrad.addColorStop(0.7, 'rgba(10, 0, 20, 0.5)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.strokeStyle = '#8844ff'; ctx.lineWidth = 2; ctx.shadowColor = '#8844ff'; ctx.shadowBlur = 8; ctx.globalAlpha = alpha * 0.4; for (let s = 0; s < 2; s++) { ctx.beginPath(); for (let i = 0; i < 50; i++) { const a = (i / 50) * Math.PI * 4 + s * Math.PI + state.time * 0.3; const r = (i / 50) * bgWidth * 0.4; const px = centerX + Math.cos(a) * r; const py = centerY + Math.sin(a) * r * 0.4; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#cc88ff'; ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 30; ctx.fillText(bossName, centerX, centerY); ctx.shadowBlur = 50; ctx.globalAlpha = alpha * 0.3; ctx.fillText(bossName, centerX, centerY); }
    else if (state.currentBossType === 'boss_void_emperor') { const bgGrad = ctx.createLinearGradient(bgX, bgY, bgX + bgWidth, bgY); bgGrad.addColorStop(0, 'rgba(0, 0, 0, 0)'); bgGrad.addColorStop(0.2, 'rgba(40, 0, 60, 0.8)'); bgGrad.addColorStop(0.5, 'rgba(80, 0, 100, 0.9)'); bgGrad.addColorStop(0.8, 'rgba(40, 0, 60, 0.8)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 15; ctx.globalAlpha = alpha * 0.6; for (let i = 0; i < 7; i++) { const px = bgX + 60 + (i / 6) * (bgWidth - 120); ctx.beginPath(); ctx.moveTo(px, bgY + 20); ctx.lineTo(px + 10, bgY + 5); ctx.lineTo(px + 20, bgY + 20); ctx.stroke(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#ff88ff'; ctx.font = 'bold 46px serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 30; ctx.fillText(bossName, centerX, centerY); ctx.globalAlpha = alpha * 0.6; ctx.fillStyle = '#cc44ff'; ctx.font = 'bold 14px serif'; ctx.fillText('⚜ RULER OF THE VOID ⚜', centerX, centerY + 35); }
    else if (state.currentBossType === 'boss_cosmic_horror') { const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bgWidth / 2); bgGrad.addColorStop(0, 'rgba(0, 20, 40, 0.9)'); bgGrad.addColorStop(0.5, 'rgba(0, 10, 30, 0.7)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.globalAlpha = alpha * 0.5; for (let i = 0; i < 10; i++) { const ex = bgX + 40 + Math.random() * (bgWidth - 80); const ey = bgY + 20 + Math.random() * (bgHeight - 40); const er = 4 + Math.random() * 8; ctx.fillStyle = '#ffff00'; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(ex, ey, er * 0.4, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = alpha; ctx.fillStyle = '#ffff44'; ctx.font = 'bold italic 42px serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 35; ctx.fillText(bossName, centerX, centerY); ctx.globalAlpha = alpha * 0.3; ctx.fillStyle = '#ff8800'; ctx.fillText(bossName, centerX + 3, centerY - 2); }
    else { const bgGrad = ctx.createLinearGradient(bgX, bgY, bgX, bgY + bgHeight); bgGrad.addColorStop(0, 'rgba(0, 0, 0, 0)'); bgGrad.addColorStop(0.3, 'rgba(255, 0, 68, 0.3)'); bgGrad.addColorStop(0.5, 'rgba(255, 0, 68, 0.5)'); bgGrad.addColorStop(0.7, 'rgba(255, 0, 68, 0.3)'); bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = bgGrad; ctx.fillRect(bgX, bgY, bgWidth, bgHeight); ctx.fillStyle = '#ff0044'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 30; ctx.fillText(bossName, centerX, centerY); }
    const bossIcon = getBossIcon(state.currentBossType);
    if (bossIcon) { const iconSize = width < 768 ? 64 : 104; ctx.shadowColor = '#000000'; ctx.shadowBlur = 12; ctx.drawImage(bossIcon, bgX + 12, bgY + (bgHeight - iconSize) / 2, iconSize, iconSize); ctx.drawImage(bossIcon, bgX + bgWidth - 12 - iconSize, bgY + (bgHeight - iconSize) / 2, iconSize, iconSize); ctx.shadowBlur = 0; }
    ctx.restore();
  }
}

function drawAbilityIcon(ctx: CanvasRenderingContext2D, type: string, color: string, x: number, y: number, size: number) {
  const abilitySprite = getAbilitySprite(type);
  if (abilitySprite) { ctx.drawImage(abilitySprite, x, y, size, size); return; }
  ctx.save(); ctx.translate(x, y); const scale = size / 40; ctx.scale(scale, scale); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (type) {
    case 'photon_gun': case 'ion_gun': ctx.fillRect(8, 18, 12, 6); ctx.fillRect(20, 19, 8, 4); ctx.beginPath(); ctx.moveTo(28, 21); ctx.lineTo(36, 21); ctx.stroke(); break;
    case 'drone_swarm': ctx.beginPath(); ctx.arc(12, 14, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(28, 14, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(20, 26, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'gravity_waves': for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(20, 20, i * 4, 0, Math.PI * 2); ctx.stroke(); } break;
    case 'void_lance': case 'cryo_lance': ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(32, 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(28, 17); ctx.lineTo(32, 20); ctx.lineTo(28, 23); ctx.stroke(); break;
    case 'energy_shield': ctx.beginPath(); ctx.arc(20, 20, 10, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(20, 20, 4, 0, Math.PI * 2); ctx.fill(); break;
    case 'asteroid_fragment': ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(28, 14); ctx.lineTo(30, 22); ctx.lineTo(26, 30); ctx.lineTo(18, 32); ctx.lineTo(12, 26); ctx.lineTo(10, 18); ctx.lineTo(14, 12); ctx.closePath(); ctx.fill(); break;
    case 'antimatter_bomb': ctx.beginPath(); ctx.arc(20, 22, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(18, 10, 4, 6); break;
    case 'laser_swords': ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(20, 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(30, 10); ctx.lineTo(20, 20); ctx.stroke(); ctx.beginPath(); ctx.arc(20, 20, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'homing_laser': ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(28, 20); ctx.stroke(); ctx.beginPath(); ctx.arc(30, 20, 4, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(30, 20, 1.5, 0, Math.PI * 2); ctx.fill(); break;
    case 'kinetic_darts': ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(28, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(24, 12); ctx.lineTo(28, 14); ctx.lineTo(24, 16); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(32, 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(28, 18); ctx.lineTo(32, 20); ctx.lineTo(28, 22); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, 26); ctx.lineTo(28, 26); ctx.stroke(); ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(28, 26); ctx.lineTo(24, 28); ctx.fill(); break;
    case 'meteor': ctx.beginPath(); ctx.arc(24, 24, 8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(16, 16); ctx.lineTo(10, 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(18, 14); ctx.lineTo(14, 8); ctx.stroke(); ctx.globalAlpha = 1; break;
    case 'neutronium_boomerang': ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(20, 20, 10, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke(); break;
    case 'orbiting_satellites': ctx.beginPath(); ctx.arc(20, 20, 4, 0, Math.PI * 2); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(8, 20, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(32, 20, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(20, 14, 2.5, 0, Math.PI * 2); ctx.fill(); break;
    case 'plasma_flamethrower': ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(12, 28); ctx.quadraticCurveTo(10, 20, 14, 16); ctx.quadraticCurveTo(16, 12, 20, 10); ctx.quadraticCurveTo(24, 12, 26, 16); ctx.quadraticCurveTo(30, 20, 28, 28); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); break;
    case 'gravity_field': ctx.beginPath(); ctx.arc(20, 20, 12, 0, Math.PI * 2); ctx.globalAlpha = 0.2; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.beginPath(); ctx.arc(20, 20, 8, 0, Math.PI * 2); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(20, 20, 4, 0, Math.PI * 2); ctx.fill(); break;
    case 'corrosive_nebula': ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(16, 20, 6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(24, 18, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(22, 24, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'quantum_bounce': ctx.beginPath(); ctx.arc(12, 28, 4, 0, Math.PI * 2); ctx.fill(); ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(12, 28); ctx.lineTo(20, 12); ctx.lineTo(28, 28); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(28, 28, 4, 0, Math.PI * 2); ctx.fill(); break;
    case 'ion_storm': ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(14, 18); ctx.lineTo(18, 18); ctx.lineTo(16, 28); ctx.stroke(); ctx.beginPath(); ctx.moveTo(24, 10); ctx.lineTo(22, 20); ctx.lineTo(26, 20); ctx.lineTo(24, 30); ctx.stroke(); break;
    case 'stellar_blackhole': ctx.beginPath(); ctx.arc(20, 20, 10, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(20, 20, 14, 0, Math.PI * 2); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1; break;
    case 'probe_x': case 'probe_y': ctx.beginPath(); ctx.arc(20, 16, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(18, 22, 4, 8); ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(20, 36); ctx.stroke(); break;
    case 'passive_fusion_core': ctx.beginPath(); ctx.arc(20, 20, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(20, 20, 12, 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(20, 20, 12, 4, Math.PI / 3, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(20, 20, 12, 4, (Math.PI * 2) / 3, 0, Math.PI * 2); ctx.stroke(); break;
    case 'passive_plating': ctx.beginPath(); ctx.moveTo(20, 8); ctx.lineTo(30, 14); ctx.lineTo(30, 24); ctx.quadraticCurveTo(30, 32, 20, 34); ctx.quadraticCurveTo(10, 32, 10, 24); ctx.lineTo(10, 14); ctx.closePath(); ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); break;
    case 'passive_neutronium_heart': case 'passive_regen_core': case 'passive_pulsar_heart': ctx.beginPath(); ctx.moveTo(20, 30); ctx.quadraticCurveTo(10, 22, 10, 16); ctx.quadraticCurveTo(10, 10, 15, 10); ctx.quadraticCurveTo(18, 10, 20, 13); ctx.quadraticCurveTo(22, 10, 25, 10); ctx.quadraticCurveTo(30, 10, 30, 16); ctx.quadraticCurveTo(30, 22, 20, 30); ctx.closePath(); ctx.fill(); break;
    case 'passive_void_tome': ctx.globalAlpha = 0.7; ctx.fillRect(10, 8, 20, 24); ctx.globalAlpha = 1; ctx.strokeRect(10, 8, 20, 24); ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(15, 14); ctx.lineTo(25, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(15, 18); ctx.lineTo(25, 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(15, 22); ctx.lineTo(22, 22); ctx.stroke(); break;
    case 'passive_stellar_candelabrum': ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 32); ctx.lineTo(20, 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(12, 16); ctx.lineTo(28, 16); ctx.stroke(); ctx.beginPath(); ctx.arc(20, 10, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(12, 14, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(28, 14, 2, 0, Math.PI * 2); ctx.fill(); break;
    case 'passive_kinetic_accelerator': ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(28, 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(24, 16); ctx.lineTo(30, 20); ctx.lineTo(24, 24); ctx.stroke(); ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(8, 18); ctx.lineTo(14, 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8, 22); ctx.lineTo(14, 22); ctx.stroke(); ctx.globalAlpha = 1; break;
    case 'passive_quantum_binder': ctx.beginPath(); ctx.arc(15, 20, 8, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(25, 20, 8, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(20, 20, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'passive_molecular_replicator': ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(14, 16, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(14, 24, 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(26, 16, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(26, 24, 4, 0, Math.PI * 2); ctx.fill(); ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(18, 20); ctx.lineTo(22, 20); ctx.stroke(); ctx.setLineDash([]); break;
    case 'passive_ionic_thrusters': ctx.beginPath(); ctx.moveTo(20, 8); ctx.lineTo(26, 16); ctx.lineTo(26, 28); ctx.lineTo(14, 28); ctx.lineTo(14, 16); ctx.closePath(); ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.beginPath(); ctx.moveTo(16, 28); ctx.lineTo(14, 34); ctx.lineTo(20, 30); ctx.lineTo(26, 34); ctx.lineTo(24, 28); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; break;
    case 'passive_gravity_field': ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(12, 24); ctx.quadraticCurveTo(12, 32, 20, 32); ctx.quadraticCurveTo(28, 32, 28, 24); ctx.lineTo(28, 12); ctx.stroke(); ctx.fillRect(10, 10, 4, 6); ctx.fillRect(26, 10, 4, 6); break;
    case 'passive_stellar_fortune': ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(20, 14, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(20, 26, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(14, 20, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(26, 20, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(20, 20, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'passive_galactic_crown': ctx.beginPath(); ctx.moveTo(10, 26); ctx.lineTo(12, 16); ctx.lineTo(16, 22); ctx.lineTo(20, 14); ctx.lineTo(24, 22); ctx.lineTo(28, 16); ctx.lineTo(30, 26); ctx.closePath(); ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(20, 14, 2, 0, Math.PI * 2); ctx.fill(); break;
    case 'passive_cosmic_dust': ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(28, 14, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(20, 20, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(14, 28, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(26, 26, 2, 0, Math.PI * 2); ctx.fill(); break;
    case 'passive_quantum_reactor': ctx.strokeRect(12, 12, 16, 16); ctx.beginPath(); ctx.arc(20, 20, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(20, 8); ctx.lineTo(20, 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(20, 28); ctx.lineTo(20, 32); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(12, 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(28, 20); ctx.lineTo(32, 20); ctx.stroke(); break;
    case 'passive_galactic_coin': ctx.beginPath(); ctx.arc(20, 20, 12, 0, Math.PI * 2); ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.beginPath(); ctx.arc(20, 20, 9, 0, Math.PI * 2); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1; break;
    default: ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(23, 17); ctx.lineTo(30, 17); ctx.lineTo(25, 22); ctx.lineTo(27, 30); ctx.lineTo(20, 25); ctx.lineTo(13, 30); ctx.lineTo(15, 22); ctx.lineTo(10, 17); ctx.lineTo(17, 17); ctx.closePath(); ctx.fill(); break;
  }
  ctx.restore();
}

function getBossNameIT(key: string): string { const names: Record<string, string> = { 'boss_death_star': 'MORTE NERA', 'boss_xenomorph': 'REGINA XENOMORFA', 'boss_cthulhu': 'CTHULHU COSMICO', 'boss_borg_cube': 'CUBO BORG', 'boss_space_kraken': 'KRAKEN SPAZIALE', 'boss_galaxy_devourer': 'DIVORATORE DI GALASSIE', 'boss_void_emperor': 'IMPERATORE DEL VUOTO', 'boss_cosmic_horror': 'ORRORE COSMICO' }; return names[key] || 'BOSS'; }
function getBossNameEN(key: string): string { const names: Record<string, string> = { 'boss_death_star': 'DEATH STAR', 'boss_xenomorph': 'XENOMORPH QUEEN', 'boss_cthulhu': 'COSMIC CTHULHU', 'boss_borg_cube': 'BORG CUBE', 'boss_space_kraken': 'SPACE KRAKEN', 'boss_galaxy_devourer': 'GALAXY DEVOURER', 'boss_void_emperor': 'VOID EMPEROR', 'boss_cosmic_horror': 'COSMIC HORROR' }; return names[key] || 'BOSS'; }
function getBossNameES(key: string): string { const names: Record<string, string> = { 'boss_death_star': 'ESTRELLA DE LA MUERTE', 'boss_xenomorph': 'REINA XENOMORFA', 'boss_cthulhu': 'CTHULHU CÓSMICO', 'boss_borg_cube': 'CUBO BORG', 'boss_space_kraken': 'KRAKEN ESPACIAL', 'boss_galaxy_devourer': 'DEVORADOR DE GALAXIAS', 'boss_void_emperor': 'EMPERADOR DEL VACÍO', 'boss_cosmic_horror': 'HORROR CÓSMICO' }; return names[key] || 'JEFE'; }
function getBossNameFR(key: string): string { const names: Record<string, string> = { 'boss_death_star': 'ÉTOILE DE LA MORT', 'boss_xenomorph': 'REINE XÉNOMORPHE', 'boss_cthulhu': 'CTHULHU COSMIQUE', 'boss_borg_cube': 'CUBE BORG', 'boss_space_kraken': 'KRAKEN SPATIAL', 'boss_galaxy_devourer': 'DÉVOREUR DE GALAXIES', 'boss_void_emperor': 'EMPEREUR DU VIDE', 'boss_cosmic_horror': 'HORREUR COSMIQUE' }; return names[key] || 'BOSS'; }
function getBossNameZH(key: string): string { const names: Record<string, string> = { 'boss_death_star': '死星', 'boss_xenomorph': '异形女王', 'boss_cthulhu': '宇宙克苏鲁', 'boss_borg_cube': '博格立方体', 'boss_space_kraken': '太空克拉肯', 'boss_galaxy_devourer': '银河吞噬者', 'boss_void_emperor': '虚空皇帝', 'boss_cosmic_horror': '宇宙恐怖' }; return names[key] || 'BOSS'; }

// Aiuti usati dal modulo dei boss
export { genId as newId, spawnParticles, shieldPulse, spawnDamageNumber };
