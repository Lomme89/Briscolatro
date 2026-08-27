import { BossBlind, Suit, PlayingCard } from '../types/game';

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
  /**
   * Checks if player is allowed to lead with a specific card.
   */
  canPlayerLeadCard(
    card: PlayingCard,
    boss: BossBlind | null,
    hand: PlayingCard[] = []
  ): { allowed: boolean; reason?: string } {
    if (!boss) return { allowed: true };
    if (boss.debuffType === 'no_denari_first' && card.suit === 'denari') {
      // A hand of nothing but Denari would have no legal lead at all, and the
      // round would sit there forever. The ban only bites while you have a way
      // to obey it.
      const hasOtherSuit = hand.some((c) => c.suit !== 'denari');
      if (!hasOtherSuit) return { allowed: true };
      return {
        allowed: false,
        reason: 'Il banco proibisce di aprire la presa con carte di Denari!',
      };
    }
    return { allowed: true };
  },

  /**
   * Returns whether rotating briscola triggers this trick (every 3 tricks).
   */
  shouldRotateBriscola(trickCount: number, boss: BossBlind | null): boolean {
    if (!boss || boss.debuffType !== 'rotating_briscola') return false;
    return trickCount > 0 && trickCount % 3 === 0;
  },

  /**
   * Generates a new random briscola suit distinct from the current one.
   */
  getRotatedBriscolaSuit(currentSuit: Suit): Suit {
    const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
    const candidates = suits.filter((s) => s !== currentSuit);
    return candidates[Math.floor(Math.random() * candidates.length)];
  },

  /**
   * Checks if opponent played card should remain face-down until player plays.
   */
  isOpponentCardHidden(boss: BossBlind | null, playerHasPlayed: boolean): boolean {
    if (!boss || boss.debuffType !== 'hidden_opponent_card') return false;
    return !playerHasPlayed;
  },

  /**
   * Calculates target score modifier for a boss.
   */
  getTargetScoreMultiplier(boss: BossBlind | null): number {
    if (!boss) return 1.0;
    if (boss.debuffType === 'high_target_only') return 1.5;
    return 1.0;
  },

  /**
   * Selects a random joker index to disable for a trick if boss debuff is active.
   */
  getDisabledJokerIndex(boss: BossBlind | null, jokersCount: number): number | null {
    if (!boss || boss.debuffType !== 'random_joker_disabled' || jokersCount === 0) return null;
    return Math.floor(Math.random() * jokersCount);
  },
};
