import React from 'react';
import { UserRound } from 'lucide-react';
import { ShipIcon } from './shipIcon';

/** Avatar scelti tra le astronavi del gioco (prima erano emoji). */
export const AVATAR_SHIPS = ['starter', 'fire_ship', 'laser_ship', 'electric_ship', 'void_ship', 'cryo_ship', 'bio_ship', 'quantum_ship', 'blackhole_ship', 'shadow_ship'];
export const DEFAULT_AVATAR = 'ship:starter';

/** Immagine del profilo: un'astronave (`ship:<tipo>`), una foto caricata o della piattaforma, altrimenti un'icona. */
export function Avatar({ value, size = 84, className = 'vs-avatar' }: { value?: string; size?: number; className?: string }) {
  const isImg = !!value && (value.startsWith('data:image') || value.startsWith('http'));
  const ship = value?.startsWith('ship:') ? value.slice(5) : null;
  return (
    <span className={className} style={{ width: size, height: size }}>
      {isImg ? <img src={value} alt="" /> : ship ? <ShipIcon shipType={ship} color="#62f5cf" size={Math.round(size * 0.82)} /> : <UserRound size={Math.round(size * 0.55)} />}
    </span>
  );
}
