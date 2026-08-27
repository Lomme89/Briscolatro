import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CardSpecial, Edition, Enhancement, PlayingCard, Seal } from '../types/game';
import { PixelCard } from './PixelCard';
import { getSpecialInfo } from '../game/specialCards';
import { getSuitDisplayName, RANK_INFO } from '../game/briscola';

interface CardUpgradeModalProps {
  /** The card as the booster proposes it. Null keeps the screen closed. */
  upgraded: PlayingCard | null;
  /** The same identity as it sits in the run deck right now. */
  current: PlayingCard | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const EDITION_LABEL: Record<Edition, string> = {
  standard: 'Nessuna',
  foil: 'Foil (+50 Chips)',
  holo: 'Olografica (+10 Mult)',
  polychrome: 'Policroma (x1.5 Mult)',
  gold: 'Dorata (+$1 giocandola)',
};

const ENHANCEMENT_LABEL: Record<Enhancement, string> = {
  none: 'Nessuno',
  bonus: 'Bonus (+30 Chips)',
  mult: 'Mult (+4 Mult)',
  wild: 'Jolly (vale come Briscola)',
  glass: 'Fragile (x2 Mult, può spezzarsi)',
  steel: 'Acciaio (x1.5 Mult in mano)',
  stone: 'Pietra (+50 Chips, senza seme)',
};

const SEAL_LABEL: Record<Seal, string> = {
  none: 'Nessuno',
  red: 'Rosso (raddoppia il punteggio della carta)',
  blue: 'Blu (può regalare una Carta Sola)',
  gold: 'Oro (+$2 quando la catturi)',
  purple: 'Viola (uno Scarto in più)',
};

function specialLabel(special: CardSpecial): string {
  const info = getSpecialInfo(special);
  return info ? info.name : 'Nessuno';
}

/** One line of the comparison: what it is now, what it becomes. */
const DiffRow: React.FC<{ label: string; before: string; after: string }> = ({
  label,
  before,
  after,
}) => {
  const changed = before !== after;
  return (
    <div className={`flex items-start gap-2 py-1 ${changed ? '' : 'opacity-45'}`}>
      <span className="font-pixel text-[7px] text-slate-500 w-16 shrink-0 pt-0.5">{label}</span>
      <span className="font-retro text-[10px] text-slate-400 flex-1 leading-tight">{before}</span>
      <span className="font-pixel text-[8px] text-slate-600 shrink-0">→</span>
      <span
        className={`font-retro text-[10px] flex-1 leading-tight ${
          changed ? 'text-amber-300 font-bold' : 'text-slate-400'
        }`}
      >
        {after}
      </span>
    </div>
  );
};

/**
 * "Potenzia la tua carta": the screen a booster card opens into.
 *
 * The deck holds the forty identities of an Italian deck and never anything
 * else, so a potenziata card is not a card you gain - it is a card you already
 * own, changed. This screen exists to make that unmistakable: your 4 di Spade
 * on the left, your 4 di Spade wearing the upgrade on the right, and every
 * modifier it would overwrite written out in between.
 */
export const CardUpgradeModal: React.FC<CardUpgradeModalProps> = ({
  upgraded,
  current,
  onConfirm,
  onCancel,
}) => {
  const open = Boolean(upgraded && current);
  const newSpecial = upgraded ? getSpecialInfo(upgraded.special) : null;
  const oldSpecial = current ? getSpecialInfo(current.special) : null;
  // A card carries one Azzardo: taking this one throws the old one away.
  const replacesSpecial = Boolean(
    newSpecial && oldSpecial && newSpecial.id !== oldSpecial.id
  );

  return (
    <AnimatePresence>
      {open && upgraded && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] bg-slate-950/95 backdrop-blur-md flex flex-col p-2 sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            className="bg-slate-900 border-3 border-amber-400 rounded-2xl pixel-box flex flex-col w-full max-w-lg mx-auto my-auto min-h-0 max-h-full overflow-hidden"
          >
            <div className="shrink-0 px-3 pt-3 pb-2 text-center border-b-2 border-slate-700">
              <h3 className="font-pixel text-[10px] sm:text-sm text-amber-300 font-bold">
                POTENZIA LA TUA CARTA
              </h3>
              <p className="font-retro text-[10px] sm:text-xs text-slate-400 mt-0.5">
                Stai trasformando il tuo {RANK_INFO[current.rank]?.name ?? current.rank} di{' '}
                {getSuitDisplayName(current.suit)}. Il mazzo resta di 40 carte.
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
              {/* The card, before and after. */}
              <div className="flex items-center justify-center gap-3 sm:gap-5">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-pixel text-[8px] text-slate-500">ORA</span>
                  <PixelCard card={current} size="pick" showBriscolaBadge={false} />
                </div>
                <div className="font-pixel text-xl sm:text-2xl text-amber-400">→</div>
                <div className="flex flex-col items-center gap-1">
                  <span className="font-pixel text-[8px] text-amber-300">DOPO</span>
                  <PixelCard card={upgraded} size="pick" showBriscolaBadge={false} />
                </div>
              </div>

              {/* The Azzardo gets its own panel: it is the half with a price. */}
              {newSpecial && (
                <div className="mt-3 border-2 border-slate-700 rounded-xl p-2.5 bg-slate-950/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`font-pixel text-[8px] px-1.5 py-0.5 rounded border ${newSpecial.className}`}
                    >
                      {newSpecial.badge}
                    </span>
                    <span className="font-pixel text-[8px] text-slate-500">AZZARDO</span>
                  </div>
                  <p className="font-retro text-[11px] text-emerald-300 leading-snug">
                    ↑ {newSpecial.bonus}
                  </p>
                  <p className="font-retro text-[11px] text-rose-300 leading-snug mt-0.5">
                    ↓ {newSpecial.cost}
                  </p>
                  <p className="font-retro text-[10px] text-slate-500 italic leading-snug mt-1.5">
                    {newSpecial.flavor}
                  </p>
                </div>
              )}

              {replacesSpecial && oldSpecial && (
                <p className="font-retro text-[10px] text-amber-400 text-center mt-2 leading-snug">
                  ⚠ Una carta porta un solo Azzardo: {newSpecial?.name} sostituisce{' '}
                  {oldSpecial.name}.
                </p>
              )}

              {/* Everything that changes, and everything that stays. */}
              <div className="mt-3 border-t border-slate-800 pt-2">
                <DiffRow
                  label="EDIZIONE"
                  before={EDITION_LABEL[current.edition]}
                  after={EDITION_LABEL[upgraded.edition]}
                />
                <DiffRow
                  label="EFFETTO"
                  before={ENHANCEMENT_LABEL[current.enhancement]}
                  after={ENHANCEMENT_LABEL[upgraded.enhancement]}
                />
                <DiffRow
                  label="SIGILLO"
                  before={SEAL_LABEL[current.seal]}
                  after={SEAL_LABEL[upgraded.seal]}
                />
                <DiffRow
                  label="AZZARDO"
                  before={specialLabel(current.special)}
                  after={specialLabel(upgraded.special)}
                />
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-t-2 border-slate-700">
              <button
                onClick={onCancel}
                className="font-pixel text-[9px] text-slate-400 hover:text-white px-3 py-2 border border-slate-700 rounded-lg pixel-box cursor-pointer"
              >
                ANNULLA
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 font-pixel text-[9px] sm:text-xs font-bold px-3 py-2 rounded-lg pixel-box bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
              >
                APPLICA MODIFICA
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
