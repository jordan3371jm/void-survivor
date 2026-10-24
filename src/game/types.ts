export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
}

export interface Player extends Entity {
  exp: number;
  level: number;
  expToNext: number;
  speed: number;
  magnetRange: number;
  abilities: Ability[];
  fusions: Fusion[];
  invincibleTimer: number;
  armor: number;
  shootFlash: number;
  shieldHits: number;
  points: number;
  currentShip: ShipType;
  abilityAttackBonuses: Record<string, number>;
  weaponPower: number;
  maxHealthBonus: number;
  regenPerSecond: number;
  cooldownReduction: number;
  areaBonus: number;
  projectileSpeedBonus: number;
  durationBonus: number;
  projectileCountBonus: number;
  moveSpeedBonus: number;
  pickupRangeBonus: number;
  luckBonus: number;
  rarityBonus: number;
  expBonus: number;
  coinBonus: number;
  hasRevive: boolean;
  /** true dopo che la resurrezione di 'Polvere cosmica' è stata usata (una sola volta per partita) */
  dustReviveUsed?: boolean;
  curseLevel: number;
  critChance: number;
  critDamage: number;
  // Valori di base (nave + potenziamenti dello shop) catturati al primo calcolo delle passive.
  // Servono a rendere applyPassiveAbilities() ripetibile senza accumuli ne' perdite.
  base?: { maxHp: number; speed: number; magnetRange: number; armor: number; regen: number; luck: number; exp: number };
}

export interface Enemy extends Entity {
  type: EnemyType;
  speed: number;
  expValue: number;
  color: string;
  pattern: 'chase' | 'zigzag' | 'kamikaze' | 'shoot' | 'parasite' | 'swarm' | 'boss';
  shootTimer?: number;
  shootInterval?: number;
  zigzagTimer?: number;
  phaseTimer?: number;
  isBoss?: boolean;
  bossPhase?: number;
  freezeTimer?: number;
  slowTimer?: number;
  baseSpeed?: number;
  attackState?: 'idle' | 'charging' | 'firing' | 'cooldown';
  attackTimer?: number;
  currentAttack?: string;
  attackData?: any;
}

export interface Projectile extends Entity {
  fromPlayer: boolean;
  lifetime: number;
  maxLifetime: number;
  type: ProjectileType;
  piercing?: number;
  /** nemici già colpiti da questo proiettile perforante (evita di colpire lo stesso nemico a ogni frame) */
  hitIds?: string[];
  homing?: boolean;
  aoeRadius?: number;
  duration?: number;
  maxBounces?: number;
  bouncesLeft?: number;
  lastHitEnemy?: string;
  color: string;
  trail?: Vector2[];
}

export interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'explosion' | 'spark' | 'trail' | 'exp' | 'star';
}

export interface ExpOrb {
  pos: Vector2;
  value: number;
  radius: number;
  magnetized: boolean;
}

export interface Drone {
  id: string;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  damage: number;
  lifetime: number;
  maxLifetime: number;
  color: string;
  angle: number;
}

export interface LaserSword {
  id: string;
  angle: number;
  distance: number;
  length: number;
  damage: number;
  color: string;
}

export interface OrbitingProbe {
  id: string;
  type: 'probe_x' | 'probe_y';
  pos: Vector2;
  angle: number;
  distance: number;
  damage: number;
  color: string;
  shootTimer: number;
  shootInterval: number;
  bombardmentZone: {
    angle: number;
    radius: number;
    active: boolean;
    duration: number;
    maxDuration: number;
    groupCount: number;
    currentGroup: number;
    groupTimer: number;
    groupInterval: number;
  };
  moveSpeed: number;
  rotationSpeed: number;
}

export interface GravityWave {
  id: string;
  pos: Vector2;
  radius: number;
  maxRadius: number;
  damage: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  expansionSpeed: number;
  damagedEnemies: Set<string>;
}

export interface NebulaPool {
  id: string;
  pos: Vector2;
  radius: number;
  damage: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  source?: string; // abilita' che l'ha creata (per le statistiche dei danni)
  hostile?: boolean; // creata da un boss: danneggia il giocatore, non i nemici
}

export interface StormHitbox {
  id: string;
  pos: Vector2;
  radius: number;
  damage: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  shape: 'circle' | 'star' | 'square';
  rotation: number;
}

export interface DamageNumber {
  id: string;
  pos: Vector2;
  value: number;
  lifetime: number;
  maxLifetime: number;
  color: string;
  isCrit: boolean;
}

export type AbilityType = 
  | 'photon_gun' | 'ion_gun' | 'drone_swarm' | 'gravity_waves' | 'void_lance'
  | 'cryo_lance' | 'energy_shield' | 'asteroid_fragment' | 'antimatter_bomb'
  | 'laser_swords' | 'homing_laser' | 'kinetic_darts' | 'meteor'
  | 'neutronium_boomerang' | 'orbiting_satellites' | 'plasma_flamethrower'
  | 'gravity_field' | 'corrosive_nebula' | 'quantum_bounce' | 'ion_storm'
  | 'stellar_blackhole' | 'probe_x' | 'probe_y'
  | 'passive_fusion_core' | 'passive_plating' | 'passive_neutronium_heart'
  | 'passive_regen_core' | 'passive_void_tome' | 'passive_stellar_candelabrum'
  | 'passive_kinetic_accelerator' | 'passive_quantum_binder' | 'passive_molecular_replicator'
  | 'passive_ionic_thrusters' | 'passive_gravity_field' | 'passive_stellar_fortune'
  | 'passive_galactic_crown' | 'passive_cosmic_dust' | 'passive_quantum_reactor'
  | 'passive_pulsar_heart' | 'passive_galactic_coin';

export interface Ability {
  type: AbilityType;
  level: number;
  maxLevel: number;
  timer: number;
  cooldown: number;
  damage: number;
  area: number;
  projectiles: number;
  name: string;
  description: string;
  color: string;
  rarity: number;
}

export interface Fusion {
  type: string;
  name: string;
  description: string;
  components: [AbilityType, AbilityType];
  color: string;
  active: boolean;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  layer: number;
}

export interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  opacity: number;
}

export type EnemyType = 
  | 'asteroid_small' | 'asteroid_medium' | 'asteroid_large'
  | 'drone_sentinel' | 'star_raider' | 'void_crawler' | 'nebula_wraith'
  | 'cosmic_leech' | 'star_jelly' | 'void_worm' | 'star_beetle'
  | 'cosmic_moth' | 'void_stinger' | 'star_scorpion' | 'cosmic_crab'
  | 'void_spider' | 'star_fish' | 'cosmic_squid' | 'star_destroyer'
  | 'imperial_probe' | 'kamikaze' | 'parasite' | 'guardian' | 'swarm'
  | 'boss_death_star' | 'boss_xenomorph' | 'boss_cthulhu' | 'boss_borg_cube'
  | 'boss_space_kraken' | 'boss_galaxy_devourer' | 'boss_void_emperor' | 'boss_cosmic_horror';

export type ShipType = 
  | 'starter' | 'fire_ship' | 'laser_ship' | 'electric_ship'
  | 'nuclear_ship' | 'shadow_ship' | 'mechanical_ship' | 'bio_ship'
  | 'photon_ship' | 'ion_ship' | 'drone_ship' | 'gravity_ship'
  | 'void_ship' | 'cryo_ship' | 'shield_ship' | 'asteroid_ship'
  | 'kinetic_ship' | 'meteor_ship' | 'boomerang_ship' | 'quantum_ship'
  | 'blackhole_ship' | 'probe_x_ship' | 'probe_y_ship'
  | 'tie_fighter_ship' | 'viper_ship' | 'federation_ship';

export interface Ship {
  type: ShipType;
  name: string;
  description: string;
  price: number;
  color: string;
  activeAbility: string;
  owned: boolean;
}

export type ProjectileType = 
  | 'photon_shot' | 'ion_shot' | 'gravity_wave' | 'void_lance' | 'cryo_beam'
  | 'asteroid_frag' | 'antimatter_explosion' | 'antimatter_bomb_proj' | 'enemy_bullet' | 'homing_laser_beam'
  | 'kinetic_dart' | 'meteor_proj' | 'boomerang_proj' | 'plasma_ball'
  | 'nebula_pool' | 'quantum_proj' | 'quantum_bounce_proj' | 'lightning_bolt' | 'blackhole_wave'
  | 'probe_laser_red' | 'probe_laser_blue' | 'bullet'
  | 'boss_laser_big' | 'boss_laser_small' | 'acid_blob' | 'tractor_beam' | 'boss_bolt';

export interface LevelUpChoice {
  type: 'ability' | 'upgrade' | 'stat';
  abilityType?: AbilityType;
  stat?: 'speed' | 'maxHp' | 'magnet' | 'armor' | 'damage';
  name: string;
  description: string;
  icon: string;
  color: string;
}

export type GameMode = 'normal' | 'endless' | 'boss_rush';

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  expOrbs: ExpOrb[];
  drones: Drone[];
  laserSwords: LaserSword[];
  orbitingProbes: OrbitingProbe[];
  gravityWaves: GravityWave[];
  nebulaPools: NebulaPool[];
  stormHitboxes: StormHitbox[];
  damageNumbers: DamageNumber[];
  stars: Star[];
  nebulae: Nebula[];
  camera: Vector2;
  time: number;
  wave: number;
  waveTimer: number;
  gameOver: boolean;
  paused: boolean;
  levelUpPending: boolean;
  levelUpChoices: LevelUpChoice[];
  score: number;
  kills: number;
  bossActive: boolean;
  currentBossType: EnemyType | null;
  bossNameTimer: number;
  screenShake: number;
  keys: Set<string>;
  coinsEarned: number;
  diamondsEarned: number;
  reviveUsed: boolean;
  revivePending: boolean;
  abilityDamageStats: Record<string, number>;
  speedMultiplier: number;
  speedBoostTimer: number;
  gameMode: GameMode;
  bossRushIndex: number; // Indice del boss corrente in modalità Boss Rush
  bossesDefeated?: number; // boss sconfitti in questa partita
  bossSpawnCount?: number; // boss gia' comparsi (modalita' normale/endless)
  nextBossWave?: number; // ondata in cui arriva il prossimo boss
  victory?: boolean; // true se la partita e' finita con una vittoria
  bossHazards?: unknown[]; // zone di pericolo degli attacchi dei boss (vedi bosses.ts)
  touchDir?: Vector2 | null; // direzione analogica da touch/joystick (lunghezza 0..1)
  
  // Statistiche per partita singola
  currentPlayTime: number;
  currentLevel: number;
  currentWave: number;
  currentScore: number;
  currentKills: number;
}