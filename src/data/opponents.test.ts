import { describe, it, expect } from 'vitest';
import { getOpponentIntro, getRegularForAnte } from './opponents';
import { ALL_BOSS_BLINDS } from './bosses';
import { endlessBossForAnte } from '../game/endlessBosses';

describe('opponents', () => {
  it('negli Ante Endless mostra il Boss che si affrontera davvero', () => {
    // No catalogue entry carries an Ante above eight, so the lookup by Ante has
    // nothing to find and used to hand back the first Boss in the list: the
    // portrait said Gigi while the rules said whoever had actually been rolled.
    for (const ante of [9, 12, 17]) {
      const rolled = endlessBossForAnte(ante, 12345).boss;
      const intro = getOpponentIntro(ante, 2, rolled);

      expect(intro.isBoss).toBe(true);
      expect(intro.characterId).toBe(rolled.id);
      expect(intro.name).toBe(rolled.name);
      expect(intro.quote).toBe(rolled.bossQuote);
    }
  });

  it('senza un Boss esplicito resta il Boss di quell Ante', () => {
    for (let ante = 1; ante <= 8; ante++) {
      const intro = getOpponentIntro(ante, 2);
      expect(intro.boss!.ante).toBe(ante);
      expect(intro.characterId).toBe(intro.boss!.id);
    }
  });

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
