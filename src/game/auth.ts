import { storageGetItem, storageSetItem, sessionGetItem, sessionSetItem, sessionRemoveItem } from './storage';
import { bridgeCreateUser, bridgeGetUser, bridgeSaveScore, bridgeGetLeaderboard, bridgeGetUserScores, bridgeSavePlayerData, bridgeLoadPlayerData } from './bridge';
import type { GameStore } from './store';

export function isPlaygama(): boolean {
  return typeof (window as any).bridge !== 'undefined';
}

const LOCAL_USER_KEY = 'voidSurvivorsLocalUser';

interface LocalUser {
  id: string;
  email: string;
  username: string;
  password: string;
}

function getLocalUsers(): LocalUser[] {
  const data = storageGetItem(LOCAL_USER_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalUsers(users: LocalUser[]) {
  storageSetItem(LOCAL_USER_KEY, JSON.stringify(users));
}

function getCurrentLocalUser(): LocalUser | null {
  const data = sessionGetItem('currentLocalUser');
  return data ? JSON.parse(data) : null;
}

function setCurrentLocalUser(user: LocalUser | null) {
  if (user) {
    sessionSetItem('currentLocalUser', JSON.stringify(user));
  } else {
    sessionRemoveItem('currentLocalUser');
  }
}

export async function loginWithEmail(email: string, password: string): Promise<any> {
  if (isPlaygama()) {
    const users = getLocalUsers();
    const localUser = users.find(u => u.email === email && u.password === password);
    
    if (!localUser) {
      throw new Error('Email o password errati');
    }
    
    const bridgeUser = await bridgeGetUser(localUser.id);
    
    if (!bridgeUser) {
      await bridgeCreateUser(localUser.id, localUser.username, localUser.email);
    }
    
    setCurrentLocalUser(localUser);
    
    return {
      uid: localUser.id,
      email: localUser.email,
      displayName: localUser.username
    };
  } else {
    const firebase = await import('./firebase');
    return await firebase.loginWithEmail(email, password);
  }
}

export async function registerWithEmail(email: string, password: string, username: string): Promise<any> {
  if (isPlaygama()) {
    const users = getLocalUsers();
    if (users.find(u => u.email === email)) {
      throw new Error('Email già registrata');
    }
    
    const newUser: LocalUser = {
      id: 'local_' + Date.now(),
      email,
      username,
      password
    };
    users.push(newUser);
    saveLocalUsers(users);
    
    await bridgeCreateUser(newUser.id, username, email);
    
    setCurrentLocalUser(newUser);
    
    return {
      uid: newUser.id,
      email: newUser.email,
      displayName: newUser.username
    };
  } else {
    const firebase = await import('./firebase');
    return await firebase.registerWithEmail(email, password, username);
  }
}

export async function logout() {
  if (isPlaygama()) {
    setCurrentLocalUser(null);
  } else {
    const firebase = await import('./firebase');
    await firebase.logout();
  }
}

export function observeAuth(callback: (user: any) => void) {
  if (isPlaygama()) {
    const currentUser = getCurrentLocalUser();
    if (currentUser) {
      callback({
        uid: currentUser.id,
        email: currentUser.email,
        displayName: currentUser.username
      });
    }
    return () => {};
  } else {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void import('./firebase')
      .then(({ observeAuth: observeFirebaseAuth }) => {
        if (!cancelled) unsubscribe = observeFirebaseAuth(callback);
      })
      .catch((error) => {
        console.error('[Auth] Unable to initialize the authentication listener:', error);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }
}

export async function saveGlobalScore(userId: string, playerName: string, playerAvatar: string, score: number, kills: number, time: number, level: number) {
  if (isPlaygama()) {
    await bridgeSaveScore(userId, playerName, score, kills, time, level);
  } else {
    const firebase = await import('./firebase');
    await firebase.saveGlobalScore(userId, playerName, playerAvatar, score, kills, time, level);
  }
}

export async function getGlobalLeaderboard(): Promise<any[]> {
  if (isPlaygama()) {
    const scores = await bridgeGetLeaderboard(100);
    return scores.map((s: any) => ({
      id: s.id || s.playerId,
      userId: s.playerId,
      playerName: s.playerName,
      playerAvatar: '👤',
      score: s.score,
      kills: s.metadata?.kills || 0,
      time: s.metadata?.time || 0,
      level: s.metadata?.level || 1,
      date: s.createdAt || new Date().toISOString()
    }));
  } else {
    const firebase = await import('./firebase');
    return await firebase.getGlobalLeaderboard();
  }
}

export async function getUserScores(userId: string): Promise<any[]> {
  if (isPlaygama()) {
    const scores = await bridgeGetUserScores(userId);
    return scores.map((s: any) => ({
      id: s.id || s.playerId,
      userId: s.playerId,
      playerName: s.playerName,
      playerAvatar: '👤',
      score: s.score,
      kills: s.metadata?.kills || 0,
      time: s.metadata?.time || 0,
      level: s.metadata?.level || 1,
      date: s.createdAt || new Date().toISOString()
    }));
  } else {
    const firebase = await import('./firebase');
    return await firebase.getUserScores(userId);
  }
}

export async function saveUserData(userId: string, store: GameStore) {
  if (isPlaygama()) {
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
  } else {
    const firebase = await import('./firebase');
    await firebase.saveUserData(userId, store);
  }
}

export async function loadUserData(userId: string): Promise<any> {
  if (isPlaygama()) {
    const data = await bridgeLoadPlayerData(userId);
    if (data) {
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
    return null;
  } else {
    const firebase = await import('./firebase');
    return await firebase.loadUserData(userId);
  }
}
