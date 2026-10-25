import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair, Crown, Gem, Gift, Move, ShoppingCart, Sparkles, X } from 'lucide-react';
import { Language } from './game/i18n';

const L = (lang: Language, it: string, en: string, es: string, fr: string, zh: string) => ({ it, en, es, fr, zh }[lang] ?? en);

interface TutorialProps { lang: Language; touch: boolean; onClose: () => void; }

export const Tutorial: React.FC<TutorialProps> = ({ lang, touch, onClose }) => {
  const [step, setStep] = useState(0);
  const steps = [
    {
      icon: <Move size={40} />, color: '#22d3ee',
      title: L(lang, 'Muoviti', 'Move', 'Muévete', 'Déplace-toi', '移动'),
      text: touch
        ? L(lang, 'Trascina il dito sullo schermo per pilotare la nave. Evita i nemici: il contatto fa danno!', 'Drag your finger on the screen to steer the ship. Avoid enemies: touching them hurts!', 'Arrastra el dedo por la pantalla para pilotar la nave. ¡Evita a los enemigos: tocarlos hace daño!', "Fais glisser ton doigt sur l'écran pour piloter le vaisseau. Évite les ennemis : leur contact fait mal !", '在屏幕上拖动手指操控飞船。躲开敌人：碰到会受伤！')
        : L(lang, 'Usa WASD o le frecce per pilotare la nave. Evita i nemici: il contatto fa danno! Esc mette in pausa.', 'Use WASD or the arrow keys to steer the ship. Avoid enemies: touching them hurts! Esc pauses.', 'Usa WASD o las flechas para pilotar la nave. ¡Evita a los enemigos: tocarlos hace daño! Esc pausa.', 'Utilise ZQSD/WASD ou les flèches pour piloter. Évite les ennemis : leur contact fait mal ! Échap met en pause.', '使用WASD或方向键操控飞船。躲开敌人：碰到会受伤！Esc暂停。'),
    },
    {
      icon: <Crosshair size={40} />, color: '#f97316',
      title: L(lang, 'Fuoco automatico', 'Auto-fire', 'Disparo automático', 'Tir automatique', '自动射击'),
      text: L(lang, 'Le tue armi sparano da sole contro i nemici vicini. Tu pensa solo a muoverti e sopravvivere.', 'Your weapons fire on their own at nearby enemies. You just focus on moving and surviving.', 'Tus armas disparan solas a los enemigos cercanos. Tú solo céntrate en moverte y sobrevivir.', 'Tes armes tirent seules sur les ennemis proches. Concentre-toi sur tes déplacements et ta survie.', '武器会自动攻击附近的敌人。你只需专注移动和生存。'),
    },
    {
      icon: <Gem size={40} />, color: '#34d399',
      title: L(lang, 'Cristalli ed esperienza', 'Crystals and XP', 'Cristales y experiencia', 'Cristaux et expérience', '水晶与经验'),
      text: L(lang, 'I nemici lasciano cristalli: raccoglili per salire di livello. Cuori e magneti rari curano e attirano tutti i cristalli.', 'Enemies drop crystals: collect them to level up. Rare hearts and magnets heal you and pull in every crystal.', 'Los enemigos sueltan cristales: recógelos para subir de nivel. Los raros corazones e imanes curan y atraen todos los cristales.', 'Les ennemis lâchent des cristaux : ramasse-les pour monter de niveau. Les rares cœurs et aimants soignent et attirent tous les cristaux.', '敌人会掉落水晶：收集即可升级。稀有的爱心和磁铁可以治疗并吸取所有水晶。'),
    },
    {
      icon: <Sparkles size={40} />, color: '#c084fc',
      title: L(lang, 'Sali di livello', 'Level up', 'Sube de nivel', 'Monte de niveau', '升级'),
      text: L(lang, 'A ogni livello scegli una nuova arma, una passiva o un potenziamento. Non ti piacciono le scelte? Usa "Rimescola".', 'Each level, pick a new weapon, a passive or an upgrade. Don’t like the choices? Use "Reroll".', 'En cada nivel elige un arma nueva, una pasiva o una mejora. ¿No te gustan las opciones? Usa "Cambiar".', 'À chaque niveau, choisis une nouvelle arme, un passif ou une amélioration. Les choix ne te plaisent pas ? Utilise « Relancer ».', '每次升级可选择新武器、被动或强化。不喜欢这些选项？使用"刷新"。'),
    },
    {
      icon: <Crown size={40} />, color: '#ef4444',
      title: L(lang, 'Boss', 'Bosses', 'Jefes', 'Boss', 'Boss'),
      text: L(lang, 'Ogni poche ondate arriva un boss. Le zone rosse lampeggianti mostrano dove colpirà: spostati in tempo! Una freccia indica il boss quando è fuori schermo.', 'Every few waves a boss arrives. Flashing red zones show where it will strike: move away in time! An arrow points to the boss when it is off-screen.', 'Cada pocas oleadas llega un jefe. Las zonas rojas parpadeantes muestran dónde atacará: ¡apártate a tiempo! Una flecha señala al jefe fuera de pantalla.', "Toutes les quelques vagues, un boss arrive. Les zones rouges clignotantes montrent où il va frapper : écarte-toi à temps ! Une flèche indique le boss hors de l'écran.", '每隔几波就会出现Boss。闪烁的红色区域表示攻击位置：及时躲开！Boss在屏幕外时会有箭头指示。'),
    },
    {
      icon: <Gift size={40} />, color: '#fbbf24',
      title: L(lang, 'Scrigni ed evoluzioni', 'Chests and evolutions', 'Cofres y evoluciones', 'Coffres et évolutions', '宝箱与进化'),
      text: L(lang, 'Ogni boss lascia uno scrigno. Un’arma al livello massimo + la sua passiva abbinata si evolve in un’arma leggendaria, come le Spade Laser Jedi o i Siluri Fotonici!', 'Every boss drops a chest. A max-level weapon + its matching passive evolves into a legendary weapon, like Jedi Lightsabers or Photon Torpedoes!', 'Cada jefe suelta un cofre. Un arma a nivel máximo + su pasiva evoluciona en un arma legendaria, ¡como los Sables de Luz Jedi o los Torpedos de Fotones!', 'Chaque boss lâche un coffre. Une arme au niveau max + son passif associé évolue en arme légendaire, comme les Sabres Laser Jedi ou les Torpilles à Photons !', '每个Boss都会掉落宝箱。满级武器+对应被动将进化为传奇武器，例如绝地光剑或光子鱼雷！'),
    },
    {
      icon: <ShoppingCart size={40} />, color: '#38bdf8',
      title: L(lang, 'Diventa più forte', 'Grow stronger', 'Hazte más fuerte', 'Deviens plus fort', '变得更强'),
      text: L(lang, 'Le monete guadagnate servono nel negozio per potenziare la nave tra una partita e l’altra. Completa le missioni per ricompense extra. Buona fortuna, pilota!', 'Coins you earn are spent in the shop to upgrade your ship between runs. Complete missions for extra rewards. Good luck, pilot!', 'Las monedas que ganes sirven en la tienda para mejorar la nave entre partidas. Completa misiones para obtener recompensas extra. ¡Buena suerte, piloto!', 'Les pièces gagnées servent dans la boutique pour améliorer ton vaisseau entre les parties. Termine les missions pour des récompenses bonus. Bonne chance, pilote !', '赚到的金币可在商店中升级飞船。完成任务可获得额外奖励。祝你好运，飞行员！'),
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="vs-overlay vs-overlay--levelup">
      <div className="vs-modal vs-tutorial" style={{ ['--accent' as any]: s.color }}>
        <button type="button" className="vs-icon-btn vs-tutorial-skip" onClick={onClose} aria-label="Skip"><X size={18} /></button>
        <span className="vs-tutorial-kicker">{L(lang, 'Tutorial', 'Tutorial', 'Tutorial', 'Tutoriel', '教程')} · {step + 1}/{steps.length}</span>
        <div className="vs-tutorial-icon" key={step}>{s.icon}</div>
        <h2 className="vs-modal-title">{s.title}</h2>
        <p className="vs-tutorial-text">{s.text}</p>
        <div className="vs-tutorial-dots">{steps.map((_, i) => <span key={i} className={i === step ? 'is-active' : ''} />)}</div>
        <div className="vs-tutorial-nav">
          <button type="button" className="vs-btn vs-btn--ghost" onClick={() => setStep(step - 1)} disabled={step === 0}><ChevronLeft size={18} />{L(lang, 'Indietro', 'Back', 'Atrás', 'Retour', '上一步')}</button>
          <button type="button" className="vs-btn vs-btn--accent" onClick={() => (last ? onClose() : setStep(step + 1))}>
            {last ? L(lang, 'Gioca!', 'Play!', '¡Jugar!', 'Jouer !', '开始！') : L(lang, 'Avanti', 'Next', 'Siguiente', 'Suivant', '下一步')}<ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
