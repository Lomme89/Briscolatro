import { BossBlind, Joker, PlayingCard, Suit } from '../../types/game';
import { resolveTrick } from '../briscola';
import { chooseOpponentFollow, chooseOpponentLead } from '../ai';
import { AI_PROFILES } from '../aiProfiles';
import { calculateTrickScore } from '../scoring';

/**
 * Everything a player policy is allowed to look at when it picks a card.
 *
 * Deliberately the same information a person at the table has: their hand, the
 * trump, their own board, and what has already happened this round. No peeking
 * at the opponent's hand - the point of this harness is to compare ways of
 * THINKING, and a policy that cheats would tell us nothing.
 */
export interface PolicyState {
  hand: PlayingCard[];
  briscolaSuit: Suit;
  jokers: Joker[];
  boss: BossBlind | null;
  /** The card to answer, or null when this policy opens the trick. */
  opponentCard: PlayingCard | null;
  tricksWon: number;
  streak: number;
  tricksPlayed: number;
  remainingTricks: number;
  capturedDenari: Set<number>;
  money: number;
}

export interface PlayerPolicy {
  id: string;
  name: string;
  /** What this policy is trying to do, in one line. */
  blurb: string;
  choose(state: PolicyState): PlayingCard;
}

/** What one candidate card would actually do, played out one ply. */
export interface CandidateOutcome {
  card: PlayingCard;
  /** Briscolatro score this trick would pay. Zero on a lost trick. */
  score: number;
  /** Briscola points gained, or lost to the opponent's pile. */
  pointSwing: number;
  won: boolean;
}

/**
 * The opponent used inside the rollout.
 *
 * Fixed on purpose: every policy is measured against the same house player, so
 * a difference in the numbers is a difference in the policy and not in who it
 * happened to be sitting across from.
 */
const HOUSE = { ...AI_PROFILES.gennaro_habitue, noise: 0 };

/**
 * Plays one candidate out to the end of the trick and reports what it did.
 *
 * When answering, the trick is fully determined. When opening, the reply comes
 * from the house AI - a one-ply rollout, which is roughly what a person does
 * when they picture the likely answer before committing.
 */
export function evaluateCandidate(state: PolicyState, card: PlayingCard): CandidateOutcome {
  const rest = state.hand.filter((c) => c.id !== card.id);

  const oppCard =
    state.opponentCard ??
    chooseOpponentFollow(
      // The rollout opponent holds cards this policy cannot see, so it answers
      // out of a plausible hand rather than a known one: what is left of the
      // deck as far as this seat can tell. Using its own leftovers keeps the
      // comparison identical across policies, which is all that matters here.
      rest,
      card,
      { briscolaSuit: state.briscolaSuit, profile: HOUSE }
    ) ??
    card;

  const playerLeads = state.opponentCard === null;
  const clash = resolveTrick(
    playerLeads ? card : oppCard,
    playerLeads ? oppCard : card,
    state.briscolaSuit,
    playerLeads,
    state.boss?.debuffType
  );

  if (!clash.playerWon) {
    return { card, score: 0, pointSwing: -clash.rawPoints, won: false };
  }

  const result = calculateTrickScore(
    card,
    oppCard,
    clash,
    state.briscolaSuit,
    state.jokers,
    state.boss,
    {
      money: state.money,
      playerHand: rest,
      tricksWonThisRound: state.tricksWon,
      consecutiveWinStreak: state.streak,
      totalTricksPlayedThisRound: state.tricksPlayed,
      remainingTricksCount: state.remainingTricks,
      capturedDenariRanksThisRound: state.capturedDenari,
    },
    1,
    null,
    playerLeads
  );

  return { card, score: result.finalScore, pointSwing: clash.rawPoints, won: true };
}

export function evaluateAll(state: PolicyState): CandidateOutcome[] {
  return state.hand.map((card) => evaluateCandidate(state, card));
}

/**
 * A. La Briscola di sempre.
 *
 * This is the game's own opponent AI, turned around to face the other way, on a
 * patient profile. It has never heard of Chips or Mult: it counts to sixty-one,
 * hoards its carichi and its trump, and plays for the end of the round. If
 * Briscolatro rewarded good Briscola, this is the policy that would win.
 */
export const CONSERVATIVE: PlayerPolicy = {
  id: 'conservativa',
  name: 'Briscola conservativa',
  blurb: 'Punta ai 61 punti: protegge Carichi e Briscole, lascia andare le prese che non pagano.',
  choose(state) {
    const profile = { ...AI_PROFILES.assunta, noise: 0 };
    const chosen = state.opponentCard
      ? chooseOpponentFollow(state.hand, state.opponentCard, {
          briscolaSuit: state.briscolaSuit,
          bossDebuff: state.boss?.debuffType,
          profile,
        })
      : chooseOpponentLead(state.hand, {
          briscolaSuit: state.briscolaSuit,
          bossDebuff: state.boss?.debuffType,
          profile,
        });
    return chosen ?? state.hand[0];
  },
};

/**
 * B. Il massimizzatore.
 *
 * Picks whatever pays the most Chips x Mult right now and never looks further
 * than the end of the trick. It does not know what a carico is for.
 */
export const GREEDY: PlayerPolicy = {
  id: 'greedy',
  name: 'Score greedy',
  blurb: 'Massimizza il punteggio di questa presa e basta: non sa cosa sia un Carico.',
  choose(state) {
    const ranked = [...evaluateAll(state)].sort(
      (a, b) => b.score - a.score || b.pointSwing - a.pointSwing
    );
    return ranked[0].card;
  },
};

/** How much better the greedy play must be before the hybrid abandons Briscola. */
export const HYBRID_GREED_THRESHOLD = 2;

/**
 * C. Chi tiene il conto di entrambe le cose.
 *
 * Two earlier attempts failed in the same instructive way. Weighing a
 * normalised score against a normalised point swing produced the greedy policy
 * wearing a hat, and so did capping how many points it would concede - because
 * INSIDE a single trick the two goals barely conflict. Winning a trick gives
 * you the score and the points at the same time.
 *
 * Which locates the real conflict: it is not in this trick, it is in what you
 * keep for the next six. So the hybrid holds the two ideas the way a person
 * does - it plays Briscola by default, and only breaks discipline when what is
 * on the table right now is worth clearly more than the patient line.
 */
export const HYBRID: PlayerPolicy = {
  id: 'hybrid',
  name: 'Hybrid',
  blurb:
    `Gioca a Briscola, e rompe la disciplina solo se la presa vale almeno ${HYBRID_GREED_THRESHOLD}x la giocata paziente.`,
  choose(state) {
    const outcomes = evaluateAll(state);
    const byScore = [...outcomes].sort((a, b) => b.score - a.score || b.pointSwing - a.pointSwing);
    const greedyBest = byScore[0];

    const patient = CONSERVATIVE.choose(state);
    const patientOutcome = outcomes.find((o) => o.card.id === patient.id) ?? greedyBest;

    // Patience is the default. Greed has to make a case worth hearing.
    const worthIt = greedyBest.score >= patientOutcome.score * HYBRID_GREED_THRESHOLD;
    return worthIt ? greedyBest.card : patientOutcome.card;
  },
};

export const ALL_POLICIES: PlayerPolicy[] = [CONSERVATIVE, GREEDY, HYBRID];
