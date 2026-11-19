# Void Survivors

Sparatutto di sopravvivenza nello spazio (React + Canvas), giocabile su PC e telefono.

## Avvio

```bash
npm install
npm run dev       # sviluppo: http://localhost:5173
npm run build     # build di produzione nella cartella dist/
npm run preview   # prova la build
npm test          # test automatici del motore (vitest)
npm run typecheck # controllo dei tipi
```

La build usa percorsi relativi: il contenuto di `dist/` si può caricare così com'è
(Playgama, hosting statico, sottocartelle). `dist/` non è più nel repository: generala con
`npm run build` prima di pubblicare.

## itch.io

`npm run build:itch` crea la cartella `dist-itch/` e il file `void-survivors-itch.zip` (con `index.html`
alla radice), da caricare su itch.io come gioco HTML. Questa versione non carica Playgama, non ha
pubblicità né acquisti e salva i progressi nel browser; la velocità x2 si sblocca sconfiggendo gli 8 boss.
I crediti e le licenze dei materiali di terzi sono in `itch/` e finiscono nello zip.

Il gioco usa ovunque (web, Playgama, app) nomi senza marchi registrati e la musica libera CC0
(`public/audio/bgm-free.mp3`). Gli effetti sonori (`public/audio/sfx/`) vengono dai pacchetti
"Sci-Fi Sounds" e "Digital SFX" di [Kenney](https://www.kenney.nl), licenza CC0. Account e salvataggi online passano solo da Playgama Bridge;
fuori da Playgama i progressi restano sul dispositivo.

Immagini promozionali (16:9 e 9:16) nella cartella `promo/`.

## Struttura

```
index.html              pagina, schermata di caricamento, Playgama Bridge
public/                 immagini (navi, nemici, boss, abilità) e config Playgama
src/main.tsx            avvio (Bridge + salvataggi, poi il gioco)
src/App.tsx             interfaccia: home, modalità, astronavi, potenziamenti, partita
src/ui/                 catalogo del negozio, componenti condivisi, schermata impostazioni
src/index.css           grafica (design system, responsive PC / telefono)
src/game/engine.ts      motore di gioco e HUD
src/game/spatial.ts     griglia spaziale per le collisioni proiettili-nemici
src/game/__tests__/     test automatici (vitest)
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
| Distruttore di Pianeti | superlaser, raffiche di turbolaser, squadriglia imperiale, trincea laser (fase 2) |
| Regina dell'Alveare | sputi acidi, balzo, covata di parassiti, colpo di coda, urlo (fase 2) |
| Cthulhu Cosmico | tentacoli, onde di follia, occhi, spirale degli abissi |
| Cubo Assimilatore | raggio traente, droni, griglia laser, scudo di adattamento (fase 2) |
| Kraken Spaziale | pioggia di tentacoli, inchiostro, gorgo, tentacoli rotanti |
| Divoratore di Galassie | buco nero, braccia a spirale, raggi cosmici, pioggia di stelle |
| Imperatore del Vuoto | lance del vuoto, nova oscura, giudizio a croce, teletrasporto |
| Orrore Cosmico | sguardi della follia, squarci nella realtà, tempesta di occhi, evocazioni, abisso (fase 2) |

## Progressione in partita

- **Scrigno del tesoro**: ogni boss sconfitto lascia uno scrigno. Aprendolo si potenziano fino a
  3 abilità, si recuperano HP, si guadagnano monete e, se possibile, un'arma si evolve.
- **Evoluzione delle armi**: arma al livello massimo + passiva abbinata + scrigno di un boss =
  arma **EVOLUTA** (danno x2,2, ricarica più rapida). L'abbinamento è indicato nel negozio
  (scheda Attive) e nelle carte del level up.
- **Oggetti a terra**: cuori (curano il 25%) e magneti (raccolgono tutta l'esperienza).
- **Rigenera**: nel level up si possono cambiare le 3 scelte (2 volte per partita, +1 per ogni boss; tasto R su PC).
- **Boss Rush**: si parte con 300 di vita, senza potenziamenti del negozio e senza Buco Nero.
