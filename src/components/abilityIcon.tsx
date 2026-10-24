import React from 'react';

interface AbilityIconProps {
  type: string;
  color: string;
  size?: number;
}

const ASSET_BASE: string = import.meta.env.BASE_URL || '/';

/** Icona dell'abilita' (public/assets/abilities/<tipo>.webp). */
export const AbilityIcon: React.FC<AbilityIconProps> = ({ type, color, size = 48 }) => (
  <img
    src={`${ASSET_BASE}assets/abilities/${type}.webp`}
    width={size}
    height={size}
    alt=""
    draggable={false}
    loading="lazy"
    decoding="async"
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
    style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, borderRadius: '50%', boxShadow: `0 0 10px ${color}40` }}
  />
);
