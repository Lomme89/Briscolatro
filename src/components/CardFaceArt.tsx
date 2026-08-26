import React from 'react';

/**
 * The illustrated faces for the 22 personaggi and the 16 carte UNO.
 *
 * Same deal as the Neapolitan deck: Vite fingerprints these and fixes the base
 * path for GitHub Pages. Files are named after the id in `data/jokers.ts` and
 * `data/unoCards.ts`, so a card without art simply falls back to its emoji.
 */
const JOKER_ART = import.meta.glob('../assets/jokers/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const UNO_ART = import.meta.glob('../assets/uno/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function indexById(art: Record<string, string>): Record<string, string> {
  const byId: Record<string, string> = {};
  for (const [path, url] of Object.entries(art)) {
    const match = path.match(/\/([^/]+)\.png$/);
    if (match) byId[match[1]] = url;
  }
  return byId;
}

const JOKER_ART_BY_ID = indexById(JOKER_ART);
const UNO_ART_BY_ID = indexById(UNO_ART);

export function getJokerArtUrl(id: string): string | undefined {
  return JOKER_ART_BY_ID[id];
}

export function getUnoArtUrl(id: string): string | undefined {
  return UNO_ART_BY_ID[id];
}

interface CardFaceArtProps {
  src: string;
  alt: string;
  /** `cover` fills a card-shaped slot, `contain` fits a square thumbnail. */
  fit?: 'cover' | 'contain';
  className?: string;
}

export const CardFaceArt: React.FC<CardFaceArtProps> = ({
  src,
  alt,
  fit = 'cover',
  className = '',
}) => (
  <img
    src={src}
    alt={alt}
    draggable={false}
    loading="lazy"
    // Pixel art: never smooth it when it scales.
    className={`w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} select-none [image-rendering:pixelated] ${className}`}
  />
);
