// Catalogo del negozio: astronavi, pacchetti, ricompense e abilita' mostrate nelle schede.
import type { AbilityType } from '../game/types';
import type { GameStore } from '../game/store';

export const SHIPS: { type: string; nameKey: string; price: number; color: string; ability: string; iap?: string }[] = [
  { type: 'starter', nameKey: 'ship_starter', price: 0, color: '#62f5cf', ability: 'homing_laser' },
  { type: 'shield_ship', nameKey: 'ship_shield', price: 150, color: '#3dffaa', ability: 'energy_shield' },
  { type: 'cryo_ship', nameKey: 'ship_cryo', price: 250, color: '#4ff0ff', ability: 'cryo_lance' },
  { type: 'mechanical_ship', nameKey: 'ship_mechanical', price: 350, color: '#c9d2e3', ability: 'orbiting_satellites' },
  { type: 'bio_ship', nameKey: 'ship_bio', price: 450, color: '#ff5f8f', ability: 'corrosive_nebula' },
  { type: 'photon_ship', nameKey: 'ship_photon', price: 600, color: '#ff5555', ability: 'photon_gun' },
  { type: 'ion_ship', nameKey: 'ship_ion', price: 750, color: '#6b7bff', ability: 'ion_gun' },
  { type: 'drone_ship', nameKey: 'ship_drone', price: 900, color: '#ffb02e', ability: 'drone_swarm' },
  { type: 'gravity_ship', nameKey: 'ship_gravity', price: 1100, color: '#c05bff', ability: 'gravity_waves' },
  { type: 'probe_x_ship', nameKey: 'ship_probe_x', price: 1300, color: '#ff4444', ability: 'probe_x' },
  { type: 'probe_y_ship', nameKey: 'ship_probe_y', price: 1500, color: '#4f6bff', ability: 'probe_y' },
  { type: 'asteroid_ship', nameKey: 'ship_asteroid', price: 1750, color: '#d19a66', ability: 'asteroid_fragment' },
  { type: 'quantum_ship', nameKey: 'ship_quantum', price: 2000, color: '#5cffff', ability: 'quantum_bounce', iap: 'ship_quantum' },
  { type: 'boomerang_ship', nameKey: 'ship_boomerang', price: 2300, color: '#aab4ff', ability: 'neutronium_boomerang', iap: 'ship_boomerang' },
  { type: 'kinetic_ship', nameKey: 'ship_kinetic', price: 2600, color: '#ff9a2e', ability: 'kinetic_darts', iap: 'ship_kinetic' },
  { type: 'electric_ship', nameKey: 'ship_electric', price: 3000, color: '#7cc4ff', ability: 'ion_storm' },
  { type: 'meteor_ship', nameKey: 'ship_meteor', price: 3400, color: '#ff7a33', ability: 'meteor' },
  { type: 'fire_ship', nameKey: 'ship_fire', price: 3900, color: '#ff6a2b', ability: 'plasma_flamethrower' },
  { type: 'viper_ship', nameKey: 'ship_viper', price: 4400, color: '#c0c8d8', ability: 'prism_ray', iap: 'ship_viper' },
  { type: 'tie_fighter_ship', nameKey: 'ship_tie_fighter', price: 5000, color: '#a3acc2', ability: 'arc_slash', iap: 'ship_tie_fighter' },
  { type: 'nuclear_ship', nameKey: 'ship_nuclear', price: 5700, color: '#5cff8a', ability: 'antimatter_bomb' },
  { type: 'shadow_ship', nameKey: 'ship_shadow', price: 6500, color: '#9f8cff', ability: 'gravity_field' },
  { type: 'federation_ship', nameKey: 'ship_federation', price: 7400, color: '#e6ecf5', ability: 'void_lance', iap: 'ship_federation' },
  { type: 'laser_ship', nameKey: 'ship_laser', price: 8500, color: '#ff4d5e', ability: 'laser_swords', iap: 'ship_laser' },
  { type: 'void_ship', nameKey: 'ship_void', price: 10000, color: '#e35bff', ability: 'stellar_blackhole', iap: 'ship_void' },
];

// Cambio diamanti -> monete nel negozio (piu' diamanti, cambio piu' conveniente)
// Pacchetti a pagamento del negozio (Playgama payments). consumable: si possono ricomprare.
export type Pack = { id: string; coins: number; diamonds: number; consumable: boolean; ship?: string; speed?: boolean };
export const PACKS: Pack[] = [
  { id: 'coins_small', coins: 50000, diamonds: 0, consumable: true },
  { id: 'coins_medium', coins: 300000, diamonds: 0, consumable: true },
  { id: 'coins_large', coins: 1500000, diamonds: 0, consumable: true },
  { id: 'coins_huge', coins: 5000000, diamonds: 0, consumable: true },
  { id: 'diamonds_small', coins: 0, diamonds: 50, consumable: true },
  { id: 'diamonds_medium', coins: 0, diamonds: 250, consumable: true },
  { id: 'diamonds_large', coins: 0, diamonds: 600, consumable: true },
  { id: 'diamonds_huge', coins: 0, diamonds: 1500, consumable: true },
  { id: 'starter_pack', coins: 100000, diamonds: 100, consumable: false, ship: 'void_ship' },
  { id: 'mega_pack', coins: 1000000, diamonds: 1000, consumable: true },
  { id: 'speed_x2', coins: 0, diamonds: 0, consumable: false, speed: true },
];
/** Consegna il contenuto di un pacchetto. I pacchetti permanenti si consegnano una sola volta. */
export function grantPack(cur: GameStore, pack: Pack): GameStore {
  const granted = cur.iapGranted || [];
  if (!pack.consumable && granted.includes(pack.id)) {
    // gia' consegnato: ripristina solo cio' che e' permanente (nave, x2)
    return { ...cur, ships: pack.ship ? { ...cur.ships, [pack.ship]: true } : cur.ships, speedX2Owned: cur.speedX2Owned || !!pack.speed };
  }
  return {
    ...cur,
    coins: cur.coins + pack.coins, diamonds: cur.diamonds + pack.diamonds,
    ships: pack.ship ? { ...cur.ships, [pack.ship]: true } : cur.ships,
    speedX2Owned: cur.speedX2Owned || !!pack.speed,
    iapGranted: pack.consumable ? granted : [...granted, pack.id],
  };
}

// Premi del negozio guardando una pubblicita' con premio (senza limite)
export const AD_REWARDS = [{ id: 'shop_coins', coins: 500, diamonds: 0 }, { id: 'shop_diamonds', coins: 0, diamonds: 5 }];
// 300 monete per diamante nel cambio piu' piccolo, fino a 500 nel piu' grande (1000 diamanti = 500.000 monete)
export const DIAMOND_EXCHANGE = [{ diamonds: 10, coins: 3000 }, { diamonds: 50, coins: 17500 }, { diamonds: 100, coins: 40000 }, { diamonds: 250, coins: 105000 }, { diamonds: 500, coins: 225000 }, { diamonds: 1000, coins: 500000 }];

export const ACTIVE_ABILITIES: AbilityType[] = ['photon_gun', 'ion_gun', 'drone_swarm', 'gravity_waves', 'void_lance', 'cryo_lance', 'energy_shield', 'asteroid_fragment', 'homing_laser', 'laser_swords', 'plasma_flamethrower', 'gravity_field', 'ion_storm', 'antimatter_bomb', 'orbiting_satellites', 'corrosive_nebula', 'kinetic_darts', 'meteor', 'neutronium_boomerang', 'quantum_bounce', 'stellar_blackhole', 'probe_x', 'probe_y', 'prism_ray', 'arc_slash'];
export const PASSIVE_ABILITIES: AbilityType[] = ['passive_fusion_core', 'passive_plating', 'passive_neutronium_heart', 'passive_regen_core', 'passive_void_tome', 'passive_stellar_candelabrum', 'passive_kinetic_accelerator', 'passive_quantum_binder', 'passive_molecular_replicator', 'passive_ionic_thrusters', 'passive_gravity_field', 'passive_stellar_fortune', 'passive_galactic_crown', 'passive_cosmic_dust', 'passive_quantum_reactor', 'passive_pulsar_heart', 'passive_galactic_coin'];
