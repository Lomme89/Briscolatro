import { describe, expect, it } from 'vitest';
import { createStandardDeck } from './briscola';
import { drawNextTrickCards, performExchangeDiscard, prepareRoundDeck } from './gameState';

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
