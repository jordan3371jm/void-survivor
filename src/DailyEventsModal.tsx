import React, { useEffect, useState } from 'react';
import { CalendarDays, CalendarRange, Check, Clock, Coins, Crown, Gem, Gift, Rocket, Skull, Sparkles, Star, Swords, Timer, Waves, X, Sun } from 'lucide-react';
import { GameStore } from './game/store';
import { Language } from './game/i18n';
import { claimMission, getMissionsState, missionText, missionValue, msUntilReset, MissionKind, MissionPeriod, MissionsState } from './game/dailyChallenges';

interface DailyEventsModalProps { store: GameStore; setStore: (store: GameStore) => void; lang: Language; onClose: () => void; }

const L = (lang: Language, it: string, en: string, es: string, fr: string, zh: string) => ({ it, en, es, fr, zh }[lang] ?? en);

const ICONS: Record<MissionKind, React.ReactNode> = {
  kills: <Skull size={22} />, bosses: <Crown size={22} />, coins: <Coins size={22} />, runs: <Rocket size={22} />, chests: <Gift size={22} />,
  evolutions: <Sparkles size={22} />, playtime: <Clock size={22} />, boss_rush: <Swords size={22} />, survive: <Timer size={22} />, level: <Star size={22} />, wave: <Waves size={22} />,
};
const COLORS: Record<MissionKind, string> = {
  kills: '#ff6b8b', bosses: '#fbbf24', coins: '#f5c542', runs: '#22d3ee', chests: '#f59e0b', evolutions: '#fde047',
  playtime: '#a78bfa', boss_rush: '#f97316', survive: '#34d399', level: '#c084fc', wave: '#38bdf8',
};

function fmtCountdown(ms: number, lang: Language): string {
  const s = Math.floor(ms / 1000); const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  const dl = L(lang, 'g', 'd', 'd', 'j', '天');
  return d > 0 ? `${d}${dl} ${h}h` : `${h}h ${m}m`;
}

export const DailyEventsModal: React.FC<DailyEventsModalProps> = ({ store, setStore, lang, onClose }) => {
  const [state, setState] = useState<MissionsState>(() => getMissionsState());
  const [period, setPeriod] = useState<MissionPeriod>('daily');
  const [, tick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => tick(x => x + 1), 30000); return () => window.clearInterval(id); }, []);

  const claim = (id: string) => {
    const r = claimMission(state, period, id);
    if (!r) return;
    setStore({ ...store, coins: store.coins + r.coins, diamonds: store.diamonds + r.diamonds });
    setState({ ...state });
  };

  const tabs: { key: MissionPeriod; label: string; icon: React.ReactNode }[] = [
    { key: 'daily', label: L(lang, 'Giornaliere', 'Daily', 'Diarias', 'Quotidiennes', '每日'), icon: <Sun size={16} /> },
    { key: 'weekly', label: L(lang, 'Settimanali', 'Weekly', 'Semanales', 'Hebdo', '每周'), icon: <CalendarDays size={16} /> },
    { key: 'monthly', label: L(lang, 'Mensili', 'Monthly', 'Mensuales', 'Mensuelles', '每月'), icon: <CalendarRange size={16} /> },
  ];
  const claimableIn = (p: MissionPeriod) => state[p].missions.filter(mi => { const pr = state[p].progress[mi.id]; return pr && !pr.claimed && pr.current >= mi.target; }).length;
  const ps = state[period];
  const done = ps.missions.filter(mi => (ps.progress[mi.id]?.current || 0) >= mi.target).length;

  return (
    <div className="vs-modal-backdrop" onClick={onClose}>
      <div className="vs-modal vs-modal--wide vs-missions" onClick={e => e.stopPropagation()}>
        <div className="vs-modal-head">
          <h2><CalendarDays size={20} />{L(lang, 'Missioni', 'Missions', 'Misiones', 'Missions', '任务')}</h2>
          <button type="button" className="vs-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="vs-tabs" role="tablist">
          {tabs.map(tb => (
            <button key={tb.key} type="button" role="tab" aria-selected={period === tb.key} className={`vs-tab${period === tb.key ? ' is-active' : ''}`} onClick={() => setPeriod(tb.key)}>
              {tb.icon}{tb.label}{claimableIn(tb.key) > 0 && <span className="vs-tab-dot">{claimableIn(tb.key)}</span>}
            </button>
          ))}
        </div>
        <div className="vs-missions-meta">
          <span>{done}/{ps.missions.length} {L(lang, 'completate', 'completed', 'completadas', 'terminées', '已完成')}</span>
          <span><Clock size={14} />{L(lang, 'Rinnovo tra', 'Resets in', 'Se renueva en', 'Renouvellement dans', '刷新倒计时')} {fmtCountdown(msUntilReset(period), lang)}</span>
        </div>
        <div className="vs-mission-list">
          {ps.missions.map(mi => {
            const pr = ps.progress[mi.id]; const cur = pr?.current || 0; const complete = cur >= mi.target; const claimed = !!pr?.claimed;
            return (
              <div key={mi.id} className={`vs-mission${complete ? ' is-complete' : ''}${claimed ? ' is-claimed' : ''}`} style={{ ['--accent' as any]: COLORS[mi.kind] }}>
                <span className="vs-mission-icon">{ICONS[mi.kind]}</span>
                <div className="vs-mission-body">
                  <b>{missionText(mi, lang)}</b>
                  <span className="vs-progress"><span style={{ width: `${Math.min(100, (cur / mi.target) * 100)}%` }} /></span>
                  <div className="vs-mission-foot">
                    <span className="vs-muted">{missionValue(mi, cur)}</span>
                    <span className="vs-mission-reward"><Coins size={13} />{mi.coins}<Gem size={13} />{mi.diamonds}</span>
                  </div>
                </div>
                {claimed ? <span className="vs-mission-state is-done"><Check size={18} /></span>
                  : complete ? <button type="button" className="vs-btn vs-btn--sm vs-btn--accent" onClick={() => claim(mi.id)}><Gift size={15} />{L(lang, 'Riscuoti', 'Claim', 'Reclamar', 'Réclamer', '领取')}</button>
                  : <span className="vs-mission-state">{Math.floor((cur / mi.target) * 100)}%</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
