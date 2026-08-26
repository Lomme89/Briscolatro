import { PlayingCard, Joker, BossBlind } from '../../types/game';
import { createStandardDeck, resolveTrick } from '../briscola';
import { prepareRoundDeck, drawNextTrickCards, isRoundFinished } from '../gameState';
import { chooseOpponentFollow, chooseOpponentLead } from '../ai';
import { calculateTrickScore } from '../scoring';
import { JOKER_EFFECTS } from '../jokerEffects';
import { ALL_JOKERS } from '../../data/jokers';

/** Deterministic PRNG so balance runs are reproducible. */
export function seedRandom(seed: number) {
  let s = seed >>> 0;
  const original = Math.random;
  Math.random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return () => { Math.random = original; };
}

export interface RoundSim {
  score: number;
  tricksWon: number;
  briscolaPoints: number;
}

/** The player plays with the same policy as the AI, i.e. a competent-but-not-perfect human. */
export function simulateRound(
  jokers: Joker[],
  boss: BossBlind | null = null,
  onJokersChanged?: (next: Joker[]) => void,
  runDeck?: PlayingCard[]
): RoundSim {
  let liveJokers = jokers;
  const deal = prepareRoundDeck(runDeck ?? createStandardDeck());
  let { playerHand, opponentHand } = deal;
  let pile = deal.roundDrawPile;
  let trump: PlayingCard | null = deal.trumpCard;
  const briscolaSuit = deal.briscolaSuit;

  let score = 0;
  let tricksWon = 0;
  let tricksLost = 0;
  let briscolaPoints = 0;
  let streak = 0;
  let played = 0;
  const capturedDenari = new Set<number>();
  let playerLeads = true;

  while (playerHand.length > 0 && opponentHand.length > 0) {
    let playerCard: PlayingCard;
    let oppCard: PlayingCard;

    if (playerLeads) {
      playerCard = chooseOpponentLead(playerHand, { briscolaSuit })!;
      oppCard = chooseOpponentFollow(opponentHand, playerCard, { briscolaSuit })!;
    } else {
      oppCard = chooseOpponentLead(opponentHand, { briscolaSuit })!;
      playerCard = chooseOpponentFollow(playerHand, oppCard, { briscolaSuit })!;
    }
    playerHand = playerHand.filter((c) => c.id !== playerCard.id);
    opponentHand = opponentHand.filter((c) => c.id !== oppCard.id);

    const clash = resolveTrick(
      playerLeads ? playerCard : oppCard,
      playerLeads ? oppCard : playerCard,
      briscolaSuit,
      playerLeads,
      boss?.debuffType
    );

    if (clash.playerWon) {
      const result = calculateTrickScore(playerCard, oppCard, clash, briscolaSuit, liveJokers, boss, {
        money: 10,
        playerHand,
        tricksWonThisRound: tricksWon,
        consecutiveWinStreak: streak,
        totalTricksPlayedThisRound: played,
        remainingTricksCount: Math.floor(pile.length / 2) + playerHand.length,
        capturedDenariRanksThisRound: capturedDenari,
      });
      score += result.finalScore;
      if (result.statGrowth.length > 0) {
        liveJokers = JOKER_EFFECTS.applyStatGrowth(liveJokers, result.statGrowth);
        onJokersChanged?.(liveJokers);
      }
      briscolaPoints += clash.points;
      tricksWon++;
      streak++;
      if (playerCard.suit === 'denari') capturedDenari.add(playerCard.rank);
      if (oppCard.suit === 'denari') capturedDenari.add(oppCard.rank);
    } else {
      tricksLost++;
      streak = 0;
    }
    played++;
    playerLeads = clash.playerWon;

    if (isRoundFinished(playerHand, opponentHand, pile, trump)) break;
    const drawn = drawNextTrickCards(clash.playerWon, pile, trump, playerHand, opponentHand);
    playerHand = drawn.newPlayerHand;
    opponentHand = drawn.newOpponentHand;
    pile = drawn.newDrawPile;
    trump = drawn.newTrumpCard;
  }

  return { score, tricksWon, briscolaPoints };
}

export function jokersByIds(ids: string[]): Joker[] {
  return ids.map((id) => ({ ...ALL_JOKERS.find((j) => j.id === id)! }));
}

export function stats(runs: RoundSim[]) {
  const scores = runs.map((r) => r.score).sort((a, b) => a - b);
  const pct = (p: number) => scores[Math.floor((scores.length - 1) * p)];
  return {
    min: scores[0],
    p25: pct(0.25),
    median: pct(0.5),
    p75: pct(0.75),
    max: scores[scores.length - 1],
    avgTricks: +(runs.reduce((s, r) => s + r.tricksWon, 0) / runs.length).toFixed(1),
    avgBriscolaPoints: Math.round(runs.reduce((s, r) => s + r.briscolaPoints, 0) / runs.length),
    winRate61: +(runs.filter((r) => r.briscolaPoints > 60).length / runs.length).toFixed(2),
  };
}

/** A run deck with `count` cards swapped for shop-grade upgrades. */
export function upgradedRunDeck(count: number): PlayingCard[] {
  const deck = createStandardDeck();
  const editions = ['foil', 'holo', 'polychrome'] as const;
  const enhancements = ['bonus', 'mult', 'steel', 'glass'] as const;
  const seals = ['red', 'gold', 'none', 'none'] as const;
  for (let i = 0; i < Math.min(count, deck.length); i++) {
    deck[i] = {
      ...deck[i],
      edition: editions[i % editions.length],
      enhancement: enhancements[i % enhancements.length],
      seal: seals[i % seals.length],
    };
  }
  return deck;
}
