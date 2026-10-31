import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, LevelUpChoice, AbilityType, ChestReward } from './game/types';
import { EVOLUTIONS } from './game/progression';
import { getEvolutionName } from './game/evolutions';
import { getAbilityInfo } from './game/abilityInfo';
import { resumeAudio, setSfxVolume, setMusicVolume, loadCustomMusic, hasCustomMusic, startBackgroundMusic, stopBackgroundMusic, setAudioPaused } from './game/audio';
import { t, Language, languageNames } from './game/i18n';
import { plFromEn } from './game/pl';
import { loadStore, saveStore, applyUpgrade, getUpgradeCost, GameStore, upgradeAbilityAttack, getAbilityAttackBonus, applyDiamondUpgrade, getDiamondUpgradeCost, applyCoinUpgrade, getCoinUpgradeCost, getStatLevel, getStatMaxLevel, DiamondUpgradeType, CoinUpgradeType, addHighScore, createUserProfile, saveUserProfile } from './game/store';
import { STORAGE_LATE_EVENT } from './game/storage';
import { playgama } from './game/playgame';
import { trackRunStart, trackFrame, trackRunEnd, trackTutorial, trackPerfFrame } from './game/telemetry';
import { getLoginRewardsState, hasUnclaimedReward } from './game/loginRewards';
import { AbilityIcon } from './components/abilityIcon';
import { ShipIcon } from './components/shipIcon';
import { checkAndCompleteAchievements } from './game/achievementChecker';
import { recordRunForDailyChallenges, countClaimable } from './game/dailyChallenges';
import { ArrowLeft, CalendarDays, Shuffle, Heart, Clapperboard, Coins, Crosshair, Gem, Gift, Home, Infinity as InfinityIcon, Joystick, Lock, Music2, Pause, Play, RotateCcw, Rocket, Settings2, Shield, Skull, Sparkles, Star, Swords, Target, Timer, Trophy, UserRound, Volume2, X, Zap, FolderOpen, Check, SunMoon } from 'lucide-react';

const ProfileModal = React.lazy(() => import('./profile').then((module) => ({ default: module.ProfileModal })));
const LeaderboardModal = React.lazy(() => import('./profile').then((module) => ({ default: module.LeaderboardModal })));
const AchievementsModal = React.lazy(() => import('./AchievementsModal').then((module) => ({ default: module.AchievementsModal })));
const DailyRewardModal = React.lazy(() => import('./DailyRewardModal').then((module) => ({ default: module.DailyRewardModal })));
const Tutorial = React.lazy(() => import('./Tutorial').then((module) => ({ default: module.Tutorial })));
const DailyEventsModal = React.lazy(() => import('./DailyEventsModal').then((module) => ({ default: module.DailyEventsModal })));

const ASSET_BASE_URL: string = import.meta.env.BASE_URL || '/';
const BOSS_ICON_LIST = ['boss_death_star', 'boss_xenomorph', 'boss_cthulhu', 'boss_borg_cube', 'boss_space_kraken', 'boss_galaxy_devourer', 'boss_void_emperor', 'boss_cosmic_horror'];

type Screen = 'home' | 'upgrades' | 'ships' | 'settings' | 'playing';
type GameMode = 'normal' | 'endless' | 'boss_rush';

interface FinalStats {
  score: number; time: number; kills: number; level: number; wave: number;
  coins: number; diamonds: number; points: number; victory: boolean;
}

// Dalla nave piu' debole alla piu' forte (in base all'arma di partenza), prezzo crescente.
// La nave Buco Nero e' stata tolta (store.ts rimborsa chi l'aveva comprata).
const SHIPS = [
  { type: 'starter', nameKey: 'ship_starter', price: 0, color: '#62f5cf', ability: 'homing_laser' },
  { type: 'shield_ship', nameKey: 'ship_shield', price: 150, color: '#3dffaa', ability: 'energy_shield' },
  { type: 'cryo_ship', nameKey: 'ship_cryo', price: 250, color: '#4ff0ff', ability: 'cryo_lance' },
  { type: 'mechanical_ship', nameKey: 'ship_mechanical', price: 350, color: '#c9d2e3', ability: 'orbiting_satellites' },
  { type: 'bio_ship', nameKey: 'ship_bio', price: 450, color: '#ff5f8f', ability: 'corrosive_nebula' },
  { type: 'photon_ship', nameKey: 'ship_photon', price: 600, color: '#ff5555', ability: 'photon_gun' },
  { type: 'ion_ship', nameKey: 'ship_ion', price: 750, color: '#6b7bff', ability: 'ion_gun' },
  { type: 'drone_ship', nameKey: 'ship_drone', price: 900, color: '#ffb02e', ability: 'drone_swarm' },
  { type: 'gravity_ship', nameKey: 'ship_gravity', price: 1100, color: '#c05bff', ability: 'gravity_waves' },
  { type: 'probe_x_ship', nameKey: 'ship_probe_x', price: 1300, color: '#ff4444', ability: 'probe_x' },
  { type: 'probe_y_ship', nameKey: 'ship_probe_y', price: 1500, color: '#4f6bff', ability: 'probe_y' },
  { type: 'asteroid_ship', nameKey: 'ship_asteroid', price: 1750, color: '#d19a66', ability: 'asteroid_fragment' },
  { type: 'quantum_ship', nameKey: 'ship_quantum', price: 2000, color: '#5cffff', ability: 'quantum_bounce' },
  { type: 'boomerang_ship', nameKey: 'ship_boomerang', price: 2300, color: '#aab4ff', ability: 'neutronium_boomerang' },
  { type: 'kinetic_ship', nameKey: 'ship_kinetic', price: 2600, color: '#ff9a2e', ability: 'kinetic_darts' },
  { type: 'electric_ship', nameKey: 'ship_electric', price: 3000, color: '#7cc4ff', ability: 'ion_storm' },
  { type: 'meteor_ship', nameKey: 'ship_meteor', price: 3400, color: '#ff7a33', ability: 'meteor' },
  { type: 'fire_ship', nameKey: 'ship_fire', price: 3900, color: '#ff6a2b', ability: 'plasma_flamethrower' },
  { type: 'viper_ship', nameKey: 'ship_viper', price: 4400, color: '#c0c8d8', ability: 'prism_ray' },
  { type: 'tie_fighter_ship', nameKey: 'ship_tie_fighter', price: 5000, color: '#a3acc2', ability: 'arc_slash' },
  { type: 'nuclear_ship', nameKey: 'ship_nuclear', price: 5700, color: '#5cff8a', ability: 'antimatter_bomb' },
  { type: 'shadow_ship', nameKey: 'ship_shadow', price: 6500, color: '#9f8cff', ability: 'gravity_field' },
  { type: 'federation_ship', nameKey: 'ship_federation', price: 7400, color: '#e6ecf5', ability: 'void_lance' },
  { type: 'laser_ship', nameKey: 'ship_laser', price: 8500, color: '#ff4d5e', ability: 'laser_swords' },
  { type: 'void_ship', nameKey: 'ship_void', price: 10000, color: '#e35bff', ability: 'stellar_blackhole' },
];

const ACTIVE_ABILITIES: AbilityType[] = ['photon_gun', 'ion_gun', 'drone_swarm', 'gravity_waves', 'void_lance', 'cryo_lance', 'energy_shield', 'asteroid_fragment', 'homing_laser', 'laser_swords', 'plasma_flamethrower', 'gravity_field', 'ion_storm', 'antimatter_bomb', 'orbiting_satellites', 'corrosive_nebula', 'kinetic_darts', 'meteor', 'neutronium_boomerang', 'quantum_bounce', 'stellar_blackhole', 'probe_x', 'probe_y', 'prism_ray', 'arc_slash'];
const PASSIVE_ABILITIES: AbilityType[] = ['passive_fusion_core', 'passive_plating', 'passive_neutronium_heart', 'passive_regen_core', 'passive_void_tome', 'passive_stellar_candelabrum', 'passive_kinetic_accelerator', 'passive_quantum_binder', 'passive_molecular_replicator', 'passive_ionic_thrusters', 'passive_gravity_field', 'passive_stellar_fortune', 'passive_galactic_crown', 'passive_cosmic_dust', 'passive_quantum_reactor', 'passive_pulsar_heart', 'passive_galactic_coin'];

/** Testi brevi non presenti nel file delle traduzioni. */
function L(lang: Language, it: string, en: string, es: string, fr: string, zh: string): string {
  return lang === 'it' ? it : lang === 'es' ? es : lang === 'fr' ? fr : lang === 'zh' ? zh : lang === 'pl' ? plFromEn(en) : en;
}

/** Rimuove emoji iniziali/finali dalle traduzioni (al loro posto usiamo icone coerenti). */
function clean(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}️☀-➿\s]+/u, '').replace(/[\s\p{Extended_Pictographic}️☀-➿]+$/u, '').trim();
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function Currency({ store, compact }: { store: GameStore; compact?: boolean }) {
  return (
    <div className={`vs-currency${compact ? ' is-compact' : ''}`}>
      <span className="vs-chip vs-chip--coin"><Coins size={15} aria-hidden="true" />{Math.round(store.coins)}</span>
      <span className="vs-chip vs-chip--gem"><Gem size={15} aria-hidden="true" />{Math.round(store.diamonds)}</span>
      {store.points > 0 && <span className="vs-chip vs-chip--star"><Star size={15} aria-hidden="true" />{Math.round(store.points)}</span>}
    </div>
  );
}

function TopBar({ title, icon, onBack, lang, right }: { title: string; icon?: React.ReactNode; onBack: () => void; lang: Language; right?: React.ReactNode }) {
  return (
    <header className="vs-topbar">
      <button type="button" className="vs-btn vs-btn--ghost vs-btn--sm vs-back" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /><span>{t(lang, 'back')}</span>
      </button>
      <h1 className="vs-topbar-title">{icon}{title}</h1>
      <div className="vs-topbar-right">{right}</div>
    </header>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`vs-toggle${on ? ' is-on' : ''}`} onClick={onChange}>
      <span className="vs-toggle-knob" />
    </button>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(null as unknown as GameState);
  const gameEngineRef = useRef<typeof import('./game/engine') | null>(null);
  const gameEngineLoadRef = useRef<Promise<typeof import('./game/engine')> | null>(null);
  const startRunPendingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const canvasSizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  // true quando i premi e le statistiche della partita corrente sono gia' stati salvati
  const runFinalizedRef = useRef(true);
  const lastModeRef = useRef<GameMode>('normal');

  const [screen, setScreen] = useState<Screen>('home');
  const [gameOver, setGameOver] = useState(false);
  const [levelUpPending, setLevelUpPending] = useState(false);
  const [levelUpChoices, setLevelUpChoices] = useState<LevelUpChoice[]>([]);
  const [finalStats, setFinalStats] = useState<FinalStats>({ score: 0, time: 0, kills: 0, level: 0, wave: 0, coins: 0, diamonds: 0, points: 0, victory: false });
  const [paused, setPaused] = useState(false);
  const [upgradeTab, setUpgradeTab] = useState<'general' | 'active' | 'passive'>('general');
  const [store, setStore] = useState<GameStore>(loadStore);
  // Copia sempre aggiornata dello store: il game loop altrimenti userebbe una copia vecchia
  // e a fine partita sovrascriverebbe acquisti/miglioramenti fatti nel frattempo.
  const storeRef = useRef(store);
  storeRef.current = store;
  const [customMusicLoaded, setCustomMusicLoaded] = useState(false);
  const [customMusicName, setCustomMusicName] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [doubleCoinsClaimed, setDoubleCoinsClaimed] = useState(false);
  const [revivePending, setRevivePending] = useState(false);
  const [showDamageStats, setShowDamageStats] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [gameLoadError, setGameLoadError] = useState(false);
  const [showDailyRewardModal, setShowDailyRewardModal] = useState(false);
  const [showDailyEventsModal, setShowDailyEventsModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialOpenRef = useRef(false);
  const [adNotice, setAdNotice] = useState('');
  const [chestRewards, setChestRewards] = useState<ChestReward[] | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState(0);

  const pausedRef = useRef(false);
  const levelUpShownRef = useRef(false);
  const gameOverShownRef = useRef(false);
  const reviveShownRef = useRef(false);
  const chestShownRef = useRef(false);
  const platformPausedRef = useRef(false); // pausa richiesta da Playgama
  // Dopo la pubblicita' per rinascere: conto alla rovescia di 3 s, poi il gioco riparte da solo
  const [reviveCountdown, setReviveCountdown] = useState(0);
  const countdownRef = useRef(0);
  const adGuardUntilRef = useRef(0); // ignora la pausa automatica causata dalla finestra della pubblicita'
  const joystickRef = useRef<{ active: boolean; id: number | null; startX: number; startY: number; currentX: number; currentY: number }>({
    active: false, id: null, startX: 0, startY: 0, currentX: 0, currentY: 0
  });

  const lang = store.settings.language;
  // solo in sviluppo: accesso allo stato della partita per i test automatici
  if (import.meta.env.DEV) (window as any).__vsGame = gameStateRef;

  // Salvataggi arrivati dopo l'avvio (piattaforma lenta): si ricaricano i progressi veri al posto di quelli di default
  useEffect(() => {
    const onLate = () => { const s = loadStore(); storeRef.current = s; setStore(s); };
    window.addEventListener(STORAGE_LATE_EVENT, onLate);
    return () => window.removeEventListener(STORAGE_LATE_EVENT, onLate);
  }, []);

  // Tema chiaro/scuro: attributo su <html> (il CSS fa il resto; "auto" segue il dispositivo)
  const theme = store.settings.theme || 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Banner su tutte le schermate (ai lati su computer larghi, striscia in basso altrove: vedi playgame.ts)
  useEffect(() => {
    playgama.setSideBanners(screen === 'home' ? 'menu' : screen === 'playing' ? 'gameplay' : 'pages');
  }, [screen]);

  useEffect(() => {
    setSfxVolume(store.settings.sfxVolume);
    setMusicVolume(store.settings.musicVolume);
    setCustomMusicLoaded(hasCustomMusic());

    playgama.initialize().then(() => {
      if (playgama.isInitialized()) {
        // Pausa e audio richiesti dalla piattaforma (obbligatorio per la moderazione Playgama)
        playgama.onPauseChanged((isPaused) => { platformPausedRef.current = isPaused; setAudioPaused(isPaused || pausedRef.current); });
        playgama.onAudioChanged((enabled) => {
          const s = storeRef.current.settings;
          if (enabled) { setSfxVolume(s.sfxVolume); setMusicVolume(s.musicVolume); }
          else { setSfxVolume(0); setMusicVolume(0); }
        });
        // Checklist Playgama: la lingua si sceglie da sola da quella della piattaforma (finche' il giocatore non la cambia)
        const pl = playgama.getLanguage();
        const cur = storeRef.current;
        if (pl && !cur.settings.languageChosen && (Object.keys(languageNames) as string[]).includes(pl) && cur.settings.language !== pl) {
          commitStore({ ...cur, settings: { ...cur.settings, language: pl as Language } });
        }
        playgama.sendGameReady();
      }
    }).catch((error: any) => {
      console.error('[App] Playgama SDK non disponibile:', error);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const connectAuth = async () => {
      try {
        const auth = await import('./game/auth');
        if (cancelled) return;
        unsubscribe = auth.observeAuth(async (user: any) => {
          if (user) {
            const currentStore = loadStore();
            const userId = user.uid || user.id;
            const userEmail = user.email || '';
            const userName = user.displayName || user.user_metadata?.username || user.user_metadata?.full_name || 'Player';
            const userAvatar = user.photoURL || user.user_metadata?.avatar_url || '👤';
            const userData = await auth.loadUserData(userId);

            if (userData) {
              const mergedStore = {
                ...currentStore,
                coins: userData.coins ?? currentStore.coins,
                diamonds: userData.diamonds ?? currentStore.diamonds,
                points: userData.points ?? currentStore.points,
                stats: { ...currentStore.stats, ...(userData.stats || {}) },
                upgrades: { ...currentStore.upgrades, ...(userData.upgrades || {}) },
                abilityAttackLevels: { ...currentStore.abilityAttackLevels, ...(userData.abilityAttackLevels || {}) },
                ships: { ...currentStore.ships, ...(userData.ships || {}) },
                currentShip: userData.currentShip || currentStore.currentShip,
                settings: { ...currentStore.settings, ...(userData.settings || {}) }
              };
              // Mantiene il profilo locale (nome scelto, avatar, statistiche, obiettivi): prima veniva ricreato da zero
              const base = currentStore.userProfile || createUserProfile(userEmail, userName, userAvatar);
              const profile = { ...base, id: userId, highScores: (base.highScores && base.highScores.length ? base.highScores : userData.highScores) || [] };
              const newStore = saveUserProfile(mergedStore, profile);
              setStore(newStore);
            } else if (!currentStore.userProfile || currentStore.userProfile.id !== userId) {
              const profile = { ...(currentStore.userProfile || createUserProfile(userEmail, userName, userAvatar)), id: userId };
              const newStore = saveUserProfile(currentStore, profile);
              setStore(newStore);
              await auth.saveUserData(userId, newStore);
            }
          }
          // Nessun utente collegato: il profilo locale resta com'e' (prima veniva cancellato a ogni avvio,
          // per questo il nome scelto nel profilo non restava salvato)
        });
      } catch (error) {
        console.error('[App] Authentication could not be initialized:', error);
      }
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => void connectAuth(), { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(() => void connectAuth(), 900);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const saveDataToFirestore = async () => {
      if (store.userProfile && store.userProfile.id) {
        try {
          const { saveUserData } = await import('./game/auth');
          await saveUserData(store.userProfile.id, store);
        } catch (error: any) {
          console.error('Errore salvataggio dati su Firestore:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveDataToFirestore, 1000);
    return () => clearTimeout(timeoutId);
  }, [store.coins, store.diamonds, store.points, store.stats, store.upgrades, store.abilityAttackLevels, store.ships, store.currentShip, store.userProfile?.highScores]);

  useEffect(() => {
    if (!gameOver) return undefined;
    const timer = setTimeout(() => {
      try { playgama.showInterstitial('game_over'); } catch { /* l'interstitial non e' critico */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, [gameOver]);

  // Timer del boost x2: scorre in tempo reale (non influenzato dal moltiplicatore di velocita')
  useEffect(() => {
    if (store.settings.speedBoostTimer <= 0 || store.settings.speedBoostPaused) return undefined;
    const interval = setInterval(() => {
      const current = storeRef.current;
      const newTimer = Math.max(0, current.settings.speedBoostTimer - 1);
      let newStore: GameStore = newTimer <= 0
        ? { ...current, settings: { ...current.settings, speedMultiplier: 1.0, speedBoostTimer: 0, speedBoostPaused: false } }
        : { ...current, settings: { ...current.settings, speedBoostTimer: newTimer } };
      // Controlla gli obiettivi ogni 10 secondi
      if (newTimer % 10 === 0 && newStore.userProfile) {
        newStore = { ...newStore, userProfile: checkAndCompleteAchievements(newStore.userProfile as any, newTimer) as any };
      }
      saveStore(newStore);
      storeRef.current = newStore;
      setStore(newStore);
    }, 1000);
    return () => clearInterval(interval);
  }, [store.settings.speedBoostTimer > 0, store.settings.speedBoostPaused]);

  const commitStore = useCallback((ns: GameStore) => {
    saveStore(ns);
    storeRef.current = ns;
    setStore(ns);
  }, []);

  const handleMusicFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { await loadCustomMusic(file); setCustomMusicLoaded(true); setCustomMusicName(file.name); }
    catch (error: any) { console.error(error); }
  };

  const updateSetting = <K extends keyof GameStore['settings']>(key: K, value: GameStore['settings'][K]) => {
    const current = storeRef.current;
    commitStore({ ...current, settings: { ...current.settings, [key]: value } });
  };

  const showAdNotice = useCallback(() => {
    setAdNotice(L(storeRef.current.settings.language, 'Pubblicità non disponibile in questo momento', 'Ads are not available right now', 'Anuncios no disponibles ahora', 'Publicités indisponibles pour le moment', '广告暂时不可用'));
    window.setTimeout(() => setAdNotice(''), 2500);
  }, []);

  const ensureGameEngine = useCallback(async () => {
    if (gameEngineRef.current) return gameEngineRef.current;
    if (gameEngineLoadRef.current) return gameEngineLoadRef.current;
    setIsStartingGame(true);
    setGameLoadError(false);
    const engineLoad = import('./game/engine');
    gameEngineLoadRef.current = engineLoad;
    try {
      const engine = await engineLoad;
      gameEngineRef.current = engine;
      return engine;
    } catch (error) {
      setGameLoadError(true);
      console.error('[App] Unable to load the game engine:', error);
      throw error;
    } finally {
      gameEngineLoadRef.current = null;
      setIsStartingGame(false);
    }
  }, []);

  // Precarica il motore di gioco quando il browser e' libero: "Inizia" parte subito.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const load = () => { void import('./game/engine').then((engine) => { gameEngineRef.current = engine; }).catch(() => {}); };
    if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 3000 });
    else window.setTimeout(load, 1500);
  }, []);

  /** Accredita premi e statistiche della partita corrente (una sola volta per partita). */
  const finalizeRun = useCallback(() => {
    const state = gameStateRef.current;
    if (runFinalizedRef.current || !state) return;
    runFinalizedRef.current = true;
    trackRunEnd(state, state.victory ? 'victory' : state.gameOver ? 'death' : 'quit');

    const score = state.kills * 10 + Math.floor(state.time) * 5;
    let ns: GameStore = {
      ...storeRef.current,
      coins: storeRef.current.coins + state.coinsEarned,
      diamonds: storeRef.current.diamonds + state.diamondsEarned,
      points: storeRef.current.points + state.player.points,
    };
    if (!ns.userProfile) ns = { ...ns, userProfile: createUserProfile('local@player.com', 'Giocatore Locale', '🎮') };
    ns = addHighScore(ns, score, state.kills, state.time, state.player.level);

    const p = ns.userProfile!;
    // Boss Rush: non conta per gli obiettivi (ne' per i contatori su cui si basano); restano solo i danni per arma
    const bossRush = state.gameMode === 'boss_rush';
    let profile: any = bossRush ? {
      ...p,
      abilityDamageStats: {
        ...(p.abilityDamageStats || {}),
        ...Object.fromEntries(Object.entries(state.abilityDamageStats || {}).map(([key, value]) => [key, (p.abilityDamageStats?.[key] || 0) + (value as number)])),
      },
    } : {
      ...p,
      totalKills: (p.totalKills || 0) + state.kills,
      totalBossesDefeated: (p.totalBossesDefeated || 0) + (state.bossesDefeated || 0),
      abilityDamageStats: {
        ...(p.abilityDamageStats || {}),
        ...Object.fromEntries(Object.entries(state.abilityDamageStats || {}).map(([key, value]) => [key, (p.abilityDamageStats?.[key] || 0) + (value as number)])),
      },
      currentKills: state.kills,
      currentPlayTime: state.time,
      currentLevel: state.player.level,
      currentScore: state.score,
      currentWave: state.wave,
      totalPlayTime: (p.totalPlayTime || 0) + state.time,
      totalGamesPlayed: (p.totalGamesPlayed || 0) + 1,
      maxLevel: Math.max(p.maxLevel || 0, state.player.level),
      maxScore: Math.max(p.maxScore || 0, state.score),
      maxWave: Math.max(p.maxWave || 0, state.wave),
    };
    if (!bossRush) profile = checkAndCompleteAchievements(profile, ns.settings.speedBoostTimer);
    ns = { ...ns, userProfile: profile };
    commitStore(ns);
    try {
      recordRunForDailyChallenges({ kills: state.kills, time: state.time, level: state.player.level, wave: state.wave, bosses: state.bossesDefeated || 0, coins: state.coinsEarned, chests: state.chestsOpened || 0, evolutions: state.evolutionsDone || 0, bossRush: state.gameMode === 'boss_rush' });
    } catch (error) { console.warn('[App] Sfide giornaliere non aggiornate:', error); }

    void import('./game/auth')
      .then(({ saveGlobalScore }) => saveGlobalScore(p.id, p.name, p.avatar, score, state.kills, state.time, state.player.level))
      .catch((err: any) => console.error('[App] Errore salvataggio punteggio globale:', err));
  }, [commitStore]);

  // Modalita' leggera automatica: se durante la partita gli fps restano sotto 42 per 6 secondi,
  // niente bagliori, meno particelle e risoluzione piu' bassa (per il resto della sessione)
  const lowFxRef = useRef(false);
  const perfRef = useRef({ acc: 0, n: 0, slow: 0 });

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || window.innerWidth || 800;
    const h = canvas.clientHeight || window.innerHeight || 600;
    // Nitido sugli schermi ad alta densita', ma con un tetto di pixel per non rallentare i telefoni
    const maxDpr = Math.sqrt((lowFxRef.current ? 1_000_000 : 2_400_000) / Math.max(1, w * h));
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, maxDpr));
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    canvasSizeRef.current = { w, h, dpr };
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (!runningRef.current) return;
    try {
      const engine = gameEngineRef.current;
      const state = gameStateRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (engine && state && canvas && ctx) {
        if (canvasSizeRef.current.w === 0) resizeCanvas();
        const { w, h, dpr } = canvasSizeRef.current;
        const settings = storeRef.current.settings;
        const rawMs = timestamp - lastTimeRef.current;
        const dt = Math.min(Math.max(0, rawMs / 1000), 0.05);
        lastTimeRef.current = timestamp;

        state.speedMultiplier = settings.speedMultiplier || 1;
        const active = !pausedRef.current && !tutorialOpenRef.current && countdownRef.current <= 0 && !platformPausedRef.current && !state.gameOver && !state.levelUpPending && !state.revivePending && !state.chestPending;
        if (active) { engine.updateGame(state, dt); trackFrame(state); }
        if (active && !lowFxRef.current && rawMs > 0 && rawMs < 250) {
          const pf = perfRef.current; pf.acc += rawMs; pf.n++;
          if (pf.acc >= 3000) {
            pf.slow = pf.n * 1000 / pf.acc < 42 ? pf.slow + 1 : 0; pf.acc = 0; pf.n = 0;
            if (pf.slow >= 2) { lowFxRef.current = true; resizeCanvas(); }
          }
        }
        (state as any).lowFx = lowFxRef.current;
        trackPerfFrame(rawMs, active);

        if (state.chestPending && !chestShownRef.current) {
          chestShownRef.current = true;
          setChestRewards([...state.chestPending]);
        }

        if (state.levelUpPending && !levelUpShownRef.current) {
          levelUpShownRef.current = true;
          setLevelUpChoices([...state.levelUpChoices]);
          setRerollsLeft(state.rerolls || 0);
          setLevelUpPending(true);
        }
        if (state.revivePending && !reviveShownRef.current) {
          reviveShownRef.current = true;
          if (playgama.isRewardedSupported()) setRevivePending(true);
          else { state.revivePending = false; state.gameOver = true; } // niente pubblicita': la partita finisce
        }
        if (state.gameOver && !gameOverShownRef.current) {
          gameOverShownRef.current = true;
          setRevivePending(false);
          setFinalStats({
            score: state.kills * 10 + Math.floor(state.time) * 5, time: state.time, kills: state.kills,
            level: state.player.level, wave: state.wave, coins: state.coinsEarned, diamonds: state.diamondsEarned,
            points: state.player.points, victory: !!state.victory,
          });
          finalizeRun();
          setGameOver(true);
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        engine.renderGame(ctx, state, w, h, settings.language, settings.showDamageNumbers);

        if (settings.useJoystick) {
          const joy = joystickRef.current;
          const baseR = 56, knobR = 26;
          const jx = joy.active ? joy.startX : 84;
          const jy = joy.active ? joy.startY : h - (w < 768 ? 190 : 120);
          let kx = jx, ky = jy;
          if (joy.active) {
            const dx = joy.currentX - joy.startX, dy = joy.currentY - joy.startY;
            const d = Math.hypot(dx, dy);
            const k = d > baseR ? baseR / d : 1;
            kx = jx + dx * k; ky = jy + dy * k;
          }
          ctx.save();
          ctx.globalAlpha = joy.active ? 1 : 0.55;
          ctx.beginPath(); ctx.arc(jx, jy, baseR, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(8, 10, 26, 0.45)'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(98, 245, 207, 0.55)'; ctx.stroke();
          const g = ctx.createRadialGradient(kx - 8, ky - 8, 4, kx, ky, knobR);
          g.addColorStop(0, '#9ffbe6'); g.addColorStop(1, '#22d3ee');
          ctx.beginPath(); ctx.arc(kx, ky, knobR, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.globalAlpha *= 0.85; ctx.fill();
          ctx.restore();
        }
      }
    } catch (error: any) { console.error('Game loop error:', error); }
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [finalizeRun, resizeCanvas]);

  const stopGameLoop = useCallback(() => {
    runningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const startRun = useCallback(async (mode: GameMode) => {
    if (startRunPendingRef.current) return;
    startRunPendingRef.current = true;
    resumeAudio();
    try {
      const engine = await ensureGameEngine();
      finalizeRun(); // sicurezza: la partita precedente viene sempre accreditata una sola volta
      const s = storeRef.current;
      const newState = engine.createInitialState(s.currentShip as any, mode);
      // Potenziamenti del negozio: non valgono nella Boss Rush (senza nemici normali la renderebbero troppo facile)
      if (mode !== 'boss_rush') {
        newState.player.maxHp = s.stats.maxHp || 100;
        newState.player.hp = s.stats.maxHp || 100;
        newState.player.damage = s.stats.attack || 10;
        newState.player.speed = s.stats.shipSpeed || 200;
        newState.player.armor = s.stats.defense || 0;
        newState.player.regenPerSecond = s.stats.regeneration || 0;
        newState.player.luckBonus = (s.stats.luck || 0) / 100;
        newState.player.expBonus = (s.stats.expBonus || 0) / 100;
        newState.player.critChance = s.stats.critChance || 0;
        newState.player.critDamage = s.stats.critDamage || 150;
        newState.player.abilityAttackBonuses = { ...s.abilityAttackLevels };
      } else {
        // Boss Rush: niente potenziamenti, ma si parte con 300 di vita
        newState.player.maxHp = 300;
        newState.player.hp = 300;
      }
      newState.speedMultiplier = s.settings.speedMultiplier || 1;

      lastModeRef.current = mode;
      gameStateRef.current = newState;
      runFinalizedRef.current = false;
      pausedRef.current = false;
      gameOverShownRef.current = false;
      levelUpShownRef.current = false;
      reviveShownRef.current = false;
      chestShownRef.current = false;
      setChestRewards(null);
      joystickRef.current = { active: false, id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 };
      setShowModeSelection(false);
      setGameOver(false);
      setLevelUpPending(false);
      setLevelUpChoices([]);
      setPaused(false);
      setDoubleCoinsClaimed(false);
      setRevivePending(false);
      setShowDamageStats(false);
      setScreen('playing');
      setAudioPaused(false);
      startBackgroundMusic();
      trackRunStart(mode);
      if (!s.settings.tutorialDone) { tutorialOpenRef.current = true; setShowTutorial(true); }
    } catch (error) {
      setGameLoadError(true);
      setShowModeSelection(true);
      setScreen('home');
      console.error('[App] Unable to start a run:', error);
    } finally {
      startRunPendingRef.current = false;
    }
  }, [ensureGameEngine, finalizeRun]);

  const retryRun = useCallback(() => startRun(lastModeRef.current), [startRun]);

  const endRun = useCallback(() => {
    finalizeRun();
    stopGameLoop();
    pausedRef.current = false;
    setPaused(false);
    setGameOver(false);
    setLevelUpPending(false);
    setRevivePending(false);
    setShowDamageStats(false);
    stopBackgroundMusic(); // la musica della partita si ferma quando si torna alla home
    setAudioPaused(false);
    setScreen('home');
  }, [finalizeRun, stopGameLoop]);

  const handleLevelUpChoice = useCallback((choice: LevelUpChoice) => {
    const state = gameStateRef.current;
    if (!state || !state.levelUpPending) return;
    gameEngineRef.current?.applyLevelUpChoice(state, choice);
    levelUpShownRef.current = false; setLevelUpPending(false); setLevelUpChoices([]);
  }, []);

  const handleReroll = useCallback(() => {
    const state = gameStateRef.current;
    if (state && gameEngineRef.current?.rerollLevelUp(state)) {
      setLevelUpChoices([...state.levelUpChoices]);
      setRerollsLeft(state.rerolls || 0);
    }
  }, []);

  const closeChest = useCallback(() => {
    const state = gameStateRef.current;
    if (state) state.chestPending = null;
    chestShownRef.current = false;
    setChestRewards(null);
  }, []);

  // Dopo una pubblicita' la pagina di Playgama si tiene il "focus": i tasti non arrivavano piu' al gioco
  // finche' non si cliccava. Lo riportiamo noi sul gioco.
  const focusGame = useCallback(() => {
    try { window.focus(); } catch { /* ignora */ }
    try { canvasRef.current?.focus({ preventScroll: true }); } catch { /* ignora */ }
    const st = gameStateRef.current; if (st) { st.keys.clear(); st.touchDir = null; }
  }, []);

  const handleRevive = useCallback(async () => {
    const state = gameStateRef.current;
    try {
      adGuardUntilRef.current = Number.POSITIVE_INFINITY;
      const rewarded = await playgama.showRewarded('revive');
      adGuardUntilRef.current = performance.now() + 1500;
      if (rewarded) {
        gameEngineRef.current?.revivePlayer(state);
        reviveShownRef.current = false;
        setRevivePending(false);
        // la pubblicita' puo' aver messo in pausa il gioco: si riparte da soli dopo 3, 2, 1
        pausedRef.current = false;
        setPaused(false);
        platformPausedRef.current = false;
        resumeAudio();
        setAudioPaused(false);
        state.keys?.clear?.(); state.touchDir = null;
        countdownRef.current = 3;
        setReviveCountdown(3);
        const tick = () => {
          countdownRef.current -= 1;
          setReviveCountdown(countdownRef.current);
          if (countdownRef.current > 0) window.setTimeout(tick, 1000);
          else { pausedRef.current = false; setPaused(false); platformPausedRef.current = false; focusGame(); }
        };
        window.setTimeout(tick, 1000);
        focusGame();
        return;
      }
    } catch (error: any) {
      console.error('Errore revive ad:', error);
    }
    adGuardUntilRef.current = performance.now() + 1500;
    state.revivePending = false;
    state.gameOver = true;
    setRevivePending(false);
  }, []);

  const handleReviveDecline = useCallback(() => {
    const state = gameStateRef.current;
    state.revivePending = false;
    state.gameOver = true;
    setRevivePending(false);
  }, []);

  const setPausedState = useCallback((value: boolean) => {
    pausedRef.current = value;
    setPaused(value);
    setAudioPaused(value || platformPausedRef.current);
  }, []);

  const togglePause = useCallback(() => {
    const state = gameStateRef.current;
    if (tutorialOpenRef.current || countdownRef.current > 0 || !state || state.gameOver || state.levelUpPending || state.revivePending) return;
    setPausedState(!pausedRef.current);
  }, [setPausedState]);

  const closeTutorial = useCallback((completed: boolean = true, step: number = 0) => {
    trackTutorial(completed, step);
    tutorialOpenRef.current = false;
    setShowTutorial(false);
    const current = storeRef.current;
    if (!current.settings.tutorialDone) commitStore({ ...current, settings: { ...current.settings, tutorialDone: true } });
  }, [commitStore]);

  const claimDoubleCoins = useCallback(async () => {
    if (!playgama.isRewardedSupported()) { showAdNotice(); return; }
    try {
      const rewarded = await playgama.showRewarded('double_coins');
      if (rewarded) {
        const current = storeRef.current;
        commitStore({ ...current, coins: current.coins + finalStats.coins });
        setDoubleCoinsClaimed(true);
      }
    } catch (error: any) {
      console.error('[Double Coins] Errore rewarded ad:', error);
    }
  }, [commitStore, finalStats.coins, showAdNotice]);

  const watchSpeedAd = useCallback(async () => {
    if (!playgama.isRewardedSupported()) { showAdNotice(); return; }
    try {
      const rewarded = await playgama.showRewarded('speed_boost');
      if (!rewarded) return;
      const current = storeRef.current;
      const watched = current.settings.adsWatchedForSpeed + 1;
      if (watched >= 5) {
        const newTimer = Math.min((current.settings.speedBoostTimer || 0) + 600, 86400); // +10 minuti, max 24 ore
        commitStore({ ...current, settings: { ...current.settings, speedMultiplier: 2.0, speedBoostTimer: newTimer, speedBoostPaused: false, adsWatchedForSpeed: 0 } });
      } else {
        commitStore({ ...current, settings: { ...current.settings, adsWatchedForSpeed: watched } });
      }
    } catch (error) {
      console.error('[Speed Boost] Errore durante la pubblicità:', error);
    }
  }, [commitStore, showAdNotice]);

  // Game loop: parte quando si entra nella schermata di gioco e si ferma quando si esce (un solo ciclo attivo)
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (ro && canvasRef.current) ro.observe(canvasRef.current);
    runningRef.current = true;
    lastTimeRef.current = performance.now();
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [screen, gameLoop, resizeCanvas]);

  // Tastiera, touch e pausa automatica
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const canvas = canvasRef.current;
    if (canvas) playgama.registerCanvas(canvas);
    const MOVE_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (!state) return;
      const key = e.key.toLowerCase();
      if (MOVE_KEYS.has(key)) e.preventDefault();
      if (!e.repeat && key === 'p') { togglePause(); return; }
      if (state.chestPending && !e.repeat && (key === 'enter' || key === ' ')) { closeChest(); return; }
      if (state.levelUpPending && !e.repeat && key === 'r') { handleReroll(); return; }
      if (state.levelUpPending && !e.repeat && ['1', '2', '3'].includes(key)) {
        const choice = state.levelUpChoices[Number(key) - 1];
        if (choice) handleLevelUpChoice(choice);
        return;
      }
      state.keys.add(key);
    };
    const handleKeyUp = (e: KeyboardEvent) => { gameStateRef.current?.keys.delete(e.key.toLowerCase()); };
    const clearInput = () => {
      const state = gameStateRef.current;
      if (state) { state.keys.clear(); state.touchDir = null; }
      joystickRef.current = { ...joystickRef.current, active: false, id: null };
    };
    const handleVisibility = () => {
      if (document.hidden) {
        clearInput();
        const state = gameStateRef.current;
        if (state && !state.gameOver && !state.levelUpPending && !state.revivePending && !pausedRef.current && countdownRef.current <= 0 && performance.now() > adGuardUntilRef.current) setPausedState(true);
      }
    };

    // Touch: trascina il dito in qualsiasi punto per muovere la nave (controllo analogico)
    const MAX_DRAG = 56;
    const updateTouchDir = () => {
      const joy = joystickRef.current;
      const state = gameStateRef.current;
      if (!state) return;
      const dx = joy.currentX - joy.startX, dy = joy.currentY - joy.startY;
      const d = Math.hypot(dx, dy);
      if (d < 8) { state.touchDir = null; return; }
      const k = Math.min(1, d / MAX_DRAG) / d;
      state.touchDir = { x: dx * k, y: dy * k };
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (joystickRef.current.id !== null) return;
      const touch = e.changedTouches[0];
      joystickRef.current = { active: true, id: touch.identifier, startX: touch.clientX, startY: touch.clientY, currentX: touch.clientX, currentY: touch.clientY };
      resumeAudio();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const joy = joystickRef.current;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier !== joy.id) continue;
        joy.currentX = touch.clientX; joy.currentY = touch.clientY;
        // il centro segue il dito se si trascina oltre il bordo: cambiare direzione e' immediato
        const dx = joy.currentX - joy.startX, dy = joy.currentY - joy.startY;
        const d = Math.hypot(dx, dy);
        if (d > MAX_DRAG * 1.6) { const k = (d - MAX_DRAG * 1.6) / d; joy.startX += dx * k; joy.startY += dy * k; }
        updateTouchDir();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const joy = joystickRef.current;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joy.id) { clearInput(); break; }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', handleVisibility);
    canvas?.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas?.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas?.addEventListener('touchend', onTouchEnd);
    canvas?.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas?.removeEventListener('touchstart', onTouchStart);
      canvas?.removeEventListener('touchmove', onTouchMove);
      canvas?.removeEventListener('touchend', onTouchEnd);
      canvas?.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [screen, togglePause, handleLevelUpChoice, setPausedState, closeChest, handleReroll]);

  // Se compare un pannello (level up, pausa, ecc.) il dito sollevato sopra di esso non arriva al canvas
  useEffect(() => {
    if (levelUpPending || paused || gameOver || revivePending || chestRewards) {
      const state = gameStateRef.current;
      if (state) { state.keys.clear(); state.touchDir = null; }
      joystickRef.current = { ...joystickRef.current, active: false, id: null };
    }
  }, [levelUpPending, paused, gameOver, revivePending, chestRewards]);

  useEffect(() => () => { stopGameLoop(); }, [stopGameLoop]);

  useEffect(() => {
    document.getElementById('root')?.scrollTo?.(0, 0);
    // Controlla gli obiettivi quando il giocatore torna alla home (completamento retroattivo)
    const current = storeRef.current;
    if (screen === 'home' && current.userProfile) {
      const profile = { ...current.userProfile };
      const updatedProfile = checkAndCompleteAchievements(profile as any, current.settings.speedBoostTimer) as any;
      if (JSON.stringify(profile) !== JSON.stringify(updatedProfile)) commitStore({ ...current, userProfile: updatedProfile });
    }
  }, [screen, commitStore]);

  const goTo = (next: Screen) => { setShowModeSelection(false); setScreen(next); };

  // ---------------------------------------------------------------------------
  // SELEZIONE MODALITA'
  // ---------------------------------------------------------------------------
  if (showModeSelection && screen === 'home') {
    const maxWaveReached = store.userProfile?.maxWave || 0;
    const modes = [
      {
        id: 'normal' as const, unlocked: true, need: 0, accent: 'teal',
        title: t(lang, 'normal_mode'), desc: t(lang, 'normal_mode_desc'),
        art: <ShipIcon shipType={store.currentShip} color="#62f5cf" size={96} className="vs-mode-ship" eager />,
        badge: maxWaveReached > 0 ? `${t(lang, 'best_wave')}: ${maxWaveReached}` : clean(t(lang, 'mode_unlocked')),
      },
      {
        id: 'boss_rush' as const, unlocked: maxWaveReached >= 5, need: 5, accent: 'red',
        title: t(lang, 'boss_rush'), desc: `${t(lang, 'boss_rush_desc')} ${L(lang, 'Potenziamenti del negozio disattivati.', 'Shop upgrades disabled.', 'Mejoras de la tienda desactivadas.', 'Améliorations de la boutique désactivées.', '商店升级不生效。')}`,
        art: (
          <div className="vs-mode-bosses">
            {BOSS_ICON_LIST.map((b) => (
              <img key={b} src={`${ASSET_BASE_URL}assets/icons/${b}.webp`} alt="" width={40} height={40} loading="lazy" decoding="async" draggable={false} />
            ))}
          </div>
        ),
        badge: clean(t(lang, 'mode_unlocked')),
      },
      {
        id: 'endless' as const, unlocked: maxWaveReached >= 40, need: 40, accent: 'violet',
        title: t(lang, 'endless_mode'), desc: t(lang, 'endless_mode_desc'),
        art: <div className="vs-mode-glyph"><InfinityIcon size={64} strokeWidth={1.6} /></div>,
        badge: clean(t(lang, 'mode_unlocked')),
      },
    ];

    return (
      <div className="vs-screen vs-screen--mode">
        <TopBar title={t(lang, 'select_mode')} onBack={() => setShowModeSelection(false)} lang={lang} right={<Currency store={store} compact />} />
        <main className="vs-content vs-content--center">
          <p className="vs-eyebrow">{L(lang, 'SCEGLI LA TUA MISSIONE', 'SELECT YOUR MISSION', 'ELIGE TU MISIÓN', 'CHOISIS TA MISSION', '选择你的任务')}</p>
          <div className="vs-mode-grid">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`vs-mode-card vs-accent-${m.accent}${m.unlocked ? '' : ' is-locked'}`}
                disabled={!m.unlocked || isStartingGame}
                onClick={() => m.unlocked && startRun(m.id)}
              >
                <div className="vs-mode-art">{m.art}{!m.unlocked && <span className="vs-mode-lock"><Lock size={26} /></span>}</div>
                <h2 className="vs-mode-title">{m.title}</h2>
                <p className="vs-mode-desc">{m.desc}</p>
                {m.unlocked ? (
                  <span className="vs-mode-badge"><Check size={14} />{m.badge}</span>
                ) : (
                  <span className="vs-mode-progress">
                    <span className="vs-mode-progress-label">
                      {lang === 'pl' ? `Odblokuj na fali ${m.need}` : L(lang, `Sblocca all'ondata ${m.need}`, `Unlock at wave ${m.need}`, `Desbloquear en la oleada ${m.need}`, `Débloquer à la vague ${m.need}`, `第${m.need}波解锁`)}
                      <b>{Math.min(maxWaveReached, m.need)}/{m.need}</b>
                    </span>
                    <span className="vs-progress"><span style={{ width: `${Math.min(100, (maxWaveReached / m.need) * 100)}%` }} /></span>
                  </span>
                )}
                {m.unlocked && <span className="vs-mode-cta"><Play size={16} fill="currentColor" />{L(lang, 'GIOCA', 'PLAY', 'JUGAR', 'JOUER', '开始')}</span>}
              </button>
            ))}
          </div>
          {isStartingGame && (
            <div className="vs-status" role="status" aria-live="polite">
              <span className="vs-spinner" aria-hidden="true" />
              {L(lang, 'Preparazione partita…', 'Preparing your run…', 'Preparando partida…', 'Préparation de la partie…', '正在准备游戏…')}
            </div>
          )}
          {gameLoadError && !isStartingGame && (
            <p className="vs-error" role="alert">
              {L(lang, 'Impossibile caricare la partita. Controlla la connessione e riprova.', 'Could not load the game. Check your connection and try again.', 'No se pudo cargar la partida. Comprueba la conexión e inténtalo de nuevo.', 'Impossible de charger la partie. Vérifiez votre connexion et réessayez.', '无法加载游戏。请检查网络连接后重试。')}
            </p>
          )}
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // HOME
  // ---------------------------------------------------------------------------
  if (screen === 'home') {
    const missionsClaimable = countClaimable();
    // pallino sul regalo finche' la ricompensa di oggi non e' stata presa
    let dailyReady = false; try { dailyReady = hasUnclaimedReward(getLoginRewardsState()); } catch { /* ignora */ }
    const unclaimedAchievements = store.userProfile?.completedAchievements?.filter(c => !c.claimed).length || 0;
    const currentShipInfo = SHIPS.find(s => s.type === store.currentShip) || SHIPS[0];
    const boostActive = store.settings.speedMultiplier === 2 && store.settings.speedBoostTimer > 0 && !store.settings.speedBoostPaused;
    const boostPaused = store.settings.speedBoostPaused && store.settings.speedBoostTimer > 0;
    const dock = [
      { key: 'daily', label: clean(t(lang, 'daily_reward')), icon: <Gift size={20} />, onClick: () => setShowDailyRewardModal(true), tone: 'gold', badge: dailyReady ? 1 : 0 },
      { key: 'events', label: clean(t(lang, 'daily_events')), icon: <CalendarDays size={20} />, onClick: () => setShowDailyEventsModal(true), tone: 'green', badge: missionsClaimable },
      { key: 'achievements', label: clean(t(lang, 'achievements')), icon: <Target size={20} />, onClick: () => setShowAchievementsModal(true), tone: 'orange', badge: unclaimedAchievements },
      { key: 'speed', label: clean(t(lang, 'speed_select')), icon: <Zap size={20} />, onClick: () => setShowSpeedModal(true), tone: 'cyan' },
      { key: 'leaderboard', label: clean(t(lang, 'leaderboard')), icon: <Trophy size={20} />, onClick: () => setShowLeaderboardModal(true), tone: 'gold' },
      { key: 'profile', label: clean(t(lang, 'profile')), icon: <UserRound size={20} />, onClick: () => setShowProfileModal(true), tone: 'violet' },
    ];

    return (
      <div className="vs-screen vs-screen--home">
        <header className="vs-home-top">
          <button type="button" className="vs-profile-pill" onClick={() => setShowProfileModal(true)}>
            <span className="vs-profile-avatar">{store.userProfile?.avatar && !store.userProfile.avatar.startsWith('http') && !store.userProfile.avatar.startsWith('data:') ? store.userProfile.avatar : <UserRound size={18} />}</span>
            <span className="vs-profile-name">{store.userProfile?.name && store.userProfile.name !== 'Giocatore Locale' ? store.userProfile.name : L(lang, 'Pilota', 'Pilot', 'Piloto', 'Pilote', '飞行员')}</span>
          </button>
          <div className="vs-home-top-right">
            {(boostActive || boostPaused) && (
              <button
                type="button"
                className={`vs-chip vs-chip--boost${boostPaused ? ' is-paused' : ''}`}
                title={clean(t(lang, 'speed_boost_active'))}
                onClick={() => {
                  const current = storeRef.current;
                  commitStore({ ...current, settings: { ...current.settings, speedMultiplier: boostPaused ? 2.0 : 1.0, speedBoostPaused: !boostPaused } });
                }}
              >
                {boostPaused ? <Play size={14} /> : <Zap size={14} />}x2 · {formatTime(store.settings.speedBoostTimer)}
              </button>
            )}
            <Currency store={store} />
          </div>
        </header>

        <main className="vs-home-main">
          <section className="vs-hero">
            <div className="vs-hero-ship" style={{ ['--ship-glow' as any]: currentShipInfo.color }}>
              <span className="vs-hero-ring" aria-hidden="true" />
              <ShipIcon shipType={store.currentShip} color={currentShipInfo.color} size={220} className="vs-hero-img" eager />
            </div>
            <h1 className="vs-logo">
              <span className="vs-logo-top">VOID</span>
              <span className="vs-logo-bottom">SURVIVORS</span>
            </h1>
          </section>

          <nav className="vs-menu" aria-label="Menu">
            <button type="button" className="vs-btn vs-btn--primary vs-btn--xl vs-start" onClick={() => { resumeAudio(); setShowModeSelection(true); }}>
              <Rocket size={22} aria-hidden="true" />{clean(t(lang, 'startRun'))}
            </button>
            <div className="vs-menu-grid">
              <button type="button" className="vs-menu-btn" onClick={() => goTo('upgrades')}>
                <span className="vs-menu-icon vs-tone-orange"><Zap size={20} /></span>{t(lang, 'upgrades')}
              </button>
              <button type="button" className="vs-menu-btn" onClick={() => goTo('ships')}>
                <span className="vs-menu-icon vs-tone-violet"><Rocket size={20} /></span>{t(lang, 'astronavi')}
              </button>
              <button type="button" className="vs-menu-btn" onClick={() => goTo('settings')}>
                <span className="vs-menu-icon vs-tone-cyan"><Settings2 size={20} /></span>{t(lang, 'settings')}
              </button>
            </div>
          </nav>
        </main>

        <footer className="vs-dock" aria-label="Extra">
          {dock.map((d) => (
            <button key={d.key} type="button" className={`vs-dock-btn vs-tone-${d.tone}`} onClick={d.onClick} title={d.label}>
              <span className="vs-dock-icon">{d.icon}{d.badge ? <span className="vs-badge">{d.badge > 99 ? '99+' : d.badge}</span> : null}</span>
              <span className="vs-dock-label">{d.label}</span>
            </button>
          ))}
        </footer>

        <React.Suspense fallback={null}>
          {showProfileModal && <ProfileModal store={store} setStore={commitStore} lang={lang} onClose={() => setShowProfileModal(false)} />}
          {showLeaderboardModal && <LeaderboardModal store={store} lang={lang} onClose={() => setShowLeaderboardModal(false)} />}
          {showAchievementsModal && <AchievementsModal store={store} setStore={commitStore} lang={lang} onClose={() => setShowAchievementsModal(false)} />}
          {showDailyRewardModal && <DailyRewardModal store={store} setStore={commitStore} lang={lang} onClose={() => setShowDailyRewardModal(false)} />}
          {showDailyEventsModal && <DailyEventsModal store={store} setStore={commitStore} lang={lang} onClose={() => setShowDailyEventsModal(false)} />}
        </React.Suspense>

        {showSpeedModal && (() => {
          const bosses = store.userProfile?.totalBossesDefeated || 0;
          const speedOptions = [
            { value: 1, label: clean(t(lang, 'speed_normal')), unlocked: true, note: '' },
            { value: 1.5, label: clean(t(lang, 'speed_fast')), unlocked: bosses >= 1, note: t(lang, 'speed_requirement_boss1') },
            { value: 2, label: clean(t(lang, 'speed_ultra')), unlocked: bosses >= 5, note: t(lang, 'speed_requirement_boss5') },
          ];
          return (
            <div className="vs-modal-backdrop" onClick={() => setShowSpeedModal(false)}>
              <div className="vs-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="vs-modal-head">
                  <h2><Zap size={20} />{clean(t(lang, 'speed_select'))}</h2>
                  <button type="button" className="vs-icon-btn" onClick={() => setShowSpeedModal(false)} aria-label="Close"><X size={20} /></button>
                </div>
                <div className="vs-panel vs-panel--inset vs-center">
                  <span className="vs-muted">{t(lang, 'speed_current')}</span>
                  <strong className="vs-big">x{store.settings.speedMultiplier}</strong>
                  {store.settings.speedMultiplier > 1 && store.settings.speedBoostTimer > 0 && (
                    <span className="vs-muted"><Timer size={14} /> {formatTime(store.settings.speedBoostTimer)}</span>
                  )}
                </div>
                <div className="vs-stack">
                  {speedOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      disabled={!o.unlocked}
                      className={`vs-option${store.settings.speedMultiplier === o.value ? ' is-active' : ''}`}
                      onClick={() => {
                        const current = storeRef.current;
                        if (o.value === 2) {
                          const newTimer = Math.min((current.settings.speedBoostTimer || 0) + 600, 86400);
                          commitStore({ ...current, settings: { ...current.settings, speedMultiplier: 2.0, speedBoostTimer: newTimer, speedBoostPaused: false } });
                        } else {
                          commitStore({ ...current, settings: { ...current.settings, speedMultiplier: o.value, speedBoostTimer: 0, speedBoostPaused: false } });
                        }
                      }}
                    >
                      <span className="vs-option-main">{o.unlocked ? (store.settings.speedMultiplier === o.value ? <Check size={18} /> : <Zap size={18} />) : <Lock size={18} />}{o.label}</span>
                      {!o.unlocked && <span className="vs-option-note">{o.note}</span>}
                      {o.unlocked && o.value === 2 && <span className="vs-option-note">{clean(t(lang, 'speed_permanent_unlock'))} (+10 min)</span>}
                    </button>
                  ))}
                </div>
                {bosses < 5 && (
                  <div className="vs-panel vs-panel--inset vs-center">
                    <span>{t(lang, 'speed_requirement_ads')}</span>
                    <span className="vs-progress vs-progress--wide"><span style={{ width: `${(store.settings.adsWatchedForSpeed / 5) * 100}%` }} /></span>
                    <button type="button" className="vs-btn vs-btn--gold" onClick={watchSpeedAd}>
                      <Clapperboard size={18} />{clean(t(lang, 'speed_activate_ads'))} ({store.settings.adsWatchedForSpeed}/5)
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {adNotice && <div className="vs-toast" role="status">{adNotice}</div>}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // POTENZIAMENTI
  // ---------------------------------------------------------------------------
  if (screen === 'upgrades') {
    const coinUpgrades = [
      { type: 'maxHp' as const, nameKey: 'hp', icon: 'passive_neutronium_heart', color: '#ff738d', unit: ' HP', format: (v: number) => (v || 100).toFixed(0), increment: '+5' },
      { type: 'shipSpeed' as const, nameKey: 'stat_speed', icon: 'passive_ionic_thrusters', color: '#55e8e1', unit: '', format: (v: number) => (v || 200).toFixed(0), increment: '+1' },
      { type: 'defense' as const, nameKey: 'stat_defense', icon: 'passive_plating', color: '#79baff', unit: '', format: (v: number) => (v || 0).toFixed(1), increment: '+0.1' },
      { type: 'critChance' as const, nameKey: 'stat_crit_chance', icon: 'passive_stellar_fortune', color: '#f4c879', unit: '%', format: (v: number) => (v || 0).toFixed(1), increment: '+0.1%' },
      { type: 'critDamage' as const, nameKey: 'stat_crit_damage', icon: 'passive_fusion_core', color: '#ff8f6b', unit: '%', format: (v: number) => (v || 150).toFixed(0), increment: '+1%' },
      { type: 'regeneration' as const, nameKey: 'stat_regeneration', icon: 'passive_regen_core', color: '#74e0b3', unit: '/s', format: (v: number) => (v || 0).toFixed(2), increment: '+0.01' },
    ];
    const diamondUpgrades = [
      { type: 'luck' as DiamondUpgradeType, nameKey: 'stat_luck', icon: 'passive_stellar_fortune', color: '#91d690', unit: '%', format: (v: number) => (v || 0).toFixed(0), increment: '+1%' },
      { type: 'expBonus' as DiamondUpgradeType, nameKey: 'stat_exp', icon: 'passive_galactic_crown', color: '#d8a2ff', unit: '%', format: (v: number) => (v || 0).toFixed(0), increment: '+1%' },
    ];

    const renderStatCard = (u: { nameKey: string; icon: string; color: string; unit: string; format: (v: number) => string; increment: string }, value: number, level: number, maxLevel: number, cost: number, currency: 'coin' | 'gem', onBuy: () => void) => {
      const isMaxed = level >= maxLevel;
      const canAfford = (currency === 'coin' ? store.coins : store.diamonds) >= cost;
      return (
        <div className="vs-card vs-stat-card" style={{ ['--accent' as any]: u.color }}>
          <div className="vs-stat-head">
            <AbilityIcon type={u.icon} color={u.color} size={42} />
            <div>
              <h3 className="vs-card-title">{t(lang, u.nameKey)}</h3>
              <p className="vs-stat-value">{u.format(value)}{u.unit}</p>
            </div>
          </div>
          <div className="vs-stat-meta">
            <span>{t(lang, 'level')} {level}/{maxLevel}</span>
            <span className="vs-plus">{u.increment}</span>
          </div>
          <span className="vs-progress"><span style={{ width: `${Math.min(100, (level / Math.max(1, maxLevel)) * 100)}%` }} /></span>
          <button type="button" className={`vs-btn vs-btn--sm vs-btn--block ${isMaxed ? 'vs-btn--done' : canAfford ? 'vs-btn--accent' : 'vs-btn--muted'}`} disabled={isMaxed || !canAfford} onClick={onBuy}>
            {isMaxed ? t(lang, 'maxLevel') : <>{currency === 'coin' ? <Coins size={15} /> : <Gem size={15} />}{cost.toLocaleString()}</>}
          </button>
        </div>
      );
    };

    return (
      <div className="vs-screen">
        <TopBar title={t(lang, 'upgrades')} icon={<Zap size={22} />} onBack={() => goTo('home')} lang={lang} right={<Currency store={store} compact />} />
        <main className="vs-content">
          <div className="vs-tabs" role="tablist">
            {(['general', 'active', 'passive'] as const).map(tab => (
              <button key={tab} type="button" role="tab" aria-selected={upgradeTab === tab} className={`vs-tab${upgradeTab === tab ? ' is-active' : ''}`} onClick={() => setUpgradeTab(tab)}>
                {tab === 'general' ? <Settings2 size={16} /> : tab === 'active' ? <Swords size={16} /> : <Shield size={16} />}
                {tab === 'general' ? t(lang, 'upgrades') : tab === 'active' ? t(lang, 'abilities') : t(lang, 'passive')}
              </button>
            ))}
          </div>

          {upgradeTab === 'general' && (
            <>
              <h2 className="vs-section-title vs-text-gold"><Coins size={18} />{clean(t(lang, 'coin_upgrades'))}</h2>
              <div className="vs-grid vs-grid--stats">
                {coinUpgrades.map(u => {
                  const value = u.type === 'maxHp' ? (store.stats.maxHp || 100) : (store.stats[u.type] || 0);
                  const level = u.type === 'maxHp' ? (store.upgrades.maxHp?.level || 0) : getStatLevel(u.type as CoinUpgradeType, value);
                  const maxLevel = u.type === 'maxHp' ? (store.upgrades.maxHp?.maxLevel || 200) : getStatMaxLevel(u.type as CoinUpgradeType);
                  const cost = u.type === 'maxHp' ? getUpgradeCost(level) : getCoinUpgradeCost(u.type as CoinUpgradeType, level);
                  return <React.Fragment key={u.type}>{renderStatCard(u, value, level, maxLevel, cost, 'coin', () => {
                    const ns = u.type === 'maxHp' ? applyUpgrade(storeRef.current, 'maxHp') : applyCoinUpgrade(storeRef.current, u.type as CoinUpgradeType);
                    if (ns) commitStore(ns);
                  })}</React.Fragment>;
                })}
              </div>
              <h2 className="vs-section-title vs-text-cyan"><Gem size={18} />{clean(t(lang, 'diamond_upgrades'))}</h2>
              <div className="vs-grid vs-grid--stats">
                {diamondUpgrades.map(u => {
                  const value = store.stats[u.type] || 0;
                  const level = getStatLevel(u.type, value);
                  return <React.Fragment key={u.type}>{renderStatCard(u, value, level, getStatMaxLevel(u.type), getDiamondUpgradeCost(u.type, level), 'gem', () => {
                    const ns = applyDiamondUpgrade(storeRef.current, u.type);
                    if (ns) commitStore(ns);
                  })}</React.Fragment>;
                })}
              </div>
            </>
          )}

          {upgradeTab === 'active' && (
            <>
            <div className="vs-panel vs-panel--soon">
              <strong>{clean(t(lang, 'coming_soon'))}</strong>
              <span className="vs-muted">{L(lang, 'Potenziamenti delle abilità attive in arrivo!', 'Active ability upgrades coming soon!', '¡Mejoras de habilidades activas muy pronto!', 'Améliorations des capacités actives bientôt !', '主动技能升级即将推出!')}</span>
            </div>
            <div className="vs-grid vs-grid--abilities">
              {ACTIVE_ABILITIES.map(type => {
                const info = getAbilityInfo(type);
                return (
                  <div key={type} className="vs-card vs-ability-card is-info" style={{ ['--accent' as any]: info.color }}>
                    <AbilityIcon type={type} color={info.color} size={56} />
                    <h3 className="vs-card-title">{t(lang, info.name)}</h3>
                    {EVOLUTIONS[type] && (
                      <span className="vs-evo-recipe" title={L(lang, 'Livello massimo + questa passiva + scrigno di un boss', 'Max level + this passive + boss chest', 'Nivel máximo + esta pasiva + cofre de jefe', 'Niveau max + ce passif + coffre de boss', '满级+此被动+Boss宝箱')}>
                        <Sparkles size={13} /><AbilityIcon type={EVOLUTIONS[type]!} color="#fbbf24" size={18} />{clean(t(lang, getAbilityInfo(EVOLUTIONS[type]!).name))} → <b>{getEvolutionName(type, lang)}</b>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}

          {upgradeTab === 'passive' && (
            <>
              <div className="vs-panel vs-panel--soon">
                <strong>{clean(t(lang, 'coming_soon'))}</strong>
                <span className="vs-muted">{t(lang, 'coming_soon_desc')}</span>
              </div>
              <div className="vs-grid vs-grid--abilities">
                {PASSIVE_ABILITIES.map(type => {
                  const info = getAbilityInfo(type);
                  return (
                    <div key={type} className="vs-card vs-ability-card is-info" style={{ ['--accent' as any]: info.color }}>
                      <AbilityIcon type={type} color={info.color} size={48} />
                      <h3 className="vs-card-title">{t(lang, info.name)}</h3>
                      <p className="vs-card-desc">{t(lang, info.description)}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ASTRONAVI
  // ---------------------------------------------------------------------------
  if (screen === 'ships') {
    return (
      <div className="vs-screen">
        <TopBar title={t(lang, 'astronavi')} icon={<Rocket size={22} />} onBack={() => goTo('home')} lang={lang} right={<Currency store={store} compact />} />
        <main className="vs-content vs-content--wide">
          <div className="vs-grid vs-grid--ships">
            {SHIPS.map(ship => {
              const owned = !!store.ships[ship.type as keyof typeof store.ships];
              const selected = store.currentShip === ship.type;
              const abilityInfo = getAbilityInfo(ship.ability as AbilityType);
              const canAfford = store.coins >= ship.price;
              return (
                <article key={ship.type} className={`vs-card vs-ship-card${selected ? ' is-selected' : ''}${owned ? '' : ' is-locked'}`} style={{ ['--accent' as any]: ship.color }}>
                  {selected && <span className="vs-ship-flag"><Check size={13} />{clean(t(lang, 'selected'))}</span>}
                  <div className="vs-ship-art">
                    <ShipIcon shipType={ship.type} color={ship.color} size={160} className="vs-ship-img" />
                  </div>
                  <h3 className="vs-ship-name">{t(lang, ship.nameKey)}</h3>
                  <div className="vs-ship-ability" style={{ ['--accent' as any]: abilityInfo.color }}>
                    <AbilityIcon type={ship.ability} color={abilityInfo.color} size={22} />
                    <span>{t(lang, abilityInfo.name)}</span>
                  </div>
                  {!owned ? (
                    <button
                      type="button"
                      className={`vs-btn vs-btn--sm vs-btn--block ${canAfford ? 'vs-btn--gold' : 'vs-btn--muted'}`}
                      disabled={!canAfford}
                      onClick={() => {
                        const current = storeRef.current;
                        if (current.coins < ship.price) return;
                        commitStore({ ...current, coins: current.coins - ship.price, ships: { ...current.ships, [ship.type]: true } });
                      }}
                    >
                      <Coins size={15} />{ship.price.toLocaleString()} · {clean(t(lang, 'buy_ship'))}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`vs-btn vs-btn--sm vs-btn--block ${selected ? 'vs-btn--done' : 'vs-btn--accent'}`}
                      disabled={selected}
                      onClick={() => { const current = storeRef.current; commitStore({ ...current, currentShip: ship.type as any }); }}
                    >
                      {selected ? <><Check size={15} />{clean(t(lang, 'selected'))}</> : clean(t(lang, 'select'))}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // IMPOSTAZIONI
  // ---------------------------------------------------------------------------
  if (screen === 'settings') {
    return (
      <div className="vs-screen">
        <TopBar title={t(lang, 'settings')} icon={<Settings2 size={22} />} onBack={() => goTo('home')} lang={lang} />
        <main className="vs-content">
          <div className="vs-settings">
            <section className="vs-panel vs-settings-wide">
              <h2 className="vs-panel-title"><Sparkles size={18} />{t(lang, 'language')}</h2>
              <div className="vs-lang-grid">
                {(Object.keys(languageNames) as Language[]).map(l => (
                  <button key={l} type="button" className={`vs-lang${store.settings.language === l ? ' is-active' : ''}`} onClick={() => { const c = storeRef.current; commitStore({ ...c, settings: { ...c.settings, language: l, languageChosen: true } }); }}>
                    {languageNames[l]}
                  </button>
                ))}
              </div>
            </section>

            <section className="vs-panel vs-settings-wide">
              <h2 className="vs-panel-title"><SunMoon size={18} />{t(lang, 'theme')}</h2>
              <div className="vs-lang-grid">
                {(['auto', 'light', 'dark'] as const).map(th => (
                  <button key={th} type="button" className={`vs-lang${(store.settings.theme || 'dark') === th ? ' is-active' : ''}`} onClick={() => { const c = storeRef.current; commitStore({ ...c, settings: { ...c.settings, theme: th } }); }}>
                    {t(lang, `theme_${th}`)}
                  </button>
                ))}
              </div>
            </section>

            <section className="vs-panel">
              <div className="vs-row">
                <h2 className="vs-panel-title"><Volume2 size={18} />{t(lang, 'sfxVolume')}</h2>
                <span className="vs-value">{Math.round(store.settings.sfxVolume * 100)}%</span>
              </div>
              <input className="vs-range" type="range" min="0" max="1" step="0.05" value={store.settings.sfxVolume} style={{ ['--fill' as any]: `${store.settings.sfxVolume * 100}%` }} onChange={(e) => { const v = parseFloat(e.target.value); updateSetting('sfxVolume', v); setSfxVolume(v); }} />
            </section>

            <section className="vs-panel">
              <div className="vs-row">
                <h2 className="vs-panel-title"><Music2 size={18} />{t(lang, 'musicVolume')}</h2>
                <span className="vs-value">{Math.round(store.settings.musicVolume * 100)}%</span>
              </div>
              <input className="vs-range" type="range" min="0" max="1" step="0.05" value={store.settings.musicVolume} style={{ ['--fill' as any]: `${store.settings.musicVolume * 100}%` }} onChange={(e) => { const v = parseFloat(e.target.value); updateSetting('musicVolume', v); setMusicVolume(v); }} />
            </section>

            <section className="vs-panel">
              <h2 className="vs-panel-title"><Music2 size={18} />{t(lang, 'custom_music')}</h2>
              <p className={customMusicLoaded ? 'vs-ok' : 'vs-muted'}>{customMusicLoaded ? (customMusicName || '✓') : t(lang, 'no_custom_music')}</p>
              <label className="vs-btn vs-btn--ghost vs-btn--block">
                <FolderOpen size={17} />{customMusicLoaded ? t(lang, 'change_music') : t(lang, 'load_audio_file')}
                <input type="file" accept="audio/*" onChange={handleMusicFileUpload} hidden />
              </label>
            </section>

            <section className="vs-panel">
              <div className="vs-row">
                <h2 className="vs-panel-title"><Crosshair size={18} />{t(lang, 'show_damage_numbers')}</h2>
                <Toggle on={store.settings.showDamageNumbers} label={t(lang, 'show_damage_numbers')} onChange={() => updateSetting('showDamageNumbers', !store.settings.showDamageNumbers)} />
              </div>
            </section>

            <section className="vs-panel">
              <div className="vs-row">
                <div>
                  <h2 className="vs-panel-title"><Joystick size={18} />{t(lang, 'virtual_joystick')}</h2>
                  <p className="vs-muted vs-small">{t(lang, 'virtual_joystick_desc')}</p>
                </div>
                <Toggle on={store.settings.useJoystick} label={t(lang, 'virtual_joystick')} onChange={() => updateSetting('useJoystick', !store.settings.useJoystick)} />
              </div>
            </section>

            <section className="vs-panel">
              <div className="vs-row">
                <div>
                  <h2 className="vs-panel-title"><Sparkles size={18} />{L(lang, 'Tutorial', 'Tutorial', 'Tutorial', 'Tutoriel', '教程')}</h2>
                  <p className="vs-muted vs-small">{store.settings.tutorialDone ? L(lang, 'Rivedi come si gioca nella prossima partita', 'Show how to play again in your next run', 'Vuelve a ver cómo se juega en la próxima partida', 'Revois comment jouer à la prochaine partie', '在下一局重新查看玩法') : L(lang, 'Verrà mostrato all’inizio della prossima partita', 'It will be shown at the start of your next run', 'Se mostrará al inicio de la próxima partida', 'Il sera affiché au début de la prochaine partie', '将在下一局开始时显示')}</p>
                </div>
                <Toggle on={!store.settings.tutorialDone} label="Tutorial" onChange={() => updateSetting('tutorialDone', !store.settings.tutorialDone)} />
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PARTITA
  // ---------------------------------------------------------------------------
  if (screen === 'playing') {
    const player = gameStateRef.current?.player;
    const ownedLevel = (type?: AbilityType) => (type && player ? player.abilities.find(a => a.type === type) : undefined);
    const damageEntries = Object.entries(gameStateRef.current?.abilityDamageStats || {}).sort((a, b) => b[1] - a[1]);
    const maxDamage = damageEntries.length ? damageEntries[0][1] : 1;

    return (
      <div className="vs-game">
        <canvas ref={canvasRef} className="vs-game-canvas" tabIndex={-1} />

        {!gameOver && !levelUpPending && !revivePending && !chestRewards && (
          <button type="button" className="vs-pause-btn" aria-label={t(lang, 'pause')} title={`${t(lang, 'pause')} (P)`} onClick={togglePause}>
            {paused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        )}

        <div className="vs-controls-hint" aria-hidden="true">
          {L(lang, 'WASD / Frecce: muovi · P: pausa', 'WASD / Arrows: move · P: pause', 'WASD / Flechas: mover · P: pausa', 'WASD / Flèches : bouger · P : pause', 'WASD / 方向键：移动 · P：暂停')}
        </div>

        {levelUpPending && levelUpChoices.length > 0 && (
          <div className="vs-overlay vs-overlay--levelup">
            <div className="vs-levelup">
              <div className="vs-levelup-head">
                <span className="vs-levelup-burst" aria-hidden="true"><Star size={26} fill="currentColor" /></span>
                <h2 className="vs-levelup-title">{clean(t(lang, 'level_up'))}</h2>
                <p className="vs-muted">{t(lang, 'choose_upgrade')} · {t(lang, 'level')} {player?.level ?? ''}</p>
              </div>
              <div className="vs-levelup-choices">
                {levelUpChoices.slice(0, 3).map((choice, i) => {
                  const owned = ownedLevel(choice.abilityType);
                  const isGold = choice.type === 'stat';
                  const curLvl = owned ? owned.level : 0;
                  const maxLvl = owned ? owned.maxLevel : 0;
                  return (
                    <button key={i} type="button" className="vs-choice" style={{ ['--accent' as any]: choice.color, animationDelay: `${i * 70}ms` }} onClick={() => handleLevelUpChoice(choice)}>
                      <span className="vs-choice-key" aria-hidden="true">{i + 1}</span>
                      <span className={`vs-choice-tag${choice.type === 'ability' ? ' is-new' : isGold ? ' is-gold' : ''}`}>
                        {choice.type === 'ability' ? clean(t(lang, 'new_ability')) : choice.type === 'upgrade' ? clean(t(lang, 'upgrade_ability')) : clean(t(lang, 'gold_reward'))}
                      </span>
                      <span className="vs-choice-icon">
                        {choice.abilityType ? <AbilityIcon type={choice.abilityType} color={choice.color} size={64} /> : <Coins size={40} />}
                      </span>
                      <span className="vs-choice-body">
                        <span className="vs-choice-name">{clean(t(lang, choice.name))}</span>
                        {choice.type === 'upgrade' && owned && (
                          <span className="vs-choice-level">
                            {t(lang, 'level')} {curLvl} → <b>{curLvl + 1}</b>
                            <span className="vs-pips">{Array.from({ length: Math.min(maxLvl, 10) }, (_, k) => <i key={k} className={k < curLvl ? 'on' : k === curLvl ? 'next' : ''} />)}</span>
                          </span>
                        )}
                        <span className="vs-choice-desc">{isGold ? '+100 ' + t(lang, 'coins') : t(lang, choice.description)}</span>
                        {choice.abilityType && EVOLUTIONS[choice.abilityType] && (choice.type === 'ability' || (owned && curLvl + 1 >= maxLvl)) && (
                          <span className="vs-choice-evo">
                            <AbilityIcon type={EVOLUTIONS[choice.abilityType]!} color="#fbbf24" size={18} />
                            {L(lang, 'Evolve con', 'Evolves with', 'Evoluciona con', 'Évolue avec', '进化需要')} {clean(t(lang, getAbilityInfo(EVOLUTIONS[choice.abilityType]!).name))} → {getEvolutionName(choice.abilityType, lang)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {rerollsLeft > 0 && (
                <button type="button" className="vs-btn vs-btn--ghost vs-reroll" onClick={handleReroll} title="R">
                  <Shuffle size={18} />{L(lang, 'Rigenera', 'Reroll', 'Cambiar', 'Relancer', '刷新')} ({rerollsLeft})
                </button>
              )}
            </div>
          </div>
        )}

        {chestRewards && (
          <div className="vs-overlay vs-overlay--levelup">
            <div className="vs-chest">
              <div className="vs-chest-burst" aria-hidden="true"><Gift size={46} /></div>
              <h2 className="vs-levelup-title">{L(lang, 'TESORO!', 'TREASURE!', '¡TESORO!', 'TRÉSOR !', '宝藏！')}</h2>
              <div className="vs-chest-rewards">
                {chestRewards.map((r, i) => {
                  const info = r.abilityType ? getAbilityInfo(r.abilityType) : null;
                  return (
                    <div key={i} className={`vs-chest-item${r.kind === 'evolve' ? ' is-evo' : ''}`} style={{ ['--accent' as any]: info?.color || '#fbbf24', animationDelay: `${0.25 + i * 0.22}s` }}>
                      <span className="vs-chest-icon">
                        {r.abilityType ? <AbilityIcon type={r.abilityType} color={info!.color} size={48} /> : r.kind === 'coins' ? <Coins size={30} /> : <Heart size={30} />}
                      </span>
                      <span className="vs-chest-text">
                        <b>{r.abilityType ? (r.kind === 'evolve' ? getEvolutionName(r.abilityType, lang) || clean(t(lang, info!.name)) : clean(t(lang, info!.name))) : r.kind === 'coins' ? `+${r.amount} ${t(lang, 'coins')}` : `+${r.amount} HP`}</b>
                        <small>
                          {r.kind === 'evolve' ? `${clean(t(lang, info!.name))} → ` + L(lang, 'EVOLUTA! Danno x2.2', 'EVOLVED! Damage x2.2', '¡EVOLUCIONADA! Daño x2.2', 'ÉVOLUÉE ! Dégâts x2.2', '进化！伤害x2.2')
                            : r.kind === 'upgrade' ? `${t(lang, 'level')} ${r.level}`
                            : r.kind === 'coins' ? L(lang, 'Bottino del boss', 'Boss loot', 'Botín del jefe', 'Butin du boss', 'Boss战利品')
                            : L(lang, 'Riparazioni', 'Repairs', 'Reparaciones', 'Réparations', '修复')}
                        </small>
                      </span>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="vs-btn vs-btn--primary vs-btn--lg" onClick={closeChest}><Play size={18} />{L(lang, 'Continua', 'Continue', 'Continuar', 'Continuer', '继续')}</button>
            </div>
          </div>
        )}

        {reviveCountdown > 0 && !gameOver && (
          <div className="vs-countdown" aria-live="assertive">
            <span className="vs-countdown-label">{L(lang, 'PREPARATI!', 'GET READY!', '¡PREPÁRATE!', 'PRÉPARE-TOI !', '准备！')}</span>
            <span key={reviveCountdown} className="vs-countdown-num">{reviveCountdown}</span>
          </div>
        )}
        {revivePending && !gameOver && !levelUpPending && (
          <div className="vs-overlay">
            <div className="vs-modal vs-modal--game vs-tone-danger">
              <span className="vs-modal-emblem vs-emblem-danger"><Skull size={40} /></span>
              <h2 className="vs-modal-title vs-text-danger">{clean(t(lang, 'defeated'))}</h2>
              <p className="vs-muted">{t(lang, 'continue_playing')}</p>
              <div className="vs-panel vs-panel--inset vs-center">
                <strong className="vs-ok">{clean(t(lang, 'revive_title'))}</strong>
                <span>{t(lang, 'revive_description')}</span>
                <span className="vs-muted vs-small">{clean(t(lang, 'revive_warning'))}</span>
              </div>
              <div className="vs-stack">
                <button type="button" className="vs-btn vs-btn--success vs-btn--block vs-btn--lg" onClick={handleRevive}><Clapperboard size={20} />{clean(t(lang, 'watch_ad_continue'))}</button>
                <button type="button" className="vs-btn vs-btn--ghost vs-btn--block" onClick={handleReviveDecline}><X size={18} />{clean(t(lang, 'dont_continue'))}</button>
              </div>
            </div>
          </div>
        )}

        {showTutorial && (
          <React.Suspense fallback={null}>
            <Tutorial lang={lang} touch={typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches} onClose={closeTutorial} />
          </React.Suspense>
        )}
        {paused && !gameOver && !levelUpPending && (
          <div className="vs-overlay">
            <div className="vs-modal vs-modal--game">
              <span className="vs-modal-emblem"><Pause size={34} /></span>
              <h2 className="vs-modal-title vs-gradient-text">{t(lang, 'pause')}</h2>
              <p className="vs-muted">{t(lang, 'pauseInfo')}</p>
              <div className="vs-stats">
                <div><span>{t(lang, 'time')}</span><b className="vs-text-cyan">{formatTime(gameStateRef.current?.time || 0)}</b></div>
                <div><span>{t(lang, 'level')}</span><b className="vs-text-violet">{player?.level ?? 1}</b></div>
                <div><span>{t(lang, 'wave')}</span><b className="vs-text-violet">{gameStateRef.current?.wave ?? 1}</b></div>
                <div><span>{t(lang, 'kills')}</span><b className="vs-text-danger">{gameStateRef.current?.kills ?? 0}</b></div>
              </div>
              <div className="vs-stack">
                <button type="button" className="vs-btn vs-btn--primary vs-btn--block vs-btn--lg" onClick={togglePause}><Play size={20} />{t(lang, 'resume')}</button>
                <button type="button" className="vs-btn vs-btn--ghost vs-btn--block" onClick={endRun}><Home size={18} />{t(lang, 'home')}</button>
              </div>
            </div>
          </div>
        )}

        {gameOver && !showDamageStats && (
          <div className="vs-overlay">
            <div className={`vs-modal vs-modal--game ${finalStats.victory ? 'vs-tone-victory' : 'vs-tone-danger'}`}>
              <span className={`vs-modal-emblem ${finalStats.victory ? 'vs-emblem-victory' : 'vs-emblem-danger'}`}>{finalStats.victory ? <Trophy size={40} /> : <Skull size={40} />}</span>
              <h2 className={`vs-modal-title ${finalStats.victory ? 'vs-text-gold' : 'vs-text-danger'}`}>
                {finalStats.victory ? L(lang, 'VITTORIA!', 'VICTORY!', '¡VICTORIA!', 'VICTOIRE !', '胜利！') : clean(t(lang, 'gameOver'))}
              </h2>
              <div className="vs-stats">
                <div><span>{t(lang, 'time')}</span><b>{formatTime(finalStats.time)}</b></div>
                <div><span>{t(lang, 'level')}</span><b className="vs-text-cyan">{finalStats.level}</b></div>
                <div><span>{t(lang, 'kills')}</span><b className="vs-text-danger">{finalStats.kills}</b></div>
                <div><span>{t(lang, 'score')}</span><b className="vs-text-gold">{Math.round(finalStats.score)}</b></div>
              </div>
              <div className="vs-rewards">
                <span className="vs-chip vs-chip--coin"><Coins size={16} />+{finalStats.coins}</span>
                <span className="vs-chip vs-chip--gem"><Gem size={16} />+{finalStats.diamonds}</span>
                {finalStats.points > 0 && <span className="vs-chip vs-chip--star"><Star size={16} />+{finalStats.points}</span>}
              </div>
              {finalStats.coins > 0 && playgama.isRewardedSupported() && (doubleCoinsClaimed ? (
                <div className="vs-claimed"><Check size={18} />{clean(t(lang, 'reward_already_claimed'))}</div>
              ) : (
                <button type="button" className="vs-btn vs-btn--gold vs-btn--block" onClick={claimDoubleCoins}>
                  <Clapperboard size={18} />{clean(t(lang, 'watch_ad_double_coins'))} (+{finalStats.coins})
                </button>
              ))}
              <div className="vs-btn-row">
                <button type="button" className="vs-btn vs-btn--primary vs-btn--lg" onClick={retryRun}><RotateCcw size={19} />{t(lang, 'retry')}</button>
                <button type="button" className="vs-btn vs-btn--ghost vs-btn--lg" onClick={endRun}><Home size={19} />{t(lang, 'home')}</button>
              </div>
              <button type="button" className="vs-link" onClick={() => setShowDamageStats(true)}><Swords size={16} />{clean(t(lang, 'total_damage'))}</button>
            </div>
          </div>
        )}

        {showDamageStats && (
          <div className="vs-overlay">
            <div className="vs-modal vs-modal--game vs-modal--wide">
              <div className="vs-modal-head">
                <h2><Swords size={20} />{clean(t(lang, 'total_damage_per_ability'))}</h2>
                <button type="button" className="vs-icon-btn" onClick={() => setShowDamageStats(false)} aria-label="Close"><X size={20} /></button>
              </div>
              <div className="vs-damage-list">
                {damageEntries.length === 0 ? (
                  <p className="vs-muted vs-center">{t(lang, 'no_damage_dealt')}</p>
                ) : damageEntries.map(([abilityType, damage]) => {
                  const info = getAbilityInfo(abilityType as any);
                  return (
                    <div key={abilityType} className="vs-damage-row" style={{ ['--accent' as any]: info.color }}>
                      <AbilityIcon type={abilityType} color={info.color} size={34} />
                      <div className="vs-damage-info">
                        <div className="vs-row"><b>{gameStateRef.current?.player.abilities.find(a => a.type === abilityType)?.evolved ? getEvolutionName(abilityType as any, lang) : t(lang, info.name)}</b><span>{Math.round(damage)}</span></div>
                        <span className="vs-progress"><span style={{ width: `${(damage / maxDamage) * 100}%` }} /></span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="vs-btn vs-btn--ghost vs-btn--block" onClick={() => setShowDamageStats(false)}><ArrowLeft size={18} />{t(lang, 'back')}</button>
            </div>
          </div>
        )}
        {adNotice && <div className="vs-toast" role="status">{adNotice}</div>}
      </div>
    );
  }

  return null;
}
