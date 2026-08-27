import { BossBlind, DeckDefinition, Joker, PlayingCard, UnoCard, Voucher } from '../../types/game';
import { ALL_BOOSTER_PACKS, ALL_UNO_CARDS, ALL_VOUCHERS } from '../../data/unoCards';
import { ALL_JOKERS, getRandomJokers } from '../../data/jokers';
import { ALL_BOSS_BLINDS } from '../../data/bosses';
import { ALL_DECKS } from '../../data/decks';
import {
  createRunDeck,
  getBlindBaseReward,
  getBlindTargetScore,
  upgradeCardInRunDeck,
} from '../gameState';
import { BOSS_RULES } from '../bossRules';
import { rollCardUpgrade } from '../cardUpgrades';
import { evaluateVictoryCondition, VictoryMode } from '../victoryModes';
import { PlayerPolicy } from './policies';
import { playRound } from './policyLab';

/**
 * La run intera, non solo la mano.
 *
 * The older harness measures one round at a time, which makes it a good
 * regression test for scoring and a poor model of the actual game: a run is
 * eight antes of compounding, and whether ante 6 is beatable depends far more
 * on what the shop happened to offer at ante 3 than on any single hand.
 *
 * So this plays the whole thing. Real prices, real slot limits, real reroll
 * escalation, boosters drawn from the same tables the shop draws from - and,
 * above all, NO schedule. Nothing here says "at ante 3 you receive the
 * Vesuvio". The run buys what turned up and what it could afford, which is the
 * only way a survival number means anything.
 *
 * Slow on purpose. It lives beside the old suite, not instead of it.
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

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

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
  won: boolean;
  moneyAfter: number;
  jokers: number;
  upgrades: number;
  rerolls: number;
}

export interface RunResult {
  policyId: string;
  /** The last ante the run was alive in. */
  reachedAnte: number;
  /** Cleared the boss of ante 8. */
  completed: boolean;
  rounds: RoundRecord[];
  finalMoney: number;
  finalJokers: number;
  finalUpgrades: number;
  totalRerolls: number;
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
  options: {
    deck?: DeckDefinition;
    victoryMode?: VictoryMode;
    /** Carte Sola are spent for a x1.5 on one trick each, see playRound. */
    useConsumables?: boolean;
  } = {}
): RunResult {
  const deckDef = options.deck ?? ALL_DECKS[0];
  const mode = options.victoryMode ?? 'briscolatro';

  const state: RunState = {
    money: deckDef.startingMoney,
    jokers: deckDef.startingJokers
      .map((id) => ALL_JOKERS.find((j) => j.id === id))
      .filter((j): j is Joker => Boolean(j))
      .map((j) => ({ ...j, stats: {} })),
    consumables: [],
    vouchers: deckDef.startingVouchers
      .map((id) => ALL_VOUCHERS.find((v) => v.id === id))
      .filter((v): v is Voucher => Boolean(v))
      .map((v) => ({ ...v, bought: true })),
    runDeck: createRunDeck(deckDef),
    maxJokers: 5,
    maxConsumables: 2,
    upgrades: 0,
    rerolls: 0,
    ante: 1,
    round: 1,
  };

  const rounds: RoundRecord[] = [];
  let reachedAnte = 1;
  let completed = false;

  for (let ante = 1; ante <= 8; ante++) {
    state.ante = ante;
    reachedAnte = ante;

    for (let round = 1; round <= 3; round++) {
      state.round = round;
      const boss: BossBlind | null =
        round === 3 ? ALL_BOSS_BLINDS.find((b) => b.ante === ante) ?? null : null;

      const target = getBlindTargetScore(ante, round, {
        bossMultiplier: round === 3 ? BOSS_RULES.getTargetScoreMultiplier(boss) : 1,
      });

      // Carte Sola held at the start of the blind get spent in it.
      const boosts = options.useConsumables === false ? 0 : state.consumables.length;
      const report = playRound(
        playPolicy,
        state.jokers,
        boss,
        state.runDeck,
        [],
        undefined,
        undefined,
        boosts
      );
      state.consumables = [];
      // Permanent joker growth carries to the next blind, as it does in the game.
      state.jokers = report.jokersAfter;

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
        state.money += getBlindBaseReward(ante) + interest + briscolaBonus;
      }

      rounds.push({
        ante,
        round,
        score: report.score,
        target,
        briscolaPoints: report.briscolaPoints,
        won: verdict.won,
        moneyAfter: state.money,
        jokers: state.jokers.length,
        upgrades: state.upgrades,
        rerolls: state.rerolls,
      });

      if (!verdict.won) {
        return {
          policyId: buyer.id,
          reachedAnte,
          completed: false,
          rounds,
          finalMoney: state.money,
          finalJokers: state.jokers.length,
          finalUpgrades: state.upgrades,
          totalRerolls: state.rerolls,
        };
      }

      if (ante === 8 && round === 3) completed = true;
      visitShop(state, buyer);
    }
  }

  return {
    policyId: buyer.id,
    reachedAnte,
    completed,
    rounds,
    finalMoney: state.money,
    finalJokers: state.jokers.length,
    finalUpgrades: state.upgrades,
    totalRerolls: state.rerolls,
  };
}

/** One visit: draw the shelves the way ShopView draws them, then let the policy spend. */
function visitShop(state: RunState, buyer: BuyerPolicy): void {
  const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;
  const ownedVouchers = new Set(state.vouchers.map((v) => v.id));

  const offer: ShopOffer = {
    jokers: getRandomJokers(2),
    unoCards: shuffle([...ALL_UNO_CARDS]).slice(0, 2),
    packs: shuffle([...ALL_BOOSTER_PACKS]).slice(0, 2),
    vouchers: shuffle(ALL_VOUCHERS.filter((v) => !ownedVouchers.has(v.id))).slice(0, 2),
    rerollCost: 5 - discount,
  };

  const actions: ShopActions = {
    buyJoker(joker, cost) {
      if (state.jokers.length >= state.maxJokers || state.money < cost) return false;
      state.money -= cost;
      state.jokers.push({ ...joker, stats: {} });
      offer.jokers = offer.jokers.filter((j) => j !== joker);
      return true;
    },
    buyUno(card, cost) {
      if (state.consumables.length >= state.maxConsumables || state.money < cost) return false;
      state.money -= cost;
      state.consumables.push({ ...card });
      offer.unoCards = offer.unoCards.filter((c) => c !== card);
      return true;
    },
    buyVoucher(voucher) {
      if (state.money < voucher.cost) return false;
      state.money -= voucher.cost;
      state.vouchers.push({ ...voucher, bought: true });
      if (voucher.id === 'v_tavolo') state.maxJokers = 6;
      offer.vouchers = offer.vouchers.filter((v) => v !== voucher);
      return true;
    },
    openPack(pack, cost) {
      if (state.money < cost) return false;
      state.money -= cost;
      offer.packs = offer.packs.filter((p) => p !== pack);
      openBooster(state, pack);
      return true;
    },
    reroll() {
      if (state.money < offer.rerollCost) return false;
      state.money -= offer.rerollCost;
      state.rerolls++;
      offer.jokers = getRandomJokers(2);
      offer.unoCards = shuffle([...ALL_UNO_CARDS]).slice(0, 2);
      offer.rerollCost += 1;
      return true;
    },
    sellWorstJoker() {
      if (state.jokers.length === 0) return false;
      const worst = [...state.jokers].sort((a, b) => jokerAppeal(a) - jokerAppeal(b))[0];
      state.jokers = state.jokers.filter((j) => j !== worst);
      state.money += worst.sellValue;
      return true;
    },
  };

  buyer.shop(state, offer, actions);
}

/** Opens a pack and takes the best of what it shows, by the same crude appeal. */
function openBooster(state: RunState, pack: (typeof ALL_BOOSTER_PACKS)[number]): void {
  const types: Array<'cards' | 'uno' | 'joker'> =
    pack.type === 'celeste'
      ? shuffle(['cards', 'uno', 'joker', 'cards', 'joker']).slice(0, pack.packSize)
      : Array(pack.packSize).fill(pack.type as 'cards' | 'uno' | 'joker');

  const countOf = (type: string) => types.filter((t) => t === type).length;

  const cardOffers = shuffle(state.runDeck)
    .slice(0, countOf('cards'))
    .map((card) => rollCardUpgrade(card));
  const jokerOffers = getRandomJokers(countOf('joker'));
  const unoOffers = shuffle([...ALL_UNO_CARDS]).slice(0, countOf('uno'));

  let picks = pack.selectCount;

  // Jolly first while a slot is free, then a deck upgrade, then a Carta Sola:
  // a slot is permanent and a consumable is not.
  const rankedJokers = [...jokerOffers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
  for (const joker of rankedJokers) {
    if (picks <= 0) break;
    if (state.jokers.length >= state.maxJokers) break;
    state.jokers.push({ ...joker, stats: {} });
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
    state.consumables.push({ ...card });
    picks--;
  }
}
