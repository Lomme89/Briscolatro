import { VictoryMode } from '../victoryModes';
import { correlation, pad } from './policyLab';
import { RunPolicy, RunResult, simulateRun } from './runSim';
import { ALL_DECKS } from '../../data/decks';
import { seedRunRng } from '../runRng';
import { STANDARD_SOLA } from './solaPlay';
import { APPROXIMATIONS } from './encounter';

/**
 * Da run a numeri, e da numeri a tabelle.
 *
 * Everything here only reads: no aggregate in this file may change what a run
 * does. If a policy or a build looks broken in one of these tables, the answer
 * is to report it - not to reach into the data and file the corner off.
 */

export interface PolicySummary {
  policyId: string;
  policyName: string;
  runs: number;
  /** Runs that cleared the Ante 8 Boss. */
  completed: number;
  /** Share of runs still alive at each ante, 2 through 8. */
  reach: Record<number, number>;
  avgScorePerEncounter: number;
  avgBriscolaPoints: number;
  avgMoneyAfterShop: number;
  maxMoney: number;
  avgSpent: number;
  avgJokers: number;
  avgUpgrades: number;
  avgFoil: number;
  solaBought: number;
  solaUsed: number;
  legendaryBought: number;
  legendarySeen: number;
  lossCauses: Record<string, number>;
  avgReachedAnte: number;
  /**
   * Pearson between the wallet at a trick and what that trick paid, over the
   * runs that finished holding il Jolly del Bar Sport.
   *
   * A number near zero on a board that contains the Sport would mean the joker
   * is not actually reading the economy the build is paying for.
   */
  sportCorrelation: number;
  sportRuns: number;
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

export function summarise(policy: RunPolicy, results: RunResult[]): PolicySummary {
  const reach: Record<number, number> = {};
  for (const ante of [2, 3, 4, 5, 6, 7, 8]) {
    reach[ante] = results.filter((r) => r.reachedAnte >= ante).length / Math.max(1, results.length);
  }

  const lossCauses: Record<string, number> = { chips: 0, briscola: 0, both: 0, none: 0 };
  for (const result of results) lossCauses[result.lossCause]++;

  const sportRuns = results.filter((r) => r.finalJokerIds.includes('j_jolly_sport'));
  const sportSamples = sportRuns.flatMap((r) => r.moneyScoreSamples);

  const encounters = results.flatMap((r) => r.rounds);

  return {
    policyId: policy.id,
    policyName: policy.name,
    runs: results.length,
    completed: results.filter((r) => r.completed).length,
    reach,
    avgScorePerEncounter: mean(encounters.map((e) => e.score)),
    avgBriscolaPoints: mean(encounters.map((e) => e.briscolaPoints)),
    avgMoneyAfterShop: mean(results.flatMap((r) => r.moneyAfterShop)),
    maxMoney: Math.max(0, ...results.map((r) => r.maxMoney)),
    avgSpent: mean(results.map((r) => r.totalSpent)),
    avgJokers: mean(results.map((r) => r.finalJokers)),
    avgUpgrades: mean(results.map((r) => r.finalUpgrades)),
    avgFoil: mean(results.map((r) => r.foilCards)),
    solaBought: mean(results.map((r) => r.solaBought)),
    solaUsed: mean(results.map((r) => r.solaUsed)),
    legendaryBought: mean(results.map((r) => r.legendaryBought)),
    legendarySeen: mean(results.map((r) => r.legendarySeen)),
    lossCauses,
    avgReachedAnte: mean(results.map((r) => r.reachedAnte)),
    sportCorrelation: correlation(sportSamples),
    sportRuns: sportRuns.length,
  };
}

export interface BatchOptions {
  runs: number;
  seed: number;
  victoryMode: VictoryMode;
  deckId: string;
  startingJokerIds?: string[];
}

/**
 * Plays `runs` runs of one policy from one seed.
 *
 * The stream is seeded once for the batch and then left alone, so run number
 * seventeen of a batch is reproducible by replaying the batch - which is what
 * makes a whole report re-runnable from the header it prints.
 */
export function runBatch(policy: RunPolicy, options: BatchOptions): RunResult[] {
  const deck = ALL_DECKS.find((d) => d.id === options.deckId) ?? ALL_DECKS[0];
  seedRunRng(options.seed);
  const results: RunResult[] = [];
  for (let i = 0; i < options.runs; i++) {
    results.push(
      simulateRun(policy.play, policy.buyer, {
        deck,
        victoryMode: options.victoryMode,
        sola: policy.sola ?? STANDARD_SOLA,
        startingJokerIds: options.startingJokerIds,
      })
    );
  }
  return results;
}

const pct = (value: number): string => `${Math.round(value * 100)}%`;
const money = (value: number): string => `$${Math.round(value)}`;
const short = (value: number): string =>
  value >= 1000 ? `${Math.round(value / 1000)}k` : `${Math.round(value)}`;

export function header(options: BatchOptions, policies: RunPolicy[]): string[] {
  return [
    '='.repeat(78),
    'BRISCOLATRO - SIMULATORE DI BILANCIAMENTO',
    '='.repeat(78),
    `seed iniziale : ${options.seed}`,
    `run per policy: ${options.runs}`,
    `mazzo         : ${options.deckId}`,
    `VictoryMode   : ${options.victoryMode}`,
    `policy        : ${policies.map((p) => p.id).join(', ')}`,
    '',
    'ATTENZIONE - cosa questo simulatore NON e:',
    ...APPROXIMATIONS.map((line) => `  - ${line}`),
    '',
    'I numeri qui sotto confrontano policy fra loro. Nessuno di essi e un win',
    'rate umano, e nessuno di essi va usato per giustificare un nerf da solo.',
    '',
  ];
}

export function survivalTable(summaries: PolicySummary[]): string[] {
  const lines = [
    '--- SOPRAVVIVENZA (quota di run ancora vive) ---',
    pad('POLICY', 20) + [2, 3, 4, 5, 6, 7, 8].map((a) => pad(`A${a}`, 7)).join('') + pad('ANTE MED', 10) + 'RUN COMPLETE',
  ];
  for (const s of summaries) {
    lines.push(
      pad(s.policyName, 20) +
        [2, 3, 4, 5, 6, 7, 8].map((a) => pad(pct(s.reach[a]), 7)).join('') +
        pad(s.avgReachedAnte.toFixed(2), 10) +
        pct(s.completed / Math.max(1, s.runs))
    );
  }
  return lines;
}

export function economyTable(summaries: PolicySummary[]): string[] {
  const lines = [
    '',
    '--- ECONOMIA E BUILD ---',
    pad('POLICY', 20) +
      pad('$ USCITA SHOP', 15) +
      pad('$ MAX', 8) +
      pad('$ SPESI', 10) +
      pad('JOLLY', 8) +
      pad('UPGRADE', 10) +
      pad('FOIL', 7) +
      'SOLA compr/usate',
  ];
  for (const s of summaries) {
    lines.push(
      pad(s.policyName, 20) +
        pad(money(s.avgMoneyAfterShop), 15) +
        pad(money(s.maxMoney), 8) +
        pad(money(s.avgSpent), 10) +
        pad(s.avgJokers.toFixed(1), 8) +
        pad(s.avgUpgrades.toFixed(1), 10) +
        pad(s.avgFoil.toFixed(1), 7) +
        `${s.solaBought.toFixed(1)} / ${s.solaUsed.toFixed(1)}`
    );
  }
  return lines;
}

export function scoringTable(summaries: PolicySummary[]): string[] {
  const lines = [
    '',
    '--- PUNTEGGIO, PUNTI BRISCOLA E CAUSE DI SCONFITTA ---',
    pad('POLICY', 20) +
      pad('SCORE/INCONTRO', 16) +
      pad('PT BRISCOLA', 13) +
      pad('LEG visti/presi', 17) +
      'SCONFITTE (chips / briscola / entrambe)',
  ];
  for (const s of summaries) {
    lines.push(
      pad(s.policyName, 20) +
        pad(short(s.avgScorePerEncounter), 16) +
        pad(s.avgBriscolaPoints.toFixed(1), 13) +
        pad(`${s.legendarySeen.toFixed(1)} / ${s.legendaryBought.toFixed(2)}`, 17) +
        `${s.lossCauses.chips} / ${s.lossCauses.briscola} / ${s.lossCauses.both}`
    );
  }
  return lines;
}

export function sportTable(summaries: PolicySummary[]): string[] {
  const lines = [
    '',
    '--- CORRELAZIONE CASSA <-> PUNTEGGIO DELLA PRESA (solo run con il Bar Sport) ---',
    pad('POLICY', 20) + pad('RUN CON SPORT', 16) + 'PEARSON(cassa, score presa)',
  ];
  for (const s of summaries) {
    lines.push(
      pad(s.policyName, 20) +
        pad(String(s.sportRuns), 16) +
        (s.sportRuns === 0 ? 'n/d' : s.sportCorrelation.toFixed(3))
    );
  }
  return lines;
}
