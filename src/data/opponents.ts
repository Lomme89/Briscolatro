import { BossBlind } from '../types/game';
import { ALL_BOSS_BLINDS } from './bosses';
import { getTableThemeForAnte } from './tableThemes';

export interface OpponentIntro {
  /** Matches a PixelAvatar character. */
  characterId: string;
  name: string;
  title: string;
  quote: string;
  isBoss: boolean;
  boss: BossBlind | null;
  /** Lines this opponent throws at you between tricks. */
  banter: string[];
}

interface Regular {
  characterId: string;
  name: string;
  epithet: string;
  /** [primo blind, secondo blind]: la seconda è sempre una battuta da rivincita. */
  intro: [string, string];
  banter: string[];
}

/**
 * Every venue has its regular, and you play that person twice before the boss
 * of the ante - the owner - sits down. One opponent for all sixteen normal
 * blinds made the ladder feel like the same evening repeated: the locals are
 * what make an Ante somewhere you walked into.
 *
 * Gennaro bookends the run. He is the first man to take your money at the
 * village osteria and the last one between you and the Sovrano, which is why
 * only he gets to show up twice.
 */
const REGULARS: Regular[] = [
  {
    characterId: 'gennaro',
    name: 'Gennaro',
    epithet: "L'Habitué",
    intro: [
      'Ancora tu? Siediti, offro io il primo giro... e ti spenno.',
      'Ti è andata bene prima. Adesso però faccio sul serio.',
    ],
    banter: [
      'Questo mazzo lo conosco meglio di mia moglie.',
      'Gioca, gioca. Tanto la Briscola ce l’ho io.',
      'Al bancone dicono che sei bravo. Vediamo.',
    ],
  },
  {
    characterId: 'assunta',
    name: 'Nonna Assunta',
    epithet: 'La Bocciofila',
    intro: [
      'Qui i vecchietti giocano da cinquant’anni. Io da sessanta.',
      'Hanno smesso tutti di guardare le bocce per guardare noi due.',
    ],
    banter: [
      'Piano con quella carta, che me la ricordo.',
      'Ho cresciuto sei figli: mi vuoi bluffare tu?',
      'Vinco e poi ti offro il caffè. Così impari.',
    ],
  },
  {
    characterId: 'mimi',
    name: 'Mimì Fiordaliso',
    epithet: 'La Soubrette',
    intro: [
      'Il palco è mio, tesoro. Il tavolo pure, se non ti dispiace.',
      'Bis richiesto dal pubblico: stavolta però ti faccio piangere.',
    ],
    banter: [
      'Sorridi, che ci guardano dalla galleria.',
      'Le luci sono mie e anche l’ultima presa.',
      'Applausi dopo, prima le carte.',
    ],
  },
  {
    characterId: 'o_muto',
    name: "'O Muto",
    epithet: 'Quello che non parla',
    intro: [
      'Meno chiacchiere. Carte.',
      'Ancora tu. Zitto e gioca.',
    ],
    banter: [
      '...',
      'Mh.',
      'Gioca.',
    ],
  },
  {
    characterId: 'salvatore',
    name: 'Cadetto Salvatore',
    epithet: 'La Lama Giovane',
    intro: [
      'Ho imparato a giocare tra queste lame. Tu no.',
      'Ogni presa qui si paga con qualcosa. Vediamo con cosa paghi tu.',
    ],
    banter: [
      'In guardia: sto per calare il Tre.',
      'Il maestro dice che sono impaziente. Ha ragione.',
      'Tocco. Anzi, presa.',
    ],
  },
  {
    characterId: 'rocco',
    name: 'Rocco Spaccalegna',
    epithet: 'Il Boscaiolo',
    intro: [
      'Il tavolo è di quercia: regge tutto, anche le tue sconfitte.',
      'Un bastone, una carta. La differenza la fa il polso.',
    ],
    banter: [
      'Questa la spacco in due come un ceppo.',
      'Ho le mani grosse, non la testa dura.',
      'Un altro giro e poi torno nel bosco.',
    ],
  },
  {
    characterId: 'esposito',
    name: 'Ragionier Esposito',
    epithet: 'Il Contabile',
    intro: [
      'Qui dentro impegnano pure la fede nuziale. Occhio al portafogli.',
      'Ho riaperto il registro apposta per te. Seconda riga.',
    ],
    banter: [
      'Segno tutto, anche quello che perdi.',
      'Trentatré punti a me. Controlla pure.',
      'Gli interessi maturano a ogni presa.',
    ],
  },
  {
    characterId: 'gennaro',
    name: 'Gennaro',
    epithet: 'Il Rivale di Sempre',
    intro: [
      'Siamo arrivati fin qui insieme. Ma solo uno entra dal Sovrano.',
      'Ultimo giro, amico mio. Poi tocca a lui.',
    ],
    banter: [
      'Dall’osteria al Gran Casinò. Chi l’avrebbe detto.',
      'Ti ho visto imparare. Non basta.',
      'Se passi, salutamelo tu il Sovrano.',
    ],
  },
];

export function getRegularForAnte(ante: number): Regular {
  const index = Math.max(0, (Math.max(ante, 1) - 1) % REGULARS.length);
  return REGULARS[index];
}

export function getOpponentIntro(ante: number, round: number): OpponentIntro {
  if (round === 3) {
    const boss =
      ALL_BOSS_BLINDS.find((candidate) => candidate.ante === ante) || ALL_BOSS_BLINDS[0];
    return {
      characterId: boss.id,
      name: boss.name,
      title: boss.characterTitle,
      quote: boss.bossQuote,
      isBoss: true,
      boss,
      banter: [boss.bossQuote],
    };
  }

  const regular = getRegularForAnte(ante);
  return {
    characterId: regular.characterId,
    name: regular.name,
    title: `${regular.epithet} · ${getTableThemeForAnte(ante).name}`,
    quote: regular.intro[round === 2 ? 1 : 0],
    isBoss: false,
    boss: null,
    banter: regular.banter,
  };
}
