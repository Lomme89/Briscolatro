import { describe, expect, it } from 'vitest';
import { CAMPAIGN_FINAL_ANTE, getEndlessTier, isEndlessAnte } from '../endless';
import { ENCOUNTERS_PER_ANTE } from '../gameState';
import { seedRunRng } from '../runRng';
import { BALANCED } from './buyers';
import { HYBRID } from './policies';
import { RunResult, simulateRun } from './runSim';

/**
 * Endless, measured rather than asserted.
 *
 * The point of these runs is NOT to prove Endless is balanced - it is meant to
 * kill you - but that it is a real continuation of the same game: two encounters
 * an Ante, twenty tricks each, a hundred and twenty points on the table, and a
 * campaign victory that survives whatever happens afterwards.
 *
 * The campaign win rate is measured separately and must not move: an Endless run
 * is never counted in it.
 */
const SMOKE_RUNS = 100;

const buyer = BALANCED;
const play = HYBRID;

function runBatch(count: number, endless: boolean, seedBase = 9000): RunResult[] {
  const results: RunResult[] = [];
  for (let index = 0; index < count; index++) {
    seedRunRng(seedBase + index);
    results.push(
      simulateRun(play, buyer, { seed: seedBase + index, endless, endlessAnteLimit: 45 })
    );
  }
  return results;
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

describe('smoke Endless', () => {
  const endlessRuns = runBatch(SMOKE_RUNS, true);
  const cleared = endlessRuns.filter((run) => run.completed);

  it('gira 100 run senza rompersi e senza girare a vuoto', () => {
    expect(endlessRuns).toHaveLength(SMOKE_RUNS);
    for (const run of endlessRuns) {
      expect(Number.isFinite(run.reachedAnte)).toBe(true);
      expect(run.reachedAnte).toBeGreaterThanOrEqual(1);
      // Il limite del sim esiste apposta: nessuna run puo' non terminare.
      expect(run.reachedAnte).toBeLessThanOrEqual(45);
      expect(run.endless).toBe(true);
    }
  });

  it('chi supera Ante 8 continua davvero oltre', () => {
    expect(cleared.length).toBeGreaterThan(0);
    const past = cleared.filter((run) => run.reachedAnte > CAMPAIGN_FINAL_ANTE);
    expect(past.length).toBeGreaterThan(0);
    for (const run of past) {
      expect(isEndlessAnte(run.reachedAnte)).toBe(true);
      expect(run.endlessAnte).toBe(run.reachedAnte);
      expect(run.endlessTierId).toBe(getEndlessTier(run.reachedAnte)!.id);
    }
  });

  it('la vittoria di campagna sopravvive alla morte in Endless', () => {
    const diedInEndless = endlessRuns.filter(
      (run) => run.reachedAnte > CAMPAIGN_FINAL_ANTE && run.lossCause !== 'none'
    );
    expect(diedInEndless.length).toBeGreaterThan(0);
    for (const run of diedInEndless) {
      // Morire ad Ante 20 non cancella l'Ante 8 gia' vinto.
      expect(run.completed).toBe(true);
      expect(run.endlessAnte).toBeGreaterThan(CAMPAIGN_FINAL_ANTE);
    }
  });

  it('ogni incontro giocato resta una partita intera di Briscola', () => {
    for (const run of endlessRuns) {
      for (const round of run.rounds) {
        // 40 carte, 20 prese, 120 punti Briscola sul tavolo. Sempre.
        expect(round.briscolaPoints + round.opponentBriscolaPoints).toBe(120);
      }
      expect(run.totalTricks).toBe(run.rounds.length * 20);
    }
  });

  it('mantiene due incontri per Ante fino in fondo', () => {
    for (const run of endlessRuns) {
      const perAnte = new Map<number, number>();
      for (const round of run.rounds) {
        perAnte.set(round.ante, (perAnte.get(round.ante) ?? 0) + 1);
      }
      for (const [ante, encounters] of perAnte) {
        // L'ultimo Ante puo' essere interrotto a meta' da una sconfitta.
        const complete = ante < run.reachedAnte;
        expect(encounters).toBeLessThanOrEqual(ENCOUNTERS_PER_ANTE);
        if (complete) expect(encounters).toBe(ENCOUNTERS_PER_ANTE);
      }
    }
  });

  it('produce le metriche Endless che servono a leggerlo', () => {
    const antes = cleared.map((run) => run.reachedAnte);
    const survivalPast8 = antes.filter((ante) => ante > CAMPAIGN_FINAL_ANTE).length / (cleared.length || 1);
    const money = endlessRuns.map((run) => run.finalMoney);
    const build = endlessRuns.map((run) => run.finalJokers);
    const scoreScaling = endlessRuns
      .flatMap((run) => run.rounds)
      .filter((round) => isEndlessAnte(round.ante))
      .map((round) => round.score);

    expect(survivalPast8).toBeGreaterThanOrEqual(0);
    expect(percentile(antes, 0.5)).toBeGreaterThanOrEqual(CAMPAIGN_FINAL_ANTE);
    expect(percentile(money, 0.5)).toBeGreaterThanOrEqual(0);
    expect(percentile(build, 0.5)).toBeGreaterThanOrEqual(0);
    for (const score of scoreScaling) expect(Number.isFinite(score)).toBe(true);
    // Le morti Endless sono attribuibili al Boss che le ha causate.
    for (const run of endlessRuns) expect(Array.isArray(run.endlessDeathModifiers)).toBe(true);
  });
});

describe('il win rate di campagna non conosce Endless', () => {
  it('una batteria di campagna si ferma ad Ante 8', () => {
    const campaign = runBatch(40, false, 3000);
    for (const run of campaign) {
      expect(run.endless).toBe(false);
      expect(run.reachedAnte).toBeLessThanOrEqual(CAMPAIGN_FINAL_ANTE);
      expect(run.endlessAnte).toBe(0);
      expect(run.endlessTierId).toBeNull();
    }
  });

  it('lo stesso seed dà lo stesso risultato di campagna con e senza Endless', () => {
    // Endless cambia solo cosa succede DOPO l'Ante 8: i primi otto Ante sono
    // la stessa run, altrimenti la modalita' starebbe ribilanciando la campagna.
    for (const seed of [3100, 3101, 3102, 3103, 3104]) {
      seedRunRng(seed);
      const campaign = simulateRun(play, buyer, { seed, endless: false });
      seedRunRng(seed);
      const endless = simulateRun(play, buyer, { seed, endless: true, endlessAnteLimit: 45 });

      expect(endless.completed).toBe(campaign.completed);
      const upToAnte8 = (run: RunResult) =>
        run.rounds
          .filter((round) => round.ante <= CAMPAIGN_FINAL_ANTE)
          .map((round) => `${round.ante}.${round.round}:${round.score}:${round.won}`);
      expect(upToAnte8(endless)).toEqual(upToAnte8(campaign));
    }
  });
});
