import React, { createContext, useContext, useState, useEffect } from 'react';
import JSZip from 'jszip';
import { Suit } from '../types/game';

interface SpritesheetContextType {
  customCardImages: Record<string, string>;
  hasCustomDeck: boolean;
  loadZipArchive: (file: File) => Promise<{ count: number; error?: string }>;
  resetToDefault: () => void;
  getCardImageSrc: (rank: number, suit: Suit) => string;
}

const SpritesheetContext = createContext<SpritesheetContextType>({
  customCardImages: {},
  hasCustomDeck: false,
  loadZipArchive: async () => ({ count: 0 }),
  resetToDefault: () => {},
  getCardImageSrc: () => '',
});

export const getRankSlug = (rank: number): string => {
  switch (rank) {
    case 1:
      return 'asso';
    case 8:
      return 'fante';
    case 9:
      return 'cavallo';
    case 10:
      return 're';
    default:
      return `${rank}`;
  }
};

export const getCardKey = (rank: number, suit: Suit): string => {
  const rankSlug = getRankSlug(rank);
  return `${rankSlug}_${suit}`;
};

export const SpritesheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customCardImages, setCustomCardImages] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('scopa_custom_card_images');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const hasCustomDeck = Object.keys(customCardImages).length > 0;

  useEffect(() => {
    try {
      if (Object.keys(customCardImages).length > 0) {
        localStorage.setItem('scopa_custom_card_images', JSON.stringify(customCardImages));
      } else {
        localStorage.removeItem('scopa_custom_card_images');
      }
    } catch (e) {
      console.warn('Could not persist custom cards to localStorage', e);
    }
  }, [customCardImages]);

  const loadZipArchive = async (file: File): Promise<{ count: number; error?: string }> => {
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const newImages: Record<string, string> = {};
      let matchedCount = 0;

      const fileEntries = Object.entries(loadedZip.files);

      for (const [relativePath, zipEntry] of fileEntries) {
        if (zipEntry.dir) continue;
        const lowerName = relativePath.toLowerCase();

        if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp')) {
          // Extract base filename without directories
          const baseName = lowerName.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
          const base64Data = await zipEntry.async('base64');
          const mimeType = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') ? 'image/jpeg' : lowerName.endsWith('.webp') ? 'image/webp' : 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          // Normalize keys (e.g., '2_bastoni', 'asso_coppe', 'cavallo_denari')
          newImages[baseName] = dataUrl;

          // Also match aliases like '1_bastoni' -> 'asso_bastoni', '8_denari' -> 'fante_denari', etc.
          const suits: Suit[] = ['denari', 'coppe', 'bastoni', 'spade'];
          for (const s of suits) {
            if (baseName.includes(s)) {
              if (baseName.startsWith('1_') || baseName.includes('ace') || baseName.includes('asso')) {
                newImages[`asso_${s}`] = dataUrl;
                newImages[`1_${s}`] = dataUrl;
              }
              if (baseName.startsWith('8_') || baseName.includes('fante') || baseName.includes('jocker') || baseName.includes('page')) {
                newImages[`fante_${s}`] = dataUrl;
                newImages[`8_${s}`] = dataUrl;
              }
              if (baseName.startsWith('9_') || baseName.includes('cavallo') || baseName.includes('knight') || baseName.includes('horse')) {
                newImages[`cavallo_${s}`] = dataUrl;
                newImages[`9_${s}`] = dataUrl;
              }
              if (baseName.startsWith('10_') || baseName.includes('re') || baseName.includes('king')) {
                newImages[`re_${s}`] = dataUrl;
                newImages[`10_${s}`] = dataUrl;
              }
              for (let num = 2; num <= 7; num++) {
                if (baseName.startsWith(`${num}_`) || baseName.includes(`${num}_${s}`)) {
                  newImages[`${num}_${s}`] = dataUrl;
                }
              }
            }
          }
          matchedCount++;
        }
      }

      if (matchedCount === 0) {
        return { count: 0, error: 'Nessuna immagine trovata all\'interno del file zip.' };
      }

      setCustomCardImages(newImages);
      return { count: matchedCount };
    } catch (err: any) {
      console.error('Error unpacking zip', err);
      return { count: 0, error: err?.message || 'Errore durante l\'apertura del file zip' };
    }
  };

  const resetToDefault = () => {
    setCustomCardImages({});
    localStorage.removeItem('scopa_custom_card_images');
  };

  const getCardImageSrc = (rank: number, suit: Suit): string => {
    const key = getCardKey(rank, suit);
    if (customCardImages[key]) {
      return customCardImages[key];
    }
    // Alternate keys (e.g., '1_bastoni' instead of 'asso_bastoni')
    const altKey = `${rank}_${suit}`;
    if (customCardImages[altKey]) {
      return customCardImages[altKey];
    }

    // Default: use the pre-sliced clean individual cropped PNG from public/cards/
    return `/cards/${suit}/${key}.png`;
  };

  return (
    <SpritesheetContext.Provider
      value={{
        customCardImages,
        hasCustomDeck,
        loadZipArchive,
        resetToDefault,
        getCardImageSrc,
      }}
    >
      {children}
    </SpritesheetContext.Provider>
  );
};

export const useSpritesheet = () => useContext(SpritesheetContext);

interface PixelCardSpriteProps {
  rank: number; // 1 to 10
  suit: Suit; // 'denari' | 'coppe' | 'bastoni' | 'spade'
  className?: string;
  alt?: string;
}

export const PixelCardSprite: React.FC<PixelCardSpriteProps> = ({
  rank,
  suit,
  className = '',
  alt,
}) => {
  const { getCardImageSrc } = useSpritesheet();
  const [imageError, setImageError] = useState(false);

  const cardSrc = getCardImageSrc(rank, suit);
  const fallbackSrc = `/cards/${getCardKey(rank, suit)}.png`;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden rounded-[3px] ${className}`}
      title={alt || `${rank} di ${suit}`}
    >
      <img
        src={imageError ? fallbackSrc : cardSrc}
        alt={alt || `${rank} di ${suit}`}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className="w-full h-full object-contain pointer-events-none select-none"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};
