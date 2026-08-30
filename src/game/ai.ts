import { CardRank, PlayingCard, Suit } from '../types/game';
import { resolveTrick } from './briscola';
import { NEUTRAL_PROFILE, OpponentAiProfile } from './aiProfiles';
import { giftValue, PlayerThreat } from './opponentThreat';
import { randomRun } from './runRng';

export interface OpponentAiContext {
  briscolaSuit: Suit;
  bossDebuff?: string;
  isReverse?: boolean;
  /**
   * The player cards the opponent is allowed to know about: Segnata cards, and
   * only those. Build it with visiblePlayerCards - never hand over the hand.
   */
  knownPlayerCards?: PlayingCard[];
  /** Who is sitting across the table. Missing means the house policy. */
  profile?: OpponentAiProfile;
  /**
   * Every card that has been face-up on this table so far, both sides. This is
   * the same record a player keeps in their head, and it is the ONLY thing
   * memory reads: nothing here reveals a card that has not already been seen.
   */
  playedCards?: PlayingCard[];
  /**
   * What the player's build pays them for, read off their face-up jolly by
   * readPlayerThreat. Absent means an opponent that is not looking.
   */
  playerThreat?: PlayerThreat;
}

function profileOf(context: OpponentAiContext): OpponentAiProfile {
  return context.profile ?? NEUTRAL_PROFILE;
}

/**
 * What handing this card to the player is worth to their build, in points, as
 * far as this opponent is willing to notice.
 *
 * One multiplication and a couple of lookups: the threat itself was read once
 * for the whole trick, so this stays cheap enough to call for every candidate.
 */
function gift(
  card: PlayingCard,
  context: OpponentAiContext,
  profile: OpponentAiProfile
): number {
  const threat = context.playerThreat;
  if (!threat) return 0;
  return giftValue(card, threat, context.briscolaSuit) * profile.denial;
}

function isTrump(card: PlayingCard, briscolaSuit: Suit): boolean {
  return card.suit === briscolaSuit || card.enhancement === 'wild';
}

/**
 * What it costs to throw this card away under a trick you are losing.
 *
 * Here the points hurt: they are leaving your pile for theirs. This is the
 * knob Nonna Assunta has turned all the way up - she would rather lose four
 * tricks in a row than let an Asso go under one of them.
 *
 * At the neutral profile this is exactly the number the AI used before any of
 * this existed, so the house policy plays the game it always played.
 */
function discardCost(
  card: PlayingCard,
  briscolaSuit: Suit,
  profile: OpponentAiProfile
): number {
  return (
    card.points * (12 + 16 * profile.pointThrift) +
    card.power +
    (isTrump(card, briscolaSuit) ? 8 + 12 * profile.trumpThrift : 0) +
    (card.edition === 'standard' ? 0 : 5)
  );
}

/**
 * What it costs to spend this card to WIN a trick.
 *
 * Its points are not part of the price - you keep them either way - so what you
 * are really paying is a card that could have taken a better trick later. This
 * is why a thrifty player refuses to take a worthless trick with the Asso di
 * Briscola while an impatient one does it happily.
 */
function winCost(
  card: PlayingCard,
  briscolaSuit: Suit,
  profile: OpponentAiProfile
): number {
  return (
    // Spending a strong card is what actually costs you: it is the trick it
    // could have taken later. Quadratic, because the gap between an Asso and a
    // Sette is nothing like the gap between a Sette and a Sei.
    card.power * card.power * 0.4 * (0.6 + profile.pointThrift) +
    // The mistake pointSpending measures: charging yourself for points that come
    // come straight back to your own pile when the trick is yours. At 0 that is
    // the full price of the card, so the carichi stay in hand and wait for a
    // moment of their own choosing.
    card.points * 8 * (1 - profile.pointSpending) +
    (isTrump(card, briscolaSuit) ? 8 + 12 * profile.trumpThrift : 0) +
    (card.edition === 'standard' ? 0 : 5)
  );
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

const ALL_RANKS: CardRank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const POWER_BY_RANK: Record<CardRank, number> = {
  1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1,
};

/**
 * Could anything still out there beat this card, if it opened the trick?
 *
 * Counted the way a player counts: everything seen face-up on the table, plus
 * the cards in my own hand, is accounted for; whatever is left is still live.
 * That over-counts - some of those cards are buried in the stock and may never
 * arrive - which is the safe direction to be wrong in. It says "certain" only
 * when it is certain.
 *
 * A non-trump card is only ever safe once the trumps are gone, which is why
 * this almost never fires early and starts mattering exactly when a real
 * player's counting starts mattering.
 */
function isUnbeatableLead(
  card: PlayingCard,
  hand: PlayingCard[],
  context: OpponentAiContext
): boolean {
  const seen = context.playedCards;
  if (!seen || seen.length === 0) return false;

  const accounted = new Set<string>();
  for (const c of [...seen, ...hand]) accounted.add(`${c.suit}_${c.rank}`);

  const stillOut = (suit: Suit, rank: CardRank) => !accounted.has(`${suit}_${rank}`);
  const cardIsTrump = isTrump(card, context.briscolaSuit);

  // Anything of the same suit that outranks it.
  for (const rank of ALL_RANKS) {
    if (POWER_BY_RANK[rank] <= card.power) continue;
    if (stillOut(card.suit, rank)) return false;
  }

  if (cardIsTrump) return true;

  // A non-trump falls to any trump at all.
  for (const rank of ALL_RANKS) {
    if (stillOut(context.briscolaSuit, rank)) return false;
  }
  return true;
}

/**
 * Picks from a ranked list, letting the profile be human about it.
 *
 * The alternative it can fall to is the second-best line, never a worse one:
 * two runs of the same round should not play out identically, but an opponent
 * that throws away an Asso for variety is not a character, it is a bug.
 */
function pickWithNoise<T>(ranked: T[], profile: OpponentAiProfile): T {
  if (ranked.length > 1 && randomRun() < profile.noise) return ranked[1];
  return ranked[0];
}

/** Opens the trick with whatever this opponent thinks costs it the least. */
export function chooseOpponentLead(
  hand: PlayingCard[],
  context: OpponentAiContext
): PlayingCard | null {
  if (hand.length === 0) return null;
  const profile = profileOf(context);

  const cost = (card: PlayingCard): number => {
    // A cautious player opens with whatever hurts least to lose. Someone who
    // plays to be seen discounts that fear and reaches for a card that can
    // actually hold the trick - which is the same instinct, priced differently.
    let value =
      discardCost(card, context.briscolaSuit, profile) * (1 - 0.8 * profile.leadRisk) -
      card.power * 8 * profile.leadRisk;

    // Opening with trump commits it; a thrifty player would rather not.
    if (isTrump(card, context.briscolaSuit)) value += 10 + 40 * profile.trumpThrift;

    // The suit they always come back to.
    if (profile.favouriteSuit && card.suit === profile.favouriteSuit) value -= 14;

    // A card nothing left can beat is free money: lead it and collect. The
    // payoff scales with what the card was worth protecting, because that is
    // exactly what counting bought - the certainty that it can be cashed. It is
    // enough to make even the most cautious opener reach for a Re.
    if (isUnbeatableLead(card, hand, context)) {
      value -= (60 + discardCost(card, context.briscolaSuit, profile) * 0.9) * profile.memory;
    }

    // Opening with it is not the same as handing it over - it only feeds them
    // if they take the trick - so the same fear applies at a discount.
    value += gift(card, context, profile) * 12;

    value += markedCardRisk(card, context);
    return value;
  };

  const ranked = [...hand].sort((a, b) => cost(a) - cost(b));
  return pickWithNoise(ranked, profile);
}

/**
 * Answers a trick using the SAME resolver as the game engine.
 *
 * This matters because boss, wild and reverse modifiers otherwise make ad-hoc
 * AI comparisons disagree with the actual winner.
 *
 * The decision is a price: what lands in a pile if the trick is taken, against
 * what the card that takes it is worth. Every profile weighs the same two
 * numbers - they just disagree about the exchange rate, which is what makes one
 * opponent feel greedy and another feel patient.
 */
export function chooseOpponentFollow(
  hand: PlayingCard[],
  playerLeadCard: PlayingCard,
  context: OpponentAiContext
): PlayingCard | null {
  if (hand.length === 0) return null;
  const profile = profileOf(context);

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

  // A card thrown under a lost trick lands in their pile and feeds whatever is
  // printed on their jolly, so what it is worth to THEM is part of what it
  // costs to throw. Same currency as its points, so it just adds on.
  const throwCost = (card: PlayingCard) =>
    discardCost(card, context.briscolaSuit, profile) + gift(card, context, profile) * 20;

  const losers = [...hand].sort((a, b) => throwCost(a) - throwCost(b));

  const winners = evaluated
    .filter(({ result }) => !result.playerWon)
    .map(({ card }) => card)
    .sort(
      (a, b) => winCost(a, context.briscolaSuit, profile) - winCost(b, context.briscolaSuit, profile)
    );

  if (winners.length > 0) {
    // What is actually at stake: their points come to me if I take it, and my
    // cheapest throw-away goes to them if I do not. The second half of that is
    // what a distracted player forgets, so pointSpending decides how much of it
    // much of it reaches the decision.
    const stake = playerLeadCard.points + losers[0].points * profile.pointSpending;
    const willPay = stake * (10 + 14 * profile.aggression) + (4 + 28 * profile.aggression);

    if (winCost(winners[0], context.briscolaSuit, profile) <= willPay) {
      return pickWithNoise(winners, profile);
    }
  }

  return pickWithNoise(losers, profile);
}
