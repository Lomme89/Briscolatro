import React from 'react';
import { motion } from 'motion/react';
import { sound } from '../services/soundEngine';
import { Joker, DeckDefinition } from '../types/game';
import { CardFaceArt, getJokerArtUrl } from './CardFaceArt';

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
}

interface GameOverModalProps {
  isOpen: boolean;
  summary: GameOverSummaryData;
  onPlayAgain: () => void;
  onChangeDeck: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  summary,
  onPlayAgain,
  onChangeDeck,
}) => {
  if (!isOpen) return null;

  const {
    won,
    ante,
    round,
    totalScore,
    targetScore,
    totalTricksWon,
    totalTricksLost,
    totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent,
    finalMoney,
    totalMoneyEarned,
    jokersUsed,
    deckName,
    newUnlockedDecks,
    isNewHighScore,
  } = summary;

  const totalTricks = totalTricksWon + totalTricksLost;
  const winRate = totalTricks > 0 ? Math.round((totalTricksWon / totalTricks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto select-none">
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className={`rounded-2xl border-3 pixel-box max-w-xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto custom-scrollbar text-slate-100 ${
          won
            ? 'bg-slate-900 border-amber-400 shadow-amber-500/10'
            : 'bg-slate-900 border-red-500 shadow-red-500/10'
        }`}
      >
        {/* Outcome Header Banner */}
        <div className="text-center pb-3 mb-3 border-b border-slate-800">
          <div className="text-3xl sm:text-4xl mb-1">{won ? '👑 🏆 👑' : '💀 🥀 💀'}</div>

          <div className="flex items-center justify-center gap-2">
            <h2
              className={`font-pixel text-base sm:text-lg font-bold uppercase tracking-wider ${
                won ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {won ? 'VITTORIA ASSOLUTA!' : 'PARTITA CONCLUSA'}
            </h2>
          </div>

          <div
            className={`inline-block mt-1.5 px-3 py-0.5 rounded-full font-pixel text-[9px] sm:text-[10px] border font-bold ${
              won
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            {won
              ? 'HAI COMPLETATO TUTTI GLI 8 ANTE DEL TORNEO!'
              : `ELIMINATO AD ANTE ${ante} • ROUND ${round}/3`}
          </div>

          <p className="font-retro text-xs text-slate-300 mt-2 max-w-md mx-auto">
            {won
              ? 'Sei il nuovo Campione indiscusso del Torneo di Briscolatro! Tutti i bari e i veterani del Bar Sport si inchinano alla tua maestria.'
              : summary.defeatReason ||
                `Non hai raggiunto il punteggio richiesto di ${targetScore.toLocaleString()} punti ad Ante ${ante}. Riprova combinando nuovi Jolly e Carte Sola!`}
          </p>
        </div>

        {/* High score callout banner */}
        {isNewHighScore && (
          <div className="bg-amber-500/20 border-2 border-amber-400 rounded-xl p-2.5 mb-3 flex items-center justify-center gap-2 text-amber-300 font-pixel text-[10px] sm:text-xs animate-pulse">
            <span>⭐</span>
            <span>NUOVO RECORD PERSONALE REGISTRATO!</span>
            <span>⭐</span>
          </div>
        )}

        {/* 1. PRIMARY SCORE & OUTCOME METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 font-pixel">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase">PUNTEGGIO TOTALE</span>
            <span className="text-sm sm:text-base text-amber-300 font-bold mt-1">
              {totalScore.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase">ANTE MASSIMO</span>
            <span className="text-sm sm:text-base text-purple-300 font-bold mt-1">
              Ante {ante} <span className="text-[9px] text-purple-400">({round}/3)</span>
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase">PRESE VINTE</span>
            <span className="text-sm sm:text-base text-cyan-300 font-bold mt-1">
              {totalTricksWon} <span className="text-[9px] text-cyan-400">({winRate}%)</span>
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase">SOLDI FINALI</span>
            <span className="text-sm sm:text-base text-green-300 font-bold mt-1">
              ${finalMoney}
            </span>
          </div>
        </div>

        {/* 2. DETAILED MATCH STATISTICS ACCORDION/PANEL */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-3.5 mb-3 space-y-2.5">
          <div className="font-pixel text-[10px] sm:text-[11px] text-amber-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <span>📊</span>
            <span>STATISTICHE DETTAGLIATE DELLA PARTITA</span>
          </div>

          <div className="space-y-1.5 text-[10px] sm:text-[11px] font-pixel text-slate-300">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Mazzo Utilizzato:</span>
              <span className="text-amber-200 font-bold">{deckName}</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Totale Prese Giocate:</span>
              <span className="text-slate-200">
                {totalTricks} prese ({totalTricksWon} vinte, {totalTricksLost} perse)
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Punti Briscola Catturati (Tu vs Avversario):</span>
              <span className="font-bold text-blue-300">
                {totalBriscolaPointsPlayer} pt <span className="text-slate-400 font-normal">vs</span>{' '}
                <span className="text-red-400">{totalBriscolaPointsOpponent} pt</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Totale Denaro Guadagnato nel Run:</span>
              <span className="text-green-400 font-bold">${totalMoneyEarned}</span>
            </div>
          </div>
        </div>

        {/* 3. ACTIVE JOKERS SHOWCASE (BUILD SUMMARY) */}
        {jokersUsed.length > 0 && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 mb-3 space-y-2">
            <div className="font-pixel text-[10px] text-slate-400 flex items-center justify-between">
              <span>🃏 I TUOI JOLLY FINALI ({jokersUsed.length}):</span>
              <span className="text-[9px] text-slate-500 font-retro">La build con cui hai giocato</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {jokersUsed.map((joker, idx) => (
                <div
                  key={`${joker.id}-${idx}`}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg p-1.5 flex flex-col items-center text-center pixel-box"
                >
                  {getJokerArtUrl(joker.id) ? (
                    <div className="w-9 h-12 mb-1 rounded overflow-hidden border border-slate-700">
                      <CardFaceArt src={getJokerArtUrl(joker.id)!} alt={joker.name} />
                    </div>
                  ) : (
                    <span className="text-lg mb-0.5">{joker.icon}</span>
                  )}
                  <span className="font-pixel text-[8px] text-amber-300 font-bold truncate max-w-full leading-tight">
                    {joker.name}
                  </span>
                  <span className="font-retro text-[8px] text-slate-400 truncate max-w-full">
                    {joker.italianTitle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. UNLOCKED DECK REWARD BANNER */}
        {newUnlockedDecks && newUnlockedDecks.length > 0 && (
          <div className="bg-emerald-950/80 border-2 border-emerald-500 p-2.5 rounded-xl pixel-box text-emerald-200 text-xs font-pixel mb-3 flex items-center justify-center gap-2 animate-bounce">
            <span>🎁</span>
            <span>NUOVI MAZZI SBLOCCATI NELLA COLLEZIONE!</span>
          </div>
        )}

        {/* Actions Menu */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playCardFlick();
              onPlayAgain();
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-pixel text-xs sm:text-sm font-bold py-3.5 rounded-xl pixel-box shadow-xl cursor-pointer transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <span>🔄 GIOCA DI NUOVO</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playCardFlick();
              onChangeDeck();
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-pixel text-[10px] sm:text-xs py-2.5 rounded-xl pixel-box cursor-pointer min-h-[40px] flex items-center justify-center transition-colors"
          >
            🎴 TORNA AL MENU & SCEGLI ALTRO MAZZO
          </button>
        </div>
      </motion.div>
    </div>
  );
};
