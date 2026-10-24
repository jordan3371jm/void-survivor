import React from 'react';

interface ShipIconProps {
  shipType: string;
  color: string;
  size?: number;
  className?: string;
  eager?: boolean;
}

const ASSET_BASE: string = import.meta.env.BASE_URL || '/';

/** Immagine dell'astronave (public/assets/ships/<tipo>.webp, 256x256, sfondo trasparente). */
export const ShipIcon: React.FC<ShipIconProps> = ({ shipType, color, size = 64, className, eager }) => (
  <img
    src={`${ASSET_BASE}assets/ships/${shipType}.webp`}
    width={size}
    height={size}
    alt=""
    draggable={false}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    className={className}
    style={className ? { filter: `drop-shadow(0 0 10px ${color}55)` } : { width: size, height: size, objectFit: 'contain', filter: `drop-shadow(0 0 6px ${color}66)` }}
  />
);
