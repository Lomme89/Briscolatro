import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CardStyle, PlayingCard } from '../types/game';
import { getSuitDisplayName, RANK_INFO } from '../game/briscola';
import { PixelSuitIcon } from './PixelSuitIcon';
import { NeapolitanCardIllustration } from './NeapolitanCardIllustration';
import { CARD_PAPER, getCardArtUrl, NeapolitanCardArt } from './NeapolitanCardArt';
import { getCardStyleDefinition } from '../data/cardStyles';
import { PICKER_CARD_BOX } from './cardSizing';
import { useCardChips } from '../context/CardChipsContext';
import { SPECIAL_INFO } from '../game/specialCards';
import { CARD_POWER_VALUES as V } from '../data/cardPowers';

const ENHANCEMENT_BADGES: Record<
  Exclude<PlayingCard['enhancement'], 'none'>,
  { label: string; title: string; className: string }
> = {
  bonus: { label: `+${V.bonusChips}`, title: `Bonus: +${V.bonusChips} Chips`, className: 'bg-sky-600 text-white border-sky-300' },
  mult: { label: `+${V.multBonus}x`, title: `Mult: +${V.multBonus} Mult`, className: 'bg-red-600 text-white border-red-300' },
  wild: { label: 'JOLLY', title: 'Wild: vale sempre come Briscola', className: 'bg-fuchsia-600 text-white border-fuchsia-300' },
  steel: { label: `X${V.steelXMult}`, title: `Acciaio: x${V.steelXMult} Mult mentre resta in mano`, className: 'bg-slate-400 text-slate-900 border-slate-200' },
  stone: { label: 'PIETRA', title: `Pietra: +${V.stoneChips} Chips, nessun seme`, className: 'bg-stone-500 text-white border-stone-300' },
};

interface PixelCardProps {
  card: PlayingCard | null | undefined;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'pick' | 'md' | 'lg';
  isBriscola?: boolean;
  /** The floating "BRISCOLA" ribbon overflows the card; hide it in tight spots. */
  showBriscolaBadge?: boolean;
  showPoints?: boolean;
  /** Overrides the setting, e.g. the title screen where nothing is at stake. */
  showChips?: boolean;
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
  showBriscolaBadge = true,
  showPoints = true,
  showChips,
  className = '',
  animateDeal = false,
  dealDelay = 0,
  layoutId,
  style,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const activeStyleId = style || 'classic';
  const chipsEnabled = useCardChips();
  const chipsVisible = showChips ?? chipsEnabled;
  const styleDef = getCardStyleDefinition(activeStyleId);

  // A missing card used to crash the whole table: the face-down deck stack was
  // rendered from playerHand[0], which is empty once the last cards are played.
  if (!card) return null;

  const info = RANK_INFO[card.rank] || {
    name: `Carta ${card.rank}`,
    shortName: `${card.rank}`,
    points: card.points,
    description: '',
  };

  // Card dimensions based on size with generous, readable hand dimensions
  const sizeClasses = {
    xs: 'w-11 sm:w-13 h-16 sm:h-18 text-[8px] sm:text-[9px]',
    pick: `${PICKER_CARD_BOX} text-[9px] sm:text-[10px]`,
    sm: 'w-14 sm:w-18 h-20 sm:h-26 text-[9px] sm:text-xs',
    md: 'w-20 sm:w-24 md:w-26 h-28 sm:h-34 md:h-38 text-xs sm:text-sm',
    lg: 'w-[96px] sm:w-[114px] md:w-[128px] lg:w-[140px] h-[138px] sm:h-[164px] md:h-[184px] lg:h-[200px] text-xs sm:text-sm',
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

  // The finished Neapolitan deck is the face of a classic card: it carries its
  // own background, border and figures, so the procedural drawing and the corner
  // indices step aside for it.
  const artUrl = getCardArtUrl(card.suit, card.rank);
  const usesFullArt = activeStyleId === 'classic' && Boolean(artUrl);

  // Center Content: Authentic Neapolitan Card Illustration
  const renderCenterContent = () => {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <NeapolitanCardIllustration
          rank={card.rank}
          suit={card.suit}
          style={activeStyleId}
        />
      </div>
    );
  };

  // Face Down Back
  if (faceDown) {
    return (
      <motion.div
        layoutId={layoutId}
        // Face-down cards are dealt, and dealing happens from the stock: they
        // come in from its side rather than dropping out of nowhere.
        initial={animateDeal ? { scale: 0.45, x: -130, y: 44, opacity: 0, rotate: -34 } : false}
        animate={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0 }}
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
          {/* No "BRISCOLA" on the back: next to the real trump indicator it reads
              as if every face-down card were a Briscola. */}
          <span className={`${styleDef.cardBackText} font-pixel text-[6px] sm:text-[7.5px] font-bold tracking-tight leading-none truncate max-w-full`}>
            {activeStyleId === 'neo_noir' ? 'NOIR' : activeStyleId === 'neon_cyber' ? 'CYBER' : '★'}
          </span>
        </div>
      </motion.div>
    );
  }

  const cornerSuitSize =
    size === 'lg' ? 15 : size === 'md' ? 12 : size === 'sm' || size === 'pick' ? 10 : 8;

  const artPadding = {
    xs: 'p-[4px]',
    sm: 'p-[5px]',
    pick: 'p-[5px]',
    md: 'p-[7px]',
    lg: 'p-[9px] sm:p-[11px]',
  }[size];

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

      {/* The painted face, edge to edge */}
      {usesFullArt && (
        <div
          className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
          style={{ backgroundColor: CARD_PAPER }}
        >
          {/* A printed card keeps a margin of paper around the figure, and the
              margin is where the index lives: too little of it and the rank
              lands on the figure. Scaled by card size, so a thumbnail does not
              lose half its art to padding. */}
          <div className={`w-full h-full ${artPadding}`}>
            <NeapolitanCardArt
              suit={card.suit}
              rank={card.rank}
              alt={`${info.name} di ${getSuitDisplayName(card.suit)}`}
            />
          </div>
        </div>
      )}

      {/* Foil / Shimmer Overlay */}
      {card.edition !== 'standard' && (
        <div className={`absolute inset-0 ${styleDef.shimmerBlendClass} pointer-events-none rounded-md`} />
      )}

      {/* Briscola Badge Header */}
      {isBriscola && showBriscolaBadge && (
        // No stars: with a large system font the ribbon grew wider than the card
        // and collided with the neighbouring one.
        <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 font-pixel text-[6.5px] sm:text-[7.5px] px-1 py-0.5 rounded shadow pixel-box z-20 whitespace-nowrap max-w-full ${styleDef.briscolaBadgeClass}`}>
          BRISCOLA
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
              🎴
            </span>
          )}
          {card.seal === 'purple' && (
            <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[8px] font-pixel shadow border border-purple-300">
              🔄
            </span>
          )}
        </div>
      )}

      {/* Enhancement badge: a card you built has to be readable at a glance.
          Bottom-right, because the rank chip owns the top-left and the seal pin
          the top-right. */}
      {card.enhancement !== 'none' && (
        <div
          className={`absolute -bottom-1.5 -right-1.5 z-20 px-1 py-0.5 rounded font-pixel text-[6px] sm:text-[7px] font-bold shadow border ${ENHANCEMENT_BADGES[card.enhancement].className}`}
          title={ENHANCEMENT_BADGES[card.enhancement].title}
        >
          {ENHANCEMENT_BADGES[card.enhancement].label}
        </div>
      )}

      {/* Azzardo badge: the modifier with a price on it, so it gets the top
          edge to itself rather than sharing a corner with the pure upside. */}
      {card.special !== 'none' && (
        <div
          className={`absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 px-1 py-0.5 rounded font-pixel text-[6px] sm:text-[7px] font-bold shadow border whitespace-nowrap ${SPECIAL_INFO[card.special].className}`}
          title={`${SPECIAL_INFO[card.special].bonus} - ${SPECIAL_INFO[card.special].cost}`}
        >
          {SPECIAL_INFO[card.special].badge}
        </div>
      )}

      {/* Card Content Container. Over the finished art only the things the art
          cannot know are drawn: the rank chip you scan a hand by, and the point
          value the game runs on. */}
      <div className="relative z-10 w-full h-full p-1 sm:p-1.5 flex flex-col justify-between">
        {usesFullArt ? (
          <div className="flex items-start justify-start pointer-events-none">
            {chipsVisible && (
              // The index of a real card: rank, and the suit under it, printed
              // straight on the paper. No pill, no frame - a box around it read
              // as a sticker someone put on the card.
              <div className="flex flex-col items-start leading-none">
                <span
                  className={`font-pixel font-bold text-[10px] sm:text-xs md:text-sm ${styleDef.rankTextColor} tracking-tighter`}
                  style={{ textShadow: '0 1px 2px rgba(245,244,232,0.95)' }}
                >
                  {info.shortName}
                </span>
                <div className="mt-0.5">
                  <PixelSuitIcon suit={card.suit} style={activeStyleId} size={cornerSuitSize} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Top-Left Corner Index */}
            <div className="flex flex-col items-start leading-none pointer-events-none">
              <span className={`font-pixel font-bold text-[10px] sm:text-xs md:text-sm ${styleDef.rankTextColor} tracking-tighter`}>
                {info.shortName}
              </span>
              <div className="mt-0.5">
                <PixelSuitIcon suit={card.suit} style={activeStyleId} size={cornerSuitSize} />
              </div>
            </div>

            {/* Center Illustration */}
            <div className="my-auto flex items-center justify-center py-0.5 w-full flex-1 min-h-0 pointer-events-none">
              {renderCenterContent()}
            </div>
          </>
        )}

        {/* Bottom Bar: Points and Inverted Index */}
        <div className="flex items-end justify-between leading-none pointer-events-none">
          {showPoints && chipsVisible ? (
            <div className="flex items-center">
              {usesFullArt ? (
                <span
                  className={`font-pixel text-[7px] sm:text-[8px] md:text-[9px] font-bold ${
                    info.points > 0 ? '' : 'opacity-60'
                  }`}
                  style={{
                    color: info.points > 0 ? '#7c2d12' : '#64748b',
                    textShadow: '0 1px 2px rgba(245,244,232,0.95)',
                  }}
                >
                  {info.points} PT CARTA
                </span>
              ) : info.points > 0 ? (
                <span className={`font-pixel text-[7px] sm:text-[8px] md:text-[9px] px-1 py-0.5 rounded shadow-xs font-bold ${styleDef.pointsBadgeClass}`}>
                  {info.points} PT CARTA
                </span>
              ) : (
                <span className="font-pixel text-[6px] sm:text-[7px] text-slate-400 opacity-60">0 PT CARTA</span>
              )}
            </div>
          ) : <div />}

          {!usesFullArt && (
            <div className="flex flex-col items-end rotate-180">
              <span className={`font-pixel font-bold text-[10px] sm:text-xs md:text-sm ${styleDef.rankTextColor} tracking-tighter`}>
                {info.shortName}
              </span>
              <div className="mt-0.5">
                <PixelSuitIcon suit={card.suit} style={activeStyleId} size={cornerSuitSize} />
              </div>
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
};

