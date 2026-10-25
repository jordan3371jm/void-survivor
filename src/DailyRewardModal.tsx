import React, { useState } from 'react';
import { Check, Coins, Flame, Gem, Gift, Lock, X } from 'lucide-react';
import { GameStore } from './game/store';
import { Language } from './game/i18n';
import { getLoginRewardsState, claimDailyReward, LoginRewardsState } from './game/loginRewards';

interface DailyRewardModalProps { store: GameStore; setStore: (store: GameStore) => void; lang: Language; onClose: () => void; }

const L = (lang: Language, it: string, en: string, es: string, fr: string, zh: string) => ({ it, en, es, fr, zh }[lang] ?? en);

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ store, setStore, lang, onClose }) => {
  const [loginState, setLoginState] = useState<LoginRewardsState>(() => getLoginRewardsState());
  const [justClaimed, setJustClaimed] = useState(false);

  const handleClaim = () => {
    const result = claimDailyReward(loginState);
    if (!result) return;
    setStore({ ...store, coins: store.coins + result.coins, diamonds: store.diamonds + result.diamonds });
    setLoginState({ ...result.newState });
    setJustClaimed(true);
  };

  const today = loginState.rewards.find(r => r.day === loginState.loginStreak);
  const canClaim = !!today && !today.claimed;

  return (
    <div className="vs-modal-backdrop" onClick={onClose}>
      <div className="vs-modal vs-modal--wide vs-daily" onClick={e => e.stopPropagation()}>
        <div className="vs-modal-head">
          <h2><Gift size={20} />{L(lang, 'Ricompensa giornaliera', 'Daily reward', 'Recompensa diaria', 'Récompense du jour', '每日奖励')}</h2>
          <button type="button" className="vs-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="vs-daily-streak">
          <Flame size={26} />
          <div>
            <b>{L(lang, 'Serie di accessi', 'Login streak', 'Racha de acceso', 'Série de connexions', '连续登录')}: {loginState.loginStreak}/7</b>
            <span className="vs-muted">{L(lang, 'Torna ogni giorno: il 7° giorno vale di più!', 'Come back every day: day 7 is the big one!', '¡Vuelve cada día: el día 7 es el mejor!', 'Reviens chaque jour : le 7e jour rapporte gros !', '每天回来：第7天奖励最丰厚！')}</span>
          </div>
        </div>
        <div className="vs-daily-grid">
          {loginState.rewards.map(r => {
            const isToday = r.day === loginState.loginStreak;
            const state = r.claimed ? 'is-claimed' : isToday ? 'is-today' : r.day < loginState.loginStreak ? 'is-missed' : 'is-locked';
            return (
              <div key={r.day} className={`vs-daily-day ${state}${r.day === 7 ? ' is-big' : ''}`}>
                <span className="vs-daily-label">{L(lang, 'Giorno', 'Day', 'Día', 'Jour', '第')} {r.day}{lang === 'zh' ? '天' : ''}</span>
                <span className="vs-daily-icon">{r.claimed ? <Check size={22} /> : isToday ? <Gift size={22} /> : <Lock size={18} />}</span>
                <span className="vs-daily-val"><Coins size={12} />{r.coins}</span>
                <span className="vs-daily-val is-gem"><Gem size={12} />{r.diamonds}</span>
              </div>
            );
          })}
        </div>
        {canClaim ? (
          <button type="button" className="vs-btn vs-btn--accent vs-btn--block vs-btn--lg" onClick={handleClaim}>
            <Gift size={20} />{L(lang, 'Riscuoti', 'Claim', 'Reclamar', 'Réclamer', '领取')} · <Coins size={16} />{today!.coins} · <Gem size={16} />{today!.diamonds}
          </button>
        ) : (
          <div className="vs-daily-done"><Check size={18} />{justClaimed ? L(lang, 'Ricompensa riscossa!', 'Reward claimed!', '¡Recompensa reclamada!', 'Récompense obtenue !', '奖励已领取！') : L(lang, 'Già riscossa oggi, torna domani!', 'Already claimed today, come back tomorrow!', 'Ya reclamada hoy, ¡vuelve mañana!', "Déjà réclamée aujourd'hui, reviens demain !", '今天已领取，明天再来！')}</div>
        )}
      </div>
    </div>
  );
};
