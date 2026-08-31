import { describe, expect, it } from 'vitest';
import { ALL_JOKERS } from '../data/jokers';
import { CardRank, Edition, Enhancement, Joker, PlayingCard, Seal, Suit } from '../types/game';
import { createCard, resolveTrick } from './briscola';
import { instantiateJoker } from './itemInstances';
import { calculateTrickScore } from './scoring';
import { ScoreStep } from './scoreTrace';

/**
 * The tally replays the trace instead of ramping the finished number, so the
 * trace has to land exactly where the engine did. One fold, checked against
 * the aggregates, is the whole contract.
 */

const BRISCOLA: Suit = 'denari';

function card(
  suit: Suit,
  rank: CardRank,
  id: string,
  extras: { edition?: Edition; seal?: Seal; enhancement?: Enhancement } = {}
): PlayingCard {
  return createCard(
    suit,
    rank,
    extras.edition ?? 'standard',
    extras.seal ?? 'none',
    extras.enhancement ?? 'none',
    id,
    'none'
  );
}

function joker(id: string): Joker {
  const found = ALL_JOKERS.find((entry) => entry.id === id);
  if (!found) throw new Error(`jolly assente dal catalogo: ${id}`);
  return instantiateJoker(found, id);
}

/** The fold the overlay performs, kind by kind. */
function fold(steps: ScoreStep[]) {
  const sum = (kind: ScoreStep['kind']) =>
    steps.filter((s) => s.kind === kind).reduce((acc, s) => acc + s.amount, 0);
  return {
    chips: sum('chips'),
    mult: sum('mult'),
    dollars: sum('dollars'),
    xMult: steps
      .filter((s) => s.kind === 'xmult')
      .reduce((acc, s) => acc * s.amount, 1),
  };
}

function score(
  playerCard: PlayingCard,
  opponentCard: PlayingCard,
  jokers: Joker[] = [],
  playerHand: PlayingCard[] = [],
  unoMultiplier = 1
) {
  const clash = resolveTrick(playerCard, opponentCard, BRISCOLA, true);
  return calculateTrickScore(
    playerCard,
    opponentCard,
    clash,
    BRISCOLA,
    jokers,
    null,
    {
      money: 10,
      playerHand,
      consecutiveWinStreak: 0,
      totalTricksPlayedThisRound: 0,
      remainingTricksCount: 20,
      capturedDenariRanksThisRound: new Set<number>(),
    },
    unoMultiplier
  );
}

describe('traccia del punteggio', () => {
  it('si ripiega esattamente sugli aggregati di una presa carica', () => {
    const played = card('denari', 1, 'p_asso', {
      edition: 'foil',
      seal: 'gold',
      enhancement: 'mult',
    });
    const captured = card('coppe', 3, 'o_tre', { edition: 'holo' });
    const held = [card('spade', 4, 'h_acciaio', { enhancement: 'steel' })];

    const result = score(played, captured, [joker('j_jolly_sport')], held, 1.5);
    const folded = fold(result.steps);

    expect(folded.chips).toBe(result.bonusChips);
    expect(folded.mult).toBe(result.bonusMult);
    expect(folded.dollars).toBe(result.bonusDollars);
    expect(folded.xMult).toBeCloseTo(result.xMult, 10);

    // And the totals the overlay shows are the ones the engine banked.
    expect(result.baseChips + folded.chips).toBe(result.totalChips);
    expect((result.baseMult + folded.mult) * folded.xMult).toBeCloseTo(result.totalMult, 10);
  });

  it('nomina il jolly che ha mosso il numero', () => {
    const result = score(
      card('denari', 1, 'p_asso'),
      card('coppe', 4, 'o_quattro'),
      [joker('j_jolly_sport')]
    );
    const fromJoker = result.steps.filter((s) => s.sourceJokerId === 'j_jolly_sport');
    expect(fromJoker.length).toBeGreaterThan(0);
    expect(fromJoker.every((s) => s.label.length > 0)).toBe(true);
  });

  it('non elenca passi nulli', () => {
    const result = score(card('spade', 2, 'p_due'), card('coppe', 4, 'o_quattro'));
    for (const step of result.steps) {
      expect(step.kind === 'xmult' ? step.amount : step.amount).not.toBe(
        step.kind === 'xmult' ? 1 : 0
      );
    }
  });
});
