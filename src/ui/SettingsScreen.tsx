// Schermata delle impostazioni (lingua, tema, audio, controlli, gioco automatico, tutorial).
import React from 'react';
import { Bot, Crosshair, FolderOpen, Joystick, Music2, Settings2, Sparkles, SunMoon, Volume2 } from 'lucide-react';
import { t, languageNames, type Language } from '../game/i18n';
import { setMusicVolume, setSfxVolume } from '../game/audio';
import type { GameStore } from '../game/store';
import { L, Toggle, TopBar } from './common';

type Settings = GameStore['settings'];

interface SettingsScreenProps {
  store: GameStore;
  lang: Language;
  autoPlay: boolean;
  customMusicLoaded: boolean;
  customMusicName: string;
  onBack: () => void;
  onLanguage: (l: Language) => void;
  onTheme: (th: 'auto' | 'light' | 'dark') => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onMusicFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleAutoPlay: () => void;
}

export function SettingsScreen({ store, lang, autoPlay, customMusicLoaded, customMusicName, onBack, onLanguage, onTheme, updateSetting, onMusicFile, onToggleAutoPlay }: SettingsScreenProps) {
  return (
    <div className="vs-screen">
      <TopBar title={t(lang, 'settings')} icon={<Settings2 size={22} />} onBack={onBack} lang={lang} />
      <main className="vs-content">
        <div className="vs-settings">
          <section className="vs-panel vs-settings-wide">
            <h2 className="vs-panel-title"><Sparkles size={18} />{t(lang, 'language')}</h2>
            <div className="vs-lang-grid">
              {(Object.keys(languageNames) as Language[]).map(l => (
                <button key={l} type="button" className={`vs-lang${store.settings.language === l ? ' is-active' : ''}`} onClick={() => { onLanguage(l); }}>
                  {languageNames[l]}
                </button>
              ))}
            </div>
          </section>

          <section className="vs-panel vs-settings-wide">
            <h2 className="vs-panel-title"><SunMoon size={18} />{t(lang, 'theme')}</h2>
            <div className="vs-lang-grid">
              {(['auto', 'light', 'dark'] as const).map(th => (
                <button key={th} type="button" className={`vs-lang${(store.settings.theme || 'dark') === th ? ' is-active' : ''}`} onClick={() => { onTheme(th); }}>
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
              <input type="file" accept="audio/*" onChange={onMusicFile} hidden />
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
                <h2 className="vs-panel-title"><Bot size={18} />{L(lang, 'Gioco automatico', 'Auto play', 'Juego automático', 'Jeu automatique', '自动游戏')}</h2>
                <p className="vs-muted vs-small">{L(lang, 'La nave si muove da sola, schiva i pericoli, raccoglie esperienza e oggetti e sceglie i potenziamenti. Puoi sempre riprendere i comandi', 'Your ship moves on its own, dodges danger, collects XP and items and picks upgrades. You can take control at any time', 'La nave se mueve sola, esquiva peligros, recoge experiencia y objetos y elige mejoras. Puedes retomar el control cuando quieras', 'Le vaisseau se déplace seul, esquive les dangers, ramasse l’expérience et les objets et choisit les améliorations. Tu peux reprendre la main à tout moment', '飞船会自动移动、躲避危险、收集经验和道具并选择升级。你可以随时接管控制')}</p>
              </div>
              <Toggle on={autoPlay} label={L(lang, 'Gioco automatico', 'Auto play', 'Juego automático', 'Jeu automatique', '自动游戏')} onChange={onToggleAutoPlay} />
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
