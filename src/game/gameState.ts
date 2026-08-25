import { PlayingCard, Suit, DeckDefinition, BossBlind, Voucher, Joker } from '../types/game';
import { createStandardDeck, shuffleDeck, TrickClashResult, resolveTrick } from './briscola';
import { BOSS_RULES } from './bossRules';

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
  baseReward: number;
  interest: number;
  totalReward: number;
  newHighScore: boolean;
  newUnlockedDecks: string[];
  isAnte8Victory: boolean;
}

/**
 * Initializes the persistent Run Deck for a new run, applying deck perks.
 */
export function createRunDeck(deckDef: DeckDefinition): PlayingCard[] {
  let deck = createStandardDeck();

  if (deckDef.specialDeckPerk === 'bastoni_foil') {
    let foilCount = 0;
    deck = deck.map((c) => {
      if (c.suit === 'bastoni' && foilCount < 3) {
        foilCount++;
        return { ...c, edition: 'foil' as const };
      }
      return c;
    });
  } else if (deckDef.specialDeckPerk === 'holo_figures') {
    deck = deck.map((c) => {
      if (c.rank >= 8) return { ...c, edition: 'holo' as const };
      return c;
    });
  }

  return deck;
}

/**
 * Prepares the draw pile and initial deal for a round from the persistent Run Deck.
 */
export function prepareRoundDeck(runDeck: PlayingCard[]): {
  roundDrawPile: PlayingCard[];
  trumpCard: PlayingCard;
  briscolaSuit: Suit;
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
} {
  // Deep clone to avoid mutating runDeck during gameplay
  const roundDeck = shuffleDeck(runDeck.map((c) => ({ ...c })));

  const trumpCard = roundDeck.pop()!;
  const briscolaSuit = trumpCard.suit;

  const playerHand: PlayingCard[] = [];
  const opponentHand: PlayingCard[] = [];

  for (let i = 0; i < 3; i++) {
    if (roundDeck.length > 0) playerHand.push(roundDeck.pop()!);
    if (roundDeck.length > 0) opponentHand.push(roundDeck.pop()!);
  }

  return {
    roundDrawPile: roundDeck,
    trumpCard,
    briscolaSuit,
    playerHand,
    opponentHand,
  };
}

/**
 * Performs a strict card exchange for Discard to preserve the 40-card invariant.
 * Rule: Player discards 1 card -> draws 1 replacement -> discarded card is returned to the bottom of the draw pile
 * or swaps with the trump card if pile is empty.
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
  const cardIndex = playerHand.findIndex((c) => c.id === cardToDiscard.id);
  if (cardIndex === -1) {
    return {
      newPlayerHand: playerHand,
      newDrawPile: drawPile,
      newTrumpCard: trumpCard,
      success: false,
    };
  }

  let nextHand = [...playerHand];
  let nextPile = [...drawPile];
  let nextTrump = trumpCard;

  // Remove the discarded card from hand
  const [removedCard] = nextHand.splice(cardIndex, 1);

  if (nextPile.length > 0) {
    // Draw 1 card from top of draw pile
    const drawnCard = nextPile.pop()!;
    nextHand.push(drawnCard);
    // Put discarded card at bottom (unshift) of draw pile
    nextPile.unshift(removedCard);
  } else if (nextTrump) {
    // Swap with the trump card!
    nextHand.push(nextTrump);
    nextTrump = removedCard;
  } else {
    // Cannot discard when no cards remain in draw pile or trump
    return {
      newPlayerHand: playerHand,
      newDrawPile: drawPile,
      newTrumpCard: trumpCard,
      success: false,
    };
  }

  return {
    newPlayerHand: nextHand,
    newDrawPile: nextPile,
    newTrumpCard: nextTrump,
    success: true,
  };
}

/**
 * Deals cards to player and opponent after a trick following official Briscola rules.
 * Winner of the trick draws first; the trump card is the very last card drawn.
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
} {
  const nextPile = [...drawPile];
  let nextTrump = trumpCard;
  const nextPlayerHand = [...playerHand];
  const nextOpponentHand = [...opponentHand];

  const drawOne = (): PlayingCard | null => {
    if (nextPile.length > 0) {
      return nextPile.pop()!;
    }
    if (nextTrump) {
      const t = nextTrump;
      nextTrump = null;
      return t;
    }
    return null;
  };

  if (playerWonTrick) {
    const p = drawOne();
    if (p) nextPlayerHand.push(p);
    const o = drawOne();
    if (o) nextOpponentHand.push(o);
  } else {
    const o = drawOne();
    if (o) nextOpponentHand.push(o);
    const p = drawOne();
    if (p) nextPlayerHand.push(p);
  }

  return {
    newPlayerHand: nextPlayerHand,
    newOpponentHand: nextOpponentHand,
    newDrawPile: nextPile,
    newTrumpCard: nextTrump,
  };
}

/**
 * Calculates updated snapshot after a trick score is tallied.
 */
export function applyTrickResult(
  snapshot: RoundStateSnapshot,
  playerWon: boolean,
  finalTrickScore: number,
  trickPoints: number,
  bonusDollars: number = 0
): RoundStateSnapshot {
  return {
    ...snapshot,
    currentRoundScore: playerWon
      ? snapshot.currentRoundScore + finalTrickScore
      : snapshot.currentRoundScore,
    totalScore: playerWon
      ? snapshot.totalScore + finalTrickScore
      : snapshot.totalScore,
    roundPointsTaken: playerWon
      ? snapshot.roundPointsTaken + trickPoints
      : snapshot.roundPointsTaken,
    opponentPointsTaken: !playerWon
      ? snapshot.opponentPointsTaken + trickPoints
      : snapshot.opponentPointsTaken,
    roundTricksWon: playerWon
      ? snapshot.roundTricksWon + 1
      : snapshot.roundTricksWon,
    roundTricksLost: !playerWon
      ? snapshot.roundTricksLost + 1
      : snapshot.roundTricksLost,
    totalTricksWon: playerWon
      ? snapshot.totalTricksWon + 1
      : snapshot.totalTricksWon,
    totalTricksLost: !playerWon
      ? snapshot.totalTricksLost + 1
      : snapshot.totalTricksLost,
    totalBriscolaPointsPlayer: playerWon
      ? snapshot.totalBriscolaPointsPlayer + trickPoints
      : snapshot.totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent: !playerWon
      ? snapshot.totalBriscolaPointsOpponent + trickPoints
      : snapshot.totalBriscolaPointsOpponent,
    money: snapshot.money + bonusDollars,
    totalMoneyEarned: snapshot.totalMoneyEarned + bonusDollars,
  };
}

/**
 * Determines whether a round is finished (both hands are empty and draw pile is exhausted).
 */
export function isRoundFinished(
  playerHand: PlayingCard[],
  opponentHand: PlayingCard[],
  drawPile: PlayingCard[],
  trumpCard: PlayingCard | null
): boolean {
  return (
    playerHand.length === 0 &&
    opponentHand.length === 0 &&
    drawPile.length === 0 &&
    trumpCard === null
  );
}

/**
 * Calculates final round outcome from a fresh snapshot without relying on asynchronous state.
 */
export function calculateRoundOutcome(
  snapshot: RoundStateSnapshot,
  highScore: number,
  unlockedDeckIds: string[]
): RoundOutcomeResult {
  const won = snapshot.currentRoundScore >= snapshot.targetScore || snapshot.roundPointsTaken > 60;

  const baseReward = 4 + snapshot.ante;
  const interestCap = snapshot.vouchers.some((v) => v.id === 'v_interessi' && v.bought)
    ? 10
    : 5;
  const interest = Math.min(interestCap, Math.floor(snapshot.money / 5));
  const totalReward = won ? baseReward + interest : 0;

  const newHighScore = snapshot.totalScore > highScore;

  const newUnlockedDecks: string[] = [];
  if (!unlockedDeckIds.includes('deck_denari') && snapshot.money + totalReward >= 30) {
    newUnlockedDecks.push('deck_denari');
  }
  if (!unlockedDeckIds.includes('deck_spade') && snapshot.ante >= 3) {
    newUnlockedDecks.push('deck_spade');
  }
  if (!unlockedDeckIds.includes('deck_baro') && snapshot.ante >= 5) {
    newUnlockedDecks.push('deck_baro');
  }

  const isAnte8Victory = won && snapshot.ante >= 8 && snapshot.round === 3;

  return {
    won,
    baseReward,
    interest,
    totalReward,
    newHighScore,
    newUnlockedDecks,
    isAnte8Victory,
  };
}
