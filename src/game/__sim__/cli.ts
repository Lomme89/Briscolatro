import { ALL_DECKS } from '../../data/decks';
import { parseVictoryMode, VictoryMode } from '../victoryModes';
import { ALL_RUN_POLICIES } from './buyers';
import { ALL_EXPERIMENTS } from './experiments';
import {
  BatchOptions,
  economyTable,
  header,
  runBatch,
  scoringTable,
  sportTable,
  summarise,
  survivalTable,
} from './report';

/**
 * bun run sim
 *
 * Il comando serio. `bun run test` resta veloce e non fa analisi: questo gira
 * quante run gli si chiede, stampa il seed con cui le ha girate, e chiude con
 * gli esperimenti mirati.
 *
 *   bun run sim                       100 run per policy, seed casuale
 *   bun run sim -- --runs 1000        report lungo
 *   bun run sim -- --seed 20260830    ripete esattamente un report precedente
 *   bun run sim -- --mode sbaraglio --deck deck_bastoni
 *   bun run sim -- --only experiments
 *   bun run sim -- --policy balanced,cash_hoarder
 */

interface Args {
  runs: number;
  seed: number;
  mode: VictoryMode;
  deck: string;
  policies: string[];
  only: 'all' | 'policies' | 'experiments';
  experiments: string[];
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(`--${flag}`);
    if (index === -1) return undefined;
    return argv[index + 1];
  };

  const runs = Number.parseInt(get('runs') ?? '100', 10);
  const seed = Number.parseInt(get('seed') ?? `${(Date.now() ^ 0x5bf03635) >>> 0}`, 10);
  const onlyRaw = get('only');
  const only: Args['only'] =
    onlyRaw === 'experiments' ? 'experiments' : onlyRaw === 'policies' ? 'policies' : 'all';

  return {
    runs: Number.isFinite(runs) && runs > 0 ? runs : 100,
    seed: Number.isFinite(seed) ? seed >>> 0 : 1,
    mode: parseVictoryMode(get('mode')),
    deck: get('deck') ?? ALL_DECKS[0].id,
    policies: (get('policy') ?? '').split(',').filter(Boolean),
    only,
    experiments: (get('experiment') ?? '').split(',').filter(Boolean),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const policies =
    args.policies.length > 0
      ? ALL_RUN_POLICIES.filter((p) => args.policies.includes(p.id))
      : ALL_RUN_POLICIES;

  if (policies.length === 0) {
    console.error(`policy sconosciute. Disponibili: ${ALL_RUN_POLICIES.map((p) => p.id).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const options: BatchOptions = {
    runs: args.runs,
    seed: args.seed,
    victoryMode: args.mode,
    deckId: args.deck,
  };

  for (const line of header(options, policies)) console.log(line);

  if (args.only !== 'experiments') {
    const started = Date.now();
    const summaries = policies.map((policy) => {
      // Every policy starts from the same seed, so the shops they are offered
      // are the same shops: a difference between two rows is a difference in
      // what was bought, not in what turned up.
      const results = runBatch(policy, options);
      return summarise(policy, results);
    });

    for (const line of survivalTable(summaries)) console.log(line);
    for (const line of economyTable(summaries)) console.log(line);
    for (const line of scoringTable(summaries)) console.log(line);
    for (const line of sportTable(summaries)) console.log(line);
    console.log(`\n(${policies.length} policy x ${args.runs} run in ${Math.round((Date.now() - started) / 1000)}s)`);
  }

  if (args.only !== 'policies') {
    const wanted =
      args.experiments.length > 0
        ? ALL_EXPERIMENTS.filter((e) => args.experiments.includes(e.id))
        : ALL_EXPERIMENTS;

    console.log('');
    console.log('='.repeat(78));
    console.log('ESPERIMENTI MIRATI');
    console.log('='.repeat(78));
    console.log('Board iniziale forzato: e uno strumento di misura, non una modifica.');

    // The experiments are cheaper per line than the policy sweep, and their
    // point is the shape of a distribution rather than a survival rate.
    const experimentOptions: BatchOptions = { ...options, runs: Math.max(20, Math.round(args.runs / 2)) };
    for (const experiment of wanted) {
      for (const line of experiment.run(experimentOptions)) console.log(line);
    }
  }

  console.log('');
  console.log(`Per ripetere identico questo report: bun run sim -- --seed ${args.seed} --runs ${args.runs} --mode ${args.mode} --deck ${args.deck}`);
}

main();
