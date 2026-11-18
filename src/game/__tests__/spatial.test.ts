import { describe, it, expect } from 'vitest';
import { SpatialGrid } from '../spatial';

interface B { id: number; pos: { x: number; y: number }; radius: number; }

describe('SpatialGrid', () => {
  it('trova gli stessi corpi del controllo "tutti contro tutti", nello stesso ordine', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const bodies: B[] = Array.from({ length: 300 }, (_, i) => ({ id: i, pos: { x: (rnd() - 0.5) * 3000, y: (rnd() - 0.5) * 3000 }, radius: i % 50 === 0 ? 150 : 10 + rnd() * 30 }));
    const grid = new SpatialGrid<B>();
    grid.build(bodies);
    for (let q = 0; q < 500; q++) {
      const pos = { x: (rnd() - 0.5) * 3000, y: (rnd() - 0.5) * 3000 }; const r = 3 + rnd() * 60;
      const touching = (b: B) => Math.hypot(b.pos.x - pos.x, b.pos.y - pos.y) < b.radius + r;
      const brute = bodies.filter(touching).map(b => b.id);
      const fromGrid = grid.query(pos, r).filter(touching).map(b => b.id);
      expect(fromGrid).toEqual(brute);
    }
  });

  it('non restituisce doppioni per i corpi grandi che occupano piu\' celle', () => {
    const grid = new SpatialGrid<B>();
    grid.build([{ id: 0, pos: { x: 0, y: 0 }, radius: 500 }]);
    expect(grid.query({ x: 0, y: 0 }, 400)).toHaveLength(1);
  });
});
