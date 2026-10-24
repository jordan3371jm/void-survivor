import React, { useState, useEffect } from 'react';
import { GameStore } from './game/store';
import { t, Language } from './game/i18n';
import { getLoginRewardsState, claimDailyReward, LoginRewardsState } from './game/loginRewards';

interface DailyRewardModalProps {
  store: GameStore;
  setStore: (store: GameStore) => void;
  lang: Language;
  onClose: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ store, setStore, lang, onClose }) => {
  const [loginState, setLoginState] = useState<LoginRewardsState>(getLoginRewardsState());

  const handleClaim = () => {
    const result = claimDailyReward(loginState);
    if (result) {
      // Aggiungi le ricompense al negozio
      const newStore = {
        ...store,
        coins: store.coins + result.coins,
        diamonds: store.diamonds + result.diamonds
      };
      setStore(newStore);
      setLoginState({ ...result.newState });
    }
  };

  const currentDayReward = loginState.rewards.find(r => r.day === loginState.loginStreak);
  const canClaim = currentDayReward && !currentDayReward.claimed;

  return (
    <div className="vs-legacy-backdrop">
      <div className="vs-legacy-modal max-w-md" style={{ ['--accent' as any]: '#fbbf24' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">🎁 {t(lang, 'daily_reward')}</h2>
          <button onClick={onClose} className="vs-icon-btn text-xl">×</button>
        </div>

        {/* Streak Counter */}
        <div className="bg-black/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-yellow-400 font-bold text-lg mb-2">{t(lang, 'login_streak')}: {loginState.loginStreak} 🔥</p>
          <p className="text-gray-300 text-sm">{t(lang, 'daily_reward_desc')}</p>
        </div>

        {/* 7 Days Rewards Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {loginState.rewards.map((reward) => {
            const isCurrentDay = reward.day === loginState.loginStreak;
            const isClaimed = reward.claimed;
            const isPast = reward.day < loginState.loginStreak;

            return (
              <div
                key={reward.day}
                className={`rounded-lg p-2 text-center border-2 transition-all ${
                  isCurrentDay
                    ? 'bg-yellow-500/30 border-yellow-400 scale-110 shadow-lg shadow-yellow-500/50'
                    : isClaimed
                    ? 'bg-green-500/20 border-green-500/50'
                    : isPast
                    ? 'bg-gray-500/20 border-gray-500/30 opacity-50'
                    : 'bg-black/40 border-gray-600/30'
                }`}
              >
                <div className="text-xs font-bold text-white mb-1">D{reward.day}</div>
                <div className="text-lg mb-1">{isClaimed ? '✅' : isCurrentDay ? '🎁' : '🔒'}</div>
                <div className="text-xs text-yellow-400 font-bold">{reward.coins}💰</div>
                <div className="text-xs text-cyan-400 font-bold">{reward.diamonds}💎</div>
              </div>
            );
          })}
        </div>

        {/* Claim Button */}
        {canClaim && (
          <button
            onClick={handleClaim}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/50"
          >
            🎁 {t(lang, 'login_reward_claim')} - {currentDayReward?.coins}💰 + {currentDayReward?.diamonds}💎
          </button>
        )}

        {!canClaim && (
          <div className="w-full py-4 rounded-xl font-bold text-center text-green-400 bg-green-500/20 border-2 border-green-500/50">
            ✓ {t(lang, 'login_reward_claimed')}
          </div>
        )}
      </div>
    </div>
  );
};
