import React, { useState, useEffect } from 'react';
import { GameStore } from './game/store';
import { t, Language } from './game/i18n';
import { getDailyChallengesState, claimChallengeReward, DailyChallengesState } from './game/dailyChallenges';

interface DailyEventsModalProps {
  store: GameStore;
  setStore: (store: GameStore) => void;
  lang: Language;
  onClose: () => void;
}

export const DailyEventsModal: React.FC<DailyEventsModalProps> = ({ store, setStore, lang, onClose }) => {
  const [challengesState, setChallengesState] = useState<DailyChallengesState>(getDailyChallengesState());

  const handleClaim = (challengeId: string) => {
    const result = claimChallengeReward(challengesState, challengeId);
    if (result) {
      // Aggiungi le ricompense al negozio
      const newStore = {
        ...store,
        coins: store.coins + result.coins,
        diamonds: store.diamonds + result.diamonds
      };
      setStore(newStore);
      setChallengesState({ ...result.newState });
    }
  };

  return (
    <div className="vs-legacy-backdrop">
      <div className="vs-legacy-modal max-w-md" style={{ ['--accent' as any]: '#34d399' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">📅 {t(lang, 'daily_events')}</h2>
          <button onClick={onClose} className="vs-icon-btn text-xl">×</button>
        </div>

        <p className="text-gray-300 text-sm mb-6 text-center">{t(lang, 'daily_events_desc')}</p>

        {/* Challenges List */}
        <div className="space-y-4">
          {challengesState.challenges.map((challenge) => {
            const progress = challengesState.progress.find(p => p.challengeId === challenge.id);
            const current = progress?.current || 0;
            const completed = progress?.completed || false;
            const claimed = progress?.claimed || false;
            const progressPercent = Math.min((current / challenge.target) * 100, 100);

            return (
              <div
                key={challenge.id}
                className={`bg-black/40 rounded-xl p-4 border-2 transition-all ${
                  completed
                    ? claimed
                      ? 'border-green-500/50'
                      : 'border-yellow-500/50 animate-pulse'
                    : 'border-gray-600/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="text-3xl flex-shrink-0">{challenge.icon}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-1">
                      {t(lang, challenge.description)}
                    </h3>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{current}/{challenge.target}</span>
                        <span>{Math.floor(progressPercent)}%</span>
                      </div>
                      <div className="w-full bg-black/60 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: completed ? '#22c55e' : '#f59e0b'
                          }}
                        />
                      </div>
                    </div>

                    {/* Rewards */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-yellow-400 font-bold">💰 {challenge.rewardCoins}</span>
                      <span className="text-cyan-400 font-bold">💎 {challenge.rewardDiamonds}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {completed ? (
                      claimed ? (
                        <div className="px-3 py-1.5 rounded-lg bg-green-600/20 border-2 border-green-500/50 text-green-400 font-bold text-xs">
                          ✓ {t(lang, 'daily_challenge_claimed')}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaim(challenge.id)}
                          className="px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs transition-all hover:scale-105"
                        >
                          🎁 {t(lang, 'daily_challenge_claim')}
                        </button>
                      )
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg bg-gray-600/20 border-2 border-gray-500/50 text-gray-400 font-bold text-xs">
                        🔒 {Math.floor(progressPercent)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
