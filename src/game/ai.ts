import { PlayingCard, Suit } from '../types/game';
import { resolveTrick } from './briscola';

export interface OpponentAiContext {
  briscolaSuit: Suit;
  bossDebuff?: string;
  isReverse?: boolean;
  /**
   * The player cards the opponent is allowed to know about: Segnata cards, and
   * only those. Build it with visiblePlayerCards - never hand over the hand.
   */
  knownPlayerCards?: PlayingCard[];
}

function keepValue(card: PlayingCard, briscolaSuit: Suit): number {
  // Higher = more painful to spend. Preserve points and trump whenever possible.
  const trumpTax = card.suit === briscolaSuit || card.enhancement === 'wild' ? 14 : 0;
  const editionTax = card.edition === 'standard' ? 0 : 5;
  return card.points * 20 + card.power + trumpTax + editionTax;
}

/**
 * How bad it would be to open with this card, knowing what we know.
 *
 * A Segnata card is public: the opponent knows that exact card is in the hand
 * across the table. It uses it the way a player would - it does not walk points
 * into a card it can see will take them - and that is the whole extent of it.
 * No hand reading, no lookahead.
 */
function markedCardRisk(card: PlayingCard, context: OpponentAiContext): number {
  const known = context.knownPlayerCards;
  if (!known || known.length === 0 || card.points === 0) return 0;

  const beaten = known.some(
    (playerCard) =>
      resolveTrick(card, playerCard, context.briscolaSuit, false, context.bossDebuff, context.isReverse)
        .playerWon
  );
  return beaten ? card.points * 20 : 0;
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
    return (
      aTrump - bTrump ||
      keepValue(a, context.briscolaSuit) +
        markedCardRisk(a, context) -
        (keepValue(b, context.briscolaSuit) + markedCardRisk(b, context))
    );
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
