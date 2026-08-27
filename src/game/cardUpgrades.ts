import { CardSpecial, PlayingCard } from '../types/game';

/**
 * Rolls what a booster is offering to do to one of your cards.
 *
 * A potenziata card is never a new card: the booster picks a card that is
 * already in the run deck and proposes a version of it wearing something. The
 * 4 di Spade Vetro is your 4 di Spade - there is no second one to be had - so
 * this always starts from the real entry, keeping its identity intact.
 *
 * Roughly half the offers are an Azzardo: a bonus with a price attached, which
 * is the interesting half. The rest is the old pure-upside roll.
 */
export function rollCardUpgrade(card: PlayingCard): PlayingCard {
  const next = { ...card };

  if (Math.random() < 0.5) {
    // One Azzardo per card, and it replaces whatever was there before.
    const specials: CardSpecial[] = ['segnata', 'vetro', 'debito', 'traditrice'];
    next.special = specials[Math.floor(Math.random() * specials.length)];
    return next;
  }

  const roll = Math.random();
  if (roll < 0.45) {
    const edition = Math.random();
    next.edition = edition < 0.45 ? 'foil' : edition < 0.75 ? 'holo' : edition < 0.92 ? 'polychrome' : 'gold';
  }

  const enhancementRoll = Math.random();
  if (enhancementRoll < 0.45) {
    // No more glass here: its coin flip is exactly what the Azzardo Vetro
    // replaces, and two things called Vetro would be one too many.
    const e = Math.random();
    next.enhancement = e < 0.35 ? 'bonus' : e < 0.7 ? 'mult' : e < 0.88 ? 'steel' : 'stone';
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
  if (!changed) next.enhancement = Math.random() < 0.5 ? 'bonus' : 'mult';

  return next;
}
