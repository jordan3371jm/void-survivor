// Nomi e colori delle armi evolute, ispirati all'universo e ai grandi film di fantascienza.
import type { AbilityType } from './types';
import { appEvoName } from './appNames';
import type { Language } from './i18n';

type Names = [it: string, en: string, es: string, fr: string, zh: string, pl: string];
interface Evo { names: Names; color: string; }

export const EVOLUTION_INFO: Partial<Record<AbilityType, Evo>> = {
  homing_laser: { names: ['Siluri Protonici', 'Proton Torpedoes', 'Torpedos de Protones', 'Torpilles à Protons', '质子鱼雷', 'Torpedy protonowe'], color: '#ff6b3d' },
  photon_gun: { names: ['Siluri Fotonici', 'Photon Torpedoes', 'Torpedos de Fotones', 'Torpilles à Photons', '光子鱼雷', 'Torpedy fotonowe'], color: '#ffd23d' },
  ion_gun: { names: ['Cannone Ionico V-150', 'V-150 Ion Cannon', 'Cañón de Iones V-150', 'Canon Ionique V-150', 'V-150离子炮', 'Jonowe działo oblężnicze'], color: '#5ee7ff' },
  drone_swarm: { names: ['Collettivo Borg', 'Borg Collective', 'Colectivo Borg', 'Collectif Borg', '博格集合体', 'Rój ula'], color: '#4dff88' },
  gravity_waves: { names: ['Onda Interdictor', 'Interdictor Wave', 'Onda Interdictor', 'Onde Interdictor', '拦截者引力波', 'Fala osobliwości'], color: '#b07bff' },
  void_lance: { names: ['Batteria Phaser', 'Phaser Array', 'Batería Phaser', 'Batterie Phaser', '相位炮阵列', 'Bateria impulsowa'], color: '#ff4fd8' },
  cryo_lance: { names: ['Raggio di Carbonite', 'Carbonite Ray', 'Rayo de Carbonita', 'Rayon de Carbonite', '碳冻射线', 'Promień kriostazy'], color: '#a8f0ff' },
  energy_shield: { names: ['Scudo Deflettore', 'Deflector Shield', 'Escudo Deflector', 'Bouclier Déflecteur', '偏导护盾', 'Tarcza deflektora'], color: '#7cc8ff' },
  asteroid_fragment: { names: ['Campo Asteroidi di Hoth', 'Hoth Asteroid Field', 'Campo de Asteroides de Hoth', "Champ d'Astéroïdes de Hoth", '霍斯小行星带', 'Pole lodowych asteroid'], color: '#ffb36b' },
  antimatter_bomb: { names: ['Dispositivo Genesis', 'Genesis Device', 'Dispositivo Génesis', 'Dispositif Genesis', '创世装置', 'Urządzenie Wielkiego Wybuchu'], color: '#ff3df0' },
  laser_swords: { names: ['Spade Laser Jedi', 'Jedi Lightsabers', 'Sables de Luz Jedi', 'Sabres Laser Jedi', '绝地光剑', 'Ostrza plazmowe'], color: '#3dff6e' },
  kinetic_darts: { names: ['Blaster DL-44', 'DL-44 Blaster', 'Bláster DL-44', 'Blaster DL-44', 'DL-44爆能枪', 'Ciężki blaster'], color: '#ff5050' },
  meteor: { names: ['Colpo Starkiller', 'Starkiller Strike', 'Golpe Starkiller', 'Frappe Starkiller', '弑星者打击', 'Uderzenie gwiazdołamacza'], color: '#ff7a1a' },
  neutronium_boomerang: { names: ['Glaive di Krull', 'Glaive of Krull', 'Glaive de Krull', 'Glaive de Krull', '克鲁尔战刃', 'Glewia pustki'], color: '#ffe066' },
  orbiting_satellites: { names: ['Anello Halo', 'Halo Ring', 'Anillo Halo', 'Anneau Halo', '光环之环', 'Pierścień orbitalny'], color: '#9be7ff' },
  plasma_flamethrower: { names: ['Sun Crusher', 'Sun Crusher', 'Aplastasoles', 'Broyeur de Soleils', '碎日者', 'Słoneczna kuźnia'], color: '#ff9a2e' },
  gravity_field: { names: ['Orizzonte degli Eventi', 'Event Horizon', 'Horizonte de Sucesos', "Horizon des Événements", '事件视界', 'Horyzont zdarzeń'], color: '#8f6bff' },
  corrosive_nebula: { names: ['Sangue Xenomorfo', 'Xenomorph Blood', 'Sangre Xenomorfa', 'Sang Xénomorphe', '异形之血', 'Kwasowa krew'], color: '#a6ff00' },
  quantum_bounce: { names: ['Motore a Improbabilità Infinita', 'Infinite Improbability Drive', 'Motor de Improbabilidad Infinita', "Moteur à Improbabilité Infinie", '无限非概率驱动', 'Napęd chaosu'], color: '#ff8af0' },
  ion_storm: { names: ['Fulmine della Forza', 'Force Lightning', 'Relámpago de la Fuerza', 'Éclair de Force', '原力闪电', 'Błyskawica pustki'], color: '#c48bff' },
  stellar_blackhole: { names: ['Gargantua', 'Gargantua', 'Gargantúa', 'Gargantua', '卡冈图雅', 'Gargantua'], color: '#ffcf70' },
  probe_x: { names: ['Squadrone Fenice', 'Phoenix Squadron', 'Escuadrón Fénix', 'Escadron Phénix', '凤凰中队', 'Eskadra feniks'], color: '#ffe9a8' },
  prism_ray: { names: ['Cascata Spettrale', 'Spectrum Cascade', 'Cascada Espectral', 'Cascade Spectrale', '光谱瀑流', 'Kaskada widma'], color: '#ffd86b' },
  arc_slash: { names: ['Tempesta di Lame', 'Blade Tempest', 'Tempestad de Filos', 'Tempête de Lames', '刃之风暴', 'Burza ostrzy'], color: '#ffe066' },
  probe_y: { names: ['Squadrone Sith', 'Sith Squadron', 'Escuadrón Sith', 'Escadron Sith', '西斯中队', 'Eskadra cienia'], color: '#a26bff' },
};

const IDX: Record<string, number> = { it: 0, en: 1, es: 2, fr: 3, zh: 4, pl: 5 };

export function getEvolutionName(type: AbilityType, lang: Language | string): string | null {
  const app = appEvoName(type, lang); if (app) return app;
  const e = EVOLUTION_INFO[type];
  return e ? e.names[IDX[lang] ?? 1] : null;
}
export function getEvolutionColor(type: AbilityType): string | null {
  return EVOLUTION_INFO[type]?.color ?? null;
}
