import React, { useEffect, useState } from 'react';
import { Award, Camera, Clock, Crown, ExternalLink, Gamepad2, Globe, Pencil, Skull, Star, Swords, Trophy, User, Waves, X } from 'lucide-react';
import { GameStore, createUserProfile, loadStore, saveUserProfile } from './game/store';
import { t, Language } from './game/i18n';
import { plFromEn } from './game/pl';
import { isKlyo } from './game/klyo';
import { getAbilityInfo } from './game/abilityInfo';
import { AbilityIcon } from './components/abilityIcon';
import { authorizePlatformPlayer, fetchGlobalLeaderboard, getLeaderboardKind, getPlatformPlayer, GlobalEntry, showNativeLeaderboard } from './game/bridge';

const L = (lang: Language, it: string, en: string, es: string, fr: string, zh: string) => (lang === 'pl' ? plFromEn(en) : ({ it, en, es, fr, zh } as Record<string, string>)[lang] ?? en);
const clean = (s: string) => s.replace(/^[\p{Extended_Pictographic}️☀-➿\s]+/u, '').replace(/[\s\p{Extended_Pictographic}️☀-➿]+$/u, '').trim();
const int = (n: number | undefined) => String(Math.round(n || 0));
const fmtTime = (s: number) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`; };
const AVATARS = ['🚀', '👽', '🛸', '🤖', '🌌', '☄️', '🪐', '👾', '🌟', '🦾'];

function Avatar({ value, size = 84 }: { value?: string; size?: number }) {
  const isImg = !!value && (value.startsWith('data:image') || value.startsWith('http'));
  return (
    <span className="vs-avatar" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {isImg ? <img src={value} alt="" /> : value || <User size={size * 0.5} />}
    </span>
  );
}

interface ProfileModalProps { store: GameStore; setStore: (store: GameStore) => void; lang: Language; onClose: () => void; }

export const ProfileModal: React.FC<ProfileModalProps> = ({ store, setStore, lang, onClose }) => {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const profile = store.userProfile || createUserProfile('local@player.com', L(lang, 'Pilota', 'Pilot', 'Piloto', 'Pilote', '飞行员'), '🚀');
  const [name, setName] = useState(profile.name === 'Giocatore Locale' ? '' : profile.name);
  const platform = getPlatformPlayer();

  const update = (patch: Partial<typeof profile>) => setStore(saveUserProfile(store, { ...profile, ...patch }));
  const saveName = () => { const n = name.trim().slice(0, 18); if (n) update({ name: n }); setEditing(false); };
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setError(t(lang, 'select_valid_image')); return; }
    if (file.size > 2 * 1024 * 1024) { setError(t(lang, 'image_too_large')); return; }
    const reader = new FileReader();
    reader.onloadend = () => { update({ avatar: reader.result as string }); setError(''); };
    reader.readAsDataURL(file);
  };

  const games = profile.totalGamesPlayed || profile.highScores.length;
  const best = Math.max(profile.maxScore || 0, ...profile.highScores.map(h => h.score), 0);
  const stats = [
    { icon: <Gamepad2 size={18} />, label: L(lang, 'Partite', 'Runs', 'Partidas', 'Parties', '对局'), value: int(games), color: '#22d3ee' },
    { icon: <Skull size={18} />, label: L(lang, 'Nemici eliminati', 'Enemies defeated', 'Enemigos eliminados', 'Ennemis éliminés', '击败敌人'), value: int(profile.totalKills), color: '#ff6b8b' },
    { icon: <Crown size={18} />, label: L(lang, 'Boss sconfitti', 'Bosses defeated', 'Jefes derrotados', 'Boss vaincus', '击败Boss'), value: int(profile.totalBossesDefeated), color: '#fbbf24' },
    { icon: <Clock size={18} />, label: L(lang, 'Tempo di gioco', 'Play time', 'Tiempo de juego', 'Temps de jeu', '游戏时间'), value: fmtTime(profile.totalPlayTime || 0), color: '#a78bfa' },
    { icon: <Trophy size={18} />, label: L(lang, 'Miglior punteggio', 'Best score', 'Mejor puntuación', 'Meilleur score', '最高分'), value: int(best), color: '#f59e0b' },
    { icon: <Waves size={18} />, label: L(lang, 'Ondata massima', 'Highest wave', 'Oleada máxima', 'Vague max', '最高波次'), value: int(profile.maxWave), color: '#38bdf8' },
    { icon: <Star size={18} />, label: L(lang, 'Livello massimo', 'Highest level', 'Nivel máximo', 'Niveau max', '最高等级'), value: int(profile.maxLevel), color: '#c084fc' },
    { icon: <Award size={18} />, label: L(lang, 'Obiettivi', 'Achievements', 'Logros', 'Succès', '成就'), value: int(profile.completedAchievements?.length), color: '#34d399' },
  ];
  const weapons = Object.entries(profile.abilityDamageStats || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxDmg = weapons[0]?.[1] || 1;

  return (
    <div className="vs-modal-backdrop" onClick={onClose}>
      <div className="vs-modal vs-modal--wide vs-profile" onClick={e => e.stopPropagation()}>
        <div className="vs-modal-head">
          <h2><User size={20} />{L(lang, 'Profilo pilota', 'Pilot profile', 'Perfil de piloto', 'Profil du pilote', '飞行员档案')}</h2>
          <button type="button" className="vs-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="vs-profile-card">
          <label className="vs-pf-avatar" title={L(lang, 'Carica immagine', 'Upload image', 'Subir imagen', 'Importer une image', '上传图片')}>
            <Avatar value={profile.avatar} />
            <span className="vs-pf-cam"><Camera size={14} /></span>
            <input type="file" accept="image/*" onChange={onUpload} hidden />
          </label>
          <div className="vs-profile-id">
            {editing ? (
              // niente <form>: su Playgama il gioco gira in un iframe che blocca l'invio dei moduli (il clic su OK non arrivava)
              <div className="vs-row">
                <input className="vs-input" value={name} maxLength={18} autoFocus onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } }} placeholder={L(lang, 'Nome pilota', 'Pilot name', 'Nombre', 'Nom du pilote', '名字')} />
                <button type="button" className="vs-btn vs-btn--sm vs-btn--accent" onClick={saveName}>OK</button>
              </div>
            ) : (
              <button type="button" className="vs-pf-name" onClick={() => setEditing(true)}>{profile.name === 'Giocatore Locale' ? L(lang, 'Pilota', 'Pilot', 'Piloto', 'Pilote', '飞行员') : profile.name}<Pencil size={14} /></button>
            )}
            <div className="vs-avatar-pick">
              {AVATARS.map(a => <button key={a} type="button" className={profile.avatar === a ? 'is-active' : ''} onClick={() => update({ avatar: a })}>{a}</button>)}
            </div>
          </div>
        </div>
        {platform.supported && !platform.authorized && (
          <button type="button" className="vs-btn vs-btn--ghost vs-btn--block" onClick={async () => { if (await authorizePlatformPlayer()) { const pp = getPlatformPlayer(); const fresh = loadStore(); const base = fresh.userProfile || profile; setStore(saveUserProfile(fresh, { ...base, name: pp.name || base.name, avatar: pp.photo || base.avatar, id: pp.id || base.id })); } }}>
            <Globe size={16} />{L(lang, 'Accedi per entrare nella classifica globale', 'Sign in to join the global leaderboard', 'Inicia sesión para entrar en la clasificación global', 'Connecte-toi pour rejoindre le classement mondial', '登录以加入全球排行榜')}
          </button>
        )}
        {error && <p className="vs-error">{error}</p>}
        <div className="vs-stat-grid">
          {stats.map(s => (
            <div key={s.label} className="vs-stat-tile" style={{ ['--accent' as any]: s.color }}>
              <span className="vs-stat-icon">{s.icon}</span>
              <b>{s.value}</b>
              <small>{s.label}</small>
            </div>
          ))}
        </div>
        {weapons.length > 0 && (
          <>
            <h3 className="vs-section-title"><Swords size={16} />{L(lang, 'Armi preferite (danni totali)', 'Favourite weapons (total damage)', 'Armas favoritas (daño total)', 'Armes préférées (dégâts totaux)', '常用武器（总伤害）')}</h3>
            <div className="vs-damage-list">
              {weapons.map(([type, dmg]) => {
                const info = getAbilityInfo(type as any);
                return (
                  <div key={type} className="vs-damage-row" style={{ ['--accent' as any]: info.color }}>
                    <AbilityIcon type={type} color={info.color} size={30} />
                    <div className="vs-damage-info">
                      <div className="vs-row"><b>{clean(t(lang, info.name))}</b><span>{int(dmg)}</span></div>
                      <span className="vs-progress"><span style={{ width: `${(dmg / maxDmg) * 100}%` }} /></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface LeaderboardModalProps { store: GameStore; lang: Language; onClose: () => void; }

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ store, lang, onClose }) => {
  const kind = getLeaderboardKind();
  const [tab, setTab] = useState<'global' | 'personal'>(kind === 'in_game' ? 'global' : 'personal');
  const [entries, setEntries] = useState<GlobalEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const me = getPlatformPlayer();

  useEffect(() => {
    if (kind !== 'in_game') return;
    fetchGlobalLeaderboard().then(setEntries).catch(() => { setFailed(true); setEntries([]); });
  }, [kind]);

  const myName = store.userProfile?.name && store.userProfile.name !== 'Giocatore Locale' ? store.userProfile.name : L(lang, 'Pilota', 'Pilot', 'Piloto', 'Pilote', '飞行员');
  const personal = [...(store.userProfile?.highScores || [])].sort((a, b) => b.score - a.score).slice(0, 10);
  const medal = (r: number) => (r === 1 ? 'is-gold' : r === 2 ? 'is-silver' : r === 3 ? 'is-bronze' : '');

  return (
    <div className="vs-modal-backdrop" onClick={onClose}>
      <div className="vs-modal vs-modal--wide vs-leaderboard" onClick={e => e.stopPropagation()}>
        <div className="vs-modal-head">
          <h2><Trophy size={20} />{clean(t(lang, 'leaderboard'))}</h2>
          <button type="button" className="vs-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="vs-tabs" role="tablist">
          <button type="button" className={`vs-tab${tab === 'global' ? ' is-active' : ''}`} onClick={() => setTab('global')}><Globe size={16} />{L(lang, 'Globale', 'Global', 'Global', 'Mondial', '全球')}</button>
          <button type="button" className={`vs-tab${tab === 'personal' ? ' is-active' : ''}`} onClick={() => setTab('personal')}><User size={16} />{L(lang, 'I miei record', 'My records', 'Mis récords', 'Mes records', '我的记录')}</button>
        </div>
        {tab === 'global' ? (
          kind === 'in_game' ? (
            entries === null ? <p className="vs-muted vs-center">{clean(t(lang, 'loading_leaderboard'))}</p>
            : entries.length === 0 ? <p className="vs-muted vs-center">{failed ? L(lang, 'Classifica non raggiungibile, riprova più tardi.', 'Leaderboard unreachable, try again later.', 'Clasificación no disponible, inténtalo más tarde.', 'Classement indisponible, réessaie plus tard.', '排行榜暂不可用，请稍后再试。') : L(lang, 'Nessun punteggio ancora: sii il primo!', 'No scores yet: be the first!', 'Aún no hay puntuaciones: ¡sé el primero!', 'Pas encore de scores : sois le premier !', '暂无分数：成为第一名！')}</p>
            : (
              <>
              {!isKlyo && <p className="vs-muted vs-small vs-center">{L(lang, 'I nomi degli altri piloti sono assegnati da Playgama.', 'Other pilots’ names are assigned by Playgama.', 'Los nombres de los demás pilotos los asigna Playgama.', 'Les noms des autres pilotes sont attribués par Playgama.', '其他飞行员的名字由Playgama分配。')}</p>}
              <ol className="vs-rank-list">
                {entries.slice(0, 50).map(e => (
                  <li key={e.id + e.rank} className={`vs-rank-row ${medal(e.rank)}${me.id && e.id === me.id ? ' is-me' : ''}`}>
                    <span className="vs-rank-pos">{e.rank}</span>
                    <Avatar value={e.photo} size={32} />
                    <span className="vs-rank-name">{me.id && e.id === me.id ? <>{myName} <small className="vs-you">{L(lang, 'TU', 'YOU', 'TÚ', 'TOI', '你')}</small></> : e.name}</span>
                    <b className="vs-rank-score">{e.score}</b>
                  </li>
                ))}
              </ol>
              </>
            )
          ) : (
            <div className="vs-leader-info">
              <Globe size={34} />
              {kind === 'native_popup' ? (
                <>
                  <p>{L(lang, 'La classifica mondiale è gestita dalla piattaforma.', 'The world leaderboard is managed by the platform.', 'La clasificación mundial la gestiona la plataforma.', 'Le classement mondial est géré par la plateforme.', '全球排行榜由平台管理。')}</p>
                  <button type="button" className="vs-btn vs-btn--accent" onClick={() => void showNativeLeaderboard()}><ExternalLink size={16} />{L(lang, 'Apri classifica', 'Open leaderboard', 'Abrir clasificación', 'Ouvrir le classement', '打开排行榜')}</button>
                </>
              ) : kind === 'native' ? (
                <p>{L(lang, 'I tuoi punteggi vengono inviati alla classifica della piattaforma: la trovi nella pagina del gioco.', 'Your scores are sent to the platform leaderboard: you can find it on the game page.', 'Tus puntuaciones se envían a la clasificación de la plataforma: está en la página del juego.', 'Tes scores sont envoyés au classement de la plateforme : il est sur la page du jeu.', '你的分数会提交到平台排行榜，可在游戏页面查看。')}</p>
              ) : (
                <p>{L(lang, 'La classifica online non è disponibile su questa piattaforma. Sfida te stesso con i tuoi record!', 'The online leaderboard is not available on this platform. Challenge yourself with your records!', 'La clasificación online no está disponible en esta plataforma. ¡Supera tus récords!', "Le classement en ligne n'est pas disponible sur cette plateforme. Bats tes propres records !", '此平台不支持在线排行榜。挑战你自己的记录吧！')}</p>
              )}
            </div>
          )
        ) : personal.length === 0 ? (
          <p className="vs-muted vs-center">{clean(t(lang, 'play_first_match'))}</p>
        ) : (
          <ol className="vs-rank-list">
            {personal.map((h, i) => (
              <li key={h.date + '_' + i} className={`vs-rank-row ${medal(i + 1)}`}>
                <span className="vs-rank-pos">{i + 1}</span>
                <span className="vs-rank-name">
                  {myName} · {new Date(h.date).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang)}
                  <small>{int(h.kills)} {L(lang, 'nemici', 'enemies', 'enemigos', 'ennemis', '敌人')} · Lv {int(h.level)} · {fmtTime(h.time)}</small>
                </span>
                <b className="vs-rank-score">{int(h.score)}</b>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
