import { BossBlind, Joker, PlayingCard } from '../../types/game';
import { createStandardDeck, resolveTrick } from '../briscola';
import { drawNextTrickCards, isRoundFinished, prepareRoundDeck } from '../gameState';
import { chooseOpponentFollow, chooseOpponentLead } from '../ai';
import { AI_PROFILES } from '../aiProfiles';
import { calculateTrickScore } from '../scoring';
import { JOKER_EFFECTS } from '../jokerEffects';
import { PlayerPolicy, PolicyState } from './policies';

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
  onTrick?: (trick: TrickReport) => void
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
      money: 10,
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
          money: 10,
          playerHand: hand,
          tricksWonThisRound: tricksWon,
          consecutiveWinStreak: streak,
          totalTricksPlayedThisRound: played,
          remainingTricksCount: Math.floor(pile.length / 2) + hand.length,
          capturedDenariRanksThisRound: capturedDenari,
        },
        1,
        null,
        playerLeads
      );
      score += result.finalScore;
      onTrick?.({ points: clash.points, score: result.finalScore, won: true });
      if (result.statGrowth.length > 0) {
        liveJokers = JOKER_EFFECTS.applyStatGrowth(liveJokers, result.statGrowth);
      }
      briscolaPoints += clash.points;
      tricksWon++;
      streak++;
      if (playerCard.suit === 'denari') capturedDenari.add(playerCard.rank);
      if (oppCard!.suit === 'denari') capturedDenari.add(oppCard!.rank);
    } else {
      onTrick?.({ points: clash.points, score: 0, won: false });
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

  return { score, briscolaPoints, tricksWon, wonAsBriscola: briscolaPoints > 60 };
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
