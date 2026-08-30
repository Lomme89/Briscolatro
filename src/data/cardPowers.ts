import { CardSpecial, Edition, Enhancement, PlayingCard, Seal } from '../types/game';
import { SPECIAL_INFO } from '../game/specialCards';

export interface CardPower {
  label: string;
  description: string;
  /** Tailwind classes for the chip that announces it. */
  className: string;
}

/** Numeric source of truth shared by scoring and every player-facing label. */
export const CARD_POWER_VALUES = {
  foilPlayedChips: 60,
  foilCapturedChips: 30,
  holoPlayedMult: 12,
  holoCapturedMult: 6,
  polychromePlayedXMult: 1.6,
  polychromeCapturedXMult: 1.3,
  goldPlayedDollars: 1,
  goldCapturedDollars: 2,
  bonusChips: 40,
  multBonus: 5,
  steelXMult: 1.6,
  stoneChips: 60,
  blueSealChance: 0.2,
  goldSealDollars: 2,
} as const;

const V = CARD_POWER_VALUES;

/**
 * What every modifier actually does, in one place.
 *
 * These strings are the contract between `src/game/scoring.ts` and every screen
 * that has to explain a card: change the rule there, change the sentence here.
 */
const EDITION_POWERS: Record<Exclude<Edition, 'standard'>, CardPower> = {
  foil: {
    label: 'Lamina',
    description: `+${V.foilPlayedChips} Chips quando la giochi (+${V.foilCapturedChips} se la catturi dall'avversario).`,
    className: 'bg-sky-950 border-sky-400 text-sky-200',
  },
  holo: {
    label: 'Olografica',
    description: `+${V.holoPlayedMult} Mult quando la giochi (+${V.holoCapturedMult} se la catturi).`,
    className: 'bg-fuchsia-950 border-fuchsia-400 text-fuchsia-200',
  },
  polychrome: {
    label: 'Policroma',
    description: `x${V.polychromePlayedXMult} Mult quando la giochi (x${V.polychromeCapturedXMult} se la catturi).`,
    className: 'bg-purple-950 border-purple-400 text-purple-200',
  },
  gold: {
    label: 'Dorata',
    description: `+$${V.goldPlayedDollars} quando la giochi, +$${V.goldCapturedDollars} se la catturi dall'avversario.`,
    className: 'bg-amber-950 border-amber-400 text-amber-200',
  },
};

const ENHANCEMENT_POWERS: Record<Exclude<Enhancement, 'none'>, CardPower> = {
  bonus: {
    label: 'Bonus',
    description: `+${V.bonusChips} Chips ogni volta che la giochi.`,
    className: 'bg-sky-950 border-sky-400 text-sky-200',
  },
  mult: {
    label: 'Mult',
    description: `+${V.multBonus} Mult ogni volta che la giochi.`,
    className: 'bg-red-950 border-red-400 text-red-200',
  },
  wild: {
    label: 'Jolly',
    description: 'Vale sempre come carta di Briscola, qualunque sia il seme.',
    className: 'bg-fuchsia-950 border-fuchsia-400 text-fuchsia-200',
  },
  steel: {
    label: 'Acciaio',
    description: `x${V.steelXMult} Mult finché resta in mano: paga se NON la giochi.`,
    className: 'bg-slate-800 border-slate-400 text-slate-200',
  },
  stone: {
    label: 'Pietra',
    description: `+${V.stoneChips} Chips, ma non ha seme: non prende mai per seme né per Briscola.`,
    className: 'bg-stone-800 border-stone-400 text-stone-200',
  },
};

const SEAL_POWERS: Record<Exclude<Seal, 'none'>, CardPower> = {
  red: {
    label: 'Sigillo Rosso',
    description: 'La carta conta due volte: Chips, Mult ed edizione si ripetono.',
    className: 'bg-red-950 border-red-400 text-red-200',
  },
  gold: {
    label: 'Sigillo Oro',
    description: `+$${V.goldSealDollars} ogni volta che vinci la presa in cui si trova.`,
    className: 'bg-amber-950 border-amber-400 text-amber-200',
  },
  blue: {
    label: 'Sigillo Blu',
    description: `Vincendo la presa, ${V.blueSealChance * 100}% di ricevere una Carta Sola gratis.`,
    className: 'bg-blue-950 border-blue-400 text-blue-200',
  },
  purple: {
    label: 'Sigillo Viola',
    description: 'Ti restituisce uno Scarto ogni volta che la giochi.',
    className: 'bg-purple-950 border-purple-400 text-purple-200',
  },
};

/**
 * The Azzardo reads differently from the rest: it is the only entry with a
 * price under it, so both halves are spelled out in the same chip.
 */
const SPECIAL_POWERS: Record<Exclude<CardSpecial, 'none'>, CardPower> = {
  segnata: {
    label: 'Segnata',
    description: `${SPECIAL_INFO.segnata.bonus}. Però: ${SPECIAL_INFO.segnata.cost.toLowerCase()}.`,
    className: 'bg-amber-950 border-amber-400 text-amber-200',
  },
  vetro: {
    label: 'Vetro',
    description: `${SPECIAL_INFO.vetro.bonus}. Però: ${SPECIAL_INFO.vetro.cost.toLowerCase()}.`,
    className: 'bg-cyan-950 border-cyan-400 text-cyan-200',
  },
  debito: {
    label: 'A Debito',
    description: `${SPECIAL_INFO.debito.bonus}. Però: ${SPECIAL_INFO.debito.cost.toLowerCase()}.`,
    className: 'bg-emerald-950 border-emerald-400 text-emerald-200',
  },
  traditrice: {
    label: 'Traditrice',
    description: `${SPECIAL_INFO.traditrice.bonus}. Però: ${SPECIAL_INFO.traditrice.cost.toLowerCase()}.`,
    className: 'bg-rose-950 border-rose-400 text-rose-200',
  },
};

/** Every power a card carries, in the order they read best. */
export function getCardPowers(card: PlayingCard): CardPower[] {
  const powers: CardPower[] = [];
  if (card.edition !== 'standard') powers.push(EDITION_POWERS[card.edition]);
  if (card.enhancement !== 'none') powers.push(ENHANCEMENT_POWERS[card.enhancement]);
  if (card.seal !== 'none') powers.push(SEAL_POWERS[card.seal]);
  // Last, because it is the one the player has to think about.
  if (card.special !== 'none') powers.push(SPECIAL_POWERS[card.special]);
  return powers;
}
