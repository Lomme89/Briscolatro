import { PlayingCard, Suit, DeckDefinition, BossBlind, Voucher, Joker } from '../types/game';
import { createStandardDeck, shuffleDeck } from './briscola';

export interface RoundStateSnapshot {
  currentRoundScore: number;
  totalScore: number;
  roundPointsTaken: number;
  opponentPointsTaken: number;
  roundTricksWon: number;
  roundTricksLost: number;
  totalTricksWon: number;
  totalTricksLost: number;
  totalBriscolaPointsPlayer: number;
  totalBriscolaPointsOpponent: number;
  money: number;
  totalMoneyEarned: number;
  targetScore: number;
  ante: number;
  round: number;
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
  drawPile: PlayingCard[];
  trumpCard: PlayingCard | null;
  briscolaSuit: Suit;
  activeBoss: BossBlind | null;
  vouchers: Voucher[];
  activeJokers: Joker[];
}

export interface RoundOutcomeResult {
  won: boolean;
  /** Took more than 60 of the 120 Briscola points: pays a cash bonus. */
  briscolaMajority: boolean;
  briscolaBonus: number;
  baseReward: number;
  interest: number;
  totalReward: number;
  newHighScore: boolean;
  newUnlockedDecks: string[];
  isAnte8Victory: boolean;
}

/**
 * Blind targets.
 *
 * These numbers are measured, not guessed: `src/game/__sim__` plays whole runs
 * with the real engine, AI and scoring, and each ante is set to roughly a third
 * to a half of what a reference build scores there. The step between antes is
 * widest where the run's power spikes (x4.4 into ante 3, when the shop has
 * finally armed a build) and narrows to x2.0 at the end, because the player's
 * own scaling decelerates once the joker slots are full - a constant multiplier
 * would either trivialise the mid-game or wall the end of the run.
 *
 * Ante 1 keeps the traditional 300: it is beatable with no jokers at all, and it
 * is the only blind that is.
 */
export const ANTE_BASE_TARGETS = [300, 900, 4000, 11000, 28000, 70000, 150000, 300000];

/** Small blind, big blind, boss blind. */
export const BLIND_TARGET_MULTIPLIERS: Record<number, number> = { 1: 1, 2: 1.5, 3: 2 };

export function getBlindTargetScore(
  ante: number,
  round: number,
  options: { bossMultiplier?: number; deckMultiplier?: number } = {}
): number {
  const capped = Math.min(ante, ANTE_BASE_TARGETS.length);
  let base = ANTE_BASE_TARGETS[capped - 1];
  // Endless antes beyond the table keep climbing at the final ratio.
  for (let extra = ANTE_BASE_TARGETS.length; extra < ante; extra++) base *= 1.7;

  const blind = BLIND_TARGET_MULTIPLIERS[round] ?? 1;
  const boss = options.bossMultiplier ?? 1;
  const deck = options.deckMultiplier ?? 1;
  return Math.round(base * blind * boss * deck);
}

export function createRunDeck(deckDef: DeckDefinition): PlayingCard[] {
  let deck = createStandardDeck();
  if (deckDef.specialDeckPerk === 'bastoni_foil') {
    let foilCount = 0;
    deck = deck.map((card) => {
      if (card.suit === 'bastoni' && foilCount < 3) {
        foilCount++;
        return { ...card, edition: 'foil' as const };
      }
      return card;
    });
  } else if (deckDef.specialDeckPerk === 'holo_figures') {
    deck = deck.map((card) => card.rank >= 8 ? { ...card, edition: 'holo' as const } : card);
  }
  return deck;
}

/**
 * Adds a shop/booster card to the persistent run deck by REPLACING the least
 * valuable plain card instead of appending.
 *
 * Two-player Briscola needs an even deck: the stock is dealt in pairs and the
 * face-up trump is the last card drawn. A 41-card run deck leaves one card
 * over at the end of the round and desynchronises the two hands, so cards
 * bought in the shop take the place of an existing one.
 */
export function addCardToRunDeck(runDeck: PlayingCard[], newCard: PlayingCard): PlayingCard[] {
  if (runDeck.length === 0) return [newCard];

  const isPlain = (card: PlayingCard) =>
    card.edition === 'standard' && card.seal === 'none' && card.enhancement === 'none';

  const candidates = runDeck.filter(isPlain);
  const pool = candidates.length > 0 ? candidates : runDeck;
  const weakest = [...pool].sort((a, b) => a.points - b.points || a.power - b.power)[0];

  const index = runDeck.findIndex((card) => card.id === weakest.id);
  const next = [...runDeck];
  next[index] = newCard;
  return next;
}

export function prepareRoundDeck(runDeck: PlayingCard[]): {
  roundDrawPile: PlayingCard[];
  trumpCard: PlayingCard;
  briscolaSuit: Suit;
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
} {
  if (runDeck.length < 7) throw new Error('Run deck too small to start a Briscola round');

  const roundDeck = shuffleDeck(runDeck.map((card) => ({ ...card })));
  const trumpCard = roundDeck.pop()!;
  const playerHand: PlayingCard[] = [];
  const opponentHand: PlayingCard[] = [];

  for (let i = 0; i < 3; i++) {
    const playerCard = roundDeck.pop();
    const opponentCard = roundDeck.pop();
    if (!playerCard || !opponentCard) throw new Error('Invalid initial Briscola deal');
    playerHand.push(playerCard);
    opponentHand.push(opponentCard);
  }

  return { roundDrawPile: roundDeck, trumpCard, briscolaSuit: trumpCard.suit, playerHand, opponentHand };
}

/**
 * Roguelite discard = exchange with stock. We intentionally DISALLOW it once
 * the normal stock is empty: swapping with the face-up trump corrupts the
 * official final-draw sequence and can make turn parity confusing.
 */
export function performExchangeDiscard(
  cardToDiscard: PlayingCard,
  playerHand: PlayingCard[],
  drawPile: PlayingCard[],
  trumpCard: PlayingCard | null
): {
  newPlayerHand: PlayingCard[];
  newDrawPile: PlayingCard[];
  newTrumpCard: PlayingCard | null;
  success: boolean;
} {
  const cardIndex = playerHand.findIndex((card) => card.id === cardToDiscard.id);
  if (cardIndex === -1 || drawPile.length === 0) {
    return { newPlayerHand: playerHand, newDrawPile: drawPile, newTrumpCard: trumpCard, success: false };
  }

  const nextHand = [...playerHand];
  const nextPile = [...drawPile];
  const [removedCard] = nextHand.splice(cardIndex, 1);
  const drawnCard = nextPile.pop()!;
  nextHand.push(drawnCard);
  nextPile.unshift(removedCard); // bottom of stock

  return { newPlayerHand: nextHand, newDrawPile: nextPile, newTrumpCard: trumpCard, success: true };
}

/**
 * Winner draws first. The face-up trump is the final card drawn.
 *
 * Both hands must stay the same size for the rest of the round to be playable.
 * If a card effect ever leaves them asymmetric this rebalances instead of
 * throwing: an exception here used to abort the trick half-applied and freeze
 * the round with the tally overlay stuck on screen. `parityCorrected` reports
 * that a bug upstream had to be papered over.
 */
export function drawNextTrickCards(
  playerWonTrick: boolean,
  drawPile: PlayingCard[],
  trumpCard: PlayingCard | null,
  playerHand: PlayingCard[],
  opponentHand: PlayingCard[]
): {
  newPlayerHand: PlayingCard[];
  newOpponentHand: PlayingCard[];
  newDrawPile: PlayingCard[];
  newTrumpCard: PlayingCard | null;
  parityCorrected: boolean;
} {
  const nextPile = [...drawPile];
  let nextTrump = trumpCard;
  const nextPlayerHand = [...playerHand];
  const nextOpponentHand = [...opponentHand];

  const drawOne = (): PlayingCard | null => {
    const fromPile = nextPile.pop();
    if (fromPile) return fromPile;
    if (!nextTrump) return null;
    const lastTrump = nextTrump;
    nextTrump = null;
    return lastTrump;
  };

  const firstHand = playerWonTrick ? nextPlayerHand : nextOpponentHand;
  const secondHand = playerWonTrick ? nextOpponentHand : nextPlayerHand;
  const first = drawOne();
  if (first) firstHand.push(first);
  const second = drawOne();
  if (second) secondHand.push(second);

  // A legal two-player Briscola stock always deals symmetrically. The only
  // expected asymmetry is transient INSIDE drawOne; after the pair it must be gone.
  let parityCorrected = false;
  while (nextPlayerHand.length !== nextOpponentHand.length) {
    const shorterHand =
      nextPlayerHand.length < nextOpponentHand.length ? nextPlayerHand : nextOpponentHand;
    const extra = drawOne();
    if (!extra) break;
    shorterHand.push(extra);
    parityCorrected = true;
  }

  if (nextPlayerHand.length !== nextOpponentHand.length) {
    // The stock could not cover the gap: trim the longer hand back so the round
    // can still be played out to its last trick.
    parityCorrected = true;
    const longerHand =
      nextPlayerHand.length > nextOpponentHand.length ? nextPlayerHand : nextOpponentHand;
    const shorterLength = Math.min(nextPlayerHand.length, nextOpponentHand.length);
    nextPile.unshift(...longerHand.splice(shorterLength));
  }

  if (parityCorrected && typeof console !== 'undefined') {
    console.warn(
      `[briscola] hand parity had to be corrected (player=${nextPlayerHand.length}, opponent=${nextOpponentHand.length}). A card effect changed a hand size.`
    );
  }

  return {
    newPlayerHand: nextPlayerHand,
    newOpponentHand: nextOpponentHand,
    newDrawPile: nextPile,
    newTrumpCard: nextTrump,
    parityCorrected,
  };
}

export function applyTrickResult(
  snapshot: RoundStateSnapshot,
  playerWon: boolean,
  finalTrickScore: number,
  trickPoints: number,
  bonusDollars = 0
): RoundStateSnapshot {
  return {
    ...snapshot,
    currentRoundScore: playerWon ? snapshot.currentRoundScore + finalTrickScore : snapshot.currentRoundScore,
    totalScore: playerWon ? snapshot.totalScore + finalTrickScore : snapshot.totalScore,
    roundPointsTaken: playerWon ? snapshot.roundPointsTaken + trickPoints : snapshot.roundPointsTaken,
    opponentPointsTaken: playerWon ? snapshot.opponentPointsTaken : snapshot.opponentPointsTaken + trickPoints,
    roundTricksWon: playerWon ? snapshot.roundTricksWon + 1 : snapshot.roundTricksWon,
    roundTricksLost: playerWon ? snapshot.roundTricksLost : snapshot.roundTricksLost + 1,
    totalTricksWon: playerWon ? snapshot.totalTricksWon + 1 : snapshot.totalTricksWon,
    totalTricksLost: playerWon ? snapshot.totalTricksLost : snapshot.totalTricksLost + 1,
    totalBriscolaPointsPlayer: playerWon
      ? snapshot.totalBriscolaPointsPlayer + trickPoints
      : snapshot.totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent: playerWon
      ? snapshot.totalBriscolaPointsOpponent
      : snapshot.totalBriscolaPointsOpponent + trickPoints,
    money: snapshot.money + bonusDollars,
    totalMoneyEarned: snapshot.totalMoneyEarned + bonusDollars,
  };
}

export function isRoundFinished(
  playerHand: PlayingCard[],
  opponentHand: PlayingCard[],
  drawPile: PlayingCard[],
  trumpCard: PlayingCard | null
): boolean {
  return playerHand.length === 0 && opponentHand.length === 0 && drawPile.length === 0 && trumpCard === null;
}

export function calculateRoundOutcome(
  snapshot: RoundStateSnapshot,
  highScore: number,
  unlockedDeckIds: string[]
): RoundOutcomeResult {
  // ONE win condition. Taking the majority of the Briscola points used to be an
  // alternative victory, which made the target score decorative at low antes and
  // the only survivable route at high ones; neither number carried any tension.
  // The Briscola match is now scored for money instead: it still decides how the
  // run is funded, without deciding the blind.
  const won = snapshot.currentRoundScore >= snapshot.targetScore;
  const briscolaMajority = snapshot.roundPointsTaken > 60;
  const briscolaBonus = briscolaMajority ? 4 : 0;
  const baseReward = 4 + snapshot.ante;
  const interestCap = snapshot.vouchers.some((voucher) => voucher.id === 'v_interessi' && voucher.bought) ? 10 : 5;
  const interest = Math.min(interestCap, Math.floor(snapshot.money / 5));
  const totalReward = won ? baseReward + interest + briscolaBonus : 0;
  const newHighScore = snapshot.totalScore > highScore;

  const newUnlockedDecks: string[] = [];
  if (!unlockedDeckIds.includes('deck_denari') && snapshot.money + totalReward >= 30) newUnlockedDecks.push('deck_denari');
  if (!unlockedDeckIds.includes('deck_spade') && snapshot.ante >= 3) newUnlockedDecks.push('deck_spade');
  if (!unlockedDeckIds.includes('deck_baro') && snapshot.ante >= 5) newUnlockedDecks.push('deck_baro');

  return {
    won,
    briscolaMajority,
    briscolaBonus,
    baseReward,
    interest,
    totalReward,
    newHighScore,
    newUnlockedDecks,
    isAnte8Victory: won && snapshot.ante >= 8 && snapshot.round === 3,
  };
}
