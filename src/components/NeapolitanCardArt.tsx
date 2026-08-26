import React from 'react';
import { CardRank, Suit } from '../types/game';

/**
 * The hand-finished Neapolitan deck.
 *
 * Vite bundles and fingerprints these, so they get content-hashed URLs and the
 * base path is handled for us on GitHub Pages. Files are named by rank, where
 * 1 = Asso, 8 = Fante, 9 = Cavallo, 10 = Re, matching CardRank.
 */
const CARD_ART = import.meta.glob('../assets/cards/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ART_BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART)) {
  const match = path.match(/cards\/([a-z]+)\/(\d+)\.png$/);
  if (match) ART_BY_KEY[`${match[1]}_${match[2]}`] = url;
}

export function getCardArtUrl(suit: Suit, rank: CardRank): string | undefined {
  return ART_BY_KEY[`${suit}_${rank}`];
}

/** True when the finished deck covers every card, so callers can pick a fallback. */
export const HAS_FULL_CARD_ART = Object.keys(ART_BY_KEY).length === 40;

/**
 * The paper colour of the artwork. The cards are ~0.61 wide-to-tall while the
 * slots on the table are ~0.70, so the art is letterboxed rather than cropped -
 * cropping ate the figures' heads and feet - and the card sits on this colour so
 * the letterbox is invisible.
 */
export const CARD_PAPER = '#f5f4e8';

interface NeapolitanCardArtProps {
  suit: Suit;
  rank: CardRank;
  alt: string;
  className?: string;
}

export const NeapolitanCardArt: React.FC<NeapolitanCardArtProps> = ({
  suit,
  rank,
  alt,
  className = '',
}) => {
  const src = getCardArtUrl(suit, rank);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      // The art is pixel art: never smooth it when it scales up.
      className={`w-full h-full object-contain select-none [image-rendering:pixelated] ${className}`}
    />
  );
};
