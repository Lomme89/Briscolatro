import React from 'react';
import { TableTheme } from '../data/tableThemes';

interface TableFeltPatternProps {
  theme: TableTheme;
}

export const TableFeltPattern: React.FC<TableFeltPatternProps> = ({ theme }) => {
  const { patternType } = theme;

  switch (patternType) {
    case 'diamonds':
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-diamonds"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <polygon
                  points="16,4 28,16 16,28 4,16"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1"
                />
                <circle cx="16" cy="16" r="2" fill="#fbbf24" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-diamonds)" />
          </svg>
        </div>
      );

    case 'stage_stars':
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.08] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-stage-stars"
                width="48"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                {/* Marquee stars & footlight bulbs */}
                <polygon
                  points="24,6 28,18 40,24 28,30 24,42 20,30 8,24 20,18"
                  fill="none"
                  stroke="#e9d5a1"
                  strokeWidth="1"
                />
                <circle cx="24" cy="24" r="5" fill="none" stroke="#e9d5a1" strokeWidth="0.8" />
                <circle cx="6" cy="6" r="1.5" fill="#facc15" />
                <circle cx="42" cy="42" r="1.5" fill="#facc15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-stage-stars)" />
          </svg>
        </div>
      );

    case 'cigar_smoke':
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.07] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-smoke"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                {/* Noir crosshatch and dice / spade pip */}
                <path
                  d="M0,20 Q10,10 20,20 T40,20 M0,0 L40,40 M40,0 L0,40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="0.75"
                  strokeDasharray="2,3"
                />
                <circle cx="20" cy="20" r="2.5" fill="#f87171" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-smoke)" />
          </svg>
        </div>
      );

    case 'swords':
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.07] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-swords"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                {/* Crossed blades */}
                <line x1="6" y1="6" x2="30" y2="30" stroke="#38bdf8" strokeWidth="1" />
                <line x1="30" y1="6" x2="6" y2="30" stroke="#38bdf8" strokeWidth="1" />
                <circle cx="18" cy="18" r="3" fill="none" stroke="#67e8f9" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-swords)" />
          </svg>
        </div>
      );

    case 'wood_leaves':
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-wood"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                {/* Oak leaves and acorns */}
                <path
                  d="M18,4 Q24,12 18,20 Q12,12 18,4 Z M4,24 Q12,30 20,24"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="0.9"
                />
                <circle cx="18" cy="30" r="2" fill="#d97706" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-wood)" />
          </svg>
        </div>
      );

    case 'ledger':
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.08] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-ledger"
                width="44"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                {/* Coin stamp & scale pans of the money changer */}
                <circle cx="22" cy="22" r="14" fill="none" stroke="#2dd4bf" strokeWidth="1" />
                <polygon
                  points="22,8 34,29 10,29"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="0.8"
                />
                <polygon
                  points="22,36 10,15 34,15"
                  fill="none"
                  stroke="#5eead4"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-ledger)" />
          </svg>
        </div>
      );

    case 'royal_damask':
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.11] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-royal"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                {/* Royal fleur-de-lis & golden crown lattice */}
                <path
                  d="M20,6 C22,12 28,12 28,16 C28,20 22,22 20,28 C18,22 12,20 12,16 C12,12 18,12 20,6 Z"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                />
                <circle cx="20" cy="20" r="1.5" fill="#fef08a" />
                <circle cx="4" cy="4" r="1.2" fill="#fbbf24" />
                <circle cx="36" cy="4" r="1.2" fill="#fbbf24" />
                <circle cx="4" cy="36" r="1.2" fill="#fbbf24" />
                <circle cx="36" cy="36" r="1.2" fill="#fbbf24" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-royal)" />
          </svg>
        </div>
      );

    case 'felt_grain':
    default:
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] overflow-hidden">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="felt-pattern-grain"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                {/* Italian Briscola Card Suits Minimal Watermark */}
                <circle cx="10" cy="10" r="3" fill="none" stroke="#4ade80" strokeWidth="0.8" />
                <line x1="2" y1="2" x2="6" y2="6" stroke="#4ade80" strokeWidth="0.7" />
                <line x1="14" y1="14" x2="18" y2="18" stroke="#4ade80" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#felt-pattern-grain)" />
          </svg>
        </div>
      );
  }
};
