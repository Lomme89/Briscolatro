import { BossBlind, Suit, PlayingCard } from '../types/game';
import { getActiveBossRules, getBriscolaRotationPeriod } from './endlessBosses';
import { pickRun } from './runRng';

/**
 * Does this Boss enforce this rule right now?
 *
 * A campaign Boss has exactly one; an Endless Boss has its own plus whatever
 * modifiers were rolled on top. Every check below goes through here, so a
 * composed Boss enforces all of its rules and nothing has to know which of them
 * came from where.
 */
function bossEnforces(boss: BossBlind | null, rule: string): boolean {
  return getActiveBossRules(boss).includes(rule as never);
}

export interface BossRuleContext {
  boss: BossBlind | null;
  briscolaSuit: Suit;
  trickCount: number;
  leadIsPlayer: boolean;
  playerCard?: PlayingCard;
  opponentCard?: PlayingCard;
  playerJokersCount?: number;
}

export const BOSS_RULES = {
  /** Every rule this Boss enforces, base plus Endless modifiers. */
  getActiveRules(boss: BossBlind | null): string[] {
    return getActiveBossRules(boss);
  },

  /**
   * The suit the player is obliged to open with, or null when they are free.
   *
   * Il Maestro dei Bastoni takes his toll: win a trick with a Coppa and the
   * next trick opens in Coppe. The absence of any obligation to follow suit is
   * what Briscola IS, so putting one back changes every trick - you stop asking
   * only whether to win and start asking what you want to be holding after.
   *
   * If the hand has none of that suit the chain simply breaks: the round can
   * never reach a position with no legal card to play.
   */
  getForcedLeadSuit(
    boss: BossBlind | null,
    lastWinningSuit: Suit | null,
    hand: PlayingCard[]
  ): Suit | null {
    if (!bossEnforces(boss, 'forced_suit_chain')) return null;
    if (!lastWinningSuit) return null;
    return hand.some((card) => card.suit === lastWinningSuit) ? lastWinningSuit : null;
  },

  /**
   * Checks if player is allowed to lead with a specific card.
   *
   * Both lead restrictions live here, and both have the same escape hatch: a
   * rule that cannot be obeyed does not apply. A round with no legal opening
   * would sit there forever.
   */
  canPlayerLeadCard(
    card: PlayingCard,
    boss: BossBlind | null,
    hand: PlayingCard[] = [],
    lastWinningSuit: Suit | null = null
  ): { allowed: boolean; reason?: string } {
    if (!boss) return { allowed: true };

    if (bossEnforces(boss, 'no_denari_first') && card.suit === 'denari') {
      const hasOtherSuit = hand.some((c) => c.suit !== 'denari');
      if (!hasOtherSuit) return { allowed: true };
      return {
        allowed: false,
        reason: 'Il banco proibisce di aprire la presa con carte di Denari!',
      };
    }

    if (bossEnforces(boss, 'forced_suit_chain')) {
      const forced = BOSS_RULES.getForcedLeadSuit(boss, lastWinningSuit, hand);
      if (forced && card.suit !== forced) {
        return {
          allowed: false,
          reason: `Pedaggio del Gigante: hai vinto di ${forced}, devi riaprire di ${forced}!`,
        };
      }
    }

    return { allowed: true };
  },

  /**
   * Returns whether rotating briscola triggers this trick (every 3 tricks).
   */
  shouldRotateBriscola(trickCount: number, boss: BossBlind | null): boolean {
    if (!bossEnforces(boss, 'rotating_briscola')) return false;
    // Mescolo Stretto tightens the period; everything else keeps the printed 3.
    const period = getBriscolaRotationPeriod(boss);
    return trickCount > 0 && trickCount % period === 0;
  },

  /**
   * Generates a new random briscola suit distinct from the current one.
   */
  getRotatedBriscolaSuit(currentSuit: Suit): Suit {
    const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
    const candidates = suits.filter((s) => s !== currentSuit);
    return pickRun(candidates) ?? currentSuit;
  },

  /**
   * Checks if opponent played card should remain face-down until player plays.
   */
  isOpponentCardHidden(boss: BossBlind | null, playerHasPlayed: boolean): boolean {
    if (!bossEnforces(boss, 'hidden_opponent_card')) return false;
    return !playerHasPlayed;
  },

  /**
   * Whether the table draws the opponent's played card face down.
   *
   * Ciccio's whole malus is that you answer blind, and the card was being
   * rendered face up anyway. The card itself never leaves the state - only its
   * face is covered, and only until the player has committed a card, after
   * which the trick resolves and reads exactly as it always did. A Scudo
   * Protettivo neutralising the malus puts the card back face up.
   */
  shouldRenderOpponentCardFaceDown(
    boss: BossBlind | null,
    bossDebuffNeutralized: boolean,
    playerHasPlayed: boolean
  ): boolean {
    if (bossDebuffNeutralized) return false;
    return BOSS_RULES.isOpponentCardHidden(boss, playerHasPlayed);
  },

  /**
   * Calculates target score modifier for a boss.
   *
   * Nothing uses it any more: Ante 6 used to be a +50% tax and is now a rule
   * you play around instead. Kept because a future boss may well want one, and
   * because every caller already asks.
   */
  getTargetScoreMultiplier(boss: BossBlind | null): number {
    void boss;
    return 1.0;
  },

  /**
   * Which joker the Sovrano has silenced for this trick.
   *
   * It used to be a random one every trick, which is thematic and impossible to
   * play around: you could never know whether the trick you were setting up
   * would have its engine attached. Now it walks the rail in order, one slot
   * per trick, so the player can read three tricks ahead and time the big hand
   * for a moment when the joker that matters is awake.
   */
  getSilencedJokerIndex(
    boss: BossBlind | null,
    trickCount: number,
    jokersCount: number
  ): number | null {
    if (!bossEnforces(boss, 'rotating_joker_silence') || jokersCount === 0) return null;
    return trickCount % jokersCount;
  },
};
