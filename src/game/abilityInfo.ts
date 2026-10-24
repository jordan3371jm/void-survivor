import type { AbilityType } from './types';

export interface AbilityInfo {
  name: string;
  description: string;
  color: string;
  baseCooldown: number;
  baseDamage: number;
  rarity: number;
}

const abilities: Record<string, AbilityInfo> = {
  photon_gun: { name: 'photon_gun', description: 'photon_gun_desc', color: '#ff3333', baseCooldown: 2, baseDamage: 10, rarity: 90 },
  ion_gun: { name: 'ion_gun', description: 'ion_gun_desc', color: '#3333ff', baseCooldown: 2, baseDamage: 10, rarity: 90 },
  drone_swarm: { name: 'drone_swarm', description: 'drone_swarm_desc', color: '#ffaa00', baseCooldown: 3, baseDamage: 10, rarity: 70 },
  gravity_waves: { name: 'gravity_waves', description: 'gravity_waves_desc', color: '#aa00ff', baseCooldown: 3, baseDamage: 10, rarity: 100 },
  void_lance: { name: 'void_lance', description: 'void_lance_desc', color: '#660066', baseCooldown: 1.5, baseDamage: 18, rarity: 70 },
  cryo_lance: { name: 'cryo_lance', description: 'cryo_lance_desc', color: '#00ffff', baseCooldown: 0.5, baseDamage: 6, rarity: 70 },
  energy_shield: { name: 'energy_shield', description: 'energy_shield_desc', color: '#00ff88', baseCooldown: 10, baseDamage: 0, rarity: 80 },
  asteroid_fragment: { name: 'asteroid_fragment', description: 'asteroid_fragment_desc', color: '#886644', baseCooldown: 2, baseDamage: 12, rarity: 85 },
  homing_laser: { name: 'homing_laser', description: 'homing_laser_desc', color: '#ff4444', baseCooldown: 1.2, baseDamage: 10, rarity: 100 },
  laser_swords: { name: 'laser_swords', description: 'laser_swords_desc', color: '#00ff00', baseCooldown: 3, baseDamage: 30, rarity: 60 },
  plasma_flamethrower: { name: 'plasma_flamethrower', description: 'plasma_flamethrower_desc', color: '#ff8844', baseCooldown: 3, baseDamage: 20, rarity: 90 },
  gravity_field: { name: 'gravity_field', description: 'gravity_field_desc', color: '#9900ff', baseCooldown: 0.5, baseDamage: 5, rarity: 80 },
  ion_storm: { name: 'ion_storm', description: 'ion_storm_desc', color: '#ffff00', baseCooldown: 4, baseDamage: 20, rarity: 100 },
  antimatter_bomb: { name: 'antimatter_bomb', description: 'antimatter_bomb_desc', color: '#ff00ff', baseCooldown: 5, baseDamage: 20, rarity: 60 },
  orbiting_satellites: { name: 'orbiting_satellites', description: 'orbiting_satellites_desc', color: '#8888ff', baseCooldown: 3, baseDamage: 10, rarity: 80 },
  corrosive_nebula: { name: 'corrosive_nebula', description: 'corrosive_nebula_desc', color: '#88ff44', baseCooldown: 3, baseDamage: 10, rarity: 70 },
  kinetic_darts: { name: 'kinetic_darts', description: 'kinetic_darts_desc', color: '#ff8800', baseCooldown: 1, baseDamage: 10, rarity: 100 },
  meteor: { name: 'meteor', description: 'meteor_desc', color: '#ff6600', baseCooldown: 4, baseDamage: 20, rarity: 100 },
  neutronium_boomerang: { name: 'neutronium_boomerang', description: 'neutronium_boomerang_desc', color: '#aaaaff', baseCooldown: 2, baseDamage: 15, rarity: 70 },
  quantum_bounce: { name: 'quantum_bounce', description: 'quantum_bounce_desc', color: '#44ffff', baseCooldown: 2, baseDamage: 10, rarity: 90 },
  stellar_blackhole: { name: 'stellar_blackhole', description: 'stellar_blackhole_desc', color: '#000000', baseCooldown: 120, baseDamage: 100, rarity: 50 },
  probe_x: { name: 'probe_x', description: 'probe_x_desc', color: '#ff2222', baseCooldown: 2, baseDamage: 10, rarity: 90 },
  probe_y: { name: 'probe_y', description: 'probe_y_desc', color: '#2222ff', baseCooldown: 2, baseDamage: 10, rarity: 90 },
  passive_fusion_core: { name: 'passive_fusion_core', description: 'passive_fusion_core_desc', color: '#ff6600', baseCooldown: 0, baseDamage: 0, rarity: 100 },
  passive_plating: { name: 'passive_plating', description: 'passive_plating_desc', color: '#888888', baseCooldown: 0, baseDamage: 0, rarity: 100 },
  passive_neutronium_heart: { name: 'passive_neutronium_heart', description: 'passive_neutronium_heart_desc', color: '#ff0000', baseCooldown: 0, baseDamage: 0, rarity: 100 },
  passive_regen_core: { name: 'passive_regen_core', description: 'passive_regen_core_desc', color: '#00ff00', baseCooldown: 0, baseDamage: 0, rarity: 60 },
  passive_void_tome: { name: 'passive_void_tome', description: 'passive_void_tome_desc', color: '#660066', baseCooldown: 0, baseDamage: 0, rarity: 80 },
  passive_stellar_candelabrum: { name: 'passive_stellar_candelabrum', description: 'passive_stellar_candelabrum_desc', color: '#ffaa00', baseCooldown: 0, baseDamage: 0, rarity: 70 },
  passive_kinetic_accelerator: { name: 'passive_kinetic_accelerator', description: 'passive_kinetic_accelerator_desc', color: '#ff4400', baseCooldown: 0, baseDamage: 0, rarity: 100 },
  passive_quantum_binder: { name: 'passive_quantum_binder', description: 'passive_quantum_binder_desc', color: '#aa00ff', baseCooldown: 0, baseDamage: 0, rarity: 80 },
  passive_molecular_replicator: { name: 'passive_molecular_replicator', description: 'passive_molecular_replicator_desc', color: '#00ffaa', baseCooldown: 0, baseDamage: 0, rarity: 50 },
  passive_ionic_thrusters: { name: 'passive_ionic_thrusters', description: 'passive_ionic_thrusters_desc', color: '#00aaff', baseCooldown: 0, baseDamage: 0, rarity: 100 },
  passive_gravity_field: { name: 'passive_gravity_field', description: 'passive_gravity_field_desc', color: '#9900ff', baseCooldown: 0, baseDamage: 0, rarity: 100 },
  passive_stellar_fortune: { name: 'passive_stellar_fortune', description: 'passive_stellar_fortune_desc', color: '#ffff00', baseCooldown: 0, baseDamage: 0, rarity: 60 },
  passive_galactic_crown: { name: 'passive_galactic_crown', description: 'passive_galactic_crown_desc', color: '#ffcc00', baseCooldown: 0, baseDamage: 0, rarity: 90 },
  passive_cosmic_dust: { name: 'passive_cosmic_dust', description: 'passive_cosmic_dust_desc', color: '#ffffff', baseCooldown: 0, baseDamage: 0, rarity: 30 },
  passive_quantum_reactor: { name: 'passive_quantum_reactor', description: 'passive_quantum_reactor_desc', color: '#ff00ff', baseCooldown: 0, baseDamage: 0, rarity: 50 },
  passive_pulsar_heart: { name: 'passive_pulsar_heart', description: 'passive_pulsar_heart_desc', color: '#ff0088', baseCooldown: 0, baseDamage: 0, rarity: 70 },
  passive_galactic_coin: { name: 'passive_galactic_coin', description: 'passive_galactic_coin_desc', color: '#ffdd00', baseCooldown: 0, baseDamage: 0, rarity: 70 }
};

export function getAbilityInfo(type: AbilityType): AbilityInfo {
  return abilities[type] || { name: type, description: '', color: '#ffffff', baseCooldown: 1, baseDamage: 10, rarity: 50 };
}
