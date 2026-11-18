// Piccoli componenti e funzioni condivisi dalle schermate dell'interfaccia.
import React from 'react';
import { ArrowLeft, Coins, Gem, Star } from 'lucide-react';
import { t, type Language } from '../game/i18n';
import { plFromEn } from '../game/pl';
import type { GameStore } from '../game/store';

/** Testi brevi non presenti nel file delle traduzioni. */
export function L(lang: Language, it: string, en: string, es: string, fr: string, zh: string): string {
  return lang === 'it' ? it : lang === 'es' ? es : lang === 'fr' ? fr : lang === 'zh' ? zh : lang === 'pl' ? plFromEn(en) : en;
}

export function packTitle(lang: Language, id: string): string {
  const T: Record<string, [string, string, string, string, string]> = {
    coins_small: ['Monete piccolo', 'Small coins', 'Monedas pequeño', 'Petit lot de pièces', '小金币包'],
    coins_medium: ['Monete medio', 'Medium coins', 'Monedas mediano', 'Lot moyen de pièces', '中金币包'],
    coins_large: ['Monete grande', 'Large coins', 'Monedas grande', 'Grand lot de pièces', '大金币包'],
    coins_huge: ['Monete gigante', 'Huge coins', 'Monedas gigante', 'Lot géant de pièces', '巨型金币包'],
    diamonds_small: ['Diamanti piccolo', 'Small diamonds', 'Diamantes pequeño', 'Petit lot de diamants', '小钻石包'],
    diamonds_medium: ['Diamanti medio', 'Medium diamonds', 'Diamantes mediano', 'Lot moyen de diamants', '中钻石包'],
    diamonds_large: ['Diamanti grande', 'Large diamonds', 'Diamantes grande', 'Grand lot de diamants', '大钻石包'],
    diamonds_huge: ['Diamanti enorme', 'Huge diamonds', 'Diamantes enorme', 'Lot énorme de diamants', '巨型钻石包'],
    starter_pack: ['Pacchetto iniziale', 'Starter pack', 'Paquete inicial', 'Pack de départ', '新手礼包'],
    mega_pack: ['Mega pacchetto', 'Mega pack', 'Mega paquete', 'Méga pack', '超级礼包'],
    speed_x2: ['Velocità x2 per sempre', 'Permanent x2 speed', 'Velocidad x2 para siempre', 'Vitesse x2 pour toujours', '永久x2速度'],
  };
  const v = T[id]; return v ? L(lang, ...v) : id;
}

/** Rimuove emoji iniziali/finali dalle traduzioni (al loro posto usiamo icone coerenti). */
export function clean(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}️☀-➿\s]+/u, '').replace(/[\s\p{Extended_Pictographic}️☀-➿]+$/u, '').trim();
}

/** Telefono o tablet poco potente: 4 core o meno, oppure 3 GB di memoria o meno (dove il browser lo dice). */
export function isWeakDevice(): boolean {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const touch = typeof window !== 'undefined' && ('ontouchstart' in window || (nav.maxTouchPoints || 0) > 0);
    if (!touch) return false;
    return (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 3;
  } catch { return false; }
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export function Currency({ store, compact }: { store: GameStore; compact?: boolean }) {
  return (
    <div className={`vs-currency${compact ? ' is-compact' : ''}`}>
      <span className="vs-chip vs-chip--coin"><Coins size={15} aria-hidden="true" />{Math.round(store.coins)}</span>
      <span className="vs-chip vs-chip--gem"><Gem size={15} aria-hidden="true" />{Math.round(store.diamonds)}</span>
      {store.points > 0 && <span className="vs-chip vs-chip--star"><Star size={15} aria-hidden="true" />{Math.round(store.points)}</span>}
    </div>
  );
}

export function TopBar({ title, icon, onBack, lang, right }: { title: string; icon?: React.ReactNode; onBack: () => void; lang: Language; right?: React.ReactNode }) {
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

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`vs-toggle${on ? ' is-on' : ''}`} onClick={onChange}>
      <span className="vs-toggle-knob" />
    </button>
  );
}
