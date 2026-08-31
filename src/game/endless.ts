import { SlotRules } from './slotExpansions';

/**
 * Endless: what happens after the tournament is already won.
 *
 * Ante 8 is the end of the campaign and nothing here moves it. The Boss of Ante
 * 8 is beaten, the win is registered, the fanfare plays - and only then is the
 * player asked whether to walk out with it or keep doubling the stake. Dying at
 * Ante 23 does not un-win the tournament, so the two results are counted
 * separately everywhere: a campaign victory, and an Endless record.
 *
 * Everything that changes with the Ante lives in this module: the tier, the
 * target curve, the slot caps. No component asks `ante > 8` on its own.
 */
export type RunPhase = 'campaign' | 'endless';

export const CAMPAIGN_FINAL_ANTE = 8;

export type EndlessTierId =
  | 'asceso'
  | 'sovraccarico'
  | 'ultra_istinto'
  | 'trascendente'
  | 'fuori_scala';

export interface EndlessTier {
  id: EndlessTierId;
  /** The word on the blind. Uppercase, as it is printed. */
  name: string;
  /** One line of bar talk. Flavour only - it carries no rule. */
  subtitle: string;
  fromAnte: number;
  /** null on the last tier: it has no ceiling. */
  toAnte: number | null;
  accentColor: string;
}

export const ENDLESS_TIERS: EndlessTier[] = [
  {
    id: 'asceso',
    name: 'ASCESO',
    subtitle: 'Il bar ha chiuso, ma qualcuno tiene la serranda a meta\'.',
    fromAnte: 9,
    toAnte: 16,
    accentColor: '#38bdf8',
  },
  {
    id: 'sovraccarico',
    name: 'SOVRACCARICO',
    subtitle: 'Il tavolo trema e nessuno si alza.',
    fromAnte: 17,
    toAnte: 24,
    accentColor: '#a855f7',
  },
  {
    id: 'ultra_istinto',
    name: 'ULTRA-ISTINTO',
    subtitle: 'Giochi la carta prima di averla pensata.',
    fromAnte: 25,
    toAnte: 32,
    accentColor: '#f97316',
  },
  {
    id: 'trascendente',
    name: 'TRASCENDENTE',
    subtitle: 'Il conto non lo porta piu\' nessuno.',
    fromAnte: 33,
    toAnte: 40,
    accentColor: '#f43f5e',
  },
  {
    id: 'fuori_scala',
    name: 'FUORI SCALA',
    subtitle: 'Qui il barista ha smesso di contare.',
    fromAnte: 41,
    toAnte: null,
    accentColor: '#facc15',
  },
];

export function isEndlessAnte(ante: number): boolean {
  return ante > CAMPAIGN_FINAL_ANTE;
}

/** The tier an Ante belongs to, or null while the campaign is still running. */
export function getEndlessTier(ante: number): EndlessTier | null {
  if (!isEndlessAnte(ante)) return null;
  return (
    ENDLESS_TIERS.find(
      (tier) => ante >= tier.fromAnte && (tier.toAnte === null || ante <= tier.toAnte)
    ) ?? ENDLESS_TIERS[ENDLESS_TIERS.length - 1]
  );
}

/**
 * How much harder an Endless Ante is than the last campaign one.
 *
 * A single ratio per tier, compounded from Ante 8, so the curve is continuous
 * where the campaign stops: `getEndlessTargetMultiplier(8)` is exactly 1 and
 * Ante 9 is one step of the first tier's ratio above it. The ratios climb by
 * tier because the player's own scaling does too - permanent joker growth,
 * a fuller rail, an upgraded deck - and a flat ratio would either stall at the
 * bottom or wall at the top.
 *
 * The steps are deliberately gentler than the campaign's own late ratio (x2.0
 * into Ante 8): Endless is meant to be survivable for a stretch and then
 * clearly lethal, not to end two antes after it starts.
 */
const TIER_STEP: Record<EndlessTierId, number> = {
  asceso: 1.55,
  sovraccarico: 1.75,
  ultra_istinto: 1.95,
  trascendente: 2.15,
  fuori_scala: 2.35,
};

/**
 * The ceiling exists because a target is a number on a screen.
 *
 * Compounding 2.35 per Ante reaches Number.MAX_VALUE somewhere around Ante 370
 * and turns into Infinity right after, which would render as "Infinity Chips"
 * and make the victory check meaningless. The curve is clamped well below that,
 * far past any reachable Ante, so the target is always a finite number the game
 * can compare against.
 */
export const ENDLESS_MAX_TARGET_MULTIPLIER = 1e12;

export function getEndlessTargetMultiplier(ante: number): number {
  if (!isEndlessAnte(ante)) return 1;

  let multiplier = 1;
  for (let step = CAMPAIGN_FINAL_ANTE + 1; step <= ante; step++) {
    const tier = getEndlessTier(step);
    multiplier *= TIER_STEP[tier!.id];
    if (multiplier >= ENDLESS_MAX_TARGET_MULTIPLIER) return ENDLESS_MAX_TARGET_MULTIPLIER;
  }
  return multiplier;
}

/**
 * Slot caps by tier.
 *
 * The cap is raised, never the slots: reaching a tier only puts one more
 * expansion on the shop shelf, at the ladder price. Nothing is handed over.
 * The Carte Sola cap stays at four all the way up - four is already the whole
 * hand's worth of instant effects, and widening it turns every boss rule into
 * something you buy your way out of.
 */
const JOKER_CAP_BY_TIER: Record<EndlessTierId, number> = {
  asceso: 8,
  sovraccarico: 9,
  ultra_istinto: 9,
  trascendente: 10,
  fuori_scala: 10,
};

const CAMPAIGN_JOKER_CAP = 7;
export const CONSUMABLE_CAP = 4;

export function getSlotRulesForAnte(ante: number): SlotRules {
  const tier = getEndlessTier(ante);
  return {
    jokerCap: tier ? JOKER_CAP_BY_TIER[tier.id] : CAMPAIGN_JOKER_CAP,
    consumableCap: CONSUMABLE_CAP,
  };
}
