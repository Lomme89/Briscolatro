import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../services/soundEngine';

interface ScoreTallyProps {
  chips: number;
  mult: number;
  finalScore: number;
  trickPoints: number;
  playerWon: boolean;
  /** Why the base Mult is what it is, e.g. "1 Carico +1", "Briscola +1". */
  multReasons?: string[];
  onComplete: () => void;
  targetScore: number;
  currentTotalScore: number;
}

export const ScoreTallyOverlay: React.FC<ScoreTallyProps> = ({
  chips,
  mult,
  finalScore,
  trickPoints,
  playerWon,
  multReasons = [],
  onComplete,
  targetScore,
  currentTotalScore,
}) => {
  const [displayChips, setDisplayChips] = useState(0);
  const [displayMult, setDisplayMult] = useState(1);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [phase, setPhase] = useState<'chips' | 'mult' | 'impact' | 'done'>('chips');

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = React.useRef(false);

  const triggerCompletion = React.useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, []);

  useEffect(() => {
    if (!playerWon) {
      sound.playTrickLose();
      const timer = setTimeout(() => {
        triggerCompletion();
      }, 900);
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
    }, 45);

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
    }, 55);

    return () => clearInterval(multInterval);
  }, [phase, mult]);

  useEffect(() => {
    if (phase !== 'impact') return;

    sound.playMultImpact();
    setDisplayTotal(finalScore);

    // If new score beats or makes big progress toward target, trigger confetti
    if (currentTotalScore + finalScore >= targetScore || finalScore >= 500) {
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
    }, 700);

    return () => clearTimeout(timer);
  }, [phase, finalScore, currentTotalScore, targetScore, triggerCompletion]);

  if (!playerWon) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-slate-950/40 backdrop-blur-xs"
        >
          <motion.div 
            animate={{ rotate: [-2, 2, -2, 0] }}
            transition={{ duration: 0.3 }}
            className="bg-red-950/95 border-3 border-red-500 p-4 rounded-2xl pixel-box text-center shadow-2xl relative"
          >
            <span className="text-3xl mb-1 block">💀</span>
            <h3 className="text-sm font-pixel text-red-300 font-bold tracking-wider">PRESA PERSA</h3>
            <p className="text-xs font-retro text-red-200 mt-1">L'avversario ha preso il banco!</p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-slate-950/45 backdrop-blur-xs"
      >
        <div className="flex flex-col items-center bg-slate-900/95 border-3 border-amber-400 p-4 sm:p-5 rounded-2xl pixel-box shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
          {/* Header celebration badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🏆</span>
            <span className="font-pixel text-xs text-amber-400 font-bold uppercase tracking-wider">
              PRESA VINTA (+{trickPoints} PT)
            </span>
          </div>

          {/* Bonus callout if heavy carico or crazy multiplier */}
          {trickPoints >= 10 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-2 px-2 py-0.5 bg-amber-500/20 border border-amber-400 text-amber-300 font-pixel text-[8px] rounded-full uppercase"
            >
              ⭐ CARICO CATTURATO (+{trickPoints} PUNTI)!
            </motion.div>
          )}

          {mult >= 10 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.08, 1], opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1 }}
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
            <div className="text-[9px] font-pixel text-amber-300 uppercase">PUNTEGGIO PRESA</div>
            <div className="text-2xl font-pixel text-amber-300 font-bold mt-0.5">
              +{displayTotal.toLocaleString()}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
