import { describe, expect, it } from 'vitest';
import { seedRandom } from './sim';
import { pad } from './policyLab';
import { HYBRID } from './policies';
import { ALL_BUYERS } from './buyers';
import { RunResult, simulateRun } from './runSim';
import { BuyerPolicy } from './runSim';

/**
 * Simulazione del macroloop, non della singola mano.
 *
 * The other suite is the regression test for scoring: fast, one round at a
 * time, run on every commit. This one plays whole runs - eight antes, a shop
 * between every blind, real prices, real slot limits - and it is slow because
 * of it.
 *
 * Nothing here has a shopping schedule. Every jolly, pack and voucher a run
 * ends up with is something the shop actually offered and the policy could
 * actually afford, which is the only way a survival number means anything.
 *
 *   bunx vitest run src/game/__sim__/runEconomy.test.ts --reporter=verbose
 */

const RUNS = 120;

function runsFor(buyer: BuyerPolicy, seed: number): RunResult[] {
  const restore = seedRandom(seed);
  const results: RunResult[] = [];
  for (let i = 0; i < RUNS; i++) results.push(simulateRun(HYBRID, buyer));
  restore();
  return results;
}

/** Quartiles, which say more about a run than an average ever does. */
function quantiles(values: number[]): { p25: number; median: number; p75: number } {
  if (values.length === 0) return { p25: 0, median: 0, p75: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  return { p25: at(0.25), median: at(0.5), p75: at(0.75) };
}

const short = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`;

describe('il macroloop, run intere', () => {
  const byPolicy = new Map<string, RunResult[]>();
  for (const buyer of ALL_BUYERS) byPolicy.set(buyer.id, runsFor(buyer, 20260827));

  it('quante run sopravvivono, Ante per Ante', () => {
    console.log(`\n=== SURVIVAL RATE (${RUNS} run per policy, mazzo Napoletano, Briscolatro) ===`);
    console.log(pad('POLICY', 17) + [1, 2, 3, 4, 5, 6, 7, 8].map((a) => pad(`A${a}`, 7)).join('') + 'BOSS 8');

    for (const buyer of ALL_BUYERS) {
      const results = byPolicy.get(buyer.id)!;
      const cells = [1, 2, 3, 4, 5, 6, 7, 8].map((ante) => {
        const alive = results.filter((r) => r.reachedAnte >= ante).length;
        return pad(Math.round((alive / results.length) * 100) + '%', 7);
      });
      const completed = results.filter((r) => r.completed).length;
      console.log(
        pad(buyer.name, 17) + cells.join('') + Math.round((completed / results.length) * 100) + '%'
      );
    }
  });

  it('quanto segnano e quanto tengono in tasca', () => {
    console.log('\n=== PUNTEGGIO E DENARO PER ANTE (mediana, p25-p75) ===');
    for (const buyer of ALL_BUYERS) {
      const results = byPolicy.get(buyer.id)!;
      console.log(`\n  ${buyer.name} - ${buyer.blurb}`);
      console.log(
        '  ' + pad('ANTE', 6) + pad('SCORE (p25/med/p75)', 24) + pad('SOLDI', 18) + pad('BLIND', 8) + 'PASSATI'
      );

      for (const ante of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const blinds = results.flatMap((r) => r.rounds.filter((b) => b.ante === ante));
        if (blinds.length === 0) continue;
        const score = quantiles(blinds.map((b) => b.score));
        const money = quantiles(blinds.map((b) => b.moneyAfter));
        const passed = blinds.filter((b) => b.won).length;
        console.log(
          '  ' +
            pad(ante, 6) +
            pad(`${short(score.p25)} / ${short(score.median)} / ${short(score.p75)}`, 24) +
            pad(`$${money.p25} / $${money.median} / $${money.p75}`, 18) +
            pad(blinds.length, 8) +
            Math.round((passed / blinds.length) * 100) + '%'
        );
      }
    }
  });

  it('cosa possiede una run, e quanto rerolla', () => {
    console.log('\n=== BUILD MEDIA AL MOMENTO DELLA FINE ===');
    console.log(
      pad('POLICY', 17) + pad('JOLLY', 9) + pad('UPGRADE', 10) + pad('REROLL', 9) + pad('SOLDI', 9) + 'ANTE MEDIO'
    );

    for (const buyer of ALL_BUYERS) {
      const results = byPolicy.get(buyer.id)!;
      const avg = (pick: (r: RunResult) => number) =>
        results.reduce((a, r) => a + pick(r), 0) / results.length;
      console.log(
        pad(buyer.name, 17) +
          pad(avg((r) => r.finalJokers).toFixed(1), 9) +
          pad(avg((r) => r.finalUpgrades).toFixed(1), 10) +
          pad(avg((r) => r.totalRerolls).toFixed(1), 9) +
          pad('$' + Math.round(avg((r) => r.finalMoney)), 9) +
          avg((r) => r.reachedAnte).toFixed(1)
      );
    }
  });

  it('la build cresce davvero durante la run', () => {
    console.log('\n=== JOLLY POSSEDUTI E UPGRADE, ANTE PER ANTE (mediana) ===');
    console.log(pad('POLICY', 17) + [1, 2, 3, 4, 5, 6, 7, 8].map((a) => pad(`A${a}`, 9)).join(''));

    for (const buyer of ALL_BUYERS) {
      const results = byPolicy.get(buyer.id)!;
      const cells = [1, 2, 3, 4, 5, 6, 7, 8].map((ante) => {
        const blinds = results.flatMap((r) => r.rounds.filter((b) => b.ante === ante));
        if (blinds.length === 0) return pad('-', 9);
        const jokers = quantiles(blinds.map((b) => b.jokers)).median;
        const upgrades = quantiles(blinds.map((b) => b.upgrades)).median;
        return pad(`${jokers}j ${upgrades}u`, 9);
      });
      console.log(pad(buyer.name, 17) + cells.join(''));
    }
  });

  it('le run sono deterministiche a parita di seed', () => {
    // The whole harness is worthless if it cannot be re-run.
    const a = runsFor(ALL_BUYERS[3], 4242);
    const b = runsFor(ALL_BUYERS[3], 4242);
    expect(a.map((r) => r.reachedAnte)).toEqual(b.map((r) => r.reachedAnte));
    expect(a.map((r) => r.finalMoney)).toEqual(b.map((r) => r.finalMoney));
  });

  it('nessuna run compra cio che non poteva permettersi', () => {
    for (const buyer of ALL_BUYERS) {
      for (const result of byPolicy.get(buyer.id)!) {
        expect({ policy: buyer.id, negative: result.finalMoney < 0 }).toEqual({
          policy: buyer.id,
          negative: false,
        });
        for (const blind of result.rounds) {
          expect(blind.moneyAfter).toBeGreaterThanOrEqual(0);
          // Six is the cap with the Tavolo Allargato; nothing may exceed it.
          expect(blind.jokers).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it('una run che perde si ferma li', () => {
    for (const buyer of ALL_BUYERS) {
      for (const result of byPolicy.get(buyer.id)!) {
        const lost = result.rounds.findIndex((b) => !b.won);
        if (lost === -1) {
          // Eight antes, two encounters each: sixteen full games of Briscola.
          expect(result.rounds).toHaveLength(16);
          expect(result.completed).toBe(true);
        } else {
          expect(lost).toBe(result.rounds.length - 1);
          expect(result.completed).toBe(false);
        }
      }
    }
  });
});
