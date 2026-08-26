import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { UnoCard } from '../types/game';
import { UnoCardSlot } from './UnoCardSlot';

interface UnoConfirmModalProps {
  unoCard: UnoCard | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * A UNO card is consumed the moment it is used, and several of them change the
 * Briscola or the contents of your hand - so it says what it is about to do and
 * waits for a yes. Tapping one used to fire it immediately.
 */
export const UnoConfirmModal: React.FC<UnoConfirmModalProps> = ({
  unoCard,
  onCancel,
  onConfirm,
}) => {
  const needsTarget = unoCard?.targetType === 'card_in_hand';

  return (
    <AnimatePresence>
      {unoCard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.93, y: 10, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-slate-900 border-3 border-red-500 rounded-2xl pixel-box shadow-2xl w-full max-w-xs p-4 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2 self-start">
              <span className="bg-red-600 text-white font-pixel text-[8px] px-1.5 py-0.5 rounded font-bold">
                UNO
              </span>
              <span className="font-pixel text-[10px] sm:text-xs text-red-300 font-bold">
                Usare questa carta?
              </span>
            </div>

            <div className="flex items-start gap-3 w-full">
              <div className="shrink-0">
                <UnoCardSlot unoCard={unoCard} canUse={false} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-pixel text-[10px] text-amber-300 font-bold leading-tight">
                  {unoCard.name}
                </div>
                <p className="font-retro text-[11px] text-slate-200 leading-snug mt-1">
                  {unoCard.description}
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 font-retro text-[10.5px] text-slate-400">
              {needsTarget
                ? 'Dopo la conferma tocca una carta della tua mano per applicarla.'
                : 'Ha effetto subito e la carta viene consumata.'}
            </div>

            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-[10px] py-2.5 rounded-xl pixel-box cursor-pointer"
              >
                ANNULLA
              </button>
              <button
                type="button"
                onClick={onConfirm}
                data-testid="uno-confirm"
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 text-white font-pixel text-[10px] font-bold py-2.5 rounded-xl pixel-box shadow cursor-pointer"
              >
                {needsTarget ? 'SCEGLI CARTA' : 'USA'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
