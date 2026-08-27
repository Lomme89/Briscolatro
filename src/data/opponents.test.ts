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

  it('il Tavolo e del locale, il Boss e il Boss', () => {
    for (let ante = 1; ante <= 8; ante++) {
      const table = getOpponentIntro(ante, 1);
      expect(table.isBoss).toBe(false);
      expect(table.name).toBe(getRegularForAnte(ante).name);
      expect(table.banter.length).toBeGreaterThan(0);
      expect(table.quote.length).toBeGreaterThan(0);

      const boss = getOpponentIntro(ante, 2);
      expect(boss.isBoss).toBe(true);
      expect(boss.name).toBe(ALL_BOSS_BLINDS.find((b) => b.ante === ante)!.name);
    }
  });

  it('ogni Ante ha esattamente due incontri: Tavolo e Boss', () => {
    for (let ante = 1; ante <= 8; ante++) {
      // Nothing beyond the second encounter exists any more; asking for a
      // third would land on the Boss, which is where the loop already stops.
      expect(getOpponentIntro(ante, 1).isBoss).toBe(false);
      expect(getOpponentIntro(ante, 2).isBoss).toBe(true);
    }
  });
});
