// Versione per itch.io (`npm run build:itch`): niente Playgama, niente pubblicita', niente acquisti.
// E' una costante nota alla compilazione: il codice di Playgama e delle pubblicita' resta fuori dal pacchetto.
export const isItch: boolean = import.meta.env.VITE_TARGET === 'itch';
