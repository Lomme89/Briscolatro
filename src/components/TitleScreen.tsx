import { motion } from 'motion/react';
import { PlayingCard } from '../types/game';
import { getTableThemeForAnte } from '../data/tableThemes';
import { PixelCard } from './PixelCard';
import { TableFeltPattern } from './TableFeltPattern';

interface TitleScreenProps {
  titleHand: PlayingCard[];
  highScore: number;
  saveNotice: string | null;
  resumableAnte: number | null;
  isStandalone: boolean;
  onResume: () => void;
  onNewRun: () => void;
  onAbandon: () => void;
  onOpenTutorial: () => void;
  onOpenSettings: () => void;
  onInstall: () => void;
}

/** The title is a screen, not part of the run controller. */
export function TitleScreen({
  titleHand,
  highScore,
  saveNotice,
  resumableAnte,
  isStandalone,
  onResume,
  onNewRun,
  onAbandon,
  onOpenTutorial,
  onOpenSettings,
  onInstall,
}: TitleScreenProps) {
  const tableTheme = getTableThemeForAnte(1);
  const hasResumableRun = resumableAnte !== null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-6 text-center z-10 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-b ${tableTheme.feltGradient}`}>
          <TableFeltPattern theme={tableTheme} />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(16,185,129,0.10) 0%, rgba(0,0,0,0.82) 100%)',
          }}
        />
      </div>

      <div className="flex items-end justify-center -mb-5 sm:-mb-6 h-[86px] sm:h-[108px]">
        {titleHand.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ y: 60, opacity: 0, rotate: 0 }}
            animate={{ y: [0, -6, 0], opacity: 1, rotate: (index - 1) * 11 }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 3.4 + index * 0.5,
                ease: 'easeInOut',
                delay: 0.5 + index * 0.12,
              },
              opacity: { duration: 0.4, delay: 0.15 + index * 0.12 },
              rotate: { type: 'spring', damping: 14, delay: 0.15 + index * 0.12 },
            }}
            className={`${index === 1 ? 'z-20 -mx-2' : 'z-10'} drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]`}
          >
            <PixelCard card={card} size="sm" showPoints={false} showChips={false} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.85, y: -20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center max-w-lg w-full bg-slate-950/90 backdrop-blur-sm border-3 border-amber-500 rounded-3xl p-6 sm:p-8 pixel-box shadow-2xl relative z-30"
      >
        <div className="flex gap-4 mb-3">
          <span className="text-3xl animate-bounce">🪙</span>
          <span className="text-3xl animate-bounce [animation-delay:0.1s]">🏆</span>
          <span className="text-3xl animate-bounce [animation-delay:0.2s]">⚔️</span>
          <span className="text-3xl animate-bounce [animation-delay:0.3s]">🪵</span>
        </div>

        <h1 className="font-pixel text-2xl sm:text-3xl text-amber-400 font-bold tracking-wider uppercase drop-shadow">
          BRISCOLATRO
        </h1>
        <p className="font-retro text-xs text-amber-200 mt-1 uppercase tracking-widest">
          IL ROGUELIKE DELLA BRISCOLA ITALIANA
        </p>

        <div className="mt-4 bg-slate-950/80 border border-amber-500/60 px-4 py-1.5 rounded-full pixel-box text-xs font-pixel text-amber-300">
          MIGLIOR RECORD: {highScore.toLocaleString()} PUNTI
        </div>

        {saveNotice && (
          <div className="mt-4 w-full bg-rose-950/70 border border-rose-500/60 px-4 py-2 rounded-xl pixel-box text-[10px] font-retro text-rose-200 text-center">
            {saveNotice}
          </div>
        )}

        <div className="w-full space-y-3 mt-6">
          {hasResumableRun && (
            <button
              onClick={onResume}
              className="w-full bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-slate-950 font-pixel text-sm font-bold py-3.5 rounded-xl pixel-box shadow-xl cursor-pointer transition-transform hover:scale-102 flex items-center justify-center gap-2"
            >
              <span>CONTINUA RUN · ANTE {resumableAnte}</span>
              <span>➔</span>
            </button>
          )}

          <button
            onClick={onNewRun}
            className={
              hasResumableRun
                ? 'w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-pixel text-xs py-3 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2'
                : 'w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-pixel text-sm font-bold py-3.5 rounded-xl pixel-box shadow-xl cursor-pointer transition-transform hover:scale-102 flex items-center justify-center gap-2'
            }
          >
            <span>{hasResumableRun ? 'NUOVA PARTITA' : 'GIOCA NUOVA PARTITA'}</span>
            <span>➔</span>
          </button>

          {hasResumableRun && (
            <button
              onClick={onAbandon}
              className="w-full bg-slate-900/80 hover:bg-rose-950 border border-rose-500/40 text-rose-300 font-pixel text-[10px] py-2.5 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🗑️ ABBANDONA RUN</span>
            </button>
          )}

          <button
            onClick={onOpenTutorial}
            className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-pixel text-xs py-3 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2"
          >
            <span>📖 GUIDA & REGOLE BRISCOLA</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-pixel text-xs py-2.5 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2"
          >
            <span>⚙️ IMPOSTAZIONI & AUDIO</span>
          </button>

          {!isStandalone && (
            <button
              onClick={onInstall}
              className="w-full bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/60 hover:border-emerald-400 text-emerald-300 font-pixel text-xs py-2.5 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-101 shadow-md"
            >
              <span>📲</span>
              <span>INSTALLA SU SCHERMATA HOME</span>
            </button>
          )}
        </div>

        <div className="mt-6 pt-3 border-t border-slate-800 text-[10px] font-retro text-slate-400">
          Ispirato a Balatro & alla tradizione delle carte napoletane
          <div className="mt-1 text-[9px] text-slate-500">
            Con le Carte Sola, gioco di carte legalmente distinto.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
