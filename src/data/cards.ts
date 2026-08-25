import { PlayingCard, Suit, CardRank, Edition, Seal, Enhancement } from '../types/game';

export const SUITS: { id: Suit; name: string; symbol: string; color: string; bgColor: string }[] = [
  { id: 'denari', name: 'Denari', symbol: '🪙', color: '#fbbf24', bgColor: '#78350f' },
  { id: 'coppe', name: 'Coppe', symbol: '🏆', color: '#f87171', bgColor: '#7f1d1d' },
  { id: 'spade', name: 'Spade', symbol: '⚔️', color: '#60a5fa', bgColor: '#1e3a8a' },
  { id: 'bastoni', name: 'Bastoni', symbol: '🪵', color: '#4ade80', bgColor: '#14532d' },
];

export const RANK_INFO: Record<CardRank, { name: string; shortName: string; points: number; power: number; isCarico: boolean; isFigura: boolean }> = {
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

export function createStandardDeck(): PlayingCard[] {
  const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
  const ranks: CardRank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const deck: PlayingCard[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      const info = RANK_INFO[rank];
      deck.push({
        id: `${suit}_${rank}_${Math.random().toString(36).substring(2, 7)}`,
        suit,
        rank,
        points: info.points,
        power: info.power,
        edition: 'standard',
        seal: 'none',
        enhancement: 'none',
      });
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck<T>(deck: T[]): T[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
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

/**
 * Resolves a Briscola trick according to Italian rules:
 * - If only one card is of the Briscola suit, that card wins.
 * - If both cards are of the Briscola suit, the one with higher power wins.
 * - If neither card is of the Briscola suit:
 *    - If the second card has the SAME suit as the leading card, higher power wins.
 *    - If the second card has a DIFFERENT suit from the leading card, the leading card wins!
 */
export function resolveTrick(
  leadCard: PlayingCard,
  followCard: PlayingCard,
  briscolaSuit: Suit,
  leadIsPlayer: boolean,
  bossDebuff?: string,
  isReverse?: boolean
): { playerWon: boolean; points: number; isBriscolaTrick: boolean } {
  let playerCard = leadIsPlayer ? leadCard : followCard;
  let opponentCard = leadIsPlayer ? followCard : leadCard;

  let effectivePlayerSuit = playerCard.enhancement === 'wild' ? briscolaSuit : playerCard.suit;
  let effectiveOpponentSuit = opponentCard.enhancement === 'wild' ? briscolaSuit : opponentCard.suit;

  if (bossDebuff === 'spades_are_briscola') {
    if (opponentCard.suit === 'spade') effectiveOpponentSuit = briscolaSuit;
  }

  const isPlayerBriscola = effectivePlayerSuit === briscolaSuit;
  const isOpponentBriscola = effectiveOpponentSuit === briscolaSuit;

  let playerWon = false;

  const comparePower = (p1: number, p2: number) => {
    return isReverse ? p1 < p2 : p1 > p2;
  };

  if (leadIsPlayer) {
    // Player played first
    if (isPlayerBriscola && !isOpponentBriscola) {
      playerWon = isReverse ? false : true;
    } else if (!isPlayerBriscola && isOpponentBriscola) {
      playerWon = isReverse ? true : false;
    } else if (isPlayerBriscola && isOpponentBriscola) {
      playerWon = comparePower(playerCard.power, opponentCard.power);
    } else {
      // Neither is briscola
      if (effectiveOpponentSuit === effectivePlayerSuit) {
        playerWon = comparePower(playerCard.power, opponentCard.power);
      } else {
        // Opponent played a different suit, lead player retains trick!
        playerWon = true;
      }
    }
  } else {
    // Opponent played first
    if (isOpponentBriscola && !isPlayerBriscola) {
      playerWon = isReverse ? true : false;
    } else if (!isOpponentBriscola && isPlayerBriscola) {
      playerWon = isReverse ? false : true;
    } else if (isOpponentBriscola && isPlayerBriscola) {
      playerWon = comparePower(playerCard.power, opponentCard.power);
    } else {
      // Neither is briscola
      if (effectivePlayerSuit === effectiveOpponentSuit) {
        playerWon = comparePower(playerCard.power, opponentCard.power);
      } else {
        // Player played a different suit than lead, opponent retains trick!
        playerWon = false;
      }
    }
  }

  let totalPoints = playerCard.points + opponentCard.points;
  if (bossDebuff === 'half_carichi') {
    if (playerCard.points >= 10) totalPoints -= Math.floor(playerCard.points / 2);
    if (opponentCard.points >= 10) totalPoints -= Math.floor(opponentCard.points / 2);
  }

  return {
    playerWon,
    points: totalPoints,
    isBriscolaTrick: isPlayerBriscola || isOpponentBriscola,
  };
}
