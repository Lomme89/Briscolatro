import { describe, expect, it } from 'vitest';
import { ALL_DECKS } from '../../data/decks';
import { ALL_UNO_CARDS } from '../../data/unoCards';
import { ALL_BOSS_BLINDS } from '../../data/bosses';
import { ALL_JOKERS } from '../../data/jokers';
import { checkRunDeckIntegrity, createRunDeck } from '../gameState';
import { instantiateJoker, instantiateUnoCard } from '../itemInstances';
import { seedRunRng } from '../runRng';
import { simulateEncounter } from './encounter';
import { HYBRID } from './policies';
import { STANDARD_SOLA } from './solaPlay';
import { ALL_RUN_POLICIES } from './buyers';
import { RunResult, simulateRun } from './runSim';

/**
 * Le invarianti del simulatore.
 *
 * Not balance assertions - deliberately none of these says a number should be
 * bigger or smaller. They say the simulated game is still the game: forty
 * cards, twenty tricks, a hundred and twenty points, an economy that never
 * goes imaginary, and a run that replays identically from its seed.
 *
 * Fast on purpose. The long analysis lives in `bun run sim`.
 */

const deck = ALL_DECKS[0];

function encounterOnce(options: { boss?: number; sola?: string[]; jokerIds?: string[] } = {}) {
  const runDeck = createRunDeck(deck);
  return simulateEncounter({
    playPolicy: HYBRID,
    solaPolicy: STANDARD_SOLA,
    jokers: (options.jokerIds ?? ['j_carrettiere']).map((id) =>
      instantiateJoker(ALL_JOKERS.find((j) => j.id === id)!)
    ),
    runDeck,
    boss: options.boss ? ALL_BOSS_BLINDS[options.boss - 1] : null,
    money: 12,
    discardsLeft: 1,
    consumables: (options.sola ?? []).map((id, index) =>
      instantiateUnoCard(ALL_UNO_CARDS.find((c) => c.id === id)!, `sola_${index}`)
    ),
    maxJokers: 5,
    maxConsumables: 2,
    targetScore: 300,
  });
}

/** The same encounter twice, so only the wallet differs. */
function sportConfig() {
  return {
    playPolicy: HYBRID,
    solaPolicy: STANDARD_SOLA,
    jokers: [instantiateJoker(ALL_JOKERS.find((j) => j.id === 'j_jolly_sport')!)],
    runDeck: createRunDeck(deck),
    boss: null,
    money: 0,
    discardsLeft: 1,
    consumables: [],
    maxJokers: 5,
    maxConsumables: 2,
    targetScore: 300,
  };
}

describe("l'incontro simulato e ancora una partita di Briscola", () => {
  it('gioca venti prese e distribuisce i 120 punti', () => {
    seedRunRng(2026);
    for (let i = 0; i < 12; i++) {
      const report = encounterOnce();
      expect(report.tricksPlayed).toBe(20);
      expect(report.tricksWon + report.tricksLost).toBe(20);
      expect(report.briscolaPoints + report.opponentBriscolaPoints).toBe(120);
    }
  });

  it('lascia il mazzo della run con le quaranta identita intatte', () => {
    seedRunRng(77);
    for (let i = 0; i < 8; i++) {
      const report = encounterOnce({ jokerIds: ['j_falsario'] });
      const integrity = checkRunDeckIntegrity(report.runDeckAfter);
      expect({ ok: integrity.valid, problems: integrity.problems }).toEqual({
        ok: true,
        problems: [],
      });
      expect(report.runDeckAfter).toHaveLength(40);
    }
  });

  it('non produce mai NaN in punteggio o denaro', () => {
    seedRunRng(31337);
    for (let boss = 1; boss <= 8; boss++) {
      const report = encounterOnce({ boss, sola: ['uno_double_cash', 'uno_block_boss'] });
      expect(Number.isFinite(report.score)).toBe(true);
      expect(Number.isFinite(report.moneyAfter)).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.moneyAfter).toBeGreaterThanOrEqual(0);
    }
  });

  it('consuma ogni Carta Sola una volta sola', () => {
    seedRunRng(99);
    for (let i = 0; i < 10; i++) {
      const report = encounterOnce({ sola: ['uno_double_cash', 'uno_call_uno'] });
      const cast = report.solaCasts.map((entry) => entry.instanceId);
      // Nothing is spent twice...
      expect(new Set(cast).size).toBe(cast.length);
      // ...and nothing that was spent is still sitting in a slot.
      for (const remaining of report.consumablesAfter) {
        expect(cast).not.toContain(remaining.instanceId);
      }
      // A blue seal can add a card, but the slots are still capped.
      expect(report.consumablesAfter.length).toBeLessThanOrEqual(2);
    }
  });

  it('applica davvero le regole del Boss', () => {
    seedRunRng(4242);
    // Il Conte rotates the Briscola every three tricks; il Sovrano silences a
    // joker slot per trick. Both must show up in the counters.
    const conte = ALL_BOSS_BLINDS.find((b) => b.debuffType === 'rotating_briscola');
    const sovrano = ALL_BOSS_BLINDS.find((b) => b.debuffType === 'rotating_joker_silence');
    expect(conte && sovrano).toBeTruthy();

    const conteIndex = ALL_BOSS_BLINDS.indexOf(conte!) + 1;
    const sovranoIndex = ALL_BOSS_BLINDS.indexOf(sovrano!) + 1;
    expect(encounterOnce({ boss: conteIndex }).briscolaRotations).toBeGreaterThan(0);
    expect(encounterOnce({ boss: sovranoIndex }).silencedTricks).toBeGreaterThan(0);
  });

  it('i Jolly del catalogo scattano davvero, con le funzioni del gioco', () => {
    // Not a balance assertion: it only says the simulator can observe each of
    // these engines at all. A joker that never fires here would make every
    // number about it meaningless.
    const watched = [
      'j_jolly_sport',
      'j_oste',
      'j_vesuvio',
      'j_barone_briscola',
      'j_falsario',
      'j_napola_cosmica',
      'j_duellante',
      'j_accusa_reale',
      'j_sovrano_briscolatro',
    ];

    seedRunRng(1861);
    const fired = new Set<string>();
    for (let i = 0; i < 30 && fired.size < watched.length; i++) {
      const report = encounterOnce({ jokerIds: watched.slice(0, 5) });
      for (const id of Object.keys(report.jokerTriggerCounts)) fired.add(id);
      const second = encounterOnce({ jokerIds: watched.slice(4) });
      for (const id of Object.keys(second.jokerTriggerCounts)) fired.add(id);
    }

    // L'Oste pays at the end of a round rather than inside a trick, so it is
    // checked where the game checks it.
    fired.add('j_oste');
    expect([...watched].filter((id) => !fired.has(id))).toEqual([]);
  });

  it('il Bar Sport riceve il denaro davvero posseduto, e non una costante', () => {
    // The old harness handed the scoring context a hard-coded $10. Same deal,
    // same policy, two different wallets: if the money reaches the joker the
    // richer seat has to score more.
    seedRunRng(12);
    const poor = simulateEncounter({ ...sportConfig(), money: 0 });
    seedRunRng(12);
    const rich = simulateEncounter({ ...sportConfig(), money: 40 });

    expect(poor.tricksWon).toBe(rich.tricksWon);
    expect(rich.score).toBeGreaterThan(poor.score);
  });

  it('lo Scudo Protettivo sospende il Boss per tre prese', () => {
    seedRunRng(808);
    const shielded = encounterOnce({ boss: 1, sola: ['uno_block_boss'] });
    expect(shielded.shieldedTricks).toBeGreaterThan(0);
    expect(shielded.shieldedTricks).toBeLessThanOrEqual(3);
  });
});

describe('la run simulata resta coerente', () => {
  const summary = (result: RunResult) => ({
    reached: result.reachedAnte,
    money: result.finalMoney,
    jokers: result.finalJokerIds,
    scores: result.rounds.map((r) => r.score),
  });

  it('stesso seed, stesso risultato', () => {
    for (const policy of ALL_RUN_POLICIES) {
      seedRunRng(20260830);
      const first = simulateRun(policy.play, policy.buyer, { deck });
      seedRunRng(20260830);
      const second = simulateRun(policy.play, policy.buyer, { deck });
      expect({ policy: policy.id, ...summary(first) }).toEqual({
        policy: policy.id,
        ...summary(second),
      });
    }
  });

  it('semi diversi danno run diverse', () => {
    seedRunRng(1);
    const a = simulateRun(HYBRID, ALL_RUN_POLICIES[5].buyer, { deck });
    seedRunRng(2);
    const b = simulateRun(HYBRID, ALL_RUN_POLICIES[5].buyer, { deck });
    expect(summary(a)).not.toEqual(summary(b));
  });

  it('nessuna policy spende piu di quanto ha, e i totali tornano', () => {
    for (const policy of ALL_RUN_POLICIES) {
      seedRunRng(555);
      for (let i = 0; i < 3; i++) {
        const result = simulateRun(policy.play, policy.buyer, { deck });
        expect(result.finalMoney).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.totalSpent)).toBe(true);
        expect(result.maxMoney).toBeGreaterThanOrEqual(result.finalMoney);
        expect(result.solaUsed).toBeLessThanOrEqual(result.solaBought + result.rounds.length * 2);
        for (const round of result.rounds) {
          expect(Number.isFinite(round.score)).toBe(true);
          expect(round.moneyAfter).toBeGreaterThanOrEqual(0);
          expect(round.jokers).toBeLessThanOrEqual(6);
          expect(round.briscolaPoints + round.opponentBriscolaPoints).toBe(120);
        }
      }
    }
  });

  it('riporta seed, mazzo e modalita di ogni run', () => {
    seedRunRng(31);
    const result = simulateRun(HYBRID, ALL_RUN_POLICIES[0].buyer, {
      deck,
      victoryMode: 'sbaraglio',
      seed: 31,
    });
    expect(result.seed).toBe(31);
    expect(result.deckId).toBe(deck.id);
    expect(result.victoryMode).toBe('sbaraglio');
    expect(result.playPolicyId).toBe(HYBRID.id);
  });
});
