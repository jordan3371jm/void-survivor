import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, getDocs, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { GameStore } from './store';

const isPlaygama = typeof (window as any).bridge !== 'undefined';

const firebaseConfig = {
  apiKey: "AIzaSyBw-lJrjmjdUtAV4enZ97Gb-dsIf0cieuQ",
  authDomain: "void-survivor-271df.firebaseapp.com",
  projectId: "void-survivor-271df",
  storageBucket: "void-survivor-271df.firebasestorage.app",
  messagingSenderId: "292309575033",
  appId: "1:292309575033:web:c5c6a6d5ae56c183cb3ba8"
};

const app = !isPlaygama ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;


export interface GlobalScore {
  id: string;
  userId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
  kills: number;
  time: number;
  level: number;
  date: any;
}

export async function loginWithEmail(email: string, password: string): Promise<User | null> {
  if (!auth) return null;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Errore di autenticazione');
  }
}

export async function registerWithEmail(email: string, password: string, displayName: string): Promise<User | null> {
  if (!auth) return null;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Errore di autenticazione');
  }
}



export async function logout(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error('Errore durante il logout');
  }
}

export function observeAuth(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function saveGlobalScore(userId: string, playerName: string, playerAvatar: string, score: number, kills: number, time: number, level: number): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'scores'), { userId, playerName, playerAvatar, score, kills, time, level, date: serverTimestamp() });
  } catch (error) {
    console.error('Errore salvataggio punteggio:', error);
  }
}

export async function getGlobalLeaderboard(): Promise<GlobalScore[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'scores'), orderBy('score', 'desc'));
    const querySnapshot = await getDocs(q);
    const allScores = querySnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as GlobalScore[];
    const bestScoresByUser = new Map<string, GlobalScore>();
    for (const score of allScores) {
      if (!bestScoresByUser.has(score.userId) || score.score > bestScoresByUser.get(score.userId)!.score) {
        bestScoresByUser.set(score.userId, score);
      }
    }
    return Array.from(bestScoresByUser.values()).sort((a, b) => b.score - a.score).slice(0, 100);
  } catch (error) {
    return [];
  }
}

export async function getUserScores(userId: string): Promise<GlobalScore[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'scores'), orderBy('score', 'desc'));
    const querySnapshot = await getDocs(q);
    const allScores = querySnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as GlobalScore[];
    return allScores.filter(score => score.userId === userId);
  } catch (error) {
    return [];
  }
}

export async function saveUserData(userId: string, store: GameStore): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', userId), {
      coins: store.coins,
      diamonds: store.diamonds,
      points: store.points,
      stats: store.stats,
      upgrades: store.upgrades,
      abilityAttackLevels: store.abilityAttackLevels,
      ships: store.ships,
      currentShip: store.currentShip,
      settings: store.settings,
      highScores: store.userProfile?.highScores || [],
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Errore salvataggio dati utente:', error);
  }
}

export async function loadUserData(userId: string): Promise<Partial<GameStore> & { highScores?: any[] } | null> {
  if (!db) return null;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      const data = docSnap.data();
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
  } catch (error) {
    return null;
  }
}

export async function updateUserProfile(user: User, newName?: string, newEmail?: string, newPassword?: string, currentPassword?: string): Promise<void> {
  try {
    if (newName && newName !== user.displayName) {
      await updateProfile(user, { displayName: newName });
    }
    if (newEmail && newEmail !== user.email) {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      await updateEmail(user, newEmail);
    }
    if (newPassword) {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      await updatePassword(user, newPassword);
    }
  } catch (error: any) {
    throw new Error(error.message || 'Errore durante l\'aggiornamento del profilo');
  }
}

export async function updateUserAvatar(userId: string, avatarData: string): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', userId), { avatar: avatarData }, { merge: true });
  } catch (error) {
    console.error('Errore aggiornamento avatar:', error);
  }
}
