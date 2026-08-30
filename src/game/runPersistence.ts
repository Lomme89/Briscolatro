import {
  BossBlind,
  DeckDefinition,
  Joker,
  PlayingCard,
  Suit,
  UnoCard,
  Voucher,
} from '../types/game';
import { ALL_DECKS } from '../data/decks';
import { ALL_JOKERS } from '../data/jokers';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { ALL_UNO_CARDS, ALL_VOUCHERS } from '../data/unoCards';
import { checkRunDeckIntegrity } from './gameState';
import { VICTORY_MODES, VictoryMode } from './victoryModes';
import { RunPhase } from './endless';
import { restoreEndlessBoss } from './endlessBosses';
import { isRunRngState, RunRngState } from './runRng';

/**
 * Save/Resume V1.
 *
 * One run, one slot, one key. What goes in is everything a run cannot be
 * rebuilt without; what stays out is everything that can be derived from it or
 * that only describes a frame of animation. A restored run comes back to a
 * legal position, not to the exact instant it was left at: the table is clear,
 * nobody is mid-trick, and the next action is the one the position asks for.
 */
export const RUN_SNAPSHOT_KEY = 'briscolatro_run_v1';
export const RUN_SNAPSHOT_SCHEMA_VERSION = 1;

/** Where a snapshot may be taken. Every one of these is a settled position. */
export type RunSnapshotPhase = 'blind_select' | 'playing' | 'shop';

/**
 * The shop shelf, as two numbers and a set of keys instead of a list of items.
 *
 * The shelf is a pure function of (seed, rerolls), and what has already been
 * taken off it is a set of keys. Storing the derivation rather than the result
 * is both smaller and safer: a shelf rebuilt from the catalogue can never
 * resurrect an item that no longer exists in the game.
 */
export interface ShopSnapshotV1 {
  seed: number;
  rerolls: number;
  boughtKeys: string[];
}

/** The half of a snapshot that only exists while a match is on the table. */
export interface EncounterSnapshotV1 {
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
  drawPile: PlayingCard[];
  trumpCard: PlayingCard | null;
  briscolaSuit: Suit;
  targetScore: number;
  currentRoundScore: number;
  roundPointsTaken: number;
  opponentPointsTaken: number;
  roundTricksWon: number;
  roundTricksLost: number;
  tricksPlayedInRound: number;
  capturedDenariRanks: number[];
  consecutiveWinStreak: number;
  /** Tricks lost back to back. Absent in pre-Contropiede saves: read as 0. */
  consecutiveLossStreak?: number;
  discardsLeft: number;
  /** False means the opponent opens the next trick; the table is clear either way. */
  isPlayerTurn: boolean;
  bossId: string | null;
  /**
   * An Endless Boss is a base Boss plus modifiers. Only the ids are stored: the
   * catalogue would not recognise a synthetic composed Boss, and rebuilding it
   * on restore is what keeps the save honest about where its rules came from.
   */
  bossEndlessTierId?: string | null;
  bossEndlessModifierIds?: string[];
  bossDebuffNeutralized: boolean;
  bossShieldTricks: number;
  /** The suit the player last won a trick with, for Il Maestro dei Bastoni. */
  lastWinningSuit: Suit | null;
  /** Ids of cards already face-up this round: the opponent's memory. */
  playedCardIds: string[];
}

export interface RunSnapshotV1 {
  schemaVersion: number;
  savedAt: number;
  phase: RunSnapshotPhase;
  deckId: string;
  victoryMode: VictoryMode;
  /**
   * Campaign or Endless. Absent in pre-Endless saves, which are all campaign
   * runs by definition: read as 'campaign' rather than inferred from the Ante,
   * so a run that stopped at Ante 8 is never mistaken for one that went on.
   */
  runPhase?: RunPhase;
  ante: number;
  round: number;
  money: number;
  totalScore: number;
  totalTricksWon: number;
  totalTricksLost: number;
  totalBriscolaPointsPlayer: number;
  totalBriscolaPointsOpponent: number;
  totalMoneyEarned: number;
  bossesDefeated: number;
  maxJokers: number;
  maxConsumables: number;
  runDeck: PlayingCard[];
  activeJokers: Joker[];
  consumables: UnoCard[];
  vouchers: Voucher[];
  rng: RunRngState;
  shop: ShopSnapshotV1 | null;
  encounter: EncounterSnapshotV1 | null;
}

export interface EncounterSnapshotInput
  extends Omit<EncounterSnapshotV1, 'capturedDenariRanks' | 'playedCardIds' | 'bossId'> {
  capturedDenariRanks: Iterable<number>;
  playedCards: PlayingCard[];
  boss: BossBlind | null;
}

/** Everything serializeRun needs, named exactly as the run state names it. */
export interface RunSnapshotInput {
  phase: RunSnapshotPhase;
  deck: DeckDefinition;
  victoryMode: VictoryMode;
  runPhase?: RunPhase;
  ante: number;
  round: number;
  money: number;
  totalScore: number;
  totalTricksWon: number;
  totalTricksLost: number;
  totalBriscolaPointsPlayer: number;
  totalBriscolaPointsOpponent: number;
  totalMoneyEarned: number;
  bossesDefeated: number;
  maxJokers: number;
  maxConsumables: number;
  runDeck: PlayingCard[];
  activeJokers: Joker[];
  consumables: UnoCard[];
  vouchers: Voucher[];
  rng: RunRngState;
  shop: ShopSnapshotV1 | null;
  encounter: EncounterSnapshotInput | null;
}

function serializeEncounter(input: EncounterSnapshotInput): EncounterSnapshotV1 {
  return {
    playerHand: input.playerHand.map((card) => ({ ...card })),
    opponentHand: input.opponentHand.map((card) => ({ ...card })),
    drawPile: input.drawPile.map((card) => ({ ...card })),
    trumpCard: input.trumpCard ? { ...input.trumpCard } : null,
    briscolaSuit: input.briscolaSuit,
    targetScore: input.targetScore,
    currentRoundScore: input.currentRoundScore,
    roundPointsTaken: input.roundPointsTaken,
    opponentPointsTaken: input.opponentPointsTaken,
    roundTricksWon: input.roundTricksWon,
    roundTricksLost: input.roundTricksLost,
    tricksPlayedInRound: input.tricksPlayedInRound,
    capturedDenariRanks: [...input.capturedDenariRanks],
    consecutiveWinStreak: input.consecutiveWinStreak,
    consecutiveLossStreak: input.consecutiveLossStreak ?? 0,
    discardsLeft: input.discardsLeft,
    isPlayerTurn: input.isPlayerTurn,
    bossId: input.boss ? input.boss.id : null,
    bossEndlessTierId: input.boss?.endless?.tierId ?? null,
    bossEndlessModifierIds: input.boss?.endless?.modifierIds ?? [],
    bossDebuffNeutralized: input.bossDebuffNeutralized,
    bossShieldTricks: input.bossShieldTricks,
    lastWinningSuit: input.lastWinningSuit,
    playedCardIds: input.playedCards.map((card) => card.id),
  };
}

export function serializeRun(input: RunSnapshotInput): RunSnapshotV1 {
  return {
    schemaVersion: RUN_SNAPSHOT_SCHEMA_VERSION,
    savedAt: Date.now(),
    phase: input.phase,
    deckId: input.deck.id,
    victoryMode: input.victoryMode,
    runPhase: input.runPhase ?? 'campaign',
    ante: input.ante,
    round: input.round,
    money: input.money,
    totalScore: input.totalScore,
    totalTricksWon: input.totalTricksWon,
    totalTricksLost: input.totalTricksLost,
    totalBriscolaPointsPlayer: input.totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent: input.totalBriscolaPointsOpponent,
    totalMoneyEarned: input.totalMoneyEarned,
    bossesDefeated: input.bossesDefeated,
    maxJokers: input.maxJokers,
    maxConsumables: input.maxConsumables,
    runDeck: input.runDeck.map((card) => ({ ...card })),
    // Instance ids and accumulated stats are the owned copy: they are carried
    // across as they are and never regenerated.
    activeJokers: input.activeJokers.map((joker) => ({
      ...joker,
      stats: { ...(joker.stats || {}) },
    })),
    consumables: input.consumables.map((card) => ({ ...card })),
    vouchers: input.vouchers.map((voucher) => ({ ...voucher })),
    rng: { ...input.rng },
    shop: input.shop ? { ...input.shop, boughtKeys: [...input.shop.boughtKeys] } : null,
    encounter: input.encounter ? serializeEncounter(input.encounter) : null,
  };
}

export interface RunSnapshotValidation {
  valid: boolean;
  problems: string[];
}

const SUITS: Suit[] = ['bastoni', 'coppe', 'denari', 'spade'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPlayingCard(value: unknown): value is PlayingCard {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    SUITS.includes(value.suit as Suit) &&
    typeof value.rank === 'number' &&
    value.rank >= 1 &&
    value.rank <= 10 &&
    typeof value.points === 'number' &&
    typeof value.power === 'number' &&
    typeof value.edition === 'string' &&
    typeof value.seal === 'string' &&
    typeof value.enhancement === 'string' &&
    typeof value.special === 'string'
  );
}

function isCardArray(value: unknown): value is PlayingCard[] {
  return Array.isArray(value) && value.every(isPlayingCard);
}

/**
 * Is this thing a run we can sit back down at?
 *
 * Anything that fails here is thrown away rather than patched. A save file is
 * not a puzzle to be solved: a repaired run is a run whose rules nobody
 * checked, and the only honest answer to a broken one is a new run.
 */
export function validateRunSnapshot(value: unknown): RunSnapshotValidation {
  const fail = (problem: string): RunSnapshotValidation => ({ valid: false, problems: [problem] });

  if (!isRecord(value)) return fail('lo snapshot non e un oggetto');
  if (value.schemaVersion !== RUN_SNAPSHOT_SCHEMA_VERSION) {
    return fail(`versione schema non supportata: ${String(value.schemaVersion)}`);
  }
  if (value.phase !== 'blind_select' && value.phase !== 'playing' && value.phase !== 'shop') {
    return fail(`fase non valida: ${String(value.phase)}`);
  }
  if (typeof value.deckId !== 'string' || !ALL_DECKS.some((deck) => deck.id === value.deckId)) {
    return fail(`mazzo sconosciuto: ${String(value.deckId)}`);
  }
  if (typeof value.victoryMode !== 'string' || !(value.victoryMode in VICTORY_MODES)) {
    return fail(`modalita di vittoria non valida: ${String(value.victoryMode)}`);
  }
  if (
    value.runPhase !== undefined &&
    value.runPhase !== 'campaign' &&
    value.runPhase !== 'endless'
  ) {
    return fail(`fase della run non valida: ${String(value.runPhase)}`);
  }
  if (!isRunRngState(value.rng)) return fail('stato RNG mancante o non valido');

  const numericFields = [
    'ante',
    'round',
    'money',
    'totalScore',
    'totalTricksWon',
    'totalTricksLost',
    'totalBriscolaPointsPlayer',
    'totalBriscolaPointsOpponent',
    'totalMoneyEarned',
    'bossesDefeated',
    'maxJokers',
    'maxConsumables',
  ];
  for (const key of numericFields) {
    if (!isCount(value[key])) return fail(`campo numerico non valido: ${key}`);
  }
  if ((value.ante as number) < 1 || (value.round as number) < 1) return fail('ante/round fuori range');
  if ((value.maxJokers as number) < 1 || (value.maxConsumables as number) < 1) {
    return fail('slot massimi incoerenti');
  }

  if (!isCardArray(value.runDeck)) return fail('mazzo della run non valido');
  const deckIntegrity = checkRunDeckIntegrity(value.runDeck);
  if (!deckIntegrity.valid) return fail(`mazzo della run corrotto: ${deckIntegrity.problems[0]}`);

  if (!Array.isArray(value.activeJokers)) return fail('jolly non validi');
  for (const joker of value.activeJokers) {
    if (!isRecord(joker) || typeof joker.id !== 'string' || !ALL_JOKERS.some((j) => j.id === joker.id)) {
      return fail('un Jolly non esiste nel catalogo');
    }
  }
  if (value.activeJokers.length > (value.maxJokers as number)) {
    return fail('piu Jolly degli slot disponibili');
  }

  if (!Array.isArray(value.consumables)) return fail('Carte Sola non valide');
  for (const card of value.consumables) {
    if (!isRecord(card)) return fail('una Carta Sola non e un oggetto');
    const definitionId = typeof card.definitionId === 'string' ? card.definitionId : card.id;
    if (typeof definitionId !== 'string' || !ALL_UNO_CARDS.some((c) => c.id === definitionId)) {
      return fail('una Carta Sola non esiste nel catalogo');
    }
  }
  if (value.consumables.length > (value.maxConsumables as number)) {
    return fail('piu Carte Sola degli slot disponibili');
  }

  if (!Array.isArray(value.vouchers)) return fail('voucher non validi');
  for (const voucher of value.vouchers) {
    if (!isRecord(voucher) || typeof voucher.id !== 'string' || !ALL_VOUCHERS.some((v) => v.id === voucher.id)) {
      return fail('un voucher non esiste nel catalogo');
    }
  }

  if (value.shop !== null) {
    const shop = value.shop;
    if (
      !isRecord(shop) ||
      typeof shop.seed !== 'number' ||
      !Number.isFinite(shop.seed) ||
      !isCount(shop.rerolls) ||
      !Array.isArray(shop.boughtKeys) ||
      !shop.boughtKeys.every((key) => typeof key === 'string')
    ) {
      return fail('stato del negozio non valido');
    }
  }

  if (value.encounter !== null) {
    const problem = validateEncounter(value.encounter);
    if (problem) return fail(problem);
  } else if (value.phase === 'playing') {
    return fail('una partita in corso senza incontro salvato');
  }

  return { valid: true, problems: [] };
}

function validateEncounter(value: unknown): string | null {
  if (!isRecord(value)) return 'incontro non valido';
  if (!isCardArray(value.playerHand)) return 'mano del giocatore non valida';
  if (!isCardArray(value.opponentHand)) return 'mano avversaria non valida';
  if (!isCardArray(value.drawPile)) return 'tallone non valido';
  if (value.trumpCard !== null && !isPlayingCard(value.trumpCard)) return 'briscola scoperta non valida';
  if (!SUITS.includes(value.briscolaSuit as Suit)) return 'seme di briscola non valido';
  if (value.lastWinningSuit !== null && !SUITS.includes(value.lastWinningSuit as Suit)) {
    return 'ultimo seme vincente non valido';
  }

  const numericFields = [
    'targetScore',
    'currentRoundScore',
    'roundPointsTaken',
    'opponentPointsTaken',
    'roundTricksWon',
    'roundTricksLost',
    'tricksPlayedInRound',
    'consecutiveWinStreak',
    'discardsLeft',
    'bossShieldTricks',
  ];
  for (const key of numericFields) {
    if (!isCount(value[key])) return `campo numerico incontro non valido: ${key}`;
  }
  if (typeof value.isPlayerTurn !== 'boolean') return 'turno non valido';
  if (typeof value.bossDebuffNeutralized !== 'boolean') return 'stato dello Scudo non valido';
  if (!Array.isArray(value.capturedDenariRanks) || !value.capturedDenariRanks.every(isCount)) {
    return 'Denari catturati non validi';
  }
  if (!Array.isArray(value.playedCardIds) || !value.playedCardIds.every((id) => typeof id === 'string')) {
    return 'carte gia giocate non valide';
  }
  if (value.bossId !== null && !ALL_BOSS_BLINDS.some((boss) => boss.id === value.bossId)) {
    return `Boss sconosciuto: ${String(value.bossId)}`;
  }

  // The forty cards of the round are the forty of the deck, dealt out: each one
  // in exactly one place, and never twice.
  const inPlay = [
    ...value.playerHand,
    ...value.opponentHand,
    ...value.drawPile,
    ...(value.trumpCard ? [value.trumpCard as PlayingCard] : []),
  ];
  const ids = new Set(inPlay.map((card) => card.id));
  if (ids.size !== inPlay.length) return 'una carta compare due volte sul tavolo';
  if (value.playerHand.length !== value.opponentHand.length) return 'le due mani hanno dimensioni diverse';

  return null;
}

/** The run this snapshot describes, resolved against the current catalogues. */
export interface RestoredRun {
  snapshot: RunSnapshotV1;
  deck: DeckDefinition;
  boss: BossBlind | null;
  /** The cards already face-up this round, rebuilt from the run deck by id. */
  playedCards: PlayingCard[];
  capturedDenariRanks: Set<number>;
}

/**
 * Parses, validates and resolves a stored run. Never throws, never repairs.
 *
 * `raw` is whatever came out of storage, which is to say: anything at all.
 */
export function restoreRun(raw: string | null | undefined): RestoredRun | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!validateRunSnapshot(parsed).valid) return null;
  const snapshot = parsed as RunSnapshotV1;

  const deck = ALL_DECKS.find((entry) => entry.id === snapshot.deckId);
  if (!deck) return null;

  const encounter = snapshot.encounter;
  const baseBoss = encounter?.bossId
    ? ALL_BOSS_BLINDS.find((entry) => entry.id === encounter.bossId) ?? null
    : null;
  // An Endless Boss comes back as the same composition it was rolled as: the
  // modifiers are rebuilt from their ids, never re-rolled.
  const boss =
    baseBoss && encounter?.bossEndlessTierId
      ? restoreEndlessBoss(baseBoss, encounter.bossEndlessModifierIds ?? [], encounter.bossEndlessTierId)
      : baseBoss;

  const byId = new Map(snapshot.runDeck.map((card) => [card.id, card] as const));
  const playedCards = (encounter?.playedCardIds ?? [])
    .map((id) => byId.get(id))
    .filter((card): card is PlayingCard => card !== undefined);

  return {
    snapshot,
    deck,
    boss,
    playedCards,
    capturedDenariRanks: new Set(encounter?.capturedDenariRanks ?? []),
  };
}

export function saveRunSnapshot(snapshot: RunSnapshotV1): void {
  try {
    localStorage.setItem(RUN_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // A full or blocked storage is not worth interrupting a run over.
  }
}

/** True when there is something stored at all, valid or not. */
export function hasStoredRun(): boolean {
  try {
    return localStorage.getItem(RUN_SNAPSHOT_KEY) !== null;
  } catch {
    return false;
  }
}

/** Reads the stored run, dropping it on the floor if it does not check out. */
export function loadRunSnapshot(): RestoredRun | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RUN_SNAPSHOT_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  const restored = restoreRun(raw);
  if (!restored) clearRunSnapshot();
  return restored;
}

export function clearRunSnapshot(): void {
  try {
    localStorage.removeItem(RUN_SNAPSHOT_KEY);
  } catch {
    // Nothing to do: an unremovable key is re-validated on the next read.
  }
}
