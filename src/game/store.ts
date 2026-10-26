import { storageGetItem, storageSetItem } from './storage';
import type { Language } from './i18n';

export interface PlayerStats {
  maxHp: number;
  attack: number;
  baseFireRate: number;
  shipSpeed: number;
  defense: number;
  critChance: number;
  critDamage: number;
  regeneration: number;
  luck: number;
  expBonus: number;
}

export interface UpgradeLevel {
  level: number;
  maxLevel: number;
}

export interface CompletedAchievement {
  id: string;
  completedAt: number;
  claimed: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: number;
  highScores: HighScore[];
  
  // Statistiche per partita singola
  currentKills?: number;
  currentPlayTime?: number;
  currentLevel?: number;
  currentScore?: number;
  currentWave?: number;
  
  // Statistiche totali
  totalKills?: number;
  totalBossesDefeated?: number;
  totalPlayTime?: number;
  totalGamesPlayed?: number;
  maxScore?: number;
  maxLevel?: number;
  maxWave?: number;
  
  // Altri dati
  abilityDamageStats?: Record<string, number>;
  completedAchievements?: CompletedAchievement[];
}

export interface HighScore {
  score: number;
  kills: number;
  time: number;
  level: number;
  date: number;
}

export interface GlobalHighScore extends HighScore {
  id: string;
  name: string;
  avatar: string;
}

export interface GameStore {
  coins: number;
  diamonds: number;
  points: number;
  stats: PlayerStats;
  upgrades: { maxHp: UpgradeLevel };
  abilityAttackLevels: Record<string, number>;
  settings: {
    sfxVolume: number;
    musicVolume: number;
    effectsQuality: 'low' | 'medium' | 'high';
    language: Language;
    customMusicUrl: string;
    showDamageNumbers: boolean;
    useJoystick: boolean;
    speedMultiplier: number;
    speedBoostTimer: number;
    adsWatchedForSpeed: number;
    speedBoostPaused: boolean;
    tutorialDone?: boolean;
    languageChosen?: boolean;
  };
  ships: {
    starter: boolean;
    fire_ship: boolean;
    laser_ship: boolean;
    electric_ship: boolean;
    nuclear_ship: boolean;
    shadow_ship: boolean;
    mechanical_ship: boolean;
    bio_ship: boolean;
    photon_ship: boolean;
    ion_ship: boolean;
    drone_ship: boolean;
    gravity_ship: boolean;
    void_ship: boolean;
    cryo_ship: boolean;
    shield_ship: boolean;
    asteroid_ship: boolean;
    kinetic_ship: boolean;
    meteor_ship: boolean;
    boomerang_ship: boolean;
    quantum_ship: boolean;
    blackhole_ship: boolean;
    probe_x_ship: boolean;
    probe_y_ship: boolean;
    tie_fighter_ship: boolean;
    viper_ship: boolean;
    federation_ship: boolean;
  };
  currentShip: 'starter' | 'fire_ship' | 'laser_ship' | 'electric_ship' | 'nuclear_ship' | 'shadow_ship' | 'mechanical_ship' | 'bio_ship' | 'photon_ship' | 'ion_ship' | 'drone_ship' | 'gravity_ship' | 'void_ship' | 'cryo_ship' | 'shield_ship' | 'asteroid_ship' | 'kinetic_ship' | 'meteor_ship' | 'boomerang_ship' | 'quantum_ship' | 'blackhole_ship' | 'probe_x_ship' | 'probe_y_ship' | 'tie_fighter_ship' | 'viper_ship' | 'federation_ship';
  userProfile: UserProfile | null;
  globalLeaderboard: GlobalHighScore[];
}

const DEFAULT_STORE: GameStore = {
  coins: 100,
  diamonds: 5,
  points: 0,
  stats: { maxHp: 100, attack: 10, baseFireRate: 1, shipSpeed: 200, defense: 0, critChance: 0, critDamage: 150, regeneration: 0, luck: 0, expBonus: 0 },
  upgrades: { maxHp: { level: 0, maxLevel: 200 } },
  abilityAttackLevels: {},
  ships: { 
    starter: true, 
    fire_ship: false, 
    laser_ship: false, 
    electric_ship: false, 
    nuclear_ship: false, 
    shadow_ship: false, 
    mechanical_ship: false, 
    bio_ship: false,
    photon_ship: false,
    ion_ship: false,
    drone_ship: false,
    gravity_ship: false,
    void_ship: false,
    cryo_ship: false,
    shield_ship: false,
    asteroid_ship: false,
    kinetic_ship: false,
    meteor_ship: false,
    boomerang_ship: false,
    quantum_ship: false,
    blackhole_ship: false,
    probe_x_ship: false,
    probe_y_ship: false,
    tie_fighter_ship: false,
    viper_ship: false,
    federation_ship: false
  },
  currentShip: 'starter',
  settings: { sfxVolume: 0.7, musicVolume: 0.5, effectsQuality: 'high', language: 'en', customMusicUrl: '', showDamageNumbers: true, useJoystick: false, speedMultiplier: 1.0, speedBoostTimer: 0, adsWatchedForSpeed: 0, speedBoostPaused: false },
  userProfile: null,
  globalLeaderboard: []
};

const STORE_KEY = 'voidSurvivorsStore';

export function loadStore(): GameStore {
  try {
    const saved = storageGetItem(STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_STORE, ...parsed, stats: { ...DEFAULT_STORE.stats, ...(parsed.stats || {}) }, settings: { ...DEFAULT_STORE.settings, ...(parsed.settings || {}) }, ships: { ...DEFAULT_STORE.ships, ...(parsed.ships || {}) }, upgrades: { ...DEFAULT_STORE.upgrades, ...(parsed.upgrades || {}) } };
    }
  } catch (e) { console.error('Failed to load store:', e); }
  return { ...DEFAULT_STORE };
}

export function saveStore(store: GameStore): void {
  try { storageSetItem(STORE_KEY, JSON.stringify(store)); }
  catch (e) { console.error('Failed to save store:', e); }
}

export function getUpgradeCost(level: number): number {
  return Math.floor(150 * Math.pow(1.5, level));
}

export function applyUpgrade(store: GameStore, stat: keyof typeof store.upgrades): GameStore | null {
  const upgrade = store.upgrades[stat];
  if (upgrade.level >= upgrade.maxLevel) return null;
  const cost = getUpgradeCost(upgrade.level);
  if (store.coins < cost) return null;
  const newStore = { ...store };
  newStore.coins -= cost;
  newStore.upgrades = { ...store.upgrades };
  newStore.upgrades[stat] = { ...upgrade, level: upgrade.level + 1 };
  newStore.stats = { ...store.stats };
  if (stat === 'maxHp') newStore.stats.maxHp = 100 + newStore.upgrades.maxHp.level * 5;
  saveStore(newStore);
  return newStore;
}

export function upgradeAbilityAttack(store: GameStore, abilityType: string): GameStore | null {
  const cost = 100;
  if (store.coins < cost) return null;
  const newStore = { ...store };
  newStore.coins -= cost;
  newStore.abilityAttackLevels = { ...store.abilityAttackLevels };
  const currentLevel = newStore.abilityAttackLevels[abilityType] || 0;
  newStore.abilityAttackLevels[abilityType] = currentLevel + 1;
  saveStore(newStore);
  return newStore;
}

export function getAbilityAttackBonus(store: GameStore, abilityType: string): number {
  return store.abilityAttackLevels[abilityType] || 0;
}

export type CoinUpgradeType = 'defense' | 'critChance' | 'critDamage' | 'regeneration' | 'shipSpeed';
export type DiamondUpgradeType = 'luck' | 'expBonus';
export type UpgradeType = CoinUpgradeType | DiamondUpgradeType;

export function getCoinUpgradeCost(stat: CoinUpgradeType, currentLevel: number): number {
  const baseCosts: Record<CoinUpgradeType, number> = { defense: 250, critChance: 200, critDamage: 200, regeneration: 300, shipSpeed: 180 };
  return Math.floor(baseCosts[stat] * Math.pow(1.4, currentLevel));
}

export function getDiamondUpgradeCost(stat: DiamondUpgradeType, currentLevel: number): number {
  const baseCosts: Record<DiamondUpgradeType, number> = { luck: 20, expBonus: 15 };
  const baseCost = baseCosts[stat];
  
  let additionalCost = 0;
  
  if (currentLevel < 10) {
    additionalCost = currentLevel * 5;
  } else if (currentLevel < 20) {
    additionalCost = 50 + (currentLevel - 10) * 10;
  } else if (currentLevel < 30) {
    additionalCost = 50 + 100 + (currentLevel - 20) * 20;
  } else if (currentLevel < 40) {
    additionalCost = 50 + 100 + 200 + (currentLevel - 30) * 30;
  } else if (currentLevel < 50) {
    additionalCost = 50 + 100 + 200 + 300 + (currentLevel - 40) * 40;
  } else {
    const decade = Math.floor(currentLevel / 10);
    const remainder = currentLevel % 10;
    let total = 0;
    for (let i = 1; i <= decade; i++) {
      total += i * 10 * (i === 1 ? 0.5 : 1);
    }
    total += remainder * decade * 10;
    additionalCost = total;
  }
  
  return baseCost + additionalCost;
}

export function getStatMaxLevel(stat: UpgradeType): number {
  const maxLevels: Record<UpgradeType, number> = { defense: 100, critChance: 1000, critDamage: 1000, regeneration: 1000, luck: 100, expBonus: 100, shipSpeed: 1000 };
  return maxLevels[stat];
}

export function getStatLevel(stat: UpgradeType, value: number): number {
  if (value === undefined || value === null || isNaN(value)) return 0;
  const baseValues: Record<UpgradeType, number> = { defense: 0, critChance: 0, critDamage: 150, regeneration: 0, luck: 0, expBonus: 0, shipSpeed: 200 };
  const increments: Record<UpgradeType, number> = { defense: 0.1, critChance: 0.1, critDamage: 1, regeneration: 0.01, luck: 1, expBonus: 1, shipSpeed: 1 };
  // tolleranza: 0.1 sommato 8 volte vale 0.7999999… e il livello risultava 7 invece di 8
  return Math.max(0, Math.floor((value - baseValues[stat]) / increments[stat] + 1e-6));
}

export function applyCoinUpgrade(store: GameStore, stat: CoinUpgradeType): GameStore | null {
  const currentValue = store.stats[stat] ?? 0;
  const currentLevel = getStatLevel(stat, currentValue);
  const maxLevel = getStatMaxLevel(stat);
  if (currentLevel >= maxLevel) return null;
  const cost = getCoinUpgradeCost(stat, currentLevel);
  if (store.coins < cost) return null;
  const newStore = { ...store };
  newStore.coins -= cost;
  newStore.stats = { ...store.stats };
  const increments: Record<UpgradeType, number> = { defense: 0.1, critChance: 0.1, critDamage: 1, regeneration: 0.01, luck: 1, expBonus: 1, shipSpeed: 1 };
  newStore.stats[stat] = Math.round((currentValue + increments[stat]) * 1000) / 1000;
  saveStore(newStore);
  return newStore;
}

export function applyDiamondUpgrade(store: GameStore, stat: DiamondUpgradeType): GameStore | null {
  const currentValue = store.stats[stat] ?? 0;
  const currentLevel = getStatLevel(stat, currentValue);
  const maxLevel = getStatMaxLevel(stat);
  if (currentLevel >= maxLevel) return null;
  const cost = getDiamondUpgradeCost(stat, currentLevel);
  if (store.diamonds < cost) return null;
  const newStore = { ...store };
  newStore.diamonds -= cost;
  newStore.stats = { ...store.stats };
  const increments: Record<UpgradeType, number> = { defense: 0.1, critChance: 0.1, critDamage: 1, regeneration: 0.01, luck: 1, expBonus: 1, shipSpeed: 1 };
  newStore.stats[stat] = Math.round((currentValue + increments[stat]) * 1000) / 1000;
  saveStore(newStore);
  return newStore;
}

export function createUserProfile(email: string, name: string, avatar: string): UserProfile {
  return { id: Date.now().toString(36) + Math.random().toString(36).substr(2), email, name, avatar, createdAt: Date.now(), highScores: [] };
}

export function saveUserProfile(store: GameStore, profile: UserProfile): GameStore {
  const newStore = { ...store, userProfile: profile };
  saveStore(newStore);
  return newStore;
}

export function addHighScore(store: GameStore, score: number, kills: number, time: number, level: number): GameStore {
  if (!store.userProfile) return store;
  const newHighScore: HighScore = { score, kills, time, level, date: Date.now() };
  const updatedProfile = { ...store.userProfile, highScores: [...store.userProfile.highScores, newHighScore].sort((a, b) => b.score - a.score).slice(0, 10) };
  const updatedLeaderboard = [...store.globalLeaderboard, { ...newHighScore, id: store.userProfile.id, name: store.userProfile.name, avatar: store.userProfile.avatar }].sort((a, b) => b.score - a.score).slice(0, 100);
  const newStore = { ...store, userProfile: updatedProfile, globalLeaderboard: updatedLeaderboard };
  saveStore(newStore);
  return newStore;
}

