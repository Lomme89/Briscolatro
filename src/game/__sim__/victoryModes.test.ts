import { describe, expect, it } from 'vitest';
import { seedRandom, jokersByIds } from './sim';
import { pad, tallyMode } from './policyLab';
import { CONSERVATIVE, GREEDY, HYBRID } from './policies';
import { getBlindTargetScore } from '../gameState';
import { ALL_VICTORY_MODES } from '../victoryModes';
import { ALL_BOSS_BLINDS } from '../../data/bosses';

/**
 * Prime misure delle quattro modalità.
 *
 * Diagnostic, not a guard: the assertions only catch the harness breaking. The
 * numbers are the output, and the one that matters most is the split at the
 * bottom - how many Sbaraglio blinds are being carried by the sixty-one rather
 * than by the build. The 61 does not scale with the Ante and the target does,
 * so that share is expected to climb, and the question is how fast.
 *
 *   bunx vitest run src/game/__sim__/victoryModes.test.ts --reporter=verbose
 */

const ROUNDS = 150;
const BUILD = ['j_carrettiere', 'j_vesuvio', 'j_briscola_folle', 'j_barone_briscola'];
const BLINDS: Array<[number, number]> = [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]];

describe('le quattro modalita, misurate', () => {
  it('pass rate per modalita e per blind', () => {
    const jokers = jokersByIds(BUILD);

    console.log('\n=== PASS RATE PER MODALITA (policy Hybrid, ' + ROUNDS + ' mani per blind) ===');
    console.log(pad('MODALITA', 18) + BLINDS.map(([a, r]) => pad(`A${a}R${r}`, 9)).join('') + 'SCORE MEDIO');

    for (const mode of ALL_VICTORY_MODES) {
      const cells: string[] = [];
      let lastScore = 0;
      for (const [ante, round] of BLINDS) {
        const restore = seedRandom(6060);
        const tally = tallyMode(HYBRID, mode.id, jokers, getBlindTargetScore(ante, round), ROUNDS);
        restore();
        cells.push(pad(Math.round((tally.wins / tally.rounds) * 100) + '%', 9));
        lastScore = tally.avgScore;
      }
      console.log(pad(mode.label, 18) + cells.join('') + Math.round(lastScore));
    }
  });

  it('SBARAGLIO: da dove arrivano le vittorie, Ante per Ante', () => {
    const jokers = jokersByIds(BUILD);

    console.log('\n=== SBARAGLIO: STRADA DELLA VITTORIA ===');
    console.log(
      pad('BLIND', 9) + pad('TARGET', 10) + pad('SOLO CHIPS', 12) + pad('SOLO 61', 10) + pad('ENTRAMBE', 11) + 'SCONFITTE'
    );

    const briscolaOnlyShare: Array<[string, number]> = [];
    for (const [ante, round] of BLINDS) {
      const target = getBlindTargetScore(ante, round);
      const restore = seedRandom(6060);
      const tally = tallyMode(HYBRID, 'sbaraglio', jokers, target, ROUNDS);
      restore();

      const pct = (n: number) => Math.round((n / tally.rounds) * 100) + '%';
      const share = tally.wins === 0 ? 0 : tally.winBriscolaOnly / tally.wins;
      briscolaOnlyShare.push([`A${ante}R${round}`, share]);

      console.log(
        pad(`A${ante}R${round}`, 9) +
          pad(target.toLocaleString('it-IT'), 10) +
          pad(pct(tally.winChipsOnly), 12) +
          pad(pct(tally.winBriscolaOnly), 10) +
          pad(pct(tally.winBoth), 11) +
          pct(tally.losses)
      );
    }

    console.log('\n  QUOTA DI VITTORIE PORTATE DAI SOLI 61 PUNTI (sul totale delle vittorie):');
    for (const [blind, share] of briscolaOnlyShare) {
      const flag = share > 0.7 ? '  <-- il roguelike viene aggirato' : '';
      console.log(`  ${pad(blind, 8)}${Math.round(share * 100)}%${flag}`);
    }
  });

  it('DOPPIA SFIDA: quale meta manca', () => {
    const jokers = jokersByIds(BUILD);

    console.log('\n=== DOPPIA SFIDA: I QUATTRO ANGOLI ===');
    console.log(
      pad('BLIND', 9) + pad('CHIPS✓ 61✗', 12) + pad('CHIPS✗ 61✓', 12) + pad('ENTRAMBE✓', 12) + 'ENTRAMBE✗'
    );

    for (const [ante, round] of BLINDS) {
      const restore = seedRandom(6060);
      const tally = tallyMode(HYBRID, 'double_challenge', jokers, getBlindTargetScore(ante, round), ROUNDS);
      restore();
      const pct = (n: number) => Math.round((n / tally.rounds) * 100) + '%';
      console.log(
        pad(`A${ante}R${round}`, 9) +
          pad(pct(tally.chipsPassBriscolaFail), 12) +
          pad(pct(tally.chipsFailBriscolaPass), 12) +
          pad(pct(tally.bothPass), 12) +
          pct(tally.bothFail)
      );
    }
  });

  it('quanto conta la policy in ogni modalita', () => {
    const jokers = jokersByIds(BUILD);
    const target = getBlindTargetScore(3, 1);

    console.log('\n=== A3R1: PASS RATE PER POLICY E MODALITA (target ' + target.toLocaleString('it-IT') + ') ===');
    console.log(pad('POLICY', 24) + ALL_VICTORY_MODES.map((m) => pad(m.label, 15)).join(''));

    for (const policy of [CONSERVATIVE, GREEDY, HYBRID]) {
      const cells = ALL_VICTORY_MODES.map((mode) => {
        const restore = seedRandom(909);
        const tally = tallyMode(policy, mode.id, jokers, target, ROUNDS);
        restore();
        return pad(Math.round((tally.wins / tally.rounds) * 100) + '%', 15);
      });
      console.log(pad(policy.name, 24) + cells.join(''));
    }

    // Sanity: the harness has to agree with itself.
    const restore = seedRandom(909);
    const tally = tallyMode(HYBRID, 'sbaraglio', jokers, target, ROUNDS);
    restore();
    expect(tally.wins + tally.losses).toBe(tally.rounds);
    expect(tally.winChipsOnly + tally.winBriscolaOnly + tally.winBoth).toBe(tally.wins);
    expect(
      tally.chipsPassBriscolaFail + tally.chipsFailBriscolaPass + tally.bothPass + tally.bothFail
    ).toBe(tally.rounds);
  });

  it('i Boss visti dalle due anime', () => {
    // Some boss rules only touch Chips and some touch the points themselves.
    // In a mode that is won on points, the first kind evaporates and the second
    // moves the goalposts - worth knowing before anyone redesigns either.
    const jokers = jokersByIds(BUILD);
    const target = getBlindTargetScore(2, 3);

    console.log('\n=== I BOSS SOTTO LE QUATTRO REGOLE (A2R3, ' + ROUNDS + ' mani) ===');
    console.log(pad('BOSS', 22) + pad('PUNTI BRISC.', 14) + ALL_VICTORY_MODES.map((m) => pad(m.label, 14)).join(''));

    const bosses = [null, ...ALL_BOSS_BLINDS.filter((b) => b.ante <= 2 || b.ante === 8)];
    for (const boss of bosses) {
      const cells: string[] = [];
      let points = 0;
      for (const mode of ALL_VICTORY_MODES) {
        const restore = seedRandom(4242);
        const tally = tallyMode(HYBRID, mode.id, jokers, target, ROUNDS, boss);
        restore();
        points = tally.avgBriscolaPoints;
        cells.push(pad(Math.round((tally.wins / tally.rounds) * 100) + '%', 14));
      }
      console.log(pad(boss ? boss.name : 'nessuno', 22) + pad(points.toFixed(1) + '/120', 14) + cells.join(''));
    }
  });
});
