/** Sconto della Casa applies to every shop article and rerolls, minimum $1. */
export function discountedShopCost(baseCost: number, hasHouseDiscount: boolean): number {
  return Math.max(1, baseCost - (hasHouseDiscount ? 2 : 0));
}

function remainingBoosterChoices(selectCount: number, selectedCount: number): number {
  return Math.max(0, selectCount - selectedCount);
}

export function boosterAbandonLabel(selectCount: number, selectedCount: number): string {
  return `RINUNCIA ALLE ${remainingBoosterChoices(selectCount, selectedCount)} SCELTE`;
}

export function trySpendMoney(
  balance: number,
  cost: number
): { success: boolean; balance: number } {
  const safeBalance = Math.max(0, balance);
  const safeCost = Math.max(0, cost);
  if (safeBalance < safeCost) return { success: false, balance: safeBalance };
  return { success: true, balance: safeBalance - safeCost };
}
