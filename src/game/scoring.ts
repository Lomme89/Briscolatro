import { PlayingCard, Suit, Joker, BossBlind } from '../types/game';
import { TrickClashResult } from './briscola';
import { JOKER_EFFECTS, JokerScoringContext } from './jokerEffects';

export interface TrickScoreCalculation {
  baseChips: number;
  bonusChips: number;
  totalChips: number;
  baseMult: number;
  bonusMult: number;
  xMult: number;
  totalMult: number;
  finalScore: number;
  bonusDollars: number;
  triggeredJokerIds: string[];
  transmutedCard?: { suit: Suit; edition: 'foil' };
}

export function calculateTrickScore(
  playerCard: PlayingCard,
  opponentCard: PlayingCard,
  clashResult: TrickClashResult,
  briscolaSuit: Suit,
  activeJokers: Joker[],
  currentBoss: BossBlind | null,
  jokerContext: Omit<JokerScoringContext, 'playerCard' | 'opponentCard' | 'clashResult' | 'briscolaSuit' | 'disabledJokerIndex'>,
  activeUnoMultiplier: number = 1.0,
  disabledJokerIndex: number | null = null
): TrickScoreCalculation {
  let baseChips = 20;
  let bonusChips = 0;
  let baseMult = 1;
  let bonusMult = 0;
  let xMult = activeUnoMultiplier;
  let bonusDollars = 0;

  // Boss debuff: Gigi il Tagliatore removes base chips for lisce (0 pt)
  if (currentBoss?.debuffType === 'no_lisce_chips' && playerCard.points === 0) {
    baseChips = 5;
  }

  // Base chips from card points
  baseChips += playerCard.points * 3;

  // Edition bonuses on player card
  if (playerCard.edition === 'foil') {
    bonusChips += 50;
  } else if (playerCard.edition === 'holo') {
    bonusMult += 10;
  } else if (playerCard.edition === 'polychrome') {
    xMult *= 1.5;
  } else if (playerCard.edition === 'gold') {
    bonusDollars += 1;
  }

  // Edition bonuses on captured opponent card (if player won trick)
  if (clashResult.playerWon) {
    if (opponentCard.edition === 'foil') bonusChips += 25;
    if (opponentCard.edition === 'holo') bonusMult += 5;
    if (opponentCard.edition === 'polychrome') xMult *= 1.25;
    if (opponentCard.edition === 'gold') bonusDollars += 2;
  }

  // Apply Joker effects
  const fullJokerContext: JokerScoringContext = {
    ...jokerContext,
    playerCard,
    opponentCard,
    clashResult,
    briscolaSuit,
    disabledJokerIndex,
  };

  const jokerMod = JOKER_EFFECTS.applyJokersToTrick(activeJokers, fullJokerContext);
  bonusChips += jokerMod.chipsToAdd;
  bonusMult += jokerMod.multToAdd;
  xMult *= jokerMod.xMultToMultiply;
  bonusDollars += jokerMod.dollarsToAdd;

  const totalChips = Math.max(1, baseChips + bonusChips);
  const totalMult = Math.max(1, Math.round((baseMult + bonusMult) * xMult));
  const finalScore = totalChips * totalMult;

  return {
    baseChips,
    bonusChips,
    totalChips,
    baseMult,
    bonusMult,
    xMult,
    totalMult,
    finalScore,
    bonusDollars,
    triggeredJokerIds: jokerMod.triggeredJokerIds,
    transmutedCard: jokerMod.transmutedCard,
  };
}
