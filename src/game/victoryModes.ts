/**
 * Le modalità di vittoria di Briscolatro.
 *
 * The game has two souls and they do not agree. The roguelite one pays for
 * volume - tricks won, Chips, Mult, jolly procs. The classical one pays for
 * sixty-one of the hundred and twenty points, which rewards selectivity and
 * conservation instead. Measured over two hundred hands, a policy that plays
 * proper Briscola takes the round 43% of the time and scores 12% LESS than one
 * that just grabs whatever pays now.
 *
 * This file does not try to reconcile them. It lets the player choose which one
 * the table is being played for, and it is the only place that decides.
 */
export type VictoryMode = 'briscolatro' | 'sbaraglio' | 'traditional' | 'double_challenge';

/** Sixty-one of the hundred and twenty points. Not "more than the opponent". */
export const BRISCOLA_TARGET_POINTS = 61;

export interface VictoryModeInfo {
  id: VictoryMode;
  /** What the card in the picker says. */
  label: string;
  /** The condition, in one line, as the player reads it. */
  description: string;
  /** The chip next to the name. Not a difficulty scale: these are rules. */
  badge: string;
  badgeClass: string;
  /** Does clearing the blind require the Chips target? */
  needsChips: boolean;
  /** Does it require 61 Briscola points? */
  needsBriscola: boolean;
  /** True when either one is enough on its own. */
  eitherIsEnough: boolean;
  /** localStorage key for this mode's high score. */
  highScoreKey: string;
  /** How the blind screen spells the requirement out. */
  blindHint: string;
}

export const VICTORY_MODES: Record<VictoryMode, VictoryModeInfo> = {
  briscolatro: {
    id: 'briscolatro',
    label: 'Briscolatro',
    description: 'Supera il target Chips.',
    badge: 'ROGUELIKE',
    badgeClass: 'bg-amber-600 border-amber-300 text-white',
    needsChips: true,
    needsBriscola: false,
    eitherIsEnough: false,
    highScoreKey: 'briscolatro_highscore',
    blindHint: 'VINCI CON',
  },
  sbaraglio: {
    id: 'sbaraglio',
    label: 'Sbaraglio',
    description: 'Fai il target oppure conquista 61 punti.',
    // Not "easy": the 61 does not scale with the Ante while the target does, so
    // it opens up as the run goes on. Named for what it is, not for a rung on
    // a ladder.
    badge: 'PIÙ LIBERA',
    badgeClass: 'bg-sky-600 border-sky-300 text-white',
    needsChips: true,
    needsBriscola: true,
    eitherIsEnough: true,
    highScoreKey: 'briscolatro_highscore_sbaraglio',
    blindHint: 'TI BASTA UNA DELLE DUE',
  },
  traditional: {
    id: 'traditional',
    label: 'Briscola',
    description: 'Conquista 61 punti.',
    badge: 'TRADIZIONALE',
    badgeClass: 'bg-emerald-600 border-emerald-300 text-white',
    needsChips: false,
    needsBriscola: true,
    eitherIsEnough: false,
    highScoreKey: 'briscolatro_highscore_traditional',
    blindHint: 'VINCI CON',
  },
  double_challenge: {
    id: 'double_challenge',
    label: 'Doppia Sfida',
    description: 'Fai il target e conquista 61 punti.',
    badge: 'DIFFICILE',
    badgeClass: 'bg-rose-600 border-rose-300 text-white',
    needsChips: true,
    needsBriscola: true,
    eitherIsEnough: false,
    highScoreKey: 'briscolatro_highscore_double',
    blindHint: 'SERVONO ENTRAMBE',
  },
};

export const ALL_VICTORY_MODES: VictoryModeInfo[] = [
  VICTORY_MODES.briscolatro,
  VICTORY_MODES.sbaraglio,
  VICTORY_MODES.traditional,
  VICTORY_MODES.double_challenge,
];

/** Anything the game did before modes existed was this one. */
export const DEFAULT_VICTORY_MODE: VictoryMode = 'briscolatro';

export type VictoryRoute = 'chips' | 'briscola' | 'both' | 'none';

export interface VictoryCheck {
  won: boolean;
  chipsPassed: boolean;
  briscolaPassed: boolean;
  /** Which requirements were met, regardless of which ones were needed. */
  victoryRoute: VictoryRoute;
  mode: VictoryMode;
}

export interface VictoryInput {
  mode: VictoryMode;
  score: number;
  targetScore: number;
  playerBriscolaPoints: number;
}

/**
 * The only place in the game that decides whether a blind was cleared.
 *
 * Pure, so the simulation harness can ask it the same question the round does.
 * Everything else - the HUD, the summary, the reward, the unlocks - reads the
 * answer rather than recomputing the threshold, which is how the old
 * `score >= target` ended up scattered across three components.
 */
export function evaluateVictoryCondition(input: VictoryInput): VictoryCheck {
  const info = VICTORY_MODES[input.mode] ?? VICTORY_MODES[DEFAULT_VICTORY_MODE];

  const chipsPassed = input.score >= input.targetScore;
  // Sixty-one on the nose. 60-60 is not a win in Briscola and is not one here.
  const briscolaPassed = input.playerBriscolaPoints >= BRISCOLA_TARGET_POINTS;

  let won: boolean;
  if (info.eitherIsEnough) {
    won = chipsPassed || briscolaPassed;
  } else {
    won =
      (!info.needsChips || chipsPassed) &&
      (!info.needsBriscola || briscolaPassed);
  }

  const victoryRoute: VictoryRoute =
    chipsPassed && briscolaPassed ? 'both' : chipsPassed ? 'chips' : briscolaPassed ? 'briscola' : 'none';

  return { won, chipsPassed, briscolaPassed, victoryRoute, mode: info.id };
}

/** The line the round summary leads with, once the outcome is known. */
export function victoryHeadline(check: VictoryCheck, briscolaPoints: number): string {
  if (!check.won) {
    switch (check.mode) {
      case 'double_challenge':
        if (check.chipsPassed) return 'Target raggiunto, ma hai perso la Briscola.';
        if (check.briscolaPassed) return 'Hai vinto la Briscola, ma non hai raggiunto il target.';
        return 'Né il target né la Briscola.';
      case 'traditional':
        return `Ti servivano 61 punti: ne hai fatti ${briscolaPoints}.`;
      case 'sbaraglio':
        return 'Né il target né i 61 punti.';
      default:
        return 'Il punteggio non è bastato.';
    }
  }

  switch (check.mode) {
    case 'sbaraglio':
      if (check.victoryRoute === 'both') return 'VITTORIA COMPLETA — Entrambi.';
      return check.victoryRoute === 'chips'
        ? 'VITTORIA — Target raggiunto.'
        : 'VITTORIA — Briscola conquistata.';
    case 'traditional':
      return `VITTORIA — ${briscolaPoints} punti.`;
    case 'double_challenge':
      return 'VITTORIA — Target e Briscola.';
    default:
      return 'VITTORIA — Banco superato.';
  }
}

/** Detailed game-over explanation that names only this mode's real failure. */
export function buildDefeatReason(
  check: VictoryCheck,
  score: number,
  targetScore: number,
  briscolaPoints: number
): string {
  const chips = `${score.toLocaleString()} / ${targetScore.toLocaleString()} Chips`;
  const traditional = `${briscolaPoints}/120 punti Briscola`;

  switch (check.mode) {
    case 'traditional':
      return `Hai conquistato ${traditional}: servivano 61 punti.`;
    case 'sbaraglio':
      return `Non hai completato nessuna via di vittoria: ${chips} e ${traditional} (servivano 61).`;
    case 'double_challenge':
      if (check.chipsPassed) return `Target Chips raggiunto, ma hai conquistato solo ${traditional}: servivano 61 punti.`;
      if (check.briscolaPassed) return `Briscola conquistata, ma il target Chips non è stato raggiunto: ${chips}.`;
      return `Doppia Sfida fallita: ${chips} e ${traditional} (servivano 61).`;
    default:
      return `Target Chips non raggiunto: ${chips}.`;
  }
}

/** Reads a stored mode, tolerating anything an older save might hold. */
export function parseVictoryMode(raw: string | null | undefined): VictoryMode {
  if (raw && raw in VICTORY_MODES) return raw as VictoryMode;
  return DEFAULT_VICTORY_MODE;
}
