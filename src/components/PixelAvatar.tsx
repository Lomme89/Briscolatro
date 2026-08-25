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

      // 3. LA FATTUCCHIERA DEL VICOLO (Witch Hood, Glowing Violet Eyes, Crystal Magic)
      case 'boss_ante_3':
      case 'fattucchiera':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Pointed Purple Cowl/Hood */}
            <rect x="10" y="1" width="4" height="3" fill="#581c87" />
            <rect x="7" y="4" width="10" height="4" fill="#6b21a8" />
            <rect x="4" y="8" width="16" height="6" fill="#7e22ce" />
            {/* Inner Hood Shadow */}
            <rect x="6" y="8" width="12" height="9" fill="#3b0764" />
            {/* Face in darkness */}
            <rect x="7" y="10" width="10" height="7" fill="#fcd34d" opacity="0.4" />
            {/* Glowing Arcane Amethyst Eyes */}
            <rect x="8" y="11" width="2" height="2" fill="#f43f5e" />
            <rect x="14" y="11" width="2" height="2" fill="#f43f5e" />
            <rect x="9" y="11" width="1" height="1" fill="#ffffff" />
            <rect x="15" y="11" width="1" height="1" fill="#ffffff" />
            {/* Mystical Nose / Lips */}
            <rect x="11" y="13" width="2" height="1" fill="#c084fc" />
            <rect x="10" y="15" width="4" height="1" fill="#ec4899" />
            {/* Robe and Glowing Crystal Orb Pendant */}
            <rect x="5" y="17" width="14" height="7" fill="#4c1d95" />
            <rect x="10" y="19" width="4" height="4" fill="#a855f7" />
            <rect x="11" y="20" width="2" height="2" fill="#38bdf8" />
            <rect x="11" y="20" width="1" height="1" fill="#ffffff" />
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

      // 7. L'ALCHIMISTA OSCURO (Plague Mask / Arcane Hood, Neon Toxic Lenses)
      case 'boss_ante_7':
      case 'alchimista':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} className="pixelated" fill="none">
            {/* Dark Alchemist Hood */}
            <rect x="6" y="1" width="12" height="6" fill="#134e4a" />
            <rect x="4" y="6" width="16" height="6" fill="#042f2e" />
            {/* Glowing Neon Green Goggles */}
            <rect x="6" y="8" width="4" height="4" fill="#22c55e" />
            <rect x="14" y="8" width="4" height="4" fill="#22c55e" />
            <rect x="7" y="9" width="2" height="2" fill="#a7f3d0" />
            <rect x="15" y="9" width="2" height="2" fill="#a7f3d0" />
            <rect x="10" y="9" width="4" height="2" fill="#0f172a" />
            {/* Plague Doctor Beak / Mask */}
            <rect x="10" y="12" width="4" height="4" fill="#e2e8f0" />
            <rect x="11" y="16" width="2" height="4" fill="#cbd5e1" />
            <rect x="11" y="19" width="2" height="2" fill="#94a3b8" />
            {/* Alchemist Flask with bubbling potion in collar */}
            <rect x="4" y="16" width="16" height="8" fill="#0f172a" />
            <rect x="18" y="18" width="3" height="4" fill="#10b981" />
            <rect x="19" y="17" width="1" height="1" fill="#a7f3d0" />
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
