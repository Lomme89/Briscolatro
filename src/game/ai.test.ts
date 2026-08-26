import { describe, expect, it } from 'vitest';
import { chooseOpponentFollow, chooseOpponentLead } from './ai';
import { createCard, resolveTrick } from './briscola';
import { PlayingCard } from '../types/game';

const c = (suit: Parameters<typeof createCard>[0], rank: Parameters<typeof createCard>[1], id?: string) =>
  createCard(suit, rank, 'standard', 'none', 'none', id || `${suit}_${rank}_${Math.random()}`);

describe('opponent AI', () => {
  it('always returns a card that belongs to its hand', () => {
    const hand: PlayingCard[] = [c('coppe', 2, 'a'), c('denari', 4, 'b'), c('spade', 1, 'c')];
    const lead = chooseOpponentLead(hand, { briscolaSuit: 'denari' });
    expect(lead).not.toBeNull();
    expect(hand.some((card) => card.id === lead!.id)).toBe(true);
  });

  it('uses canonical resolver to take a valuable trick when possible', () => {
    const playerLead = c('coppe', 1, 'player-ace');
    const hand = [c('bastoni', 2, 'throw'), c('denari', 2, 'cheap-trump'), c('spade', 1, 'expensive')];
    const chosen = chooseOpponentFollow(hand, playerLead, { briscolaSuit: 'denari' });
    expect(chosen).not.toBeNull();
    const result = resolveTrick(playerLead, chosen!, 'denari', true);
    expect(result.playerWon).toBe(false);
  });

  it('returns null for an empty hand instead of inventing a card', () => {
    expect(chooseOpponentLead([], { briscolaSuit: 'denari' })).toBeNull();
    expect(chooseOpponentFollow([], c('coppe', 2), { briscolaSuit: 'denari' })).toBeNull();
  });
});
