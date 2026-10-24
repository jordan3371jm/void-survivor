import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { playgama } from "./game/playgame";
import { preloadStorage } from "./game/storage";

// Sfondo delle schermate: URL assoluto, funziona anche se il gioco e' in una sottocartella
document.documentElement.style.setProperty(
  "--bg-image",
  `url("${new URL(`${import.meta.env.BASE_URL}assets/bg_nebula.webp`, document.baseURI).href}")`,
);

// Avvio: 1) Playgama Bridge inizializzato, 2) salvataggi caricati con UNA chiamata,
// 3) solo dopo si disegna il gioco (cosi' lo store e' gia' pronto al primo render).
// Un tetto di 6 secondi evita una schermata di caricamento infinita se la piattaforma non risponde.
async function boot() {
  try {
    await Promise.race([
      (async () => {
        await playgama.initialize();
        await preloadStorage();
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 6000)),
    ]);
  } catch (e) {
    console.warn("[Boot] avvio con valori di default:", e);
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}

boot();
