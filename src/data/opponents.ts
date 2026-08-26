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
}

/**
 * Gennaro is the running rival: the same man you keep finding at every table,
 * one venue further up the ladder each ante. The boss of the ante is whoever
 * runs the place. Giving the regular blinds their own lines is what makes an
 * Ante feel like somewhere you walked into, rather than a number.
 */
const GENNARO_LINES: Record<number, [string, string]> = {
  1: [
    'Ancora tu? Siediti, offro io il primo giro... e ti spenno.',
    'Ti è andata bene prima. Adesso però faccio sul serio.',
  ],
  2: [
    'Qui i vecchietti giocano da cinquant’anni. Io da sessanta.',
    'Hanno smesso tutti di guardare le bocce per guardare noi due.',
  ],
  3: [
    'A me queste candele non piacciono. Ma il tavolo è un tavolo.',
    'Non guardare le carte troppo a lungo: qui cambiano idea da sole.',
  ],
  4: [
    'Parla piano. Qui dentro anche i muri contano i punti.',
    'Hai la faccia di uno che ha già perso e non lo sa.',
  ],
  5: [
    'Ho imparato a giocare tra queste lame. Tu no.',
    'Ogni presa qui si paga con qualcosa. Vediamo con cosa paghi tu.',
  ],
  6: [
    'Il tavolo è di quercia: regge tutto, anche le tue sconfitte.',
    'Un bastone, una carta. La differenza la fa il polso.',
  ],
  7: [
    'Non bere niente di quello che ti offrono qui.',
    'Le sue pozioni non mi fanno paura. Le tue Briscole un po’ sì.',
  ],
  8: [
    'Siamo arrivati fin qui insieme. Ma solo uno entra dal Sovrano.',
    'Ultimo giro, amico mio. Poi tocca a lui.',
  ],
};

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
    };
  }

  const lines = GENNARO_LINES[Math.min(Math.max(ante, 1), 8)] || GENNARO_LINES[1];
  return {
    characterId: 'gennaro',
    name: 'Gennaro',
    title: `Habitué · ${getTableThemeForAnte(ante).name}`,
    quote: lines[round === 2 ? 1 : 0],
    isBoss: false,
    boss: null,
  };
}
