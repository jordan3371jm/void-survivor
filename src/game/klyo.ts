// Klyo Games (games.klyo.pl): kit klyo-gry-sdk.js, caricato solo nella build `npm run build:klyo`.
// Su Klyo non si usano Firebase, Playgama ne' altre reti pubblicitarie: classifica, salvataggi e
// pubblicita' passano dal kit (window.klyo).

/** true solo nella build per Klyo (VITE_TARGET=klyo): costante nota alla compilazione */
export const isKlyo: boolean = import.meta.env.VITE_TARGET === 'klyo';
/** true solo nella build per CrazyGames (VITE_TARGET=crazygames): stesso Bridge di Playgama, ma senza negozio a pagamento */
export const isCrazy: boolean = import.meta.env.VITE_TARGET === 'crazygames';
/** CrazyGames in "basic launch": le pubblicita' non sono ammesse, il gioco non deve nemmeno chiederle (build con VITE_CG_ADS=1 per il full launch) */
export const adsOff: boolean = isCrazy && import.meta.env.VITE_CG_ADS !== '1';

/** Il kit Klyo, se caricato */
export const klyoSdk = (): any => (isKlyo ? (window as any).klyo ?? null : null);
