import { describe, expect, it } from 'vitest';
import { createCard, createStandardDeck } from './briscola';
import {
  addCardToRunDeck,
  drawNextTrickCards,
  isRoundFinished,
  performExchangeDiscard,
  prepareRoundDeck,
} from './gameState';
import { PlayingCard } from '../types/game';

function fixedDeck() {
  return createStandardDeck().sort((a, b) => a.id.localeCompare(b.id));
}

describe('round card conservation', () => {
  it('deals 3+3 with one face-up trump', () => {
    const deal = prepareRoundDeck(fixedDeck());
    expect(deal.playerHand).toHaveLength(3);
    expect(deal.opponentHand).toHaveLength(3);
    expect(deal.roundDrawPile).toHaveLength(33);
    expect(3 + 3 + 33 + 1).toBe(40);
  });

  it('discard exchange conserves stock and hand size', () => {
    const deal = prepareRoundDeck(fixedDeck());
    const before = deal.playerHand.length + deal.opponentHand.length + deal.roundDrawPile.length + 1;
    const result = performExchangeDiscard(deal.playerHand[0], deal.playerHand, deal.roundDrawPile, deal.trumpCard);
    expect(result.success).toBe(true);
    expect(result.newPlayerHand).toHaveLength(3);
    expect(result.newDrawPile).toHaveLength(33);
    const after = result.newPlayerHand.length + deal.opponentHand.length + result.newDrawPile.length + 1;
    expect(after).toBe(before);
  });

  it('does not swap a discard with the face-up trump after stock exhaustion', () => {
    const deal = prepareRoundDeck(fixedDeck());
    const result = performExchangeDiscard(deal.playerHand[0], deal.playerHand, [], deal.trumpCard);
    expect(result.success).toBe(false);
    expect(result.newTrumpCard?.id).toBe(deal.trumpCard.id);
  });

  it('winner draws first and the face-up trump is the final draw', () => {
    const deal = prepareRoundDeck(fixedDeck());
    // Recreate the final stock situation: one normal card + face-up trump.
    const lastNormal = deal.roundDrawPile[0];
    const result = drawNextTrickCards(true, [lastNormal], deal.trumpCard, [], []);
    expect(result.newPlayerHand[0].id).toBe(lastNormal.id);
    expect(result.newOpponentHand[0].id).toBe(deal.trumpCard.id);
    expect(result.newTrumpCard).toBeNull();
    expect(result.newDrawPile).toHaveLength(0);
  });
});

describe('run deck stays even', () => {
  it('a shop card replaces a plain card instead of growing the deck', () => {
    const runDeck = fixedDeck();
    const bought = createCard('denari', 1, 'foil');
    const next = addCardToRunDeck(runDeck, bought);
    expect(next).toHaveLength(runDeck.length);
    expect(next.some((c) => c.id === bought.id)).toBe(true);
  });

  it('never replaces an upgraded card while a plain one exists', () => {
    const runDeck = [
      createCard('denari', 2, 'polychrome', 'none', 'none', 'precious'),
      createCard('coppe', 4, 'standard', 'none', 'none', 'plain'),
    ];
    const next = addCardToRunDeck(runDeck, createCard('spade', 1));
    expect(next.some((c) => c.id === 'precious')).toBe(true);
    expect(next.some((c) => c.id === 'plain')).toBe(false);
  });

  it('a full round with a replaced card still plays exactly 20 tricks', () => {
    let runDeck = fixedDeck();
    runDeck = addCardToRunDeck(runDeck, createCard('denari', 1, 'foil'));
    const deal = prepareRoundDeck(runDeck);
    let { playerHand, opponentHand } = deal;
    let pile = deal.roundDrawPile;
    let trump: PlayingCard | null = deal.trumpCard;
    let tricks = 0;
    while (!isRoundFinished(playerHand, opponentHand, pile, trump)) {
      playerHand = playerHand.slice(1);
      opponentHand = opponentHand.slice(1);
      const drawn = drawNextTrickCards(true, pile, trump, playerHand, opponentHand);
      playerHand = drawn.newPlayerHand;
      opponentHand = drawn.newOpponentHand;
      pile = drawn.newDrawPile;
      trump = drawn.newTrumpCard;
      expect(playerHand.length).toBe(opponentHand.length);
      tricks++;
      if (tricks > 40) break;
    }
    expect(tricks).toBe(20);
  });
});

describe('draw parity safety net', () => {
  it('rebalances an asymmetric hand instead of throwing', () => {
    const deal = prepareRoundDeck(fixedDeck());
    const bloatedPlayerHand = [...deal.playerHand, deal.roundDrawPile[0], deal.roundDrawPile[1]];
    const result = drawNextTrickCards(
      true,
      deal.roundDrawPile.slice(2),
      deal.trumpCard,
      bloatedPlayerHand,
      deal.opponentHand
    );
    expect(result.parityCorrected).toBe(true);
    expect(result.newPlayerHand.length).toBe(result.newOpponentHand.length);
  });

  it('trims back instead of throwing when the stock cannot cover the gap', () => {
    const deal = prepareRoundDeck(fixedDeck());
    const result = drawNextTrickCards(true, [], null, deal.playerHand, deal.opponentHand.slice(1));
    expect(result.parityCorrected).toBe(true);
    expect(result.newPlayerHand.length).toBe(result.newOpponentHand.length);
  });

  it('reports no correction on a normal draw', () => {
    const deal = prepareRoundDeck(fixedDeck());
    const result = drawNextTrickCards(
      true,
      deal.roundDrawPile,
      deal.trumpCard,
      deal.playerHand.slice(1),
      deal.opponentHand.slice(1)
    );
    expect(result.parityCorrected).toBe(false);
    expect(result.newPlayerHand).toHaveLength(3);
    expect(result.newOpponentHand).toHaveLength(3);
  });
});
