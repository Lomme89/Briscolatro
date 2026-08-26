import { describe, expect, it } from 'vitest';
import { executeUnoCard, UnoActionContext } from './unoEffects';
import { createCard } from './briscola';
import { prepareRoundDeck } from './gameState';
import { createStandardDeck } from './briscola';
import { UnoCard } from '../types/game';

const unoCard = (id: string): UnoCard => ({
  id,
  name: id,
  symbol: '+2',
  unoColor: 'red',
  description: '',
  cost: 3,
  icon: '',
  color: '',
  targetType: 'instant_run',
});

function baseContext(overrides: Partial<UnoActionContext> = {}): UnoActionContext {
  const deal = prepareRoundDeck(createStandardDeck());
  return {
    unoCard: unoCard('uno_plus_two_red'),
    drawPile: deal.roundDrawPile,
    playerHand: deal.playerHand,
    opponentHand: deal.opponentHand,
    briscolaSuit: deal.briscolaSuit,
    money: 10,
    discardsLeft: 1,
    activeJokers: [],
    maxJokers: 5,
    currentRoundScore: 0,
    bossDebuffActive: false,
    activeUnoMultiplier: 1,
    isReverseActive: false,
    ...overrides,
  };
}

describe('UNO effects never break Briscola parity', () => {
  for (const id of ['uno_plus_two_red', 'uno_plus_two_blue']) {
    it(`${id} keeps hand and stock size constant`, () => {
      const ctx = baseContext({ unoCard: unoCard(id) });
      const res = executeUnoCard(ctx);
      expect(res.newPlayerHand).toHaveLength(ctx.playerHand.length);
      expect(res.newOpponentHand).toHaveLength(ctx.opponentHand.length);
      expect(res.newDrawPile).toHaveLength(ctx.drawPile.length);
      const ids = new Set([...res.newPlayerHand, ...res.newDrawPile].map((c) => c.id));
      expect(ids.size).toBe(ctx.playerHand.length + ctx.drawPile.length);
    });
  }

  it('+2 is a no-op on cards when the stock is empty', () => {
    const ctx = baseContext({ drawPile: [] });
    const res = executeUnoCard(ctx);
    expect(res.newPlayerHand).toEqual(ctx.playerHand);
    expect(res.newRoundScore).toBe(60);
  });

  it('+2 cycles away the weakest cards, not the trump ace', () => {
    const hand = [
      createCard('denari', 1, 'standard', 'none', 'none', 'trump-ace'),
      createCard('coppe', 2, 'standard', 'none', 'none', 'junk-a'),
      createCard('spade', 4, 'standard', 'none', 'none', 'junk-b'),
    ];
    const pile = [
      createCard('bastoni', 5, 'standard', 'none', 'none', 'stock-a'),
      createCard('bastoni', 6, 'standard', 'none', 'none', 'stock-b'),
    ];
    const res = executeUnoCard(baseContext({ playerHand: hand, drawPile: pile, briscolaSuit: 'denari' }));
    expect(res.newPlayerHand.map((c) => c.id)).toContain('trump-ace');
    expect(res.newPlayerHand).toHaveLength(3);
    expect(res.newDrawPile).toHaveLength(2);
  });

  it('swap keeps both hands the same size', () => {
    const ctx = baseContext({ unoCard: unoCard('uno_swap_yellow') });
    const res = executeUnoCard(ctx);
    expect(res.newPlayerHand).toHaveLength(ctx.playerHand.length);
    expect(res.newOpponentHand).toHaveLength(ctx.opponentHand.length);
  });
});
