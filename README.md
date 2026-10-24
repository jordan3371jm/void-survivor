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
(Playgama, hosting statico, sottocartelle). La cartella `dist/` è già inclusa nel repository,
pronta da pubblicare: dopo ogni modifica rigenerala con `npm run build`.

Immagini promozionali (16:9 e 9:16) nella cartella `promo/`.

## Struttura

```
index.html              pagina, schermata di caricamento, Playgama Bridge
public/                 immagini (navi, nemici, boss, abilità) e config Playgama
src/main.tsx            avvio (Bridge + salvataggi, poi il gioco)
src/App.tsx             interfaccia: home, modalità, astronavi, potenziamenti, impostazioni, partita
src/index.css           grafica (design system, responsive PC / telefono)
src/game/engine.ts      motore di gioco e HUD
src/game/bosses.ts      mosse e attacchi dei boss (preavvisi, seconda fase, difficoltà crescente)
src/game/*.ts           salvataggi, audio, traduzioni, obiettivi, sfide, Playgama
src/components/         icone di navi e abilità
src/*Modal.tsx, profile.tsx   finestre (premi, sfide, obiettivi, profilo, classifica)
```

## Comandi in partita

- PC: WASD / frecce per muoversi, Esc o P per la pausa, 1-2-3 per scegliere il level up.
- Telefono: trascina il dito in un punto qualsiasi dello schermo (joystick visibile opzionale nelle impostazioni).

## Boss

Ogni boss ha 4-5 mosse proprie, annunciate da un preavviso visivo (zone e linee che si
caricano prima del colpo), e una seconda fase più aggressiva sotto il 50% di vita.
Ogni boss successivo nella stessa partita è più forte.

| Boss | Mosse |
|---|---|
| Morte Nera | superlaser, raffiche di turbolaser, squadriglia imperiale, trincea laser (fase 2) |
| Regina Xenomorfa | sputi acidi, balzo, covata di parassiti, colpo di coda, urlo (fase 2) |
| Cthulhu Cosmico | tentacoli, onde di follia, occhi, spirale degli abissi |
| Cubo Borg | raggio traente, droni, griglia laser, scudo di adattamento (fase 2) |
| Kraken Spaziale | pioggia di tentacoli, inchiostro, gorgo, tentacoli rotanti |
| Divoratore di Galassie | buco nero, braccia a spirale, raggi cosmici, pioggia di stelle |
| Imperatore del Vuoto | lance del vuoto, nova oscura, giudizio a croce, teletrasporto |
| Orrore Cosmico | sguardi della follia, squarci nella realtà, tempesta di occhi, evocazioni, abisso (fase 2) |
