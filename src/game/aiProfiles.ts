import { Suit } from '../types/game';

/**
 * How one opponent plays, as seven numbers.
 *
 * The characters already had faces, voices and rooms of their own; they just
 * all played the same game. This is the shape of the difference. It is data on
 * purpose: no branch anywhere asks "is this Nonna Assunta", it asks how thrifty
 * this opponent is with a trump, and the answer happens to be "very". A new
 * regular is a row in a table, not a fork in the AI.
 *
 * Every field is 0..1 and every one of them changes a decision the AI actually
 * makes. Nothing here touches the cards, the scoring or what the opponent is
 * allowed to see: personality comes out of which card gets played, which is the
 * only place a player can read it.
 */
export interface OpponentAiProfile {
  id: string;
  /** The character this belongs to, for tests and the dev console. */
  name: string;
  /** How it should read at the table, in one line. */
  style: string;

  /**
   * How small a pot it will still fight for. High: takes tricks worth nothing
   * just to keep the lead. Low: lets the cheap ones go and waits for points.
   */
  aggression: number;
  /** Reluctance to spend a Briscola. High: hoards trump for the endgame. */
  trumpThrift: number;
  /** Reluctance to throw its own Assi, Tre and figure under a lost trick. */
  pointThrift: number;
  /**
   * Willingness to open with a card that can actually take the trick, instead
   * of shedding the cheapest liscia. High: plays to be seen.
   */
  leadRisk: number;
  /**
   * How much of the public record it keeps. Everything it reads is a card that
   * was face-up on this table - never a peek at the hand across from it.
   */
  memory: number;
  /**
   * How often it takes the second-best line instead of the best. Small on
   * purpose: this is a person having an off moment, not a coin flip.
   */
  noise: number;
  /**
   * How readily it turns its own Assi and Tre into tricks, right now.
   *
   * High: spends material to take the table - it counts what ducking would
   * bleed and it does not mind putting a Tre under a trick it is winning.
   * Low: those cards are for later, and a trick it has to buy with one is a
   * trick it lets go.
   *
   * Measured over hundreds of rounds, hoarding wins slightly more points here,
   * because points only score when they are captured and a saved carico tends
   * to come down at a moment of its own choosing. So this is not a skill dial
   * with a right answer at one end: it is the difference between the Nonna,
   * who never lets go of anything, and Rocco, who is out of ammunition by the
   * tenth trick and spent it all on tricks he wanted.
   */
  pointSpending: number;
  /** The suit it keeps coming back to. Flavour you can see in the opening. */
  favouriteSuit?: Suit;
}

/**
 * The house policy, and the reference the others are measured against.
 *
 * Bosses use it: they already bend the rules of the round, and giving them a
 * temperament on top would make it impossible to tell which of the two is
 * beating you.
 */
export const NEUTRAL_PROFILE: OpponentAiProfile = {
  id: 'neutral',
  name: 'Avversario',
  style: 'Gioca il libro: niente da leggere, niente da sfruttare.',
  aggression: 0.50,
  trumpThrift: 0.5,
  pointThrift: 0.50,
  leadRisk: 0.3,
  memory: 0.3,
  noise: 0.08,
  pointSpending: 0.6,
};

export const AI_PROFILES: Record<string, OpponentAiProfile> = {
  neutral: NEUTRAL_PROFILE,

  gennaro_habitue: {
    id: 'gennaro_habitue',
    name: 'Gennaro',
    style:
      "Equilibrato e paziente. Non sbaglia niente di grosso e si ricorda cosa è già passato: la volpe dell'osteria.",
    aggression: 0.5,
    trumpThrift: 0.55,
    pointThrift: 0.55,
    leadRisk: 0.3,
    memory: 0.6,
    noise: 0.1,
    pointSpending: 0.55,
  },

  assunta: {
    id: 'assunta',
    name: 'Nonna Assunta',
    style:
      'Non regala niente. Lascia andare le prese da zero punti e tiene Carichi e Briscole per il momento in cui sbagli tu.',
    aggression: 0.28,
    trumpThrift: 0.9,
    pointThrift: 0.95,
    leadRisk: 0.05,
    memory: 0.8,
    noise: 0.04,
    pointSpending: 0.2,
  },

  mimi: {
    id: 'mimi',
    name: 'Mimì Fiordaliso',
    style:
      'Gioca per il pubblico. Apre con la carta che si vede, prende anche quando non conviene, e brucia briscole per una scena.',
    aggression: 0.85,
    trumpThrift: 0.25,
    pointThrift: 0.3,
    leadRisk: 0.8,
    memory: 0.25,
    noise: 0.18,
    pointSpending: 0.85,
    favouriteSuit: 'coppe',
  },

  o_muto: {
    id: 'o_muto',
    name: "'O Muto",
    style:
      'Nessuno sbaglio, nessuna esitazione, mai una carta di troppo. Sempre la stessa linea, e la linea è quella giusta.',
    aggression: 0.5,
    trumpThrift: 0.6,
    pointThrift: 0.75,
    leadRisk: 0.12,
    memory: 0.9,
    noise: 0.01,
    pointSpending: 0.35,
  },

  salvatore: {
    id: 'salvatore',
    name: 'Cadetto Salvatore',
    style:
      'Attacca subito e attacca di Spade. Impaziente: prende presto le prese che un giocatore paziente lascerebbe correre.',
    aggression: 0.75,
    trumpThrift: 0.35,
    pointThrift: 0.4,
    leadRisk: 0.65,
    memory: 0.3,
    noise: 0.12,
    pointSpending: 0.7,
    favouriteSuit: 'spade',
  },

  rocco: {
    id: 'rocco',
    name: 'Rocco Spaccalegna',
    style:
      'Cala forte e cala presto. A metà round ha già speso tutto, ma quello che ha speso ha fatto male.',
    aggression: 0.7,
    trumpThrift: 0.2,
    pointThrift: 0.25,
    leadRisk: 0.75,
    memory: 0.1,
    noise: 0.2,
    pointSpending: 0.85,
    favouriteSuit: 'bastoni',
  },

  esposito: {
    id: 'esposito',
    name: 'Ragionier Esposito',
    style:
      'Conta. Non butta mai un punto sotto una presa persa e paga una briscola solo quando il piatto la vale.',
    aggression: 0.45,
    trumpThrift: 0.7,
    pointThrift: 0.8,
    leadRisk: 0.2,
    memory: 0.7,
    noise: 0.03,
    pointSpending: 0.3,
    favouriteSuit: 'denari',
  },

  gennaro_rivale: {
    id: 'gennaro_rivale',
    name: 'Gennaro',
    style:
      "Lo stesso uomo, otto Ante più tardi. Ricorda tutto, non tira più a indovinare, e la pazienza dell'osteria adesso è calcolo.",
    aggression: 0.55,
    trumpThrift: 0.7,
    pointThrift: 0.65,
    leadRisk: 0.35,
    memory: 0.95,
    noise: 0.03,
    pointSpending: 0.3,
  },
};

export function getAiProfile(id: string | undefined): OpponentAiProfile {
  return (id && AI_PROFILES[id]) || NEUTRAL_PROFILE;
}
