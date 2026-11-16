import { describe, it, expect } from 'vitest';
import { buildMap, isWalkable, MAP_W, MAP_H } from '../src/world/MapData';
import { TILE, COLLIDER_TILES, MAX_TILE_INDEX } from '../src/assets/TileIds';

describe('MapData — authored Phase-1 world', () => {
  const map = buildMap();

  it('has consistent dimensions', () => {
    expect(map.w).toBe(MAP_W);
    expect(map.h).toBe(MAP_H);
    expect(map.ground.length).toBe(MAP_H);
    expect(map.obstacles.length).toBe(MAP_H);
    for (let y = 0; y < MAP_H; y++) {
      expect(map.ground[y].length).toBe(MAP_W);
      expect(map.obstacles[y].length).toBe(MAP_W);
    }
  });

  it('uses only valid tile indices', () => {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        expect(map.ground[y][x]).toBeGreaterThanOrEqual(0);
        expect(map.ground[y][x]).toBeLessThanOrEqual(MAX_TILE_INDEX);
        const o = map.obstacles[y][x];
        expect(o === -1 || (o >= 0 && o <= MAX_TILE_INDEX)).toBe(true);
      }
    }
  });

  it('blocks movement exactly on collider tiles', () => {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const o = map.obstacles[y][x];
        if (COLLIDER_TILES.includes(o)) {
          expect(isWalkable(map, x, y)).toBe(false);
        } else {
          expect(isWalkable(map, x, y)).toBe(true);
        }
      }
    }
  });

  it('seals the world with a solid rock border', () => {
    for (let x = 0; x < MAP_W; x++) {
      expect(isWalkable(map, x, 0)).toBe(false);
      expect(isWalkable(map, x, MAP_H - 1)).toBe(false);
    }
    for (let y = 0; y < MAP_H; y++) {
      expect(isWalkable(map, 0, y)).toBe(false);
      expect(isWalkable(map, MAP_W - 1, y)).toBe(false);
    }
  });

  it('spawns the player on walkable ground', () => {
    expect(isWalkable(map, map.spawn.tx, map.spawn.ty)).toBe(true);
  });

  it('spawns NPCs on walkable ground', () => {
    for (const npc of map.npcs) {
      expect(isWalkable(map, npc.tx, npc.ty)).toBe(true);
    }
  });

  it('keeps the corral gate open for entry', () => {
    // gate gap at x=52,53 on the corral's north edge (y=27)
    expect(isWalkable(map, 52, 27)).toBe(true);
    expect(isWalkable(map, 53, 27)).toBe(true);
  });

  it('builds a fence ring around the corral otherwise', () => {
    expect(map.obstacles[27][49]).toBe(TILE.FENCE_POST);
    expect(map.obstacles[27][51]).toBe(TILE.FENCE_H);
    expect(map.obstacles[32][49]).toBe(TILE.FENCE_POST);
  });

  it('contains water (pond) that blocks movement', () => {
    expect(map.obstacles[8][57]).toBeGreaterThanOrEqual(TILE.WATER0);
    expect(isWalkable(map, 57, 8)).toBe(false);
  });

  it('contains the town props with signs', () => {
    const types = map.props.map((p) => p.type);
    expect(types).toContain('saloon');
    expect(types).toContain('store');
    expect(types).toContain('sheriff');
    expect(types).toContain('sign');
    const saloon = map.props.find((p) => p.type === 'saloon')!;
    expect(saloon.signText).toBe('سالون');
    expect(saloon.dialogue).toBe('saloonDoor');
  });

  it('never places a prop on top of a tile collider', () => {
    for (const p of map.props) {
      expect(map.obstacles[p.ty][p.tx]).toBe(-1);
    }
  });
});
