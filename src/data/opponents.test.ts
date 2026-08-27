import { describe, it, expect } from 'vitest';
import { getOpponentIntro, getRegularForAnte } from './opponents';
import { ALL_BOSS_BLINDS } from './bosses';

describe('opponents', () => {
  it('gives every ante its own regular, and only Gennaro shows up twice', () => {
    const names = [1, 2, 3, 4, 5, 6, 7, 8].map((ante) => getRegularForAnte(ante).name);
    expect(new Set(names).size).toBe(7);
    expect(names[0]).toBe('Gennaro');
    expect(names[7]).toBe('Gennaro');
  });

  it('keeps the boss on round 3 and the regular on the other two', () => {
    for (let ante = 1; ante <= 8; ante++) {
      const boss = getOpponentIntro(ante, 3);
      expect(boss.isBoss).toBe(true);
      expect(boss.name).toBe(ALL_BOSS_BLINDS.find((b) => b.ante === ante)!.name);

      for (const round of [1, 2]) {
        const regular = getOpponentIntro(ante, round);
        expect(regular.isBoss).toBe(false);
        expect(regular.name).toBe(getRegularForAnte(ante).name);
        expect(regular.banter.length).toBeGreaterThan(0);
      }
    }
  });

  it('does not repeat the same line across the two blinds of an ante', () => {
    for (let ante = 1; ante <= 8; ante++) {
      expect(getOpponentIntro(ante, 1).quote).not.toBe(getOpponentIntro(ante, 2).quote);
    }
  });
});
