import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Joker } from '../types/game';
import { CardFaceArt, getJokerArtUrl } from './CardFaceArt';

interface JokerSlotProps {
  joker: Joker | null;
  onSell?: () => void;
  onClick?: () => void;
  showSellButton?: boolean;
  isTriggering?: boolean;
  isShopItem?: boolean;
  buyCost?: number;
  onBuy?: () => void;
  canAfford?: boolean;
  size?: 'sm' | 'md';
}

export const JokerSlot: React.FC<JokerSlotProps> = ({
  joker,
  onSell,
  onClick,
  showSellButton = true,
  isTriggering = false,
  isShopItem = false,
  buyCost,
  onBuy,
  canAfford = true,
  size = 'md',
}) => {
  // Hover is a desktop luxury: on a phone the only way in is a tap, so the card
  // toggles its own details. Without this you cannot read what your jokers do
  // during a match, nor reach the sell button.
  const [showTooltip, setShowTooltip] = useState(false);
  const [pinned, setPinned] = useState(false);
  const isOpen = showTooltip || pinned;

  const isSmall = size === 'sm';
  const sizeClasses = isSmall 
    ? 'w-11 sm:w-16 h-15 sm:h-22 p-1 text-[8px]' 
    : 'w-16 sm:w-20 h-22 sm:h-28 p-1.5 text-xs';

  if (!joker) {
    return (
      <div 
        className={`${sizeClasses} border-2 border-dashed border-slate-700/60 rounded-lg flex flex-col items-center justify-center text-slate-600 bg-slate-900/30 shrink-0`}
      >
        <span className={`${isSmall ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'} opacity-30`}>🃏</span>
        <span className="text-[7px] sm:text-[8px] font-pixel mt-0.5 opacity-40">VUOTO</span>
      </div>
    );
  }

  const rarityColors = {
    common: 'border-slate-400 text-slate-100 bg-slate-900',
    uncommon: 'border-emerald-400 text-emerald-100 bg-emerald-950/80',
    rare: 'border-blue-400 text-blue-100 bg-blue-950/80',
    legendary: 'border-purple-400 text-purple-100 bg-purple-950/90',
  }[joker.rarity];

  const rarityBadge = {
    common: 'bg-slate-700 text-slate-200',
    uncommon: 'bg-emerald-600 text-white',
    rare: 'bg-blue-600 text-white',
    legendary: 'bg-purple-600 text-amber-200',
  }[joker.rarity];

  // The slot is 44px wide on a phone: an emoji-sized portrait would be invisible,
  // so the illustration is the whole card face and the chrome sits on top of it.
  const artUrl = getJokerArtUrl(joker.id);

  return (
    <div className="relative group shrink-0">
      <motion.div
        animate={
          isTriggering
            ? {
                scale: [1, 1.25, 1],
                rotate: [0, -8, 8, 0],
                boxShadow: [
                  '0 0 0px rgba(251, 191, 36, 0)',
                  '0 0 25px rgba(251, 191, 36, 0.9)',
                  '0 0 0px rgba(251, 191, 36, 0)',
                ],
              }
            : {}
        }
        transition={{ duration: 0.4 }}
        onClick={() => {
          if (onClick) onClick();
          else setPinned((prev) => !prev);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          ${sizeClasses} rounded-lg border-2 pixel-box select-none cursor-pointer flex flex-col justify-between relative overflow-hidden
          ${rarityColors}
          transition-transform duration-150 hover:-translate-y-1 hover:shadow-lg
        `}
      >
        {/* Portrait, or the accent glow it replaces */}
        {artUrl ? (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <CardFaceArt src={artUrl} alt={joker.name} />
            </div>
            {/* Scrims: the badge and the name have to stay readable over the art. */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/85" />
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundColor: joker.accentColor }}
          />
        )}

        {/* Top bar: Rarity & Icon */}
        <div className="flex items-center justify-between z-10 leading-none">
          <span className={`text-[6px] sm:text-[7px] font-pixel px-0.5 sm:px-1 py-0.5 rounded font-bold uppercase ${rarityBadge}`}>
            {isSmall ? joker.rarity.slice(0, 3) : joker.rarity}
          </span>
          {!artUrl && <span className={`${isSmall ? 'text-xs' : 'text-sm'}`}>{joker.icon}</span>}
        </div>

        {/* Center: Character Portrait / Emblem */}
        {artUrl ? (
          // The art already is the portrait, so the name hugs the bottom bar
          // instead of sitting across the character's face.
          !isSmall && (
            <span className="z-10 mt-auto text-[7.5px] sm:text-[8px] font-pixel font-bold leading-tight line-clamp-1 text-center text-amber-300 [text-shadow:0_1px_2px_rgb(2_6_23)]">
              {joker.name}
            </span>
          )
        ) : (
          <div className="my-auto flex flex-col items-center justify-center z-10 text-center">
            <div className={`${isSmall ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl'} drop-shadow filter`}>
              {joker.icon}
            </div>
            {!isSmall && (
              <span className="text-[7.5px] sm:text-[8px] font-pixel font-bold leading-tight mt-0.5 line-clamp-1 text-center text-amber-300">
                {joker.name}
              </span>
            )}
          </div>
        )}

        {/* Bottom Bar: Action / Trigger Indicator */}
        <div className="z-10 flex items-center justify-between text-[7px] sm:text-[8px] font-pixel pt-0.5 border-t border-slate-700/50">
          {isShopItem ? (
            <span className="text-amber-400 font-bold">${buyCost || joker.cost}</span>
          ) : (
            <span className="text-slate-300 text-[6.5px] sm:text-[7px] truncate max-w-full">
              {joker.chipsBonus ? `+${joker.chipsBonus}C` : joker.multBonus ? `+${joker.multBonus}M` : joker.xMultBonus ? `x${joker.xMultBonus}M` : 'ABILITA'}
            </span>
          )}
        </div>
      </motion.div>

      {/* Sell / Buy Button when hovered or in shop */}
      {!isShopItem && showSellButton && onSell && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPinned(false);
            onSell();
          }}
          className={`transition-opacity absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-500 text-white font-pixel text-[7px] px-2 py-0.5 rounded shadow pixel-box whitespace-nowrap z-30 cursor-pointer ${
            isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          VENDI +${joker.sellValue}
        </button>
      )}

      {isShopItem && onBuy && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBuy();
          }}
          disabled={!canAfford}
          className={`w-full mt-1.5 py-1 px-1 rounded font-pixel text-[8px] flex items-center justify-center gap-1 pixel-box ${
            canAfford
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
          }`}
        >
          <span>ACQUISTA</span>
          <span>${buyCost || joker.cost}</span>
        </button>
      )}

      {/* Tooltip Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 border-2 border-amber-500 text-white rounded-lg pixel-box shadow-2xl z-50"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
              <span className="font-pixel text-[9px] text-amber-400 font-bold">{joker.name}</span>
              <span className={`font-pixel text-[7px] px-1 py-0.5 rounded uppercase ${rarityBadge}`}>
                {joker.rarity}
              </span>
            </div>
            <p className="text-[10px] text-slate-200 leading-relaxed font-retro mb-2">
              {joker.description}
            </p>
            {(joker.stats?.accumulatedMult || joker.stats?.accumulatedChips) && !isShopItem ? (
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                {joker.stats?.accumulatedMult ? (
                  <span className="bg-red-950 border border-red-500/70 text-red-200 font-pixel text-[8px] px-1.5 py-0.5 rounded">
                    +{joker.stats.accumulatedMult} Mult accumulati
                  </span>
                ) : null}
                {joker.stats?.accumulatedChips ? (
                  <span className="bg-blue-950 border border-blue-500/70 text-blue-200 font-pixel text-[8px] px-1.5 py-0.5 rounded">
                    +{joker.stats.accumulatedChips} Chips accumulati
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center justify-between text-[8px] font-pixel text-slate-400 pt-1 border-t border-slate-800">
              <span>{joker.italianTitle}</span>
              {!isShopItem && <span className="text-amber-300">Vendi: ${joker.sellValue}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
