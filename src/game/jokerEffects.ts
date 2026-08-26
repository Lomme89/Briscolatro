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
      if (joker.id === 'j_cavaliere_nero') {
        let cavalliCount = 0;
        if (playerCard.rank === 9) cavalliCount++;
        if (opponentCard.rank === 9) cavalliCount++;
        if (cavalliCount > 0) {
          chipsToAdd += cavalliCount * 80;
          multToAdd += cavalliCount * 4;
          didTrigger = true;
        }
      }

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
            let briscolaCount = 0;
            if (playerCard.suit === briscolaSuit) briscolaCount++;
            if (opponentCard.suit === briscolaSuit) briscolaCount++;
            if (briscolaCount > 0) {
              chipsToAdd += briscolaCount * (joker.chipsBonus || 60);
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
            let reCount = 0;
            if (playerCard.rank === 10) reCount++;
            if (opponentCard.rank === 10) reCount++;
            if (reCount > 0) {
              chipsToAdd += reCount * (joker.chipsBonus || 120);
              dollarsToAdd += reCount * (joker.dollarsBonus || 2);
              didTrigger = true;
            }
            break;
          }

          case 'j_strega_vesuvio': {
            // Grows for the whole RUN: without a source of permanent scaling the
            // player's power plateaus after two jokers while the target keeps
            // climbing, and the late antes become unreachable by arithmetic.
            // Conditional on purpose - unconditional growth outruns any curve.
            const banked = joker.stats?.accumulatedMult || 0;
            multToAdd += banked;
            const tookBriscola =
              clashResult.playerIsBriscola || clashResult.opponentIsBriscola;
            if (tookBriscola) {
              multToAdd += 1;
              statGrowth.push({ jokerId: joker.id, addMult: 1 });
            }
            didTrigger = banked > 0 || tookBriscola;
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

          case 'j_alchimista_oro':
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
