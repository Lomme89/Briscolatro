import { Joker } from './game';
import { VictoryCheck } from '../game/victoryModes';

export interface RoundSummaryData {
  ante: number;
  round: number;
  targetScore: number;
  achievedScore: number;
  playerTrickPoints: number;
  opponentTrickPoints: number;
  playerTricksWon: number;
  opponentTricksWon: number;
  totalTricks: number;
  won: boolean;
  bossName?: string;
  bossAvatar?: string;
  cashEarned: number;
  interestEarned: number;
  briscolaBonus: number;
  capturedCarichi: { rank: number; suit: string; points: number }[];
  activeJokersCount: number;
  victory: VictoryCheck;
}

export interface GameOverSummaryData {
  won: boolean;
  ante: number;
  round: number;
  totalScore: number;
  targetScore: number;
  totalTricksWon: number;
  totalTricksLost: number;
  totalBriscolaPointsPlayer: number;
  totalBriscolaPointsOpponent: number;
  finalMoney: number;
  totalMoneyEarned: number;
  jokersUsed: Joker[];
  deckName: string;
  newUnlockedDecks: string[];
  isNewHighScore: boolean;
  defeatReason?: string;
  campaignVictory?: boolean;
  endlessAnte?: number;
  endlessTierName?: string;
  isNewEndlessRecord?: boolean;
}
