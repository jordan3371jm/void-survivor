import { storageGetItem, storageSetItem, loadStorageKeys } from './storage';
// Bridge SaaS - Backend ufficiale Playgama

const LEADERBOARD_ID = 'void-survivor.scores';

export async function bridgeCreateUser(userId: string, username: string, email: string): Promise<boolean> {
  try {
    return true;
  } catch (error) {
    console.error('[Bridge] Errore creazione utente:', error);
    return false;
  }
}

export async function bridgeGetUser(userId: string): Promise<any> {
  try {
    return { id: userId };
  } catch (error) {
    console.error('[Bridge] Errore recupero utente:', error);
    return null;
  }
}



const LOCAL_SCORES_KEY = 'voidSurvivorsLocalScores';

interface LocalScore {
  id: string;
  userId: string;
  playerName: string;
  score: number;
  kills: number;
  time: number;
  level: number;
  createdAt: string;
}

interface LeaderboardEntry {
  id: string;
  playerId?: string;
  playerName: string;
  score: number;
  rank: number;
  photo: string;
  createdAt: string;
  kills?: number;
  time?: number;
  level?: number;
}

function getLocalScores(): LocalScore[] {
  const data = storageGetItem(LOCAL_SCORES_KEY);
  if (!data) return [];
  try {
    const scores: unknown = JSON.parse(data);
    return Array.isArray(scores) ? scores as LocalScore[] : [];
  } catch {
    return [];
  }
}

function saveLocalScores(scores: LocalScore[]) {
  storageSetItem(LOCAL_SCORES_KEY, JSON.stringify(scores));
}

export async function bridgeSaveScore(userId: string, username: string, score: number, kills: number, time: number, level: number): Promise<boolean> {
  const localScore: LocalScore = {
    id: `local_${Date.now()}_${Math.random()}`,
    userId,
    playerName: username,
    score,
    kills,
    time,
    level,
    createdAt: new Date().toISOString()
  };
  
  const localScores = getLocalScores();
  localScores.push(localScore);
  saveLocalScores(localScores);
  
  try {
    const bridge = (window as any).bridge;
    
    if (!bridge?.leaderboards?.setScore) {
      return true;
    }
    
    await bridge.leaderboards.setScore(LEADERBOARD_ID, score);
    return true;
  } catch (error) {
    return true;
  }
}

export async function bridgeGetLeaderboard(limit: number = 100): Promise<any[]> {
  const localScores = getLocalScores();
  const localLeaderboard = localScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((score, index) => ({
      id: score.id,
      playerId: score.userId,
      playerName: score.playerName,
      score: score.score,
      rank: index + 1,
      photo: '👤',
      createdAt: score.createdAt
    }));
  
  try {
    const bridge = (window as any).bridge;
    
    if (!bridge?.leaderboards?.getEntries) {
      return localLeaderboard;
    }
    
    const entries = await bridge.leaderboards.getEntries(LEADERBOARD_ID);
    
    const bridgeLeaderboard = entries
      .slice(0, limit)
      .map((entry: any, index: number) => ({
        id: entry.id || `bridge_${index}`,
        playerId: entry.id,
        playerName: entry.name || 'Player',
        score: entry.score || 0,
        rank: entry.rank || index + 1,
        photo: entry.photo || '👤',
        createdAt: new Date().toISOString()
      }));
    
    const allScores = [...localLeaderboard, ...bridgeLeaderboard];
    const uniqueScores: LeaderboardEntry[] = allScores.reduce<LeaderboardEntry[]>((acc, current) => {
      const exists = acc.find(item => item.score === current.score && item.playerId === current.playerId && item.createdAt === current.createdAt);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    uniqueScores.sort((a, b) => b.score - a.score);
    uniqueScores.forEach((score, index) => {
      score.rank = index + 1;
    });
    
    return uniqueScores.slice(0, limit);
  } catch (error) {
    return localLeaderboard;
  }
}

export async function bridgeGetUserScores(userId: string): Promise<any[]> {
  const localScores = getLocalScores();
  
  const userLocalScores = localScores
    .filter(s => s.userId === userId)
    .sort((a, b) => b.score - a.score)
    .map((score, index) => ({
      id: score.id,
      playerId: score.userId,
      playerName: score.playerName,
      score: score.score,
      kills: score.kills,
      time: score.time,
      level: score.level,
      rank: index + 1,
      photo: '👤',
      createdAt: score.createdAt
    }));
  
  try {
    const bridge = (window as any).bridge;
    
    if (!bridge?.leaderboards?.getEntries) {
      return userLocalScores;
    }
    
    const entries = await bridge.leaderboards.getEntries(LEADERBOARD_ID);
    
    const bridgeScores = entries
      .filter((entry: any) => entry.id === userId)
      .map((entry: any, index: number) => ({
        id: entry.id || `bridge_${index}`,
        playerId: entry.id,
        playerName: entry.name || 'Player',
        score: entry.score || 0,
        rank: entry.rank || index + 1,
        photo: entry.photo || '👤',
        createdAt: new Date().toISOString()
      }));
    
    const allScores = [...userLocalScores, ...bridgeScores];
    const uniqueScores: LeaderboardEntry[] = allScores.reduce<LeaderboardEntry[]>((acc, current) => {
      const exists = acc.find(item => item.score === current.score && item.createdAt === current.createdAt);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    uniqueScores.sort((a, b) => b.score - a.score);
    uniqueScores.forEach((score, index) => {
      score.rank = index + 1;
    });
    
    return uniqueScores;
  } catch (error) {
    return userLocalScores;
  }
}

const PLAYER_DATA_KEY = 'voidSurvivorsPlayerData_';

export async function bridgeSavePlayerData(userId: string, playerData: any): Promise<boolean> {
  try {
    storageSetItem(PLAYER_DATA_KEY + userId, JSON.stringify(playerData));
    return true;
  } catch (error) {
    console.error('[Bridge] Errore salvataggio dati giocatore:', error);
    return false;
  }
}

export async function bridgeLoadPlayerData(userId: string): Promise<any> {
  try {
    await loadStorageKeys([PLAYER_DATA_KEY + userId]); // chiave dinamica: caricata a richiesta
    const data = storageGetItem(PLAYER_DATA_KEY + userId);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('[Bridge] Errore recupero dati giocatore:', error);
    return null;
  }
}
