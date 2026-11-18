// Ambiente minimo per far girare il motore in Node: niente DOM, niente audio.
const g = globalThis as any;
g.window ??= g;
g.innerWidth ??= 1280;
g.innerHeight ??= 720;
g.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
g.sessionStorage ??= g.localStorage;
