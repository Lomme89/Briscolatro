import { ALL_DECKS } from '../../data/decks';
import { seedRunRng } from '../runRng';
import { correlation, pad } from './policyLab';
import { RunPolicy, RunResult, simulateRun } from './runSim';
import { BALANCED, CASH_HOARDER } from './buyers';
import { HYBRID } from './policies';
import { STANDARD_SOLA } from './solaPlay';
import { BatchOptions } from './report';

/**
 * Le domande mirate.
 *
 * Each of these forces a starting board and then plays whole runs with it, so
 * the answer is "what does this build actually do over eight antes" rather than
 * "what does the card say it does". Forcing the board is a measurement device,
 * not a balance change: nothing here writes to a cost, a target or a payout.
 *
 * Every experiment prints the seed it ran from. If one of them says a build is
 * broken, that is a finding to report, not a nerf to apply.
 */

function runWith(
  options: BatchOptions,
  startingJokerIds: string[],
  policy: RunPolicy = { id: 'exp', name: 'exp', blurb: '', buyer: BALANCED, play: HYBRID }
): RunResult[] {
  const deck = ALL_DECKS.find((d) => d.id === options.deckId) ?? ALL_DECKS[0];
  seedRunRng(options.seed);
  const results: RunResult[] = [];
  for (let i = 0; i < options.runs; i++) {
    results.push(
      simulateRun(policy.play, policy.buyer, {
        deck,
        victoryMode: options.victoryMode,
        sola: STANDARD_SOLA,
        startingJokerIds,
      })
    );
  }
  return results;
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
const pct = (value: number): string => `${Math.round(value * 100)}%`;
const short = (value: number): string =>
  value >= 1000 ? `${Math.round(value / 1000)}k` : `${Math.round(value)}`;

interface Line {
  label: string;
  results: RunResult[];
}

function compareTable(title: string, lines: Line[]): string[] {
  const out = [
    '',
    `--- ${title} ---`,
    pad('BUILD', 30) +
      pad('ANTE MEDIO', 12) +
      pad('A4', 7) +
      pad('A6', 7) +
      pad('A8', 7) +
      pad('COMPLETE', 10) +
      pad('SCORE/INC', 11) +
      '$ MAX',
  ];
  for (const line of lines) {
    const alive = (ante: number) =>
      line.results.filter((r) => r.reachedAnte >= ante).length / Math.max(1, line.results.length);
    out.push(
      pad(line.label, 30) +
        pad(mean(line.results.map((r) => r.reachedAnte)).toFixed(2), 12) +
        pad(pct(alive(4)), 7) +
        pad(pct(alive(6)), 7) +
        pad(pct(alive(8)), 7) +
        pad(pct(line.results.filter((r) => r.completed).length / Math.max(1, line.results.length)), 10) +
        pad(short(mean(line.results.flatMap((r) => r.rounds.map((b) => b.score)))), 11) +
        `$${Math.round(mean(line.results.map((r) => r.maxMoney)))}`
    );
  }
  return out;
}

/**
 * 1. Sport + Oste + Raddoppio, contro il tavolo vuoto.
 *
 * The economy build is the one most likely to run away with the game, because
 * the money it hoards is also its Mult. Two control lines: a board of the same
 * size that does not read money at all, and no board at all.
 */
export function economyComboExperiment(options: BatchOptions): string[] {
  const combo = ['j_jolly_sport', 'j_oste'];
  const control = ['j_carrettiere', 'j_spadaccino'];

  const comboRuns = runWith(options, combo, {
    id: 'combo',
    name: 'combo',
    blurb: '',
    buyer: CASH_HOARDER,
    play: HYBRID,
  });
  const controlRuns = runWith(options, control, {
    id: 'control',
    name: 'control',
    blurb: '',
    buyer: CASH_HOARDER,
    play: HYBRID,
  });
  const baseline = runWith(options, []);

  const lines = compareTable('ESPERIMENTO 1 - SPORT + OSTE + RADDOPPIO SOLDI', [
    { label: 'Sport + Oste (cash hoarder)', results: comboRuns },
    { label: 'Controllo pari slot', results: controlRuns },
    { label: 'Baseline senza jolly iniziali', results: baseline },
  ]);

  const comboSamples = comboRuns.flatMap((r) => r.moneyScoreSamples);
  lines.push(
    '',
    `  Pearson(cassa, punteggio presa) sulla build economica: ${correlation(comboSamples).toFixed(3)}`,
    `  Raddoppio Soldi comprate/usate in media: ${mean(comboRuns.map((r) => r.solaBought)).toFixed(2)} / ${mean(
      comboRuns.map((r) => r.solaUsed)
    ).toFixed(2)}`,
    `  Cassa media all uscita dal negozio: $${Math.round(mean(comboRuns.flatMap((r) => r.moneyAfterShop)))}`
  );
  return lines;
}

/**
 * 2. Accusa Trionfale.
 *
 * The card asks for a Re and a Cavallo of the same suit in hand, which is a
 * condition the player does not control. Worth knowing how often it is armed at
 * all before anyone argues about the +40.
 */
export function accusaExperiment(options: BatchOptions): string[] {
  const withAccusa = runWith(options, ['j_accusa_reale']);
  const without = runWith(options, ['j_carrettiere']);

  const armed = mean(withAccusa.map((r) => (r.totalTricks === 0 ? 0 : r.accusaArmedTricks / r.totalTricks)));
  const triggers = mean(withAccusa.map((r) => r.accusaTriggers));
  const armedPerEncounter = mean(
    withAccusa.flatMap((r) => r.rounds.map((b) => b.accusaArmedTricks))
  );
  const contribution = mean(
    withAccusa.map((r) => r.jokerTriggerScore['j_accusa_reale'] ?? 0)
  );
  const totalScore = mean(withAccusa.map((r) => r.rounds.reduce((a, b) => a + b.score, 0)));

  return [
    ...compareTable('ESPERIMENTO 2 - ACCUSA TRIONFALE', [
      { label: 'Accusa Trionfale', results: withAccusa },
      { label: 'Controllo (Carrettiere)', results: without },
    ]),
    '',
    `  Prese con la combo assemblata (Re + Cavallo in mano): ${pct(armed)}`,
    `  Prese armate per incontro, in media: ${armedPerEncounter.toFixed(1)} su ~20`,
    `  Volte che l Accusa e scattata in una run: ${triggers.toFixed(1)}`,
    `  Punteggio delle prese in cui e scattata: ${short(contribution)} su ${short(totalScore)} totali della run`,
  ];
}

/**
 * 3. Il Falsario.
 *
 * One non-Foil card of the run deck becomes Foil on every won trick, so the
 * question is how quickly a deck saturates - and what fraction of the forty is
 * Foil by the end of an ante.
 */
export function falsarioExperiment(options: BatchOptions): string[] {
  const withFalsario = runWith(options, ['j_falsario']);
  const without = runWith(options, ['j_carrettiere']);

  const lines = compareTable('ESPERIMENTO 3 - IL FALSARIO', [
    { label: 'Falsario dal primo Ante', results: withFalsario },
    { label: 'Controllo (Carrettiere)', results: without },
  ]);

  lines.push('', '  ' + pad('DOPO ANTE', 12) + pad('FOIL MEDI', 12) + 'QUOTA DEL MAZZO');
  for (const ante of [2, 4, 6, 8]) {
    const values = withFalsario
      .map((r) => r.foilByAnte[ante])
      .filter((value): value is number => value !== undefined);
    if (values.length === 0) {
      lines.push('  ' + pad(ante, 12) + pad('-', 12) + '-');
      continue;
    }
    const avg = mean(values);
    lines.push(
      '  ' + pad(ante, 12) + pad(avg.toFixed(1), 12) + `${Math.round((avg / 40) * 100)}% (${values.length} run vive)`
    );
  }
  return lines;
}

/**
 * 4. Acciaio.
 *
 * Steel pays for being held rather than played, so the interesting number is
 * the distribution of how many steel cards were actually in hand at the moment
 * a trick was scored - and what those tricks paid.
 */
export function steelExperiment(options: BatchOptions): string[] {
  const results = runWith(options, ['j_carrettiere']);
  const samples = results.flatMap((r) => r.steelHeldSamples);

  const buckets = new Map<number, number[]>();
  for (const [held, score] of samples) {
    const key = Math.min(3, held);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(score);
  }

  const lines = [
    '',
    '--- ESPERIMENTO 4 - ACCIAIO (STEEL) TENUTO IN MANO ---',
    '  ' + pad('STEEL IN MANO', 16) + pad('PRESE', 10) + pad('QUOTA', 10) + 'SCORE MEDIO DELLA PRESA',
  ];
  for (const key of [0, 1, 2, 3]) {
    const scores = buckets.get(key) ?? [];
    lines.push(
      '  ' +
        pad(key === 3 ? '3+' : key, 16) +
        pad(scores.length, 10) +
        pad(pct(scores.length / Math.max(1, samples.length)), 10) +
        short(mean(scores))
    );
  }
  lines.push(
    '',
    '  Nota: le carte Acciaio arrivano solo dalle bustine, quindi la distribuzione',
    '  dice anche quanto raramente il mazzo ne accumula piu di una.'
  );
  return lines;
}

/**
 * 5. Wild.
 *
 * A Wild card counts as any suit in a combination, which should make the tricks
 * it is played into worth more. Comparing it against every other card played by
 * the same runs is crude but it is the comparison the question asks for.
 */
export function wildExperiment(options: BatchOptions): string[] {
  const results = runWith(options, ['j_carrettiere']);
  const wildTricks = results.reduce((a, r) => a + r.wildPlayedTricks, 0);
  const wildScore = results.reduce((a, r) => a + r.wildPlayedScore, 0);
  const plainTricks = results.reduce((a, r) => a + r.plainPlayedTricks, 0);
  const plainScore = results.reduce((a, r) => a + r.plainPlayedScore, 0);

  return [
    '',
    '--- ESPERIMENTO 5 - CARTE WILD ---',
    '  ' + pad('CARTA GIOCATA', 20) + pad('PRESE VINTE', 14) + 'SCORE MEDIO',
    '  ' + pad('Wild', 20) + pad(wildTricks, 14) + (wildTricks === 0 ? 'n/d' : short(wildScore / wildTricks)),
    '  ' + pad('Non-Wild', 20) + pad(plainTricks, 14) + (plainTricks === 0 ? 'n/d' : short(plainScore / plainTricks)),
    '',
    '  Nota: il confronto non e a parita di carta - le Wild arrivano da un upgrade,',
    '  quindi la carta sotto e gia stata scelta dalla bustina. Va letto come segnale.',
    '',
    '  SEGNALAZIONE (non corretta qui): oggi le bustine non offrono mai Wild.',
    "  cardUpgrades.ts propone solo bonus/mult/steel/stone, quindi l'enhancement",
    '  Wild esiste nei tipi e nello scoring ma non e raggiungibile in una run.',
    '  Questo e un dato da decidere altrove, non un bilanciamento da toccare qui.',
  ];
}

export const ALL_EXPERIMENTS: Array<{ id: string; run: (options: BatchOptions) => string[] }> = [
  { id: 'economy', run: economyComboExperiment },
  { id: 'accusa', run: accusaExperiment },
  { id: 'falsario', run: falsarioExperiment },
  { id: 'steel', run: steelExperiment },
  { id: 'wild', run: wildExperiment },
];
