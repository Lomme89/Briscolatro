import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ALL_DECKS } from '../data/decks';
import { DeckDefinition } from '../types/game';
import { sound } from '../services/soundEngine';

interface DeckSelectProps {
  isOpen: boolean;
  onSelectDeck: (deck: DeckDefinition) => void;
  unlockedDeckIds: string[];
  onClose?: () => void;
}

export const DeckSelectModal: React.FC<DeckSelectProps> = ({
  isOpen,
  onSelectDeck,
  unlockedDeckIds,
  onClose,
}) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>('deck_napoletano');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-slate-900 border-2 sm:border-3 border-amber-500 rounded-2xl pixel-box max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-2xl sm:text-3xl filter drop-shadow">🎴</span>
              <div>
                <h2 className="font-pixel text-xs sm:text-sm md:text-base text-amber-400 font-bold uppercase tracking-wide">
                  SCEGLI IL TUO MAZZO
                </h2>
                <p className="font-retro text-[10px] sm:text-xs text-slate-300">
                  Ogni mazzo modifica le carte di partenza, fondi iniziali e bonus
                </p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  sound.playCardFlick();
                  onClose();
                }}
                aria-label="Chiudi"
                className="text-slate-400 hover:text-white font-pixel text-xs sm:text-sm px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg pixel-box cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Decks Grid with Smooth Touch Scroll */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 flex-1 overflow-y-auto overscroll-contain pr-1 touch-pan-y custom-scrollbar">
            {ALL_DECKS.map((deck) => {
              const isUnlocked = unlockedDeckIds.includes(deck.id) || deck.unlocked;
              const isCurrentSelected = selectedDeckId === deck.id;

              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    if (isUnlocked) {
                      setSelectedDeckId(deck.id);
                    }
                  }}
                  className={`rounded-xl border-2 p-3 sm:p-4 pixel-box flex flex-col justify-between transition-all relative select-none ${
                    isUnlocked
                      ? isCurrentSelected
                        ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/80 border-slate-700 hover:border-amber-400/70 hover:bg-slate-900/80 cursor-pointer'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Accent Top Line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-lg opacity-80"
                    style={{ backgroundColor: deck.color || '#eab308' }}
                  />

                  {/* Top Info: Icon, Status Badge & Title */}
                  <div>
                    <div className="flex items-center justify-between mb-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl filter drop-shadow">{deck.icon}</span>
                      {isUnlocked ? (
                        <span className="font-pixel text-[8px] bg-emerald-700/80 border border-emerald-500/50 text-emerald-100 px-2 py-0.5 rounded-full font-bold">
                          ✓ DISPONIBILE
                        </span>
                      ) : (
                        <span className="font-pixel text-[8px] bg-red-950/90 border border-red-700/80 text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          🔒 BLOCCATO
                        </span>
                      )}
                    </div>

                    <h3 className="font-pixel text-[11px] sm:text-xs text-amber-300 font-bold leading-snug">
                      {deck.name}
                    </h3>
                    <p className="font-retro text-[10px] text-slate-400 font-medium">
                      {deck.subtitle}
                    </p>

                    <p className="text-[11px] text-slate-200 font-retro leading-relaxed mt-2 bg-slate-900/60 p-2 rounded border border-slate-800/60">
                      {deck.description}
                    </p>
                  </div>

                  {/* Bottom: Starting Stats & Selection Button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[9px] font-pixel text-slate-400 mb-2.5">
                      <span className="flex items-center gap-1">
                        Soldi: <strong className="text-amber-400 font-bold">${deck.startingMoney}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        Scarti: <strong className="text-cyan-400 font-bold">{deck.startingDiscards}</strong>
                      </span>
                    </div>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playCardFlick();
                          onSelectDeck(deck);
                        }}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-pixel text-[10px] sm:text-xs font-bold py-2.5 rounded-lg pixel-box shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] min-h-[40px]"
                      >
                        <span>GIOCA QUESTO MAZZO</span>
                        <span>➔</span>
                      </button>
                    ) : (
                      <div className="bg-slate-900/90 border border-slate-800 p-2 rounded text-[10px] text-slate-400 text-center font-retro min-h-[38px] flex items-center justify-center">
                        🔒 Requisito: {deck.unlockRequirement}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
