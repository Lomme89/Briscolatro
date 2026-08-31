import { describe, it, expect } from 'vitest';
import { getOpponentIntro, getRegularForAnte } from './opponents';
import { ALL_BOSS_BLINDS } from './bosses';
import { endlessBossForAnte } from '../game/endlessBosses';
import { ENDLESS_BANTER, ENDLESS_TITLES } from './endlessBanter';
import { ENDLESS_TIERS, getEndlessTier } from '../game/endless';

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
  it('nella campagna nessuno dice niente di strano', () => {
    for (let ante = 1; ante <= 8; ante++) {
      const intro = getOpponentIntro(ante, 1);
      const strange = Object.values(ENDLESS_BANTER).flat();
      expect(intro.banter.some((line) => strange.includes(line))).toBe(false);
      expect(intro.quote).toBe(getRegularForAnte(ante).intro);
    }
  });

  it('la deriva cresce di una battuta per tier', () => {
    // One strange line at the first Endless tier, five at the last, always
    // alongside the character's own: whoever is sitting there stays
    // recognisable most of the way down.
    const counts = [9, 17, 25, 33, 41].map((ante) => {
      const intro = getOpponentIntro(ante, 1);
      const tier = getEndlessTier(ante)!;
      return intro.banter.filter((line) => ENDLESS_BANTER[tier.id].includes(line)).length;
    });
    expect(counts).toEqual([1, 2, 3, 4, 5]);

    for (const ante of [9, 41]) {
      const own = getRegularForAnte(ante).banter;
      expect(getOpponentIntro(ante, 1).banter).toEqual(expect.arrayContaining(own));
    }
  });

  it('la battuta di apertura passa al tier solo da ULTRA-ISTINTO in su', () => {
    expect(getOpponentIntro(9, 1).quote).toBe(getRegularForAnte(9).intro);
    expect(getOpponentIntro(17, 1).quote).toBe(getRegularForAnte(17).intro);

    for (const ante of [25, 33, 41]) {
      const tier = getEndlessTier(ante)!;
      expect(ENDLESS_BANTER[tier.id]).toContain(getOpponentIntro(ante, 1).quote);
    }
  });

  it('ogni tier Endless ha le sue battute', () => {
    for (const tier of ENDLESS_TIERS) {
      expect(ENDLESS_BANTER[tier.id].length).toBeGreaterThanOrEqual(5);
    }
  });
  it('ogni personaggio ha un titolo per ogni tier', () => {
    const everyone = [
      ...new Set([1, 2, 3, 4, 5, 6, 7, 8].map((ante) => getRegularForAnte(ante).characterId)),
      ...ALL_BOSS_BLINDS.map((boss) => boss.id),
    ];
    for (const tier of ENDLESS_TIERS) {
      for (const who of everyone) {
        expect(ENDLESS_TITLES[tier.id][who], `${tier.id}/${who}`).toBeTruthy();
      }
    }
  });

  it('il titolo cambia a ogni tier, e mai due volte uguale', () => {
    // Gennaro is the arc the whole idea is named after: habitue, then the
    // twelve-step joke, then something that is not a person any more.
    const titles = [9, 17, 25, 33, 41].map((ante) => getOpponentIntro(ante, 1).title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles[0]).toContain('Habitué');
    expect(titles[3]).toContain('Supernova');
  });

  it('nella campagna il titolo resta quello stampato', () => {
    for (let ante = 1; ante <= 8; ante++) {
      expect(getOpponentIntro(ante, 1).title).toContain(getRegularForAnte(ante).epithet);
      expect(getOpponentIntro(ante, 2).title).toBe(getOpponentIntro(ante, 2).boss!.characterTitle);
    }
  });
});
