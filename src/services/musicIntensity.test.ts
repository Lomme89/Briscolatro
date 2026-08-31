import { describe, expect, it } from 'vitest';
import { musicIntensityFor } from './soundEngine';

/**
 * The level is what the room sounds like, so the rule is worth pinning: it is
 * the one place a Boss encounter could quietly end up sounding like Ante 1.
 */

const at = (over: Partial<Parameters<typeof musicIntensityFor>[0]> = {}) =>
  musicIntensityFor({ hasBoss: false, winStreak: 0, ante: 1, ...over });

describe('livello della musica', () => {
  it('parte in sordina nei primi Ante', () => {
    expect(at()).toBe(0);
    expect(at({ ante: 3 })).toBe(0);
  });

  it('gli Ante profondi non sono mai silenziosi', () => {
    expect(at({ ante: 4 })).toBe(1);
    expect(at({ ante: 1, isEndless: true })).toBe(1);
  });

  it('sale con la striscia di prese vinte', () => {
    expect(at({ winStreak: 2 })).toBe(0);
    expect(at({ winStreak: 3 })).toBe(2);
  });

  it('il Boss prende il tavolo, qualunque cosa stesse succedendo', () => {
    expect(at({ hasBoss: true })).toBe(3);
    expect(at({ hasBoss: true, winStreak: 9, ante: 8 })).toBe(3);
  });
});
