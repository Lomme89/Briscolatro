import { describe, expect, it } from 'vitest';
import { JOKER_EFFECTS, JokerScoringContext } from './jokerEffects';
import { checkRunDeckIntegrity, createRunDeck, foilRandomCardInRunDeck } from './gameState';
import { createCard, resolveTrick } from './briscola';
import { ALL_DECKS } from '../data/decks';
import { ALL_JOKERS } from '../data/jokers';
import { CardRank, PlayingCard, Suit } from '../types/game';

const SUITS: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const napoletano = () => createRunDeck(ALL_DECKS[0]);
const falsario = () => ALL_JOKERS.find((j) => j.id === 'j_falsario')!;

/** suit_rank -> how many times it appears. */
function identityCounts(deck: PlayingCard[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of deck) {
    const key = `${card.suit}_${card.rank}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function foilCount(deck: PlayingCard[]): number {
  return deck.filter((card) => card.edition === 'foil').length;
}

function expectFortyItalianCards(deck: PlayingCard[]): void {
  expect(checkRunDeckIntegrity(deck).problems).toEqual([]);
  expect(deck.length).toBe(40);

  for (const suit of SUITS) {
    expect({ suit, count: deck.filter((c) => c.suit === suit).length }).toEqual({ suit, count: 10 });
  }

  const counts = identityCounts(deck);
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      expect({ id: `${suit}_${rank}`, n: counts.get(`${suit}_${rank}`) }).toEqual({
        id: `${suit}_${rank}`,
        n: 1,
      });
    }
  }

  expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
}

/** Runs the Falsario the way App does: n won tricks in a row. */
function stamp(deck: PlayingCard[], times: number): PlayingCard[] {
  let next = deck;
  for (let i = 0; i < times; i++) {
    next = foilRandomCardInRunDeck(next).deck;
  }
  return next;
}

describe('Il Falsario stamps editions, never identities', () => {
  it('the starting deck is whole before anything touches it', () => {
    expectFortyItalianCards(napoletano());
  });

  it('one stamp leaves forty cards and adds exactly one Foil', () => {
    const before = napoletano();
    const { deck, foiledCardId } = foilRandomCardInRunDeck(before);

    expectFortyItalianCards(deck);
    expect(foiledCardId).not.toBeNull();
    expect(foilCount(deck)).toBe(foilCount(before) + 1);
    expect(deck.find((c) => c.id === foiledCardId)!.edition).toBe('foil');
  });

  it('twenty stamps in a row still leave the forty Italian cards', () => {
    const deck = stamp(napoletano(), 20);
    expectFortyItalianCards(deck);
  });

  it('the identity of every card survives the stamps untouched', () => {
    const before = napoletano();
    const after = stamp(before, 20);

    for (const card of before) {
      const same = after.find((c) => c.id === card.id)!;
      expect({
        suit: same.suit,
        rank: same.rank,
        points: same.points,
        power: same.power,
        enhancement: same.enhancement,
        seal: same.seal,
        special: same.special,
      }).toEqual({
        suit: card.suit,
        rank: card.rank,
        points: card.points,
        power: card.power,
        enhancement: card.enhancement,
        seal: card.seal,
        special: card.special,
      });
    }
  });

  it('only the number of Foil goes up, one per stamp', () => {
    let deck = napoletano();
    let foils = foilCount(deck);
    for (let i = 0; i < 20; i++) {
      deck = foilRandomCardInRunDeck(deck).deck;
      expect(foilCount(deck)).toBe(foils + 1);
      foils += 1;
    }
  });

  it('a deck already all Foil is left exactly as it is', () => {
    const allFoil = napoletano().map((card) => ({ ...card, edition: 'foil' as const }));
    const { deck, foiledCardId } = foilRandomCardInRunDeck(allFoil);

    expect(foiledCardId).toBeNull();
    expect(deck).toBe(allFoil);
    expectFortyItalianCards(deck);
    expect(foilCount(deck)).toBe(40);
  });

  it('a non-Denari card can be the one stamped, and stays its own suit', () => {
    const deck = napoletano().map((card) =>
      card.suit === 'coppe' && card.rank === 9 ? card : { ...card, edition: 'foil' as const }
    );
    const { deck: after, foiledCardId } = foilRandomCardInRunDeck(deck);
    const stamped = after.find((c) => c.id === foiledCardId)!;

    expect({ suit: stamped.suit, rank: stamped.rank, edition: stamped.edition }).toEqual({
      suit: 'coppe',
      rank: 9 as CardRank,
      edition: 'foil',
    });
    expectFortyItalianCards(after);
  });

  it('the joker asks for a Foil and never names a suit or a rank', () => {
    const ctx: JokerScoringContext = {
      playerCard: createCard('spade', 1, 'standard', 'none', 'none', 'p'),
      opponentCard: createCard('coppe', 4, 'standard', 'none', 'none', 'o'),
      clashResult: resolveTrick(
        createCard('spade', 1, 'standard', 'none', 'none', 'p'),
        createCard('coppe', 4, 'standard', 'none', 'none', 'o'),
        'denari',
        true
      ),
      briscolaSuit: 'denari',
      money: 0,
      playerHand: [],
      tricksWonThisRound: 1,
      consecutiveWinStreak: 1,
      totalTricksPlayedThisRound: 1,
      remainingTricksCount: 10,
      capturedDenariRanksThisRound: new Set<number>(),
      disabledJokerIndex: null,
    };

    const mod = JOKER_EFFECTS.applyJokersToTrick([falsario()], ctx);
    expect(mod.foilRandomCard).toBe(true);
    expect(mod.triggeredJokerIds).toContain('j_falsario');
    expect(Object.keys(mod)).not.toContain('transmutedCard');
  });

  it('without the Falsario nothing asks for a Foil', () => {
    const ctx: JokerScoringContext = {
      playerCard: createCard('spade', 1, 'standard', 'none', 'none', 'p'),
      opponentCard: createCard('coppe', 4, 'standard', 'none', 'none', 'o'),
      clashResult: resolveTrick(
        createCard('spade', 1, 'standard', 'none', 'none', 'p'),
        createCard('coppe', 4, 'standard', 'none', 'none', 'o'),
        'denari',
        true
      ),
      briscolaSuit: 'denari',
      money: 0,
      playerHand: [],
      tricksWonThisRound: 1,
      consecutiveWinStreak: 1,
      totalTricksPlayedThisRound: 1,
      remainingTricksCount: 10,
      capturedDenariRanksThisRound: new Set<number>(),
      disabledJokerIndex: null,
    };

    expect(JOKER_EFFECTS.applyJokersToTrick([], ctx).foilRandomCard).toBe(false);
  });
});
