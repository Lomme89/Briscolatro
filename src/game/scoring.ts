import { PlayingCard, Suit, Joker, BossBlind } from '../types/game';
import { TrickClashResult } from './briscola';
import { JOKER_EFFECTS, JokerScoringContext, JokerStatGrowth } from './jokerEffects';
import { resolveSpecialForTrick, SpecialTrickOutcome } from './specialCards';

/** Side effects a trick's seals produced, applied by the caller. */
export interface SealEvents {
  /** A blue seal rolled a free UNO action card. */
  spawnUnoCard: boolean;
  /** A purple seal on the played card refunded a discard. */
  extraDiscards: number;
}

export interface TrickScoreCalculation {
  /** Why base Mult is what it is, for the tally overlay. */
  baseMultReasons: string[];
  sealEvents: SealEvents;
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
  statGrowth: JokerStatGrowth[];
  /** What the played card's Azzardo did. Lost tricks resolve it outside here. */
  special: SpecialTrickOutcome;
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
  disabledJokerIndex: number | null = null,
  /** The player opened this trick rather than answering it: Traditrice cares. */
  playerLed: boolean = true
): TrickScoreCalculation {
  let baseChips = 20;
  let bonusChips = 0;
  let bonusMult = 0;
  let xMult = activeUnoMultiplier;
  let bonusDollars = 0;

  // Boss debuff: Gigi il Tagliatore removes base chips for lisce (0 pt)
  if (currentBoss?.debuffType === 'no_lisce_chips' && playerCard.points === 0) {
    baseChips = 5;
  }

  // Base chips from card points
  baseChips += playerCard.points * 3;

  /**
   * Base Mult is what the trick itself was worth, the way a poker hand's rank is
   * in Balatro. It used to be a hard-coded 1, which quietly broke the whole
   * economy: every "+Chips" joker was worthless (chips were never multiplied by
   * anything) and every "+Mult" joker was a 9x swing on its own.
   *
   * Tying it to what you captured also puts the scoring back on top of real
   * Briscola: carichi and figure are exactly what you are fighting over.
   */
  const capturedCards = clashResult.playerWon ? [playerCard, opponentCard] : [];
  const carichiCaptured = capturedCards.filter((c) => c.rank === 1 || c.rank === 3).length;
  const figureCaptured = capturedCards.filter((c) => c.rank >= 8 && c.rank <= 10).length;
  const baseMult =
    1 +
    carichiCaptured +
    (figureCaptured > 0 ? 1 : 0) +
    (clashResult.playerWon && clashResult.playerIsBriscola ? 1 : 0);

  const sealEvents: SealEvents = { spawnUnoCard: false, extraDiscards: 0 };

  // --- The played card's own contribution ---------------------------------
  // A red seal retriggers it, exactly once, the way Balatro's does.
  const retriggers = playerCard.seal === 'red' ? 2 : 1;

  for (let pass = 0; pass < retriggers; pass++) {
    // Editions
    if (playerCard.edition === 'foil') {
      bonusChips += 50;
    } else if (playerCard.edition === 'holo') {
      bonusMult += 10;
    } else if (playerCard.edition === 'polychrome') {
      xMult *= 1.5;
    } else if (playerCard.edition === 'gold') {
      bonusDollars += 1;
    }

    // Enhancements
    switch (playerCard.enhancement) {
      case 'bonus':
        bonusChips += 30;
        break;
      case 'mult':
        bonusMult += 4;
        break;
      case 'stone':
        bonusChips += 50;
        break;
      default:
        break;
    }

    // The retrigger repeats the card's point chips too.
    if (pass > 0) bonusChips += playerCard.points * 3;
    bonusChips += playerCard.customBonusChips || 0;
    bonusMult += playerCard.customBonusMult || 0;
  }

  if (playerCard.seal === 'purple') sealEvents.extraDiscards += 1;

  // Steel pays for being HELD, not played.
  for (const held of jokerContext.playerHand) {
    if (held.enhancement === 'steel') xMult *= 1.5;
  }

  // --- The captured card ---------------------------------------------------
  if (clashResult.playerWon) {
    if (opponentCard.edition === 'foil') bonusChips += 25;
    if (opponentCard.edition === 'holo') bonusMult += 5;
    if (opponentCard.edition === 'polychrome') xMult *= 1.25;
    if (opponentCard.edition === 'gold') bonusDollars += 2;

    // Seals pay out on capture, on either card in the trick.
    for (const card of [playerCard, opponentCard]) {
      if (card.seal === 'gold') bonusDollars += 2;
      if (card.seal === 'blue' && Math.random() < 0.2) sealEvents.spawnUnoCard = true;
    }
  }

  // --- The Azzardo on the played card -------------------------------------
  // This branch only ever runs on a won trick, so the outcome here is the good
  // half; App resolves the other half (a Vetro breaking, a Traditrice charging)
  // when the trick is lost.
  const special = resolveSpecialForTrick({
    card: playerCard,
    playerLed,
    playerWon: clashResult.playerWon,
    money: jokerContext.money,
  });
  bonusChips += special.chipsToAdd;
  bonusMult += special.multToAdd;
  xMult *= special.xMultToMultiply;
  bonusDollars += special.dollarsToAdd;

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

  const baseMultReasons: string[] = [];
  if (carichiCaptured > 0) baseMultReasons.push(`${carichiCaptured} Carico${carichiCaptured > 1 ? 'i' : ''} +${carichiCaptured}`);
  if (figureCaptured > 0) baseMultReasons.push('Figura +1');
  if (clashResult.playerWon && clashResult.playerIsBriscola) baseMultReasons.push('Briscola +1');
  baseMultReasons.push(...special.reasons);

  return {
    sealEvents,
    baseMultReasons,
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
    statGrowth: jokerMod.statGrowth,
    special,
  };
}
