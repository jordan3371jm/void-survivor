// ---------------------------------------------------------------------------
// SONDE X e Y (stile "Piccione" e "Ali Nere"): due droni-uccello che girano
// intorno alla nave in versi opposti e lanciano bombe ad area su una zona che
// ruota attorno al giocatore. Le bombe volano ad arco ed esplodono all'impatto.
// ---------------------------------------------------------------------------
import type { GameState, Vector2 } from './types';
import { newId, spawnParticles, spawnDamageNumber } from './engine';
import { playHit, playShoot } from './audio';

export interface ProbeBomb { x0: number; y0: number; x: number; y: number; tx: number; ty: number; t: number; dur: number; dmg: number; r: number; type: 'probe_x' | 'probe_y'; evolved: boolean; }
export interface ProbeBlast { x: number; y: number; t: number; r: number; type: 'probe_x' | 'probe_y'; }

const TAU = Math.PI * 2;
const STYLE = {
  probe_x: { body: '#fff8e6', wing: '#ffe7a3', glow: '255, 214, 120', core: '#ffb020', dir: 1 },   // bianco/oro, senso orario
  probe_y: { body: '#15101f', wing: '#2a1d40', glow: '162, 107, 255', core: '#c39bff', dir: -1 },  // nero/viola, senso antiorario
};

function bombs(state: GameState): ProbeBomb[] { const s = state as any; return (s.probeBombs ||= []); }
function blasts(state: GameState): ProbeBlast[] { const s = state as any; return (s.probeBlasts ||= []); }

/** Crea o aggiorna la sonda quando l'abilita' scatta. */
export function ensureProbe(state: GameState, type: 'probe_x' | 'probe_y', dmg: number, level: number): void {
  const p = state.player;
  let probe = state.orbitingProbes.find(o => o.type === type);
  if (!probe) {
    probe = {
      id: newId(), type, pos: { ...p.pos }, angle: type === 'probe_x' ? 0 : Math.PI, distance: 120, damage: dmg, color: type === 'probe_x' ? '#ffe9a8' : '#a26bff',
      shootTimer: 0, shootInterval: 0.4, moveSpeed: 0, rotationSpeed: 0,
      bombardmentZone: { angle: 0, radius: 0, active: true, duration: 0, maxDuration: 0, groupCount: 0, currentGroup: 0, groupTimer: 0, groupInterval: 0 },
    };
    state.orbitingProbes.push(probe);
    playShoot(type);
  }
  probe.damage = dmg;
  probe.distance = 110 + level * 6;
  probe.shootInterval = Math.max(0.12, 0.42 - level * 0.05);
}

/** Movimento delle sonde, lancio delle bombe ed esplosioni. */
export function updateProbes(state: GameState, dt: number): void {
  const p = state.player;
  for (const probe of state.orbitingProbes) {
    const ability = p.abilities.find(a => a.type === probe.type);
    if (!ability) continue;
    const st = STYLE[probe.type];
    const evolved = !!ability.evolved;
    const spin = (1.7 + ability.level * 0.08) * (1 + p.projectileSpeedBonus) * (evolved ? 1.35 : 1);
    probe.angle += st.dir * spin * dt;
    probe.pos = { x: p.pos.x + Math.cos(probe.angle) * probe.distance, y: p.pos.y + Math.sin(probe.angle) * probe.distance };
    probe.shootTimer -= dt;
    if (probe.shootTimer <= 0) {
      probe.shootTimer = probe.shootInterval * (1 - Math.min(0.6, p.cooldownReduction)) * (evolved ? 0.6 : 1);
      // la zona bersaglio ruota davanti alla sonda, a distanza variabile dal giocatore
      const count = 1 + Math.floor(Math.max(0, p.projectileCountBonus) / 2) + (evolved ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const za = probe.angle + st.dir * (0.55 + Math.random() * 0.5);
        const zr = 90 + Math.random() * (150 + ability.level * 20) * (1 + p.areaBonus);
        const tx = p.pos.x + Math.cos(za) * zr, ty = p.pos.y + Math.sin(za) * zr;
        bombs(state).push({ x0: probe.pos.x, y0: probe.pos.y, x: probe.pos.x, y: probe.pos.y, tx, ty, t: 0, dur: 0.38, dmg: probe.damage, r: (48 + ability.level * 4) * (1 + p.areaBonus) * (evolved ? 1.4 : 1), type: probe.type, evolved });
      }
    }
  }
  // volo e impatto delle bombe
  const list = bombs(state);
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.t += dt;
    const k = Math.min(1, b.t / b.dur);
    b.x = b.x0 + (b.tx - b.x0) * k;
    b.y = b.y0 + (b.ty - b.y0) * k - Math.sin(k * Math.PI) * 60; // arco
    if (k < 1) continue;
    list.splice(i, 1);
    let hit = false;
    for (const e of state.enemies) {
      if (Math.hypot(e.pos.x - b.tx, e.pos.y - b.ty) < b.r + e.radius) {
        e.hp -= b.dmg;
        spawnDamageNumber(state, e.pos, b.dmg, STYLE[b.type].core, false, b.type);
        hit = true;
      }
    }
    blasts(state).push({ x: b.tx, y: b.ty, t: 0, r: b.r, type: b.type });
    spawnParticles(state, { x: b.tx, y: b.ty }, STYLE[b.type].core, b.evolved ? 6 : 3);
    if (!hit) playHit(b.type);
  }
  const bl = blasts(state);
  for (let i = bl.length - 1; i >= 0; i--) { bl[i].t += dt; if (bl[i].t > 0.35) bl.splice(i, 1); }
  if (list.length > 60) list.splice(0, list.length - 60);
  if (bl.length > 40) bl.splice(0, bl.length - 40);
}

function drawBird(ctx: CanvasRenderingContext2D, pos: Vector2, heading: number, type: 'probe_x' | 'probe_y', time: number, evolved: boolean) {
  const st = STYLE[type];
  const flap = Math.sin(time * 14 + (type === 'probe_x' ? 0 : 1.7));
  const s = evolved ? 1.25 : 1;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  // alone
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34 * s);
  g.addColorStop(0, `rgba(${st.glow}, 0.55)`); g.addColorStop(1, `rgba(${st.glow}, 0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34 * s, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.rotate(heading);
  ctx.scale(s, s);
  // ali (sbattono)
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(1, side);
    ctx.rotate(-0.25 - flap * 0.45);
    ctx.fillStyle = st.wing; ctx.strokeStyle = `rgba(${st.glow}, 0.9)`; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, 2);
    ctx.quadraticCurveTo(-6, 14, -18, 24);
    ctx.lineTo(-12, 17); ctx.lineTo(-14, 13); ctx.lineTo(-8, 11); ctx.lineTo(-9, 7);
    ctx.quadraticCurveTo(-3, 5, 4, 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // corpo
  ctx.fillStyle = st.body; ctx.strokeStyle = `rgba(${st.glow}, 1)`; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // coda
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-17, -5); ctx.lineTo(-15, 0); ctx.lineTo(-17, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  // occhio/nucleo luminoso
  ctx.fillStyle = st.core; ctx.shadowColor = st.core; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(5, 0, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Disegna sonde, bombe in volo ed esplosioni (coordinate del mondo). */
export function drawProbes(ctx: CanvasRenderingContext2D, state: GameState): void {
  const p = state.player;
  for (const bl of blasts(state)) {
    const k = bl.t / 0.35; const st = STYLE[bl.type];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = `rgba(${st.glow}, 0.35)`; ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r * (0.5 + k * 0.6), 0, TAU); ctx.fill();
    ctx.strokeStyle = st.core; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r * (0.4 + k * 0.75), 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = Math.max(0, 1 - k * 2.5); ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r * 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  for (const b of bombs(state)) {
    const st = STYLE[b.type];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // mirino sulla zona d'impatto
    ctx.globalAlpha = 0.25 + 0.25 * (b.t / b.dur); ctx.strokeStyle = st.core; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.tx, b.ty, b.r * (1 - 0.4 * (b.t / b.dur)), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(${st.glow}, 0.45)`; ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = b.type === 'probe_x' ? '#fff6d6' : '#d8c2ff'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  for (const probe of state.orbitingProbes) {
    const ability = p.abilities.find(a => a.type === probe.type);
    if (!ability) continue;
    const heading = probe.angle + STYLE[probe.type].dir * Math.PI / 2;
    drawBird(ctx, probe.pos, heading, probe.type, state.time, !!ability.evolved);
  }
}
