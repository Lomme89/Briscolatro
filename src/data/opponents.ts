import { BossBlind } from '../types/game';
import { ALL_BOSS_BLINDS } from './bosses';
import { getTableThemeForAnte } from './tableThemes';
import { isBossEncounter } from '../game/gameState';

export interface OpponentIntro {
  /** Matches a PixelAvatar character. */
  characterId: string;
  /** The AI temperament to play this opponent with. */
  aiProfileId: string;
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
  /** Which temperament in aiProfiles.ts sits behind the face. */
  aiProfileId: string;
  /**
   * La battuta con cui si siede al Tavolo.
   *
   * Era una coppia, una per il Piccolo Buio e una di rivincita per il Grande:
   * con un solo Tavolo per Ante la seconda non aveva piu' un momento in cui
   * dirla.
   */
  intro: string;
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
    aiProfileId: 'gennaro_habitue',
    intro: 'Ancora tu? Siediti, offro io il primo giro... e ti spenno.',
    banter: [
      'Questo mazzo lo conosco meglio di mia moglie.',
      'Gioca, gioca. Tanto la Briscola ce l’ho io.',
      'Al bancone dicono che sei bravo. Vediamo.',
      'E ricordati: chi nun dice SOLA, pesca.',
    ],
  },
  {
    characterId: 'assunta',
    name: 'Nonna Assunta',
    epithet: 'La Bocciofila',
    aiProfileId: 'assunta',
    intro: 'Qui i vecchietti giocano da cinquant’anni. Io da sessanta.',
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
    aiProfileId: 'mimi',
    intro: 'Il palco è mio, tesoro. Il tavolo pure, se non ti dispiace.',
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
    aiProfileId: 'o_muto',
    intro: 'Meno chiacchiere. Carte.',
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
    aiProfileId: 'salvatore',
    intro: 'Ho imparato a giocare tra queste lame. Tu no.',
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
    aiProfileId: 'rocco',
    intro: 'Il tavolo è di quercia: regge tutto, anche le tue sconfitte.',
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
    aiProfileId: 'esposito',
    intro: 'Qui dentro impegnano pure la fede nuziale. Occhio al portafogli.',
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
    aiProfileId: 'gennaro_rivale',
    intro: 'Siamo arrivati fin qui insieme. Ma solo uno entra dal Sovrano.',
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

/**
 * Who is sitting across the table tonight.
 *
 * `encounterBoss` is the Boss the round will actually be played against, when
 * the caller already holds it. Looking one up by Ante cannot answer that past
 * Ante 8: Endless composes its Boss from the run's own seed, no catalogue entry
 * carries an Ante above eight, and the lookup below quietly fell back to the
 * first Boss in the list. That put Gigi's face over Don Vito's name on the
 * blind screen. Pass the real one and there is nothing to fall back from.
 */
export function getOpponentIntro(
  ante: number,
  round: number,
  encounterBoss?: BossBlind | null
): OpponentIntro {
  if (isBossEncounter(round)) {
    const boss =
      encounterBoss ??
      ALL_BOSS_BLINDS.find((candidate) => candidate.ante === ante) ??
      ALL_BOSS_BLINDS[0];
    return {
      characterId: boss.id,
      name: boss.name,
      title: boss.characterTitle,
      quote: boss.bossQuote,
      isBoss: true,
      boss,
      // Bosses already bend the rules of the round; a temperament on top would
      // make it impossible to tell which of the two is beating you.
      aiProfileId: 'neutral',
      banter: [boss.bossQuote],
    };
  }

  const regular = getRegularForAnte(ante);
  return {
    characterId: regular.characterId,
    aiProfileId: regular.aiProfileId,
    name: regular.name,
    title: `${regular.epithet} · ${getTableThemeForAnte(ante).name}`,
    quote: regular.intro,
    isBoss: false,
    boss: null,
    banter: regular.banter,
  };
}
