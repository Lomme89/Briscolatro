import React from 'react';
import { motion } from 'motion/react';
import { ENDLESS_TIERS } from '../game/endless';

interface EndlessOfferModalProps {
  isOpen: boolean;
  /** Where the run would resume: the first Endless Ante. */
  nextAnte: number;
  totalScore: number;
  onClose: () => void;
  onDouble: () => void;
}

/**
 * The question, asked only after the tournament is already won.
 *
 * Nothing on this screen is a condition of the victory: the win, the unlock and
 * the record were all written the moment the Sovrano fell. This only asks
 * whether to cash out or leave the money on the table, and it says plainly that
 * losing later costs the Endless run and not the trophy.
 */
export const EndlessOfferModal: React.FC<EndlessOfferModalProps> = ({
  isOpen,
  nextAnte,
  totalScore,
  onClose,
  onDouble,
}) => {
  if (!isOpen) return null;
  const firstTier = ENDLESS_TIERS[0];

  return (
    <div className="mobile-dialog fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 340 }}
        className="bg-slate-900 border-3 border-amber-400 rounded-2xl pixel-box max-w-lg w-full p-4 sm:p-6 shadow-2xl shadow-amber-500/10 text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        <div className="text-center pb-3 mb-3 border-b border-slate-800">
          <div className="text-3xl sm:text-4xl mb-1">👑 🏆 👑</div>
          <h2 className="font-pixel text-base sm:text-lg text-amber-400 font-bold uppercase tracking-wider">
            TORNEO VINTO
          </h2>
          <div className="inline-block mt-1.5 px-3 py-0.5 rounded-full font-pixel text-[9px] sm:text-[10px] border font-bold bg-emerald-950/80 border-emerald-500 text-emerald-300">
            VITTORIA REGISTRATA ✓
          </div>
          <p className="font-retro text-xs text-slate-300 mt-2 max-w-sm mx-auto">
            Hai chiuso tutti e 8 gli Ante. Il titolo e&apos; tuo e nessuno te lo toglie
            piu&apos;: {totalScore.toLocaleString()} Chips messi a referto.
          </p>
        </div>

        <div className="bg-slate-950/70 border border-amber-700/70 rounded-xl p-3 mb-4">
          <p className="font-retro text-xs sm:text-sm text-amber-100 leading-relaxed">
            Il barista pulisce il tavolo e non se ne va. «Uno in piu&apos;? Da qui in poi
            si sale: <span className="text-amber-300 font-bold">ANTE {nextAnte} · {firstTier.name}</span>.»
          </p>
          <p className="font-retro text-[11px] text-slate-400 mt-2">
            Se cadi in Endless perdi solo la posta. La vittoria del torneo resta scritta.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-slate-100 font-pixel text-[10px] sm:text-xs font-bold px-4 rounded-xl pixel-box cursor-pointer transition-all active:scale-95"
          >
            CHIUDI LA PARTITA
          </button>
          <button
            onClick={onDouble}
            className="flex-1 min-h-[48px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-pixel text-[10px] sm:text-xs font-bold px-4 rounded-xl pixel-box shadow-lg cursor-pointer transition-all active:scale-95"
          >
            RADDOPPIA LA POSTA
          </button>
        </div>
      </motion.div>
    </div>
  );
};
