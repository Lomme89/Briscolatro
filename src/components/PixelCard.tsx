import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CardStyle, PlayingCard } from '../types/game';
import { RANK_INFO } from '../data/cards';
import { PixelSuitIcon } from './PixelSuitIcon';
import { useCardStyle } from '../context/CardStyleContext';
import { getCardStyleDefinition } from '../data/cardStyles';

interface PixelCardProps {
  card: PlayingCard;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isBriscola?: boolean;
  showPoints?: boolean;
  className?: string;
  animateDeal?: boolean;
  dealDelay?: number;
  layoutId?: string;
  style?: CardStyle;
}

export const PixelCard: React.FC<PixelCardProps> = ({
  card,
  onClick,
  selected = false,
  disabled = false,
  faceDown = false,
  size = 'md',
  isBriscola = false,
  showPoints = true,
  className = '',
  animateDeal = false,
  dealDelay = 0,
  layoutId,
  style,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const globalStyle = useCardStyle();
  const activeStyleId = style || globalStyle || 'classic';
  const styleDef = getCardStyleDefinition(activeStyleId);

  const info = RANK_INFO[card.rank] || {
    name: `Carta ${card.rank}`,
    shortName: `${card.rank}`,
    points: card.points,
    description: '',
  };

  // Card dimensions based on size with standard Tailwind classes
  const sizeClasses = {
    xs: 'w-11 sm:w-13 h-16 sm:h-18 text-[8px] sm:text-[9px]',
    sm: 'w-14 sm:w-18 h-20 sm:h-26 text-[9px] sm:text-xs',
    md: 'w-20 sm:w-24 md:w-26 h-28 sm:h-34 md:h-38 text-xs sm:text-sm',
    lg: 'w-[84px] sm:w-[96px] md:w-[108px] h-[120px] sm:h-[136px] md:h-[152px] text-xs sm:text-sm',
  }[size];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || faceDown) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / (rect.height / 2)) * -12,
      y: (x / (rect.width / 2)) * 12,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // Edition overlay classes
  const getEditionClass = () => {
    switch (card.edition) {
      case 'foil':
        return 'foil-card';
      case 'holo':
        return 'holographic-card';
      case 'polychrome':
        return 'polychrome-card';
      case 'gold':
        return 'gold-foil-card';
      default:
        return '';
    }
  };

  // Render Rank Center Illustration with Style Variations
  const renderCenterContent = () => {
    const iconSize = size === 'lg' ? 24 : size === 'md' ? 18 : size === 'sm' ? 14 : 10;

    if (card.rank === 1) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <PixelSuitIcon
              suit={card.suit}
              style={activeStyleId}
              size={size === 'lg' ? 36 : size === 'md' ? 26 : size === 'sm' ? 20 : 14}
            />
            <div className="absolute -top-1 -right-1 text-[8px] sm:text-[10px]">
              {activeStyleId === 'neo_noir' ? '🩸' : activeStyleId === 'neon_cyber' ? '⚡' : '✨'}
            </div>
          </div>
          <span className={`text-[8px] sm:text-[9px] font-pixel mt-0.5 uppercase tracking-wider font-bold ${styleDef.accentColors.asso}`}>
            ASSO
          </span>
        </div>
      );
    }

    if (card.rank === 3) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <PixelSuitIcon suit={card.suit} style={activeStyleId} size={iconSize} />
          <div className="flex gap-1">
            <PixelSuitIcon suit={card.suit} style={activeStyleId} size={Math.max(8, iconSize - 3)} />
            <PixelSuitIcon suit={card.suit} style={activeStyleId} size={Math.max(8, iconSize - 3)} />
          </div>
        </div>
      );
    }

    if (card.rank === 10) {
      return (
        <div className="flex flex-col items-center text-center">
          <span className="text-sm sm:text-base leading-none">
            {activeStyleId === 'neo_noir' ? '👑' : activeStyleId === 'neon_cyber' ? '👑' : '👑'}
          </span>
          <PixelSuitIcon suit={card.suit} style={activeStyleId} size={iconSize} />
          <span className={`text-[7.5px] sm:text-[8px] font-pixel font-bold mt-0.5 ${styleDef.accentColors.re}`}>
            RE
          </span>
        </div>
      );
    }

    if (card.rank === 9) {
      return (
        <div className="flex flex-col items-center text-center">
          <span className="text-xs sm:text-sm leading-none">
            {activeStyleId === 'neo_noir' ? '♟️' : activeStyleId === 'neon_cyber' ? '🛸' : '🐎'}
          </span>
          <PixelSuitIcon suit={card.suit} style={activeStyleId} size={iconSize} />
          <span className={`text-[7.5px] sm:text-[8px] font-pixel font-bold mt-0.5 ${styleDef.accentColors.cav}`}>
            CAV
          </span>
        </div>
      );
    }

    if (card.rank === 8) {
      return (
        <div className="flex flex-col items-center text-center">
          <span className="text-xs sm:text-sm leading-none">
            {activeStyleId === 'neo_noir' ? '🗡️' : activeStyleId === 'neon_cyber' ? '💾' : '🛡️'}
          </span>
          <PixelSuitIcon suit={card.suit} style={activeStyleId} size={iconSize} />
          <span className={`text-[7.5px] sm:text-[8px] font-pixel font-bold mt-0.5 ${styleDef.accentColors.fan}`}>
            FAN
          </span>
        </div>
      );
    }

    // Default numeric suits (2, 4, 5, 6, 7)
    const iconCount = Math.min(card.rank, 4);
    return (
      <div className="grid grid-cols-2 gap-0.5 sm:gap-1 items-center justify-center">
        {Array.from({ length: iconCount }).map((_, i) => (
          <PixelSuitIcon
            key={i}
            suit={card.suit}
            style={activeStyleId}
            size={Math.max(9, iconSize - 4)}
          />
        ))}
      </div>
    );
  };

  // Face Down Back
  if (faceDown) {
    return (
      <motion.div
        layoutId={layoutId}
        initial={animateDeal ? { scale: 0.3, y: -60, opacity: 0, rotate: -15 } : false}
        animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300, delay: dealDelay }}
        className={`${sizeClasses} ${styleDef.cardBackBg} rounded-lg pixel-box flex flex-col items-center justify-center relative overflow-hidden select-none cursor-not-allowed shadow-md ${className}`}
      >
        <div className={`absolute inset-0.5 sm:inset-1 border border-dashed rounded flex flex-col items-center justify-center ${styleDef.cardBackInner} p-0.5 text-center`}>
          <div className="grid grid-cols-2 gap-0.5 opacity-80 leading-none mb-0.5">
            {styleDef.cardBackIcons.map((ic, idx) => (
              <span key={idx} className="text-[8px] sm:text-[10px]">
                {ic}
              </span>
            ))}
          </div>
          <span className={`${styleDef.cardBackText} font-pixel text-[6px] sm:text-[7.5px] font-bold tracking-tight leading-none truncate max-w-full`}>
            {activeStyleId === 'neo_noir' ? 'NOIR' : activeStyleId === 'neon_cyber' ? 'CYBER' : 'BRISCOLA'}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      initial={animateDeal ? { scale: 0.4, y: 70, opacity: 0, rotate: -8 } : false}
      animate={{
        scale: selected ? 1.08 : isHovered ? 1.04 : 1,
        y: selected ? -18 : 0,
        rotateX: tilt.x,
        rotateY: tilt.y,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 24, delay: dealDelay }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={disabled ? undefined : onClick}
      style={{
        transformPerspective: 800,
        transformStyle: 'preserve-3d',
      }}
      className={`
        ${sizeClasses}
        relative select-none cursor-pointer rounded-lg pixel-box
        ${styleDef.cardBgClass} border-2
        ${selected ? styleDef.cardSelectedRing : styleDef.cardBorderClass}
        ${isBriscola ? 'ring-2 ring-orange-500/90 shadow-md shadow-orange-500/40' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-xl active:scale-98'}
        ${getEditionClass()}
        ${className}
      `}
    >
      {/* Background card texture */}
      <div className={`absolute inset-0 ${styleDef.cardInnerBg} rounded-md overflow-hidden pointer-events-none`} />

      {/* Foil / Shimmer Overlay */}
      {card.edition !== 'standard' && (
        <div className={`absolute inset-0 ${styleDef.shimmerBlendClass} pointer-events-none rounded-md`} />
      )}

      {/* Briscola Badge Header */}
      {isBriscola && (
        <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 font-pixel text-[6.5px] sm:text-[7.5px] px-1.5 py-0.5 rounded shadow pixel-box z-20 whitespace-nowrap ${styleDef.briscolaBadgeClass}`}>
          ★ BRISCOLA ★
        </div>
      )}

      {/* Seal pin */}
      {card.seal !== 'none' && (
        <div className="absolute -top-1.5 -right-1.5 z-20">
          {card.seal === 'red' && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-pixel shadow border border-red-300">
              🔴
            </span>
          )}
          {card.seal === 'gold' && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-[8px] font-pixel shadow border border-amber-200 font-bold">
              $
            </span>
          )}
          {card.seal === 'blue' && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-pixel shadow border border-blue-300">
              🔮
            </span>
          )}
        </div>
      )}

      {/* Card Content Container */}
      <div className="relative z-10 w-full h-full p-1 sm:p-1.5 flex flex-col justify-between">
        {/* Top-Left Corner Index */}
        <div className="flex flex-col items-start leading-none">
          <span className={`font-pixel font-bold text-[10px] sm:text-xs ${styleDef.rankTextColor} tracking-tighter`}>
            {info.shortName}
          </span>
          <div className="mt-0.5">
            <PixelSuitIcon suit={card.suit} style={activeStyleId} size={size === 'lg' ? 14 : size === 'md' ? 11 : 9} />
          </div>
        </div>

        {/* Center Illustration */}
        <div className="my-auto flex items-center justify-center py-0.5">
          {renderCenterContent()}
        </div>

        {/* Bottom Bar: Points and Inverted Index */}
        <div className="flex items-end justify-between leading-none">
          {showPoints ? (
            <div className="flex items-center">
              {info.points > 0 ? (
                <span className={`font-pixel text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded shadow-xs font-bold ${styleDef.pointsBadgeClass}`}>
                  {info.points}pt
                </span>
              ) : (
                <span className="font-pixel text-[7px] text-slate-400 opacity-60">
                  0pt
                </span>
              )}
            </div>
          ) : <div />}

          {/* Bottom-Right Inverted Corner */}
          <div className="flex flex-col items-end rotate-180">
            <span className={`font-pixel font-bold text-[10px] sm:text-xs ${styleDef.rankTextColor} tracking-tighter`}>
              {info.shortName}
            </span>
            <div className="mt-0.5">
              <PixelSuitIcon suit={card.suit} style={activeStyleId} size={size === 'lg' ? 14 : size === 'md' ? 11 : 9} />
            </div>
          </div>
        </div>
      </div>

      {/* Card Enhancement Ribbon / Label */}
      {card.enhancement !== 'none' && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 text-[6.5px] sm:text-[7.5px] font-pixel text-center py-0.5 text-cyan-300 rounded-b-md">
          {card.enhancement.toUpperCase()}
        </div>
      )}
    </motion.div>
  );
};
