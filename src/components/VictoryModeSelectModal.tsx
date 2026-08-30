import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ALL_VICTORY_MODES, VictoryMode, VictoryModeInfo } from '../game/victoryModes';
import { DeckDefinition } from '../types/game';
import { sound } from '../services/soundEngine';

interface VictoryModeSelectModalProps {
  isOpen: boolean;
  /** The deck already chosen, shown so the player knows where they are. */
  deck: DeckDefinition | null;
  /** Best total score per mode, so a record has somewhere to be seen. */
  highScores: Record<VictoryMode, number>;
  onBack: () => void;
  onSelect: (mode: VictoryMode) => void;
}

/** The requirement, drawn the way the blind screen will draw it. */
const Requirement: React.FC<{ info: VictoryModeInfo }> = ({ info }) => {
  const chips = <span className="text-amber-300">TARGET CHIPS</span>;
  const briscola = <span className="text-emerald-300">61 PUNTI BRISCOLA</span>;

  if (!info.needsChips) return <>{briscola}</>;
  if (!info.needsBriscola) return <>{chips}</>;
  return (
    <>
      {chips}
      <span className="text-slate-500 px-1">{info.eitherIsEnough ? 'OPPURE' : 'E'}</span>
      {briscola}
    </>
  );
};

/**
 * "Come si vince questo tavolo": the step between picking a deck and sitting
 * down.
 *
 * The four are not a difficulty slider and are deliberately not labelled like
 * one. Briscolatro asks for the Chips target, Briscola asks for sixty-one of
 * the hundred and twenty points, and those are different games that happen to
 * share a table - a measured run shows a policy that plays proper Briscola
 * taking the round far more often while scoring less.
 *
 * One column on a phone. Four cards side by side at this width would be four
 * unreadable cards.
 */
export const VictoryModeSelectModal: React.FC<VictoryModeSelectModalProps> = ({
  isOpen,
  deck,
  highScores,
  onBack,
  onSelect,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-2 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.94, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 16 }}
          className="bg-slate-900 border-3 border-amber-400 rounded-2xl pixel-box flex flex-col w-full max-w-lg mx-auto my-auto min-h-0 max-h-full overflow-hidden"
        >
          <div className="shrink-0 px-3 pt-3 pb-2 text-center border-b-2 border-slate-700">
            <h3 className="font-pixel text-[10px] sm:text-sm text-amber-300 font-bold">
              COME SI VINCE IL TAVOLO
            </h3>
            <p className="font-retro text-[10px] sm:text-xs text-slate-400 mt-0.5">
              {deck ? `${deck.icon} ${deck.name}` : 'Scegli la regola della run'}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5 flex flex-col gap-2">
            {ALL_VICTORY_MODES.map((info) => (
              <button
                key={info.id}
                onClick={() => {
                  sound.playCardSelect();
                  onSelect(info.id);
                }}
                className="text-left bg-slate-950/70 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 rounded-xl pixel-box px-3 py-2.5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-pixel text-[10px] sm:text-xs text-white font-bold uppercase">
                    {info.label}
                  </span>
                  <span
                    className={`font-pixel text-[6.5px] sm:text-[7.5px] px-1.5 py-0.5 rounded border ${info.badgeClass}`}
                  >
                    {info.badge}
                  </span>
                  {highScores[info.id] > 0 && (
                    <span className="font-retro text-[9px] text-slate-500 ml-auto">
                      record {highScores[info.id].toLocaleString('it-IT')}
                    </span>
                  )}
                </div>
                <p className="font-retro text-[11px] text-slate-300 mt-1 leading-snug">
                  {info.description}
                </p>
                <div className="font-pixel text-[7px] sm:text-[8px] mt-1.5 flex items-center flex-wrap">
                  <Requirement info={info} />
                </div>
              </button>
            ))}

            <p className="font-retro text-[10px] text-slate-500 text-center leading-snug mt-1 px-2">
              Non è una scala di difficoltà: sono quattro regole diverse. I 61 punti
              non crescono con l'Ante, il target Chips sì.
            </p>
          </div>

          <div className="shrink-0 px-3 py-2.5 border-t-2 border-slate-700">
            <button
              onClick={onBack}
              className="font-pixel text-[9px] text-slate-400 hover:text-white px-3 py-2 border border-slate-700 rounded-lg pixel-box cursor-pointer"
            >
              ← CAMBIA MAZZO
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
