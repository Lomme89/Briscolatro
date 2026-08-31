export type Suit = 'bastoni' | 'coppe' | 'denari' | 'spade';

export type CardRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
// 1 = Asso (11 pt)
// 2 = Due (0 pt)
// 3 = Tre (10 pt)
// 4 = Quattro (0 pt)
// 5 = Cinque (0 pt)
// 6 = Sei (0 pt)
// 7 = Sette (0 pt)
// 8 = Fante / Donna (2 pt)
// 9 = Cavallo (3 pt)
// 10 = Re (4 pt)

export type Edition = 'standard' | 'foil' | 'holo' | 'polychrome' | 'gold';
// foil: +60 Chips played / +30 captured
// holo: +12 Mult played / +6 captured
// polychrome: x1.6 Mult played / x1.3 captured
// gold: +$1 played / +$2 captured

export type Seal = 'none' | 'red' | 'blue' | 'gold' | 'purple';
// red: Re-trigger card score once
// blue: 20% chance to spawn a UNO card when won
// gold: +$2 when captured
// purple: create a free discard

export type Enhancement = 'none' | 'bonus' | 'mult' | 'wild' | 'steel' | 'stone';
// bonus: +40 Chips
// mult: +5 Mult
// wild: Can count as any suit in combinations
// steel: x1.6 Mult if held in hand (not played)
// stone: +60 Chips, no suit/rank

/**
 * Azzardo: the one modifier that can cost you something.
 *
 * Edition, Enhancement and Seal are all upside - a card that carries them is
 * strictly the better version of itself. An Azzardo asks a question instead:
 * the bonus is real and so is the price, and both are deterministic, so the
 * player can see the trade before playing the card. A card carries at most one.
 */
export type CardSpecial = 'none' | 'segnata' | 'vetro' | 'debito' | 'traditrice';
// segnata:    +18 Mult on a won trick, but the opponent knows you hold it
// vetro:      x2.2 Mult on a won trick, breaks for good if the trick is lost
// debito:     +120 Chips on a won trick, costs $1 every time you play it
// traditrice: x2.2 Mult if it opens and wins, -$2 if it answers and loses

type JokerRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type GamePhase = 
  | 'title' 
  | 'deck_select' 
  | 'blind_select' 
  | 'playing' 
  | 'trick_result' 
  | 'round_won' 
  | 'round_lost' 
  | 'shop' 
  | 'booster_opening' 
  | 'collection' 
  | 'tutorial'
  | 'game_over';

export interface PlayingCard {
  id: string;
  suit: Suit;
  rank: CardRank;
  points: number; // Briscola point value: 11, 10, 4, 3, 2, 0
  power: number;  // Trick winning hierarchy: 10 (Asso) > 9 (Tre) > 8 (Re) > 7 (Cavallo) > 6 (Fante) > 5 (7) > 4 (6) > 3 (5) > 2 (4) > 1 (2)
  edition: Edition;
  seal: Seal;
  enhancement: Enhancement;
  /** At most one Azzardo per card: the new one replaces the old. */
  special: CardSpecial;
  customBonusChips?: number;
  customBonusMult?: number;
  isDebuffed?: boolean;
}

type JokerTrigger =
  | 'on_trick_win' 
  | 'on_card_scored' 
  | 'on_hand_played' 
  | 'on_round_end' 
  | 'on_briscola_played' 
  | 'passive'
  | 'on_discard';

export interface Joker {
  /** Stable catalogue id used by rules, artwork and future save migrations. */
  id: string;
  /** Unique owned copy. Runtime growth belongs to this id, never to `id`. */
  instanceId?: string;
  name: string;
  italianTitle: string;
  description: string;
  rarity: JokerRarity;
  cost: number;
  sellValue: number;
  icon: string;
  accentColor: string;
  trigger: JokerTrigger;
  chipsBonus?: number;
  multBonus?: number;
  xMultBonus?: number;
  dollarsBonus?: number;
  customEffectId?: string;
  stats?: {
    timesTriggered?: number;
    accumulatedMult?: number;
    accumulatedChips?: number;
  };
}

type UnoColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export interface UnoCard {
  /** Stable catalogue id. Kept dispatchable even when several copies exist. */
  id: string;
  /** Explicit alias for serialized/generated cards from older and future saves. */
  definitionId?: string;
  /** Unique owned copy; two copies may share the same definition id. */
  instanceId?: string;
  name: string;
  symbol: string;        // '+2', '+4', '⇄', '🚫', '🌈', 'UNO!', '🪙', '✨', '⭐', '🎨', '🛡️', '🎭', etc.
  unoColor: UnoColor;    // 'red' | 'blue' | 'green' | 'yellow' | 'wild'
  badgeText?: string;    // Mini label, e.g. '+2', '+4', 'REV', 'SKIP', 'WILD'
  description: string;
  cost: number;
  icon: string;
  color: string;
  targetType: 'card_in_hand' | 'instant_run' | 'deck_random' | 'joker_create';
}

export interface Voucher {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  bought: boolean;
}

export interface BossBlind {
  id: string;
  name: string;
  characterTitle: string;
  avatar: string;
  bossQuote: string;
  ante: number;
  targetScore: number;
  reward: number;
  debuffDescription: string;
  debuffType: BossDebuffType;
  /**
   * Set only on an Endless variant of a base Boss: which modifiers were rolled
   * on top of its own rule. The base id is kept, so a save stores the base Boss
   * plus these ids and rebuilds the variant rather than storing a synthetic one.
   */
  endless?: BossEndlessBrief;
}

/** Every rule the engine knows how to enforce. Endless composes these. */
export type BossDebuffType =
  | 'half_carichi'
  | 'no_lisce_chips'
  | 'rotating_briscola'
  | 'hidden_opponent_card'
  | 'no_denari_first'
  | 'spades_are_briscola'
  | 'forced_suit_chain'
  | 'rotating_joker_silence';

interface BossEndlessBrief {
  /** Tier the encounter belongs to, for the label on the blind. */
  tierId: string;
  /** Ids of the Endless modifiers layered on top of the base rule. */
  modifierIds: string[];
}

export interface DeckDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockRequirement: string;
  startingMoney: number;
  startingJokers: string[]; // Joker IDs
  startingVouchers: string[];
  startingDiscards: number;
  specialDeckPerk?: string;
}

export interface BoosterPack {
  id: string;
  name: string;
  subtitle: string;
  cost: number;
  type: 'uno' | 'cards' | 'joker' | 'celeste';
  packSize: number;
  selectCount: number;
  color: string;
  icon: string;
}

export type CardStyle = 'classic' | 'neo_noir' | 'neon_cyber';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
  crtScanlines: boolean;
  screenShake: boolean;
  fastMode: boolean;
  /** The rank and point pills drawn on top of the card art. */
  showCardChips: boolean;
}
