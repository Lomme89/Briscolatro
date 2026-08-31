import { describe, expect, it } from 'vitest';
import { calculateRoundOutcome, RoundStateSnapshot } from './gameState';
import {
  buildCampaignVictorySummary,
  buildDefeatSummary,
  buildRoundSummary,
} from './runSummaries';

const snapshot: RoundStateSnapshot = {
  currentRoundScore: 1200,
  totalScore: 5400,
  roundPointsTaken: 70,
  opponentPointsTaken: 50,
  roundTricksWon: 11,
  roundTricksLost: 9,
  totalTricksWon: 31,
  totalTricksLost: 29,
  totalBriscolaPointsPlayer: 190,
  totalBriscolaPointsOpponent: 170,
  money: 18,
  totalMoneyEarned: 42,
  targetScore: 900,
  ante: 2,
  round: 2,
  vouchers: [],
  bossesDefeated: 1,
  solaCardsUsed: 0,
  victoryMode: 'briscolatro',
};

describe('run summary builders', () => {
  it('builds one consistent won-round presentation from the settled snapshot', () => {
    const outcome = calculateRoundOutcome(snapshot, 1000, []);
    const summary = buildRoundSummary({
      snapshot,
      outcome,
      boss: null,
      activeJokersCount: 3,
    });

    expect(summary).toMatchObject({
      won: true,
      achievedScore: 1200,
      playerTrickPoints: 70,
      totalTricks: 20,
      cashEarned: outcome.baseReward,
      interestEarned: outcome.interest,
      briscolaBonus: 4,
      activeJokersCount: 3,
    });
  });

  it('keeps the campaign reward in the final victory totals', () => {
    const outcome = calculateRoundOutcome(snapshot, 1000, []);
    const summary = buildCampaignVictorySummary({
      snapshot,
      outcome,
      jokers: [],
      deckName: 'Napoletano',
    });

    expect(summary.finalMoney).toBe(snapshot.money + outcome.totalReward);
    expect(summary.totalMoneyEarned).toBe(snapshot.totalMoneyEarned + outcome.totalReward);
    expect(summary.campaignVictory).toBe(true);
  });

  it('builds a defeat without inventing rewards or unlocks', () => {
    const lostSnapshot = { ...snapshot, currentRoundScore: 100, roundPointsTaken: 40 };
    const outcome = calculateRoundOutcome(lostSnapshot, 1000, []);
    const summary = buildDefeatSummary({
      snapshot: lostSnapshot,
      outcome,
      jokers: [],
      deckName: 'Napoletano',
      campaignVictory: true,
      endlessAnte: 12,
      endlessTierName: 'Ferro',
      isNewEndlessRecord: true,
    });

    expect(summary).toMatchObject({
      won: false,
      finalMoney: 18,
      newUnlockedDecks: [],
      campaignVictory: true,
      endlessAnte: 12,
      isNewEndlessRecord: true,
    });
    expect(summary.defeatReason).toBeTruthy();
  });
});
