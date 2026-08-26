import { describe, expect, it } from 'vitest';
import { Joker } from '../../types/game';
import { seedRandom, simulateRound, jokersByIds, stats, upgradedRunDeck } from './sim';
import { getBlindTargetScore } from '../gameState';

/** Current live curve, for comparison. */
const currentTarget = (ante: number, round: number) => {
  let t = 300 * Math.pow(1.8, ante - 1);
  if (round === 2) t *= 1.4;
  if (round === 3) t *= 1.8;
  return Math.round(t);
};

describe('balance', () => {
it('ante 1 is beatable without any joker, later antes are not', () => {
  const restore = seedRandom(12345);
  const scenarios: [string, string[]][] = [
    ['naked', []],
    ['2 common', ['j_carrettiere', 'j_briscola_folle']],
    ['3 mixed', ['j_carrettiere', 'j_briscola_folle', 'j_strega_vesuvio']],
    ['5 strong', ['j_carrettiere', 'j_spadaccino', 'j_strega_vesuvio', 'j_cacciatore_carichi', 'j_duellante']],
  ];
  const measured: Record<string, ReturnType<typeof stats>> = {};
  for (const [label, ids] of scenarios) {
    const runs = Array.from({ length: 200 }, () => simulateRound(jokersByIds(ids)));
    measured[label] = stats(runs);
    console.log('ROUND', label.padEnd(10), JSON.stringify(measured[label]));
  }
  restore();

  // Ante 1 (300) must be winnable with an empty board - it is the only one that is.
  expect(measured['naked'].median).toBeGreaterThan(getBlindTargetScore(1, 1));
  // ...and ante 2 must not be: a lucky deal can still steal it, the median cannot.
  expect(measured['naked'].median).toBeLessThan(getBlindTargetScore(2, 1));
  // Jokers must matter without being the entire game: a couple of commons is a
  // large step up, not a different order of magnitude.
  const step = measured['2 common'].median / measured['naked'].median;
  expect(step).toBeGreaterThan(2);
  expect(step).toBeLessThan(8);
});

it('the curve tracks what a real build can actually score', () => {
  const restore = seedRandom(999);
  const TRIALS = 30;

  const builds: [string, string[], number][] = [
    ['reference', ['j_carrettiere', 'j_strega_vesuvio', 'j_briscola_folle', 'j_barone_briscola', 'j_cacciatore_carichi'], 1],
    ['no growth joker', ['j_cantina', 'j_orafo', 'j_re_mida', 'j_cavaliere_nero', 'j_accusa_reale'], 1],
    ['3 jokers only', ['j_carrettiere', 'j_strega_vesuvio', 'j_briscola_folle'], 1],
    ['xmult rares', ['j_duellante', 'j_cacciatore_carichi', 'j_superstizione', 'j_napola_cosmica', 'j_scopa_galattica'], 1],
    ['legendary carry', ['j_carrettiere', 'j_sovrano_briscolatro', 'j_cantina', 'j_orafo', 'j_re_mida'], 1],
    ['deck build (2 jokers)', ['j_carrettiere', 'j_strega_vesuvio'], 3],
  ];

  const passRates: Record<string, Record<string, number>> = {};

  for (const [label, schedule, upgradesPerAnte] of builds) {
    const rows: Record<string, { pass: number; target: number }> = {};
    for (let trial = 0; trial < TRIALS; trial++) {
      let jokers: Joker[] = [];
      let deckUpgrades = 0;
      for (let ante = 1; ante <= 8; ante++) {
        if (ante - 1 < schedule.length) jokers = [...jokers, ...jokersByIds([schedule[ante - 1]])];
        deckUpgrades += upgradesPerAnte;
        for (let round = 1; round <= 3; round++) {
          const target = getBlindTargetScore(ante, round);
          const sim = simulateRound(jokers, null, (next) => { jokers = next; }, upgradedRunDeck(deckUpgrades));
          const key = `A${ante}R${round}`;
          rows[key] = rows[key] || { pass: 0, target };
          rows[key].pass += sim.score >= target ? 1 : 0;
        }
      }
    }
    passRates[label] = Object.fromEntries(
      Object.entries(rows).map(([k, r]) => [k, r.pass / TRIALS])
    );
    console.log(
      'BUILD',
      label.padEnd(22),
      Object.entries(passRates[label])
        .filter(([k]) => k.endsWith('R1') || k.endsWith('R3'))
        .map(([k, v]) => `${k}:${Math.round(v * 100)}%`)
        .join(' ')
    );
  }
  restore();

  const reference = passRates['reference'];
  // The early antes are the tutorial: a sensible build should not be gated there.
  expect(reference['A1R1']).toBeGreaterThan(0.9);
  expect(reference['A3R3']).toBeGreaterThan(0.85);
  // The end of the run has to stay a real fight, but a winning build must exist.
  expect(reference['A8R3']).toBeGreaterThan(0.4);
  expect(reference['A8R3']).toBeLessThan(0.95);
  // A build with no engine at all must not coast to ante 8.
  expect(passRates['no growth joker']['A6R1']).toBeLessThan(0.2);
});
});
