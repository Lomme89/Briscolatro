import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../services/soundEngine';
import { once } from '../game/uiFlow';

interface ScoreTallyProps {
  chips: number;
  mult: number;
  finalScore: number;
  trickPoints: number;
  playerWon: boolean;
  /** Why the base Mult is what it is, e.g. "1 Carico +1", "Briscola +1". */
  multReasons?: string[];
  /** Halves the count-up: the tally is played 20 times a round. */
  fastMode?: boolean;
  onComplete: () => void;
  targetScore: number;
  currentTotalScore: number;
  playerBriscolaPoints: number;
  opponentBriscolaPoints: number;
}

export const ScoreTallyOverlay: React.FC<ScoreTallyProps> = ({
  chips,
  mult,
  finalScore,
  trickPoints,
  playerWon,
  multReasons = [],
  fastMode = false,
  onComplete,
  targetScore,
  currentTotalScore,
  playerBriscolaPoints,
  opponentBriscolaPoints,
}) => {
  const [displayChips, setDisplayChips] = useState(0);
  const [displayMult, setDisplayMult] = useState(1);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [phase, setPhase] = useState<'chips' | 'mult' | 'impact' | 'done'>('chips');

  const reduceMotion = useReducedMotion();
  const pace = (ms: number) => (reduceMotion ? Math.min(ms, 120) : fastMode ? Math.round(ms * 0.45) : ms);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
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
    setDisplayChips(chips);
    setDisplayMult(mult);
    setDisplayTotal(finalScore);
    setPhase('done');
    triggerCompletion();
  }, [chips, mult, finalScore, triggerCompletion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      skipAnimation();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skipAnimation]);

  useEffect(() => {
    if (!playerWon) {
      sound.playTrickLose();
      const timer = setTimeout(() => {
        triggerCompletion();
      }, pace(900));
      return () => clearTimeout(timer);
    }

    // Step 1: Count up Chips
    let step = 0;
    const chipsInterval = setInterval(() => {
      step++;
      const current = Math.min(chips, Math.round((step / 6) * chips));
      setDisplayChips(current);
      sound.playScoreTick(step);

      if (current >= chips) {
        clearInterval(chipsInterval);
        setPhase('mult');
      }
    }, pace(45));

    return () => clearInterval(chipsInterval);
  }, [chips, playerWon, triggerCompletion]);

  useEffect(() => {
    if (phase !== 'mult') return;

    let step = 0;
    const multInterval = setInterval(() => {
      step++;
      const current = Math.min(mult, Math.round(1 + (step / 5) * (mult - 1)));
      setDisplayMult(current);
      sound.playScoreTick(step + 6);

      if (current >= mult) {
        clearInterval(multInterval);
        setPhase('impact');
      }
    }, pace(55));

    return () => clearInterval(multInterval);
  }, [phase, mult]);

  useEffect(() => {
    if (phase !== 'impact') return;

    sound.playMultImpact();
    setDisplayTotal(finalScore);

    // If new score beats or makes big progress toward target, trigger confetti
    if (!reduceMotion && (currentTotalScore + finalScore >= targetScore || finalScore >= 500)) {
      confetti({
        particleCount: finalScore >= 1000 ? 70 : 40,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#fbbf24', '#f87171', '#60a5fa', '#4ade80', '#c084fc'],
      });
    }

    const timer = setTimeout(() => {
      setPhase('done');
      triggerCompletion();
    }, pace(700));

    return () => clearTimeout(timer);
  }, [phase, finalScore, currentTotalScore, targetScore, triggerCompletion, reduceMotion]);

  if (!playerWon) {
    return (
      <AnimatePresence>
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
          onClick={skipAnimation}
          role="button"
          tabIndex={0}
          aria-label="Salta animazione conteggio"
          className="absolute inset-0 z-40 flex items-center justify-center cursor-pointer bg-slate-950/40 backdrop-blur-xs"
        >
          <motion.div 
            animate={reduceMotion ? undefined : { rotate: [-2, 2, -2, 0] }}
            transition={{ duration: 0.3 }}
            className="bg-red-950/95 border-3 border-red-500 p-4 rounded-2xl pixel-box text-center shadow-2xl relative"
          >
            <span className="text-3xl mb-1 block">💀</span>
            <h3 className="text-sm font-pixel text-red-300 font-bold tracking-wider">PRESA LORO</h3>
            <p className="text-xs font-pixel text-red-100 mt-1">+{trickPoints} PT BRISCOLA</p>
            <p className="text-[10px] font-pixel text-slate-400 mt-2 tabular-nums">
              TU {playerBriscolaPoints} · LORO {opponentBriscolaPoints}
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={skipAnimation}
        role="button"
        tabIndex={0}
        aria-label="Salta animazione conteggio"
        className="absolute inset-0 z-40 flex items-center justify-center cursor-pointer bg-slate-950/45 backdrop-blur-xs"
      >
        <div className="flex flex-col items-center bg-slate-900/95 border-3 border-amber-400 p-4 sm:p-5 rounded-2xl pixel-box shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
          {/* Header celebration badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🏆</span>
            <span className="font-pixel text-xs text-amber-400 font-bold uppercase tracking-wider">
              PRESA TUA
            </span>
          </div>
          <div className="font-pixel text-[10px] text-emerald-200 -mt-1 mb-1">
            +{trickPoints} PT BRISCOLA
          </div>
          <div className="font-pixel text-[8px] text-slate-400 tabular-nums mb-1">
            TU {playerBriscolaPoints} · LORO {opponentBriscolaPoints}
          </div>

          {/* Bonus callout if heavy carico or crazy multiplier */}
          {trickPoints >= 10 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-2 px-2 py-0.5 bg-amber-500/20 border border-amber-400 text-amber-300 font-pixel text-[8px] rounded-full uppercase"
            >
              ⭐ CARICO CATTURATO (+{trickPoints} PT BRISCOLA)!
            </motion.div>
          )}

          {mult >= 10 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { scale: [1, 1.08, 1], opacity: 1 }}
              transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1 }}
              className="mb-2 px-2.5 py-0.5 bg-red-500/20 border border-red-400 text-red-300 font-pixel text-[8.5px] rounded-full uppercase font-bold"
            >
              🔥 SUPER COMBO MOLTIPLICATORE ×{mult}!
            </motion.div>
          )}

          {/* What earned the base Mult: the rule is only learnable if it is shown. */}
          {multReasons.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1 mb-1">
              {multReasons.map((reason) => (
                <span
                  key={reason}
                  className="px-1.5 py-0.5 bg-red-950/80 border border-red-500/60 text-red-200 font-pixel text-[7.5px] rounded uppercase"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}

          {/* Chips x Mult formula container */}
          <div className="flex items-center justify-center gap-3 w-full my-2">
            {/* Chips Box (Blue) */}
            <motion.div
              animate={{ 
                scale: phase === 'chips' ? 1.08 : 1,
                boxShadow: phase === 'chips' ? '0 0 15px rgba(59,130,246,0.5)' : 'none'
              }}
              className="flex-1 bg-blue-950 border-2 border-blue-400 p-2.5 rounded-lg text-center pixel-box"
            >
              <div className="text-[9px] font-pixel text-blue-300 uppercase">CHIPS</div>
              <div className="text-xl font-pixel text-blue-100 font-bold mt-1">
                {displayChips}
              </div>
            </motion.div>

            <span className="text-xl font-pixel text-amber-400 font-bold">×</span>

            {/* Mult Box (Red) */}
            <motion.div
              animate={{ 
                scale: phase === 'mult' ? 1.08 : 1,
                boxShadow: phase === 'mult' ? '0 0 15px rgba(239,68,68,0.5)' : 'none'
              }}
              className="flex-1 bg-red-950 border-2 border-red-400 p-2.5 rounded-lg text-center pixel-box"
            >
              <div className="text-[9px] font-pixel text-red-300 uppercase">MOLT.</div>
              <div className="text-xl font-pixel text-red-100 font-bold mt-1">
                {displayMult}
              </div>
            </motion.div>
          </div>

          {/* Final Impact Total Box */}
          <motion.div
            animate={
              phase === 'impact'
                ? {
                    scale: [1, 1.15, 1],
                    boxShadow: ['0 0 0px #fbbf24', '0 0 35px #fbbf24', '0 0 10px #fbbf24'],
                  }
                : {}
            }
            className="w-full mt-2 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-2 border-amber-300 p-2.5 rounded-lg text-center pixel-box"
          >
            <div className="text-[9px] font-pixel text-amber-300 uppercase">SCORE PRESA</div>
            <div className="text-2xl font-pixel text-amber-300 font-bold mt-0.5">
              +{displayTotal.toLocaleString()}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
