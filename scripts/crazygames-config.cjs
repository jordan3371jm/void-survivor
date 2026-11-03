// Build per CrazyGames: senza VITE_CG_ADS=1 ("basic launch") il Bridge non deve preparare ne' mostrare pubblicita'
// (niente precaricamento all'avvio, niente banner, niente leaderboard di Playgama).
const fs = require('fs');
const file = 'dist-crazygames/playgama-bridge-config.json';
const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
delete cfg.saas;
delete cfg.leaderboards;
delete cfg.payments;
if (process.env.VITE_CG_ADS !== '1') {
  cfg.advertisement = { interstitial: { disable: true }, rewarded: { disable: true }, advancedBanners: { disable: true } };
}
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
console.log('config CrazyGames:', process.env.VITE_CG_ADS === '1' ? 'con pubblicita (full launch)' : 'senza pubblicita (basic launch)');
