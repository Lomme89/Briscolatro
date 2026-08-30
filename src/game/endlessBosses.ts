import { ALL_BOSS_BLINDS } from '../data/bosses';
import { BossBlind, BossDebuffType } from '../types/game';
import { EndlessTierId, getEndlessTier, isEndlessAnte } from './endless';
import { createRunRng, pickWith, shuffleWith } from './runRng';

/**
 * Endless Bosses, without thirty new Bosses.
 *
 * The pool of eight is reused as-is and a MODIFIER is layered on top: the Boss
 * keeps its own rule and picks up one or two more. That is deliberately not
 * "+100% target, +$0 reward" - a bigger number changes nothing about how the
 * hand is played. Every modifier here is a rule you have to play around, drawn
 * from the same vocabulary the engine already enforces, so a composed Boss is
 * still made of rules the game can actually apply and the blind can actually
 * spell out.
 *
 * The whole point of the metadata is the compatibility check: two rules that
 * rewrite the suit at the same time, or that between them leave a hand with no
 * legal card to open, must never end up on the same Boss. A less extreme but
 * readable combination beats a spectacular illegal one.
 */
export type EndlessModifierId =
  | 'mod_pedaggio'
  | 'mod_banco_chiuso'
  | 'mod_lame'
  | 'mod_coperto'
  | 'mod_mescolo'
  | 'mod_mescolo_stretto'
  | 'mod_silenzio'
  | 'mod_lisce_mute'
  | 'mod_carichi_dimezzati'
  | 'mod_mani_legate';

/**
 * What a modifier can collide with, named rather than enumerated pairwise.
 *
 * `suit_rewrite` covers anything that changes what suit a card counts as, or
 * when. `lead_restriction` covers anything that takes opening cards away. Two
 * lead restrictions can between them describe a hand with no legal opening,
 * which is a position the round can never leave.
 */
export type ModifierFamily = 'suit_rewrite' | 'lead_restriction' | 'scoring' | 'resource' | 'silence';

export interface EndlessModifier {
  id: EndlessModifierId;
  name: string;
  /** One line, printed on the blind before the encounter starts. */
  description: string;
  family: ModifierFamily;
  /** Engine rules this modifier switches on, on top of the Boss's own. */
  grants: BossDebuffType[];
  /** Discards removed for the encounter. Never below zero at the call site. */
  discardPenalty?: number;
  /** Rotating Briscola moves every this many tricks instead of the usual three. */
  briscolaRotationPeriod?: number;
  /** Tiers that are allowed to roll it. Light ones start at ASCESO. */
  tiers: EndlessTierId[];
}

const ALL_TIERS: EndlessTierId[] = [
  'asceso',
  'sovraccarico',
  'ultra_istinto',
  'trascendente',
  'fuori_scala',
];

/** Everything except ASCESO: the harder half of the pool. */
const FROM_SOVRACCARICO: EndlessTierId[] = ALL_TIERS.slice(1);

export const ENDLESS_MODIFIERS: EndlessModifier[] = [
  {
    id: 'mod_lisce_mute',
    name: 'Lisce Mute',
    description: 'Le carte Lisce (0 pt) non assegnano Chips base.',
    family: 'scoring',
    grants: ['no_lisce_chips'],
    tiers: ALL_TIERS,
  },
  {
    id: 'mod_carichi_dimezzati',
    name: 'Carichi Dimezzati',
    description: 'Assi e Tre valgono meta\' dei loro punti.',
    family: 'scoring',
    grants: ['half_carichi'],
    tiers: ALL_TIERS,
  },
  {
    id: 'mod_mani_legate',
    name: 'Mani Legate',
    description: 'Un Scarto in meno per questo incontro.',
    family: 'resource',
    grants: [],
    discardPenalty: 1,
    tiers: ALL_TIERS,
  },
  {
    id: 'mod_coperto',
    name: 'Gioco Coperto',
    description: 'La carta avversaria resta coperta finche\' non rispondi.',
    family: 'scoring',
    grants: ['hidden_opponent_card'],
    tiers: ALL_TIERS,
  },
  {
    id: 'mod_mescolo',
    name: 'Mescolo Continuo',
    description: 'Il seme di Briscola cambia ogni 3 prese.',
    family: 'suit_rewrite',
    grants: ['rotating_briscola'],
    tiers: FROM_SOVRACCARICO,
  },
  {
    id: 'mod_pedaggio',
    name: 'Pedaggio del Gigante',
    description: 'Dopo una presa vinta devi riaprire con lo stesso seme, se ce l\'hai.',
    family: 'lead_restriction',
    grants: ['forced_suit_chain'],
    tiers: FROM_SOVRACCARICO,
  },
  {
    id: 'mod_banco_chiuso',
    name: 'Banco Chiuso',
    description: 'Non puoi aprire la presa con i Denari, a meno che tu non abbia solo quelli.',
    family: 'lead_restriction',
    grants: ['no_denari_first'],
    tiers: FROM_SOVRACCARICO,
  },
  {
    id: 'mod_lame',
    name: 'Tutte Lame',
    description: 'Le Spade avversarie contano come Briscola.',
    family: 'suit_rewrite',
    grants: ['spades_are_briscola'],
    tiers: ['ultra_istinto', 'trascendente', 'fuori_scala'],
  },
  {
    id: 'mod_silenzio',
    name: 'Coro Muto',
    description: 'Un tuo Jolly per presa resta zitto, in ordine dal primo.',
    family: 'silence',
    grants: ['rotating_joker_silence'],
    tiers: ['ultra_istinto', 'trascendente', 'fuori_scala'],
  },
  {
    id: 'mod_mescolo_stretto',
    name: 'Mescolo Stretto',
    description: 'Il seme di Briscola cambia ogni 2 prese.',
    family: 'suit_rewrite',
    grants: ['rotating_briscola'],
    briscolaRotationPeriod: 2,
    tiers: ['trascendente', 'fuori_scala'],
  },
];

export function getEndlessModifier(id: string): EndlessModifier | null {
  return ENDLESS_MODIFIERS.find((modifier) => modifier.id === id) ?? null;
}

/**
 * Whether a modifier can sit on this Boss next to what is already there.
 *
 * Three separate refusals, and each one is a position the game could not
 * survive rather than a taste call:
 *
 * 1. A rule the Boss (or another modifier) already grants adds nothing and
 *    would print the same line on the blind twice.
 * 2. Two suit rewrites at once. The trump would be moving for two different
 *    reasons and no line of copy could honestly describe what is trump.
 * 3. Two lead restrictions at once. "Reopen in Denari" plus "never open in
 *    Denari" is a hand with no legal card, and the round would sit there.
 */
export function canCombineModifier(
  candidate: EndlessModifier,
  baseBoss: BossBlind,
  chosen: EndlessModifier[]
): boolean {
  const activeRules = new Set<BossDebuffType>([
    baseBoss.debuffType,
    ...chosen.flatMap((modifier) => modifier.grants),
  ]);
  if (candidate.grants.some((rule) => activeRules.has(rule))) return false;

  const familyOf = (rule: BossDebuffType): ModifierFamily | null => {
    if (rule === 'rotating_briscola' || rule === 'spades_are_briscola') return 'suit_rewrite';
    if (rule === 'forced_suit_chain' || rule === 'no_denari_first') return 'lead_restriction';
    return null;
  };
  const exclusive: ModifierFamily[] = ['suit_rewrite', 'lead_restriction'];
  const activeFamilies = new Set(
    [...activeRules].map(familyOf).filter((family): family is ModifierFamily => family !== null)
  );
  const candidateFamilies = new Set(
    candidate.grants.map(familyOf).filter((family): family is ModifierFamily => family !== null)
  );
  for (const family of candidateFamilies) {
    if (exclusive.includes(family) && activeFamilies.has(family)) return false;
  }

  // Two copies of the same non-rule modifier (Mani Legate) would silently
  // stack a resource cost the blind only mentions once.
  if (chosen.some((modifier) => modifier.id === candidate.id)) return false;
  return true;
}

/** How many modifiers a tier layers on. */
export function getModifierCountForTier(tierId: EndlessTierId): number {
  return tierId === 'trascendente' || tierId === 'fuori_scala' ? 2 : 1;
}

export interface EndlessBossRoll {
  boss: BossBlind;
  modifiers: EndlessModifier[];
}

/**
 * The Boss for an Endless Ante, rolled from the run's own generator.
 *
 * Deterministic in the seed and in the Ante: the same snapshot always sits down
 * at the same table with the same rules, so reloading is not a reroll. The
 * returned Boss keeps the base id - the save stores that plus the modifier ids
 * and rebuilds this object, rather than storing a synthetic Boss the catalogue
 * would not recognise.
 */
export function rollEndlessBoss(ante: number, random: () => number): EndlessBossRoll {
  const tier = getEndlessTier(ante);
  if (!tier) {
    const campaignBoss =
      ALL_BOSS_BLINDS.find((boss) => boss.ante === ante) ?? ALL_BOSS_BLINDS[0];
    return { boss: campaignBoss, modifiers: [] };
  }

  const base = pickWith(ALL_BOSS_BLINDS, random) ?? ALL_BOSS_BLINDS[0];
  const wanted = getModifierCountForTier(tier.id);
  const pool = shuffleWith(
    ENDLESS_MODIFIERS.filter((modifier) => modifier.tiers.includes(tier.id)),
    random
  );

  const chosen: EndlessModifier[] = [];
  for (const candidate of pool) {
    if (chosen.length >= wanted) break;
    if (canCombineModifier(candidate, base, chosen)) chosen.push(candidate);
  }

  return { boss: composeEndlessBoss(base, chosen, tier.id), modifiers: chosen };
}

/**
 * The Boss as the blind will show it: base rule plus every modifier, written
 * out. Nothing is hidden - the player reads all the active rules before
 * choosing to sit down.
 */
export function composeEndlessBoss(
  base: BossBlind,
  modifiers: EndlessModifier[],
  tierId: EndlessTierId
): BossBlind {
  if (modifiers.length === 0) {
    return { ...base, endless: { tierId, modifierIds: [] } };
  }
  return {
    ...base,
    debuffDescription: [
      base.debuffDescription,
      ...modifiers.map((modifier) => `${modifier.name}: ${modifier.description}`),
    ].join(' · '),
    endless: { tierId, modifierIds: modifiers.map((modifier) => modifier.id) },
  };
}

/**
 * The Boss of an Endless Ante, derived rather than drawn.
 *
 * It reads the run's seed but does NOT advance the run's stream: the blind
 * screen has to show the same table the encounter will deal, and a preview that
 * consumed randomness would hand the player a different Boss than the one it
 * had just described. Being a pure function of (seed, ante) also means a
 * restore re-derives it without having to trust anything stored.
 */
export function endlessBossForAnte(ante: number, runSeed: number): EndlessBossRoll {
  const stream = createRunRng((runSeed + Math.imul(ante, 0x9e3779b1)) >>> 0);
  return rollEndlessBoss(ante, stream.random);
}

/** Rebuilds a composed Boss from what a snapshot stored. */
export function restoreEndlessBoss(
  base: BossBlind,
  modifierIds: string[],
  tierId: string
): BossBlind {
  const modifiers = modifierIds
    .map(getEndlessModifier)
    .filter((modifier): modifier is EndlessModifier => modifier !== null);
  return composeEndlessBoss(base, modifiers, tierId as EndlessTierId);
}

/** Every rule in force this encounter: the Boss's own plus its modifiers'. */
export function getActiveBossRules(boss: BossBlind | null): BossDebuffType[] {
  if (!boss) return [];
  const rules = new Set<BossDebuffType>([boss.debuffType]);
  for (const id of boss.endless?.modifierIds ?? []) {
    for (const rule of getEndlessModifier(id)?.grants ?? []) rules.add(rule);
  }
  return [...rules];
}

/** Modifier objects actually attached to a Boss. */
export function getBossModifiers(boss: BossBlind | null): EndlessModifier[] {
  return (boss?.endless?.modifierIds ?? [])
    .map(getEndlessModifier)
    .filter((modifier): modifier is EndlessModifier => modifier !== null);
}

/** Discards this Boss takes away, floored at zero by the caller. */
export function getBossDiscardPenalty(boss: BossBlind | null): number {
  return getBossModifiers(boss).reduce(
    (total, modifier) => total + (modifier.discardPenalty ?? 0),
    0
  );
}

/** How often the Briscola moves under this Boss. Three unless tightened. */
export function getBriscolaRotationPeriod(boss: BossBlind | null): number {
  for (const modifier of getBossModifiers(boss)) {
    if (modifier.briscolaRotationPeriod) return modifier.briscolaRotationPeriod;
  }
  return 3;
}

/** Guards the composer against ever emitting an illegal Boss. */
export function isLegalBossComposition(boss: BossBlind): boolean {
  const rules = getActiveBossRules(boss);
  const leadRestrictions = rules.filter(
    (rule) => rule === 'forced_suit_chain' || rule === 'no_denari_first'
  );
  const suitRewrites = rules.filter(
    (rule) => rule === 'rotating_briscola' || rule === 'spades_are_briscola'
  );
  return leadRestrictions.length <= 1 && suitRewrites.length <= 1;
}

export { isEndlessAnte };
