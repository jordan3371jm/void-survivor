// ---------------------------------------------------------------------------
// Nomi usati SOLO nell'app Android/iOS: gli store rifiutano le app che usano marchi registrati
// (Star Wars, Star Trek, Alien...). Sul web (Playgama) restano i nomi originali.
// ---------------------------------------------------------------------------
import { Capacitor } from '@capacitor/core';

let native: boolean | null = null;
export function isApp(): boolean {
  if (native === null) { try { native = Capacitor.isNativePlatform(); } catch { native = false; } }
  return native;
}

type L5 = Record<'it' | 'en' | 'es' | 'fr' | 'zh', string>;

const BOSSES: Record<string, L5> = {
  boss_death_star: { it: 'DISTRUTTORE DI PIANETI', en: 'PLANET DESTROYER', es: 'DESTRUCTOR DE PLANETAS', fr: 'DESTRUCTEUR DE PLANÈTES', zh: '行星毁灭者' },
  boss_xenomorph: { it: "REGINA DELL'ALVEARE", en: 'HIVE QUEEN', es: 'REINA DE LA COLMENA', fr: 'REINE DE LA RUCHE', zh: '虫巢女王' },
  boss_borg_cube: { it: 'CUBO ASSIMILATORE', en: 'ASSIMILATOR CUBE', es: 'CUBO ASIMILADOR', fr: 'CUBE ASSIMILATEUR', zh: '同化立方体' },
};

const TEXTS: Partial<Record<keyof L5, Record<string, string>>> = {
  it: { ship_tie_fighter: 'Nave Doppia Ala', achievement_boss_1: 'Distruttore di Pianeti', achievement_boss_1_desc: 'Sconfiggi il Distruttore di Pianeti', achievement_boss_2: "Regina dell'Alveare", achievement_boss_2_desc: "Sconfiggi la Regina dell'Alveare", achievement_boss_4: 'Cubo Assimilatore', achievement_boss_4_desc: 'Sconfiggi il Cubo Assimilatore' },
  en: { ship_tie_fighter: 'Twin Wing Ship', achievement_boss_2: 'Hive Queen', achievement_boss_2_desc: 'Defeat the Hive Queen', achievement_boss_4: 'Assimilator Cube', achievement_boss_4_desc: 'Defeat the Assimilator Cube' },
  es: { ship_tie_fighter: 'Nave Doble Ala', achievement_boss_2: 'Reina de la Colmena', achievement_boss_2_desc: 'Derrota a la Reina de la Colmena', achievement_boss_4: 'Cubo Asimilador', achievement_boss_4_desc: 'Derrota al Cubo Asimilador' },
  fr: { ship_tie_fighter: 'Vaisseau Double Aile', achievement_boss_2: 'Reine de la Ruche', achievement_boss_2_desc: 'Vainquez la Reine de la Ruche', achievement_boss_4: 'Cube Assimilateur', achievement_boss_4_desc: 'Vainquez le Cube Assimilateur' },
  zh: { ship_tie_fighter: '双翼飞船', achievement_boss_2: '虫巢女王', achievement_boss_2_desc: '击败虫巢女王', achievement_boss_4: '同化立方体', achievement_boss_4_desc: '击败同化立方体' },
};

const EVOS: Record<string, L5> = {
  ion_gun: { it: "Cannone d'Assedio Ionico", en: 'Ion Siege Cannon', es: 'Cañón de Asedio Iónico', fr: 'Canon de Siège Ionique', zh: '离子攻城炮' },
  drone_swarm: { it: "Sciame dell'Alveare", en: 'Hive Swarm', es: 'Enjambre de la Colmena', fr: 'Essaim de la Ruche', zh: '虫巢蜂群' },
  gravity_waves: { it: 'Onda di Singolarità', en: 'Singularity Wave', es: 'Onda de Singularidad', fr: 'Onde de Singularité', zh: '奇点波' },
  void_lance: { it: 'Batteria a Impulsi', en: 'Pulse Array', es: 'Batería de Pulsos', fr: 'Batterie à Impulsions', zh: '脉冲阵列' },
  cryo_lance: { it: 'Raggio di Stasi Criogenica', en: 'Cryo Stasis Ray', es: 'Rayo de Estasis Criogénica', fr: 'Rayon de Stase Cryogénique', zh: '冷冻静滞射线' },
  asteroid_fragment: { it: 'Campo di Asteroidi Ghiacciati', en: 'Frozen Asteroid Field', es: 'Campo de Asteroides Helados', fr: "Champ d'Astéroïdes Gelés", zh: '冰冻小行星带' },
  antimatter_bomb: { it: 'Ordigno Big Bang', en: 'Big Bang Device', es: 'Dispositivo Big Bang', fr: 'Dispositif Big Bang', zh: '大爆炸装置' },
  laser_swords: { it: 'Lame al Plasma', en: 'Plasma Blades', es: 'Hojas de Plasma', fr: 'Lames à Plasma', zh: '等离子刃' },
  kinetic_darts: { it: 'Blaster Pesante', en: 'Heavy Blaster', es: 'Bláster Pesado', fr: 'Blaster Lourd', zh: '重型爆能枪' },
  meteor: { it: 'Colpo Spezzastelle', en: 'Star Breaker Strike', es: 'Golpe Rompeestrellas', fr: "Frappe Brise-Étoiles", zh: '碎星打击' },
  neutronium_boomerang: { it: 'Glaive del Vuoto', en: 'Void Glaive', es: 'Glaive del Vacío', fr: 'Glaive du Néant', zh: '虚空战刃' },
  orbiting_satellites: { it: 'Anello Orbitale', en: 'Orbital Ring', es: 'Anillo Orbital', fr: 'Anneau Orbital', zh: '轨道之环' },
  plasma_flamethrower: { it: 'Forgia Solare', en: 'Sun Forge', es: 'Forja Solar', fr: 'Forge Solaire', zh: '太阳熔炉' },
  corrosive_nebula: { it: 'Sangue Acido', en: 'Acid Blood', es: 'Sangre Ácida', fr: 'Sang Acide', zh: '酸性之血' },
  quantum_bounce: { it: 'Motore del Caos', en: 'Chaos Drive', es: 'Motor del Caos', fr: 'Moteur du Chaos', zh: '混沌引擎' },
  ion_storm: { it: 'Fulmine del Vuoto', en: 'Void Lightning', es: 'Relámpago del Vacío', fr: 'Éclair du Néant', zh: '虚空闪电' },
  probe_y: { it: 'Squadrone Ombra', en: 'Shadow Squadron', es: 'Escuadrón Sombra', fr: 'Escadron Ombre', zh: '暗影中队' },
};

const pick = (m: L5, lang: string) => (m as any)[lang] ?? m.en;
export function appBossName(key: string, lang: string): string | null { return isApp() && BOSSES[key] ? pick(BOSSES[key], lang) : null; }
export function appText(key: string, lang: string): string | null { if (!isApp()) return null; return (TEXTS as any)[lang]?.[key] ?? null; }
export function appEvoName(type: string, lang: string): string | null { return isApp() && EVOS[type] ? pick(EVOS[type], lang) : null; }
