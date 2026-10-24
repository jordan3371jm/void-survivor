// Playgama Bridge SDK v2 Integration
// Documentazione: https://wiki.playgama.com/playgama/bridge-sdk

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
    return this.initialized && !!this.bridge;
  }

  sendGameReady(): void {
    if (!this.isInitialized()) return;

    try {
      this.bridge.platform.sendMessage('game_ready');
    } catch (error) {
      console.error('[Playgama] Errore invio game_ready:', error);
    }
  }

  async showInterstitial(placement: string = 'game_over'): Promise<void> {
    if (!this.isInitialized() || !this.bridge.advertisement) return;

    try {
      if (!this.bridge.advertisement.isInterstitialSupported) return;
      this.bridge.advertisement.showInterstitial(placement);
    } catch (error) {
      console.error('[Playgama] Errore showInterstitial:', error);
    }
  }

  async showRewarded(placement: string = 'extra_life'): Promise<boolean> {
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
    return this.isInitialized() && !!this.bridge.advertisement?.isInterstitialSupported;
  }

  isRewardedSupported(): boolean {
    return this.isInitialized() && !!this.bridge.advertisement?.isRewardedSupported;
  }


}

export const playgama = new PlaygamaSDK();
