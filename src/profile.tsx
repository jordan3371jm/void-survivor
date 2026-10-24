import React, { useState, useEffect } from 'react';
import { GameStore, createUserProfile, saveUserProfile } from './game/store';
import { t, Language } from './game/i18n';
import { loginWithEmail, registerWithEmail, logout as firebaseLogout, getUserScores, saveUserData } from './game/auth';
import { GlobalScore } from './game/firebase';

interface ProfileModalProps { store: GameStore; setStore: (store: GameStore) => void; lang: Language; onClose: () => void; }

export const ProfileModal: React.FC<ProfileModalProps> = ({ store, setStore, lang, onClose }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || (!isLogin && !name)) { setError(isLogin ? t(lang, 'enter_email_password') : t(lang, 'enter_email_password_name')); return; }
    if (!password || password.length < 6) { setError(t(lang, 'password_min_length')); return; }
    setLoading(true); setError('');
    try {
      let user;
      if (isLogin) { user = await loginWithEmail(email, password); } else { user = await registerWithEmail(email, password, name); }
      if (user) { const profile = createUserProfile(user.email || email, user.displayName || name, ''); profile.id = user.uid; setStore(saveUserProfile(store, profile)); onClose(); }
    } catch (err: any) { setError(err.message || t(lang, 'auth_error')); } finally { setLoading(false); }
  };

  const handleLogout = async () => { try { await firebaseLogout(); setStore({ ...store, userProfile: null }); onClose(); } catch (err: any) { setError(err.message || t(lang, 'logout_error')); } };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setError(t(lang, 'select_valid_image')); return; }
    if (file.size > 2 * 1024 * 1024) { setError(t(lang, 'image_too_large')); return; }
    const reader = new FileReader();
    reader.onloadend = () => { const base64 = reader.result as string; if (store.userProfile) { const updatedProfile = { ...store.userProfile, avatar: base64 }; setStore(saveUserProfile(store, updatedProfile)); } };
    reader.readAsDataURL(file);
  };

  if (store.userProfile) {
    const totalKills = store.userProfile.totalKills || 0;
    const totalBosses = store.userProfile.totalBossesDefeated || 0;
    const abilityStats = store.userProfile.abilityDamageStats || {};
    const sortedAbilities = Object.entries(abilityStats).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return (
      <div className="vs-legacy-backdrop">
        <div className="vs-legacy-modal max-w-md" style={{ ['--accent' as any]: '#a855f7' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">{t(lang, 'profile')}</h2>
            <button onClick={onClose} className="vs-icon-btn text-xl">×</button>
          </div>
          <div className="text-center mb-6">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="w-full h-full rounded-full bg-black/50 border-2 border-purple-500/50 flex items-center justify-center overflow-hidden">
                {store.userProfile.avatar && store.userProfile.avatar.startsWith('data:image') ? <img src={store.userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-5xl">{store.userProfile.avatar || '👤'}</span>}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-500 transition-colors border-2 border-purple-400">
                <span className="text-white text-sm">📷</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
            <h3 className="text-xl font-bold text-white">{store.userProfile.name}</h3>
            <p className="text-gray-300 text-sm">{store.userProfile.email}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 mb-4">
            <h4 className="text-white font-bold mb-2">💰 {t(lang, 'coins')}: <span className="text-yellow-400">{store.coins}</span></h4>
            <h4 className="text-white font-bold mb-2">💎 {t(lang, 'diamonds')}: <span className="text-cyan-400">{store.diamonds}</span></h4>
          </div>
          <div className="bg-black/30 rounded-xl p-4 mb-4">
            <h4 className="text-white font-bold mb-3 text-lg">📊 Statistiche Generali</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-red-400">{totalKills.toLocaleString()}</p><p className="text-xs text-gray-400">{t(lang, 'enemies_killed')}</p></div>
              <div className="bg-black/40 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-purple-400">{totalBosses}</p><p className="text-xs text-gray-400">{t(lang, 'bosses_defeated')}</p></div>
              <div className="bg-black/40 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-cyan-400">{store.userProfile.highScores.length}</p><p className="text-xs text-gray-400">{t(lang, 'matches_played')}</p></div>
              <div className="bg-black/40 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-yellow-400">{store.userProfile.highScores.length > 0 ? Math.max(...store.userProfile.highScores.map(h => h.score)).toLocaleString() : '0'}</p><p className="text-xs text-gray-400">{t(lang, 'best_score')}</p></div>
            </div>
          </div>
          {sortedAbilities.length > 0 && (
            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <h4 className="text-white font-bold mb-3 text-lg">⚔️ {t(lang, 'top_10_weapons')}</h4>
              <div className="space-y-2">
                {sortedAbilities.map(([abilityType, damage], index) => (
                  <div key={abilityType} className="flex items-center justify-between bg-black/40 rounded-lg p-2">
                    <div className="flex items-center gap-2"><span className="text-yellow-400 font-bold text-sm">#{index + 1}</span><span className="text-white text-sm capitalize">{abilityType.replace(/_/g, ' ')}</span></div>
                    <span className="text-red-400 font-bold text-sm">{damage.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="w-full py-3 rounded-xl font-bold text-white bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30">{t(lang, 'logout')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vs-legacy-backdrop">
      <div className="vs-legacy-modal max-w-md" style={{ ['--accent' as any]: '#a855f7' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{isLogin ? t(lang, 'login') : t(lang, 'register')}</h2>
          <button onClick={onClose} className="vs-icon-btn text-xl">×</button>
        </div>
        {error && <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4"><p className="text-red-300 text-sm">{error}</p></div>}
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-black/50 border-2 border-purple-500/50 text-white focus:border-purple-400 outline-none" placeholder={t(lang, 'email')} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-black/50 border-2 border-purple-500/50 text-white focus:border-purple-400 outline-none" placeholder={t(lang, 'password')} />
          {!isLogin && <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-black/50 border-2 border-purple-500/50 text-white focus:border-purple-400 outline-none" placeholder={t(lang, 'name')} />}
          <button onClick={handleEmailAuth} disabled={loading || !email || !password || (!isLogin && !name)} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50">{loading ? '...' : (isLogin ? t(lang, 'login') : t(lang, 'register'))}</button>
          <div className="text-center pt-2 border-t border-purple-500/30">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); setName(''); }} className="text-purple-300 hover:text-purple-200 font-semibold">{isLogin ? `📝 ${t(lang, 'register')}` : `🔑 ${t(lang, 'login')}`}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LeaderboardModalProps { store: GameStore; lang: Language; onClose: () => void; }

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ store, lang, onClose }) => {
  const [personalScores, setPersonalScores] = useState<GlobalScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScores = async () => {
      setLoading(true);
      try {
        if (store.userProfile) { const personal = await getUserScores(store.userProfile.id); setPersonalScores(personal); }
      } catch (error) { console.error('Errore caricamento classifica:', error); } finally { setLoading(false); }
    };
    loadScores();
  }, [store.userProfile]);

  return (
    <div className="vs-legacy-backdrop">
      <div className="vs-legacy-modal max-w-2xl" style={{ ['--accent' as any]: '#a855f7' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">🏆 {t(lang, 'leaderboard')}</h2>
          <button onClick={onClose} className="text-white text-2xl hover:scale-110 w-10 h-10 flex items-center justify-center rounded-full bg-white/10">×</button>
        </div>
        {loading ? (<div className="text-center py-12"><div className="text-5xl mb-4 animate-spin inline-block">🔄</div><p className="text-gray-400">{t(lang, 'loading_leaderboard')}</p></div>) : (
          <div className="space-y-3">
            {!store.userProfile ? (<div className="text-center py-12"><div className="text-6xl mb-4">🔒</div><p className="text-gray-400">{t(lang, 'login_required')}</p></div>) : personalScores.length === 0 ? (<div className="text-center py-12"><div className="text-6xl mb-4">🎮</div><p className="text-gray-400">{t(lang, 'play_first_match')}</p></div>) : personalScores.map((score, index) => (<div key={index} className="bg-black/40 rounded-xl p-4 flex items-center gap-4 border border-purple-500/30"><div className="text-2xl font-black text-purple-400">#{index + 1}</div><div><p className="text-white font-bold text-xl">{score.score}</p><p className="text-gray-400 text-sm">{score.kills} {t(lang, 'kills')} • Lv.{score.level}</p></div></div>))}
          </div>
        )}
      </div>
    </div>
  );
};