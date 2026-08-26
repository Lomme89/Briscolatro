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
        className={`rounded-2xl border-3 pixel-box max-w-lg w-full p-4 sm:p-5 shadow-2xl flex flex-col text-slate-100 max-h-[94dvh] overflow-y-auto custom-scrollbar ${
          data.won
            ? 'bg-slate-900 border-amber-400/90 shadow-amber-500/10'
            : 'bg-slate-900 border-red-500/90 shadow-red-500/10'
        }`}
      >
        {/* Header. Everything wraps: on a phone with a large system font the
            title, the ante badge and the verdict cannot share one line. */}
        <div className="border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-start gap-2">
            <span className="text-2xl sm:text-3xl shrink-0 leading-none">{data.won ? '🏆' : '💀'}</span>
            <div className="min-w-0 flex-1">
              <h2
                className={`font-pixel text-xs sm:text-sm font-bold uppercase tracking-wider ${
                  data.won ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {data.won ? 'MANCHE SUPERATA!' : 'MANCHE FALLITA'}
              </h2>
              <p className="font-retro text-[11px] text-slate-400 mt-0.5">{roundTypeName}</p>
            </div>
            <div
              className={`font-pixel text-[10px] sm:text-xs px-2 py-1 rounded-lg border font-bold shrink-0 ${
                data.won
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-red-950/80 border-red-500 text-red-300'
              }`}
            >
              {data.won ? 'VITTORIA' : 'SCONFITTA'}
            </div>
          </div>
          <span className="inline-block mt-2 font-pixel text-[8.5px] sm:text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            ANTE {data.ante} • ROUND {data.round}/3
          </span>
        </div>

        {/* 1. SCORE COMPARISON HERO CARD */}
        <div className="bg-slate-950/90 rounded-xl p-2.5 border border-slate-800 pixel-box mb-2 space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[9px] font-pixel">
            <span className="text-slate-400">CHIPS × MULT</span>
            <span className={scoreExceeded ? 'text-emerald-400 font-bold' : 'text-red-300 font-bold'}>
              {scoreExceeded ? '✓ SUPERATO' : '✗ NON SUPERATO'}
            </span>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[8.5px] font-pixel text-slate-500 uppercase leading-none">Fatti</div>
              <div
                className={`font-pixel text-xl sm:text-2xl font-bold leading-none mt-1 tabular-nums ${
                  scoreExceeded ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {data.achievedScore.toLocaleString('it-IT')}
              </div>
            </div>
            <div className="text-right min-w-0">
              <div className="text-[8.5px] font-pixel text-slate-500 uppercase leading-none">Richiesti</div>
              <div className="font-pixel text-sm sm:text-base text-amber-300 font-bold leading-none mt-1 tabular-nums">
                {data.targetScore.toLocaleString('it-IT')}
              </div>
            </div>
          </div>

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
        </div>

        {/* 2. BRISCOLA TRADITIONAL POINT BREAKDOWN (60/120 PT) */}
        <div className="bg-slate-950/90 rounded-xl p-2.5 border border-slate-800 pixel-box mb-2 space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-[9px] font-pixel">
            <span className="text-amber-400 font-bold">🃏 PUNTI BRISCOLA</span>
            <span className="text-slate-400 font-retro text-[9px]">Maggioranza (61+): +$4</span>
          </div>

          <div className="flex items-baseline justify-between gap-2 font-pixel">
            <span className="text-blue-300 text-[10px] sm:text-xs">
              TU <strong className="text-blue-200 text-sm sm:text-base tabular-nums">{data.playerTrickPoints}</strong>
              <span className="text-[8.5px] text-blue-300/70"> · {data.playerTricksWon} prese</span>
            </span>
            <span className="text-red-300 text-[10px] sm:text-xs text-right">
              <span className="text-[8.5px] text-red-300/70">{data.opponentTricksWon} prese · </span>
              <strong className="text-red-200 text-sm sm:text-base tabular-nums">{data.opponentTrickPoints}</strong> LUI
            </span>
          </div>

          {/* Tug-of-war: the two shares of the 120 points on the table */}
          <div className="w-full bg-slate-900 h-2.5 rounded-full border border-slate-700 flex overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${Math.round((data.playerTrickPoints / 120) * 100)}%` }}
            />
            <div
              className="bg-red-500 h-full transition-all duration-500"
              style={{ width: `${Math.round((data.opponentTrickPoints / 120) * 100)}%` }}
            />
          </div>

          {isBriscolaMajority && (
            <div className="font-pixel text-[8.5px] text-emerald-400 font-bold">
              ★ Maggioranza tua: bonus incassato
            </div>
          )}
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

        {/* The pep talk said nothing the numbers above do not, and it was the
            difference between fitting on a phone screen and scrolling. */}
        {!data.won && (
          <div className="text-center font-retro text-[11px] text-red-200 mb-2 px-1">
            Il punteggio non è bastato: servivano {data.targetScore.toLocaleString('it-IT')} punti.
          </div>
        )}

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
