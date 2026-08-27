import React, { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { UnoCard } from '../types/game';
import { CardFaceArt, getUnoArtUrl } from './CardFaceArt';
import { sound } from '../services/soundEngine';

interface UnoCastOverlayProps {
  card: UnoCard | null;
  /** Fires when the card lands: this is the frame the effect goes off on. */
  onImpact: () => void;
  /** Fires once the card has left the screen. */
  onDone: () => void;
  /** Partita rapida: same choreography, less waiting. */
  fast?: boolean;
}

/** The beats of the cast, in seconds at normal speed. */
const RISE = 0.5;
const HOLD = 0.42;
const EXIT = 0.3;

interface Spark {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

/**
 * A consumable takes the middle of the table before it does anything.
 *
 * Using a UNO card used to be invisible: the card left the rail, the numbers
 * moved, and the only trace was a line of text from the opponent. Balatro sells
 * a consumable as an event - the card comes up big, everything else dims, it
 * lands, and *then* the effect fires - and that ordering is the whole point:
 * you get to see which card you spent before the board changes under it.
 *
 * The overlay owns the timing, so the game does not have to guess: it calls
 * onImpact on the landing frame and onDone when the screen is its own again.
 */
export const UnoCastOverlay: React.FC<UnoCastOverlayProps> = ({
  card,
  onImpact,
  onDone,
  fast = false,
}) => {
  const speed = fast ? 0.62 : 1;
  const impactRef = useRef(onImpact);
  const doneRef = useRef(onDone);
  impactRef.current = onImpact;
  doneRef.current = onDone;

  const [landed, setLanded] = React.useState(false);

  useEffect(() => {
    if (!card) {
      setLanded(false);
      return;
    }

    setLanded(false);
    sound.playUnoCast();

    const impactAt = window.setTimeout(() => {
      setLanded(true);
      sound.playUnoAccent(card.id);
      impactRef.current();
    }, RISE * speed * 1000);

    const doneAt = window.setTimeout(
      () => doneRef.current(),
      (RISE + HOLD + EXIT) * speed * 1000
    );

    return () => {
      window.clearTimeout(impactAt);
      window.clearTimeout(doneAt);
    };
  }, [card, speed]);

  const sparks: Spark[] = useMemo(() => {
    if (!card) return [];
    const colors = [card.color, '#ffffff', '#fde047', '#f8fafc'];
    return Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2 + (i % 3) * 0.12;
      const distance = 90 + (i % 5) * 26;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 5 + (i % 4) * 3,
        color: colors[i % colors.length],
        delay: (i % 6) * 0.02,
        duration: 0.45 + (i % 4) * 0.08,
      };
    });
  }, [card]);

  const artUrl = card ? getUnoArtUrl(card.id) : undefined;

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 * speed }}
          // It also swallows taps: the board is mid-change underneath.
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center pointer-events-auto bg-slate-950/70 backdrop-blur-[2px]"
        >
          {/* The card's own colour bleeding into the room */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${card.color}55, transparent 62%)`,
            }}
            animate={{ opacity: landed ? [0.9, 0.35] : 0.35 }}
            transition={{ duration: 0.5 * speed }}
          />

          <div className="relative flex flex-col items-center">
            {/* Shockwave: one ring on the landing frame */}
            {landed && (
              <motion.div
                initial={{ scale: 0.35, opacity: 0.85 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.5 * speed, ease: 'easeOut' }}
                className="absolute w-44 h-44 rounded-full border-4 pointer-events-none"
                style={{ borderColor: card.color }}
              />
            )}

            {/* Sparks */}
            {landed &&
              sparks.map((spark) => (
                <motion.span
                  key={spark.id}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: spark.x, y: spark.y, opacity: 0, scale: 0.3 }}
                  transition={{ duration: spark.duration * speed, delay: spark.delay * speed, ease: 'easeOut' }}
                  className="absolute rounded-[2px] pointer-events-none"
                  style={{
                    width: spark.size,
                    height: spark.size,
                    backgroundColor: spark.color,
                    boxShadow: `0 0 8px ${spark.color}`,
                  }}
                />
              ))}

            {/* The card itself: thrown up, overshooting, then slammed flat */}
            <motion.div
              initial={{ scale: 0.35, y: 150, rotate: -14, opacity: 0 }}
              animate={
                landed
                  ? { scale: [1.16, 1], y: 0, rotate: 0, opacity: 1 }
                  : { scale: 1.05, y: 0, rotate: [-14, 7, -3, 0], opacity: 1 }
              }
              exit={{ scale: 1.35, opacity: 0, y: -40 }}
              transition={
                landed
                  ? { duration: 0.22 * speed, ease: 'easeOut' }
                  : { type: 'spring', stiffness: 260, damping: 12, duration: RISE * speed }
              }
              className="w-[132px] h-[184px] sm:w-[152px] sm:h-[212px] rounded-xl overflow-hidden border-4 pixel-box shadow-2xl bg-slate-950 flex items-center justify-center"
              style={{
                borderColor: card.color,
                boxShadow: `0 0 38px ${card.color}bb, 0 18px 40px rgba(2,6,23,0.75)`,
              }}
            >
              {artUrl ? (
                <CardFaceArt src={artUrl} alt={card.name} />
              ) : (
                <span className="text-5xl">{card.icon}</span>
              )}

              {/* The flash of the card going off, over its own face */}
              {landed && (
                <motion.div
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3 * speed, ease: 'easeOut' }}
                  className="absolute inset-0 bg-white pointer-events-none"
                />
              )}
            </motion.div>

            {/* Name and badge, the way a consumable announces itself */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={landed ? { opacity: 1, y: 0, scale: [1.18, 1] } : { opacity: 1, y: 0 }}
              transition={
                landed
                  ? { duration: 0.24 * speed, ease: 'easeOut' }
                  : { delay: 0.14 * speed, duration: 0.22 * speed }
              }
              className="mt-3 flex flex-col items-center gap-1"
            >
              <span
                className="font-pixel text-[8px] px-2 py-0.5 rounded uppercase font-black border"
                style={{ color: card.color, borderColor: `${card.color}90`, backgroundColor: `${card.color}22` }}
              >
                {card.badgeText || 'UNO'}
              </span>
              <span className="font-pixel text-[11px] sm:text-xs text-amber-300 font-bold text-center px-6 [text-shadow:0_2px_6px_rgb(2_6_23)]">
                {card.name}
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
