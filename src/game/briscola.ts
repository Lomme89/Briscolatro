import { PlayingCard, Suit, CardRank, Edition, Seal, Enhancement, CardSpecial } from '../types/game';

export const SUITS: { id: Suit; name: string; symbol: string; color: string; bgColor: string }[] = [
  { id: 'denari', name: 'Denari', symbol: '🪙', color: '#fbbf24', bgColor: '#78350f' },
  { id: 'coppe', name: 'Coppe', symbol: '🏆', color: '#f87171', bgColor: '#7f1d1d' },
  { id: 'spade', name: 'Spade', symbol: '⚔️', color: '#60a5fa', bgColor: '#1e3a8a' },
  { id: 'bastoni', name: 'Bastoni', symbol: '🪵', color: '#4ade80', bgColor: '#14532d' },
];

export interface RankDetails {
  name: string;
  shortName: string;
  points: number;
  power: number;
  isCarico: boolean;
  isFigura: boolean;
}

export const RANK_INFO: Record<CardRank, RankDetails> = {
  1: { name: 'Asso', shortName: '1', points: 11, power: 10, isCarico: true, isFigura: false },
  3: { name: 'Tre', shortName: '3', points: 10, power: 9, isCarico: true, isFigura: false },
  10: { name: 'Re', shortName: 'Re', points: 4, power: 8, isCarico: false, isFigura: true },
  9: { name: 'Cavallo', shortName: 'Cav', points: 3, power: 7, isCarico: false, isFigura: true },
  8: { name: 'Fante', shortName: 'Fan', points: 2, power: 6, isCarico: false, isFigura: true },
  7: { name: 'Sette', shortName: '7', points: 0, power: 5, isCarico: false, isFigura: false },
  6: { name: 'Sei', shortName: '6', points: 0, power: 4, isCarico: false, isFigura: false },
  5: { name: 'Cinque', shortName: '5', points: 0, power: 3, isCarico: false, isFigura: false },
  4: { name: 'Quattro', shortName: '4', points: 0, power: 2, isCarico: false, isFigura: false },
  2: { name: 'Due', shortName: '2', points: 0, power: 1, isCarico: false, isFigura: false },
};

export function createCard(
  suit: Suit,
  rank: CardRank,
  edition: Edition = 'standard',
  seal: Seal = 'none',
  enhancement: Enhancement = 'none',
  customId?: string,
  special: CardSpecial = 'none'
): PlayingCard {
  const info = RANK_INFO[rank];
  return {
    id: customId || `${suit}_${rank}_${Math.random().toString(36).substring(2, 9)}`,
    suit,
    rank,
    points: info.points,
    power: info.power,
    edition,
    seal,
    enhancement,
    special,
  };
}

export function withRank(card: PlayingCard, newRank: CardRank): PlayingCard {
  const info = RANK_INFO[newRank];
  return { ...card, rank: newRank, points: info.points, power: info.power };
}

/** Creates the standard 40-card Italian deck. Total card points = 120. */
export function createStandardDeck(): PlayingCard[] {
  const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
  const ranks: CardRank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const deck: PlayingCard[] = [];
  for (const suit of suits) for (const rank of ranks) deck.push(createCard(suit, rank));
  return shuffleDeck(deck);
}

export function shuffleDeck<T>(deck: T[]): T[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getRankDisplayName(rank: CardRank): string {
  return RANK_INFO[rank]?.name || `${rank}`;
}

export function getSuitDisplayName(suit: Suit): string {
  switch (suit) {
    case 'denari': return 'Denari';
    case 'coppe': return 'Coppe';
    case 'spade': return 'Spade';
    case 'bastoni': return 'Bastoni';
  }
}

export interface TrickClashResult {
  playerWon: boolean;
  points: number;
  rawPoints: number;
  isBriscolaTrick: boolean;
  playerIsBriscola: boolean;
  opponentIsBriscola: boolean;
  playerEffectiveSuit: Suit;
  opponentEffectiveSuit: Suit;
}

/** Stone cards have no suit at all: they match nothing and are never trump. */
function isStone(card: PlayingCard): boolean {
  return card.enhancement === 'stone';
}

function effectiveSuit(
  card: PlayingCard,
  briscolaSuit: Suit,
  belongsToOpponent: boolean,
  bossDebuff?: string
): Suit {
  // Wild is deliberately interpreted as trump in the current roguelite rules.
  if (card.enhancement === 'wild') return briscolaSuit;

  // This boss rule is asymmetric by design: opponent Spade count as trump.
  if (belongsToOpponent && bossDebuff === 'spades_are_briscola' && card.suit === 'spade') {
    return briscolaSuit;
  }
  return card.suit;
}

/**
 * Compare two cards only when normal Briscola rules say their rank is comparable
 * (same effective suit, or both trump). On the impossible/effect-generated tie,
 * the leader keeps the trick. `isReverse` reverses rank hierarchy only: it never
 * makes a non-trump beat a trump and never removes the lead-suit advantage.
 */
function leadWinsPowerComparison(lead: PlayingCard, follow: PlayingCard, isReverse = false): boolean {
  return isReverse ? lead.power <= follow.power : lead.power >= follow.power;
}

/**
 * Canonical two-player Briscola resolver.
 *
 * Rules:
 * 1. Trump beats non-trump.
 * 2. If both are trump, rank decides.
 * 3. If neither is trump and suits match, rank decides.
 * 4. If neither is trump and suits differ, the LEAD card wins.
 *
 * There is no obligation to follow suit in Briscola.
 */
export function resolveTrick(
  leadCard: PlayingCard,
  followCard: PlayingCard,
  briscolaSuit: Suit,
  leadIsPlayer: boolean,
  bossDebuff?: string,
  isReverse = false
): TrickClashResult {
  const leadBelongsToOpponent = !leadIsPlayer;
  const followBelongsToOpponent = leadIsPlayer;

  // Il Conte promotes only an opponent Spade crossing another suit. Spade vs
  // Spade is still an ordinary same-suit duel, so rank hierarchy must decide.
  const effectiveBossDebuff =
    bossDebuff === 'spades_are_briscola' && leadCard.suit === 'spade' && followCard.suit === 'spade'
      ? undefined
      : bossDebuff;

  const leadSuit = effectiveSuit(leadCard, briscolaSuit, leadBelongsToOpponent, effectiveBossDebuff);
  const followSuit = effectiveSuit(followCard, briscolaSuit, followBelongsToOpponent, effectiveBossDebuff);
  const leadIsTrump = leadSuit === briscolaSuit && !isStone(leadCard);
  const followIsTrump = followSuit === briscolaSuit && !isStone(followCard);
  // A stone card matches no suit, so a trick containing one falls through to
  // rule 4: the opener keeps it unless the other card is trump.
  const sameSuit = leadSuit === followSuit && !isStone(leadCard) && !isStone(followCard);

  let leadWon: boolean;
  if (leadIsTrump !== followIsTrump) {
    leadWon = leadIsTrump;
  } else if (leadIsTrump && followIsTrump) {
    leadWon = leadWinsPowerComparison(leadCard, followCard, isReverse);
  } else if (sameSuit) {
    leadWon = leadWinsPowerComparison(leadCard, followCard, isReverse);
  } else {
    leadWon = true;
  }

  const playerWon = leadIsPlayer ? leadWon : !leadWon;
  const playerCard = leadIsPlayer ? leadCard : followCard;
  const opponentCard = leadIsPlayer ? followCard : leadCard;
  const playerSuit = leadIsPlayer ? leadSuit : followSuit;
  const opponentSuit = leadIsPlayer ? followSuit : leadSuit;
  const playerIsTrump = playerSuit === briscolaSuit && !isStone(playerCard);
  const opponentIsTrump = opponentSuit === briscolaSuit && !isStone(opponentCard);

  const rawPoints = playerCard.points + opponentCard.points;
  let points = rawPoints;
  if (bossDebuff === 'half_carichi') {
    const adjusted = (value: number) => value >= 10 ? Math.floor(value / 2) : value;
    points = adjusted(playerCard.points) + adjusted(opponentCard.points);
  }

  return {
    playerWon,
    points,
    rawPoints,
    isBriscolaTrick: playerIsTrump || opponentIsTrump,
    playerIsBriscola: playerIsTrump,
    opponentIsBriscola: opponentIsTrump,
    playerEffectiveSuit: playerSuit,
    opponentEffectiveSuit: opponentSuit,
  };
}
