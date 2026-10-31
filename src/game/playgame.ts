// Playgama Bridge SDK v2 Integration
// Documentazione: https://wiki.playgama.com/playgama/bridge-sdk

import { Capacitor } from '@capacitor/core';
import { isKlyo, klyoSdk } from './klyo';

/** true quando il gioco gira come app Android/iOS (Capacitor), false sul web */
export const isNativeApp = (): boolean => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

class PlaygamaSDK {
  private initialized = false;
  private bridge: any = null;

  private initPromise: Promise<void> | null = null;

  // Una sola inizializzazione, anche se viene chiamata piu' volte (avvio + App)
  initialize(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    if (this.initialized) return;
    // Nell'app non c'e' Playgama: le pubblicita' passano da AdMob
    if (isNativeApp()) { import('./nativeAds').then(m => m.initNativeAds()).catch(e => console.warn('[AdMob]', e)); return; }
    if (isKlyo) { await this.initKlyo(); return; }

    let attempts = 0;
    const maxAttempts = 100; // 5 secondi al massimo

    // si ferma subito se lo script del Bridge non si e' potuto scaricare (es. sito fuori da Playgama offline / bloccato)
    while (!(window as any).bridge && !(window as any).__bridgeFailed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    this.bridge = (window as any).bridge;

    if (!this.bridge) {
      console.warn('[Playgama] Bridge non trovato');
      return;
    }

    try {
      // index.html ha gia' avviato bridge.initialize(): attendiamo quella stessa promessa
      if ((window as any).__bridgeInit) await (window as any).__bridgeInit;
      else await this.bridge.initialize();
      this.initialized = true;
      this.subscribePlatformEvents();
    } catch (error) {
      console.error('[Playgama] Errore inizializzazione:', error);
    }
  }

  // Klyo Games: il kit (klyo-gry-sdk.js) e' il primo script della pagina, qui lo si attende soltanto
  private klyo: any = null;
  private async initKlyo(): Promise<void> {
    for (let i = 0; i < 100 && !klyoSdk(); i++) await new Promise(resolve => setTimeout(resolve, 50));
    this.klyo = klyoSdk();
    if (!this.klyo) { console.warn('[Klyo] kit non trovato'); return; }
    this.initialized = true;
    // la pagina di Klyo puo' chiedere il silenzio (finestra piccola)
    try { this.klyo.onSound?.((on: boolean) => this.audioListeners.forEach(cb => cb(on !== false))); } catch { /* ignora */ }
  }

  // Eventi della piattaforma: pausa (tab in background, pubblicita', ecc.) e audio on/off.
  // Playgama richiede che il gioco si fermi e silenzi l'audio quando glielo chiede.
  private pauseListeners: Array<(paused: boolean) => void> = [];
  private audioListeners: Array<(enabled: boolean) => void> = [];

  onPauseChanged(cb: (paused: boolean) => void): void { this.pauseListeners.push(cb); }
  onAudioChanged(cb: (enabled: boolean) => void): void {
    this.audioListeners.push(cb);
    // stato iniziale (proprieta' in Bridge v2)
    try {
      const a = this.bridge?.platform?.isAudioEnabled;
      const enabled = typeof a === 'function' ? !!a.call(this.bridge.platform) : a !== false;
      if (!enabled) cb(false);
    } catch { /* ignora */ }
  }

  private subscribePlatformEvents(): void {
    try {
      const names = this.bridge.EVENT_NAME || {};
      const pauseEvt = names.PAUSE_STATE_CHANGED || 'pause_state_changed';
      const audioEvt = names.AUDIO_STATE_CHANGED || 'audio_state_changed';
      if (typeof this.bridge.platform?.on !== 'function') return;
      this.bridge.platform.on(pauseEvt, (paused: boolean) => this.pauseListeners.forEach(cb => cb(!!paused)));
      this.bridge.platform.on(audioEvt, (enabled: boolean) => this.audioListeners.forEach(cb => cb(!!enabled)));
    } catch (error) {
      console.warn('[Playgama] Eventi pausa/audio non disponibili:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized && (!!this.bridge || !!this.klyo);
  }

  /** Lingua del giocatore indicata dalla piattaforma (es. 'it', 'en'), se disponibile. */
  getLanguage(): string | null {
    // Su Klyo la lingua e' quella del dispositivo del giocatore
    if (this.klyo) { try { return (navigator.language || '').slice(0, 2).toLowerCase() || null; } catch { return null; } }
    try {
      const l = this.bridge?.platform?.language;
      return typeof l === 'string' && l ? l.slice(0, 2).toLowerCase() : null;
    } catch { return null; }
  }

  sendGameReady(): void {
    if (!this.isInitialized()) return;
    if (this.klyo) {
      try { this.klyo.ready(); } catch (error) { console.error('[Klyo] Errore ready:', error); }
      return;
    }

    try {
      this.bridge.platform.sendMessage('game_ready');
    } catch (error) {
      console.error('[Playgama] Errore invio game_ready:', error);
    }
  }

  /** Klyo: il campo di gioco (esiste solo durante la partita) per il pulsante "registra una clip" della pagina */
  registerCanvas(canvas: HTMLCanvasElement): void {
    if (!this.klyo?.canvas) return;
    try { this.klyo.canvas(canvas); } catch (error) { console.warn('[Klyo] canvas:', error); }
  }

  async showInterstitial(placement: string = 'game_over'): Promise<void> {
    if (isNativeApp()) { const m = await import('./nativeAds'); return m.showNativeInterstitial(); }
    if (this.klyo) {
      // pausa pubblicitaria scelta dal gioco: Klyo decide se e cosa mostrare
      if (!this.klyo.adBreak) return;
      return new Promise<void>((resolve) => { try { this.klyo.adBreak('after-loss', () => resolve()); } catch { resolve(); } });
    }
    if (!this.isInitialized() || !this.bridge.advertisement) return;

    try {
      if (!this.bridge.advertisement.isInterstitialSupported) return;
      this.bridge.advertisement.showInterstitial(placement);
    } catch (error) {
      console.error('[Playgama] Errore showInterstitial:', error);
    }
  }

  async showRewarded(placement: string = 'extra_life'): Promise<boolean> {
    if (isNativeApp()) { const m = await import('./nativeAds'); return m.showNativeRewarded(); }
    if (this.klyo) return false;
    if (!this.isInitialized() || !this.bridge.advertisement) return false;

    return new Promise((resolve) => {
      let rewarded = false;
      let resolved = false;

      const safeResolve = (value: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      };

      try {
        if (!this.bridge.advertisement.isRewardedSupported) {
          safeResolve(false);
          return;
        }

        const handler = (state: string) => {
          if (state === 'rewarded') {
            rewarded = true;
          } else if (state === 'closed' || state === 'failed') {
            if (this.bridge.EVENT_NAME?.REWARDED_STATE_CHANGED) {
              this.bridge.advertisement.off(this.bridge.EVENT_NAME.REWARDED_STATE_CHANGED, handler);
            }
            safeResolve(rewarded);
          }
        };

        if (this.bridge.EVENT_NAME?.REWARDED_STATE_CHANGED) {
          this.bridge.advertisement.on(this.bridge.EVENT_NAME.REWARDED_STATE_CHANGED, handler);
        } else {
          safeResolve(false);
          return;
        }

        setTimeout(() => {
          if (!resolved) {
            if (this.bridge.EVENT_NAME?.REWARDED_STATE_CHANGED) {
              this.bridge.advertisement.off(this.bridge.EVENT_NAME.REWARDED_STATE_CHANGED, handler);
            }
            safeResolve(false);
          }
        }, 120000);

        this.bridge.advertisement.showRewarded(placement);
      } catch (error) {
        console.error('[Playgama] Errore showRewarded:', error);
        safeResolve(false);
      }
    });
  }

  isInterstitialSupported(): boolean {
    if (isNativeApp()) return true;
    if (this.klyo) return !!this.klyo.adBreak;
    return this.isInitialized() && !!this.bridge.advertisement?.isInterstitialSupported;
  }

  isRewardedSupported(): boolean {
    if (isNativeApp()) return true;
    // Su Klyo la pubblicita' con premio non e' ancora attiva: nessun pulsante "guarda la pubblicita'"
    if (this.klyo) return false;
    return this.isInitialized() && !!this.bridge.advertisement?.isRewardedSupported;
  }

  // Banner (Advanced Banners), visibili su ogni dispositivo senza coprire niente:
  // - computer con finestra larga, menu e partita: due banner stretti ai lati della scena
  // - tutto il resto (telefoni, tablet, finestre piccole, altre schermate): una striscia in basso,
  //   e il gioco si restringe sopra (variabile CSS --ad-bottom), cosi' nessun pulsante finisce sotto.
  // Le soglie qui devono restare uguali alle chiavi di public/playgama-bridge-config.json.
  private bannerWanted: 'menu' | 'gameplay' | 'pages' | null = null;
  private bannerShown: string | null = null;
  private bannerReserve = '';
  private bannerResizeHooked = false;
  setSideBanners(placement: 'menu' | 'gameplay' | 'pages' | null): void {
    this.bannerWanted = placement;
    if (!this.bannerResizeHooked && typeof window !== 'undefined') {
      this.bannerResizeHooked = true;
      let tm: any = null;
      window.addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => this.applySideBanners(), 300); });
    }
    if (this.isInitialized()) this.applySideBanners();
    else this.initialize().then(() => this.applySideBanners()).catch(() => {});
  }
  private applySideBanners(): void {
    const ad = this.isInitialized() ? this.bridge?.advertisement : null;
    if (!ad || !ad.isAdvancedBannersSupported) return;
    const w = window.innerWidth, h = window.innerHeight;
    const device: string = this.bridge.device?.type || 'desktop';
    const landscape = w > h;
    const target = this.bannerWanted;
    let reserve = 0; // % dell'altezza della finestra occupata dalla striscia in basso
    if (target) {
      const side = device === 'desktop' && landscape && ((target === 'menu' && w > 1300) || (target === 'gameplay' && w > 1400));
      if (!side) reserve = device === 'mobile' ? (landscape ? 14 : 8) : device === 'tablet' ? (landscape ? 8 : 6) : 8;
    }
    const px = reserve ? Math.round(h * reserve / 100) + 'px' : '0px';
    if (target === this.bannerShown && px === this.bannerReserve) return;
    try {
      if (target) ad.showAdvancedBanners(target); else ad.hideAdvancedBanners();
      this.bannerShown = target;
    } catch (e) { console.warn('[Playgama] banner', e); reserve = 0; }
    const finalPx = reserve ? px : '0px';
    if (finalPx !== this.bannerReserve) {
      this.bannerReserve = finalPx;
      document.documentElement.style.setProperty('--ad-bottom', finalPx);
      window.dispatchEvent(new Event('resize')); // il canvas ricalcola la sua dimensione
    }
  }


}

export const playgama = new PlaygamaSDK();
