// ---------------------------------------------------------------------------
// Pubblicita' nell'app Android/iOS (Capacitor + Google AdMob).
// Sul web (Playgama) questo file non viene mai caricato.
// ---------------------------------------------------------------------------
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';

// ID degli annunci: ora sono quelli DI PROVA di Google (mostrano annunci finti).
// Prima di pubblicare su Google Play vanno sostituiti con gli ID del tuo account AdMob.
export const ADMOB_IDS = {
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  testing: true,
};

let ready = false;

export async function initNativeAds(): Promise<void> {
  if (ready) return;
  await AdMob.initialize({ initializeForTesting: ADMOB_IDS.testing });
  ready = true;
}

/** Mostra un video con premio: true solo se il giocatore l'ha guardato fino al premio. */
export async function showNativeRewarded(): Promise<boolean> {
  try {
    await initNativeAds();
    await AdMob.prepareRewardVideoAd({ adId: ADMOB_IDS.rewarded, isTesting: ADMOB_IDS.testing });
  } catch (e) {
    console.warn('[AdMob] video con premio non disponibile', e);
    return false;
  }
  return new Promise<boolean>((resolve) => {
    let rewarded = false; let done = false;
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    const finish = () => { if (done) return; done = true; handles.forEach(h => h.then(x => x.remove()).catch(() => {})); resolve(rewarded); };
    handles.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; }));
    handles.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, finish));
    handles.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, finish));
    AdMob.showRewardVideoAd().then(() => { rewarded = true; }).catch(() => finish());
    setTimeout(finish, 120000);
  });
}

export async function showNativeInterstitial(): Promise<void> {
  try {
    await initNativeAds();
    await AdMob.prepareInterstitial({ adId: ADMOB_IDS.interstitial, isTesting: ADMOB_IDS.testing });
    await AdMob.showInterstitial();
  } catch (e) {
    console.warn('[AdMob] interstitial non disponibile', e);
  }
}
