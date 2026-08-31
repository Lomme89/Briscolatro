import { describe, expect, it } from 'vitest';
import { createCard, createStandardDeck, resolveTrick } from './briscola';

const c = (suit: Parameters<typeof createCard>[0], rank: Parameters<typeof createCard>[1]) =>
  createCard(suit, rank, 'standard', 'none', 'none', `${suit}_${rank}`);

describe('canonical Briscola rules', () => {
  it('standard deck has 40 unique cards and 120 points', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(40);
    expect(new Set(deck.map((card) => card.id)).size).toBe(40);
    expect(deck.reduce((sum, card) => sum + card.points, 0)).toBe(120);
  });

  it('off-suit non-trump follower cannot steal the lead', () => {
    const result = resolveTrick(c('coppe', 2), c('bastoni', 1), 'denari', true);
    expect(result.playerWon).toBe(true);
  });

  it('higher same-suit follower wins', () => {
    const result = resolveTrick(c('coppe', 2), c('coppe', 7), 'denari', true);
    expect(result.playerWon).toBe(false);
  });

  it('trump beats non-trump regardless of lead', () => {
    expect(resolveTrick(c('coppe', 1), c('denari', 2), 'denari', true).playerWon).toBe(false);
    expect(resolveTrick(c('denari', 2), c('coppe', 1), 'denari', true).playerWon).toBe(true);
  });

  it('maps winner correctly when opponent leads', () => {
    // Opponent leads low coppe; player follows higher coppe => player wins.
    const result = resolveTrick(c('coppe', 2), c('coppe', 7), 'denari', false);
    expect(result.playerWon).toBe(true);
  });

  it('reverse reverses rank hierarchy, not trump precedence', () => {
    // Lower same suit wins under reverse.
    expect(resolveTrick(c('coppe', 7), c('coppe', 2), 'denari', true, undefined, true).playerWon).toBe(false);
    // Trump still beats a non-trump even in reverse mode.
    expect(resolveTrick(c('coppe', 1), c('denari', 2), 'denari', true, undefined, true).playerWon).toBe(false);
  });
});
