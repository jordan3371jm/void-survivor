import { storageGetItem, storageSetItem } from './storage';
// Sistema di Challenge Giornaliere
// 3 challenge che cambiano ogni 24h con ricompense

export interface DailyChallenge {
  id: string;
  type: 'kill_enemies' | 'survive_time' | 'reach_level' | 'reach_wave' | 'defeat_boss' | 'earn_coins';
  target: number;
  rewardCoins: number;
  rewardDiamonds: number;
  description: string;
  icon: string;
}

export interface DailyChallengeProgress {
  challengeId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyChallengesState {
  date: string; // YYYY-MM-DD
  challenges: DailyChallenge[];
  progress: DailyChallengeProgress[];
}

// Genera 3 challenge casuali per oggi
export function generateDailyChallenges(): DailyChallenge[] {
  const today = new Date().toISOString().split('T')[0];
  const seed = hashCode(today);
  
  const allChallenges: DailyChallenge[] = [
    // Kill challenges
    { id: 'kill_200', type: 'kill_enemies', target: 200, rewardCoins: 300, rewardDiamonds: 3, description: 'daily_kill_200', icon: '💀' },
    { id: 'kill_500', type: 'kill_enemies', target: 500, rewardCoins: 600, rewardDiamonds: 6, description: 'daily_kill_500', icon: '💀' },
    { id: 'kill_1000', type: 'kill_enemies', target: 1000, rewardCoins: 1200, rewardDiamonds: 12, description: 'daily_kill_1000', icon: '💀' },
    
    // Survive time challenges
    { id: 'survive_5min', type: 'survive_time', target: 300, rewardCoins: 400, rewardDiamonds: 4, description: 'daily_survive_5min', icon: '⏱️' },
    { id: 'survive_10min', type: 'survive_time', target: 600, rewardCoins: 800, rewardDiamonds: 8, description: 'daily_survive_10min', icon: '⏱️' },
    { id: 'survive_15min', type: 'survive_time', target: 900, rewardCoins: 1200, rewardDiamonds: 12, description: 'daily_survive_15min', icon: '⏱️' },
    
    // Level challenges
    { id: 'level_15', type: 'reach_level', target: 15, rewardCoins: 350, rewardDiamonds: 4, description: 'daily_level_15', icon: '⭐' },
    { id: 'level_25', type: 'reach_level', target: 25, rewardCoins: 700, rewardDiamonds: 7, description: 'daily_level_25', icon: '⭐' },
    { id: 'level_40', type: 'reach_level', target: 40, rewardCoins: 1400, rewardDiamonds: 14, description: 'daily_level_40', icon: '⭐' },
    
    // Wave challenges
    { id: 'wave_10', type: 'reach_wave', target: 10, rewardCoins: 500, rewardDiamonds: 5, description: 'daily_wave_10', icon: '🌊' },
    { id: 'wave_20', type: 'reach_wave', target: 20, rewardCoins: 1000, rewardDiamonds: 10, description: 'daily_wave_20', icon: '🌊' },
    { id: 'wave_30', type: 'reach_wave', target: 30, rewardCoins: 2000, rewardDiamonds: 20, description: 'daily_wave_30', icon: '🌊' },
    
    // Boss challenges
    { id: 'boss_1', type: 'defeat_boss', target: 1, rewardCoins: 800, rewardDiamonds: 8, description: 'daily_boss_1', icon: '👹' },
    { id: 'boss_2', type: 'defeat_boss', target: 2, rewardCoins: 1500, rewardDiamonds: 15, description: 'daily_boss_2', icon: '👹' },
    { id: 'boss_3', type: 'defeat_boss', target: 3, rewardCoins: 3000, rewardDiamonds: 30, description: 'daily_boss_3', icon: '👹' },
    
    // Coin challenges
    { id: 'earn_1000', type: 'earn_coins', target: 1000, rewardCoins: 200, rewardDiamonds: 2, description: 'daily_earn_1000', icon: '💰' },
    { id: 'earn_3000', type: 'earn_coins', target: 3000, rewardCoins: 500, rewardDiamonds: 5, description: 'daily_earn_3000', icon: '💰' },
    { id: 'earn_5000', type: 'earn_coins', target: 5000, rewardCoins: 1000, rewardDiamonds: 10, description: 'daily_earn_5000', icon: '💰' },
  ];
  
  // Seleziona 3 challenge diverse usando il seed
  const selected: DailyChallenge[] = [];
  const usedTypes = new Set<string>();
  
  for (let i = 0; i < 3 && selected.length < 3; i++) {
    const index = (seed + i * 7) % allChallenges.length;
    const challenge = allChallenges[index];
    
    // Evita di avere 2 challenge dello stesso tipo
    if (!usedTypes.has(challenge.type)) {
      selected.push(challenge);
      usedTypes.add(challenge.type);
    }
  }
  
  // Se non abbiamo 3 challenge, riempi con quelle rimanenti
  while (selected.length < 3) {
    const remaining = allChallenges.filter(c => !selected.includes(c));
    if (remaining.length === 0) break;
    selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }
  
  return selected;
}

// Inizializza o aggiorna le challenge giornaliere
export function getDailyChallengesState(): DailyChallengesState {
  const today = new Date().toISOString().split('T')[0];
  const saved = storageGetItem('dailyChallenges');
  
  if (saved) {
    const state: DailyChallengesState = JSON.parse(saved);
    
    // Se è un nuovo giorno, rigenera le challenge
    if (state.date !== today) {
      const newState: DailyChallengesState = {
        date: today,
        challenges: generateDailyChallenges(),
        progress: []
      };
      storageSetItem('dailyChallenges', JSON.stringify(newState));
      return newState;
    }
    
    return state;
  }
  
  // Prima volta
  const newState: DailyChallengesState = {
    date: today,
    challenges: generateDailyChallenges(),
    progress: []
  };
  storageSetItem('dailyChallenges', JSON.stringify(newState));
  return newState;
}

// Aggiorna il progresso di una challenge
export function updateChallengeProgress(
  state: DailyChallengesState,
  challengeId: string,
  currentValue: number
): DailyChallengesState {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge) return state;
  
  let progress = state.progress.find(p => p.challengeId === challengeId);
  
  if (!progress) {
    progress = {
      challengeId,
      current: 0,
      completed: false,
      claimed: false
    };
    state.progress.push(progress);
  }
  
  progress.current = Math.max(progress.current, currentValue);
  
  if (progress.current >= challenge.target && !progress.completed) {
    progress.completed = true;
  }
  
  storageSetItem('dailyChallenges', JSON.stringify(state));
  return state;
}

// Riscuoti la ricompensa di una challenge
export function claimChallengeReward(
  state: DailyChallengesState,
  challengeId: string
): { newState: DailyChallengesState; coins: number; diamonds: number } | null {
  const challenge = state.challenges.find(c => c.id === challengeId);
  const progress = state.progress.find(p => p.challengeId === challengeId);
  
  if (!challenge || !progress || !progress.completed || progress.claimed) {
    return null;
  }
  
  progress.claimed = true;
  storageSetItem('dailyChallenges', JSON.stringify(state));
  
  return {
    newState: state,
    coins: challenge.rewardCoins,
    diamonds: challenge.rewardDiamonds
  };
}

// Hash function per generare seed dalla data
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Registra una partita conclusa nelle sfide del giorno (prima non veniva mai chiamato:
 * le sfide giornaliere non si potevano completare).
 * Uccisioni, boss e monete si sommano nella giornata; tempo, livello e ondata contano il record.
 */
export function recordRunForDailyChallenges(run: { kills: number; time: number; level: number; wave: number; bosses: number; coins: number }): void {
  const state = getDailyChallengesState();
  for (const challenge of state.challenges) {
    const current = state.progress.find(p => p.challengeId === challenge.id)?.current || 0;
    let value = current;
    switch (challenge.type) {
      case 'kill_enemies': value = current + run.kills; break;
      case 'defeat_boss': value = current + run.bosses; break;
      case 'earn_coins': value = current + run.coins; break;
      case 'survive_time': value = Math.max(current, Math.floor(run.time)); break;
      case 'reach_level': value = Math.max(current, run.level); break;
      case 'reach_wave': value = Math.max(current, run.wave); break;
    }
    updateChallengeProgress(state, challenge.id, value);
  }
}
