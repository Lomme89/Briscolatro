import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayingCard, Suit } from '../types/game';
import { PixelCard } from './PixelCard';
import { PixelSuitIcon } from './PixelSuitIcon';

interface DeckViewerProps {
  isOpen: boolean;
  onClose: () => void;
  deck: PlayingCard[];
  briscolaSuit: Suit;
}

export const DeckViewerModal: React.FC<DeckViewerProps> = ({
  isOpen,
  onClose,
  deck,
  briscolaSuit,
}) => {
  const [filterSuit, setFilterSuit] = useState<Suit | 'all'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];

  const filteredCards = deck.filter((card) => {
    if (filterSuit === 'all') return true;
    return card.suit === filterSuit;
  });

  // Calculate deck statistics
  const totalPoints = deck.reduce((acc, c) => acc + c.points, 0);
  const totalFoils = deck.filter((c) => c.edition !== 'standard').length;
  const briscolaCards = deck.filter((c) => c.suit === briscolaSuit).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-slate-900 border-2 sm:border-3 border-amber-500 rounded-2xl pixel-box max-w-4xl w-full p-3.5 sm:p-5 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-2.5 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">🎴</span>
            <div>
              <h2 className="font-pixel text-xs sm:text-sm text-amber-400 font-bold uppercase tracking-wide">
                ISPETTORE MAZZO ({deck.length} CARTE)
              </h2>
              <p className="font-retro text-[10px] sm:text-xs text-slate-300">
                Punti: {totalPoints} pt • Speciali: {totalFoils} • Briscole: {briscolaCards}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-pixel text-[10px] sm:text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg pixel-box cursor-pointer min-h-[36px] flex items-center justify-center transition-colors"
          >
            ✕ CHIUDI
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setFilterSuit('all')}
            className={`font-pixel text-[9px] sm:text-[10px] px-2.5 sm:px-3 py-1.5 rounded-lg pixel-box cursor-pointer min-h-[32px] transition-colors ${
              filterSuit === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            TUTTI ({deck.length})
          </button>

          {suits.map((suit) => {
            const count = deck.filter((c) => c.suit === suit).length;
            return (
              <button
                type="button"
                key={suit}
                onClick={() => setFilterSuit(suit)}
                className={`font-pixel text-[9px] sm:text-[10px] px-2 sm:px-3 py-1.5 rounded-lg pixel-box flex items-center gap-1 cursor-pointer min-h-[32px] transition-colors ${
                  filterSuit === suit
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <PixelSuitIcon suit={suit} size={13} />
                <span className="uppercase">{suit}</span>
                <span>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 items-start p-2 bg-slate-950/60 rounded-xl border border-slate-800 touch-pan-y custom-scrollbar">
          {filteredCards.length > 0 ? (
            filteredCards.map((card) => (
              <div key={card.id} className="flex justify-center">
                <PixelCard
                  card={card}
                  size="sm"
                  isBriscola={card.suit === briscolaSuit}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500 font-pixel text-xs">
              Nessuna carta trovata per questo filtro.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
