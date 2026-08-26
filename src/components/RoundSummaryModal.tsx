import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../services/soundEngine';
import { Joker, PlayingCard, UnoCard, Voucher } from '../types/game';
import { PixelCard } from './PixelCard';
import { PixelSuitIcon } from './PixelSuitIcon';

export interface RoundSummaryData {
  ante: number;
  round: number; // 1: Small Blind, 2: Big Blind, 3: Boss
  targetScore: number;
  achievedScore: number;
  playerTrickPoints: number; // e.g. 68/120 points from Briscola values
  opponentTrickPoints: number; // e.g. 52/120
  playerTricksWon: number;
  opponentTricksWon: number;
  totalTricks: number;
  won: boolean;
  bossName?: string;
  bossAvatar?: string;
  cashEarned: number;
  interestEarned: number;
  /** Cash bonus for taking more than 60 of the 120 Briscola points. */
  briscolaBonus: number;
  capturedCarichi: { rank: number; suit: string; points: number }[];
  activeJokersCount: number;
}

interface RoundSummaryModalProps {
  isOpen: boolean;
  data: RoundSummaryData | null;
  onContinue: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  data,
  onContinue,
}) => {
  if (!isOpen || !data) return null;

  const roundTypeName =
    data.round === 1
      ? 'Piccolo Buio (Small Blind)'
      : data.round === 2
      ? 'Grande Buio (Big Blind)'
      : `Scontro Boss: ${data.bossName || 'Il Campione'}`;

  const isBriscolaMajority = data.playerTrickPoints >= 61;
  const scoreExceeded = data.achievedScore >= data.targetScore;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className={`rounded-2xl border-3 pixel-box max-w-lg w-full p-4 sm:p-5 shadow-2xl flex flex-col text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar ${
          data.won
            ? 'bg-slate-900 border-amber-400/90 shadow-amber-500/10'
            : 'bg-slate-900 border-red-500/90 shadow-red-500/10'
        }`}
      >
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">{data.won ? '🏆' : '💀'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`font-pixel text-xs sm:text-sm font-bold uppercase tracking-wider ${
                    data.won ? 'text-amber-400' : 'text-red-400'
                  }`}
                >
                  {data.won ? 'MANCHE SUPERATA!' : 'MANCHE FALLITA'}
                </h2>
                <span className="font-pixel text-[8.5px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  ANTE {data.ante} • ROUND {data.round}/3
                </span>
              </div>
              <p className="font-retro text-[11px] text-slate-400">{roundTypeName}</p>
            </div>
          </div>

          <div
            className={`font-pixel text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 ${
              data.won
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            {data.won ? 'VITTORIA' : 'SCONFITTA'}
          </div>
        </div>

        {/* 1. SCORE COMPARISON HERO CARD */}
        <div className="bg-slate-950/90 rounded-xl p-3 sm:p-3.5 border border-slate-800 pixel-box mb-3 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-pixel text-slate-400">
            <span>OBIETTIVO PUNTEGGIO (CHIPS × MULT)</span>
            <span className={scoreExceeded ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
              {scoreExceeded ? '✓ OBIETTIVO RAGGIUNTO' : '✗ SOTTO OBIETTIVO'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-2 flex flex-col items-center">
              <span className="text-[9px] font-pixel text-slate-400 uppercase">Target Richiesto</span>
              <span className="text-lg sm:text-xl font-pixel text-amber-300 font-bold mt-0.5">
                {data.targetScore.toLocaleString()}
              </span>
            </div>
            <div
              className={`rounded-lg p-2 border flex flex-col items-center ${
                scoreExceeded
                  ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                  : 'bg-red-950/60 border-red-500/80 text-red-200'
              }`}
            >
              <span className="text-[9px] font-pixel uppercase">Punteggio Ottenuto</span>
              <span
                className={`text-lg sm:text-xl font-pixel font-bold mt-0.5 ${
                  scoreExceeded ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {data.achievedScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Target Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-900 h-2 rounded-full border border-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  scoreExceeded
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                    : 'bg-gradient-to-r from-red-600 to-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((data.achievedScore / Math.max(1, data.targetScore)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-pixel text-slate-400">
              <span>0</span>
              <span>
                {Math.round((data.achievedScore / Math.max(1, data.targetScore)) * 100)}% del Target
              </span>
              <span>{data.targetScore.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 2. BRISCOLA TRADITIONAL POINT BREAKDOWN (60/120 PT) */}
        <div className="bg-slate-950/90 rounded-xl p-3 sm:p-3.5 border border-slate-800 pixel-box mb-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-pixel">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🃏</span> PUNTI MAZZO BRISCOLA (120 TOTALI)
            </span>
            <span className="text-[9px] text-slate-400 font-retro">Maggioranza a 61 pt: bonus +$4</span>
          </div>

          {/* Dual VS Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs font-pixel">
            {/* Player Points Box */}
            <div className="bg-blue-950/50 border border-blue-500/50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-300 font-bold">TU</span>
                <span className="text-blue-200 font-bold">{data.playerTrickPoints} pt</span>
              </div>
              <div className="text-[9px] font-retro text-blue-300/80">
                {data.playerTricksWon} prese vinte
              </div>
              {isBriscolaMajority && (
                <div className="mt-1 font-pixel text-[8px] text-emerald-400 font-bold">
                  ★ Maggioranza Prese (&gt;60)
                </div>
              )}
            </div>

            {/* Opponent Points Box */}
            <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-red-300 font-bold">AVVERSARIO</span>
                <span className="text-red-200 font-bold">{data.opponentTrickPoints} pt</span>
              </div>
              <div className="text-[9px] font-retro text-red-300/80">
                {data.opponentTricksWon} prese vinte
              </div>
              {data.opponentTrickPoints >= 61 && (
                <div className="mt-1 font-pixel text-[8px] text-red-400 font-bold">
                  ★ Maggioranza Avversario
                </div>
              )}
            </div>
          </div>

          {/* Visual Briscola Points Tug-of-War Bar */}
          <div className="w-full bg-red-950 h-3 rounded-full border border-slate-700 flex overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-500 flex items-center justify-center text-[7.5px] font-pixel text-slate-950 font-bold"
              style={{ width: `${Math.round((data.playerTrickPoints / 120) * 100)}%` }}
            >
              {data.playerTrickPoints > 15 ? `${data.playerTrickPoints} pt` : ''}
            </div>
            <div
              className="bg-red-500 h-full transition-all duration-500 flex items-center justify-center text-[7.5px] font-pixel text-slate-950 font-bold"
              style={{ width: `${Math.round((data.opponentTrickPoints / 120) * 100)}%` }}
            >
              {data.opponentTrickPoints > 15 ? `${data.opponentTrickPoints} pt` : ''}
            </div>
          </div>
          <div className="flex justify-between text-[7.5px] font-pixel text-slate-400 px-1">
            <span>Tu: {data.playerTrickPoints}/120</span>
            <span className="text-amber-400">Bonus a 61 pt</span>
            <span>Avversario: {data.opponentTrickPoints}/120</span>
          </div>
        </div>

        {/* 3. REWARDS & PRIZE MONEY (IF WON) */}
        {data.won && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 pixel-box mb-3 space-y-1.5 font-pixel text-[10px]">
            <div className="text-amber-300 font-bold flex items-center gap-1">
              <span>💰</span> PREMIO VITTORIA MANCHE
            </div>
            <div className="flex justify-between text-slate-300 text-[10px]">
              <span>Ricompensa Base Ante:</span>
              <span className="text-green-400 font-bold">+${data.cashEarned}</span>
            </div>
            {data.interestEarned > 0 && (
              <div className="flex justify-between text-slate-300 text-[10px]">
                <span>Interessi Bancari:</span>
                <span className="text-green-400 font-bold">+${data.interestEarned}</span>
              </div>
            )}
            {data.briscolaBonus > 0 && (
              <div className="flex justify-between text-orange-200 text-[10px]">
                <span>🎴 Maggioranza Briscola (&gt;60):</span>
                <span className="text-green-400 font-bold">+${data.briscolaBonus}</span>
              </div>
            )}
            <div className="pt-1 border-t border-amber-500/30 flex justify-between font-bold text-xs text-amber-200">
              <span>Incasso Totale:</span>
              <span className="text-green-300">+${data.cashEarned + data.interestEarned + data.briscolaBonus}</span>
            </div>
          </div>
        )}

        {/* 4. SUMMARY MOTIVATION FOOTER */}
        <div className="text-center font-retro text-xs text-slate-300 mb-3 px-2">
          {data.won
            ? 'Ottima giocata! Preparati per il Negozio dove potrai comprare nuovi Jolly, carte UNO e potenziamenti per il mazzo!'
            : 'Non hai superato la manche. Il tuo punteggio totale o le prese non sono bastate a soddisfare la richiesta.'}
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={() => {
            sound.playCardFlick();
            onContinue();
          }}
          className={`w-full font-pixel text-xs font-bold py-3 rounded-xl pixel-box shadow-lg cursor-pointer min-h-[44px] flex items-center justify-center transition-transform hover:scale-[1.01] active:scale-[0.98] ${
            data.won
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {data.won ? 'VAI AL NEGOZIO ➔' : 'VEDI BILANCIO FINALE ➔'}
        </button>
      </motion.div>
    </div>
  );
};
