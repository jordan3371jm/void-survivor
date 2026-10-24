import { achievements, CompletedAchievement, AchievementStats } from './achievements';
import { UserProfile } from './store';

// Funzione per controllare e completare gli obiettivi
export function checkAndCompleteAchievements(profile: UserProfile, speedBoostTimer: number = 0): UserProfile {
  console.log('[Achievements] 🔍 Controllo obiettivi iniziato...');
  console.log('[Achievements] Profilo:', {
    currentKills: profile.currentKills,
    currentPlayTime: profile.currentPlayTime,
    currentLevel: profile.currentLevel,
    currentScore: profile.currentScore,
    currentWave: profile.currentWave,
    totalKills: profile.totalKills,
    totalBossesDefeated: profile.totalBossesDefeated,
    totalPlayTime: profile.totalPlayTime,
    totalGamesPlayed: profile.totalGamesPlayed,
    speedBoostTimer: speedBoostTimer
  });

  // Calcola le statistiche del giocatore
  const stats: AchievementStats = {
    // Statistiche per partita singola
    currentKills: profile.currentKills || 0,
    currentPlayTime: profile.currentPlayTime || 0,
    currentLevel: profile.currentLevel || 0,
    currentScore: profile.currentScore || 0,
    currentWave: profile.currentWave || 0,
    
    // Statistiche totali
    totalKills: profile.totalKills || 0,
    totalBossesDefeated: profile.totalBossesDefeated || 0,
    totalPlayTime: profile.totalPlayTime || 0,
    totalGamesPlayed: profile.totalGamesPlayed || 0,
    maxScore: profile.maxScore || 0,
    maxLevel: profile.maxLevel || 0,
    maxWave: profile.maxWave || 0,
    
    // Timer attuale velocità x2
    currentSpeedBoostTimer: speedBoostTimer
  };

  console.log('[Achievements] 📊 Statistiche calcolate:', stats);

  // Inizializza completedAchievements se non esiste
  if (!profile.completedAchievements) {
    profile.completedAchievements = [];
    console.log('[Achievements] 📝 Inizializzati completedAchievements');
  }

  let hasChanges = false;

  // Controlla ogni obiettivo
  achievements.forEach(achievement => {
    const current = achievement.check(stats);
    const isAlreadyCompleted = profile.completedAchievements?.some((c: CompletedAchievement) => c.id === achievement.id);

    console.log(`[Achievements] 🔎 ${achievement.name}: ${current}/${achievement.target} (completato: ${isAlreadyCompleted})`);

    if (current >= achievement.target && !isAlreadyCompleted) {
      profile.completedAchievements!.push({
        id: achievement.id,
        completedAt: Date.now(),
        claimed: false
      });
      hasChanges = true;
      console.log(`[Achievements] ✅ Obiettivo completato: ${achievement.name} (${current}/${achievement.target})`);
    }
  });

  if (hasChanges) {
    console.log(`[Achievements] 🎉 ${profile.completedAchievements!.length} obiettivi completati in totale`);
  } else {
    console.log('[Achievements] ⚠️ Nessun nuovo obiettivo completato');
  }

  return profile;
}
