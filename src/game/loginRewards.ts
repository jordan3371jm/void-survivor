import { storageGetItem, storageSetItem } from './storage';
// Sistema di Ricompense Login Giornaliero
// 7 giorni di ricompense crescenti con streak

export interface DailyReward {
  day: number;
  coins: number;
  diamonds: number;
  claimed: boolean;
}

export interface LoginRewardsState {
  lastLoginDate: string; // YYYY-MM-DD
  loginStreak: number;
  rewards: DailyReward[];
  totalClaimed: number;
}

// Definizione delle ricompense per 7 giorni
const DAILY_REWARDS_TEMPLATE = [
  { day: 1, coins: 100, diamonds: 2 },
  { day: 2, coins: 200, diamonds: 3 },
  { day: 3, coins: 300, diamonds: 5 },
  { day: 4, coins: 500, diamonds: 8 },
  { day: 5, coins: 750, diamonds: 10 },
  { day: 6, coins: 1000, diamonds: 15 },
  { day: 7, coins: 2000, diamonds: 25 } // Giorno 7 = ricompensa speciale
];

// Inizializza o aggiorna lo stato dei login rewards
export function getLoginRewardsState(): LoginRewardsState {
  const today = new Date().toISOString().split('T')[0];
  const saved = storageGetItem('loginRewards');
  
  if (saved) {
    const state: LoginRewardsState = JSON.parse(saved);
    
    // Controlla se è passato almeno 1 giorno
    const lastLogin = new Date(state.lastLoginDate);
    const now = new Date(today);
    const daysDiff = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Già fatto il login oggi
      return state;
    } else if (daysDiff === 1) {
      // Login consecutivo
      state.loginStreak += 1;
      state.lastLoginDate = today;
      
      // Reset delle ricompense se abbiamo completato il ciclo di 7 giorni
      if (state.loginStreak > 7) {
        state.loginStreak = 1;
        state.rewards = DAILY_REWARDS_TEMPLATE.map(r => ({ ...r, claimed: false }));
      } else {
        // Segna la ricompensa del giorno corrente come non claimata
        const currentDayReward = state.rewards.find(r => r.day === state.loginStreak);
        if (currentDayReward) {
          currentDayReward.claimed = false;
        }
      }
      
      storageSetItem('loginRewards', JSON.stringify(state));
      return state;
    } else {
      // Login non consecutivo (più di 1 giorno di assenza)
      // Reset dello streak
      state.loginStreak = 1;
      state.lastLoginDate = today;
      state.rewards = DAILY_REWARDS_TEMPLATE.map(r => ({ ...r, claimed: false }));
      storageSetItem('loginRewards', JSON.stringify(state));
      return state;
    }
  }
  
  // Prima volta
  const newState: LoginRewardsState = {
    lastLoginDate: today,
    loginStreak: 1,
    rewards: DAILY_REWARDS_TEMPLATE.map(r => ({ ...r, claimed: false })),
    totalClaimed: 0
  };
  storageSetItem('loginRewards', JSON.stringify(newState));
  return newState;
}

// Riscuoti la ricompensa del giorno corrente
export function claimDailyReward(state: LoginRewardsState): { newState: LoginRewardsState; coins: number; diamonds: number } | null {
  const currentReward = state.rewards.find(r => r.day === state.loginStreak);
  
  if (!currentReward || currentReward.claimed) {
    return null;
  }
  
  currentReward.claimed = true;
  state.totalClaimed += 1;
  
  storageSetItem('loginRewards', JSON.stringify(state));
  
  return {
    newState: state,
    coins: currentReward.coins,
    diamonds: currentReward.diamonds
  };
}

// Controlla se c'è una ricompensa disponibile
export function hasUnclaimedReward(state: LoginRewardsState): boolean {
  const currentReward = state.rewards.find(r => r.day === state.loginStreak);
  return currentReward ? !currentReward.claimed : false;
}

// Ottieni la ricompensa del giorno corrente
export function getCurrentDayReward(state: LoginRewardsState): DailyReward | null {
  return state.rewards.find(r => r.day === state.loginStreak) || null;
}

// Ottieni il prossimo giorno (per preview)
export function getNextDayReward(state: LoginRewardsState): DailyReward | null {
  const nextDay = state.loginStreak === 7 ? 1 : state.loginStreak + 1;
  return state.rewards.find(r => r.day === nextDay) || null;
}
