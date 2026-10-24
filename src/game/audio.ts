let audioCtx: AudioContext | null = null;
let isMusicPlaying = false;
let sfxVolume = 0.7;
let musicVolume = 0.5;
let musicNodes: any[] = [];
let customAudioElement: HTMLAudioElement | null = null;
let useCustomMusic = false;
let musicMaster: GainNode | null = null;
// Colonna sonora del gioco (public/audio/bgm.mp3): in streaming, parte all'inizio della partita
let trackAudio: HTMLAudioElement | null = null;
let trackFailed = false;
const TRACK_URL = `${import.meta.env.BASE_URL || '/'}audio/bgm.mp3`;
const lastSfxAt: Record<string, number> = {};

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function setSfxVolume(volume: number) { sfxVolume = Math.max(0, Math.min(1, volume)); }
export function setMusicVolume(volume: number) {
  musicVolume = Math.max(0, Math.min(1, volume));
  if (customAudioElement) customAudioElement.volume = musicVolume;
  if (trackAudio) trackAudio.volume = musicVolume;
  if (musicMaster) musicMaster.gain.value = musicVolume * 0.35;
}

export function loadCustomMusic(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      stopBackgroundMusic();
      const audioUrl = URL.createObjectURL(file);
      customAudioElement = new Audio();
      customAudioElement.src = audioUrl;
      customAudioElement.loop = true;
      customAudioElement.volume = musicVolume;
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
      customAudioElement.volume = musicVolume;
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
      trackAudio.volume = musicVolume;
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
  masterGain.gain.value = musicVolume * 0.35;
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



export function playShoot(type: string = 'laser') {
  try {
    if (sfxVolume <= 0) return;
    const ctx = getAudioContext();
    if (ctx.state !== 'running') return;
    // Limita i suoni identici ravvicinati: con tanti nemici centinaia di oscillatori al secondo bloccavano l'audio sui telefoni
    const now = ctx.currentTime;
    if (now - (lastSfxAt[type] ?? -1) < 0.045) return;
    lastSfxAt[type] = now;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    switch (type) {
      case 'laser': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.05 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
      case 'explosion': osc.type = 'square'; osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3); gain.gain.setValueAtTime(0.08 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); break;
      case 'levelup': osc.type = 'sine'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.1 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4); break;
      case 'hit': osc.type = 'triangle'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05); break;
      case 'photon_gun': osc.type = 'square'; osc.frequency.setValueAtTime(1200, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08); break;
      case 'ion_gun': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12); break;
      case 'drone_swarm': osc.type = 'triangle'; osc.frequency.setValueAtTime(500, ctx.currentTime); osc.frequency.setValueAtTime(700, ctx.currentTime + 0.05); osc.frequency.setValueAtTime(500, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15); break;
      case 'gravity_waves': osc.type = 'sine'; osc.frequency.setValueAtTime(100, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4); gain.gain.setValueAtTime(0.06 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4); break;
      case 'void_lance': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.05 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2); break;
      case 'cryo_lance': osc.type = 'sine'; osc.frequency.setValueAtTime(2000, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15); gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15); break;
      case 'energy_shield': osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.05); osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15); break;
      case 'laser_swords': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05); gain.gain.setValueAtTime(0.05 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
      case 'homing_laser': osc.type = 'square'; osc.frequency.setValueAtTime(1000, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
      case 'kinetic_darts': osc.type = 'triangle'; osc.frequency.setValueAtTime(900, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06); gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06); break;
      case 'meteor': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5); gain.gain.setValueAtTime(0.07 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5); break;
      case 'neutronium_boomerang': osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25); break;
      case 'plasma_flamethrower': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.05 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2); break;
      case 'gravity_field': osc.type = 'sine'; osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); break;
      case 'corrosive_nebula': osc.type = 'triangle'; osc.frequency.setValueAtTime(250, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25); break;
      case 'quantum_bounce': osc.type = 'square'; osc.frequency.setValueAtTime(1500, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08); gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08); break;
      case 'ion_storm': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(2000, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3); gain.gain.setValueAtTime(0.06 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); break;
      case 'stellar_blackhole': osc.type = 'sine'; osc.frequency.setValueAtTime(50, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1.0); gain.gain.setValueAtTime(0.1 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.0); break;
      case 'probe_x': case 'probe_y': osc.type = 'square'; osc.frequency.setValueAtTime(1100, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.07); gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.07); break;
      case 'antimatter_bomb': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.6); gain.gain.setValueAtTime(0.08 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6); break;
      case 'orbiting_satellites': osc.type = 'triangle'; osc.frequency.setValueAtTime(700, ctx.currentTime); osc.frequency.setValueAtTime(900, ctx.currentTime + 0.05); gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
      case 'asteroid_fragment': osc.type = 'triangle'; osc.frequency.setValueAtTime(350, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.04 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
      // --- suoni dei boss ---
      case 'boss_charge': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(90, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 1.1); gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.06 * sfxVolume, ctx.currentTime + 1.0); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.2); break;
      case 'boss_beam': osc.type = 'square'; osc.frequency.setValueAtTime(70, ctx.currentTime); osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 1.0); gain.gain.setValueAtTime(0.09 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.1); break;
      case 'boss_roar': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(160, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8); gain.gain.setValueAtTime(0.11 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.85); break;
      case 'boss_slam': osc.type = 'triangle'; osc.frequency.setValueAtTime(120, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.35); gain.gain.setValueAtTime(0.14 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4); break;
      case 'boss_bolt': osc.type = 'square'; osc.frequency.setValueAtTime(520, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12); gain.gain.setValueAtTime(0.035 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12); break;
      case 'acid': osc.type = 'sine'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08); osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25); gain.gain.setValueAtTime(0.05 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25); break;
      default: osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
    }
  } catch (e) {}
}

export function playPassiveSound(type: string) {
  try {
    if (sfxVolume <= 0) return;
    const ctx = getAudioContext();
    if (ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.03 * sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
}

export function resumeAudio() {
  try {
    const ctx = getAudioContext();
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

