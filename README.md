# Void Survivors

Sparatutto di sopravvivenza nello spazio (React + Canvas), giocabile su PC e telefono.

## Avvio

```bash
npm install
npm run dev       # sviluppo: http://localhost:5173
npm run build     # build di produzione nella cartella dist/
npm run preview   # prova la build
```

La build usa percorsi relativi: il contenuto di `dist/` si può caricare così com'è
(Playgama, hosting statico, sottocartelle).

## Struttura

```
index.html              pagina, schermata di caricamento, Playgama Bridge
public/                 immagini (navi, nemici, boss, abilità) e config Playgama
src/main.tsx            avvio (Bridge + salvataggi, poi il gioco)
src/App.tsx             interfaccia: home, modalità, astronavi, potenziamenti, impostazioni, partita
src/index.css           grafica (design system, responsive PC / telefono)
src/game/engine.ts      motore di gioco e HUD
src/game/*.ts           salvataggi, audio, traduzioni, obiettivi, sfide, Playgama
src/components/         icone di navi e abilità
src/*Modal.tsx, profile.tsx   finestre (premi, sfide, obiettivi, profilo, classifica)
```

## Comandi in partita

- PC: WASD / frecce per muoversi, Esc o P per la pausa, 1-2-3 per scegliere il level up.
- Telefono: trascina il dito in un punto qualsiasi dello schermo (joystick visibile opzionale nelle impostazioni).
