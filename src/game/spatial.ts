// Griglia spaziale per le collisioni: invece di confrontare ogni proiettile con ogni nemico
// (fino a 200 x 270 controlli per frame), si controllano solo i nemici delle celle vicine.
import type { Vector2 } from './types';

interface Body { pos: Vector2; radius: number; }

const CELL = 128;
const key = (cx: number, cy: number) => cx * 73856093 ^ cy * 19349663;

export class SpatialGrid<T extends Body> {
  private cells = new Map<number, number[]>();
  private items: T[] = [];
  private seen: Uint32Array = new Uint32Array(0);
  private stamp = 0;

  /** Ricostruisce la griglia: ogni corpo finisce in tutte le celle toccate dal suo cerchio. */
  build(items: T[]): void {
    this.items = items;
    this.cells.clear();
    if (this.seen.length < items.length) this.seen = new Uint32Array(items.length * 2);
    else this.seen.fill(0, 0, items.length);
    this.stamp = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const x0 = Math.floor((it.pos.x - it.radius) / CELL), x1 = Math.floor((it.pos.x + it.radius) / CELL);
      const y0 = Math.floor((it.pos.y - it.radius) / CELL), y1 = Math.floor((it.pos.y + it.radius) / CELL);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
        const k = key(cx, cy);
        const cell = this.cells.get(k);
        if (cell) cell.push(i); else this.cells.set(k, [i]);
      }
    }
  }

  /**
   * Corpi che potrebbero toccare il cerchio (pos, radius), senza doppioni e nello stesso ordine
   * dell'array originale (cosi' il risultato e' identico al controllo "tutti contro tutti").
   */
  query(pos: Vector2, radius: number, out: T[] = []): T[] {
    out.length = 0;
    if (++this.stamp === 0xffffffff) { this.seen.fill(0); this.stamp = 1; }
    const idx: number[] = [];
    const x0 = Math.floor((pos.x - radius) / CELL), x1 = Math.floor((pos.x + radius) / CELL);
    const y0 = Math.floor((pos.y - radius) / CELL), y1 = Math.floor((pos.y + radius) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const cell = this.cells.get(key(cx, cy));
      if (!cell) continue;
      for (const i of cell) if (this.seen[i] !== this.stamp) { this.seen[i] = this.stamp; idx.push(i); }
    }
    idx.sort((a, b) => a - b);
    for (const i of idx) out.push(this.items[i]);
    return out;
  }
}
