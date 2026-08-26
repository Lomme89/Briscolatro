import { PlayingCard, Suit } from '../types/game';
import { resolveTrick } from './briscola';

export interface OpponentAiContext {
  briscolaSuit: Suit;
  bossDebuff?: string;
  isReverse?: boolean;
}

function keepValue(card: PlayingCard, briscolaSuit: Suit): number {
  // Higher = more painful to spend. Preserve points and trump whenever possible.
  const trumpTax = card.suit === briscolaSuit || card.enhancement === 'wild' ? 14 : 0;
  const editionTax = card.edition === 'standard' ? 0 : 5;
  return card.points * 20 + card.power + trumpTax + editionTax;
}

/** Deterministic lead: unload the cheapest safe card first. */
export function chooseOpponentLead(
  hand: PlayingCard[],
  context: OpponentAiContext
): PlayingCard | null {
  if (hand.length === 0) return null;
  return [...hand].sort((a, b) => {
    const aTrump = a.suit === context.briscolaSuit || a.enhancement === 'wild' ? 1 : 0;
    const bTrump = b.suit === context.briscolaSuit || b.enhancement === 'wild' ? 1 : 0;
    return aTrump - bTrump || keepValue(a, context.briscolaSuit) - keepValue(b, context.briscolaSuit);
  })[0];
}

/**
 * Chooses a response using the SAME resolver as the game engine.
 * This is important because boss/wild/reverse modifiers otherwise make ad-hoc AI
 * comparisons disagree with the actual winner.
 */
export function chooseOpponentFollow(
  hand: PlayingCard[],
  playerLeadCard: PlayingCard,
  context: OpponentAiContext
): PlayingCard | null {
  if (hand.length === 0) return null;

  const evaluated = hand.map((card) => ({
    card,
    result: resolveTrick(
      playerLeadCard,
      card,
      context.briscolaSuit,
      true,
      context.bossDebuff,
      context.isReverse
    ),
  }));

  const winning = evaluated.filter(({ result }) => !result.playerWon);
  if (winning.length > 0) {
    const cheapestWinner = [...winning].sort(
      (a, b) => keepValue(a.card, context.briscolaSuit) - keepValue(b.card, context.briscolaSuit)
    )[0];

    // Take valuable tricks. For a zero-point table, do not burn an expensive trump/carico
    // unless the winning card itself is cheap.
    if (playerLeadCard.points > 0 || keepValue(cheapestWinner.card, context.briscolaSuit) <= 18) {
      return cheapestWinner.card;
    }
  }

  // Lose as cheaply as possible while preserving valuable cards/trumps.
  return [...hand].sort(
    (a, b) => keepValue(a, context.briscolaSuit) - keepValue(b, context.briscolaSuit)
  )[0];
}
