import { BossBlind, DeckDefinition, Joker, PlayingCard, UnoCard, Voucher } from '../../types/game';
import { ALL_BOOSTER_PACKS, ALL_UNO_CARDS, ALL_VOUCHERS } from '../../data/unoCards';
import { ALL_JOKERS, getRandomJokers } from '../../data/jokers';
import { ALL_BOSS_BLINDS } from '../../data/bosses';
import { ALL_DECKS } from '../../data/decks';
import {
  createRunDeck,
  ENCOUNTERS_PER_ANTE,
  getBlindTargetScore,
  getEncounterReward,
  isBossEncounter,
  upgradeCardInRunDeck,
} from '../gameState';
import { BOSS_RULES } from '../bossRules';
import { JOKER_EFFECTS } from '../jokerEffects';
import { rollCardUpgrade } from '../cardUpgrades';
import { evaluateVictoryCondition, VictoryMode } from '../victoryModes';
import { getRunRngState, seedRunRng, shuffleRun } from '../runRng';
import { PlayerPolicy } from './policies';
import { simulateEncounter } from './encounter';
import { SolaPolicy, STANDARD_SOLA } from './solaPlay';
import { instantiateJoker, instantiateUnoCard } from '../itemInstances';
import { discountedShopCost } from '../shopRules';

/**
 * La run intera, non solo la mano.
 *
 * Real prices, real slot limits, real reroll escalation, boosters drawn from
 * the same tables the shop draws from - and, above all, NO schedule. Nothing
 * here says "at ante 3 you receive the Vesuvio". The run buys what turned up
 * and what it could afford, which is the only way a survival number means
 * anything.
 *
 * The encounter itself is played by `simulateEncounter`, which drives the
 * game's own functions. The money that reaches il Jolly del Bar Sport is the
 * money in the wallet at that trick; the Carte Sola go through the real
 * dispatcher; the Boss rules come from `BOSS_RULES`.
 *
 * Slow on purpose. `bun run sim` is where the long ones live.
 */

export interface ShopOffer {
  jokers: Joker[];
  unoCards: UnoCard[];
  packs: typeof ALL_BOOSTER_PACKS;
  vouchers: Voucher[];
  rerollCost: number;
}

export interface RunState {
  money: number;
  jokers: Joker[];
  consumables: UnoCard[];
  vouchers: Voucher[];
  runDeck: PlayingCard[];
  maxJokers: number;
  maxConsumables: number;
  /** Cards in the run deck that have been upgraded at least once. */
  upgrades: number;
  rerolls: number;
  ante: number;
  round: number;
  discardsLeft: number;
}

/** What a buyer policy is allowed to do with a shop. */
export interface ShopActions {
  buyJoker(joker: Joker, cost: number): boolean;
  buyUno(card: UnoCard, cost: number): boolean;
  buyVoucher(voucher: Voucher): boolean;
  openPack(pack: (typeof ALL_BOOSTER_PACKS)[number], cost: number): boolean;
  reroll(): boolean;
  sellWorstJoker(): boolean;
}

export interface BuyerPolicy {
  id: string;
  name: string;
  blurb: string;
  /** Called once per shop visit; the policy spends what it wants to spend. */
  shop(state: RunState, offer: ShopOffer, actions: ShopActions): void;
}

/** A whole way of playing: how it buys, how it plays, how it spends Carte Sola. */
export interface RunPolicy {
  id: string;
  name: string;
  blurb: string;
  buyer: BuyerPolicy;
  play: PlayerPolicy;
  sola?: SolaPolicy;
}

/** Prices follow the shop exactly, discount voucher included. */
function priceOf(base: number, discount: number): number {
  return Math.max(1, base - discount);
}

/**
 * How good a joker looks without running the scoring engine on it.
 *
 * Rough, and the same for every policy, so a policy that prefers jokers is
 * comparing like with like. Rarity is the shop's own signal of power.
 */
export function jokerAppeal(joker: Joker): number {
  const rarityWeight: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3.5,
    legendary: 6,
  };
  const printed =
    (joker.multBonus ?? 0) / 4 + ((joker.xMultBonus ?? 1) - 1) * 6 + (joker.chipsBonus ?? 0) / 30;
  return rarityWeight[joker.rarity] * 2 + printed;
}

export interface RoundRecord {
  ante: number;
  round: number;
  score: number;
  target: number;
  briscolaPoints: number;
  opponentBriscolaPoints: number;
  won: boolean;
  moneyBefore: number;
  moneyAfter: number;
  jokers: number;
  upgrades: number;
  rerolls: number;
  foilCards: number;
  solaCast: number;
  /** Tricks in which the hand held Re + Cavallo of a suit. */
  accusaArmedTricks: number;
  accusaTriggers: number;
}

/** Why the run ended, as the victory rules saw it. */
export type LossCause = 'chips' | 'briscola' | 'both' | 'none';

export interface RunResult {
  policyId: string;
  playPolicyId: string;
  deckId: string;
  victoryMode: VictoryMode;
  seed: number;
  /** The last ante the run was alive in. */
  reachedAnte: number;
  /** Cleared the boss of ante 8. */
  completed: boolean;
  rounds: RoundRecord[];
  finalMoney: number;
  maxMoney: number;
  /** Money spent in shops, and money taken in from rewards and cards. */
  totalSpent: number;
  totalEarned: number;
  /** Median money on the way out of a shop, over the whole run. */
  moneyAfterShop: number[];
  finalJokers: number;
  finalJokerIds: string[];
  finalUpgrades: number;
  totalRerolls: number;
  solaBought: number;
  solaUsed: number;
  foilCards: number;
  /** Foil cards in the run deck at the end of each ante. */
  foilByAnte: Record<number, number>;
  legendaryBought: number;
  legendarySeen: number;
  lossCause: LossCause;
  /** (money at the trick, score of the trick), for the Sport correlation. */
  moneyScoreSamples: Array<[number, number]>;
  /** (steel cards held, score of the trick). */
  steelHeldSamples: Array<[number, number]>;
  wildPlayedScore: number;
  wildPlayedTricks: number;
  plainPlayedScore: number;
  plainPlayedTricks: number;
  accusaArmedTricks: number;
  accusaTriggers: number;
  totalTricks: number;
  /** Score credited to tricks each joker id was among the triggers of. */
  jokerTriggerScore: Record<string, number>;
}

export interface SimulateRunOptions {
  deck?: DeckDefinition;
  victoryMode?: VictoryMode;
  /** Carte Sola behaviour. Pass NEVER_SOLA to measure the slot's worth. */
  sola?: SolaPolicy;
  /** Forced starting board, for the targeted experiments. */
  startingJokerIds?: string[];
  /** Reported back so any run can be replayed exactly. */
  seed?: number;
}

/**
 * Plays one run start to finish, or until a blind is not cleared.
 *
 * Everything the game charges for is charged here: the shop draws from the same
 * tables, the reroll gets a dollar more expensive each time, slots are capped,
 * and a booster costs what a booster costs.
 */
export function simulateRun(
  playPolicy: PlayerPolicy,
  buyer: BuyerPolicy,
  options: SimulateRunOptions = {}
): RunResult {
  const deckDef = options.deck ?? ALL_DECKS[0];
  const mode = options.victoryMode ?? 'briscolatro';
  const sola = options.sola ?? STANDARD_SOLA;
  const seed = options.seed ?? getRunRngState().seed;
  if (options.seed !== undefined) seedRunRng(options.seed);

  const startingJokerIds = options.startingJokerIds ?? deckDef.startingJokers;

  const state: RunState = {
    money: deckDef.startingMoney,
    jokers: startingJokerIds
      .map((id) => ALL_JOKERS.find((j) => j.id === id))
      .filter((j): j is Joker => Boolean(j))
      .map((j) => instantiateJoker(j)),
    consumables: [],
    vouchers: deckDef.startingVouchers
      .map((id) => ALL_VOUCHERS.find((v) => v.id === id))
      .filter((v): v is Voucher => Boolean(v))
      .map((v) => ({ ...v, bought: true })),
    runDeck: createRunDeck(deckDef),
    maxJokers: 5,
    maxConsumables: deckDef.specialDeckPerk === 'holo_figures' ? 3 : 2,
    upgrades: 0,
    rerolls: 0,
    ante: 1,
    round: 1,
    discardsLeft: deckDef.startingDiscards,
  };

  const ledger = {
    spent: 0,
    earned: deckDef.startingMoney,
    maxMoney: state.money,
    solaBought: 0,
    solaUsed: 0,
    legendaryBought: 0,
    legendarySeen: 0,
    moneyAfterShop: [] as number[],
  };

  const rounds: RoundRecord[] = [];
  const foilByAnte: Record<number, number> = {};
  const moneyScoreSamples: Array<[number, number]> = [];
  const steelHeldSamples: Array<[number, number]> = [];
  const jokerTriggerScore: Record<string, number> = {};
  let wildPlayedScore = 0;
  let wildPlayedTricks = 0;
  let plainPlayedScore = 0;
  let plainPlayedTricks = 0;
  let accusaArmedTricks = 0;
  let accusaTriggers = 0;
  let totalTricks = 0;
  let reachedAnte = 1;
  let completed = false;
  let lossCause: LossCause = 'none';

  const countFoil = () => state.runDeck.filter((card) => card.edition === 'foil').length;

  const finish = (): RunResult => ({
    policyId: buyer.id,
    playPolicyId: playPolicy.id,
    deckId: deckDef.id,
    victoryMode: mode,
    seed,
    reachedAnte,
    completed,
    rounds,
    finalMoney: state.money,
    maxMoney: ledger.maxMoney,
    totalSpent: ledger.spent,
    totalEarned: ledger.earned,
    moneyAfterShop: ledger.moneyAfterShop,
    finalJokers: state.jokers.length,
    finalJokerIds: state.jokers.map((j) => j.id),
    finalUpgrades: state.upgrades,
    totalRerolls: state.rerolls,
    solaBought: ledger.solaBought,
    solaUsed: ledger.solaUsed,
    foilCards: countFoil(),
    foilByAnte,
    legendaryBought: ledger.legendaryBought,
    legendarySeen: ledger.legendarySeen,
    lossCause,
    moneyScoreSamples,
    steelHeldSamples,
    wildPlayedScore,
    wildPlayedTricks,
    plainPlayedScore,
    plainPlayedTricks,
    accusaArmedTricks,
    accusaTriggers,
    totalTricks,
    jokerTriggerScore,
  });

  for (let ante = 1; ante <= 8; ante++) {
    state.ante = ante;
    reachedAnte = ante;

    // Tavolo, then Boss. Two encounters an ante, both full games of Briscola.
    for (let round = 1; round <= ENCOUNTERS_PER_ANTE; round++) {
      state.round = round;
      const isBoss = isBossEncounter(round);
      const boss: BossBlind | null = isBoss
        ? ALL_BOSS_BLINDS.find((b) => b.ante === ante) ?? null
        : null;

      const target = getBlindTargetScore(ante, round, {
        bossMultiplier: isBoss ? BOSS_RULES.getTargetScoreMultiplier(boss) : 1,
        deckMultiplier: deckDef.specialDeckPerk === 'high_stakes_vision' ? 1.25 : 1,
      });

      // initRound resets the discards from the deck, the voucher and il Caffe
      // Corretto: they do not accumulate across encounters.
      state.discardsLeft =
        deckDef.startingDiscards +
        (state.vouchers.some((v) => v.id === 'v_scarto' && v.bought) ? 1 : 0) +
        JOKER_EFFECTS.getExtraDiscards(state.jokers);

      const moneyBefore = state.money;
      const report = simulateEncounter({
        playPolicy,
        solaPolicy: sola,
        jokers: state.jokers,
        runDeck: state.runDeck,
        boss,
        money: state.money,
        discardsLeft: state.discardsLeft,
        consumables: state.consumables,
        maxJokers: state.maxJokers,
        maxConsumables: state.maxConsumables,
        targetScore: target,
      });

      // Everything the encounter changed comes back out of it, exactly as the
      // app carries it: growth, Foil stamps, cash, and the slots.
      state.jokers = report.jokersAfter;
      state.runDeck = report.runDeckAfter;
      state.consumables = report.consumablesAfter;
      state.discardsLeft = report.discardsLeftAfter;
      if (report.moneyAfter > state.money) ledger.earned += report.moneyAfter - state.money;
      state.money = report.moneyAfter;
      ledger.solaUsed += report.solaCasts.length;
      ledger.maxMoney = Math.max(ledger.maxMoney, state.money);

      moneyScoreSamples.push(...report.moneyScoreSamples);
      steelHeldSamples.push(...report.steelHeldSamples);
      wildPlayedScore += report.wildPlayedScore;
      wildPlayedTricks += report.wildPlayedTricks;
      plainPlayedScore += report.plainPlayedScore;
      plainPlayedTricks += report.plainPlayedTricks;
      accusaArmedTricks += report.accusaArmedTricks;
      accusaTriggers += report.jokerTriggerCounts['j_accusa_reale'] ?? 0;
      totalTricks += report.tricksPlayed;
      for (const [id, score] of Object.entries(report.jokerTriggerScore)) {
        jokerTriggerScore[id] = (jokerTriggerScore[id] ?? 0) + score;
      }

      const verdict = evaluateVictoryCondition({
        mode,
        score: report.score,
        targetScore: target,
        playerBriscolaPoints: report.briscolaPoints,
      });

      if (verdict.won) {
        // Exactly the payout calculateRoundOutcome makes.
        const interestCap = state.vouchers.some((v) => v.id === 'v_interessi') ? 10 : 5;
        const interest = Math.min(interestCap, Math.floor(state.money / 5));
        const briscolaBonus = report.briscolaPoints > 60 ? 4 : 0;
        // L'Oste del Bar pays on the balance AFTER the reward, exactly as
        // App.tsx pays it: it reads a wallet that has already been topped up.
        const payout = getEncounterReward(ante, round) + interest + briscolaBonus;
        state.money += payout;
        const oste = JOKER_EFFECTS.getRoundEndBonusDollars(state.jokers, state.money);
        state.money += oste;
        ledger.earned += payout + oste;
        ledger.maxMoney = Math.max(ledger.maxMoney, state.money);
      }

      rounds.push({
        ante,
        round,
        score: report.score,
        target,
        briscolaPoints: report.briscolaPoints,
        opponentBriscolaPoints: report.opponentBriscolaPoints,
        won: verdict.won,
        moneyBefore,
        moneyAfter: state.money,
        jokers: state.jokers.length,
        upgrades: state.upgrades,
        rerolls: state.rerolls,
        foilCards: countFoil(),
        solaCast: report.solaCasts.length,
        accusaArmedTricks: report.accusaArmedTricks,
        accusaTriggers: report.jokerTriggerCounts['j_accusa_reale'] ?? 0,
      });

      if (!verdict.won) {
        lossCause = !verdict.chipsPassed && !verdict.briscolaPassed
          ? 'both'
          : !verdict.chipsPassed
            ? 'chips'
            : 'briscola';
        return finish();
      }

      // Clearing the Ante 8 Boss ends the run: no shop after the last hand.
      if (ante === 8 && isBoss) {
        completed = true;
        break;
      }
      visitShop(state, buyer, ledger);
      ledger.moneyAfterShop.push(state.money);
    }

    foilByAnte[ante] = countFoil();
  }

  return finish();
}

interface Ledger {
  spent: number;
  earned: number;
  maxMoney: number;
  solaBought: number;
  solaUsed: number;
  legendaryBought: number;
  legendarySeen: number;
  moneyAfterShop: number[];
}

/** One visit: draw the shelves the way ShopView draws them, then let the policy spend. */
function visitShop(state: RunState, buyer: BuyerPolicy, ledger: Ledger): void {
  const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;
  const ownedVouchers = new Set(state.vouchers.map((v) => v.id));

  const offer: ShopOffer = {
    jokers: getRandomJokers(3),
    unoCards: shuffleRun([...ALL_UNO_CARDS]).slice(0, 2),
    packs: shuffleRun([...ALL_BOOSTER_PACKS]).slice(0, 3),
    vouchers: shuffleRun(ALL_VOUCHERS.filter((v) => !ownedVouchers.has(v.id))).slice(0, 2),
    rerollCost: 5 - discount,
  };

  const noteShelf = (jokers: Joker[]) => {
    ledger.legendarySeen += jokers.filter((j) => j.rarity === 'legendary').length;
  };
  noteShelf(offer.jokers);

  // Il Conto Sospeso settles at the till, once per visit per copy.
  let spentThisShop = 0;
  const contoSospesoPaid = new Set<string>();

  const spend = (cost: number) => {
    state.money -= cost;
    ledger.spent += cost;
    if (state.money < 0) throw new Error('simulatore: saldo negativo dopo un acquisto');
    if (cost <= 0) return;
    spentThisShop += cost;
    const settled = JOKER_EFFECTS.applyShopSpend(state.jokers, spentThisShop, contoSospesoPaid);
    settled.paidInstanceIds.forEach((id) => contoSospesoPaid.add(id));
    state.jokers = settled.jokers;
  };

  const actions: ShopActions = {
    buyJoker(joker, cost) {
      if (state.jokers.length >= state.maxJokers || state.money < cost) return false;
      spend(cost);
      state.jokers.push(instantiateJoker(joker));
      if (joker.rarity === 'legendary') ledger.legendaryBought++;
      offer.jokers = offer.jokers.filter((j) => j !== joker);
      return true;
    },
    buyUno(card, cost) {
      if (state.consumables.length >= state.maxConsumables || state.money < cost) return false;
      spend(cost);
      state.consumables.push(instantiateUnoCard(card));
      ledger.solaBought++;
      offer.unoCards = offer.unoCards.filter((c) => c !== card);
      return true;
    },
    buyVoucher(voucher) {
      const cost = discountedShopCost(
        voucher.cost,
        state.vouchers.some((entry) => entry.id === 'v_sconto' && entry.bought)
      );
      if (state.money < cost) return false;
      spend(cost);
      state.vouchers.push({ ...voucher, bought: true });
      if (voucher.id === 'v_tavolo') state.maxJokers = 6;
      offer.vouchers = offer.vouchers.filter((v) => v !== voucher);
      return true;
    },
    openPack(pack, cost) {
      if (state.money < cost) return false;
      spend(cost);
      offer.packs = offer.packs.filter((p) => p !== pack);
      openBooster(state, pack, ledger);
      return true;
    },
    reroll() {
      if (state.money < offer.rerollCost) return false;
      spend(offer.rerollCost);
      state.rerolls++;
      offer.jokers = getRandomJokers(3);
      noteShelf(offer.jokers);
      offer.unoCards = shuffleRun([...ALL_UNO_CARDS]).slice(0, 2);
      offer.rerollCost += 1;
      return true;
    },
    sellWorstJoker() {
      if (state.jokers.length === 0) return false;
      const worst = [...state.jokers].sort((a, b) => jokerAppeal(a) - jokerAppeal(b))[0];
      state.jokers = state.jokers.filter((j) => j !== worst);
      state.money += worst.sellValue;
      ledger.earned += worst.sellValue;
      return true;
    },
  };

  buyer.shop(state, offer, actions);
  ledger.maxMoney = Math.max(ledger.maxMoney, state.money);
}

/** Opens a pack and takes the best of what it shows, by the same crude appeal. */
function openBooster(
  state: RunState,
  pack: (typeof ALL_BOOSTER_PACKS)[number],
  ledger: Ledger
): void {
  const types: Array<'cards' | 'uno' | 'joker'> =
    pack.type === 'celeste'
      ? shuffleRun<'cards' | 'uno' | 'joker'>(['cards', 'uno', 'joker', 'cards', 'joker']).slice(
          0,
          pack.packSize
        )
      : Array(pack.packSize).fill(pack.type as 'cards' | 'uno' | 'joker');

  const countOf = (type: string) => types.filter((t) => t === type).length;

  const cardOffers = shuffleRun(state.runDeck)
    .slice(0, countOf('cards'))
    .map((card) => rollCardUpgrade(card));
  const jokerOffers = getRandomJokers(countOf('joker'));
  ledger.legendarySeen += jokerOffers.filter((j) => j.rarity === 'legendary').length;
  const unoOffers = shuffleRun([...ALL_UNO_CARDS]).slice(0, countOf('uno'));

  let picks = pack.selectCount;

  // Jolly first while a slot is free, then a deck upgrade, then a Carta Sola:
  // a slot is permanent and a consumable is not.
  const rankedJokers = [...jokerOffers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
  for (const joker of rankedJokers) {
    if (picks <= 0) break;
    if (state.jokers.length >= state.maxJokers) break;
    state.jokers.push(instantiateJoker(joker));
    if (joker.rarity === 'legendary') ledger.legendaryBought++;
    picks--;
  }
  for (const card of cardOffers) {
    if (picks <= 0) break;
    state.runDeck = upgradeCardInRunDeck(state.runDeck, card);
    state.upgrades++;
    picks--;
  }
  for (const card of unoOffers) {
    if (picks <= 0) break;
    if (state.consumables.length >= state.maxConsumables) break;
    state.consumables.push(instantiateUnoCard(card));
    ledger.solaBought++;
    picks--;
  }
}

export { priceOf };
