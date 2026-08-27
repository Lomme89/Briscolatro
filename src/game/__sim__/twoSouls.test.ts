import { describe, expect, it } from 'vitest';
import { seedRandom, jokersByIds } from './sim';
import { benchmark, correlation, measureDivergence, pad, playRound, TrickReport } from './policyLab';
import { ALL_POLICIES, CONSERVATIVE, GREEDY, HYBRID } from './policies';
import { getBlindTargetScore } from '../gameState';
import { Joker } from '../../types/game';

/**
 * Le due anime di Briscolatro.
 *
 * A diagnostic, not a guard. The assertions here are deliberately loose - they
 * only catch the harness breaking - and the real output is the tables printed
 * to the console. Run it with:
 *
 *   bunx vitest run src/game/__sim__/twoSouls.test.ts --reporter=verbose
 */

const ROUNDS = 200;

/**
 * Joker archetypes, grouped by what they pay you FOR.
 *
 * The question is not which is strongest but which of them pulls hardest away
 * from Briscola: a jolly that pays for capturing carichi is aligned with the
 * classical game, one that pays for winning any trick at all is not.
 */
const ARCHETYPES: Array<[string, string[]]> = [
  ['nessun jolly', []],
  ['seme', ['j_carrettiere', 'j_spadaccino', 'j_cantina']],
  ['carichi', ['j_cacciatore_carichi', 'j_scopa_galattica', 'j_napola_cosmica']],
  ['figure', ['j_re_mida', 'j_cavaliere_nero', 'j_accusa_reale']],
  ['briscola', ['j_briscola_folle', 'j_vesuvio']],
  ['tempo/streak', ['j_barone_briscola', 'j_duellante', 'j_caffe_corretto']],
  ['lisce', ['j_sbaraglio']],
];

const REFERENCE = ['j_carrettiere', 'j_vesuvio', 'j_briscola_folle', 'j_barone_briscola'];

describe('le due anime di Briscolatro', () => {
  it('1. cosa produce ogni policy, a parita di mani', () => {
    const jokers = jokersByIds(REFERENCE);
    const rows = ALL_POLICIES.map((policy) => {
      const restore = seedRandom(1970);
      const summary = benchmark(policy, jokers, ROUNDS);
      restore();
      return { policy, summary };
    });

    console.log('\n=== 1. RESA PER POLICY (build di riferimento, ' + ROUNDS + ' mani) ===');
    console.log(pad('POLICY', 24) + pad('SCORE', 12) + pad('PUNTI BRISC.', 14) + pad('PRESE', 8) + 'VITTORIE 61+');
    for (const { policy, summary } of rows) {
      console.log(
        pad(policy.name, 24) +
          pad(Math.round(summary.avgScore), 12) +
          pad(summary.avgBriscolaPoints.toFixed(1) + '/120', 14) +
          pad(summary.avgTricksWon.toFixed(1) + '/20', 8) +
          Math.round(summary.briscolaWinRate * 100) + '%'
      );
    }

    for (const { summary } of rows) {
      expect(summary.avgScore).toBeGreaterThan(0);
      expect(summary.avgBriscolaPoints).toBeGreaterThan(0);
    }
  });

  it('2. quanto spesso giocherebbero carte diverse', () => {
    console.log('\n=== 2. DIVERGENZA DECISIONALE (stesse posizioni, arbitro Hybrid) ===');
    console.log(pad('ARCHETIPO', 16) + pad('CONS vs GREEDY', 17) + pad('CONS vs HYBR', 15) + pad('GREEDY vs HYBR', 17) + 'UNANIMI');

    const byArchetype: Record<string, number> = {};
    for (const [label, ids] of ARCHETYPES) {
      const restore = seedRandom(2718);
      const report = measureDivergence(HYBRID, ALL_POLICIES, jokersByIds(ids), 60);
      restore();

      const pct = (v: number) => Math.round(v * 100) + '%';
      byArchetype[label] = report.pairs['conservativa vs greedy'] ?? 0;
      console.log(
        pad(label, 16) +
          pad(pct(report.pairs['conservativa vs greedy'] ?? 0), 17) +
          pad(pct(report.pairs['conservativa vs hybrid'] ?? 0), 15) +
          pad(pct(report.pairs['greedy vs hybrid'] ?? 0), 17) +
          pct(report.unanimous)
      );
      expect(report.decisions).toBeGreaterThan(100);
    }

    const worst = Object.entries(byArchetype).sort((a, b) => b[1] - a[1])[0];
    console.log(`\n  -> archetipo che divide di piu: ${worst[0]} (${Math.round(worst[1] * 100)}%)`);
  });

  it('3. quanto costa giocare bene a Briscola, archetipo per archetipo', () => {
    console.log('\n=== 3. DISTORSIONE PER ARCHETIPO (greedy meno conservativa) ===');
    console.log(pad('ARCHETIPO', 16) + pad('SCORE CONS', 12) + pad('SCORE GREEDY', 14) + pad('x SCORE', 10) + 'PUNTI BRISC. PERSI');

    const rows: Array<[string, number, number]> = [];
    for (const [label, ids] of ARCHETYPES) {
      const jokers: Joker[] = jokersByIds(ids);

      const restoreA = seedRandom(3141);
      const cons = benchmark(CONSERVATIVE, jokers, ROUNDS);
      restoreA();
      const restoreB = seedRandom(3141);
      const greedy = benchmark(GREEDY, jokers, ROUNDS);
      restoreB();

      const scoreRatio = greedy.avgScore / Math.max(1, cons.avgScore);
      const pointsLost = cons.avgBriscolaPoints - greedy.avgBriscolaPoints;
      rows.push([label, scoreRatio, pointsLost]);

      console.log(
        pad(label, 16) +
          pad(Math.round(cons.avgScore), 12) +
          pad(Math.round(greedy.avgScore), 14) +
          pad('x' + scoreRatio.toFixed(2), 10) +
          (pointsLost >= 0 ? '-' : '+') + Math.abs(pointsLost).toFixed(1)
      );
    }

    const mostDistorting = [...rows].sort((a, b) => b[1] - a[1])[0];
    console.log(
      `\n  -> archetipo che paga di piu l'abbandono della Briscola: ${mostDistorting[0]} ` +
        `(x${mostDistorting[1].toFixed(2)} score, ${mostDistorting[2].toFixed(1)} punti Briscola in meno)`
    );
    expect(rows.length).toBe(ARCHETYPES.length);
  });

  it('4. chi supera i blind, e con quale anima', () => {
    console.log('\n=== 4. PASS RATE PER BLIND (build di riferimento) ===');
    const jokers = jokersByIds(REFERENCE);
    const blinds: Array<[number, number]> = [
      [1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3], [4, 1], [4, 3],
    ];

    console.log(pad('POLICY', 24) + blinds.map(([a, r]) => pad(`A${a}R${r}`, 8)).join(''));
    for (const policy of ALL_POLICIES) {
      const cells: string[] = [];
      for (const [ante, round] of blinds) {
        const target = getBlindTargetScore(ante, round);
        const restore = seedRandom(5150);
        let passed = 0;
        for (let i = 0; i < 80; i++) {
          if (playRound(policy, jokers).score >= target) passed++;
        }
        restore();
        cells.push(pad(Math.round((passed / 80) * 100) + '%', 8));
      }
      console.log(pad(policy.name, 24) + cells.join(''));
    }
  });

  it('5. la domanda: il punteggio segue i punti o soltanto le prese?', () => {
    const jokers = jokersByIds(REFERENCE);

    const restore = seedRandom(1234);
    const rounds: Array<{ points: number; score: number; tricks: number }> = [];
    const tricks: TrickReport[] = [];
    for (let i = 0; i < 400; i++) {
      const report = playRound(HYBRID, jokers, null, undefined, [], undefined, (t) => tricks.push(t));
      rounds.push({ points: report.briscolaPoints, score: report.score, tricks: report.tricksWon });
    }
    restore();

    const rPoints = correlation(rounds.map((r) => [r.points, r.score]));
    const rTricks = correlation(rounds.map((r) => [r.tricks, r.score]));

    console.log('\n=== 5. IL PUNTEGGIO SEGUE I PUNTI O LE PRESE? ===');
    console.log(`  punteggio <-> punti Briscola   r = ${rPoints.toFixed(3)}`);
    console.log(`  punteggio <-> prese vinte      r = ${rTricks.toFixed(3)}`);
    console.log(`  (${rounds.length} mani; 1 = si muovono insieme, 0 = due giochi diversi)`);

    // What one trick pays, by how much that trick is worth as Briscola.
    const won = tricks.filter((t) => t.won);
    const bucket = (min: number, max: number) => {
      const inRange = won.filter((t) => t.points >= min && t.points <= max);
      const avg = inRange.reduce((a, t) => a + t.score, 0) / Math.max(1, inRange.length);
      return { count: inRange.length, avg };
    };

    const buckets: Array<[string, ReturnType<typeof bucket>]> = [
      ['0 pt (liscia)', bucket(0, 0)],
      ['1-4 pt', bucket(1, 4)],
      ['5-10 pt', bucket(5, 10)],
      ['11+ pt (carichi)', bucket(11, 40)],
    ];

    console.log('\n  PUNTEGGIO MEDIO DI UNA PRESA VINTA, PER VALORE BRISCOLA:');
    console.log('  ' + pad('VALORE PRESA', 20) + pad('PUNTEGGIO MEDIO', 18) + 'CAMPIONE');
    for (const [label, data] of buckets) {
      console.log('  ' + pad(label, 20) + pad(Math.round(data.avg), 18) + data.count);
    }
    const liscia = buckets[0][1].avg;
    const carico = buckets[3][1].avg;
    console.log(
      `\n  -> una presa da carichi paga x${(carico / Math.max(1, liscia)).toFixed(2)} rispetto a una presa a zero punti`
    );

    expect(Number.isFinite(rPoints)).toBe(true);
    expect(won.length).toBeGreaterThan(500);
  });
});
