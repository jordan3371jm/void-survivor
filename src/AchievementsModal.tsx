import { storageSetItem } from './game/storage';
import React, { useState, useEffect } from 'react';
import { GameStore } from './game/store';
import { t, Language } from './game/i18n';
import { achievements, AchievementStats, CompletedAchievement, getDifficultyColor, getDifficultyName } from './game/achievements';
import { checkAndCompleteAchievements } from './game/achievementChecker';

interface AchievementsModalProps {
  store: GameStore;
  setStore: (store: GameStore) => void;
  lang: Language;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ store, setStore, lang, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'S' | 'A' | 'B' | 'C' | 'D'>('all');
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);

  // Calcola le statistiche del giocatore
  const getAchievementStats = (): AchievementStats => {
    const profile = store.userProfile;
    return {
      // Statistiche per partita singola (dall'ultima partita giocata)
      currentKills: profile?.currentKills || 0,
      currentPlayTime: profile?.currentPlayTime || 0,
      currentLevel: profile?.currentLevel || 0,
      currentScore: profile?.currentScore || 0,
      currentWave: profile?.currentWave || 0,
      
      // Statistiche totali (somma di tutte le partite)
      totalKills: profile?.totalKills || 0,
      totalBossesDefeated: profile?.totalBossesDefeated || 0,
      totalPlayTime: profile?.totalPlayTime || 0,
      totalGamesPlayed: profile?.totalGamesPlayed || 0,
      maxScore: profile?.maxScore || 0,
      maxLevel: profile?.maxLevel || 0,
      maxWave: profile?.maxWave || 0,
      
      // Timer attuale velocità x2
      currentSpeedBoostTimer: store.settings.speedBoostTimer || 0
    };
  };

  const stats = getAchievementStats();
  const completedAchievements = store.userProfile?.completedAchievements || [];

  // Filtra gli obiettivi
  const filteredAchievements = achievements.filter(achievement => {
    if (filter !== 'all' && achievement.difficulty !== filter) return false;
    
    const completed = completedAchievements.find(c => c.id === achievement.id);
    if (showCompletedOnly && !completed) return false;
    
    return true;
  });

  // Controlla se un obiettivo è completato
  const isCompleted = (achievementId: string): boolean => {
    return completedAchievements.some(c => c.id === achievementId);
  };

  // Controlla se una ricompensa è stata riscossa
  const isClaimed = (achievementId: string): boolean => {
    const completed = completedAchievements.find(c => c.id === achievementId);
    return completed?.claimed || false;
  };

  // Ottieni il progresso di un obiettivo
  const getProgress = (achievement: typeof achievements[0]): number => {
    const current = achievement.check(stats);
    return Math.min(current / achievement.target, 1);
  };

  // Riscuoti una ricompensa
  const claimReward = (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) return;

    const newStore = { ...store };
    if (!newStore.userProfile) return;

    // Aggiungi ricompense
    newStore.coins += achievement.rewardCoins;
    newStore.diamonds += achievement.rewardDiamonds;

    // Segna come riscossa
    if (newStore.userProfile.completedAchievements) {
      const completedIndex = newStore.userProfile.completedAchievements.findIndex(c => c.id === achievementId);
      if (completedIndex >= 0) {
        newStore.userProfile.completedAchievements[completedIndex].claimed = true;
      }
    }

    setStore(newStore);
    storageSetItem('voidSurvivorsStore', JSON.stringify(newStore));
  };

  // Controlla e completa gli obiettivi quando il modal viene aperto
  // Questo permette di completare obiettivi retroattivamente
  useEffect(() => {
    if (!store.userProfile) return;
    
    console.log('[Achievements Modal] 🔍 Controllo obiettivi retroattivo...');
    
    const profile = { ...store.userProfile };
    const updatedProfile = checkAndCompleteAchievements(profile as any, store.settings.speedBoostTimer) as any;
    
    if (JSON.stringify(profile) !== JSON.stringify(updatedProfile)) {
      console.log('[Achievements Modal] ✅ Nuovi obiettivi completati!');
      const newStore = { ...store, userProfile: updatedProfile };
      setStore(newStore);
      storageSetItem('voidSurvivorsStore', JSON.stringify(newStore));
    }
  }, []); // Esegui solo una volta quando il modal viene aperto

  // Conta gli obiettivi completati per difficoltà
  const getCompletedCount = (difficulty?: 'S' | 'A' | 'B' | 'C' | 'D'): number => {
    return completedAchievements.filter(c => {
      const achievement = achievements.find(a => a.id === c.id);
      if (!achievement) return false;
      if (difficulty && achievement.difficulty !== difficulty) return false;
      return true;
    }).length;
  };

  const getTotalCount = (difficulty?: 'S' | 'A' | 'B' | 'C' | 'D'): number => {
    if (difficulty) {
      return achievements.filter(a => a.difficulty === difficulty).length;
    }
    return achievements.length;
  };

  return (
    <div className="vs-legacy-backdrop">
      <div className="vs-legacy-modal max-w-4xl" style={{ ['--accent' as any]: '#fb923c' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-3xl font-bold text-white">🏆 {t(lang, 'achievements')}</h2>
          <button onClick={onClose} className="text-white text-2xl sm:text-3xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:scale-110 transition-transform">×</button>
        </div>

        {/* Statistiche generali */}
        <div className="bg-black/30 rounded-xl p-2 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-5 gap-1 sm:gap-3 text-center">
            {(['S', 'A', 'B', 'C', 'D'] as const).map(difficulty => (
              <div key={difficulty} className="bg-black/40 rounded-lg p-1.5 sm:p-3">
                <div className="text-lg sm:text-2xl font-bold" style={{ color: getDifficultyColor(difficulty) }}>
                  {difficulty}
                </div>
                <div className="text-xs sm:text-sm text-gray-300">
                  {getCompletedCount(difficulty)}/{getTotalCount(difficulty)}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
                  {getDifficultyName(difficulty, lang)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtri */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold transition-all text-xs sm:text-sm ${
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-black/40 text-gray-300 hover:bg-black/60'
            }`}
          >
            {getCompletedCount()}/{getTotalCount()}
          </button>
          {(['S', 'A', 'B', 'C', 'D'] as const).map(difficulty => (
            <button
              key={difficulty}
              onClick={() => setFilter(difficulty)}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold transition-all text-xs sm:text-sm ${
                filter === difficulty 
                  ? 'text-white' 
                  : 'bg-black/40 text-gray-300 hover:bg-black/60'
              }`}
              style={{ 
                backgroundColor: filter === difficulty ? getDifficultyColor(difficulty) : undefined,
                borderColor: getDifficultyColor(difficulty),
                borderWidth: '2px',
                borderStyle: 'solid'
              }}
            >
              {difficulty} ({getCompletedCount(difficulty)})
            </button>
          ))}
          <button
            onClick={() => setShowCompletedOnly(!showCompletedOnly)}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold transition-all text-xs sm:text-sm ml-auto ${
              showCompletedOnly 
                ? 'bg-green-600 text-white' 
                : 'bg-black/40 text-gray-300 hover:bg-black/60'
            }`}
          >
            {showCompletedOnly ? '✓' : '👁️'}
          </button>
        </div>

        {/* Lista obiettivi */}
        <div className="space-y-3">
          {filteredAchievements.map(achievement => {
            const completed = isCompleted(achievement.id);
            const claimed = isClaimed(achievement.id);
            const progress = getProgress(achievement);
            const current = achievement.check(stats);

            return (
              <div
                key={achievement.id}
                className={`bg-black/40 rounded-xl p-3 sm:p-4 border-2 transition-all relative ${
                  completed 
                    ? claimed 
                      ? 'border-green-500/50' 
                      : 'border-yellow-500/50 animate-pulse'
                    : 'border-gray-600/30'
                }`}
                style={{ borderColor: completed ? undefined : `${getDifficultyColor(achievement.difficulty)}40` }}
              >
                {/* Stato in alto a destra (solo mobile) */}
                <div className="absolute top-2 right-2 sm:hidden">
                  {completed ? (
                    claimed ? (
                      <div className="px-2 py-1 rounded-lg bg-green-600/20 border-2 border-green-500/50 text-green-400 font-bold text-xs">
                        ✓
                      </div>
                    ) : (
                      <button
                        onClick={() => claimReward(achievement.id)}
                        className="px-2 py-1 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs transition-all hover:scale-105"
                      >
                        🎁
                      </button>
                    )
                  ) : (
                    <div className="px-2 py-1 rounded-lg bg-gray-600/20 border-2 border-gray-500/50 text-gray-400 font-bold text-xs">
                      🔒{Math.floor(progress * 100)}%
                    </div>
                  )}
                </div>

                {/* Layout Mobile: Verticale */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  {/* Icona e Difficoltà */}
                  <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
                    <div 
                      className="text-3xl sm:text-4xl flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg"
                      style={{ 
                        backgroundColor: `${getDifficultyColor(achievement.difficulty)}20`,
                        border: `2px solid ${getDifficultyColor(achievement.difficulty)}`
                      }}
                    >
                      {achievement.icon}
                    </div>
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-bold sm:text-sm"
                      style={{ 
                        backgroundColor: getDifficultyColor(achievement.difficulty),
                        color: '#fff'
                      }}
                    >
                      {achievement.difficulty}
                    </span>
                  </div>

                  {/* Contenuto */}
                  <div className="flex-1 min-w-0 pr-12 sm:pr-0">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1 break-words">
                      {t(lang, achievement.name)}
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-300 mb-2 break-words">
                      {t(lang, achievement.description)}
                    </p>

                    {/* Ricompense */}
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm mb-2">
                      <span className="text-yellow-400 font-bold">
                        💰 {achievement.rewardCoins}
                      </span>
                      <span className="text-cyan-400 font-bold">
                        💎 {achievement.rewardDiamonds}
                      </span>
                    </div>

                    {/* Barra progresso */}
                    {!completed && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{Math.floor(current)}/{achievement.target}</span>
                          <span>{Math.floor(progress * 100)}%</span>
                        </div>
                        <div className="w-full bg-black/60 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${progress * 100}%`,
                              backgroundColor: getDifficultyColor(achievement.difficulty)
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Azione (solo desktop) */}
                  <div className="hidden sm:block flex-shrink-0 sm:self-center">
                    {completed ? (
                      claimed ? (
                        <div className="px-4 py-2 rounded-lg bg-green-600/20 border-2 border-green-500/50 text-green-400 font-bold text-sm">
                          ✓ {t(lang, 'achievement_claimed')}
                        </div>
                      ) : (
                        <button
                          onClick={() => claimReward(achievement.id)}
                          className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-all hover:scale-105"
                        >
                          🎁 {t(lang, 'achievement_claim')}
                        </button>
                      )
                    ) : (
                      <div className="px-4 py-2 rounded-lg bg-gray-600/20 border-2 border-gray-500/50 text-gray-400 font-bold text-sm">
                        🔒 {Math.floor(progress * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-gray-400">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎯</div>
            <p className="text-sm sm:text-lg">Nessun obiettivo trovato</p>
          </div>
        )}
      </div>
    </div>
  );
};
