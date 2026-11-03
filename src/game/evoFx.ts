// Aspetto delle armi evolute: ogni evoluzione ha un effetto suo, ispirato al nome e all'arma di partenza.
// Le armi normali restano disegnate come prima; qui si disegna solo cio' che cambia quando sono evolute.
import type { GameState, Projectile, AbilityType } from './types';

const TAU = Math.PI * 2;

function evolved(state: GameState, type: AbilityType): boolean {
  return state.player.abilities.some(a => a.type === type && a.evolved);
}

function glowDot(ctx: CanvasRenderingContext2D, r: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
}

function trail(ctx: CanvasRenderingContext2D, proj: Projectile, color: string, width: number, alpha = 0.6) {
  if (!proj.trail || proj.trail.length < 2) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 1; i < proj.trail.length; i++) {
    const k = i / proj.trail.length;
    ctx.strokeStyle = color; ctx.globalAlpha = k * alpha; ctx.lineWidth = width * k;
    ctx.beginPath(); ctx.moveTo(proj.trail[i - 1].x, proj.trail[i - 1].y); ctx.lineTo(proj.trail[i].x, proj.trail[i].y); ctx.stroke();
  }
  ctx.restore();
}

/** Proiettili delle armi evolute. Ritorna true se il proiettile e' stato disegnato qui. */
export function drawEvolvedProjectile(ctx: CanvasRenderingContext2D, proj: Projectile, time: number): boolean {
  if (!proj.evolved) return false;
  const rot = Math.atan2(proj.vel.y, proj.vel.x);
  const r = proj.radius;
  switch (proj.type) {
    case 'homing_laser_beam': { // Siluri Protonici: siluro allungato con scia arancione
      trail(ctx, proj, '#ff7a2e', 8);
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(rot); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,120,50,0.45)'; ctx.beginPath(); ctx.ellipse(-4, 0, r * 3, r * 1.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.ellipse(0, 0, r * 2, r * 0.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(r * 1.2, 0, r * 0.6, 0, TAU); ctx.fill();
      ctx.restore(); return true;
    }
    case 'photon_shot': { // Siluri Fotonici: sfera dorata con bagliore a stella
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, r * 1.8, '#ffd23d', 'rgba(255,140,0,0)');
      ctx.rotate(time * 4); ctx.strokeStyle = 'rgba(255,240,180,0.9)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-r * 2.6, 0); ctx.lineTo(r * 2.6, 0); ctx.stroke(); }
      ctx.restore(); return true;
    }
    case 'ion_shot': { // Cannone Ionico V-150: sfera ionica con scariche elettriche
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, r * 1.7, '#5ee7ff', 'rgba(40,80,255,0)');
      ctx.strokeStyle = '#d6f7ff'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) { const a = time * 9 + i * 2.1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); ctx.lineTo(Math.cos(a + 0.4) * r * 1.3, Math.sin(a + 0.4) * r * 1.3); ctx.lineTo(Math.cos(a - 0.2) * r * 2, Math.sin(a - 0.2) * r * 2); ctx.stroke(); }
      ctx.restore(); return true;
    }
    case 'kinetic_dart': { // Blaster DL-44: dardi rossi allungati
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(rot); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,40,40,0.55)'; ctx.lineWidth = r * 2.6; ctx.beginPath(); ctx.moveTo(-r * 6, 0); ctx.lineTo(r * 2, 0); ctx.stroke();
      ctx.strokeStyle = '#ffe0e0'; ctx.lineWidth = r * 0.9; ctx.beginPath(); ctx.moveTo(-r * 5, 0); ctx.lineTo(r * 1.6, 0); ctx.stroke();
      ctx.restore(); return true;
    }
    case 'asteroid_frag': { // Campo Asteroidi di Hoth: rocce di ghiaccio con scia gelida
      trail(ctx, proj, '#bfe9ff', r, 0.5);
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(time * 3 + proj.pos.x * 0.01);
      ctx.fillStyle = '#e8f7ff'; ctx.strokeStyle = '#7cc8ff'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const rr = r * (0.8 + ((i * 37) % 5) / 10); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore(); return true;
    }
    case 'boomerang_proj': { // Glaive di Krull: stella a cinque lame dorata che gira
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(time * 14); ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, r * 1.4, 'rgba(255,224,102,0.6)', 'rgba(255,180,0,0)');
      ctx.fillStyle = '#ffe066'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const rr = i % 2 ? r * 0.45 : r * 1.25; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5a3d00'; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.fill();
      ctx.restore(); return true;
    }
    case 'quantum_bounce_proj': { // Motore a Improbabilita' Infinita: forma che cambia colore e figura di continuo
      const hue = (time * 400 + proj.pos.x) % 360; const sides = 3 + Math.floor((time * 6 + proj.pos.y * 0.01) % 4);
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(time * 8); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `hsla(${hue},100%,65%,0.9)`; ctx.beginPath();
      for (let i = 0; i < sides; i++) { const a = i / sides * TAU; ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `hsla(${(hue + 180) % 360},100%,70%,0.9)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, TAU); ctx.stroke();
      ctx.restore(); return true;
    }
    case 'meteor_proj': { // Colpo Starkiller: raggio rosso dal cielo con nucleo bianco
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(proj.pos.x, proj.pos.y - 420, proj.pos.x, proj.pos.y);
      g.addColorStop(0, 'rgba(255,40,0,0)'); g.addColorStop(1, 'rgba(255,90,30,0.85)');
      ctx.fillStyle = g; ctx.fillRect(proj.pos.x - r * 0.7, proj.pos.y - 420, r * 1.4, 420);
      ctx.translate(proj.pos.x, proj.pos.y); glowDot(ctx, r * 1.6, '#ff7a1a', 'rgba(255,0,0,0)');
      ctx.restore(); return true;
    }
    case 'cryo_beam': { // Raggio di Carbonite: blocco di carbonite che brilla di ghiaccio
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(time * 2);
      ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, r * 1.4, 'rgba(120,200,255,0.45)', 'rgba(60,120,255,0)');
      ctx.globalCompositeOperation = 'source-over'; const q = r * 0.55;
      ctx.fillStyle = '#6b5a45'; ctx.fillRect(-q, -q, q * 2, q * 2);
      ctx.fillStyle = 'rgba(168,240,255,0.55)'; ctx.fillRect(-q, -q, q * 2, q * 0.5);
      ctx.strokeStyle = '#bfefff'; ctx.lineWidth = 1.5; ctx.strokeRect(-q, -q, q * 2, q * 2);
      ctx.restore(); return true;
    }
    case 'lightning_bolt': { // Fulmine della Forza: saetta viola frastagliata
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#c48bff'; ctx.lineWidth = 3; ctx.beginPath();
      let x = proj.pos.x, y = proj.pos.y - 260; ctx.moveTo(x, y);
      for (let i = 0; i < 7; i++) { y += 260 / 7; x = proj.pos.x + (Math.random() - 0.5) * 30; ctx.lineTo(x, y); }
      ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore(); return true;
    }
    case 'void_lance': { // Batteria Phaser: due raggi gemelli rosa-arancio
      trail(ctx, proj, '#ff4fd8', 10, 0.55);
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(rot); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const off of [-6, 6]) { ctx.strokeStyle = 'rgba(255,120,60,0.6)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, off); ctx.lineTo(30, off * 0.3); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-34, off); ctx.lineTo(30, off * 0.3); ctx.stroke(); }
      glowDot(ctx, 12, '#ff4fd8', 'rgba(255,79,216,0)');
      ctx.restore(); return true;
    }
    case 'flame_puff': { // Sun Crusher: fiamme azzurre e bianche, piu' calde del sole
      const k = 1 - proj.lifetime / proj.maxLifetime;
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, 1 - k * k) * 0.85;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#9fe8ff'); g.addColorStop(0.7, k < 0.6 ? '#ff9a2e' : '#5a2fff'); g.addColorStop(1, 'rgba(40,0,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.restore(); return true;
    }
    default: return false;
  }
}

/** Effetti delle evoluzioni che non sono proiettili (aure, anelli, droni, scudi, pozze). Si disegna nello spazio di gioco. */
export function drawEvolvedOverlays(ctx: CanvasRenderingContext2D, state: GameState): void {
  const p = state.player; const time = state.time;
  if (!p.abilities.some(a => a.evolved)) return;
  ctx.save();
  // Collettivo Borg: i droni diventano cubi verdi con la griglia
  if (evolved(state, 'drone_swarm')) for (const d of state.drones) {
    const s = d.radius * 1.5; ctx.save(); ctx.translate(d.pos.x, d.pos.y); ctx.rotate(time * 1.5);
    ctx.fillStyle = 'rgba(20,60,30,0.95)'; ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.strokeStyle = '#4dff88'; ctx.lineWidth = 1.5; ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
    ctx.restore();
  }
  // Onda Interdictor: doppio anello con raggi che bloccano lo spazio
  if (evolved(state, 'gravity_waves')) for (const w of state.gravityWaves) {
    const a = 1 - w.lifetime / w.maxLifetime; ctx.globalAlpha = a * 0.8; ctx.strokeStyle = '#b07bff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(w.pos.x, w.pos.y, w.radius, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(w.pos.x, w.pos.y, w.radius * 0.85, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + time; ctx.beginPath(); ctx.moveTo(w.pos.x + Math.cos(an) * w.radius * 0.85, w.pos.y + Math.sin(an) * w.radius * 0.85); ctx.lineTo(w.pos.x + Math.cos(an) * w.radius, w.pos.y + Math.sin(an) * w.radius); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // Spade Laser Jedi: lame luminose con nucleo bianco
  if (evolved(state, 'laser_swords')) for (const sw of state.laserSwords) {
    const sx = p.pos.x + Math.cos(sw.angle) * sw.distance, sy = p.pos.y + Math.sin(sw.angle) * sw.distance;
    const ex = sx + Math.cos(sw.angle + Math.PI / 2) * sw.length, ey = sy + Math.sin(sw.angle + Math.PI / 2) * sw.length;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(61,255,110,0.35)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#3dff6e'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  // Anello Halo: un anello luminoso continuo unisce i satelliti
  const sat = p.abilities.find(a => a.type === 'orbiting_satellites' && a.evolved);
  if (sat) {
    const d = Math.min((70 + sat.level * 10) * (1 + p.areaBonus), 200);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(155,231,255,0.25)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, d, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#9be7ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.pos.x, p.pos.y, d, d * 0.92, time * 0.5, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // Orizzonte degli Eventi: disco nero con bordo di fuoco che ruota attorno alla nave
  const gf = p.abilities.find(a => a.type === 'gravity_field' && a.evolved);
  if (gf) {
    const R = (150 + gf.level * 20) * (1 + p.areaBonus);
    ctx.save();
    const g = ctx.createRadialGradient(p.pos.x, p.pos.y, R * 0.55, p.pos.x, p.pos.y, R);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(10,0,25,0.35)'); g.addColorStop(0.92, 'rgba(255,140,40,0.35)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, R, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const st = time * (1.2 + i * 0.4) + i * 2; ctx.strokeStyle = i === 1 ? '#8f6bff' : '#ffb36b'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, R * (0.88 + i * 0.04), st, st + 1.6); ctx.stroke(); }
    ctx.restore();
  }
  // Scudo Deflettore: bolla esagonale azzurra
  if (p.shieldHits > 0 && evolved(state, 'energy_shield')) {
    const R = 46 + Math.sin(time * 3) * 2;
    ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(124,200,255,0.12)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(124,200,255,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + time * 0.3; ctx.beginPath(); for (let k = 0; k < 6; k++) { const b = k / 6 * TAU; ctx.lineTo(Math.cos(a) * R * 0.55 + Math.cos(b) * R * 0.32, Math.sin(a) * R * 0.55 + Math.sin(b) * R * 0.32); } ctx.closePath(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // Fulmine della Forza: saette dalla nave verso le zone colpite
  if (evolved(state, 'ion_storm')) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const h of state.stormHitboxes) {
      if (h.lifetime > 0.35) continue;
      ctx.globalAlpha = 1 - h.lifetime / 0.35; ctx.strokeStyle = '#c48bff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.pos.x, p.pos.y);
      for (let i = 1; i <= 6; i++) { const k = i / 6; ctx.lineTo(p.pos.x + (h.pos.x - p.pos.x) * k + (i < 6 ? (Math.random() - 0.5) * 26 : 0), p.pos.y + (h.pos.y - p.pos.y) * k + (i < 6 ? (Math.random() - 0.5) * 26 : 0)); }
      ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }
  // Pozze evolute: Sangue Xenomorfo (acido che ribolle), Dispositivo Genesis (anelli di vita), Gargantua (disco dorato)
  for (const pool of state.nebulaPools) {
    if (!(pool as any).evo) continue;
    const a = Math.max(0, 1 - pool.lifetime / pool.maxLifetime); const { x, y } = pool.pos; const R = pool.radius;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (pool.source === 'antimatter_bomb') {
      for (let i = 0; i < 3; i++) { const rr = R * (((time * 0.6 + i / 3) % 1)); ctx.globalAlpha = a * (1 - rr / R); ctx.strokeStyle = i % 2 ? '#7dffb0' : '#ff3df0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke(); }
    } else if (pool.source === 'stellar_blackhole') {
      ctx.globalAlpha = a; ctx.strokeStyle = '#ffcf70'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x, y, R * 0.75, R * 0.16, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * 0.3, 0, TAU); ctx.stroke();
    } else if (!pool.kind) {
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#c6ff3a';
      for (let i = 0; i < 5; i++) { const an = i * 1.7 + pool.id.length; const rr = R * 0.6 * ((time * 0.8 + i * 0.21) % 1); ctx.beginPath(); ctx.arc(x + Math.cos(an) * R * 0.5, y + Math.sin(an) * R * 0.5 - rr * 0.3, 2 + rr * 0.08, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#a6ff00'; ctx.lineWidth = 2; ctx.globalAlpha = a * 0.6; ctx.beginPath(); ctx.arc(x, y, R * 0.95, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
