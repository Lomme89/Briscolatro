import { ArrowRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PixelAvatar } from './PixelAvatar';
import { TableFeltPattern } from './TableFeltPattern';
import { getTableThemeForAnte } from '../data/tableThemes';
import { getOpponentIntro } from '../data/opponents';
import {
  getBlindTargetScore,
  getEncounterReward,
  isBossEncounter,
} from '../game/gameState';
import {
  BRISCOLA_TARGET_POINTS,
  getVictoryHudPresentation,
  VICTORY_MODES,
  VictoryMode,
} from '../game/victoryModes';
import { BOSS_RULES } from '../game/bossRules';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { CAMPAIGN_FINAL_ANTE, getEndlessTier } from '../game/endless';
import { BossBlind } from '../types/game';
import { sound } from '../services/soundEngine';
import { SlateBoard, ChalkRule, PaperScrap } from './diegetic/Slate';

interface BlindSelectViewProps {
  ante: number;
  round: number;
  money: number;
  deckMultiplier: number;
  /** The rule this run is played under: it decides what clearing means. */
  victoryMode: VictoryMode;
  /**
   * The Boss this Ante actually ends with. Endless composes it out of a base
   * Boss and its modifiers, and the blind has to show the composition rather
   * than the catalogue entry - every active rule is public before sitting down.
   */
  endlessBoss?: BossBlind | null;
  onSitDown: () => void;
}

/**
 * I due incontri di un Ante.
 *
 * Erano tre - Piccolo Buio, Grande Buio, Boss - e il secondo era il primo
 * un'altra volta. Ogni incontro qui e' una Briscola intera, quindi accorciare
 * la run significa toglierne uno, non tagliare la partita.
 */
const ENCOUNTER_LABELS: Record<number, { name: string; tag: string; multiplier: string }> = {
  1: { name: 'Il Tavolo', tag: 'TAVOLO', multiplier: '×1.25' },
  2: { name: 'Sfida al Boss', tag: 'BOSS', multiplier: '×2' },
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
  victoryMode,
  endlessBoss,
  onSitDown,
}) => {
  const reduceMotion = useReducedMotion();
  const theme = getTableThemeForAnte(ante);
  const tier = getEndlessTier(ante);
  const boss =
    endlessBoss ??
    ALL_BOSS_BLINDS.find((candidate) => candidate.ante === ante) ??
    ALL_BOSS_BLINDS[0];
  // One Boss for the whole screen. Deriving the portrait separately from the
  // rules panel is how the two came to disagree.
  const opponent = getOpponentIntro(ante, round, boss);

  const [revealed, setRevealed] = useState(false);
  const [typedQuote, setTypedQuote] = useState('');

  // Entrance: the opponent lands, then speaks. Tapping anywhere finishes it.
  useEffect(() => {
    // Whoever sits down gets their own motif; the boss keeps the alarm on top.
    sound.playOpponentJingle(opponent.characterId, opponent.isBoss);
    const timer = setTimeout(() => setRevealed(true), reduceMotion ? 0 : opponent.isBoss ? 620 : 380);
    return () => clearTimeout(timer);
  }, [ante, round, opponent.isBoss, reduceMotion]);

  useEffect(() => {
    if (!revealed) return;
    let index = 0;
    if (reduceMotion) {
      setTypedQuote(opponent.quote);
      return;
    }
    const interval = setInterval(() => {
      index += 2;
      setTypedQuote(opponent.quote.slice(0, index));
      if (index >= opponent.quote.length) clearInterval(interval);
    }, 22);
    return () => clearInterval(interval);
  }, [revealed, opponent.quote, reduceMotion]);

  const skipIntro = () => {
    setRevealed(true);
    setTypedQuote(opponent.quote);
  };

  const targetFor = (blindRound: number) =>
    getBlindTargetScore(ante, blindRound, {
      bossMultiplier: isBossEncounter(blindRound) ? BOSS_RULES.getTargetScoreMultiplier(boss) : 1,
      deckMultiplier,
    });

  // The two encounters pay differently now - 1.25 and 1.75 of the ante's base -
  // so each card carries its own figure. Interest and the Briscola bonus are
  // earned at the table, not promised here.
  const modeInfo = VICTORY_MODES[victoryMode];
  const hud = getVictoryHudPresentation(victoryMode);

  return (
    <div
      // `flex-1` inside the shell's column already fills the screen. Flooring
      // this at 100dvh on top of that only stacks a second full viewport onto
      // whatever the shell contributes.
      className="flex-1 flex flex-col w-full relative overflow-x-clip"
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
          {/* L'insegna del posto in cui sei appena entrato: legno e vernice,
              come quella fuori dalla porta. Il nome e' dipinto, quello che
              cambia stasera e' a gesso. */}
          <div className="slate-frame rounded-[6px] px-3 py-1.5 sm:px-4 sm:py-2 min-w-0">
            <div className="font-pixel painted-sign text-[11px] sm:text-[13px] tracking-[0.1em] truncate leading-tight">
              {theme.name}
            </div>
            <div className="font-condensed text-[14px] sm:text-[16px] text-[#c9a878] leading-tight truncate">
              {theme.subtitle}
            </div>
          </div>
          <div className="flex items-baseline gap-3 shrink-0">
            {/*
              The Ante is never replaced by the tier: the player counts antes,
              and the tier only says how bad this stretch of them is.
            */}
            <span
              className="font-condensed text-[18px] sm:text-[21px] leading-none uppercase"
              style={tier ? { color: tier.accentColor } : { color: '#e8c766' }}
            >
              {tier ? `Ante ${ante} · ${tier.name}` : `Ante ${ante}/${CAMPAIGN_FINAL_ANTE}`}
            </span>
            <span className="font-condensed chalk-yellow text-[20px] sm:text-[23px] leading-none tabular-nums">
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
              {/* Chi si siede al tavolo sta nella stessa cornice di legno delle
                  foto appese al muro del locale. Il Boss la fa scaldare, ma
                  resta la stessa cornice: cambia la luce, non il mobile. */}
              <div
                className="slate-frame relative rounded-[8px] p-2 sm:p-3"
                style={
                  opponent.isBoss
                    ? { boxShadow: '0 22px 40px -10px rgba(0,0,0,0.82), 0 0 26px rgba(158,58,46,0.35), inset 0 2px 0 rgba(255,226,178,0.3)' }
                    : undefined
                }
              >
                <PixelAvatar
                  characterId={opponent.characterId}
                  emotion={opponent.isBoss ? 'angry' : 'idle'}
                  size={opponent.isBoss ? 112 : 96}
                  showGlow={opponent.isBoss}
                />
                {opponent.isBoss && (
                  <motion.span
                    animate={reduceMotion ? undefined : { scale: [1, 1.12, 1] }}
                    transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1.4 }}
                    className="slate-frame absolute -top-3 left-1/2 -translate-x-1/2 painted-sign font-pixel text-[8px] sm:text-[9px] px-2 py-1 rounded-[3px] uppercase whitespace-nowrap"
                  >
                    Boss dell'Ante
                  </motion.span>
                )}
              </div>

              <div className="mt-3 text-center">
                <div
                  className={`font-condensed text-[26px] sm:text-[32px] leading-none uppercase tracking-[0.02em] ${
                    opponent.isBoss ? 'chalk-red' : 'chalk'
                  }`}
                >
                  {opponent.name}
                </div>
                <div className="font-condensed chalk-dim text-[17px] sm:text-[20px] leading-tight mt-1">
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
                  className="slate-board w-full rounded-[3px] px-3.5 py-2.5"
                >
                  {/* Quello che dice l'avversario e' scritto a gesso come tutto
                      il resto del locale: e' una battuta di stasera, domani la
                      lavagna e' gia' passata dallo straccio. */}
                  <p
                    className={`font-condensed text-[19px] sm:text-[23px] leading-snug text-center ${
                      opponent.isBoss ? 'chalk-red' : 'chalk'
                    }`}
                  >
                    &ldquo;{typedQuote}&rdquo;
                    {typedQuote.length < opponent.quote.length && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.7 }}
                        className="chalk-yellow"
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

        {/* IL PROGRAMMA DELLA SERATA
            Le due mani dell'Ante, quello che serve per portarle a casa e
            quanto pagano non sono tre pannelli: sono la lista che l'oste
            scrive sulla lavagna prima di aprire. Una lavagna, incassata nel
            layout, quindi dritta e senza bacinella. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="shrink-0"
        >
          <SlateBoard tilt={0} ledge={false}>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="font-condensed chalk-dim text-[16px] sm:text-[18px] uppercase tracking-[0.12em]">
                Stasera
              </span>
              <span className="font-condensed chalk-dim text-[15px] sm:text-[17px] uppercase">
                {modeInfo.blindHint} · {modeInfo.label}
              </span>
            </div>
            <ChalkRule className="mt-1.5 mb-2.5" />

            <div className="flex flex-col gap-2">
              {[1, 2].map((blindRound) => {
                const info = ENCOUNTER_LABELS[blindRound];
                const isCurrent = blindRound === round;
                const isDone = blindRound < round;
                const tone = isDone
                  ? 'chalk-green'
                  : isCurrent
                    ? isBossEncounter(blindRound)
                      ? 'chalk-red'
                      : 'chalk'
                    : 'chalk-dim';
                return (
                  <div
                    key={blindRound}
                    // La riga di stasera e' ripassata; quella gia' giocata e'
                    // stata sbarrata; quella dopo e' ancora sbiadita.
                    className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 ${
                      isCurrent ? '' : 'opacity-70'
                    }`}
                  >
                    <span
                      className={`font-condensed ${tone} uppercase leading-none ${
                        isCurrent ? 'text-[25px] sm:text-[30px]' : 'text-[21px] sm:text-[25px]'
                      } ${isDone ? 'line-through decoration-2' : ''}`}
                    >
                      {info.name}
                    </span>
                    {hud.showChipsObjective && (
                      <span className={`font-condensed ${tone} text-[18px] sm:text-[21px] leading-none tabular-nums`}>
                        {targetFor(blindRound).toLocaleString('it-IT')} chips
                      </span>
                    )}
                    {hud.showBriscolaObjective && (
                      <span className={`font-condensed ${tone} text-[18px] sm:text-[21px] leading-none tabular-nums`}>
                        {BRISCOLA_TARGET_POINTS} pt briscola
                      </span>
                    )}
                    <span className="font-condensed chalk-yellow text-[18px] sm:text-[21px] leading-none ml-auto shrink-0 tabular-nums">
                      {isDone ? 'pagato' : `$${getEncounterReward(ante, blindRound)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </SlateBoard>
        </motion.div>

        {/* IL MALUS DEL BOSS
            Non e' roba dell'oste: e' la regola della casa, battuta a macchina e
            infilata nella cornice, e resta li' tutto l'Ante. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="shrink-0 flex justify-center"
        >
          <PaperScrap tilt={isBossEncounter(round) ? -1.6 : 1.1} className="w-full max-w-md">
            <div
              className={`font-pixel text-[8px] sm:text-[9.5px] uppercase tracking-[0.12em] ${
                isBossEncounter(round) ? 'ink-red' : 'ink-dim'
              }`}
            >
              {isBossEncounter(round) ? 'Regola della casa · in vigore' : `In fondo all'Ante · ${boss.name}`}
            </div>
            <div
              className={`font-condensed text-[17px] sm:text-[20px] leading-tight mt-1 ${
                isBossEncounter(round) ? 'ink' : 'ink-dim'
              }`}
            >
              {boss.debuffDescription}
            </div>
          </PaperScrap>
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
          className="group w-full bg-transparent cursor-pointer flex items-center justify-center gap-3 shrink-0 py-2 focus:outline-none"
        >
          <span
            className={`font-condensed text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.02em] opacity-[0.9] transition-[filter,opacity] duration-200 group-hover:opacity-100 group-hover:brightness-[1.15] ${
              isBossEncounter(round) ? 'chalk-red' : 'chalk-yellow'
            }`}
          >
            {isBossEncounter(round) ? 'Affronta il Boss' : 'Siediti al tavolo'}
          </span>
          <ArrowRight
            size={26}
            strokeWidth={1.8}
            className={`${isBossEncounter(round) ? 'chalk-red' : 'chalk-yellow'} transition-transform duration-200 group-hover:translate-x-1.5`}
          />
        </motion.button>
      </div>
    </div>
  );
};
