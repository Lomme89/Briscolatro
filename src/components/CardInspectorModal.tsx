import React, { useEffect } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { PlayingCard } from '../types/game';
import { PixelCard } from './PixelCard';
import { getCardPowers } from '../data/cardPowers';
import { RANK_INFO, getSuitDisplayName } from '../game/briscola';
import { sound } from '../services/soundEngine';

interface CardInspectorModalProps {
  card: PlayingCard | null;
  onClose: () => void;
  /** Shown as the primary action, e.g. taking the card from a booster. */
  onConfirm?: () => void;
  confirmLabel?: string;
}

/**
 * A card, big, in your hands.
 *
 * Booster cards are picked at thumbnail size, where a seal is four pixels and a
 * modifier is a two-letter badge - so the card opens here first, at a size where
 * the artwork reads and every power it carries is spelled out.
 *
 * Dragging tilts it: the pointer drives rotation on both axes through springs,
 * and letting go lets it settle back. It is the one flourish on the screen, so
 * it is the one that gets the physics.
 */
export const CardInspectorModal: React.FC<CardInspectorModalProps> = ({
  card,
  onClose,
  onConfirm,
  confirmLabel = 'SCEGLI',
}) => {
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const rotateY = useSpring(useTransform(dragX, [-160, 160], [-32, 32]), {
    stiffness: 180,
    damping: 16,
  });
  const rotateX = useSpring(useTransform(dragY, [-160, 160], [24, -24]), {
    stiffness: 180,
    damping: 16,
  });
  // The sheen slides across as the card turns, the way light would.
  const sheenX = useTransform(rotateY, [-32, 32], ['120%', '-20%']);

  useEffect(() => {
    if (!card) {
      dragX.set(0);
      dragY.set(0);
    }
  }, [card, dragX, dragY]);

  useEffect(() => {
    if (!card) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, onClose]);

  const powers = card ? getCardPowers(card) : [];
  const info = card ? RANK_INFO[card.rank] : null;

  return (
    <AnimatePresence>
      {card && info && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-slate-900 border-3 border-amber-400 rounded-2xl pixel-box shadow-2xl w-full max-w-sm max-h-[92dvh] overflow-y-auto custom-scrollbar p-4 flex flex-col items-center gap-3"
          >
            {/* The card itself, tilting under the finger */}
            {/* The scale is a transform, so the row has to reserve the height
                itself or the card hangs out of the top of the panel. */}
            <div
              style={{ perspective: 900 }}
              className="touch-none h-[220px] sm:h-[250px] w-full flex items-center justify-center"
            >
              <motion.div
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.55}
                dragMomentum={false}
                style={{ x: dragX, y: dragY, rotateX, rotateY, transformStyle: 'preserve-3d' }}
                whileTap={{ cursor: 'grabbing' }}
                animate={{ y: [0, -6, 0] }}
                transition={{ y: { repeat: Infinity, duration: 3.6, ease: 'easeInOut' } }}
                className="cursor-grab relative scale-[1.5] origin-center"
              >
                <PixelCard card={card} size="lg" showPoints={true} />
                <motion.div
                  style={{ x: sheenX }}
                  className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-transparent via-white/25 to-transparent w-1/2"
                />
              </motion.div>
            </div>

            <span className="font-pixel text-[7.5px] text-slate-500 uppercase tracking-wide">
              Trascina per girarla
            </span>

            {/* Identity */}
            <div className="text-center">
              <h3 className="font-pixel text-xs sm:text-sm text-amber-300 font-bold">
                {info.name} di {getSuitDisplayName(card.suit)}
              </h3>
              <p className="font-retro text-[11px] text-slate-400 mt-0.5">
                Vale {info.points} punti Briscola · {info.points * 3 + 20} Chips base
              </p>
            </div>

            {/* What it does */}
            <div className="w-full flex flex-col gap-1.5">
              {powers.length === 0 ? (
                <p className="font-retro text-[11px] text-slate-400 text-center bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2">
                  Carta liscia, nessun potenziamento. Vale per i suoi punti e per il seme.
                </p>
              ) : (
                powers.map((power) => (
                  <div
                    key={power.label}
                    className={`border rounded-lg px-2.5 py-1.5 ${power.className}`}
                  >
                    <div className="font-pixel text-[9px] font-bold uppercase">{power.label}</div>
                    <div className="font-retro text-[11px] leading-snug mt-0.5 opacity-90">
                      {power.description}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="w-full flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-[10px] py-2.5 rounded-xl pixel-box cursor-pointer"
              >
                CHIUDI
              </button>
              {onConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playCashChime();
                    onConfirm();
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 font-pixel text-[10px] font-bold py-2.5 rounded-xl pixel-box shadow cursor-pointer"
                >
                  {confirmLabel}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
