import { PlayingCard, Suit, CardRank, DeckDefinition, BossBlind, Voucher, Joker } from '../types/game';
import { createStandardDeck, shuffleDeck } from './briscola';
import { randomRun } from './runRng';
import {
  DEFAULT_VICTORY_MODE,
  evaluateVictoryCondition,
  VictoryCheck,
  VictoryMode,
} from './victoryModes';

export interface RoundStateSnapshot {
  currentRoundScore: number;
  totalScore: number;
  roundPointsTaken: number;
  opponentPointsTaken: number;
  roundTricksWon: number;
  roundTricksLost: number;
  totalTricksWon: number;
  totalTricksLost: number;
  totalBriscolaPointsPlayer: number;
  totalBriscolaPointsOpponent: number;
  money: number;
  totalMoneyEarned: number;
  targetScore: number;
  ante: number;
  round: number;
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
  drawPile: PlayingCard[];
  trumpCard: PlayingCard | null;
  briscolaSuit: Suit;
  activeBoss: BossBlind | null;
  vouchers: Voucher[];
  activeJokers: Joker[];
  /** Boss blinds actually beaten in this run, not the ante you reached. */
  bossesDefeated: number;
  /** Carte Sola spent across every run: the Mazzo Sola counts them for good. */
  solaCardsUsed: number;
  /** Which rules this run is being played under. Absent means the old game. */
  victoryMode?: VictoryMode;
}

export interface RoundOutcomeResult {
  won: boolean;
  /** The full verdict: which requirements passed, and by which route. */
  victory: VictoryCheck;
  /** Took more than 60 of the 120 Briscola points: pays a cash bonus. */
  briscolaMajority: boolean;
  briscolaBonus: number;
  baseReward: number;
  interest: number;
  totalReward: number;
  newHighScore: boolean;
  newUnlockedDecks: string[];
  isAnte8Victory: boolean;
}

/**
 * Blind targets.
 *
 * These numbers are measured, not guessed: `src/game/__sim__` plays whole runs
 * with the real engine, AI and scoring, and each ante is set to roughly a third
 * to a half of what a reference build scores there. The step between antes is
 * widest where the run's power spikes (x4.4 into ante 3, when the shop has
 * finally armed a build) and narrows to x2.0 at the end, because the player's
 * own scaling decelerates once the joker slots are full - a constant multiplier
 * would either trivialise the mid-game or wall the end of the run.
 *
 * Ante 1 keeps the traditional 300: it is beatable with no jokers at all, and it
 * is the only blind that is.
 */
export const ANTE_BASE_TARGETS = [300, 900, 4000, 11000, 28000, 70000, 150000, 300000];

/**
 * Un Ante, due incontri.
 *
 * The run used to be Small Blind, Big Blind, Boss - three matches an ante,
 * twenty-four across a run. Once the blind can be won on sixty-one of the
 * hundred and twenty points, every match has to be a real game of Briscola:
 * forty cards, twenty tricks, one copy of each identity. So the run gets
 * shorter by dropping the redundant match, not by cutting the game down.
 *
 * Eight antes, two encounters each: sixteen full games instead of twenty-four.
 */
export type EncounterType = 'table' | 'boss';

export const ENCOUNTERS_PER_ANTE = 2;

/** Which of the two you are sitting down to. 1 = Tavolo, 2 = Boss. */
export function encounterFor(round: number): EncounterType {
  return round >= ENCOUNTERS_PER_ANTE ? 'boss' : 'table';
}

export function isBossEncounter(round: number): boolean {
  return encounterFor(round) === 'boss';
}

/**
 * The Tavolo replaces both old blinds and sits between them: harder than the
 * Small it absorbed, clearly softer than the Boss that follows.
 */
export const ENCOUNTER_TARGET_MULTIPLIERS: Record<EncounterType, number> = {
  table: 1.25,
  boss: 2,
};

/**
 * Cash a cleared encounter pays, before interest and the Briscola bonus. The
 * reveal screen shows this, so it has to be the number calculateRoundOutcome
 * actually pays out.
 */
export function getBlindBaseReward(ante: number): number {
  return 4 + ante;
}

/**
 * Two encounters now pay what three used to.
 *
 * The Tavolo takes 1.25 of the ante's base and the Boss takes what is left of
 * the old three-blind total - about 1.75, and exactly the remainder rather than
 * a second rounded multiplier, so an ante hands over the same cash it always
 * did down to the dollar. Losing a match cost the economy nothing, and it
 * needed no new source to make up for it.
 */
export const TABLE_REWARD_MULTIPLIER = 1.25;
/** What an ante paid across its three old blinds, and still pays across two. */
const ANTE_REWARD_MULTIPLIER = 3;

export function getEncounterReward(ante: number, round: number): number {
  const base = getBlindBaseReward(ante);
  const table = Math.round(base * TABLE_REWARD_MULTIPLIER);
  return isBossEncounter(round) ? base * ANTE_REWARD_MULTIPLIER - table : table;
}

export function getBlindTargetScore(
  ante: number,
  round: number,
  options: { bossMultiplier?: number; deckMultiplier?: number } = {}
): number {
  const capped = Math.min(ante, ANTE_BASE_TARGETS.length);
  let base = ANTE_BASE_TARGETS[capped - 1];
  // Endless antes beyond the table keep climbing at the final ratio.
  for (let extra = ANTE_BASE_TARGETS.length; extra < ante; extra++) base *= 1.7;

  const blind = ENCOUNTER_TARGET_MULTIPLIERS[encounterFor(round)];
  const boss = options.bossMultiplier ?? 1;
  const deck = options.deckMultiplier ?? 1;
  return Math.round(base * blind * boss * deck);
}

export function createRunDeck(deckDef: DeckDefinition): PlayingCard[] {
  let deck = createStandardDeck();
  if (deckDef.specialDeckPerk === 'bastoni_foil') {
    let foilCount = 0;
    deck = deck.map((card) => {
      if (card.suit === 'bastoni' && foilCount < 3) {
        foilCount++;
        return { ...card, edition: 'foil' as const };
      }
      return card;
    });
  } else if (deckDef.specialDeckPerk === 'holo_figures') {
    deck = deck.map((card) => card.rank >= 8 ? { ...card, edition: 'holo' as const } : card);
  }
  return deck;
}

/**
 * The forty identities of an Italian deck: one Asso, one Due ... one Re for
 * each of the four suits, and nothing else, ever.
 *
 * Briscola is played on memory. If the 4 di Spade can be in the deck twice, or
 * not at all, then counting what has already fallen stops meaning anything and
 * the game underneath the roguelite quietly stops working. Every upgrade path
 * has to come out the other side satisfying this.
 */
export interface RunDeckIntegrity {
  valid: boolean;
  problems: string[];
}

export function checkRunDeckIntegrity(runDeck: PlayingCard[]): RunDeckIntegrity {
  const problems: string[] = [];

  if (runDeck.length !== 40) {
    problems.push(`il mazzo ha ${runDeck.length} carte invece di 40`);
  }

  const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
  const seen = new Map<string, number>();
  for (const card of runDeck) {
    const key = `${card.suit}_${card.rank}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }

  for (const suit of suits) {
    const count = runDeck.filter((card) => card.suit === suit).length;
    if (count !== 10) problems.push(`${suit}: ${count} carte invece di 10`);

    for (let rank = 1 as CardRank; rank <= 10; rank = (rank + 1) as CardRank) {
      const count = seen.get(`${suit}_${rank}`) || 0;
      if (count === 0) problems.push(`manca ${rank} di ${suit}`);
      if (count > 1) problems.push(`${rank} di ${suit} compare ${count} volte`);
    }
  }

  const ids = new Set(runDeck.map((card) => card.id));
  if (ids.size !== runDeck.length) problems.push('due carte condividono lo stesso id');

  return { valid: problems.length === 0, problems };
}

/** Shouts in dev, stays out of the way in production. */
export function assertRunDeckIntegrity(runDeck: PlayingCard[], where: string): void {
  const result = checkRunDeckIntegrity(runDeck);
  if (!result.valid) {
    console.error(`[run deck] integrità rotta in ${where}: ${result.problems.join(', ')}`);
  }
}

/**
 * The Falsario's stamp: one card of the run deck picks up a Foil edition.
 *
 * It used to rewrite a card's suit into Denari, which put a second Cavallo di
 * Denari in circulation and left a suit one card short - the forty identities
 * are not something a joker gets to edit. Only the edition changes here: same
 * id, same suit, same rank, same points, same power, same enhancement, seal and
 * Azzardo. A deck already all Foil is left exactly as it is.
 */
export function foilRandomCardInRunDeck(
  runDeck: PlayingCard[],
  random: () => number = randomRun
): { deck: PlayingCard[]; foiledCardId: string | null } {
  const candidates = runDeck.filter((card) => card.edition !== 'foil');
  if (candidates.length === 0) return { deck: runDeck, foiledCardId: null };

  const chosen = candidates[Math.floor(random() * candidates.length)];
  const deck = runDeck.map((card) =>
    card.id === chosen.id ? { ...card, edition: 'foil' as const } : card
  );
  return { deck, foiledCardId: chosen.id };
}

/**
 * Applies a booster upgrade to the card the player already owns.
 *
 * A potenziata card is not a new card: it is the same identity wearing
 * something. The 4 di Spade Vetro IS your 4 di Spade, so this finds it by suit
 * and rank and rewrites that one entry, keeping its id and its place. The deck
 * cannot grow, cannot shrink, and cannot end up with the same card twice.
 *
 * An Azzardo replaces the one already there - a card carries at most one - while
 * edition, seal and enhancement carry over unless the upgrade sets them.
 */
export function upgradeCardInRunDeck(
  runDeck: PlayingCard[],
  upgradedCard: PlayingCard
): PlayingCard[] {
  const index = runDeck.findIndex(
    (card) => card.suit === upgradedCard.suit && card.rank === upgradedCard.rank
  );
  // A deck without that identity is already broken; refusing to write is the
  // safe answer, since appending would put a second copy in circulation.
  if (index === -1) return runDeck;

  const existing = runDeck[index];
  const next = [...runDeck];
  next[index] = {
    ...upgradedCard,
    // The identity is the card in the deck, not the one the shop drew.
    id: existing.id,
    suit: existing.suit,
    rank: existing.rank,
    points: existing.points,
    power: existing.power,
  };
  return next;
}

/** Strips the Azzardo from one card - a Vetro that broke - and nothing else. */
export function clearSpecialInRunDeck(runDeck: PlayingCard[], cardId: string): PlayingCard[] {
  return runDeck.map((card) => (card.id === cardId ? { ...card, special: 'none' as const } : card));
}

export function prepareRoundDeck(runDeck: PlayingCard[]): {
  roundDrawPile: PlayingCard[];
  trumpCard: PlayingCard;
  briscolaSuit: Suit;
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
} {
  if (runDeck.length < 7) throw new Error('Run deck too small to start a Briscola round');

  const roundDeck = shuffleDeck(runDeck.map((card) => ({ ...card })));
  const trumpCard = roundDeck.pop()!;
  const playerHand: PlayingCard[] = [];
  const opponentHand: PlayingCard[] = [];

  for (let i = 0; i < 3; i++) {
    const playerCard = roundDeck.pop();
    const opponentCard = roundDeck.pop();
    if (!playerCard || !opponentCard) throw new Error('Invalid initial Briscola deal');
    playerHand.push(playerCard);
    opponentHand.push(opponentCard);
  }

  return { roundDrawPile: roundDeck, trumpCard, briscolaSuit: trumpCard.suit, playerHand, opponentHand };
}

/**
 * Roguelite discard = exchange with stock. We intentionally DISALLOW it once
 * the normal stock is empty: swapping with the face-up trump corrupts the
 * official final-draw sequence and can make turn parity confusing.
 */
export function performExchangeDiscard(
  cardToDiscard: PlayingCard,
  playerHand: PlayingCard[],
  drawPile: PlayingCard[],
  trumpCard: PlayingCard | null
): {
  newPlayerHand: PlayingCard[];
  newDrawPile: PlayingCard[];
  newTrumpCard: PlayingCard | null;
  success: boolean;
} {
  const cardIndex = playerHand.findIndex((card) => card.id === cardToDiscard.id);
  if (cardIndex === -1 || drawPile.length === 0) {
    return { newPlayerHand: playerHand, newDrawPile: drawPile, newTrumpCard: trumpCard, success: false };
  }

  const nextHand = [...playerHand];
  const nextPile = [...drawPile];
  const [removedCard] = nextHand.splice(cardIndex, 1);
  const drawnCard = nextPile.pop()!;
  nextHand.push(drawnCard);
  nextPile.unshift(removedCard); // bottom of stock

  return { newPlayerHand: nextHand, newDrawPile: nextPile, newTrumpCard: trumpCard, success: true };
}

export interface DiscardAvailability {
  discardsLeft: number;
  trickPhase: string;
  isPlayerTurn: boolean;
  drawPileCount: number;
  playerCardAlreadyPlayed: boolean;
}

/** Shared App/UI rule: Scarto is an exchange and needs a normal stock card. */
export function canDiscardCardNow(state: DiscardAvailability): boolean {
  return (
    state.discardsLeft > 0 &&
    state.trickPhase === 'idle' &&
    state.isPlayerTurn &&
    state.drawPileCount > 0 &&
    !state.playerCardAlreadyPlayed
  );
}

/**
 * Winner draws first. The face-up trump is the final card drawn.
 *
 * Both hands must stay the same size for the rest of the round to be playable.
 * If a card effect ever leaves them asymmetric this rebalances instead of
 * throwing: an exception here used to abort the trick half-applied and freeze
 * the round with the tally overlay stuck on screen. `parityCorrected` reports
 * that a bug upstream had to be papered over.
 */
export function drawNextTrickCards(
  playerWonTrick: boolean,
  drawPile: PlayingCard[],
  trumpCard: PlayingCard | null,
  playerHand: PlayingCard[],
  opponentHand: PlayingCard[]
): {
  newPlayerHand: PlayingCard[];
  newOpponentHand: PlayingCard[];
  newDrawPile: PlayingCard[];
  newTrumpCard: PlayingCard | null;
  parityCorrected: boolean;
} {
  const nextPile = [...drawPile];
  let nextTrump = trumpCard;
  const nextPlayerHand = [...playerHand];
  const nextOpponentHand = [...opponentHand];

  const drawOne = (): PlayingCard | null => {
    const fromPile = nextPile.pop();
    if (fromPile) return fromPile;
    if (!nextTrump) return null;
    const lastTrump = nextTrump;
    nextTrump = null;
    return lastTrump;
  };

  const firstHand = playerWonTrick ? nextPlayerHand : nextOpponentHand;
  const secondHand = playerWonTrick ? nextOpponentHand : nextPlayerHand;
  const first = drawOne();
  if (first) firstHand.push(first);
  const second = drawOne();
  if (second) secondHand.push(second);

  // A legal two-player Briscola stock always deals symmetrically. The only
  // expected asymmetry is transient INSIDE drawOne; after the pair it must be gone.
  let parityCorrected = false;
  while (nextPlayerHand.length !== nextOpponentHand.length) {
    const shorterHand =
      nextPlayerHand.length < nextOpponentHand.length ? nextPlayerHand : nextOpponentHand;
    const extra = drawOne();
    if (!extra) break;
    shorterHand.push(extra);
    parityCorrected = true;
  }

  if (nextPlayerHand.length !== nextOpponentHand.length) {
    // The stock could not cover the gap: trim the longer hand back so the round
    // can still be played out to its last trick.
    parityCorrected = true;
    const longerHand =
      nextPlayerHand.length > nextOpponentHand.length ? nextPlayerHand : nextOpponentHand;
    const shorterLength = Math.min(nextPlayerHand.length, nextOpponentHand.length);
    nextPile.unshift(...longerHand.splice(shorterLength));
  }

  if (parityCorrected && typeof console !== 'undefined') {
    console.warn(
      `[briscola] hand parity had to be corrected (player=${nextPlayerHand.length}, opponent=${nextOpponentHand.length}). A card effect changed a hand size.`
    );
  }

  return {
    newPlayerHand: nextPlayerHand,
    newOpponentHand: nextOpponentHand,
    newDrawPile: nextPile,
    newTrumpCard: nextTrump,
    parityCorrected,
  };
}

export function applyTrickResult(
  snapshot: RoundStateSnapshot,
  playerWon: boolean,
  finalTrickScore: number,
  trickPoints: number,
  bonusDollars = 0
): RoundStateSnapshot {
  return {
    ...snapshot,
    currentRoundScore: playerWon ? snapshot.currentRoundScore + finalTrickScore : snapshot.currentRoundScore,
    totalScore: playerWon ? snapshot.totalScore + finalTrickScore : snapshot.totalScore,
    roundPointsTaken: playerWon ? snapshot.roundPointsTaken + trickPoints : snapshot.roundPointsTaken,
    opponentPointsTaken: playerWon ? snapshot.opponentPointsTaken : snapshot.opponentPointsTaken + trickPoints,
    roundTricksWon: playerWon ? snapshot.roundTricksWon + 1 : snapshot.roundTricksWon,
    roundTricksLost: playerWon ? snapshot.roundTricksLost : snapshot.roundTricksLost + 1,
    totalTricksWon: playerWon ? snapshot.totalTricksWon + 1 : snapshot.totalTricksWon,
    totalTricksLost: playerWon ? snapshot.totalTricksLost : snapshot.totalTricksLost + 1,
    totalBriscolaPointsPlayer: playerWon
      ? snapshot.totalBriscolaPointsPlayer + trickPoints
      : snapshot.totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent: playerWon
      ? snapshot.totalBriscolaPointsOpponent
      : snapshot.totalBriscolaPointsOpponent + trickPoints,
    // An Azzardo can make this negative: it is capped at what the player has,
    // so the till empties at worst. What was spent is not what was earned.
    money: Math.max(0, snapshot.money + bonusDollars),
    totalMoneyEarned: snapshot.totalMoneyEarned + Math.max(0, bonusDollars),
  };
}

export function isRoundFinished(
  playerHand: PlayingCard[],
  opponentHand: PlayingCard[],
  drawPile: PlayingCard[],
  trumpCard: PlayingCard | null
): boolean {
  return playerHand.length === 0 && opponentHand.length === 0 && drawPile.length === 0 && trumpCard === null;
}

export function calculateRoundOutcome(
  snapshot: RoundStateSnapshot,
  highScore: number,
  unlockedDeckIds: string[]
): RoundOutcomeResult {
  // The blind is decided in exactly one place, and this is the call to it.
  // Briscolatro - the mode every old save lands in - is the historical rule,
  // score >= target, unchanged.
  const victory = evaluateVictoryCondition({
    mode: snapshot.victoryMode ?? DEFAULT_VICTORY_MODE,
    score: snapshot.currentRoundScore,
    targetScore: snapshot.targetScore,
    playerBriscolaPoints: snapshot.roundPointsTaken,
  });
  const won = victory.won;

  // Taking the majority of the points pays $4 and has always paid $4. In
  // Traditional it is also the win condition, which does NOT make it pay twice:
  // it is one bonus, read off the same number, exactly as before.
  const briscolaMajority = snapshot.roundPointsTaken > 60;
  const briscolaBonus = briscolaMajority ? 4 : 0;
  const baseReward = getEncounterReward(snapshot.ante, snapshot.round);
  const interestCap = snapshot.vouchers.some((voucher) => voucher.id === 'v_interessi' && voucher.bought) ? 10 : 5;
  const interest = Math.min(interestCap, Math.floor(snapshot.money / 5));
  const totalReward = won ? baseReward + interest + briscolaBonus : 0;
  const newHighScore = snapshot.totalScore > highScore;

  // Every condition here has to be the one written on the deck in the picker.
  // "Sconfiggi 3 Boss" used to be `ante >= 3`, which is two boss blinds, and the
  // Mazzo Sola asked for five Carte Sola that nothing was counting.
  const newUnlockedDecks: string[] = [];
  if (!unlockedDeckIds.includes('deck_denari') && snapshot.money + totalReward >= 30) {
    newUnlockedDecks.push('deck_denari');
  }
  // The boss of this very round counts: you beat it a moment ago.
  const bossesAfterThisRound =
    snapshot.bossesDefeated + (won && isBossEncounter(snapshot.round) ? 1 : 0);
  if (!unlockedDeckIds.includes('deck_spade') && bossesAfterThisRound >= 3) {
    newUnlockedDecks.push('deck_spade');
  }
  if (!unlockedDeckIds.includes('deck_uno') && snapshot.solaCardsUsed >= 5) {
    newUnlockedDecks.push('deck_uno');
  }
  if (!unlockedDeckIds.includes('deck_baro') && snapshot.ante >= 5) {
    newUnlockedDecks.push('deck_baro');
  }

  return {
    won,
    victory,
    briscolaMajority,
    briscolaBonus,
    baseReward,
    interest,
    totalReward,
    newHighScore,
    newUnlockedDecks,
    isAnte8Victory: won && snapshot.ante >= 8 && isBossEncounter(snapshot.round),
  };
}
