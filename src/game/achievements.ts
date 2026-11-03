// Sistema Obiettivi (Achievements) con classificazioni S, A, B, C, D
// Ricompense proporzionali alla difficoltà

export type AchievementDifficulty = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  difficulty: AchievementDifficulty;
  target: number; // Obiettivo da raggiungere
  rewardCoins: number;
  rewardDiamonds: number;
  icon: string;
  color: string;
  check: (stats: AchievementStats) => number; // Ritorna il progresso attuale
}

export interface AchievementStats {
  // Statistiche per partita singola
  currentKills: number;
  currentPlayTime: number; // in secondi (partita singola)
  currentLevel: number;
  currentScore: number;
  currentWave: number;
  
  // Statistiche totali (somma di tutte le partite)
  totalKills: number;
  totalBossesDefeated: number;
  totalPlayTime: number; // in secondi (totale di tutte le partite)
  totalGamesPlayed: number;
  maxScore: number; // miglior punteggio in una singola partita
  maxLevel: number; // livello massimo raggiunto in una singola partita
  maxWave: number; // ondata massima raggiunta in una singola partita
  
  // Timer attuale velocità x2
  currentSpeedBoostTimer: number; // in secondi (timer attuale della velocità x2)
}

export interface CompletedAchievement {
  id: string;
  completedAt: number;
  claimed: boolean;
}

// Definizione di tutti gli obiettivi
export const achievements: Achievement[] = [
  // ===== CLASSIFICAZIONE D (Facili) =====
  {
    id: 'kills_200',
    name: 'achievement_kills_200',
    description: 'achievement_kills_200_desc',
    difficulty: 'D',
    target: 200,
    rewardCoins: 1000,
    rewardDiamonds: 10,
    icon: '💀',
    color: '#22c55e',
    check: (stats) => stats.currentKills
  },
  {
    id: 'playtime_5min',
    name: 'achievement_playtime_5min',
    description: 'achievement_playtime_5min_desc',
    difficulty: 'D',
    target: 300, // 5 minuti in secondi
    rewardCoins: 500,
    rewardDiamonds: 5,
    icon: '⏱️',
    color: '#22c55e',
    check: (stats) => stats.currentPlayTime
  },
  {
    id: 'level_5',
    name: 'achievement_level_5',
    description: 'achievement_level_5_desc',
    difficulty: 'D',
    target: 5,
    rewardCoins: 500,
    rewardDiamonds: 5,
    icon: '⭐',
    color: '#22c55e',
    check: (stats) => stats.currentLevel
  },
  {
    id: 'boss_1',
    name: 'achievement_boss_1',
    description: 'achievement_boss_1_desc',
    difficulty: 'D',
    target: 1,
    rewardCoins: 3000,
    rewardDiamonds: 30,
    icon: '👹',
    color: '#22c55e',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'games_5',
    name: 'achievement_games_5',
    description: 'achievement_games_5_desc',
    difficulty: 'D',
    target: 5,
    rewardCoins: 500,
    rewardDiamonds: 5,
    icon: '🎮',
    color: '#22c55e',
    check: (stats) => stats.totalGamesPlayed
  },
  {
    id: 'score_1000',
    name: 'achievement_score_1000',
    description: 'achievement_score_1000_desc',
    difficulty: 'D',
    target: 1000,
    rewardCoins: 1000,
    rewardDiamonds: 10,
    icon: '🏆',
    color: '#22c55e',
    check: (stats) => stats.currentScore
  },
  {
    id: 'speed_x2_1h',
    name: 'achievement_speed_x2_1h',
    description: 'achievement_speed_x2_1h_desc',
    difficulty: 'D',
    target: 3600, // 1 ora in secondi
    rewardCoins: 1000,
    rewardDiamonds: 10,
    icon: '⚡',
    color: '#22c55e',
    check: (stats) => stats.currentSpeedBoostTimer
  },
  {
    id: 'wave_5',
    name: 'achievement_wave_5',
    description: 'achievement_wave_5_desc',
    difficulty: 'D',
    target: 5,
    rewardCoins: 500,
    rewardDiamonds: 5,
    icon: '🌊',
    color: '#22c55e',
    check: (stats) => stats.currentWave
  },
  {
    id: 'total_playtime_10min',
    name: 'achievement_total_playtime_10min',
    description: 'achievement_total_playtime_10min_desc',
    difficulty: 'D',
    target: 600, // 10 minuti in secondi
    rewardCoins: 1000,
    rewardDiamonds: 10,
    icon: '⏰',
    color: '#22c55e',
    check: (stats) => stats.totalPlayTime
  },

  // ===== CLASSIFICAZIONE C (Medi) =====
  {
    id: 'kills_1000',
    name: 'achievement_kills_1000',
    description: 'achievement_kills_1000_desc',
    difficulty: 'C',
    target: 1000,
    rewardCoins: 5000,
    rewardDiamonds: 50,
    icon: '💀',
    color: '#3b82f6',
    check: (stats) => stats.currentKills
  },
  {
    id: 'playtime_10min',
    name: 'achievement_playtime_10min',
    description: 'achievement_playtime_10min_desc',
    difficulty: 'C',
    target: 600, // 10 minuti in secondi
    rewardCoins: 3500,
    rewardDiamonds: 35,
    icon: '⏱️',
    color: '#3b82f6',
    check: (stats) => stats.currentPlayTime
  },
  {
    id: 'level_15',
    name: 'achievement_level_15',
    description: 'achievement_level_15_desc',
    difficulty: 'C',
    target: 15,
    rewardCoins: 3500,
    rewardDiamonds: 35,
    icon: '⭐',
    color: '#3b82f6',
    check: (stats) => stats.currentLevel
  },
  {
    id: 'boss_2',
    name: 'achievement_boss_2',
    description: 'achievement_boss_2_desc',
    difficulty: 'C',
    target: 2,
    rewardCoins: 5000,
    rewardDiamonds: 50,
    icon: '👹',
    color: '#3b82f6',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'boss_3',
    name: 'achievement_boss_3',
    description: 'achievement_boss_3_desc',
    difficulty: 'C',
    target: 3,
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '👹',
    color: '#3b82f6',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'games_50',
    name: 'achievement_games_50',
    description: 'achievement_games_50_desc',
    difficulty: 'C',
    target: 50,
    rewardCoins: 1500,
    rewardDiamonds: 15,
    icon: '🎮',
    color: '#3b82f6',
    check: (stats) => stats.totalGamesPlayed
  },
  {
    id: 'score_10000',
    name: 'achievement_score_10000',
    description: 'achievement_score_10000_desc',
    difficulty: 'C',
    target: 10000,
    rewardCoins: 2500,
    rewardDiamonds: 25,
    icon: '🏆',
    color: '#3b82f6',
    check: (stats) => stats.currentScore
  },
  {
    id: 'speed_x2_3h',
    name: 'achievement_speed_x2_3h',
    description: 'achievement_speed_x2_3h_desc',
    difficulty: 'C',
    target: 10800, // 3 ore in secondi
    rewardCoins: 3000,
    rewardDiamonds: 30,
    icon: '⚡',
    color: '#3b82f6',
    check: (stats) => stats.currentSpeedBoostTimer
  },
  {
    id: 'wave_10',
    name: 'achievement_wave_10',
    description: 'achievement_wave_10_desc',
    difficulty: 'C',
    target: 10,
    rewardCoins: 2500,
    rewardDiamonds: 25,
    icon: '🌊',
    color: '#3b82f6',
    check: (stats) => stats.currentWave
  },
  {
    id: 'total_playtime_3h',
    name: 'achievement_total_playtime_3h',
    description: 'achievement_total_playtime_3h_desc',
    difficulty: 'C',
    target: 10800, // 3 ore in secondi
    rewardCoins: 2500,
    rewardDiamonds: 25,
    icon: '⏰',
    color: '#3b82f6',
    check: (stats) => stats.totalPlayTime
  },

  // ===== CLASSIFICAZIONE B (Difficili) =====
  {
    id: 'kills_2500',
    name: 'achievement_kills_2500',
    description: 'achievement_kills_2500_desc',
    difficulty: 'B',
    target: 2500,
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '💀',
    color: '#a855f7',
    check: (stats) => stats.currentKills
  },
  {
    id: 'playtime_15min',
    name: 'achievement_playtime_15min',
    description: 'achievement_playtime_15min_desc',
    difficulty: 'B',
    target: 900, // 15 minuti in secondi
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '⏱️',
    color: '#a855f7',
    check: (stats) => stats.currentPlayTime
  },
  {
    id: 'level_35',
    name: 'achievement_level_35',
    description: 'achievement_level_35_desc',
    difficulty: 'B',
    target: 35,
    rewardCoins: 7000,
    rewardDiamonds: 70,
    icon: '⭐',
    color: '#a855f7',
    check: (stats) => stats.currentLevel
  },
  {
    id: 'boss_4',
    name: 'achievement_boss_4',
    description: 'achievement_boss_4_desc',
    difficulty: 'B',
    target: 4,
    rewardCoins: 15000,
    rewardDiamonds: 150,
    icon: '👹',
    color: '#a855f7',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'boss_5',
    name: 'achievement_boss_5',
    description: 'achievement_boss_5_desc',
    difficulty: 'B',
    target: 5,
    rewardCoins: 20000,
    rewardDiamonds: 200,
    icon: '👹',
    color: '#a855f7',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'games_150',
    name: 'achievement_games_150',
    description: 'achievement_games_150_desc',
    difficulty: 'B',
    target: 150,
    rewardCoins: 6000,
    rewardDiamonds: 60,
    icon: '🎮',
    color: '#a855f7',
    check: (stats) => stats.totalGamesPlayed
  },
  {
    id: 'score_15000',
    name: 'achievement_score_15000',
    description: 'achievement_score_15000_desc',
    difficulty: 'B',
    target: 15000,
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '🏆',
    color: '#a855f7',
    check: (stats) => stats.currentScore
  },
  {
    id: 'speed_x2_6h',
    name: 'achievement_speed_x2_6h',
    description: 'achievement_speed_x2_6h_desc',
    difficulty: 'B',
    target: 21600, // 6 ore in secondi
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '⚡',
    color: '#a855f7',
    check: (stats) => stats.currentSpeedBoostTimer
  },
  {
    id: 'wave_20',
    name: 'achievement_wave_20',
    description: 'achievement_wave_20_desc',
    difficulty: 'B',
    target: 20,
    rewardCoins: 8000,
    rewardDiamonds: 80,
    icon: '🌊',
    color: '#a855f7',
    check: (stats) => stats.currentWave
  },
  {
    id: 'total_playtime_15h',
    name: 'achievement_total_playtime_15h',
    description: 'achievement_total_playtime_15h_desc',
    difficulty: 'B',
    target: 54000, // 15 ore in secondi
    rewardCoins: 6000,
    rewardDiamonds: 60,
    icon: '⏰',
    color: '#a855f7',
    check: (stats) => stats.totalPlayTime
  },

  // ===== CLASSIFICAZIONE A (Molto Difficili) =====
  {
    id: 'kills_3500',
    name: 'achievement_kills_3500',
    description: 'achievement_kills_3500_desc',
    difficulty: 'A',
    target: 3500,
    rewardCoins: 15000,
    rewardDiamonds: 150,
    icon: '💀',
    color: '#f59e0b',
    check: (stats) => stats.currentKills
  },
  {
    id: 'playtime_20min',
    name: 'achievement_playtime_20min',
    description: 'achievement_playtime_20min_desc',
    difficulty: 'A',
    target: 1200, // 20 minuti in secondi
    rewardCoins: 15000,
    rewardDiamonds: 150,
    icon: '⏱️',
    color: '#f59e0b',
    check: (stats) => stats.currentPlayTime
  },
  {
    id: 'level_50',
    name: 'achievement_level_50',
    description: 'achievement_level_50_desc',
    difficulty: 'A',
    target: 50,
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '⭐',
    color: '#f59e0b',
    check: (stats) => stats.currentLevel
  },
  {
    id: 'boss_6',
    name: 'achievement_boss_6',
    description: 'achievement_boss_6_desc',
    difficulty: 'A',
    target: 6,
    rewardCoins: 25000,
    rewardDiamonds: 250,
    icon: '👹',
    color: '#f59e0b',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'boss_7',
    name: 'achievement_boss_7',
    description: 'achievement_boss_7_desc',
    difficulty: 'A',
    target: 7,
    rewardCoins: 30000,
    rewardDiamonds: 300,
    icon: '👹',
    color: '#f59e0b',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'games_500',
    name: 'achievement_games_500',
    description: 'achievement_games_500_desc',
    difficulty: 'A',
    target: 500,
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '🎮',
    color: '#f59e0b',
    check: (stats) => stats.totalGamesPlayed
  },
  {
    id: 'score_20000',
    name: 'achievement_score_20000',
    description: 'achievement_score_20000_desc',
    difficulty: 'A',
    target: 20000,
    rewardCoins: 15000,
    rewardDiamonds: 150,
    icon: '🏆',
    color: '#f59e0b',
    check: (stats) => stats.currentScore
  },
  {
    id: 'speed_x2_12h',
    name: 'achievement_speed_x2_12h',
    description: 'achievement_speed_x2_12h_desc',
    difficulty: 'A',
    target: 43200, // 12 ore in secondi
    rewardCoins: 15000,
    rewardDiamonds: 150,
    icon: '⚡',
    color: '#f59e0b',
    check: (stats) => stats.currentSpeedBoostTimer
  },
  {
    id: 'wave_30',
    name: 'achievement_wave_30',
    description: 'achievement_wave_30_desc',
    difficulty: 'A',
    target: 30,
    rewardCoins: 12000,
    rewardDiamonds: 120,
    icon: '🌊',
    color: '#f59e0b',
    check: (stats) => stats.currentWave
  },
  {
    id: 'total_playtime_40h',
    name: 'achievement_total_playtime_40h',
    description: 'achievement_total_playtime_40h_desc',
    difficulty: 'A',
    target: 144000, // 40 ore in secondi
    rewardCoins: 10000,
    rewardDiamonds: 100,
    icon: '⏰',
    color: '#f59e0b',
    check: (stats) => stats.totalPlayTime
  },

  // ===== CLASSIFICAZIONE S (Estremamente Difficili) =====
  {
    id: 'kills_5000',
    name: 'achievement_kills_5000',
    description: 'achievement_kills_5000_desc',
    difficulty: 'S',
    target: 5000,
    rewardCoins: 25000,
    rewardDiamonds: 250,
    icon: '💀',
    color: '#ef4444',
    check: (stats) => stats.currentKills
  },
  {
    id: 'playtime_40min',
    name: 'achievement_playtime_40min',
    description: 'achievement_playtime_40min_desc',
    difficulty: 'S',
    target: 2400, // 40 minuti in secondi
    rewardCoins: 25000,
    rewardDiamonds: 250,
    icon: '⏱️',
    color: '#ef4444',
    check: (stats) => stats.currentPlayTime
  },
  {
    id: 'level_100',
    name: 'achievement_level_100',
    description: 'achievement_level_100_desc',
    difficulty: 'S',
    target: 100,
    rewardCoins: 50000,
    rewardDiamonds: 500,
    icon: '⭐',
    color: '#ef4444',
    check: (stats) => stats.currentLevel
  },
  {
    id: 'boss_8',
    name: 'achievement_boss_8',
    description: 'achievement_boss_8_desc',
    difficulty: 'S',
    target: 8,
    rewardCoins: 50000,
    rewardDiamonds: 500,
    icon: '👹',
    color: '#ef4444',
    check: (stats) => stats.totalBossesDefeated
  },
  {
    id: 'games_1000',
    name: 'achievement_games_1000',
    description: 'achievement_games_1000_desc',
    difficulty: 'S',
    target: 1000,
    rewardCoins: 25000,
    rewardDiamonds: 250,
    icon: '🎮',
    color: '#ef4444',
    check: (stats) => stats.totalGamesPlayed
  },
  {
    id: 'score_50000',
    name: 'achievement_score_50000',
    description: 'achievement_score_50000_desc',
    difficulty: 'S',
    target: 50000,
    rewardCoins: 50000,
    rewardDiamonds: 500,
    icon: '🏆',
    color: '#ef4444',
    check: (stats) => stats.currentScore
  },
  {
    id: 'speed_x2_24h',
    name: 'achievement_speed_x2_24h',
    description: 'achievement_speed_x2_24h_desc',
    difficulty: 'S',
    target: 86400, // 24 ore in secondi
    rewardCoins: 50000,
    rewardDiamonds: 500,
    icon: '⚡',
    color: '#ef4444',
    check: (stats) => stats.currentSpeedBoostTimer
  },
  {
    id: 'wave_40',
    name: 'achievement_wave_40',
    description: 'achievement_wave_40_desc',
    difficulty: 'S',
    target: 40,
    rewardCoins: 50000,
    rewardDiamonds: 500,
    icon: '🌊',
    color: '#ef4444',
    check: (stats) => stats.currentWave
  },
  {
    id: 'total_playtime_100h',
    name: 'achievement_total_playtime_100h',
    description: 'achievement_total_playtime_100h_desc',
    difficulty: 'S',
    target: 360000, // 100 ore in secondi
    rewardCoins: 25000,
    rewardDiamonds: 250,
    icon: '⏰',
    color: '#ef4444',
    check: (stats) => stats.totalPlayTime
  }
];

// Funzione per ottenere il colore della difficoltà
export function getDifficultyColor(difficulty: AchievementDifficulty): string {
  switch (difficulty) {
    case 'S': return '#ef4444'; // Rosso
    case 'A': return '#f59e0b'; // Arancione
    case 'B': return '#a855f7'; // Viola
    case 'C': return '#3b82f6'; // Blu
    case 'D': return '#22c55e'; // Verde
  }
}

// Funzione per ottenere il nome della difficoltà
export function getDifficultyName(difficulty: AchievementDifficulty, lang: string): string {
  const names: Record<string, Record<AchievementDifficulty, string>> = {
    it: { S: 'LEGgendARIO', A: 'EPICO', B: 'DIFFICILE', C: 'MEDIO', D: 'FACILE' },
    en: { S: 'LEGENDARY', A: 'EPIC', B: 'HARD', C: 'MEDIUM', D: 'EASY' },
    es: { S: 'LEGENDARIO', A: 'ÉPICO', B: 'DIFÍCIL', C: 'MEDIO', D: 'FÁCIL' },
    fr: { S: 'LÉGENDAIRE', A: 'ÉPIQUE', B: 'DIFFICILE', C: 'MOYEN', D: 'FACILE' },
    zh: { S: '传奇', A: '史诗', B: '困难', C: '中等', D: '简单' },
    pl: { S: 'LEGENDARNE', A: 'EPICKIE', B: 'TRUDNE', C: 'ŚREDNIE', D: 'ŁATWE' }
  };
  return names[lang]?.[difficulty] || names.en[difficulty];
}
