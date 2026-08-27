import { Joker, PlayingCard, Suit } from '../types/game';
import { TrickClashResult } from './briscola';

export interface JokerScoringContext {
  playerCard: PlayingCard;
  opponentCard: PlayingCard;
  clashResult: TrickClashResult;
  briscolaSuit: Suit;
  money: number;
  playerHand: PlayingCard[];
  tricksWonThisRound: number;
  consecutiveWinStreak: number;
  totalTricksPlayedThisRound: number;
  remainingTricksCount: number;
  capturedDenariRanksThisRound: Set<number>;
  disabledJokerIndex: number | null;
}

/** Permanent growth a joker earned this trick, kept for the rest of the run. */
export interface JokerStatGrowth {
  jokerId: string;
  addMult?: number;
  addChips?: number;
}

export interface JokerScoringModifier {
  chipsToAdd: number;
  multToAdd: number;
  xMultToMultiply: number;
  dollarsToAdd: number;
  triggeredJokerIds: string[];
  transmutedCard?: { suit: Suit; edition: 'foil' };
  statGrowth: JokerStatGrowth[];
}

export const JOKER_EFFECTS = {
  /**
   * Applies all active joker triggers to a trick clash.
   */
  applyJokersToTrick(
    jokers: Joker[],
    ctx: JokerScoringContext
  ): JokerScoringModifier {
    let chipsToAdd = 0;
    let multToAdd = 0;
    let xMultToMultiply = 1.0;
    let dollarsToAdd = 0;
    const triggeredJokerIds: string[] = [];
    const statGrowth: JokerStatGrowth[] = [];
    let transmutedCard: { suit: Suit; edition: 'foil' } | undefined = undefined;

    const {
      playerCard,
      opponentCard,
      clashResult,
      briscolaSuit,
      money,
      playerHand,
      tricksWonThisRound,
      consecutiveWinStreak,
      totalTricksPlayedThisRound,
      remainingTricksCount,
      capturedDenariRanksThisRound,
      disabledJokerIndex,
    } = ctx;

    jokers.forEach((joker, index) => {
      // If disabled by boss debuff, skip
      if (disabledJokerIndex !== null && index === disabledJokerIndex) {
        return;
      }

      let didTrigger = false;

      // PASSIVE JOKERS (Apply regardless of who won)
      if (joker.id === 'j_jolly_sport') {
        if (money > 0) {
          multToAdd += money;
          didTrigger = true;
        }
      }

      // ON-CARD-SCORED JOKERS
      if (joker.id === 'j_sovrano_briscolatro') {
        // A legendary should be an engine by itself, not a slightly bigger common.
        chipsToAdd += 100 + (joker.stats?.accumulatedChips || 0);
        xMultToMultiply *= 1.5;
        if (clashResult.playerWon) statGrowth.push({ jokerId: joker.id, addChips: 25 });
        didTrigger = true;
      }

      // ON-TRICK-WIN JOKERS (Only trigger when player won the trick)
      if (clashResult.playerWon) {
        switch (joker.id) {
          case 'j_carrettiere':
            if (playerCard.suit === 'bastoni' || opponentCard.suit === 'bastoni') {
              multToAdd += joker.multBonus || 8;
              didTrigger = true;
            }
            break;

          case 'j_orafo': {
            let denariCount = 0;
            if (playerCard.suit === 'denari') denariCount++;
            if (opponentCard.suit === 'denari') denariCount++;
            if (denariCount > 0) {
              chipsToAdd += denariCount * (joker.chipsBonus || 35);
              dollarsToAdd += denariCount * (joker.dollarsBonus || 1);
              didTrigger = true;
            }
            break;
          }

          case 'j_spadaccino':
            if (playerCard.suit === 'spade') {
              multToAdd += joker.multBonus || 10;
              didTrigger = true;
            }
            break;

          case 'j_cantina':
            if (playerCard.suit === 'coppe' || opponentCard.suit === 'coppe') {
              chipsToAdd += joker.chipsBonus || 50;
              didTrigger = true;
            }
            break;

          case 'j_sbaraglio':
            if (playerCard.points === 0) {
              multToAdd += joker.multBonus || 14;
              didTrigger = true;
            }
            break;

          case 'j_briscola_folle': {
            // It paid sixty Chips for a Briscola being in the trick, which is
            // the same money for taking an Asso and for burning a trump on a
            // liscia - and the second one is bad Briscola. Now it pays for what
            // the Briscola actually brought home, so a trump spent on nothing
            // earns nothing.
            const wonWithBriscola = clashResult.playerIsBriscola;
            const capturedBriscola = clashResult.opponentIsBriscola;
            if ((wonWithBriscola || capturedBriscola) && clashResult.points > 0) {
              chipsToAdd += clashResult.points * 8;
              if (capturedBriscola) chipsToAdd += 30;
              didTrigger = true;
            }
            break;
          }

          case 'j_cacciatore_carichi':
            if (opponentCard.points >= 10) {
              xMultToMultiply *= joker.xMultBonus || 2.0;
              didTrigger = true;
            }
            break;

          case 'j_re_mida': {
            // It used to pay for a Re being in the trick at all, your own
            // included, which made "cash the Re" a scoring move rather than a
            // Briscola one. Now it pays for taking THEIR Re off them; your own
            // Re still counts, but only when the trick actually captured
            // something beyond the Re itself.
            let value = 0;
            if (opponentCard.rank === 10) value += joker.chipsBonus || 150;
            if (playerCard.rank === 10 && clashResult.points > 4) {
              value += Math.round((joker.chipsBonus || 150) / 2);
            }
            if (value > 0) {
              chipsToAdd += value;
              if (opponentCard.rank === 10) dollarsToAdd += joker.dollarsBonus || 2;
              didTrigger = true;
            }
            break;
          }

          case 'j_cavaliere_nero': {
            // This one used to fire on LOST tricks too: dropping a Cavallo under
            // a trick you were throwing away paid full price. Same rule as the
            // Re Mida now - the capture is what is worth something.
            let chips = 0;
            let mult = 0;
            if (opponentCard.rank === 9) {
              chips += 90;
              mult += 5;
            }
            if (playerCard.rank === 9 && clashResult.points > 3) {
              chips += 45;
              mult += 2;
            }
            if (chips > 0) {
              chipsToAdd += chips;
              multToAdd += mult;
              didTrigger = true;
            }
            break;
          }

          case 'j_vesuvio': {
            // Grows for the whole RUN: without a source of permanent scaling the
            // player's power plateaus after two jokers while the target keeps
            // climbing, and the late antes become unreachable by arithmetic.
            // Conditional on purpose - unconditional growth outruns any curve.
            const banked = joker.stats?.accumulatedMult || 0;
            multToAdd += banked;
            // Growth is earned by a Briscola that TOOK something. Burning a
            // trump on a worthless trick used to bank the same permanent Mult
            // as winning the Asso with it, which rewarded the worse play and
            // let the engine spin up far too fast in the first antes.
            const briscolaEarnedIt =
              (clashResult.playerIsBriscola || clashResult.opponentIsBriscola) &&
              clashResult.points > 0;
            if (briscolaEarnedIt) {
              multToAdd += 1;
              statGrowth.push({ jokerId: joker.id, addMult: 1 });
            }
            didTrigger = banked > 0 || briscolaEarnedIt;
            break;
          }

          case 'j_barone_briscola': {
            // Permanent chip growth, earned by taking tricks back to back.
            const banked = joker.stats?.accumulatedChips || 0;
            chipsToAdd += banked;
            if (consecutiveWinStreak > 0) {
              chipsToAdd += 30;
              statGrowth.push({ jokerId: joker.id, addChips: 10 });
            }
            didTrigger = banked > 0 || consecutiveWinStreak > 0;
            break;
          }

          case 'j_napola_cosmica': {
            // Check if player has captured or played 1, 2, and 3 of Denari this round
            const has1 = capturedDenariRanksThisRound.has(1) || (playerCard.suit === 'denari' && playerCard.rank === 1) || (opponentCard.suit === 'denari' && opponentCard.rank === 1);
            const has2 = capturedDenariRanksThisRound.has(2) || (playerCard.suit === 'denari' && playerCard.rank === 2) || (opponentCard.suit === 'denari' && opponentCard.rank === 2);
            const has3 = capturedDenariRanksThisRound.has(3) || (playerCard.suit === 'denari' && playerCard.rank === 3) || (opponentCard.suit === 'denari' && opponentCard.rank === 3);
            const grownNapola = 1 + (joker.stats?.accumulatedMult || 0) / 20;
            if (has1 && has2 && has3) {
              xMultToMultiply *= (joker.xMultBonus || 3.0) * grownNapola;
              statGrowth.push({ jokerId: joker.id, addMult: 1 });
              didTrigger = true;
            }
            break;
          }

          case 'j_falsario':
            transmutedCard = { suit: 'denari', edition: 'foil' };
            didTrigger = true;
            break;

          case 'j_duellante': {
            // A rare that BUILDS: every endgame trick it takes is worth a
            // permanent sliver of xMult. Multiplicative growth is the only thing
            // that keeps pace with the late blinds.
            const grown = 1 + (joker.stats?.accumulatedMult || 0) / 10;
            if (remainingTricksCount <= 3) {
              xMultToMultiply *= (joker.xMultBonus || 2.5) * grown;
              statGrowth.push({ jokerId: joker.id, addMult: 1 });
              didTrigger = true;
            } else if (grown > 1) {
              xMultToMultiply *= grown;
              didTrigger = true;
            }
            break;
          }

          case 'j_accusa_reale': {
            // Check if player holds Re (10) and Cavallo (9) of the same suit in hand
            const suitsWithRe = new Set(playerHand.filter((c) => c.rank === 10).map((c) => c.suit));
            const hasAccusa = playerHand.some((c) => c.rank === 9 && suitsWithRe.has(c.suit));
            if (hasAccusa) {
              multToAdd += joker.multBonus || 40;
              didTrigger = true;
            }
            break;
          }

          case 'j_caffe_corretto':
            if (totalTricksPlayedThisRound === 0) {
              xMultToMultiply *= joker.xMultBonus || 2.0;
              didTrigger = true;
            }
            break;

          case 'j_superstizione': {
            const p = clashResult.points;
            if (p === 3 || p === 7 || p === 13 || p % 10 === 3 || p % 10 === 7) {
              xMultToMultiply *= joker.xMultBonus || 3.5;
              didTrigger = true;
            }
            break;
          }

          case 'j_scopa_galattica': {
            const hasAsso = playerCard.rank === 1 || opponentCard.rank === 1;
            const hasTre = playerCard.rank === 3 || opponentCard.rank === 3;
            if (hasAsso && hasTre) {
              xMultToMultiply *= joker.xMultBonus || 4.0;
              didTrigger = true;
            }
            break;
          }
        }
      }

      if (didTrigger) {
        triggeredJokerIds.push(joker.id);
      }
    });

    return {
      chipsToAdd,
      multToAdd,
      xMultToMultiply,
      dollarsToAdd,
      triggeredJokerIds,
      transmutedCard,
      statGrowth,
    };
  },

  /**
   * Banks the permanent growth a trick produced. Returns a new array so the
   * jokers stay immutable; stats live for the whole run and reset with it.
   */
  applyStatGrowth(jokers: Joker[], growth: JokerStatGrowth[]): Joker[] {
    if (growth.length === 0) return jokers;
    return jokers.map((joker) => {
      const earned = growth.filter((g) => g.jokerId === joker.id);
      if (earned.length === 0) return joker;
      const stats = { ...(joker.stats || {}) };
      for (const entry of earned) {
        if (entry.addMult) stats.accumulatedMult = (stats.accumulatedMult || 0) + entry.addMult;
        if (entry.addChips) stats.accumulatedChips = (stats.accumulatedChips || 0) + entry.addChips;
        stats.timesTriggered = (stats.timesTriggered || 0) + 1;
      }
      return { ...joker, stats };
    });
  },

  /**
   * Applies round-end joker effects (e.g. L'Oste del Bar).
   */
  getRoundEndBonusDollars(jokers: Joker[], money: number): number {
    let bonus = 0;
    jokers.forEach((j) => {
      if (j.id === 'j_oste') {
        bonus += Math.min(5, Math.floor(money / 5));
      }
    });
    return bonus;
  },

  /**
   * Returns additional discards provided by jokers (e.g. Il Caffe Corretto).
   */
  getExtraDiscards(jokers: Joker[]): number {
    let extra = 0;
    jokers.forEach((j) => {
      if (j.id === 'j_caffe_corretto') {
        extra += 1;
      }
    });
    return extra;
  },
};
