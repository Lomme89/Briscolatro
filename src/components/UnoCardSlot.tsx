import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UnoCard } from '../types/game';
import { sound } from '../services/soundEngine';
import { CardFaceArt, getUnoArtUrl } from './CardFaceArt';
import { PICKER_CARD_BOX } from './cardSizing';

interface UnoCardSlotProps {
  unoCard: UnoCard | null;
  onUse?: () => void;
  onSell?: () => void;
  isShopItem?: boolean;
  onBuy?: () => void;
  canAfford?: boolean;
  buyCost?: number;
  canUse?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'pick' | 'md';
  /** Pickers open a proper inspector, so the inline tooltip only gets in the way. */
  disableTooltip?: boolean;
  /** Overrides the "use it now" tap, e.g. to inspect the card in a booster. */
  onInspect?: () => void;
}

export const UnoCardSlot: React.FC<UnoCardSlotProps> = ({
  unoCard,
  onUse,
  onSell,
  isShopItem = false,
  onBuy,
  canAfford = true,
  buyCost,
  canUse = true,
  isSelected = false,
  size = 'md',
  disableTooltip = false,
  onInspect,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isSmall = size !== 'md';
  const sizeClasses = {
    sm: 'w-11 sm:w-16 h-15 sm:h-22 p-1 text-[8px]',
    pick: `${PICKER_CARD_BOX} p-1 text-[8px]`,
    md: 'w-16 sm:w-20 h-22 sm:h-28 p-1.5 text-xs',
  }[size];

  if (!unoCard) {
    return (
      <div 
        id="empty-uno-slot"
        className={`${sizeClasses} border-2 border-dashed border-red-900/40 rounded-xl flex flex-col items-center justify-center text-red-900/60 bg-red-950/20 select-none shrink-0`}
      >
        <span className={`${isSmall ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'} opacity-40`}>🔴</span>
        <span className="text-[6.5px] sm:text-[7.5px] font-pixel mt-0.5 opacity-50 font-bold tracking-wider">SOLA</span>
      </div>
    );
  }

  // Get color styles for Uno card theme
  const getThemeStyles = () => {
    switch (unoCard.unoColor) {
      case 'red':
        return {
          cardBg: 'from-red-600 via-red-700 to-rose-950',
          borderColor: 'border-red-400',
          shadowColor: 'shadow-red-900/60',
          ovalText: 'text-red-600',
          badgeBg: 'bg-red-800 text-white',
          glow: '#ef4444',
        };
      case 'blue':
        return {
          cardBg: 'from-blue-600 via-blue-700 to-indigo-950',
          borderColor: 'border-blue-400',
          shadowColor: 'shadow-blue-900/60',
          ovalText: 'text-blue-600',
          badgeBg: 'bg-blue-800 text-white',
          glow: '#3b82f6',
        };
      case 'green':
        return {
          cardBg: 'from-emerald-500 via-green-600 to-emerald-950',
          borderColor: 'border-emerald-400',
          shadowColor: 'shadow-green-900/60',
          ovalText: 'text-emerald-700',
          badgeBg: 'bg-emerald-800 text-white',
          glow: '#10b981',
        };
      case 'yellow':
        return {
          cardBg: 'from-amber-400 via-yellow-500 to-amber-700',
          borderColor: 'border-amber-200',
          shadowColor: 'shadow-amber-900/60',
          ovalText: 'text-amber-800',
          badgeBg: 'bg-amber-700 text-amber-100',
          glow: '#eab308',
        };
      case 'wild':
      default:
        return {
          cardBg: 'from-slate-900 via-purple-950 to-black',
          borderColor: 'border-fuchsia-400',
          shadowColor: 'shadow-purple-900/60',
          ovalText: 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 to-blue-500',
          badgeBg: 'bg-gradient-to-r from-red-600 via-yellow-500 to-blue-600 text-white font-bold',
          glow: '#a855f7',
        };
    }
  };

  const theme = getThemeStyles();

  // The illustrated faces are already whole UNO cards - fondo, ovale e simbolo -
  // so when one exists it replaces the drawn emblem instead of sitting inside it.
  const artUrl = getUnoArtUrl(unoCard.id);
  // In a picker there is nothing to use and nothing to pay: the card face says
  // everything, so it gets shown whole instead of under two badges.
  const bareFace = size === 'pick' && Boolean(artUrl);

  return (
    <div className="relative group shrink-0" id={`uno-card-${unoCard.id}`}>
      <motion.div
        whileHover={{ scale: 1.08, y: -4 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (onInspect) {
            sound.playCardSelect();
            onInspect();
            return;
          }
          if (!isShopItem && onUse) {
            // Picking the card up, not firing it: the fanfare belongs to the cast.
            sound.playCardSelect();
            onUse();
          }
        }}
        onMouseEnter={() => {
          if (disableTooltip) return;
          sound.playCardSelect();
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${sizeClasses} rounded-xl border-2 ${theme.borderColor} bg-gradient-to-b ${theme.cardBg} text-white pixel-box select-none cursor-pointer flex flex-col justify-between relative overflow-hidden shadow-lg ${theme.shadowColor} ${
          isSelected ? 'ring-4 ring-yellow-300 animate-pulse' : ''
        }`}
      >
        {/* Illustrated face */}
        {artUrl && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <CardFaceArt src={artUrl} alt={unoCard.name} />
            </div>
            {!bareFace && (
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/55 via-transparent to-black/70" />
            )}
          </>
        )}

        {/* Wild card quad color corners decorative indicator */}
        {!artUrl && unoCard.unoColor === 'wild' && (
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute -top-6 -left-6 w-12 h-12 rounded-full bg-red-500 blur-xs" />
            <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-blue-500 blur-xs" />
            <div className="absolute -bottom-6 -left-6 w-12 h-12 rounded-full bg-yellow-400 blur-xs" />
            <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-green-500 blur-xs" />
          </div>
        )}

        {/* Top bar: Corner mini symbol */}
        <div
          className={`flex items-center justify-between z-10 leading-none ${bareFace ? 'hidden' : ''}`}
        >
          <span className="font-pixel text-[7px] sm:text-[8px] font-black tracking-tighter drop-shadow-sm px-0.5 sm:px-1 py-0.2 rounded bg-black/40 border border-white/20">
            {unoCard.badgeText || unoCard.symbol}
          </span>
          {!artUrl && <span className="text-[9px] sm:text-[10px]">{unoCard.icon}</span>}
        </div>

        {/* Center: Iconic Oval Emblem */}
        <div className={`my-auto flex items-center justify-center z-10 ${artUrl ? 'hidden' : ''}`}>
          <div className={`${isSmall ? 'w-8 sm:w-11 h-8 sm:h-12' : 'w-11 sm:w-13 h-12 sm:h-14'} bg-white/95 rounded-[50%/42%] shadow-inner border border-white/80 flex flex-col items-center justify-center transform -rotate-12 p-0.5`}>
            {unoCard.unoColor === 'wild' ? (
              <div className="flex flex-col items-center justify-center">
                <span className={`${isSmall ? 'text-xs' : 'text-sm'} font-black font-pixel drop-shadow leading-none bg-gradient-to-br from-red-500 via-amber-400 via-emerald-500 to-blue-600 bg-clip-text text-transparent`}>
                  {unoCard.symbol}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <span className={`${isSmall ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-black font-pixel leading-none ${theme.ovalText} drop-shadow-xs`}>
                  {unoCard.symbol}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Action / Name */}
        <div
          className={`z-10 flex items-center justify-between text-[6px] sm:text-[6.5px] font-pixel pt-0.5 border-t border-white/20 text-white/90 ${
            bareFace ? 'hidden' : ''
          }`}
        >
          <span className="truncate max-w-[40px] font-bold">{unoCard.badgeText || 'SOLA'}</span>
          <span className="font-mono font-bold text-amber-300">
            {isShopItem ? `$${buyCost || unoCard.cost}` : 'USA'}
          </span>
        </div>
      </motion.div>

      {/* Use / Sell Buttons on Hover (when in game player hand) */}
      {!isShopItem && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-1 z-30 whitespace-nowrap">
          {onUse && (
            <button
              id={`use-uno-btn-${unoCard.id}`}
              onClick={(e) => {
                e.stopPropagation();
                sound.playCardSelect();
                onUse();
              }}
              disabled={!canUse}
              className={`font-pixel text-[7.5px] px-2 py-0.5 rounded shadow-md pixel-box cursor-pointer transition-transform hover:scale-105 ${
                canUse 
                  ? 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              USA
            </button>
          )}
          {onSell && (
            <button
              id={`sell-uno-btn-${unoCard.id}`}
              onClick={(e) => {
                e.stopPropagation();
                sound.playCashChime();
                onSell();
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-pixel text-[7.5px] px-1.5 py-0.5 rounded shadow pixel-box cursor-pointer"
            >
              +$1
            </button>
          )}
        </div>
      )}

      {/* Floating Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 p-2.5 bg-slate-950/95 border-2 border-red-500 rounded-xl pixel-box shadow-2xl z-50 text-left pointer-events-none"
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between border-b border-red-900/50 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{unoCard.icon}</span>
                <span className="font-pixel text-[9px] font-bold text-amber-300">
                  {unoCard.name}
                </span>
              </div>
              <span className={`text-[7px] font-pixel px-1.5 py-0.5 rounded uppercase font-bold ${theme.badgeBg}`}>
                {unoCard.unoColor}
              </span>
            </div>

            {/* Tooltip Description */}
            <p className="font-retro text-xs text-slate-200 leading-relaxed mb-2">
              {unoCard.description}
            </p>

            {/* Tooltip Footer */}
            <div className="flex items-center justify-between text-[8px] font-pixel pt-1 border-t border-slate-800 text-slate-400">
              <span>Tipo: {unoCard.targetType === 'card_in_hand' ? 'Mira Carta' : 'Istantanea'}</span>
              <span className="text-amber-400">Valore: ${unoCard.cost}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
