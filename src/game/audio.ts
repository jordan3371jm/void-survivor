let audioCtx: AudioContext | null = null;
let isMusicPlaying = false;
let sfxVolume = 0.7;
let musicVolume = 0.5;
let musicNodes: any[] = [];
let customAudioElement: HTMLAudioElement | null = null;
let useCustomMusic = false;
let musicMaster: GainNode | null = null;
// Colonna sonora del gioco (public/audio/bgm-free.mp3): in streaming, parte all'inizio della partita
let trackAudio: HTMLAudioElement | null = null;
let trackFailed = false;
// Brano libero da diritti (CC0, "Space Battle" di MintoDog, opengameart.org)
const TRACK_URL = `${import.meta.env.BASE_URL || '/'}audio/bgm-free.mp3`;
// la colonna sonora resta in sottofondo: al 100% del cursore suona al 32%, cosi' colpi ed effetti si sentono bene
const TRACK_GAIN = 0.32;
const lastSfxAt: Record<string, number> = {};

// Se il browser non ha Web Audio, lo si ricorda: prima ogni effetto sonoro riprovava a creare il contesto
// e lanciava un'eccezione (centinaia di volte al secondo con tanti nemici).
let audioUnavailable = false;
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : undefined;
    if (!Ctor) { audioUnavailable = true; throw new Error('Web Audio non disponibile'); }
    audioCtx = new Ctor();
  }
  return audioCtx;
}

export function setSfxVolume(volume: number) { sfxVolume = Math.max(0, Math.min(1, volume)); }
export function setMusicVolume(volume: number) {
  musicVolume = Math.max(0, Math.min(1, volume));
  if (customAudioElement) customAudioElement.volume = musicVolume * TRACK_GAIN;
  if (trackAudio) trackAudio.volume = musicVolume * TRACK_GAIN;
  if (musicMaster) musicMaster.gain.value = musicVolume * 0.2;
}

export function loadCustomMusic(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      stopBackgroundMusic();
      const audioUrl = URL.createObjectURL(file);
      customAudioElement = new Audio();
      customAudioElement.src = audioUrl;
      customAudioElement.loop = true;
      customAudioElement.volume = musicVolume * TRACK_GAIN;
      useCustomMusic = true;
      customAudioElement.addEventListener('canplaythrough', () => resolve());
      customAudioElement.addEventListener('error', () => reject(new Error('Errore nel caricamento del file audio')));
      customAudioElement.load();
    } catch (error) { reject(error); }
  });
}

export function hasCustomMusic(): boolean { return useCustomMusic && customAudioElement !== null; }

export function startBackgroundMusic() {
  if (isMusicPlaying) return;
  if (useCustomMusic && customAudioElement) {
    try {
      customAudioElement.currentTime = 0;
      customAudioElement.volume = musicVolume * TRACK_GAIN;
      customAudioElement.play().catch(e => console.error('Errore play musica custom:', e));
      isMusicPlaying = true;
      return;
    } catch (error) { console.error('Errore nella riproduzione della musica personalizzata:', error); }
  }
  if (!trackFailed) {
    try {
      if (!trackAudio) {
        trackAudio = new Audio(TRACK_URL);
        trackAudio.loop = true;
        trackAudio.preload = 'auto';
        // se il file non si carica si torna alla musica sintetizzata
        trackAudio.addEventListener('error', () => { trackFailed = true; trackAudio = null; if (isMusicPlaying) { isMusicPlaying = false; startBackgroundMusic(); } });
      }
      trackAudio.volume = musicVolume * TRACK_GAIN;
      trackAudio.currentTime = 0; // ogni partita riparte dall'inizio del brano
      trackAudio.play().catch(e => console.warn('[Audio] musica in attesa di un tocco:', e));
      isMusicPlaying = true;
      return;
    } catch (error) { trackFailed = true; trackAudio = null; }
  }
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        createMusicNodes(ctx);
      }).catch(e => console.error('Errore resume AudioContext:', e));
    } else {
      createMusicNodes(ctx);
    }
  } catch (error) { console.error('Errore durante l\'avvio della musica:', error); }
}

function createMusicNodes(ctx: AudioContext) {
  const masterGain = ctx.createGain();
  masterGain.gain.value = musicVolume * 0.2;
  musicMaster = masterGain;
  masterGain.connect(ctx.destination);
  musicNodes.push(masterGain);

  const songDuration = 180;
  const startTime = ctx.currentTime;

  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  const bassFilter = ctx.createBiquadFilter();
  bassOsc.type = 'sawtooth';
  bassFilter.type = 'lowpass';
  bassFilter.frequency.value = 200;
  bassGain.gain.value = 0.15;
  bassOsc.connect(bassFilter);
  bassFilter.connect(bassGain);
  bassGain.connect(masterGain);
  
  const bassPattern = [
    { time: 0, freq: 55, duration: 15 },
    { time: 15, freq: 55, duration: 7.5 },
    { time: 22.5, freq: 65.41, duration: 7.5 },
    { time: 30, freq: 73.42, duration: 7.5 },
    { time: 37.5, freq: 55, duration: 7.5 },
    { time: 45, freq: 82.41, duration: 15 },
    { time: 60, freq: 73.42, duration: 15 },
    { time: 75, freq: 65.41, duration: 15 },
    { time: 90, freq: 55, duration: 15 },
    { time: 105, freq: 82.41, duration: 7.5 },
    { time: 112.5, freq: 98, duration: 7.5 },
    { time: 120, freq: 110, duration: 15 },
    { time: 135, freq: 98, duration: 15 },
    { time: 150, freq: 82.41, duration: 15 },
    { time: 165, freq: 55, duration: 15 }
  ];
  
  for (const note of bassPattern) {
    bassOsc.frequency.setValueAtTime(note.freq, startTime + note.time);
    bassGain.gain.setValueAtTime(0.15, startTime + note.time);
    bassGain.gain.setValueAtTime(0.15, startTime + note.time + note.duration - 0.1);
    bassGain.gain.setValueAtTime(0, startTime + note.time + note.duration);
  }
  bassOsc.start(startTime);
  bassOsc.stop(startTime + songDuration);

  const kickOsc = ctx.createOscillator();
  const kickGain = ctx.createGain();
  kickOsc.type = 'sine';
  kickGain.gain.value = 0;
  kickOsc.connect(kickGain);
  kickGain.connect(masterGain);
  
  const bpm = 120;
  const beatDuration = 60 / bpm;
  
  for (let bar = 0; bar < 60; bar++) {
    const barStart = startTime + bar * beatDuration * 4;
    if (bar < 4 || bar > 56) continue;
    for (const beat of [0, 2]) {
      const kickTime = barStart + beat * beatDuration;
      kickGain.gain.setValueAtTime(0.3, kickTime);
      kickGain.gain.exponentialRampToValueAtTime(0.01, kickTime + 0.1);
    }
    for (const beat of [1, 3]) {
      const snareTime = barStart + beat * beatDuration;
      kickGain.gain.setValueAtTime(0.15, snareTime);
      kickGain.gain.exponentialRampToValueAtTime(0.01, snareTime + 0.08);
    }
  }
  kickOsc.frequency.setValueAtTime(60, startTime);
  kickOsc.start(startTime);
  kickOsc.stop(startTime + songDuration);

  const leadOsc = ctx.createOscillator();
  const leadGain = ctx.createGain();
  const leadFilter = ctx.createBiquadFilter();
  leadOsc.type = 'square';
  leadFilter.type = 'lowpass';
  leadFilter.frequency.value = 2000;
  leadGain.gain.value = 0;
  leadOsc.connect(leadFilter);
  leadFilter.connect(leadGain);
  leadGain.connect(masterGain);
  
  const melodyPattern = [
    { time: 15, freq: 440, duration: 0.5 },
    { time: 15.5, freq: 523.25, duration: 0.5 },
    { time: 16, freq: 659.25, duration: 1 },
    { time: 17.5, freq: 587.33, duration: 0.5 },
    { time: 18, freq: 523.25, duration: 1.5 },
    { time: 20, freq: 440, duration: 0.5 },
    { time: 20.5, freq: 493.88, duration: 0.5 },
    { time: 21, freq: 523.25, duration: 1 },
    { time: 22.5, freq: 587.33, duration: 2 },
    { time: 25, freq: 659.25, duration: 1 },
    { time: 26.5, freq: 587.33, duration: 0.5 },
    { time: 27, freq: 523.25, duration: 1.5 },
    { time: 29, freq: 440, duration: 2 },
    { time: 45, freq: 659.25, duration: 0.5 },
    { time: 45.5, freq: 783.99, duration: 0.5 },
    { time: 46, freq: 880, duration: 1 },
    { time: 47.5, freq: 783.99, duration: 0.5 },
    { time: 48, freq: 659.25, duration: 1.5 },
    { time: 50, freq: 587.33, duration: 1 },
    { time: 51.5, freq: 659.25, duration: 0.5 },
    { time: 52, freq: 783.99, duration: 2 },
    { time: 54.5, freq: 880, duration: 1 },
    { time: 56, freq: 783.99, duration: 0.5 },
    { time: 56.5, freq: 659.25, duration: 1.5 },
    { time: 58.5, freq: 587.33, duration: 2 },
    { time: 75, freq: 880, duration: 1 },
    { time: 76.5, freq: 783.99, duration: 0.5 },
    { time: 77, freq: 659.25, duration: 1 },
    { time: 78.5, freq: 587.33, duration: 0.5 },
    { time: 79, freq: 523.25, duration: 2 },
    { time: 81.5, freq: 493.88, duration: 1 },
    { time: 83, freq: 440, duration: 1.5 },
    { time: 85, freq: 523.25, duration: 1 },
    { time: 86.5, freq: 587.33, duration: 0.5 },
    { time: 87, freq: 659.25, duration: 2 },
    { time: 89.5, freq: 523.25, duration: 1.5 },
    { time: 91.5, freq: 440, duration: 2 },
    { time: 105, freq: 880, duration: 0.5 },
    { time: 105.5, freq: 987.77, duration: 0.5 },
    { time: 106, freq: 1046.5, duration: 1 },
    { time: 107.5, freq: 987.77, duration: 0.5 },
    { time: 108, freq: 880, duration: 1.5 },
    { time: 110, freq: 783.99, duration: 1 },
    { time: 111.5, freq: 880, duration: 0.5 },
    { time: 112, freq: 987.77, duration: 2 },
    { time: 114.5, freq: 1046.5, duration: 1 },
    { time: 116, freq: 987.77, duration: 0.5 },
    { time: 116.5, freq: 880, duration: 1.5 },
    { time: 118.5, freq: 783.99, duration: 2 },
    { time: 165, freq: 440, duration: 2 },
    { time: 167.5, freq: 523.25, duration: 2 },
    { time: 170, freq: 440, duration: 3 },
    { time: 173.5, freq: 392, duration: 3 },
    { time: 177, freq: 440, duration: 3 }
  ];
  
  for (const note of melodyPattern) {
    leadGain.gain.setValueAtTime(0.08, startTime + note.time);
    leadOsc.frequency.setValueAtTime(note.freq, startTime + note.time);
    leadGain.gain.setValueAtTime(0.08, startTime + note.time + note.duration - 0.05);
    leadGain.gain.setValueAtTime(0, startTime + note.time + note.duration);
  }
  leadOsc.start(startTime);
  leadOsc.stop(startTime + songDuration);

  const padOsc1 = ctx.createOscillator();
  const padOsc2 = ctx.createOscillator();
  const padGain = ctx.createGain();
  const padFilter = ctx.createBiquadFilter();
  padOsc1.type = 'sine';
  padOsc2.type = 'triangle';
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 800;
  padGain.gain.value = 0.08;
  padOsc1.connect(padFilter);
  padOsc2.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(masterGain);
  
  const padPattern = [
    { time: 0, freq1: 220, freq2: 329.63, duration: 15 },
    { time: 15, freq1: 220, freq2: 329.63, duration: 15 },
    { time: 30, freq1: 293.66, freq2: 440, duration: 15 },
    { time: 45, freq1: 329.63, freq2: 493.88, duration: 15 },
    { time: 60, freq1: 293.66, freq2: 440, duration: 15 },
    { time: 75, freq1: 261.63, freq2: 392, duration: 15 },
    { time: 90, freq1: 220, freq2: 329.63, duration: 15 },
    { time: 105, freq1: 329.63, freq2: 493.88, duration: 15 },
    { time: 120, freq1: 440, freq2: 659.25, duration: 15 },
    { time: 135, freq1: 392, freq2: 587.33, duration: 15 },
    { time: 150, freq1: 329.63, freq2: 493.88, duration: 15 },
    { time: 165, freq1: 220, freq2: 329.63, duration: 15 }
  ];
  
  for (const chord of padPattern) {
    padOsc1.frequency.setValueAtTime(chord.freq1, startTime + chord.time);
    padOsc2.frequency.setValueAtTime(chord.freq2, startTime + chord.time);
    padGain.gain.setValueAtTime(0.08, startTime + chord.time);
    padGain.gain.setValueAtTime(0.08, startTime + chord.time + chord.duration - 0.5);
    padGain.gain.setValueAtTime(0, startTime + chord.time + chord.duration);
  }
  padOsc1.start(startTime);
  padOsc2.start(startTime);
  padOsc1.stop(startTime + songDuration);
  padOsc2.stop(startTime + songDuration);

  const arpOsc = ctx.createOscillator();
  const arpGain = ctx.createGain();
  const arpFilter = ctx.createBiquadFilter();
  arpOsc.type = 'triangle';
  arpFilter.type = 'lowpass';
  arpFilter.frequency.value = 3000;
  arpGain.gain.value = 0;
  arpOsc.connect(arpFilter);
  arpFilter.connect(arpGain);
  arpGain.connect(masterGain);
  
  const arpNotes = [440, 523.25, 659.25, 783.99];
  for (let section = 0; section < 2; section++) {
    const sectionStart = section === 0 ? 45 : 105;
    const sectionEnd = sectionStart + 30;
    for (let t = sectionStart; t < sectionEnd; t += 0.25) {
      const noteIndex = Math.floor((t - sectionStart) * 4) % arpNotes.length;
      arpGain.gain.setValueAtTime(0.05, startTime + t);
      arpOsc.frequency.setValueAtTime(arpNotes[noteIndex], startTime + t);
      arpGain.gain.setValueAtTime(0.05, startTime + t + 0.2);
      arpGain.gain.setValueAtTime(0, startTime + t + 0.24);
    }
  }
  arpOsc.start(startTime);
  arpOsc.stop(startTime + songDuration);

  musicNodes.push(bassOsc, bassGain, bassFilter, kickOsc, kickGain, leadOsc, leadGain, leadFilter, padOsc1, padOsc2, padGain, padFilter, arpOsc, arpGain, arpFilter);
  isMusicPlaying = true;
  
  const loopTimeout = setTimeout(() => {
    if (isMusicPlaying) {
      stopBackgroundMusic();
      startBackgroundMusic();
    }
  }, songDuration * 1000);
  musicNodes.push({ timeout: loopTimeout });
}

export function stopBackgroundMusic() {
  if (isMusicPlaying) {
    try {
      if (useCustomMusic && customAudioElement) { customAudioElement.pause(); customAudioElement.currentTime = 0; }
      if (trackAudio) trackAudio.pause();
      musicNodes.forEach(node => {
        if (node.stop) { try { node.stop(); } catch (e) {} }
        if (node.interval) clearInterval(node.interval);
        if (node.timeout) clearTimeout(node.timeout);
        if (node.disconnect) { try { node.disconnect(); } catch (e) {} }
      });
      musicNodes = [];
      musicMaster = null;
      isMusicPlaying = false;
    } catch (error) { console.error('Errore durante l\'arresto della musica:', error); }
  }
}



// ---------------------------------------------------------------------------
// Effetti sonori registrati (public/audio/sfx/*.mp3): pacchetti "Sci-Fi Sounds" e "Digital SFX" di Kenney,
// licenza CC0. Prima i suoni erano generati nel codice con oscillatori, che Playgama non accetta (regola 3.3.2).
// I file si scaricano una volta sola al primo avvio dell'audio e si suonano con Web Audio (leggero e preciso).
// ---------------------------------------------------------------------------
const SFX_BASE = `${import.meta.env.BASE_URL || '/'}audio/sfx/`;
const sampleBuffers: Record<string, AudioBuffer> = {};
let samplesRequested = false;
let activeVoices = 0;
const MAX_VOICES = 24; // con tantissimi colpi insieme si saltano i suoni in piu' invece di saturare l'audio

/** [file, volume] per ogni suono del gioco (volumi bilanciati sul volume medio di ciascun file). */
const SHOOT_SOUNDS: Record<string, [string, number]> = {
  laser: ['laser', 0.32], explosion: ['explosion', 0.3], levelup: ['levelup', 0.5], hit: ['player_hit', 0.55],
  photon_gun: ['photon', 0.22], ion_gun: ['ion', 0.2], drone_swarm: ['drone', 0.18], gravity_waves: ['wave', 0.3],
  void_lance: ['lance', 0.4], cryo_lance: ['cryo', 0.26], energy_shield: ['shield', 0.32], laser_swords: ['sword', 0.16],
  homing_laser: ['homing', 0.24], kinetic_darts: ['darts', 0.24], meteor: ['meteor', 0.34], neutronium_boomerang: ['boomerang', 0.2],
  plasma_flamethrower: ['flame', 0.3], gravity_field: ['field', 0.28], corrosive_nebula: ['slime', 0.5], quantum_bounce: ['bounce', 0.26],
  ion_storm: ['storm', 0.3], stellar_blackhole: ['blackhole', 0.36], probe_x: ['probe_x', 0.28], probe_y: ['probe_y', 0.28],
  antimatter_bomb: ['bomb', 0.34], orbiting_satellites: ['satellite', 0.2], asteroid_fragment: ['rock', 0.5], prism_ray: ['prism', 0.3],
  prism_split: ['prism_split', 0.14], arc_slash: ['arc', 0.28],
  boss_charge: ['boss_charge', 0.4], boss_beam: ['boss_beam', 0.5], boss_roar: ['boss_roar', 0.45], boss_slam: ['boss_slam', 0.42],
  boss_bolt: ['boss_bolt', 0.24], acid: ['acid', 0.55],
};
const ALL_SAMPLES = Array.from(new Set([
  ...Object.values(SHOOT_SOUNDS).map(([f]) => f), 'passive', 'impact_a', 'impact_b', 'impact_c', 'impact_d',
]));

function decode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // Safari vecchi accettano solo la forma con callback
  return new Promise((resolve, reject) => {
    const r = ctx.decodeAudioData(data, resolve, reject) as unknown as Promise<AudioBuffer> | undefined;
    if (r && typeof r.then === 'function') r.then(resolve, reject);
  });
}

/** Scarica e decodifica gli effetti sonori (una volta sola, in parallelo). */
function loadSamples(ctx: AudioContext): void {
  if (samplesRequested || typeof fetch === 'undefined') return;
  samplesRequested = true;
  for (const name of ALL_SAMPLES) {
    fetch(`${SFX_BASE}${name}.mp3`)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(buf => decode(ctx, buf))
      .then(b => { sampleBuffers[name] = b; })
      .catch(() => { /* suono mancante: si salta */ });
  }
}

/** Suona un effetto: volume relativo e lieve variazione di altezza per non sentire sempre lo stesso colpo. */
function playSample(name: string, volume: number, rate = 1): void {
  if (sfxVolume <= 0 || audioUnavailable) return;
  const ctx = getAudioContext();
  loadSamples(ctx);
  if (ctx.state !== 'running' || activeVoices >= MAX_VOICES) return;
  const buffer = sampleBuffers[name];
  if (!buffer) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
  gain.gain.value = volume * sfxVolume;
  src.connect(gain); gain.connect(ctx.destination);
  activeVoices++;
  src.onended = () => { activeVoices = Math.max(0, activeVoices - 1); try { gain.disconnect(); } catch { /* ignora */ } };
  src.start();
}

export function playShoot(type: string = 'laser') {
  try {
    if (sfxVolume <= 0 || audioUnavailable) return;
    const ctx = getAudioContext();
    // Limita i suoni identici ravvicinati: con tanti nemici centinaia di suoni al secondo bloccavano l'audio sui telefoni
    const now = ctx.currentTime;
    if (now - (lastSfxAt[type] ?? -1) < 0.045) return;
    lastSfxAt[type] = now;
    const def = SHOOT_SOUNDS[type] || SHOOT_SOUNDS.laser;
    playSample(def[0], def[1]);
  } catch { /* audio non disponibile */ }
}

export function playPassiveSound(_type: string) {
  try { playSample('passive', 0.18); } catch { /* audio non disponibile */ }
}

export function resumeAudio() {
  try {
    const ctx = getAudioContext();
    loadSamples(ctx); // al primo tocco/tasto si scaricano gli effetti sonori
    if (ctx.state === 'suspended') {
      ctx.resume().catch(e => console.error('Errore resume:', e));
    }
  } catch (e) {
    console.error('Errore in resumeAudio:', e);
  }
}

/** Mette in pausa / riprende tutto l'audio (pausa del gioco, scheda nascosta, richiesta della piattaforma). */
export function setAudioPaused(paused: boolean) {
  try {
    if (paused) {
      if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(() => {});
      if (customAudioElement && !customAudioElement.paused) customAudioElement.pause();
      if (trackAudio && !trackAudio.paused) trackAudio.pause();
    } else {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      if (useCustomMusic && customAudioElement && isMusicPlaying && customAudioElement.paused) customAudioElement.play().catch(() => {});
      else if (!useCustomMusic && trackAudio && isMusicPlaying && trackAudio.paused) trackAudio.play().catch(() => {});
    }
  } catch { /* audio non disponibile */ }
}

// ---------------------------------------------------------------------------
// Suoni di impatto: ogni arma ha il suo "colpo a segno" (impatto, volume e altezza diversi)
// ---------------------------------------------------------------------------
type HitDef = [string, number, number]; // file, volume, altezza (playbackRate)
const HIT_SOUNDS: Record<string, HitDef> = {
  homing_laser: ['impact_d', 0.08, 1.3], photon_gun: ['impact_d', 0.07, 1.5],
  ion_gun: ['impact_a', 0.12, 1.2], drone_swarm: ['impact_d', 0.06, 1.6],
  gravity_waves: ['impact_b', 0.16, 0.7], void_lance: ['impact_a', 0.16, 0.9],
  cryo_lance: ['impact_c', 0.14, 1.6], energy_shield: ['impact_b', 0.14, 1.2],
  asteroid_fragment: ['impact_a', 0.18, 0.8], antimatter_bomb: ['impact_b', 0.16, 0.6],
  laser_swords: ['impact_c', 0.1, 1.4], kinetic_darts: ['impact_c', 0.12, 1.5],
  meteor: ['impact_a', 0.2, 0.6], neutronium_boomerang: ['impact_b', 0.12, 1.3],
  orbiting_satellites: ['impact_c', 0.09, 1.3], plasma_flamethrower: ['impact_a', 0.08, 1.1],
  gravity_field: ['impact_b', 0.07, 0.9], corrosive_nebula: ['impact_c', 0.07, 0.8],
  quantum_bounce: ['impact_d', 0.08, 1.8], ion_storm: ['impact_d', 0.09, 1.2],
  stellar_blackhole: ['impact_b', 0.18, 0.5], probe_x: ['impact_a', 0.14, 1.0], probe_y: ['impact_a', 0.14, 0.9],
};
const lastHitAt: Record<string, number> = {};

/** Suono del colpo a segno di un'arma (limitato a uno ogni 70 ms per arma). */
export function playHit(type: string) {
  const def = HIT_SOUNDS[type];
  if (!def || sfxVolume <= 0 || audioUnavailable) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    if (now - (lastHitAt[type] ?? -1) < 0.07) return;
    lastHitAt[type] = now;
    playSample(def[0], def[1], def[2]);
  } catch { /* audio non disponibile */ }
}
