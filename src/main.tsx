import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { playgama } from "./game/playgame";
import { isStorageReady, markGameStarted, preloadStorage } from "./game/storage";

// Sfondo delle schermate: URL assoluto, funziona anche se il gioco e' in una sottocartella
document.documentElement.style.setProperty(
  "--bg-image",
  `url("${new URL(`${import.meta.env.BASE_URL}assets/bg_nebula.webp`, document.baseURI).href}")`,
);

// Avvio: 1) Playgama Bridge inizializzato, 2) salvataggi caricati con UNA chiamata,
// 3) solo dopo si disegna il gioco (cosi' lo store e' gia' pronto al primo render).
// Un tetto di 15 secondi evita una schermata di caricamento infinita se la piattaforma non risponde;
// se i salvataggi arrivano dopo, storage.ts li applica comunque (STORAGE_LATE_EVENT) senza sovrascriverli.
async function boot() {
  try {
    await Promise.race([
      (async () => {
        await playgama.initialize();
        await preloadStorage();
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 15000)),
    ]);
  } catch (e) {
    console.warn("[Boot] avvio con valori di default:", e);
  }
  markGameStarted();
  // se la piattaforma non ha mai risposto, i salvataggi si leggono comunque (altrimenti non si salverebbe piu' nulla)
  setTimeout(() => { if (!isStorageReady()) void preloadStorage(); }, 20000);
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}

boot();
