import { CardSpecial, Enhancement, PlayingCard } from '../types/game';

/**
 * Which modifiers are allowed to share a card.
 *
 * This is not a scoring rule and it never runs during a trick: an old card with
 * an odd combination keeps working exactly as it did. It is a rule about what
 * the game is willing to *offer*, so the shop stops proposing upgrades that
 * cancel each other out.
 *
 * Two principles, and deliberately no more:
 *
 * 1. An Azzardo is paid for by playing the card. Acciaio is paid for by NOT
 *    playing it. A card with both is strictly worse than a card with either.
 * 2. An Azzardo has to be able to land on both sides. Pietra has no suit, so a
 *    marked Pietra can never be played around - the cost of Segnata would never
 *    come due, and an Azzardo with no risk is not an Azzardo.
 */
export interface CombinationVerdict {
  valid: boolean;
  /** Why not, in Italian, for the dev console and the tests. */
  reason?: string;
}

export function isCardModifierCombinationValid(card: PlayingCard): CombinationVerdict {
  if (card.special !== 'none' && card.enhancement === 'steel') {
    return {
      valid: false,
      reason: "Acciaio premia il tenere la carta in mano, l'Azzardo il giocarla",
    };
  }

  if (card.special === 'segnata' && card.enhancement === 'stone') {
    return {
      valid: false,
      reason: 'una Pietra segnata non si può evitare: la Segnata non costerebbe nulla',
    };
  }

  return { valid: true };
}

const ALL_SPECIALS: Array<Exclude<CardSpecial, 'none'>> = [
  'segnata',
  'vetro',
  'debito',
  'traditrice',
];

const OFFERED_ENHANCEMENTS: Array<Exclude<Enhancement, 'none'>> = ['bonus', 'mult', 'steel', 'stone'];

/** The Azzardi this card could take without contradicting what it already is. */
export function allowedSpecialsFor(card: PlayingCard): Array<Exclude<CardSpecial, 'none'>> {
  return ALL_SPECIALS.filter((special) =>
    isCardModifierCombinationValid({ ...card, special }).valid
  );
}

/** The enhancements this card could take without contradicting its Azzardo. */
export function allowedEnhancementsFor(
  card: PlayingCard
): Array<Exclude<Enhancement, 'none'>> {
  return OFFERED_ENHANCEMENTS.filter((enhancement) =>
    isCardModifierCombinationValid({ ...card, enhancement }).valid
  );
}

function pick<T>(items: T[]): T | null {
  return items.length === 0 ? null : items[Math.floor(Math.random() * items.length)];
}

/**
 * Rolls what a booster is offering to do to one of your cards.
 *
 * A potenziata card is never a new card: the booster picks a card that is
 * already in the run deck and proposes a version of it wearing something. The
 * 4 di Spade Vetro is your 4 di Spade - there is no second one to be had - so
 * this always starts from the real entry, keeping its identity intact.
 *
 * Roughly half the offers are an Azzardo: a bonus with a price attached, which
 * is the interesting half. The rest is the old pure-upside roll. Both halves
 * draw only from what the combination rules allow, rather than rolling freely
 * and throwing the result away, so a steel card is simply never offered an
 * Azzardo instead of quietly re-rolling until it stops being steel.
 */
export function rollCardUpgrade(card: PlayingCard): PlayingCard {
  const next = { ...card };
  const specials = allowedSpecialsFor(card);

  if (specials.length > 0 && Math.random() < 0.5) {
    // One Azzardo per card, and it replaces whatever was there before.
    next.special = pick(specials)!;
    return next;
  }

  const roll = Math.random();
  if (roll < 0.45) {
    const edition = Math.random();
    next.edition = edition < 0.45 ? 'foil' : edition < 0.75 ? 'holo' : edition < 0.92 ? 'polychrome' : 'gold';
  }

  const enhancements = allowedEnhancementsFor(next);
  if (enhancements.length > 0 && Math.random() < 0.45) {
    next.enhancement = pick(enhancements)!;
  }

  const sealRoll = Math.random();
  if (sealRoll < 0.3) {
    const seal = Math.random();
    next.seal = seal < 0.4 ? 'red' : seal < 0.68 ? 'gold' : seal < 0.87 ? 'blue' : 'purple';
  }

  // A roll that changed nothing is not an offer worth making.
  const changed =
    next.edition !== card.edition ||
    next.enhancement !== card.enhancement ||
    next.seal !== card.seal ||
    next.special !== card.special;
  if (!changed) {
    const fallback = allowedEnhancementsFor(next).filter((e) => e !== next.enhancement);
    if (fallback.length > 0) next.enhancement = pick(fallback)!;
    else next.edition = next.edition === 'foil' ? 'holo' : 'foil';
  }

  return next;
}
