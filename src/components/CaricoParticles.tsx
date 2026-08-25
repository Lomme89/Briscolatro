import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayingCard } from '../types/game';

interface CaricoParticlesProps {
  card: PlayingCard;
  isBriscola?: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  shape: 'star' | 'circle' | 'diamond' | 'spark';
  rotation: number;
  duration: number;
  delay: number;
}

export const CaricoParticles: React.FC<CaricoParticlesProps> = ({
  card,
  isBriscola = false,
}) => {
  const isAce = card.rank === 1;
  const isThree = card.rank === 3;

  // Colors based on Ace / Three / Briscola
  const primaryColor = isBriscola ? '#f97316' : isAce ? '#fbbf24' : '#f59e0b';
  const secondaryColor = isBriscola ? '#ef4444' : isAce ? '#fef08a' : '#fb923c';

  // Generate radial burst particles deterministically for smoothness
  const particles: Particle[] = useMemo(() => {
    const list: Particle[] = [];
    const count = isAce ? 24 : 18;
    const colors = [
      primaryColor,
      secondaryColor,
      '#ffffff',
      '#facc15',
      '#f43f5e',
      '#38bdf8',
    ];
    const shapes: ('star' | 'circle' | 'diamond' | 'spark')[] = ['star', 'circle', 'diamond', 'spark'];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.3 - 0.15);
      const distance = 45 + Math.random() * 55;
      list.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: Math.floor(Math.random() * 6) + 4,
        color: colors[i % colors.length],
        shape: shapes[i % shapes.length],
        rotation: Math.random() * 360,
        duration: 0.6 + Math.random() * 0.4,
        delay: Math.random() * 0.1,
      });
    }
    return list;
  }, [isAce, primaryColor, secondaryColor]);

  // Floating upward sparkles
  const floatingSparks = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 60,
      y: -(30 + Math.random() * 60),
      scale: 0.6 + Math.random() * 0.6,
      char: i % 2 === 0 ? '✨' : '⭐',
      delay: 0.1 + i * 0.08,
      duration: 0.8 + Math.random() * 0.4,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-visible">
      {/* 1. Multiple Expanding Shockwave Rings */}
      <motion.div
        initial={{ scale: 0.2, opacity: 0.95 }}
        animate={{ scale: [0.2, 1.6, 2.0], opacity: [1, 0.6, 0] }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        style={{ borderColor: primaryColor }}
        className="absolute w-24 h-32 rounded-2xl border-3 -z-10 shadow-[0_0_25px_currentColor]"
      />

      <motion.div
        initial={{ scale: 0.1, opacity: 1 }}
        animate={{ scale: [0.1, 1.3, 1.7], opacity: [1, 0.4, 0] }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        style={{ borderColor: secondaryColor }}
        className="absolute w-20 h-28 rounded-xl border-2 -z-10"
      />

      {/* 2. Golden Core Starburst Flare */}
      <motion.div
        initial={{ scale: 0, rotate: 0, opacity: 1 }}
        animate={{
          scale: [0, 1.4, 0],
          rotate: [0, 90],
          opacity: [1, 0.8, 0],
        }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="absolute w-36 h-36 rounded-full bg-radial from-amber-300/40 via-orange-500/20 to-transparent -z-10 blur-xs"
      />

      {/* 3. Radial Particle Shards */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: [0, 1.3, 0],
            opacity: [1, 1, 0],
            rotate: p.rotation + 180,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
          className="absolute flex items-center justify-center"
        >
          {p.shape === 'star' ? (
            <svg
              width={p.size * 1.8}
              height={p.size * 1.8}
              viewBox="0 0 24 24"
              fill={p.color}
              className="drop-shadow-[0_0_4px_currentColor]"
            >
              <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
            </svg>
          ) : p.shape === 'diamond' ? (
            <div
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 6px ${p.color}`,
              }}
              className="transform rotate-45 rounded-xs"
            />
          ) : p.shape === 'spark' ? (
            <div
              style={{
                width: p.size * 1.5,
                height: p.size * 0.6,
                backgroundColor: p.color,
                boxShadow: `0 0 6px ${p.color}`,
              }}
              className="rounded-full transform rotate-30"
            />
          ) : (
            <div
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 6px ${p.color}`,
              }}
              className="rounded-full"
            />
          )}
        </motion.div>
      ))}

      {/* 4. Ascending Sparkles */}
      {floatingSparks.map((spark) => (
        <motion.span
          key={spark.id}
          initial={{ x: spark.x * 0.3, y: 0, scale: 0, opacity: 0 }}
          animate={{
            x: spark.x,
            y: spark.y,
            scale: [0, spark.scale, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: spark.duration,
            delay: spark.delay,
            ease: 'easeOut',
          }}
          className="absolute text-sm select-none drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
        >
          {spark.char}
        </motion.span>
      ))}

      {/* 5. Celebratory Pop-up Banner Badge */}
      <motion.div
        initial={{ y: 20, scale: 0.4, opacity: 0 }}
        animate={{
          y: [-10, -32, -40],
          scale: [0.4, 1.15, 1],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.1,
          times: [0, 0.3, 1],
          ease: 'easeOut',
        }}
        className="absolute -top-3 z-40 whitespace-nowrap"
      >
        <div
          className={`px-2 py-0.5 rounded-md font-pixel text-[8px] sm:text-[9.5px] font-black border-2 pixel-box shadow-xl flex items-center gap-1 ${
            isBriscola
              ? 'bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 border-yellow-200 text-yellow-100 shadow-orange-500/50'
              : isAce
              ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 border-white text-slate-950 shadow-amber-500/50'
              : 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-600 border-amber-200 text-white shadow-red-500/50'
          }`}
        >
          <span>{isBriscola ? '🔥' : '⭐'}</span>
          <span>
            {isAce
              ? `ASSO DI CARICO! (+${card.points} PT)`
              : isThree
              ? `TRE VINCENTE! (+${card.points} PT)`
              : `PRESA VINCENTE!`}
          </span>
          <span>{isBriscola ? '🔥' : '⭐'}</span>
        </div>
      </motion.div>
    </div>
  );
};
