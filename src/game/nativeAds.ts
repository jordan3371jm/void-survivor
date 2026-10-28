// ---------------------------------------------------------------------------
// Pubblicita' nell'app Android/iOS (Capacitor + Google AdMob).
// Sul web (Playgama) questo file non viene mai caricato.
// ---------------------------------------------------------------------------
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents } from '@capacitor-community/admob';

// ID delle unita' pubblicitarie AdMob di Void Survivors.
// VITE_ADS_TEST=1 (build di prova) mostra annunci di prova anche con gli ID veri: cliccare annunci
// veri durante i test e' vietato da AdMob. Il build per Google Play usa gli annunci veri.
export const ADMOB_IDS = {
  rewarded: 'ca-app-pub-1504660966518611/4123480705',
  interstitial: 'ca-app-pub-1504660966518611/1581077847',
  testing: import.meta.env.VITE_ADS_TEST === '1',
};

let ready = false;

export async function initNativeAds(): Promise<void> {
  if (ready) return;
  await AdMob.initialize({ initializeForTesting: ADMOB_IDS.testing });
  // Consenso privacy (obbligatorio per gli utenti dell'Unione Europea): il modulo di Google appare solo se serve
  try {
    const info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
  } catch (e) { console.warn('[AdMob] consenso non disponibile', e); }
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
