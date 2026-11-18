// Account e salvataggi online: passano solo da Playgama Bridge.
// Fuori da Playgama (app, web senza Bridge) i progressi restano sul dispositivo.
import { sessionGetItem } from './storage';
import { bridgeSaveScore, bridgeSavePlayerData, bridgeLoadPlayerData } from './bridge';
import type { GameStore } from './store';

export function isPlaygama(): boolean {
  return typeof (window as any).bridge !== 'undefined';
}

interface LocalUser { id: string; email: string; username: string; }

function getCurrentLocalUser(): LocalUser | null {
  try {
    const data = sessionGetItem('currentLocalUser');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function observeAuth(callback: (user: any) => void): () => void {
  if (!isPlaygama()) return () => {};
  const currentUser = getCurrentLocalUser();
  if (currentUser) callback({ uid: currentUser.id, email: currentUser.email, displayName: currentUser.username });
  return () => {};
}

export async function saveGlobalScore(userId: string, playerName: string, _playerAvatar: string, score: number, kills: number, time: number, level: number): Promise<void> {
  if (!isPlaygama()) return;
  await bridgeSaveScore(userId, playerName, score, kills, time, level);
}

export async function saveUserData(userId: string, store: GameStore): Promise<void> {
  if (!isPlaygama()) return;
  const data = {
    coins: store.coins,
    diamonds: store.diamonds,
    points: store.points,
    stats: store.stats,
    upgrades: store.upgrades,
    abilityAttackLevels: store.abilityAttackLevels,
    ships: store.ships,
    currentShip: store.currentShip,
    settings: store.settings,
    highScores: store.userProfile?.highScores || []
  };
  await bridgeSavePlayerData(userId, data);
}

export async function loadUserData(userId: string): Promise<any> {
  if (!isPlaygama()) return null;
  const data = await bridgeLoadPlayerData(userId);
  if (!data) return null;
  return {
    coins: data.coins || 0,
    diamonds: data.diamonds || 0,
    points: data.points || 0,
    stats: data.stats || {},
    upgrades: data.upgrades || {},
    abilityAttackLevels: data.abilityAttackLevels || {},
    ships: data.ships || {},
    currentShip: data.currentShip || 'starter',
    settings: data.settings || {},
    highScores: data.highScores || []
  };
}
