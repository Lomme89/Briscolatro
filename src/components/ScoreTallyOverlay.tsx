import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../services/soundEngine';
import { once } from '../game/uiFlow';
import { ScoreStep } from '../game/scoreTrace';

interface ScoreTallyProps {
  chips: number;
  mult: number;
  finalScore: number;
  trickPoints: number;
  playerWon: boolean;
  /** Why the base Mult is what it is, e.g. "1 Carico +1", "Briscola +1". */
  multReasons?: string[];
  /**
   * What built the score, in order. The tally fires one source at a time:
   * reading the order is the point, a finished number ramping is not.
   */
  steps?: ScoreStep[];
  /** Where the count starts, before any step. Defaults to the totals. */
  baseChips?: number;
  baseMult?: number;
  /** Halves the count-up: the tally is played 20 times a round. */
  fastMode?: boolean;
  /**
   * Fired on the landing frame, with the share of the round's target this
   * trick was worth. The table shakes by that, or not at all.
   */
  onImpact?: (intensity: number) => void;
  onComplete: () => void;
  targetScore: number;
  currentTotalScore: number;
  playerBriscolaPoints: number;
  opponentBriscolaPoints: number;
}

/**
 * The chips are gettoni, so they land as gettoni. Built once: shapeFromText
 * rasterises a glyph, and doing that per trick would be twenty canvases a
 * round for an effect that lasts a second.
 */
const coinShapes = [confetti.shapeFromText({ text: '🪙', scalar: 1.1 })];

export const ScoreTallyOverlay: React.FC<ScoreTallyProps> = ({
  chips,
  mult,
  finalScore,
  trickPoints,
  playerWon,
  multReasons = [],
  steps = [],
  baseChips,
  baseMult,
  fastMode = false,
  onImpact,
  onComplete,
  targetScore,
  currentTotalScore,
  playerBriscolaPoints,
  opponentBriscolaPoints,
}) => {
  const startChips = baseChips ?? chips;
  const startMult = baseMult ?? mult;

  /** How many steps have fired. `steps.length` means the tally is spent. */
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'steps' | 'impact' | 'done'>('steps');
  const [skipped, setSkipped] = useState(false);

  const reduceMotion = useReducedMotion();
  const pace = (ms: number) => (reduceMotion ? Math.min(ms, 120) : fastMode ? Math.round(ms * 0.45) : ms);

  // Running totals are derived, never stored: the fold cannot drift from the
  // engine's own, and skipping is just "apply every step at once".
  const applied = skipped ? steps : steps.slice(0, stepIndex);
  const displayChips = skipped
    ? chips
    : startChips + applied.filter((s) => s.kind === 'chips').reduce((a, s) => a + s.amount, 0);
  const displayMult = skipped
    ? mult
    : (startMult + applied.filter((s) => s.kind === 'mult').reduce((a, s) => a + s.amount, 0)) *
      applied.filter((s) => s.kind === 'xmult').reduce((a, s) => a * s.amount, 1);
  const displayTotal = phase === 'steps' ? 0 : finalScore;
  const activeStep = !skipped && stepIndex > 0 ? steps[stepIndex - 1] : null;

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onImpactRef = React.useRef(onImpact);
  onImpactRef.current = onImpact;
  const completedRef = React.useRef(false);
  const completeOnceRef = React.useRef<(() => void) | null>(null);
  if (!completeOnceRef.current) {
    completeOnceRef.current = once(() => {
      completedRef.current = true;
      onCompleteRef.current();
    });
  }

  const triggerCompletion = React.useCallback(() => {
    completeOnceRef.current?.();
  }, []);

  const skipAnimation = React.useCallback(() => {
    if (completedRef.current) return;
    setSkipped(true);
    setPhase('done');
    triggerCompletion();
  }, [triggerCompletion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      skipAnimation();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skipAnimation]);

  // A lost trick has nothing to count: it says so and gets out of the way.
  useEffect(() => {
    if (playerWon) return;
    sound.playTrickLose();
    const timer = setTimeout(() => triggerCompletion(), pace(900));
    return () => clearTimeout(timer);
  }, [playerWon, triggerCompletion]);

  // One source per beat. The pause between them IS the readability.
  useEffect(() => {
    if (!playerWon || phase !== 'steps' || skipped) return;

    if (stepIndex >= steps.length) {
      const timer = setTimeout(() => setPhase('impact'), pace(steps.length > 0 ? 260 : 120));
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      sound.playScoreTick(stepIndex + 1);
      setStepIndex((i) => i + 1);
    }, pace(stepIndex === 0 ? 320 : 230));
    return () => clearTimeout(timer);
  }, [playerWon, phase, stepIndex, steps.length, skipped]);

  useEffect(() => {
    if (phase !== 'impact') return;

    sound.playMultImpact();

    // What fraction of the round this one trick just took. Everything about
    // how loud the landing is comes off this number.
    const share = finalScore / Math.max(1, targetScore);
    onImpactRef.current?.(share);

    const closesTheRound = currentTotalScore + finalScore >= targetScore;
    if (!reduceMotion && (closesTheRound || share >= 0.09)) {
      confetti({
        particleCount: share >= 0.6 ? 80 : share >= 0.25 ? 45 : 22,
        spread: share >= 0.6 ? 90 : 60,
        scalar: 1.1,
        startVelocity: share >= 0.6 ? 45 : 32,
        shapes: coinShapes,
        origin: { y: 0.55 },
        colors: ['#fbbf24', '#f59e0b', '#fde68a', '#b45309'],
      });
    }

    const timer = setTimeout(() => {
      setPhase('done');
      triggerCompletion();
    }, pace(700));

    return () => clearTimeout(timer);
  }, [phase, finalScore, currentTotalScore, targetScore, triggerCompletion, reduceMotion]);

  // Centred, but not a modal. What made the old tally friction was the dimmed,
  // blurred backdrop and the panel walling the table off, not where it sat: the
  // score is the most important thing on screen while it is counting, so it
  // belongs in the middle at a size you can read across the room. Nothing is
  // hidden behind it. The whole surface still takes a click to fast-forward,
  // and space still skips, because there is nothing else to click meanwhile.
  const shell =
    'absolute inset-0 z-40 flex items-center justify-center px-3 cursor-pointer';

  if (!playerWon) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={skipAnimation}
          role="button"
          tabIndex={0}
          aria-label="Salta animazione conteggio"
          className={shell}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, rotate: [-1.5, 1.5, 0] }}
            transition={{ type: 'spring', damping: 16, stiffness: 320 }}
            className="flex items-center gap-3.5 bg-red-950/92 border-3 border-red-500 px-5 py-3 rounded-2xl pixel-box shadow-2xl"
          >
            <span className="text-3xl leading-none">💀</span>
            <div className="text-left leading-tight">
              <div className="font-pixel text-base sm:text-lg text-red-300 font-bold tracking-wider">
                PRESA LORO
              </div>
              <div className="font-pixel text-[10px] text-red-100/90 mt-1.5 tabular-nums">
                +{trickPoints} PT · TU {playerBriscolaPoints} · LORO {opponentBriscolaPoints}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={skipAnimation}
        role="button"
        tabIndex={0}
        aria-label="Salta animazione conteggio"
        className={shell}
      >
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 320 }}
          className="flex flex-col items-center gap-2 w-full max-w-sm sm:max-w-md"
        >
          {/* Who just fired. The number moving without a name teaches nothing. */}
          <div className="h-7 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {activeStep && (
                <motion.span
                  key={`${stepIndex}-${activeStep.label}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className={`px-2.5 py-1 font-pixel text-[10px] sm:text-[11px] rounded-lg uppercase border-2 shadow-lg ${
                    activeStep.kind === 'chips'
                      ? 'bg-blue-950 border-blue-400 text-blue-200'
                      : activeStep.kind === 'dollars'
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                        : 'bg-red-950 border-red-400 text-red-200'
                  }`}
                >
                  {activeStep.label}{' '}
                  {activeStep.kind === 'xmult'
                    ? `×${activeStep.amount}`
                    : activeStep.kind === 'dollars'
                      ? `+$${activeStep.amount}`
                      : `+${activeStep.amount}`}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Chips x Mult, then what it came to. The score is the headline and
              is sized like one: the two factors are how it got there. */}
          <div className="flex items-stretch justify-center gap-2 w-full">
            <motion.div
              animate={{
                scale: activeStep?.kind === 'chips' ? 1.06 : 1,
                boxShadow: activeStep?.kind === 'chips' ? '0 0 18px rgba(59,130,246,0.65)' : 'none',
              }}
              className="flex-1 bg-blue-950/92 border-2 border-blue-400 px-3 py-2 rounded-xl text-center pixel-box"
            >
              <div className="text-[8px] sm:text-[9px] font-pixel text-blue-300 uppercase tracking-wider">
                CHIPS
              </div>
              <div className="text-2xl sm:text-3xl font-pixel text-blue-100 font-bold tabular-nums mt-1">
                {displayChips}
              </div>
            </motion.div>

            <span className="self-center text-2xl font-pixel text-amber-400 font-bold">×</span>

            <motion.div
              animate={{
                scale: activeStep && activeStep.kind !== 'chips' ? 1.06 : 1,
                boxShadow:
                  activeStep && activeStep.kind !== 'chips'
                    ? '0 0 18px rgba(239,68,68,0.65)'
                    : 'none',
              }}
              className="flex-1 bg-red-950/92 border-2 border-red-400 px-3 py-2 rounded-xl text-center pixel-box"
            >
              <div className="text-[8px] sm:text-[9px] font-pixel text-red-300 uppercase tracking-wider">
                MOLT.
              </div>
              <div className="text-2xl sm:text-3xl font-pixel text-red-100 font-bold tabular-nums mt-1">
                {Number.isInteger(displayMult) ? displayMult : displayMult.toFixed(2)}
              </div>
            </motion.div>
          </div>

          <motion.div
            animate={
              phase === 'impact' && !reduceMotion
                ? {
                    scale: [1, 1.14, 1],
                    boxShadow: ['0 0 0px #fbbf24', '0 0 45px #fbbf24', '0 0 14px #fbbf24'],
                  }
                : {}
            }
            className="w-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-3 border-amber-300 px-3 py-2.5 rounded-2xl text-center pixel-box"
          >
            <div className="text-[8px] sm:text-[9px] font-pixel text-amber-300/90 uppercase tracking-widest">
              PRESA TUA · +{trickPoints} PT
            </div>
            <div className="text-4xl sm:text-5xl font-pixel text-amber-300 font-bold leading-none tabular-nums mt-1.5">
              +{displayTotal.toLocaleString()}
            </div>
          </motion.div>

          {/* What earned the base Mult: the rule is only learnable if it is shown. */}
          {multReasons.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1">
              {multReasons.map((reason) => (
                <span
                  key={reason}
                  className="px-2 py-0.5 bg-red-950/90 border border-red-500/60 text-red-200 font-pixel text-[9px] rounded uppercase"
                >
                  {reason}
                </span>
              ))}
              <span className="px-2 py-0.5 bg-slate-950/90 border border-slate-600 text-slate-300 font-pixel text-[9px] rounded uppercase tabular-nums">
                TU {playerBriscolaPoints} · LORO {opponentBriscolaPoints}
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
