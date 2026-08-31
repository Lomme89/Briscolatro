import { BossBlind, Joker, PlayingCard } from '../../types/game';
import { createStandardDeck, resolveTrick } from '../briscola';
import { drawNextTrickCards, isRoundFinished, prepareRoundDeck } from '../gameState';
import { chooseOpponentFollow, chooseOpponentLead } from '../ai';
import { AI_PROFILES } from '../aiProfiles';
import { calculateTrickScore } from '../scoring';
import { JOKER_EFFECTS } from '../jokerEffects';
import { PlayerPolicy, PolicyState } from './policies';
import { evaluateVictoryCondition, VictoryMode } from '../victoryModes';

/**
 * A bench for asking one question: does Briscolatro reward playing Briscola?
 *
 * The game has two souls. The classical one pays for sixty-one points at the
 * end of the round - sacrifices, tempo, holding the trump back, remembering
 * what has fallen. The roguelite one pays for tricks won, in Chips and Mult and
 * jolly procs. Those two are not obviously the same game, and this file exists
 * to find out how far apart they are BEFORE anything gets redesigned.
 *
 * Dev-only. Nothing here is imported by the app.
 */

export interface RoundReport {
  score: number;
  briscolaPoints: number;
  tricksWon: number;
  /** Took more than 60 of the 120 points: won the round as Briscola scores it. */
  wonAsBriscola: boolean;
  /**
   * The jokers as they stand after the round.
   *
   * Il Vesuvio and il Barone bank permanent growth every time they fire, and in
   * the real game that carries to the next blind. A run simulator that threw it
   * away would systematically understate exactly the builds the game is built
   * around.
   */
  jokersAfter: Joker[];
}

/** One trick, as both games see it: what it was worth, and what it paid. */
export interface TrickReport {
  /** Briscola points in the trick, 0 to 21. */
  points: number;
  /** Briscolatro score it paid. Zero when the trick was lost. */
  score: number;
  won: boolean;
}

const HOUSE = { ...AI_PROFILES.gennaro_habitue, noise: 0 };

/**
 * Plays one whole round with a policy in the player's seat.
 *
 * `observers` are asked what they would have played at every decision, without
 * being allowed to change anything: that is how divergence is measured on a
 * single shared sequence of positions rather than on three different games.
 */
export function playRound(
  policy: PlayerPolicy,
  jokers: Joker[],
  boss: BossBlind | null = null,
  runDeck?: PlayingCard[],
  observers: PlayerPolicy[] = [],
  onDecision?: (state: PolicyState, picks: Record<string, PlayingCard>) => void,
  onTrick?: (trick: TrickReport) => void,
  /**
   * Carte Sola, in the crudest possible form: this many tricks get a x1.5 on
   * their score, spent on the first tricks the player wins. The real cards do
   * eighteen different things and the run simulator does not need them to; it
   * needs the slot to cost money and to be worth something.
   */
  unoBoosts = 0,
  /**
   * The bankroll the scoring context sees.
   *
   * It used to be a hard-coded 10 in two places, which quietly handed il Jolly
   * del Bar Sport ten free Mult in every measurement ever taken here. This
   * bench has no economy - it plays one round out of context - so its default
   * is nothing, and the run simulator passes the real wallet through
   * `simulateEncounter` instead.
   */
  bankroll = 0
): RoundReport {
  let liveJokers = jokers.map((j) => ({ ...j }));
  const deal = prepareRoundDeck(runDeck ?? createStandardDeck());
  let hand = deal.playerHand;
  let oppHand = deal.opponentHand;
  let pile = deal.roundDrawPile;
  let trump: PlayingCard | null = deal.trumpCard;
  const briscolaSuit = deal.briscolaSuit;

  let score = 0;
  let briscolaPoints = 0;
  let tricksWon = 0;
  let streak = 0;
  let played = 0;
  const capturedDenari = new Set<number>();
  let playerLeads = true;
  let boostsLeft = unoBoosts;

  while (hand.length > 0 && oppHand.length > 0) {
    // The opponent opens before the policy has to answer, so the state the
    // policy sees is the state a player would be looking at.
    let oppCard: PlayingCard | null = null;
    if (!playerLeads) {
      oppCard = chooseOpponentLead(oppHand, { briscolaSuit, bossDebuff: boss?.debuffType, profile: HOUSE })!;
    }

    const state: PolicyState = {
      hand,
      briscolaSuit,
      jokers: liveJokers,
      boss,
      opponentCard: oppCard,
      tricksWon,
      streak,
      tricksPlayed: played,
      remainingTricks: Math.floor(pile.length / 2) + hand.length,
      capturedDenari,
      money: bankroll,
    };

    const playerCard = policy.choose(state);

    if (observers.length > 0 && onDecision) {
      const picks: Record<string, PlayingCard> = { [policy.id]: playerCard };
      for (const observer of observers) {
        if (observer.id === policy.id) continue;
        picks[observer.id] = observer.choose(state);
      }
      onDecision(state, picks);
    }

    if (playerLeads) {
      oppCard = chooseOpponentFollow(oppHand, playerCard, {
        briscolaSuit,
        bossDebuff: boss?.debuffType,
        profile: HOUSE,
      })!;
    }

    hand = hand.filter((c) => c.id !== playerCard.id);
    oppHand = oppHand.filter((c) => c.id !== oppCard!.id);

    const clash = resolveTrick(
      playerLeads ? playerCard : oppCard!,
      playerLeads ? oppCard! : playerCard,
      briscolaSuit,
      playerLeads,
      boss?.debuffType
    );

    if (clash.playerWon) {
      const result = calculateTrickScore(
        playerCard,
        oppCard!,
        clash,
        briscolaSuit,
        liveJokers,
        boss,
        {
          money: bankroll,
          playerHand: hand,
          consecutiveWinStreak: streak,
          totalTricksPlayedThisRound: played,
          remainingTricksCount: Math.floor(pile.length / 2) + hand.length,
          capturedDenariRanksThisRound: capturedDenari,
        },
        boostsLeft > 0 ? 1.5 : 1,
        null,
        playerLeads
      );
      if (boostsLeft > 0) boostsLeft--;
      score += result.finalScore;
      onTrick?.({ points: clash.rawPoints, score: result.finalScore, won: true });
      if (result.statGrowth.length > 0) {
        liveJokers = JOKER_EFFECTS.applyStatGrowth(liveJokers, result.statGrowth);
      }
      briscolaPoints += clash.rawPoints;
      tricksWon++;
      streak++;
      if (playerCard.suit === 'denari') capturedDenari.add(playerCard.rank);
      if (oppCard!.suit === 'denari') capturedDenari.add(oppCard!.rank);
    } else {
      onTrick?.({ points: clash.rawPoints, score: 0, won: false });
      streak = 0;
    }

    played++;
    playerLeads = clash.playerWon;

    if (isRoundFinished(hand, oppHand, pile, trump)) break;
    const drawn = drawNextTrickCards(clash.playerWon, pile, trump, hand, oppHand);
    hand = drawn.newPlayerHand;
    oppHand = drawn.newOpponentHand;
    pile = drawn.newDrawPile;
    trump = drawn.newTrumpCard;
  }

  return {
    score,
    briscolaPoints,
    tricksWon,
    wonAsBriscola: briscolaPoints > 60,
    jokersAfter: liveJokers,
  };
}

export interface PolicySummary {
  policyId: string;
  rounds: number;
  avgScore: number;
  avgBriscolaPoints: number;
  avgTricksWon: number;
  briscolaWinRate: number;
}

/** Runs a policy over many deals and averages what came out. */
export function benchmark(
  policy: PlayerPolicy,
  jokers: Joker[],
  rounds: number,
  boss: BossBlind | null = null
): PolicySummary {
  let score = 0;
  let points = 0;
  let tricks = 0;
  let wins = 0;

  for (let i = 0; i < rounds; i++) {
    const report = playRound(policy, jokers, boss);
    score += report.score;
    points += report.briscolaPoints;
    tricks += report.tricksWon;
    if (report.wonAsBriscola) wins++;
  }

  return {
    policyId: policy.id,
    rounds,
    avgScore: score / rounds,
    avgBriscolaPoints: points / rounds,
    avgTricksWon: tricks / rounds,
    briscolaWinRate: wins / rounds,
  };
}

export interface DivergenceReport {
  decisions: number;
  /** Fraction of positions where the pair would have played a different card. */
  pairs: Record<string, number>;
  /** Fraction of positions where all three agreed. */
  unanimous: number;
}

/**
 * How often the policies would actually play differently.
 *
 * One referee drives the round so that every policy is asked about the SAME
 * position. Ask three policies to each play their own game and they end up in
 * different places, and nothing can be compared.
 */
export function measureDivergence(
  referee: PlayerPolicy,
  policies: PlayerPolicy[],
  jokers: Joker[],
  rounds: number,
  boss: BossBlind | null = null
): DivergenceReport {
  const pairCounts: Record<string, number> = {};
  let decisions = 0;
  let unanimous = 0;

  for (let i = 0; i < rounds; i++) {
    playRound(referee, jokers, boss, undefined, policies, (_state, picks) => {
      decisions++;
      let allSame = true;
      for (let a = 0; a < policies.length; a++) {
        for (let b = a + 1; b < policies.length; b++) {
          const key = `${policies[a].id} vs ${policies[b].id}`;
          const differ = picks[policies[a].id].id !== picks[policies[b].id].id;
          if (differ) {
            pairCounts[key] = (pairCounts[key] ?? 0) + 1;
            allSame = false;
          } else {
            pairCounts[key] = pairCounts[key] ?? 0;
          }
        }
      }
      if (allSame) unanimous++;
    });
  }

  const pairs: Record<string, number> = {};
  for (const [key, count] of Object.entries(pairCounts)) {
    pairs[key] = decisions === 0 ? 0 : count / decisions;
  }

  return { decisions, pairs, unanimous: decisions === 0 ? 0 : unanimous / decisions };
}

/** Right-pads for console tables that stay readable in a CI log. */
export function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

/** Pearson correlation, for asking whether two numbers move together. */
export function correlation(samples: Array<[number, number]>): number {
  const n = samples.length;
  if (n < 2) return 0;
  const meanX = samples.reduce((a, [x]) => a + x, 0) / n;
  const meanY = samples.reduce((a, [, y]) => a + y, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const [x, y] of samples) {
    cov += (x - meanX) * (y - meanY);
    varX += (x - meanX) ** 2;
    varY += (y - meanY) ** 2;
  }
  return varX === 0 || varY === 0 ? 0 : cov / Math.sqrt(varX * varY);
}

// --- Victory modes ---------------------------------------------------------

/**
 * How a blind went, seen through one set of rules.
 *
 * The counters here are the ones Prompt 7 will need: in Sbaraglio, how many
 * blinds were carried by the Chips target, how many by the sixty-one, and how
 * many by both - because if the classical route quietly takes over at high
 * antes, the mode is bypassing the roguelite rather than widening it.
 */
export interface ModeTally {
  rounds: number;
  wins: number;
  avgScore: number;
  avgBriscolaPoints: number;
  /** Wins carried by the Chips target alone. */
  winChipsOnly: number;
  /** Wins carried by the sixty-one alone. */
  winBriscolaOnly: number;
  /** Wins where both requirements were met. */
  winBoth: number;
  losses: number;
  /** Rounds where Chips passed and Briscola did not, whatever the verdict. */
  chipsPassBriscolaFail: number;
  chipsFailBriscolaPass: number;
  bothPass: number;
  bothFail: number;
}

/**
 * Plays a blind many times and tallies it under one set of rules.
 *
 * The round itself is identical in every mode - the cards do not know what is
 * being played for - so one set of playthroughs can be judged by all four, and
 * the comparison is exact rather than approximate.
 */
export function tallyMode(
  policy: PlayerPolicy,
  mode: VictoryMode,
  jokers: Joker[],
  targetScore: number,
  rounds: number,
  boss: BossBlind | null = null
): ModeTally {
  const tally: ModeTally = {
    rounds,
    wins: 0,
    avgScore: 0,
    avgBriscolaPoints: 0,
    winChipsOnly: 0,
    winBriscolaOnly: 0,
    winBoth: 0,
    losses: 0,
    chipsPassBriscolaFail: 0,
    chipsFailBriscolaPass: 0,
    bothPass: 0,
    bothFail: 0,
  };

  let score = 0;
  let points = 0;

  for (let i = 0; i < rounds; i++) {
    const report = playRound(policy, jokers, boss);
    score += report.score;
    points += report.briscolaPoints;

    const verdict = evaluateVictoryCondition({
      mode,
      score: report.score,
      targetScore,
      playerBriscolaPoints: report.briscolaPoints,
    });

    if (verdict.chipsPassed && verdict.briscolaPassed) tally.bothPass++;
    else if (verdict.chipsPassed) tally.chipsPassBriscolaFail++;
    else if (verdict.briscolaPassed) tally.chipsFailBriscolaPass++;
    else tally.bothFail++;

    if (verdict.won) {
      tally.wins++;
      if (verdict.victoryRoute === 'both') tally.winBoth++;
      else if (verdict.victoryRoute === 'chips') tally.winChipsOnly++;
      else if (verdict.victoryRoute === 'briscola') tally.winBriscolaOnly++;
    } else {
      tally.losses++;
    }
  }

  tally.avgScore = score / rounds;
  tally.avgBriscolaPoints = points / rounds;
  return tally;
}
