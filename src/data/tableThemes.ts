export interface TableTheme {
  id: string;
  ante: number;
  name: string;
  subtitle: string;
  icon: string;
  feltGradient: string;
  feltBorder: string;
  feltOuterRing: string;
  ambientGlow: string;
  dividerBorder: string;
  cardSlotBorder: string;
  cardSlotBg: string;
  accentBadge: {
    bg: string;
    border: string;
    text: string;
  };
  patternType:
    | 'felt_grain'
    | 'diamonds'
    | 'stage_stars'
    | 'cigar_smoke'
    | 'swords'
    | 'wood_leaves'
    | 'ledger'
    | 'royal_damask';
}

const TABLE_THEMES: TableTheme[] = [
  {
    id: 'theme_rustic_bar',
    ante: 1,
    name: 'Osteria di Paese',
    subtitle: 'Panno Verde Rustico & Legno di Quercia',
    icon: '🍺',
    feltGradient: 'from-[#0e2d1d] via-[#0a2215] to-[#06170d]',
    feltBorder: 'border-amber-900/70',
    feltOuterRing: 'ring-1 ring-amber-700/30',
    ambientGlow: 'rgba(16, 185, 129, 0.08)',
    dividerBorder: 'border-emerald-950/80',
    cardSlotBorder: 'border-emerald-900/50',
    cardSlotBg: 'bg-emerald-950/25',
    accentBadge: {
      bg: 'bg-emerald-950/90',
      border: 'border-emerald-500/60',
      text: 'text-emerald-300',
    },
    patternType: 'felt_grain',
  },
  {
    id: 'theme_bocciodromo',
    ante: 2,
    name: 'Circolo dei Bocciofili',
    subtitle: 'Panno Verde Oliva & Finiture in Ottone',
    icon: '👴',
    feltGradient: 'from-[#1b2b13] via-[#13200d] to-[#0c1408]',
    feltBorder: 'border-yellow-900/70',
    feltOuterRing: 'ring-1 ring-yellow-600/30',
    ambientGlow: 'rgba(234, 179, 8, 0.08)',
    dividerBorder: 'border-yellow-950/80',
    cardSlotBorder: 'border-yellow-900/50',
    cardSlotBg: 'bg-yellow-950/20',
    accentBadge: {
      bg: 'bg-yellow-950/90',
      border: 'border-yellow-500/60',
      text: 'text-yellow-300',
    },
    patternType: 'diamonds',
  },
  {
    id: 'theme_variety_theatre',
    ante: 3,
    name: 'Teatro di Varietà',
    subtitle: 'Velluto Notte, Ottone & Luci di Sipario',
    icon: '🎭',
    feltGradient: 'from-[#221038] via-[#170a27] to-[#0d0418]',
    feltBorder: 'border-purple-900/80',
    feltOuterRing: 'ring-1 ring-purple-600/40',
    ambientGlow: 'rgba(168, 85, 247, 0.15)',
    dividerBorder: 'border-purple-950/90',
    cardSlotBorder: 'border-purple-800/50',
    cardSlotBg: 'bg-purple-950/30',
    accentBadge: {
      bg: 'bg-purple-950/90',
      border: 'border-purple-400/70',
      text: 'text-purple-300',
    },
    patternType: 'stage_stars',
  },
  {
    id: 'theme_clandestine_den',
    ante: 4,
    name: 'Bisca Clandestina',
    subtitle: 'Feltro Fumé Notturno & Atmosfera Noir',
    icon: '🕶️',
    feltGradient: 'from-[#1e1e24] via-[#121217] to-[#09090c]',
    feltBorder: 'border-red-950/90',
    feltOuterRing: 'ring-1 ring-red-900/40',
    ambientGlow: 'rgba(239, 68, 68, 0.1)',
    dividerBorder: 'border-slate-800/80',
    cardSlotBorder: 'border-red-900/40',
    cardSlotBg: 'bg-red-950/20',
    accentBadge: {
      bg: 'bg-slate-900/90',
      border: 'border-red-500/60',
      text: 'text-red-400',
    },
    patternType: 'cigar_smoke',
  },
  {
    id: 'theme_swords_armory',
    ante: 5,
    name: 'Armeria dei Duellanti',
    subtitle: 'Panno Blu Acciaio & Lame Incrociate',
    icon: '⚔️',
    feltGradient: 'from-[#0f1d2e] via-[#09131f] to-[#040910]',
    feltBorder: 'border-blue-900/80',
    feltOuterRing: 'ring-1 ring-cyan-600/40',
    ambientGlow: 'rgba(6, 182, 212, 0.12)',
    dividerBorder: 'border-blue-950/80',
    cardSlotBorder: 'border-blue-800/50',
    cardSlotBg: 'bg-blue-950/25',
    accentBadge: {
      bg: 'bg-blue-950/90',
      border: 'border-cyan-400/60',
      text: 'text-cyan-300',
    },
    patternType: 'swords',
  },
  {
    id: 'theme_oak_tavern',
    ante: 6,
    name: 'Taverna della Quercia',
    subtitle: 'Legno Intagliato & Foglie di Sottobosco',
    icon: '🪵',
    feltGradient: 'from-[#1f2411] via-[#14180a] to-[#0b0d05]',
    feltBorder: 'border-amber-950/90',
    feltOuterRing: 'ring-1 ring-amber-600/40',
    ambientGlow: 'rgba(217, 119, 6, 0.1)',
    dividerBorder: 'border-amber-950/80',
    cardSlotBorder: 'border-amber-900/40',
    cardSlotBg: 'bg-amber-950/20',
    accentBadge: {
      bg: 'bg-amber-950/90',
      border: 'border-amber-500/70',
      text: 'text-amber-300',
    },
    patternType: 'wood_leaves',
  },
  {
    id: 'theme_pawn_shop',
    ante: 7,
    name: 'Banco dei Pegni',
    subtitle: 'Feltro Giada, Ottone Lucido & Registri',
    icon: '💰',
    feltGradient: 'from-[#0a2b22] via-[#051c16] to-[#020e0a]',
    feltBorder: 'border-emerald-800/80',
    feltOuterRing: 'ring-1 ring-teal-500/50',
    ambientGlow: 'rgba(20, 184, 166, 0.16)',
    dividerBorder: 'border-teal-950/80',
    cardSlotBorder: 'border-teal-800/50',
    cardSlotBg: 'bg-teal-950/25',
    accentBadge: {
      bg: 'bg-teal-950/90',
      border: 'border-teal-400/70',
      text: 'text-teal-300',
    },
    patternType: 'ledger',
  },
  {
    id: 'theme_royal_casino',
    ante: 8,
    name: 'Gran Casinò di Briscolatro',
    subtitle: 'Velluto Reale Cremisi, Broccato & Oro 24K',
    icon: '👑',
    feltGradient: 'from-[#3a0d17] via-[#26070e] to-[#140206]',
    feltBorder: 'border-amber-500/90',
    feltOuterRing: 'ring-2 ring-yellow-400/60 shadow-[0_0_20px_rgba(251,191,36,0.3)]',
    ambientGlow: 'rgba(245, 158, 11, 0.2)',
    dividerBorder: 'border-red-950/90',
    cardSlotBorder: 'border-amber-500/60',
    cardSlotBg: 'bg-amber-950/30',
    accentBadge: {
      bg: 'bg-amber-950/95',
      border: 'border-amber-400',
      text: 'text-amber-200',
    },
    patternType: 'royal_damask',
  },
];

export function getTableThemeForAnte(ante: number): TableTheme {
  const index = Math.max(0, (ante - 1) % TABLE_THEMES.length);
  return TABLE_THEMES[index];
}
