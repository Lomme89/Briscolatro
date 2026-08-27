import React from 'react';
import { motion } from 'motion/react';

export type OpponentEmotion = 'idle' | 'happy' | 'angry' | 'shocked' | 'thinking';

interface PixelAvatarProps {
  characterId?: string; // 'gennaro', 'boss_ante_1', etc.
  emotion?: OpponentEmotion;
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export const PixelAvatar: React.FC<PixelAvatarProps> = ({
  characterId = 'gennaro',
  emotion = 'idle',
  size = 40,
  className = '',
  showGlow = false,
}) => {
  // Normalize id
  const char = characterId.toLowerCase();

  // Render character specific SVG pixel art (24x24 grid scaled cleanly)
  const renderPixelFace = () => {
    switch (char) {
      // 1. GIGI IL BARISTA (Chef/Barista Hat, Espresso, Big Mustache)
      case 'boss_ante_1':
      case 'gigi':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Chef Toque Hat */}
            <rect x="7" y="1" width="10" height="3" fill="#ffffff" />
            <rect x="5" y="3" width="14" height="4" fill="#f1f5f9" />
            <rect x="6" y="7" width="12" height="2" fill="#cbd5e1" />
            {/* Hat pleats */}
            <rect x="8" y="2" width="2" height="5" fill="#e2e8f0" />
            <rect x="14" y="2" width="2" height="5" fill="#e2e8f0" />
            {/* Face Skin */}
            <rect x="6" y="9" width="12" height="9" fill="#fed7aa" />
            <rect x="7" y="18" width="10" height="2" fill="#fdba74" />
            {/* Ears */}
            <rect x="4" y="11" width="2" height="4" fill="#fba359" />
            <rect x="18" y="11" width="2" height="4" fill="#fba359" />
            {/* Eyes */}
            {emotion === 'angry' || emotion === 'shocked' ? (
              <>
                <rect x="8" y="11" width="2" height="2" fill="#7f1d1d" />
                <rect x="14" y="11" width="2" height="2" fill="#7f1d1d" />
              </>
            ) : (
              <>
                <rect x="8" y="11" width="2" height="2" fill="#1e293b" />
                <rect x="14" y="11" width="2" height="2" fill="#1e293b" />
                <rect x="8" y="11" width="1" height="1" fill="#ffffff" />
                <rect x="14" y="11" width="1" height="1" fill="#ffffff" />
              </>
            )}
            {/* Nose */}
            <rect x="11" y="12" width="2" height="2" fill="#ea580c" />
            {/* Giant Barista Mustache */}
            <rect x="6" y="14" width="12" height="3" fill="#78350f" />
            <rect x="5" y="15" width="2" height="3" fill="#78350f" />
            <rect x="17" y="15" width="2" height="3" fill="#78350f" />
            {/* Mouth / Smile */}
            {emotion === 'happy' ? (
              <rect x="10" y="17" width="4" height="1" fill="#991b1b" />
            ) : (
              <rect x="11" y="17" width="2" height="1" fill="#451a03" />
            )}
            {/* Red Neckerchief / Apron */}
            <rect x="8" y="19" width="8" height="3" fill="#dc2626" />
            <rect x="6" y="21" width="12" height="3" fill="#1e293b" />
          </svg>
        );

      // 2. DON VITO L'INCROLLABILE (Elder Don, Fedora, Cigar with Ember)
      case 'boss_ante_2':
      case 'don_vito':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Fedora Hat Crown */}
            <rect x="6" y="1" width="12" height="5" fill="#1e293b" />
            <rect x="8" y="1" width="8" height="2" fill="#0f172a" />
            {/* Hat Band (Wine Red) */}
            <rect x="6" y="5" width="12" height="1" fill="#991b1b" />
            {/* Fedora Brim */}
            <rect x="3" y="6" width="18" height="2" fill="#1e293b" />
            {/* Face */}
            <rect x="6" y="8" width="12" height="10" fill="#fed7aa" />
            {/* White/Grey Temple Hair */}
            <rect x="4" y="8" width="2" height="5" fill="#94a3b8" />
            <rect x="18" y="8" width="2" height="5" fill="#94a3b8" />
            {/* Thick Dark Eyebrows */}
            <rect x="7" y="9" width="4" height="1" fill="#334155" />
            <rect x="13" y="9" width="4" height="1" fill="#334155" />
            {/* Eyes / Glare */}
            <rect x="8" y="11" width="2" height="1" fill="#0f172a" />
            <rect x="14" y="11" width="2" height="1" fill="#0f172a" />
            {/* Wrinkles */}
            <rect x="7" y="13" width="2" height="1" fill="#ea580c" opacity="0.6" />
            <rect x="15" y="13" width="2" height="1" fill="#ea580c" opacity="0.6" />
            {/* Nose */}
            <rect x="11" y="12" width="2" height="3" fill="#ea580c" />
            {/* Cigar in Mouth */}
            <rect x="12" y="16" width="6" height="2" fill="#78350f" />
            <rect x="14" y="16" width="1" height="2" fill="#fbbf24" />
            {/* Glowing Burning Cigar Ember */}
            <rect x="18" y="16" width="2" height="2" fill="#ef4444" />
            <rect x="19" y="16" width="1" height="1" fill="#fef08a" />
            {/* Smoke particle */}
            <rect x="20" y="14" width="1" height="1" fill="#cbd5e1" opacity="0.8" />
            <rect x="21" y="12" width="1" height="1" fill="#94a3b8" opacity="0.6" />
            {/* Suit Lapel & Tie */}
            <rect x="5" y="18" width="14" height="6" fill="#0f172a" />
            <rect x="10" y="18" width="4" height="4" fill="#f8fafc" />
            <rect x="11" y="19" width="2" height="5" fill="#b91c1c" />
          </svg>
        );

      // 3. ROSA LA MESCOLATRICE (Variety-hall croupier: updo, stage make-up, fanned cards)
      case 'boss_ante_3':
      case 'mescolatrice':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Tall raven updo with a brass hairpin */}
            <rect x="8" y="0" width="8" height="3" fill="#1e1b2e" />
            <rect x="6" y="2" width="12" height="5" fill="#2e2a44" />
            <rect x="15" y="1" width="3" height="1" fill="#eab308" />
            <rect x="17" y="1" width="1" height="3" fill="#eab308" />
            {/* Face */}
            <rect x="6" y="7" width="12" height="10" fill="#fcd9b6" />
            {/* Side curls */}
            <rect x="5" y="7" width="1" height="6" fill="#2e2a44" />
            <rect x="18" y="7" width="1" height="6" fill="#2e2a44" />
            {/* Stage eyeliner and eyes */}
            <rect x="7" y="9" width="4" height="1" fill="#1e1b2e" />
            <rect x="13" y="9" width="4" height="1" fill="#1e1b2e" />
            <rect x="8" y="10" width="2" height="2" fill="#78350f" />
            <rect x="14" y="10" width="2" height="2" fill="#78350f" />
            <rect x="8" y="10" width="1" height="1" fill="#ffffff" />
            <rect x="14" y="10" width="1" height="1" fill="#ffffff" />
            {/* Nose and crimson lipstick */}
            <rect x="11" y="12" width="2" height="1" fill="#e8b48c" />
            <rect x="10" y="14" width="4" height="2" fill="#be123c" />
            {/* Velvet dress with brass buttons */}
            <rect x="4" y="17" width="16" height="7" fill="#4a0f2a" />
            <rect x="9" y="17" width="6" height="3" fill="#7a1a44" />
            <rect x="11" y="19" width="2" height="1" fill="#eab308" />
            {/* A fan of cards held up on the left */}
            <rect x="2" y="15" width="4" height="6" fill="#f5f4e8" />
            <rect x="3" y="14" width="4" height="6" fill="#ffffff" />
            <rect x="4" y="16" width="2" height="2" fill="#be123c" />
          </svg>
        );

      // 4. CICCIO IL BARO (Cardsharp, Dark Shades, Smirk, Green Visor)
      case 'boss_ante_4':
      case 'ciccio_baro':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Green Casino Dealer Visor / Slick Hair */}
            <rect x="6" y="2" width="12" height="3" fill="#0f172a" />
            <rect x="4" y="5" width="16" height="2" fill="#15803d" />
            <rect x="3" y="7" width="18" height="2" fill="#22c55e" />
            {/* Ace card behind ear */}
            <rect x="18" y="5" width="3" height="4" fill="#ffffff" />
            <rect x="19" y="6" width="1" height="2" fill="#ef4444" />
            {/* Face */}
            <rect x="6" y="8" width="12" height="9" fill="#fed7aa" />
            {/* Cool Black Sunglasses */}
            <rect x="6" y="10" width="5" height="3" fill="#020617" />
            <rect x="13" y="10" width="5" height="3" fill="#020617" />
            <rect x="11" y="11" width="2" height="1" fill="#020617" />
            {/* Glasses Lens Glint */}
            <rect x="7" y="10" width="2" height="1" fill="#38bdf8" />
            <rect x="14" y="10" width="2" height="1" fill="#38bdf8" />
            {/* Cheeky Smirk */}
            <rect x="11" y="15" width="4" height="1" fill="#991b1b" />
            <rect x="15" y="14" width="1" height="1" fill="#991b1b" />
            {/* Toothpick */}
            <rect x="15" y="15" width="3" height="1" fill="#fbbf24" />
            {/* Gold Chain and Open Shirt */}
            <rect x="5" y="17" width="14" height="7" fill="#1e1b4b" />
            <rect x="9" y="17" width="6" height="4" fill="#fed7aa" />
            <rect x="10" y="19" width="4" height="2" fill="#eab308" />
          </svg>
        );

      // 5. IL CONTE DELLE SPADE (Musketeer Hat, Feather, Eye Patch, Goatee)
      case 'boss_ante_5':
      case 'conte_spade':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Giant Blue/Gold Feather */}
            <rect x="16" y="0" width="3" height="3" fill="#38bdf8" />
            <rect x="14" y="2" width="4" height="3" fill="#60a5fa" />
            {/* Cavalier Hat */}
            <rect x="5" y="4" width="14" height="4" fill="#1e3a8a" />
            <rect x="2" y="7" width="20" height="2" fill="#172554" />
            <rect x="2" y="7" width="20" height="1" fill="#fbbf24" />
            {/* Face */}
            <rect x="6" y="9" width="12" height="8" fill="#fcd34d" />
            {/* Eye Patch on Left */}
            <rect x="7" y="11" width="3" height="3" fill="#0f172a" />
            <rect x="6" y="10" width="5" height="1" fill="#0f172a" />
            {/* Piercing Right Eye */}
            <rect x="14" y="11" width="2" height="2" fill="#1d4ed8" />
            <rect x="14" y="11" width="1" height="1" fill="#ffffff" />
            {/* Sharp Mustache & Goatee */}
            <rect x="7" y="14" width="10" height="1" fill="#451a03" />
            <rect x="6" y="13" width="2" height="1" fill="#451a03" />
            <rect x="16" y="13" width="2" height="1" fill="#451a03" />
            <rect x="11" y="16" width="2" height="2" fill="#451a03" />
            {/* Aristocrat Ruffled Collar */}
            <rect x="5" y="17" width="14" height="3" fill="#f8fafc" />
            <rect x="4" y="20" width="16" height="4" fill="#1e3a8a" />
          </svg>
        );

      // 6. IL MAESTRO DEI BASTONI (Gladiator/Lumberjack, Red Headband, Rugged Beard)
      case 'boss_ante_6':
      case 'maestro_bastoni':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Spiky Wild Hair */}
            <rect x="6" y="1" width="12" height="4" fill="#451a03" />
            <rect x="4" y="3" width="3" height="3" fill="#451a03" />
            <rect x="17" y="3" width="3" height="3" fill="#451a03" />
            {/* Red Warrior Headband */}
            <rect x="4" y="5" width="16" height="2" fill="#ef4444" />
            <rect x="19" y="6" width="2" height="4" fill="#ef4444" />
            {/* Face */}
            <rect x="6" y="7" width="12" height="8" fill="#fba359" />
            {/* Fierce Battle Eyes */}
            <rect x="8" y="8" width="2" height="2" fill="#0f172a" />
            <rect x="14" y="8" width="2" height="2" fill="#0f172a" />
            <rect x="8" y="8" width="1" height="1" fill="#fbbf24" />
            <rect x="14" y="8" width="1" height="1" fill="#fbbf24" />
            {/* Battle Scar across cheek */}
            <rect x="7" y="10" width="3" height="1" fill="#b91c1c" />
            {/* Huge Lumberjack/Warrior Beard */}
            <rect x="5" y="11" width="14" height="8" fill="#78350f" />
            <rect x="7" y="19" width="10" height="2" fill="#78350f" />
            {/* Mouth in Beard */}
            <rect x="11" y="13" width="2" height="2" fill="#451a03" />
            {/* Fur Mantle / Brawny Shoulders */}
            <rect x="3" y="19" width="18" height="5" fill="#a16207" />
          </svg>
        );

      // 7. IL CAMBIAVALUTE (Pawnbroker: green eyeshade, jeweller's loupe, coin stacks)
      case 'boss_ante_7':
      case 'cambiavalute':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Balding pate with grey side hair */}
            <rect x="7" y="3" width="10" height="3" fill="#e2b98a" />
            <rect x="4" y="4" width="3" height="5" fill="#9aa5b1" />
            <rect x="17" y="4" width="3" height="5" fill="#9aa5b1" />
            {/* Accountant's green eyeshade visor */}
            <rect x="5" y="6" width="14" height="2" fill="#14532d" />
            <rect x="4" y="8" width="16" height="2" fill="#166534" />
            <rect x="4" y="10" width="16" height="1" fill="#22c55e" opacity="0.5" />
            {/* Face */}
            <rect x="6" y="10" width="12" height="8" fill="#e2b98a" />
            {/* Narrow eyes, one behind a jeweller's loupe */}
            <rect x="8" y="12" width="2" height="1" fill="#1f2937" />
            <rect x="13" y="11" width="4" height="4" fill="#0f172a" />
            <rect x="14" y="12" width="2" height="2" fill="#7dd3fc" />
            <rect x="14" y="12" width="1" height="1" fill="#ffffff" />
            {/* Nose and a thin, unimpressed mouth */}
            <rect x="11" y="14" width="1" height="1" fill="#c99b6d" />
            <rect x="9" y="16" width="5" height="1" fill="#7c2d12" />
            {/* Waistcoat with watch chain */}
            <rect x="4" y="18" width="16" height="6" fill="#1f2937" />
            <rect x="10" y="18" width="4" height="6" fill="#374151" />
            <rect x="8" y="20" width="4" height="1" fill="#eab308" />
            {/* Stack of coins on the counter */}
            <rect x="17" y="21" width="4" height="1" fill="#facc15" />
            <rect x="17" y="22" width="4" height="1" fill="#eab308" />
            <rect x="17" y="23" width="4" height="1" fill="#ca8a04" />
          </svg>
        );

      // 8. IL SOVRANO DI BRISCOLATRO (Royal Golden Crown, Ruby Jewels, Ermine Robe, King Beard)
      case 'boss_ante_8':
      case 'sovrano':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Ornate Gold Crown with 3 Peaks */}
            <rect x="5" y="1" width="3" height="6" fill="#eab308" />
            <rect x="10" y="0" width="4" height="7" fill="#facc15" />
            <rect x="16" y="1" width="3" height="6" fill="#eab308" />
            <rect x="4" y="6" width="16" height="3" fill="#ca8a04" />
            {/* Crown Rubies & Gems */}
            <rect x="6" y="2" width="1" height="2" fill="#ef4444" />
            <rect x="11" y="1" width="2" height="2" fill="#3b82f6" />
            <rect x="17" y="2" width="1" height="2" fill="#ef4444" />
            <rect x="11" y="7" width="2" height="1" fill="#ec4899" />
            {/* Face */}
            <rect x="6" y="9" width="12" height="7" fill="#fed7aa" />
            {/* Royal Golden Eyes */}
            <rect x="8" y="10" width="2" height="2" fill="#78350f" />
            <rect x="14" y="10" width="2" height="2" fill="#78350f" />
            <rect x="8" y="10" width="1" height="1" fill="#fef08a" />
            <rect x="14" y="10" width="1" height="1" fill="#fef08a" />
            {/* Majestic Golden Beard */}
            <rect x="5" y="13" width="14" height="8" fill="#ca8a04" />
            <rect x="7" y="20" width="10" height="3" fill="#a16207" />
            <rect x="10" y="14" width="4" height="2" fill="#fef08a" />
            {/* Royal Ermine Cloak with Gold Clasp */}
            <rect x="3" y="18" width="18" height="6" fill="#6b21a8" />
            <rect x="8" y="19" width="8" height="2" fill="#ffffff" />
            <rect x="10" y="19" width="1" height="1" fill="#0f172a" />
            <rect x="13" y="19" width="1" height="1" fill="#0f172a" />
          </svg>
        );

      // REGULARS - the locals you play before the owner of the venue sits down.

      // NONNA ASSUNTA (Bocciofila: Grey Bun, Gold Glasses, Pearls, Bowls Ball)
      case 'assunta':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Grey bun and set hair */}
            <rect x="9" y="0" width="6" height="3" fill="#cbd5e1" />
            <rect x="5" y="2" width="14" height="5" fill="#e2e8f0" />
            <rect x="4" y="6" width="2" height="4" fill="#cbd5e1" />
            <rect x="18" y="6" width="2" height="4" fill="#cbd5e1" />
            {/* Face */}
            <rect x="6" y="7" width="12" height="10" fill="#fde4c8" />
            {/* Gold reading glasses */}
            <rect x="6" y="10" width="5" height="3" fill="#eab308" />
            <rect x="13" y="10" width="5" height="3" fill="#eab308" />
            <rect x="11" y="11" width="2" height="1" fill="#eab308" />
            <rect x="7" y="11" width="3" height="1" fill="#e0f2fe" />
            <rect x="14" y="11" width="3" height="1" fill="#e0f2fe" />
            {/* Eyes behind the lenses */}
            {emotion === 'shocked' ? (
              <>
                <rect x="8" y="11" width="2" height="1" fill="#0f172a" />
                <rect x="14" y="11" width="2" height="1" fill="#0f172a" />
                <rect x="19" y="8" width="2" height="3" fill="#38bdf8" />
              </>
            ) : emotion === 'angry' ? (
              <>
                <rect x="7" y="9" width="4" height="1" fill="#64748b" />
                <rect x="13" y="9" width="4" height="1" fill="#64748b" />
                <rect x="8" y="11" width="2" height="1" fill="#7f1d1d" />
                <rect x="14" y="11" width="2" height="1" fill="#7f1d1d" />
              </>
            ) : (
              <>
                <rect x="8" y="11" width="2" height="1" fill="#334155" />
                <rect x="14" y="11" width="2" height="1" fill="#334155" />
              </>
            )}
            {/* Rouged cheeks and nose */}
            <rect x="6" y="13" width="2" height="2" fill="#f9a8d4" />
            <rect x="16" y="13" width="2" height="2" fill="#f9a8d4" />
            <rect x="11" y="13" width="2" height="2" fill="#f0b184" />
            {/* Mouth */}
            {emotion === 'happy' ? (
              <rect x="10" y="15" width="4" height="1" fill="#9f1239" />
            ) : (
              <rect x="11" y="15" width="2" height="1" fill="#9f1239" />
            )}
            {/* Pearls over a flowered shawl */}
            <rect x="4" y="18" width="16" height="6" fill="#a78bfa" />
            <rect x="6" y="20" width="2" height="2" fill="#f472b6" />
            <rect x="12" y="21" width="2" height="2" fill="#f472b6" />
            <rect x="8" y="18" width="1" height="1" fill="#f8fafc" />
            <rect x="10" y="19" width="1" height="1" fill="#f8fafc" />
            <rect x="13" y="19" width="1" height="1" fill="#f8fafc" />
            <rect x="15" y="18" width="1" height="1" fill="#f8fafc" />
            {/* Bowls ball resting in her hand */}
            <rect x="18" y="20" width="4" height="4" fill="#166534" />
            <rect x="19" y="21" width="1" height="1" fill="#4ade80" />
          </svg>
        );

      // MIMI FIORDALISO (Soubrette: Feather Plume, Blonde Waves, Boa, Red Lips)
      case 'mimi':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Feather plume */}
            <rect x="13" y="0" width="2" height="2" fill="#f9a8d4" />
            <rect x="15" y="1" width="2" height="2" fill="#f472b6" />
            <rect x="16" y="2" width="2" height="3" fill="#fb7185" />
            <rect x="14" y="2" width="2" height="2" fill="#fb7185" />
            <rect x="15" y="4" width="2" height="1" fill="#eab308" />
            {/* Blonde marcel waves under a gold band */}
            <rect x="5" y="4" width="14" height="4" fill="#facc15" />
            <rect x="5" y="3" width="14" height="1" fill="#eab308" />
            <rect x="4" y="8" width="2" height="5" fill="#fbbf24" />
            <rect x="18" y="8" width="2" height="5" fill="#fbbf24" />
            {/* Face */}
            <rect x="6" y="8" width="12" height="9" fill="#ffe4d0" />
            {/* Stage lashes and eyes */}
            {emotion === 'shocked' ? (
              <>
                <rect x="7" y="9" width="4" height="1" fill="#0f172a" />
                <rect x="13" y="9" width="4" height="1" fill="#0f172a" />
                <rect x="8" y="10" width="2" height="3" fill="#0ea5e9" />
                <rect x="14" y="10" width="2" height="3" fill="#0ea5e9" />
              </>
            ) : emotion === 'angry' ? (
              <>
                <rect x="7" y="9" width="4" height="1" fill="#7f1d1d" />
                <rect x="13" y="9" width="4" height="1" fill="#7f1d1d" />
                <rect x="8" y="11" width="2" height="2" fill="#0369a1" />
                <rect x="14" y="11" width="2" height="2" fill="#0369a1" />
              </>
            ) : (
              <>
                <rect x="7" y="10" width="4" height="1" fill="#0f172a" />
                <rect x="13" y="10" width="4" height="1" fill="#0f172a" />
                <rect x="8" y="11" width="2" height="2" fill="#0ea5e9" />
                <rect x="14" y="11" width="2" height="2" fill="#0ea5e9" />
                <rect x="8" y="11" width="1" height="1" fill="#ffffff" />
                <rect x="14" y="11" width="1" height="1" fill="#ffffff" />
              </>
            )}
            {/* Beauty mark and lips */}
            <rect x="15" y="14" width="1" height="1" fill="#3f2a14" />
            {emotion === 'happy' ? (
              <rect x="9" y="14" width="6" height="2" fill="#e11d48" />
            ) : (
              <rect x="10" y="14" width="4" height="2" fill="#e11d48" />
            )}
            {/* Drop earrings */}
            <rect x="4" y="13" width="1" height="2" fill="#eab308" />
            <rect x="19" y="13" width="1" height="2" fill="#eab308" />
            {/* Feather boa over a sequined dress */}
            <rect x="3" y="17" width="18" height="3" fill="#fb7185" />
            <rect x="5" y="18" width="2" height="1" fill="#fda4af" />
            <rect x="11" y="18" width="2" height="1" fill="#fda4af" />
            <rect x="16" y="18" width="2" height="1" fill="#fda4af" />
            <rect x="5" y="20" width="14" height="4" fill="#047857" />
            <rect x="8" y="21" width="1" height="1" fill="#fde047" />
            <rect x="12" y="22" width="1" height="1" fill="#fde047" />
            <rect x="15" y="21" width="1" height="1" fill="#fde047" />
          </svg>
        );

      // 'O MUTO (Bisca: Black Coppola Pulled Low, Scar, Cigarette, Collar Up)
      case 'o_muto':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Black cap, worn low */}
            <rect x="5" y="2" width="14" height="4" fill="#0f172a" />
            <rect x="3" y="6" width="18" height="2" fill="#020617" />
            {/* Face, half of it in the brim's shadow */}
            <rect x="6" y="8" width="12" height="9" fill="#e8c39e" />
            <rect x="6" y="8" width="12" height="1" fill="#c69a70" />
            {/* Eyes: two glints under the brim */}
            {emotion === 'angry' ? (
              <>
                <rect x="8" y="10" width="2" height="2" fill="#dc2626" />
                <rect x="14" y="10" width="2" height="2" fill="#dc2626" />
              </>
            ) : emotion === 'shocked' ? (
              <>
                <rect x="8" y="10" width="2" height="2" fill="#f8fafc" />
                <rect x="14" y="10" width="2" height="2" fill="#f8fafc" />
                <rect x="8" y="10" width="1" height="1" fill="#0f172a" />
                <rect x="14" y="10" width="1" height="1" fill="#0f172a" />
              </>
            ) : (
              <>
                <rect x="8" y="10" width="2" height="2" fill="#f8fafc" />
                <rect x="14" y="10" width="2" height="2" fill="#f8fafc" />
                <rect x="8" y="11" width="2" height="1" fill="#0f172a" />
                <rect x="14" y="11" width="2" height="1" fill="#0f172a" />
              </>
            )}
            {/* Scar down the right cheek */}
            <rect x="16" y="11" width="1" height="3" fill="#b91c1c" />
            {/* Stubble */}
            <rect x="6" y="13" width="12" height="4" fill="#475569" />
            <rect x="7" y="13" width="10" height="1" fill="#e8c39e" />
            {/* Mouth: a line. He does not do more than that. */}
            {emotion === 'happy' ? (
              <rect x="10" y="15" width="4" height="1" fill="#0f172a" />
            ) : (
              <rect x="10" y="15" width="3" height="1" fill="#0f172a" />
            )}
            {/* Cigarette and smoke */}
            <rect x="13" y="15" width="4" height="1" fill="#f8fafc" />
            <rect x="17" y="15" width="1" height="1" fill="#f97316" />
            <rect x="19" y="13" width="1" height="1" fill="#cbd5e1" opacity="0.7" />
            <rect x="20" y="11" width="1" height="1" fill="#94a3b8" opacity="0.5" />
            {/* Leather jacket, collar up */}
            <rect x="4" y="17" width="16" height="7" fill="#1c1917" />
            <rect x="4" y="17" width="4" height="5" fill="#44403c" />
            <rect x="16" y="17" width="4" height="5" fill="#44403c" />
            <rect x="10" y="17" width="4" height="3" fill="#e2e8f0" />
            <rect x="11" y="19" width="2" height="5" fill="#0f172a" />
          </svg>
        );

      // CADETTO SALVATORE (Armeria: Fencing Mask Pushed Up, White Jacket, Foil)
      case 'salvatore':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Fencing mask pushed up on his head */}
            <rect x="7" y="0" width="10" height="1" fill="#334155" />
            <rect x="6" y="1" width="12" height="3" fill="#cbd5e1" />
            <rect x="7" y="1" width="1" height="1" fill="#334155" />
            <rect x="9" y="2" width="1" height="1" fill="#334155" />
            <rect x="11" y="1" width="1" height="1" fill="#334155" />
            <rect x="13" y="2" width="1" height="1" fill="#334155" />
            <rect x="15" y="1" width="1" height="1" fill="#334155" />
            <rect x="5" y="1" width="1" height="3" fill="#64748b" />
            <rect x="18" y="1" width="1" height="3" fill="#64748b" />
            <rect x="5" y="4" width="14" height="1" fill="#334155" />
            {/* Young dark hair */}
            <rect x="6" y="4" width="12" height="3" fill="#3f2a14" />
            <rect x="5" y="6" width="1" height="3" fill="#3f2a14" />
            <rect x="18" y="6" width="1" height="3" fill="#3f2a14" />
            {/* Face */}
            <rect x="6" y="7" width="12" height="9" fill="#fed7aa" />
            {/* Eyes */}
            {emotion === 'shocked' ? (
              <>
                <rect x="8" y="9" width="2" height="3" fill="#166534" />
                <rect x="14" y="9" width="2" height="3" fill="#166534" />
                <rect x="19" y="7" width="2" height="3" fill="#38bdf8" />
              </>
            ) : emotion === 'angry' ? (
              <>
                <rect x="7" y="9" width="4" height="1" fill="#3f2a14" />
                <rect x="13" y="9" width="4" height="1" fill="#3f2a14" />
                <rect x="8" y="10" width="2" height="2" fill="#166534" />
                <rect x="14" y="10" width="2" height="2" fill="#166534" />
              </>
            ) : (
              <>
                <rect x="8" y="10" width="2" height="2" fill="#166534" />
                <rect x="14" y="10" width="2" height="2" fill="#166534" />
                <rect x="8" y="10" width="1" height="1" fill="#ffffff" />
                <rect x="14" y="10" width="1" height="1" fill="#ffffff" />
              </>
            )}
            {/* Nose and set jaw */}
            <rect x="11" y="12" width="2" height="2" fill="#ea580c" />
            {emotion === 'happy' ? (
              <rect x="10" y="14" width="4" height="1" fill="#9a3412" />
            ) : (
              <rect x="11" y="14" width="2" height="1" fill="#7c2d12" />
            )}
            {/* White fencing jacket with a red sash */}
            <rect x="5" y="16" width="14" height="8" fill="#f8fafc" />
            <rect x="5" y="16" width="14" height="2" fill="#e2e8f0" />
            <rect x="5" y="20" width="14" height="1" fill="#b91c1c" />
            <rect x="11" y="18" width="2" height="6" fill="#e2e8f0" />
            {/* Foil held upright */}
            <rect x="20" y="4" width="1" height="13" fill="#cbd5e1" />
            <rect x="19" y="17" width="3" height="2" fill="#eab308" />
          </svg>
        );

      // ROCCO SPACCALEGNA (Taverna: Wool Beanie, Huge Red Beard, Plaid, Axe)
      case 'rocco':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Wool beanie */}
            <rect x="11" y="0" width="2" height="1" fill="#f8fafc" />
            <rect x="6" y="1" width="12" height="4" fill="#166534" />
            <rect x="5" y="5" width="14" height="2" fill="#14532d" />
            {/* Face */}
            <rect x="6" y="7" width="12" height="6" fill="#fbcfa0" />
            {/* Heavy brows */}
            <rect x="7" y="8" width="4" height="1" fill="#9a3412" />
            <rect x="13" y="8" width="4" height="1" fill="#9a3412" />
            {/* Eyes */}
            {emotion === 'shocked' ? (
              <>
                <rect x="8" y="9" width="2" height="3" fill="#0f172a" />
                <rect x="14" y="9" width="2" height="3" fill="#0f172a" />
                <rect x="19" y="8" width="2" height="3" fill="#38bdf8" />
              </>
            ) : emotion === 'angry' ? (
              <>
                <rect x="8" y="9" width="2" height="2" fill="#7f1d1d" />
                <rect x="14" y="9" width="2" height="2" fill="#7f1d1d" />
              </>
            ) : (
              <>
                <rect x="8" y="9" width="2" height="2" fill="#0f172a" />
                <rect x="14" y="9" width="2" height="2" fill="#0f172a" />
                <rect x="8" y="9" width="1" height="1" fill="#ffffff" />
                <rect x="14" y="9" width="1" height="1" fill="#ffffff" />
              </>
            )}
            {/* Nose */}
            <rect x="11" y="10" width="2" height="2" fill="#ea580c" />
            {/* Enormous red beard */}
            <rect x="5" y="12" width="14" height="6" fill="#c2410c" />
            <rect x="7" y="12" width="10" height="2" fill="#9a3412" />
            <rect x="7" y="17" width="10" height="2" fill="#9a3412" />
            {/* Mouth inside the beard */}
            {emotion === 'happy' ? (
              <rect x="10" y="14" width="4" height="2" fill="#f8fafc" />
            ) : (
              <rect x="11" y="14" width="2" height="1" fill="#450a0a" />
            )}
            {/* Plaid shirt */}
            <rect x="3" y="18" width="18" height="6" fill="#991b1b" />
            <rect x="7" y="18" width="1" height="6" fill="#450a0a" />
            <rect x="13" y="18" width="1" height="6" fill="#450a0a" />
            <rect x="3" y="21" width="18" height="1" fill="#450a0a" />
            {/* Axe resting on his shoulder */}
            <rect x="20" y="10" width="1" height="8" fill="#78350f" />
            <rect x="19" y="7" width="4" height="3" fill="#94a3b8" />
            <rect x="19" y="7" width="1" height="3" fill="#e2e8f0" />
          </svg>
        );

      // RAGIONIER ESPOSITO (Banco dei Pegni: Bald, Monocle, Pencil, Ledger)
      case 'esposito':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Bald head with a shine */}
            <rect x="6" y="6" width="12" height="11" fill="#fde0c0" />
            <rect x="9" y="7" width="3" height="1" fill="#fff7ed" />
            <rect x="7" y="9" width="3" height="1" fill="#94a3b8" />
            <rect x="14" y="9" width="3" height="1" fill="#94a3b8" />
            {/* What is left of the hair */}
            <rect x="4" y="9" width="2" height="5" fill="#94a3b8" />
            <rect x="18" y="9" width="2" height="5" fill="#94a3b8" />
            {/* Pencil behind the ear */}
            <rect x="19" y="7" width="1" height="4" fill="#eab308" />
            <rect x="19" y="11" width="1" height="1" fill="#f97316" />
            {/* Left eye, right monocle */}
            {emotion === 'shocked' ? (
              <>
                <rect x="8" y="10" width="2" height="3" fill="#0f172a" />
                <rect x="14" y="10" width="2" height="3" fill="#0f172a" />
              </>
            ) : emotion === 'angry' ? (
              <>
                <rect x="7" y="9" width="4" height="1" fill="#64748b" />
                <rect x="8" y="11" width="2" height="1" fill="#7f1d1d" />
                <rect x="14" y="11" width="2" height="1" fill="#7f1d1d" />
              </>
            ) : (
              <>
                <rect x="8" y="11" width="2" height="2" fill="#334155" />
                <rect x="14" y="11" width="2" height="2" fill="#334155" />
                <rect x="8" y="11" width="1" height="1" fill="#ffffff" />
              </>
            )}
            {/* Monocle and its chain */}
            <rect x="13" y="10" width="4" height="1" fill="#eab308" />
            <rect x="13" y="13" width="4" height="1" fill="#eab308" />
            <rect x="13" y="11" width="1" height="2" fill="#eab308" />
            <rect x="17" y="11" width="1" height="2" fill="#eab308" />
            <rect x="18" y="14" width="1" height="1" fill="#ca8a04" />
            <rect x="18" y="16" width="1" height="1" fill="#ca8a04" />
            {/* Thin moustache and mouth */}
            <rect x="10" y="14" width="4" height="1" fill="#64748b" />
            {emotion === 'happy' ? (
              <rect x="10" y="16" width="4" height="1" fill="#7c2d12" />
            ) : (
              <rect x="11" y="16" width="2" height="1" fill="#7c2d12" />
            )}
            {/* Waistcoat, wing collar and bow tie */}
            <rect x="5" y="17" width="14" height="7" fill="#1e293b" />
            <rect x="9" y="17" width="6" height="4" fill="#f8fafc" />
            <rect x="10" y="17" width="4" height="2" fill="#7f1d1d" />
            <rect x="11" y="20" width="2" height="1" fill="#94a3b8" />
            {/* The ledger, always open */}
            <rect x="0" y="15" width="6" height="8" fill="#78350f" />
            <rect x="1" y="16" width="4" height="6" fill="#fef3c7" />
            <rect x="2" y="17" width="2" height="1" fill="#94a3b8" />
            <rect x="2" y="19" width="2" height="1" fill="#94a3b8" />
          </svg>
        );

      // DEFAULT: GENNARO (The Tavern Master: Flat Cap / Coppola, Mustache, Neckerchief)
      case 'gennaro':
      default:
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Coppola / Flat Cap (Grey Tweed) */}
            <rect x="6" y="2" width="12" height="4" fill="#334155" />
            <rect x="4" y="5" width="16" height="3" fill="#475569" />
            <rect x="3" y="7" width="18" height="2" fill="#1e293b" />
            {/* Cap button */}
            <rect x="11" y="2" width="2" height="1" fill="#64748b" />
            {/* Face Skin */}
            <rect x="6" y="9" width="12" height="9" fill="#fcd34d" />
            {/* Ears */}
            <rect x="4" y="11" width="2" height="4" fill="#f59e0b" />
            <rect x="18" y="11" width="2" height="4" fill="#f59e0b" />
            {/* Expressive Eyes */}
            {emotion === 'shocked' ? (
              <>
                <rect x="8" y="10" width="2" height="3" fill="#0f172a" />
                <rect x="14" y="10" width="2" height="3" fill="#0f172a" />
                <rect x="8" y="10" width="1" height="1" fill="#ffffff" />
                <rect x="14" y="10" width="1" height="1" fill="#ffffff" />
                {/* Sweat Drop */}
                <rect x="17" y="8" width="2" height="3" fill="#38bdf8" />
              </>
            ) : emotion === 'angry' ? (
              <>
                <rect x="7" y="10" width="4" height="1" fill="#7f1d1d" />
                <rect x="13" y="10" width="4" height="1" fill="#7f1d1d" />
                <rect x="8" y="11" width="2" height="2" fill="#0f172a" />
                <rect x="14" y="11" width="2" height="2" fill="#0f172a" />
              </>
            ) : (
              <>
                <rect x="8" y="11" width="2" height="2" fill="#0f172a" />
                <rect x="14" y="11" width="2" height="2" fill="#0f172a" />
                <rect x="8" y="11" width="1" height="1" fill="#ffffff" />
                <rect x="14" y="11" width="1" height="1" fill="#ffffff" />
              </>
            )}
            {/* Nose */}
            <rect x="11" y="12" width="2" height="3" fill="#ea580c" />
            {/* Gennaro's Iconic Italian Tavern Mustache */}
            <rect x="6" y="14" width="12" height="3" fill="#1e293b" />
            <rect x="5" y="15" width="2" height="2" fill="#1e293b" />
            <rect x="17" y="15" width="2" height="2" fill="#1e293b" />
            {/* Mouth / Smirk */}
            {emotion === 'happy' ? (
              <rect x="10" y="17" width="4" height="1" fill="#991b1b" />
            ) : (
              <rect x="11" y="17" width="2" height="1" fill="#0f172a" />
            )}
            {/* Red Tavern Neckerchief & Suspenders */}
            <rect x="9" y="19" width="6" height="3" fill="#dc2626" />
            <rect x="4" y="21" width="16" height="3" fill="#f8fafc" />
            <rect x="6" y="21" width="2" height="3" fill="#1e293b" />
            <rect x="16" y="21" width="2" height="3" fill="#1e293b" />
          </svg>
        );
    }
  };

  return (
    <motion.div
      animate={{
        y: [0, -1.5, 0],
        rotate: emotion === 'shocked' ? [-3, 3, -3, 0] : emotion === 'angry' ? [-1, 1, 0] : 0,
      }}
      transition={{
        y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 0.3 },
      }}
      className={`relative inline-flex items-center justify-center select-none ${
        showGlow ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''
      } ${className}`}
    >
      {renderPixelFace()}
      {/* Emotion floating mini-indicator badge */}
      {emotion === 'shocked' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          className="absolute -top-1.5 -right-1.5 text-[10px]"
        >
          💧
        </motion.span>
      )}
      {emotion === 'angry' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          className="absolute -top-1.5 -right-1.5 text-[10px]"
        >
          💢
        </motion.span>
      )}
      {emotion === 'happy' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          className="absolute -top-1.5 -right-1.5 text-[10px]"
        >
          ✨
        </motion.span>
      )}
    </motion.div>
  );
};
