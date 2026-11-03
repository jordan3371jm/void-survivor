// Klyo Games (games.klyo.pl): kit klyo-gry-sdk.js, caricato solo nella build `npm run build:klyo`.
// Su Klyo non si usano Firebase, Playgama ne' altre reti pubblicitarie: classifica, salvataggi e
// pubblicita' passano dal kit (window.klyo).

/** true solo nella build per Klyo (VITE_TARGET=klyo): costante nota alla compilazione */
export const isKlyo: boolean = import.meta.env.VITE_TARGET === 'klyo';

/** Il kit Klyo, se caricato */
export const klyoSdk = (): any => (isKlyo ? (window as any).klyo ?? null : null);
