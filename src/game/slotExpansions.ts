import { discountedShopCost } from './shopRules';

/**
 * The two permanent services of the Bar Sport: one more chair at the table, one
 * more pocket for the Carte Sola.
 *
 * Everything about them lives here - the caps, the ladders, the discounts - so
 * the shop never has to ask `if (maxJokers === 7)`. The rules are a parameter,
 * not a constant baked into ShopView: an Endless mode later only has to hand a
 * different `SlotRules` in, and nothing else changes.
 */
export interface SlotRules {
  jokerCap: number;
  consumableCap: number;
}

/** The campaign stops at seven jolly and four Carte Sola. */
export const CAMPAIGN_SLOT_RULES: SlotRules = {
  jokerCap: 7,
  consumableCap: 4,
};

/**
 * What the next slot costs, keyed by the slots you have NOW.
 *
 * Keyed by the current count and not by "expansions bought" on purpose: the
 * Mazzo delle Carte Sola opens the run at 3 pockets, and its first purchase has
 * to be the 3 -> 4 step at $14. Reading the ladder off the count is what stops
 * a starting bonus from quietly handing out a cheap step nobody paid for.
 */
const JOKER_SLOT_LADDER: Record<number, number> = {
  5: 12,
  6: 24,
};

const CONSUMABLE_SLOT_LADDER: Record<number, number> = {
  2: 7,
  3: 14,
};

/** Tavolo Allargato takes a quarter off every later chair. Rounded up. */
export const TAVOLO_EXPANSION_DISCOUNT = 0.75;

export interface SlotExpansionContext {
  /** Tavolo Allargato is owned: jolly expansions cost 25% less. */
  hasTavoloAllargato: boolean;
  /** Sconto della Casa is owned: every shop article is $2 off, minimum $1. */
  hasHouseDiscount: boolean;
}

export interface SlotExpansion {
  fromSlots: number;
  toSlots: number;
  /** The ladder price, before any voucher touched it. */
  baseCost: number;
  /** What the button shows AND what the till charges. One number, one source. */
  cost: number;
}

export function getJokerSlotCap(rules: SlotRules = CAMPAIGN_SLOT_RULES): number {
  return rules.jokerCap;
}

export function getConsumableSlotCap(rules: SlotRules = CAMPAIGN_SLOT_RULES): number {
  return rules.consumableCap;
}

/**
 * Price shown and price charged come out of here, never out of two places.
 *
 * Tavolo first, Sconto second: the house discount is a flat $2 off the shelf
 * price with a $1 floor, so it has to be the last word on any article.
 */
function priceOf(baseCost: number, discount: number, context: SlotExpansionContext): number {
  const afterVoucher = Math.ceil(baseCost * discount);
  return discountedShopCost(afterVoucher, context.hasHouseDiscount);
}

function nextExpansion(
  currentSlots: number,
  cap: number,
  ladder: Record<number, number>,
  discount: number,
  context: SlotExpansionContext
): SlotExpansion | null {
  if (currentSlots >= cap) return null;
  const baseCost = ladder[currentSlots];
  // Off the ladder rather than at the cap: no price is defined, so nothing is
  // for sale. A future Endless adds rungs here, not branches at the call site.
  if (baseCost === undefined) return null;
  return {
    fromSlots: currentSlots,
    toSlots: currentSlots + 1,
    baseCost,
    cost: priceOf(baseCost, discount, context),
  };
}

/** The AMPLIA TAVOLO offer, or null when there is nothing left to sell. */
export function getNextJokerExpansion(
  currentSlots: number,
  context: SlotExpansionContext,
  rules: SlotRules = CAMPAIGN_SLOT_RULES
): SlotExpansion | null {
  return nextExpansion(
    currentSlots,
    getJokerSlotCap(rules),
    JOKER_SLOT_LADDER,
    context.hasTavoloAllargato ? TAVOLO_EXPANSION_DISCOUNT : 1,
    context
  );
}

/** The ALLARGA TASCA offer, or null when there is nothing left to sell. */
export function getNextConsumableExpansion(
  currentSlots: number,
  context: SlotExpansionContext,
  rules: SlotRules = CAMPAIGN_SLOT_RULES
): SlotExpansion | null {
  return nextExpansion(currentSlots, getConsumableSlotCap(rules), CONSUMABLE_SLOT_LADDER, 1, context);
}

/**
 * Tavolo Allargato at the cap is a voucher that does nothing: no free chair to
 * give, and no later expansion left to discount. The campaign takes it off the
 * shelf rather than selling an empty box.
 */
export function isTavoloAllargatoUseful(
  currentJokerSlots: number,
  rules: SlotRules = CAMPAIGN_SLOT_RULES
): boolean {
  return currentJokerSlots < getJokerSlotCap(rules);
}

/** The free chair the voucher hands over, never past the cap. */
export function applyTavoloAllargato(
  currentJokerSlots: number,
  rules: SlotRules = CAMPAIGN_SLOT_RULES
): number {
  return Math.min(currentJokerSlots + 1, getJokerSlotCap(rules));
}

export interface SlotPurchaseResult {
  bought: boolean;
  /** Unchanged when the purchase was refused: never below zero, ever. */
  money: number;
  slots: number;
}

/**
 * The till for both services, and the only place either of them charges.
 *
 * The offer carries the slot count it was priced against, and this refuses any
 * offer that no longer matches: that is what makes a double press safe. The
 * second press either arrives with a freshly computed offer (a legitimate next
 * rung, if it can be afforded) or with the stale one it was rendered from, and
 * the stale one is rejected rather than charged.
 */
export function purchaseSlotExpansion(
  offer: SlotExpansion | null,
  money: number,
  currentSlots: number
): SlotPurchaseResult {
  const refused: SlotPurchaseResult = { bought: false, money, slots: currentSlots };
  if (!offer) return refused;
  if (offer.fromSlots !== currentSlots) return refused;
  if (money < offer.cost) return refused;
  return { bought: true, money: money - offer.cost, slots: offer.toSlots };
}
