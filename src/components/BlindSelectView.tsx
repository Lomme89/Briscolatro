import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PixelAvatar } from './PixelAvatar';
import { TableFeltPattern } from './TableFeltPattern';
import { getTableThemeForAnte } from '../data/tableThemes';
import { getOpponentIntro } from '../data/opponents';
import { getBlindBaseReward, getBlindTargetScore } from '../game/gameState';
import { BOSS_RULES } from '../game/bossRules';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { sound } from '../services/soundEngine';

interface BlindSelectViewProps {
  ante: number;
  round: number;
  money: number;
  deckMultiplier: number;
  onSitDown: () => void;
}

const BLIND_LABELS: Record<number, { name: string; tag: string; multiplier: string }> = {
  1: { name: 'Piccolo Buio', tag: 'SMALL', multiplier: '×1' },
  2: { name: 'Grande Buio', tag: 'BIG', multiplier: '×1.5' },
  3: { name: 'Sfida al Boss', tag: 'BOSS', multiplier: '×2' },
};

/**
 * The moment before the deal.
 *
 * The run used to cut straight from the deck picker into a dealt hand, so an
 * Ante was just a number that went up. Here you see where you are, who is
 * sitting opposite, and - like Balatro - the boss's malus BEFORE you commit,
 * which is what turns the three blinds of an ante into a plan.
 */
export const BlindSelectView: React.FC<BlindSelectViewProps> = ({
  ante,
  round,
  money,
  deckMultiplier,
  onSitDown,
}) => {
  const theme = getTableThemeForAnte(ante);
  const opponent = getOpponentIntro(ante, round);
  const boss = ALL_BOSS_BLINDS.find((candidate) => candidate.ante === ante) || ALL_BOSS_BLINDS[0];

  const [revealed, setRevealed] = useState(false);
  const [typedQuote, setTypedQuote] = useState('');

  // Entrance: the opponent lands, then speaks. Tapping anywhere finishes it.
  useEffect(() => {
    // Whoever sits down gets their own motif; the boss keeps the alarm on top.
    sound.playOpponentJingle(opponent.characterId, opponent.isBoss);
    const timer = setTimeout(() => setRevealed(true), opponent.isBoss ? 620 : 380);
    return () => clearTimeout(timer);
  }, [ante, round, opponent.isBoss]);

  useEffect(() => {
    if (!revealed) return;
    let index = 0;
    const interval = setInterval(() => {
      index += 2;
      setTypedQuote(opponent.quote.slice(0, index));
      if (index >= opponent.quote.length) clearInterval(interval);
    }, 22);
    return () => clearInterval(interval);
  }, [revealed, opponent.quote]);

  const skipIntro = () => {
    setRevealed(true);
    setTypedQuote(opponent.quote);
  };

  const targetFor = (blindRound: number) =>
    getBlindTargetScore(ante, blindRound, {
      bossMultiplier: blindRound === 3 ? BOSS_RULES.getTargetScoreMultiplier(boss) : 1,
      deckMultiplier,
    });

  // Every blind of an ante pays the same base reward; interest and the Briscola
  // bonus are earned at the table, not promised here.
  const blindReward = getBlindBaseReward(ante);

  return (
    <div
      className="flex-1 flex flex-col min-h-[100dvh] w-full relative overflow-x-clip"
      onClick={skipIntro}
    >
      {/* The venue itself: the felt of this Ante, so arriving somewhere new looks like it. */}
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.feltGradient}`}>
        <TableFeltPattern theme={theme} />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 35%, ${theme.ambientGlow} 0%, rgba(0,0,0,0.75) 100%)`,
          }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-3xl mx-auto w-full px-3 sm:px-5 py-5 sm:py-8 gap-4">
        {/* Venue plate */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0">{theme.icon}</span>
            <div className="min-w-0">
              <div
                className={`font-pixel text-[11px] sm:text-sm font-bold truncate ${theme.accentBadge.text}`}
              >
                {theme.name}
              </div>
              <div className="font-retro text-[10px] sm:text-xs text-slate-400 leading-tight">
                {theme.subtitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-slate-950/80 border border-amber-500/60 px-2 py-1 rounded font-pixel text-[9px] sm:text-[10px] text-amber-300 font-bold">
              ANTE {ante}/8
            </span>
            <span className="bg-slate-950/80 border border-amber-500/60 px-2 py-1 rounded font-pixel text-[9px] sm:text-[10px] text-amber-300 font-bold">
              ${money}
            </span>
          </div>
        </motion.div>

        {/* The opponent */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
          <AnimatePresence>
            <motion.div
              key={`${ante}-${round}`}
              initial={{ scale: 0.4, y: -60, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 220 }}
              className="flex flex-col items-center"
            >
              <div
                className={`relative rounded-2xl p-2 sm:p-3 border-3 pixel-box shadow-2xl ${
                  opponent.isBoss
                    ? 'bg-red-950/80 border-red-500'
                    : 'bg-slate-900/85 border-amber-500/80'
                }`}
              >
                <PixelAvatar
                  characterId={opponent.characterId}
                  emotion={opponent.isBoss ? 'angry' : 'idle'}
                  size={opponent.isBoss ? 112 : 96}
                  showGlow={opponent.isBoss}
                />
                {opponent.isBoss && (
                  <motion.span
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-red-600 border border-red-300 text-white font-pixel text-[8px] sm:text-[9px] px-2 py-0.5 rounded uppercase font-bold whitespace-nowrap"
                  >
                    💀 Boss dell'Ante
                  </motion.span>
                )}
              </div>

              <div className="mt-3 text-center">
                <div
                  className={`font-pixel text-sm sm:text-lg font-bold ${
                    opponent.isBoss ? 'text-red-300' : 'text-amber-300'
                  }`}
                >
                  {opponent.name}
                </div>
                <div className="font-retro text-[11px] sm:text-xs text-slate-400 italic mt-0.5">
                  {opponent.title}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Speech bubble, typed out */}
          <div className="w-full max-w-md min-h-[52px] sm:min-h-[58px] flex items-center justify-center px-1">
            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`w-full bg-slate-950/92 border rounded-xl px-3 py-2 shadow-xl ${
                    opponent.isBoss ? 'border-red-500/70' : 'border-amber-500/50'
                  }`}
                >
                  <p className="font-retro text-[12px] sm:text-sm text-slate-100 italic leading-snug text-center">
                    &ldquo;{typedQuote}&rdquo;
                    {typedQuote.length < opponent.quote.length && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.7 }}
                        className="text-amber-400 not-italic"
                      >
                        |
                      </motion.span>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* The three blinds of the Ante: where you are and what is coming. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="grid grid-cols-3 gap-1.5 sm:gap-2 shrink-0"
        >
          {[1, 2, 3].map((blindRound) => {
            const info = BLIND_LABELS[blindRound];
            const isCurrent = blindRound === round;
            const isDone = blindRound < round;
            return (
              <div
                key={blindRound}
                className={`rounded-xl border-2 p-2 sm:p-2.5 pixel-box flex flex-col gap-1 transition-colors ${
                  isCurrent
                    ? blindRound === 3
                      ? 'bg-red-950/80 border-red-500 shadow-lg shadow-red-900/40'
                      : 'bg-amber-950/70 border-amber-400 shadow-lg shadow-amber-900/30'
                    : isDone
                      ? 'bg-slate-950/70 border-emerald-700/60 opacity-70'
                      : 'bg-slate-950/70 border-slate-700/70 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-pixel text-[7.5px] sm:text-[9px] font-bold uppercase ${
                      blindRound === 3 ? 'text-red-300' : 'text-amber-300'
                    }`}
                  >
                    {info.tag}
                  </span>
                  {isDone ? (
                    <span className="text-emerald-400 text-[10px]">✓</span>
                  ) : (
                    <span className="font-pixel text-[7px] sm:text-[8px] text-slate-500">
                      {info.multiplier}
                    </span>
                  )}
                </div>
                <div className="font-pixel text-[8px] sm:text-[10px] text-slate-200 leading-tight">
                  {info.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7px] sm:text-[8px] font-pixel text-slate-500">🎯</span>
                  <span
                    className={`font-pixel text-[9px] sm:text-xs font-bold tabular-nums ${
                      isCurrent ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {targetFor(blindRound).toLocaleString('it-IT')}
                  </span>
                </div>
                <div className="font-pixel text-[7.5px] sm:text-[8.5px] text-amber-500/90">
                  Premio ${blindReward}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* The boss malus is public knowledge from the start of the Ante. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`rounded-xl border-2 px-3 py-2 flex items-start gap-2.5 shrink-0 ${
            round === 3
              ? 'bg-gradient-to-r from-red-950/95 via-red-900/85 to-red-950/95 border-red-500/80'
              : 'bg-slate-950/70 border-slate-700/70'
          }`}
        >
          <span className="text-base sm:text-lg shrink-0 mt-0.5">💀</span>
          <div className="min-w-0">
            <div
              className={`font-pixel text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wide ${
                round === 3 ? 'text-red-300' : 'text-slate-400'
              }`}
            >
              {round === 3 ? 'Malus attivo' : `In fondo all'Ante · ${boss.name}`}
            </div>
            <div
              className={`font-retro text-[11px] sm:text-xs leading-tight mt-0.5 ${
                round === 3 ? 'text-red-100' : 'text-slate-300'
              }`}
            >
              {boss.debuffDescription}
            </div>
          </div>
        </motion.div>

        {/* Sit down */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={(event) => {
            event.stopPropagation();
            sound.playCardSlam();
            onSitDown();
          }}
          className={`w-full font-pixel text-xs sm:text-base font-bold py-3.5 sm:py-4 rounded-xl pixel-box shadow-xl cursor-pointer flex items-center justify-center gap-2 shrink-0 transition-transform hover:scale-[1.01] ${
            round === 3
              ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 text-white'
              : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950'
          }`}
        >
          <span>{round === 3 ? 'AFFRONTA IL BOSS' : 'SIEDITI AL TAVOLO'}</span>
          <span>➔</span>
        </motion.button>
      </div>
    </div>
  );
};
