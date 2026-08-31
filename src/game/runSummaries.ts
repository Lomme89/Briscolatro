import { BossBlind, Joker } from '../types/game';
import { GameOverSummaryData, RoundSummaryData } from '../types/runSummaries';
import { RoundOutcomeResult, RoundStateSnapshot } from './gameState';
import { buildDefeatReason } from './victoryModes';

interface SummaryInput {
  snapshot: RoundStateSnapshot;
  outcome: RoundOutcomeResult;
  boss: BossBlind | null;
  activeJokersCount: number;
}

export function buildRoundSummary({
  snapshot,
  outcome,
  boss,
  activeJokersCount,
}: SummaryInput): RoundSummaryData {
  return {
    ante: snapshot.ante,
    round: snapshot.round,
    targetScore: snapshot.targetScore,
    achievedScore: snapshot.currentRoundScore,
    playerTrickPoints: snapshot.roundPointsTaken,
    opponentTrickPoints: snapshot.opponentPointsTaken,
    playerTricksWon: snapshot.roundTricksWon,
    opponentTricksWon: snapshot.roundTricksLost,
    totalTricks: snapshot.roundTricksWon + snapshot.roundTricksLost,
    won: outcome.won,
    victory: outcome.victory,
    bossName: boss?.name,
    bossAvatar: boss?.avatar,
    cashEarned: outcome.won ? outcome.baseReward : 0,
    interestEarned: outcome.won ? outcome.interest : 0,
    briscolaBonus: outcome.won ? outcome.briscolaBonus : 0,
    capturedCarichi: [],
    activeJokersCount,
  };
}

interface CampaignVictorySummaryInput {
  snapshot: RoundStateSnapshot;
  outcome: RoundOutcomeResult;
  jokers: Joker[];
  deckName: string;
}

export function buildCampaignVictorySummary({
  snapshot,
  outcome,
  jokers,
  deckName,
}: CampaignVictorySummaryInput): GameOverSummaryData {
  return {
    won: true,
    ante: snapshot.ante,
    round: snapshot.round,
    totalScore: snapshot.totalScore,
    targetScore: snapshot.targetScore,
    totalTricksWon: snapshot.totalTricksWon,
    totalTricksLost: snapshot.totalTricksLost,
    totalBriscolaPointsPlayer: snapshot.totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent: snapshot.totalBriscolaPointsOpponent,
    finalMoney: snapshot.money + outcome.totalReward,
    totalMoneyEarned: snapshot.totalMoneyEarned + outcome.totalReward,
    jokersUsed: [...jokers],
    deckName,
    newUnlockedDecks: outcome.newUnlockedDecks,
    isNewHighScore: outcome.newHighScore,
    campaignVictory: true,
  };
}

interface DefeatSummaryInput {
  snapshot: RoundStateSnapshot;
  outcome: RoundOutcomeResult;
  jokers: Joker[];
  deckName: string;
  campaignVictory: boolean;
  endlessAnte?: number;
  endlessTierName?: string;
  isNewEndlessRecord: boolean;
}

export function buildDefeatSummary({
  snapshot,
  outcome,
  jokers,
  deckName,
  campaignVictory,
  endlessAnte,
  endlessTierName,
  isNewEndlessRecord,
}: DefeatSummaryInput): GameOverSummaryData {
  return {
    won: false,
    ante: snapshot.ante,
    round: snapshot.round,
    campaignVictory,
    endlessAnte,
    endlessTierName,
    isNewEndlessRecord,
    totalScore: snapshot.totalScore,
    targetScore: snapshot.targetScore,
    totalTricksWon: snapshot.totalTricksWon,
    totalTricksLost: snapshot.totalTricksLost,
    totalBriscolaPointsPlayer: snapshot.totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent: snapshot.totalBriscolaPointsOpponent,
    finalMoney: snapshot.money,
    totalMoneyEarned: snapshot.totalMoneyEarned,
    jokersUsed: [...jokers],
    deckName,
    newUnlockedDecks: [],
    isNewHighScore: outcome.newHighScore,
    defeatReason: buildDefeatReason(
      outcome.victory,
      snapshot.currentRoundScore,
      snapshot.targetScore,
      snapshot.roundPointsTaken
    ),
  };
}
