import { BossBlind, Joker, PlayingCard, Suit } from '../types/game';

/**
 * What the player's build pays them for, read off the table.
 *
 * The opponent is not playing Briscolatro - it has no jokers, no shop and no
 * run of its own, and giving it one would be a different game. But it is
 * sitting across from someone who does, and their jolly are face-up on the
 * felt: a person in that chair would notice that every Bastone they hand over
 * is worth eight Mult, and would stop handing them over. That is all this is.
 *
 * Everything here comes from what is visible: the jolly on the board, the
 * streak counter, the boss rule that was announced, and how many tricks are
 * left. Nothing reads the player's hand.
 *
 * The numbers are in POINT-EQUIVALENTS - the same currency as the eleven points
 * of an Asso - so they can be weighed against a real trick without inventing a
 * second economy. They are capped, on purpose: this must be a thumb on the
 * scale, never a hard counter that makes a build worthless to have built.
 */
export interface PlayerThreat {
  /** Handing over a card of this suit is worth this much to them. */
  suitBounty: Partial<Record<Suit, number>>;
  /** ...an Asso or a Tre. */
  caricoBounty: number;
  /** ...a Fante, Cavallo or Re. */
  figuraBounty: number;
  /** ...a card of the Briscola suit. */
  briscolaBounty: number;
  /** What simply letting them win the trick is worth, whatever is in it. */
  winBounty: number;
}

export const NO_THREAT: PlayerThreat = {
  suitBounty: {},
  caricoBounty: 0,
  figuraBounty: 0,
  briscolaBounty: 0,
  winBounty: 0,
};

/**
 * The exchange rate between a joker's printed numbers and points on the table.
 *
 * Rough on purpose. The opponent is reading a card across the table, not
 * running the scoring engine: it needs to know that x2 on carichi is a big deal
 * and +35 Chips is not, and it does not need to know more than that.
 */
function worth(joker: Joker): number {
  const mult = (joker.multBonus ?? 0) / 4;
  const xMult = ((joker.xMultBonus ?? 1) - 1) * 5;
  const chips = (joker.chipsBonus ?? 0) / 30;
  return mult + xMult + chips;
}

/** Nothing on one card is ever worth more than snatching an Asso. */
const PER_CARD_CAP = 8;

export interface ThreatContext {
  briscolaSuit: Suit;
  /** Tricks the player has won in a row right now. Public: it is on screen. */
  streak: number;
  /** Roughly how many tricks are left in the round. */
  remainingTricks: number;
  boss: BossBlind | null;
  /**
   * The joker the Sovrano has silenced for this trick, if any. Greyed out on
   * the rail for everyone to see, so an opponent that is paying attention knows
   * this one is not going to pay out and stops playing around it.
   */
  silencedJokerIndex?: number | null;
}

/**
 * Reads the player's board once, so the AI can ask cheap questions of it.
 *
 * Called once per trick, not once per candidate card: everything downstream is
 * a handful of lookups on the object this returns.
 */
export function readPlayerThreat(jokers: Joker[], context: ThreatContext): PlayerThreat {
  const threat: PlayerThreat = {
    suitBounty: {},
    caricoBounty: 0,
    figuraBounty: 0,
    briscolaBounty: 0,
    winBounty: 0,
  };

  const addSuit = (suit: Suit, value: number) => {
    threat.suitBounty[suit] = (threat.suitBounty[suit] ?? 0) + value;
  };

  for (let index = 0; index < jokers.length; index++) {
    // A silent jolly threatens nothing this trick: it is greyed out on the rail
    // and the opponent can see that as plainly as the player can.
    if (index === context.silencedJokerIndex) continue;

    const joker = jokers[index];
    const value = worth(joker);

    switch (joker.customEffectId) {
      case 'bastoni_mult':
        addSuit('bastoni', value);
        break;
      case 'spade_mult':
        addSuit('spade', value);
        break;
      case 'coppe_chips':
        addSuit('coppe', value);
        break;
      case 'denari_cash':
        addSuit('denari', value);
        break;
      case 'napola_combo':
        // It pays on the Asso, the Due and the Tre di Denari. Two of those are
        // carichi; the Due is not, and there is no rank bucket for it, so the
        // suit carries a share of the weight instead. A heuristic being
        // slightly generous about Denari is the harmless direction here.
        threat.caricoBounty += value;
        addSuit('denari', value * 0.3);
        break;

      case 'briscola_chips':
      case 'accumulating_mult':
        threat.briscolaBounty += value;
        break;

      case 'carichi_snatch':
      case 'legend_scopa':
        threat.caricoBounty += value;
        break;

      case 're_mida':
      case 'cavallo_boost':
      case 'accusa_bonus':
        threat.figuraBounty += value;
        break;

      case 'streak_chips':
        // A chain is worth more the longer it already is.
        threat.winBounty += value * (1 + Math.min(context.streak, 4) * 0.4);
        break;

      case 'endgame_xmult':
        // The Duellante only bites in the last three tricks.
        if (context.remainingTricks <= 3) threat.winBounty += value;
        break;

      case 'tirchio_min_power':
      case 'sottobicchiere_chips':
      case 'due_chips':
      case 'volpone_reserve':
      case 'contropiede_xmult':
      case 'temerario_mult':
      case 'restauratore_chips':
      case 'contacarte_mult':
      case 'segnapunti_mult':
      case 'liscia_win_mult':
      case 'lucky_points':
      case 'legend_sovrano':
      case 'caffe_boost':
      case 'forger_foil':
        // These pay for the win itself, whatever was in the trick.
        threat.winBounty += value;
        break;

      default:
        // Money and utility jolly (l'Oste, il Jolly Sport, lo Specchietto) do
        // not change what a single trick is worth. Ignored on purpose.
        break;
    }
  }

  // The boss rule is announced out loud, so it is fair to price it in.
  if (context.boss?.debuffType === 'half_carichi') threat.caricoBounty *= 0.5;
  if (context.boss?.debuffType === 'no_lisce_chips') threat.winBounty *= 0.8;

  return threat;
}

/**
 * What letting the player capture this specific card is worth to them, in
 * points-equivalent, on top of the card's own Briscola points.
 *
 * Capped so that no build can turn one card into an unplayable card: the
 * opponent should be reluctant, not paralysed.
 */
export function giftValue(card: PlayingCard, threat: PlayerThreat, briscolaSuit: Suit): number {
  let value = threat.suitBounty[card.suit] ?? 0;
  if (card.rank === 1 || card.rank === 3) value += threat.caricoBounty;
  if (card.rank >= 8) value += threat.figuraBounty;
  if (card.suit === briscolaSuit) value += threat.briscolaBounty;
  return Math.min(value, PER_CARD_CAP);
}

/** True when the player's board says nothing worth reacting to. */
export function isEmptyThreat(threat: PlayerThreat): boolean {
  return (
    threat.caricoBounty === 0 &&
    threat.figuraBounty === 0 &&
    threat.briscolaBounty === 0 &&
    threat.winBounty === 0 &&
    Object.keys(threat.suitBounty).length === 0
  );
}
