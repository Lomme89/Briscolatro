import { Joker, PlayingCard, Suit } from '../types/game';
import { isBriscolaInHand, TrickClashResult } from './briscola';

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
  /** Tricks lost back to back immediately before this one. Il Contropiede. */
  consecutiveLossStreak?: number;
  /**
   * Ranks already face-up in the PREVIOUS tricks of this match, never this one:
   * Il Contacarte must not be able to satisfy itself with the card it is
   * looking at.
   */
  seenRanksBeforeTrick?: Set<number>;
  /** Raw Briscola points taken so far this round, BEFORE this trick lands. */
  roundPointsTaken?: number;
  opponentPointsTaken?: number;
  /**
   * The played card's Azzardo actually paid out this trick. Il Temerario asks
   * for the outcome, not for the badge: a Traditrice that answered and won has
   * the badge and no payout, and pays the Temerario nothing.
   */
  azzardoPaidOff?: boolean;
}

/** Il Conto Sospeso wakes up at this much real spending inside one shop. */
export const CONTO_SOSPESO_SPEND_THRESHOLD = 8;

/** Permanent growth a joker earned this trick, kept for the rest of the run. */
export interface JokerStatGrowth {
  /** The owned copy that earned it. `jokerId` remains useful for telemetry. */
  jokerInstanceId: string;
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
  /**
   * The Falsario asks for one non-Foil card of the run deck to become Foil.
   * It never names a suit or a rank: the forty identities stay untouched.
   */
  foilRandomCard: boolean;
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
    let foilRandomCard = false;

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
      consecutiveLossStreak = 0,
      seenRanksBeforeTrick,
      roundPointsTaken = 0,
      opponentPointsTaken = 0,
      azzardoPaidOff = false,
    } = ctx;

    jokers.forEach((joker, index) => {
      // If disabled by boss debuff, skip
      if (disabledJokerIndex !== null && index === disabledJokerIndex) {
        return;
      }

      let didTrigger = false;
      const growthTarget = joker.instanceId || joker.id;

      // PASSIVE JOKERS (Apply regardless of who won)
      if (joker.id === 'j_jolly_sport') {
        if (money > 0) {
          multToAdd += money;
          didTrigger = true;
        }
      }

      // Il Conto Sospeso pays out what the shops already bought it. The growth
      // itself is banked at the till (applyShopSpend), never here.
      if (joker.id === 'j_conto_sospeso') {
        const banked = joker.stats?.accumulatedMult || 0;
        if (banked > 0) {
          multToAdd += banked;
          didTrigger = true;
        }
      }

      // ON-CARD-SCORED JOKERS
      if (joker.id === 'j_sovrano_briscolatro') {
        // A legendary should be an engine by itself, not a slightly bigger common.
        chipsToAdd += (joker.chipsBonus ?? 0) + (joker.stats?.accumulatedChips || 0);
        xMultToMultiply *= joker.xMultBonus ?? 1;
        if (clashResult.playerWon) statGrowth.push({ jokerId: joker.id, jokerInstanceId: growthTarget, addChips: 25 });
        didTrigger = true;
      }

      // ON-TRICK-WIN JOKERS (Only trigger when player won the trick)
      if (clashResult.playerWon) {
        switch (joker.id) {
          case 'j_carrettiere':
            if (playerCard.suit === 'bastoni' || opponentCard.suit === 'bastoni') {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_orafo': {
            let denariCount = 0;
            if (playerCard.suit === 'denari') denariCount++;
            if (opponentCard.suit === 'denari') denariCount++;
            if (denariCount > 0) {
              chipsToAdd += denariCount * (joker.chipsBonus ?? 0);
              dollarsToAdd += denariCount * (joker.dollarsBonus ?? 0);
              didTrigger = true;
            }
            break;
          }

          case 'j_spadaccino':
            if (playerCard.suit === 'spade') {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_cantina':
            if (playerCard.suit === 'coppe' || opponentCard.suit === 'coppe') {
              chipsToAdd += joker.chipsBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_sbaraglio':
            if (playerCard.points === 0) {
              multToAdd += joker.multBonus ?? 0;
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
              chipsToAdd += clashResult.points * (joker.chipsBonus ?? 0);
              if (capturedBriscola) chipsToAdd += 30;
              didTrigger = true;
            }
            break;
          }

          case 'j_tirchio': {
            // `playerHand` is the hand AFTER the card left it, so the pre-play
            // hand is that plus the card: nothing else needs threading in. A
            // tie on the minimum still counts as the cheapest card.
            const wasCheapest = playerHand.every((card) => card.power >= playerCard.power);
            if (wasCheapest) {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;
          }

          case 'j_sottobicchiere':
            // Effective suits, so a Wild counts as the trump it plays as.
            if (
              !clashResult.playerIsBriscola &&
              clashResult.playerEffectiveSuit !== clashResult.opponentEffectiveSuit
            ) {
              chipsToAdd += joker.chipsBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_due_di_picche':
            // The Due the PLAYER put down. Capturing theirs pays nothing.
            if (playerCard.rank === 2) {
              chipsToAdd += joker.chipsBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_vecchio_volpone':
            // Won without spending trump, and still holding trump afterwards.
            if (
              !clashResult.playerIsBriscola &&
              playerHand.some((card) => isBriscolaInHand(card, briscolaSuit))
            ) {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_contropiede':
            // Armed at two losses in a row, and stays armed through any further
            // loss; the win that collects it also ends the streak.
            if (consecutiveLossStreak >= 2) {
              xMultToMultiply *= joker.xMultBonus ?? 1;
              didTrigger = true;
            }
            break;

          case 'j_temerario':
            // Flat, and only flat: whatever the Azzardo itself paid has already
            // been counted by the time this runs.
            if (playerCard.special !== 'none' && azzardoPaidOff) {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_restauratore': {
            // Categories present, not how much each one is worth: a Foil with a
            // Sigillo Rosso is two categories, never four.
            const categories =
              (playerCard.edition !== 'standard' ? 1 : 0) +
              (playerCard.enhancement !== 'none' ? 1 : 0) +
              (playerCard.seal !== 'none' ? 1 : 0) +
              (playerCard.special !== 'none' ? 1 : 0);
            if (categories > 0) {
              chipsToAdd += categories * (joker.chipsBonus ?? 0);
              didTrigger = true;
            }
            break;
          }

          case 'j_contacarte':
            // Only ranks from earlier tricks: the set is built before this
            // trick's two cards join the record, so it cannot satisfy itself.
            if (seenRanksBeforeTrick?.has(opponentCard.rank)) {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_segnapunti':
            // Raw Briscola points, read BEFORE this trick is added. Level is
            // not behind, so a tie pays nothing.
            if (roundPointsTaken < opponentPointsTaken) {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;

          case 'j_cacciatore_carichi':
            if (opponentCard.points >= 10) {
              xMultToMultiply *= joker.xMultBonus ?? 1;
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
            if (opponentCard.rank === 10) value += joker.chipsBonus ?? 0;
            if (playerCard.rank === 10 && clashResult.points > 4) {
              value += Math.round((joker.chipsBonus ?? 0) / 2);
            }
            if (value > 0) {
              chipsToAdd += value;
              if (opponentCard.rank === 10) dollarsToAdd += joker.dollarsBonus ?? 0;
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
              chips += joker.chipsBonus ?? 0;
              mult += joker.multBonus ?? 0;
            }
            if (playerCard.rank === 9 && clashResult.points > 3) {
              chips += Math.round((joker.chipsBonus ?? 0) / 2);
              mult += Math.floor((joker.multBonus ?? 0) / 2);
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
              statGrowth.push({ jokerId: joker.id, jokerInstanceId: growthTarget, addMult: 1 });
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
              statGrowth.push({ jokerId: joker.id, jokerInstanceId: growthTarget, addChips: 10 });
            }
            didTrigger = banked > 0 || consecutiveWinStreak > 0;
            break;
          }

          case 'j_napola_cosmica': {
            // Fire on the transition from incomplete to complete. Once 1-2-3
            // are banked in the encounter, later won tricks must stay quiet.
            const wasComplete = [1, 2, 3].every((rank) => capturedDenariRanksThisRound.has(rank));
            const capturedNow = new Set(capturedDenariRanksThisRound);
            for (const card of [playerCard, opponentCard]) {
              if (card.suit === 'denari') capturedNow.add(card.rank);
            }
            const isComplete = [1, 2, 3].every((rank) => capturedNow.has(rank));
            if (!wasComplete && isComplete) {
              // Declared growth is additive on the xMult: 3.00, 3.05, 3.10.
              xMultToMultiply *= (joker.xMultBonus ?? 1) + (joker.stats?.accumulatedMult || 0);
              statGrowth.push({ jokerId: joker.id, jokerInstanceId: growthTarget, addMult: 0.05 });
              didTrigger = true;
            }
            break;
          }

          case 'j_falsario':
            foilRandomCard = true;
            didTrigger = true;
            break;

          case 'j_duellante': {
            // A rare that BUILDS: every endgame trick it takes is worth a
            // permanent sliver of xMult. Multiplicative growth is the only thing
            // that keeps pace with the late blinds.
            if (remainingTricksCount <= 3) {
              // Additive permanent xMult: 2.5, 2.6, 2.7... and nowhere else.
              xMultToMultiply *= (joker.xMultBonus ?? 1) + (joker.stats?.accumulatedMult || 0);
              statGrowth.push({ jokerId: joker.id, jokerInstanceId: growthTarget, addMult: 0.1 });
              didTrigger = true;
            }
            break;
          }

          case 'j_accusa_reale': {
            // Check if player holds Re (10) and Cavallo (9) of the same suit in hand
            const suitsWithRe = new Set(playerHand.filter((c) => c.rank === 10).map((c) => c.suit));
            const hasAccusa = playerHand.some((c) => c.rank === 9 && suitsWithRe.has(c.suit));
            if (hasAccusa) {
              multToAdd += joker.multBonus ?? 0;
              didTrigger = true;
            }
            break;
          }

          case 'j_caffe_corretto':
            if (totalTricksPlayedThisRound === 0) {
              xMultToMultiply *= joker.xMultBonus ?? 1;
              didTrigger = true;
            }
            break;

          case 'j_superstizione': {
            const p = clashResult.points;
            if (p === 3 || p === 7 || p === 13 || p % 10 === 3 || p % 10 === 7) {
              xMultToMultiply *= joker.xMultBonus ?? 1;
              didTrigger = true;
            }
            break;
          }

          case 'j_scopa_galattica': {
            const hasAsso = playerCard.rank === 1 || opponentCard.rank === 1;
            const hasTre = playerCard.rank === 3 || opponentCard.rank === 3;
            if (hasAsso && hasTre) {
              xMultToMultiply *= joker.xMultBonus ?? 1;
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
      foilRandomCard,
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
      const ownedId = joker.instanceId || joker.id;
      const earned = growth.filter((g) => g.jokerInstanceId === ownedId);
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
   * Il Conto Sospeso, settled at the till.
   *
   * The caller owns the per-shop bookkeeping - how much has really been spent
   * on this visit, and which copies already collected - because both are
   * transient by design: only the +1 Mult it earns is permanent, and that lives
   * in the joker's stats like every other growth in the game.
   */
  applyShopSpend(
    jokers: Joker[],
    spentThisShop: number,
    alreadyPaidInstanceIds: ReadonlySet<string>
  ): { jokers: Joker[]; paidInstanceIds: string[] } {
    if (spentThisShop < CONTO_SOSPESO_SPEND_THRESHOLD) return { jokers, paidInstanceIds: [] };

    const paidInstanceIds: string[] = [];
    const growth: JokerStatGrowth[] = [];
    for (const joker of jokers) {
      if (joker.id !== 'j_conto_sospeso') continue;
      const ownedId = joker.instanceId || joker.id;
      if (alreadyPaidInstanceIds.has(ownedId)) continue;
      paidInstanceIds.push(ownedId);
      growth.push({ jokerId: joker.id, jokerInstanceId: ownedId, addMult: joker.multBonus ?? 1 });
    }
    if (growth.length === 0) return { jokers, paidInstanceIds };
    return { jokers: JOKER_EFFECTS.applyStatGrowth(jokers, growth), paidInstanceIds };
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
