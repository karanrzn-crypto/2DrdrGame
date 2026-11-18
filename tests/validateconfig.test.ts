/**
 * validateconfig.test.ts — pure validation of the tuning constants.
 * The first test imports the REAL GAME object (GameValues.ts is Phaser-free)
 * so the shipped constants can never drift out of validity.
 */
import { describe, it, expect } from 'vitest';
import { validateGameConfig, assertValidGameConfig, ConfigValues } from '../src/config/validateConfig';
import { GAME } from '../src/config/GameValues';

const base: ConfigValues = { ...GAME };

function withOverride(patch: Partial<ConfigValues>): ConfigValues {
  return { ...base, ...patch };
}

describe('validateGameConfig — the shipped constants are valid', () => {
  it('the real GAME object passes with zero issues', () => {
    expect(validateGameConfig(GAME)).toEqual([]);
    expect(() => assertValidGameConfig(GAME)).not.toThrow();
  });
});

describe('validateGameConfig — canvas geometry', () => {
  it('width/height/tileSize must be positive integers', () => {
    for (const field of ['width', 'height', 'tileSize'] as const) {
      expect(validateGameConfig(withOverride({ [field]: 0 })).map((i) => i.field)).toContain(field);
      expect(validateGameConfig(withOverride({ [field]: -3 })).map((i) => i.field)).toContain(field);
      expect(validateGameConfig(withOverride({ [field]: 10.5 })).map((i) => i.field)).toContain(field);
      expect(validateGameConfig(withOverride({ [field]: NaN })).map((i) => i.field)).toContain(field);
    }
  });
});

describe('validateGameConfig — movement & clock rules', () => {
  it('camZoom must be >= 1 (pixel-art zoom)', () => {
    expect(validateGameConfig(withOverride({ camZoom: 0.5 })).map((i) => i.field)).toContain('camZoom');
    expect(validateGameConfig(withOverride({ camZoom: 1 })).map((i) => i.field)).not.toContain('camZoom');
  });

  it('walkSpeed must be positive', () => {
    expect(validateGameConfig(withOverride({ walkSpeed: 0 })).map((i) => i.field)).toContain('walkSpeed');
  });

  it('runSpeed must be >= walkSpeed — Shift may never be slower than walking', () => {
    expect(validateGameConfig(withOverride({ runSpeed: 50, walkSpeed: 68 })).map((i) => i.field))
      .toContain('runSpeed');
    expect(validateGameConfig(withOverride({ runSpeed: 68, walkSpeed: 68 }))).toEqual([]);
  });

  it('acceleration must be positive; drag may be 0 but never negative', () => {
    expect(validateGameConfig(withOverride({ acceleration: 0 })).map((i) => i.field)).toContain('acceleration');
    expect(validateGameConfig(withOverride({ drag: -1 })).map((i) => i.field)).toContain('drag');
    expect(validateGameConfig(withOverride({ drag: 0 }))).toEqual([]);
  });

  it('minutesPerRealSecond must be positive (a 0 clock freezes the world silently)', () => {
    expect(validateGameConfig(withOverride({ minutesPerRealSecond: 0 })).map((i) => i.field))
      .toContain('minutesPerRealSecond');
  });
});

describe('validateGameConfig — clear color', () => {
  it('backgroundColor must be a strict #rrggbb hex (VisibleCheck parses this exact form)', () => {
    for (const bad of ['red', '#12345', '#1234567', '14100b', '', '#14 00b']) {
      expect(validateGameConfig(withOverride({ backgroundColor: bad })).map((i) => i.field))
        .toContain('backgroundColor');
    }
    expect(validateGameConfig(withOverride({ backgroundColor: '#ABCDEF' }))).toEqual([]);
  });
});

describe('validateGameConfig — accumulation & assert', () => {
  it('reports every violated rule at once', () => {
    const issues = validateGameConfig(withOverride({
      width: 0,
      runSpeed: 10,
      walkSpeed: 20,
      backgroundColor: 'nope',
    }));
    expect(issues.map((i) => i.field).sort()).toEqual(['backgroundColor', 'runSpeed', 'width']);
  });

  it('assertValidGameConfig throws with all field names in the message', () => {
    expect(() => assertValidGameConfig(withOverride({ width: 0, height: -1 })))
      .toThrow(/width[\s\S]*height/);
  });
});
