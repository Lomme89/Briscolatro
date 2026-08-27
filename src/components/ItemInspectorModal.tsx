import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Joker, UnoCard } from '../types/game';
import { CardFaceArt, getJokerArtUrl, getUnoArtUrl } from './CardFaceArt';
import { sound } from '../services/soundEngine';

export type InspectableItem =
  | { kind: 'joker'; item: Joker }
  | { kind: 'uno'; item: UnoCard };

interface ItemInspectorModalProps {
  entry: InspectableItem | null;
  onClose: () => void;
  /** Shown as the primary action, e.g. taking the card out of a booster. */
  onConfirm?: () => void;
  confirmLabel?: string;
}

/**
 * A personaggio or a carta UNO, big, the way CardInspectorModal does it for the
 * Napoletane.
 *
 * The slots carry a hover tooltip for the table, but a booster is a grid of
 * eight cards on a phone: the tooltips landed on top of each other and covered
 * the very cards you were choosing between. In a picker the slots hand the tap
 * here instead, where there is room for the whole illustration and the full
 * text.
 */
export const ItemInspectorModal: React.FC<ItemInspectorModalProps> = ({
  entry,
  onClose,
  onConfirm,
  confirmLabel = 'SCEGLI',
}) => {
  useEffect(() => {
    if (!entry) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, onClose]);

  const isJoker = entry?.kind === 'joker';
  const artUrl = entry
    ? isJoker
      ? getJokerArtUrl(entry.item.id)
      : getUnoArtUrl(entry.item.id)
    : undefined;

  const badge = !entry
    ? ''
    : isJoker
      ? (entry.item as Joker).rarity
      : 'Carta UNO';

  // Only the personaggi have a second name worth printing; repeating a UNO
  // card's own title under itself said nothing.
  const footnote = entry && isJoker ? (entry.item as Joker).italianTitle : '';

  return (
    <AnimatePresence>
      {entry && (
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
            className={`bg-slate-900 border-3 rounded-2xl pixel-box shadow-2xl w-full max-w-xs max-h-[92dvh] overflow-y-auto custom-scrollbar p-4 flex flex-col items-center gap-2.5 ${
              isJoker ? 'border-amber-400' : 'border-red-500'
            }`}
          >
            <div
              className={`w-28 h-38 rounded-lg overflow-hidden border-2 pixel-box flex items-center justify-center bg-slate-950 ${
                isJoker ? 'border-amber-500/60' : 'border-red-500/60'
              }`}
            >
              {artUrl ? (
                <CardFaceArt src={artUrl} alt={entry.item.name} />
              ) : (
                <span className="text-4xl">{entry.item.icon}</span>
              )}
            </div>

            <div className="text-center">
              <h3
                className={`font-pixel text-xs sm:text-sm font-bold ${
                  isJoker ? 'text-amber-300' : 'text-red-300'
                }`}
              >
                {entry.item.name}
              </h3>
              <span
                className={`inline-block font-pixel text-[7.5px] px-2 py-0.5 rounded uppercase mt-1 border ${
                  isJoker
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-red-600/20 text-red-300 border-red-500/40'
                }`}
              >
                {badge}
              </span>
            </div>

            <p className="font-retro text-[11px] sm:text-xs text-slate-200 leading-relaxed text-center">
              {entry.item.description}
            </p>

            {footnote && (
              <span className="font-retro text-[10px] text-slate-500 italic text-center">
                {footnote}
              </span>
            )}

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
