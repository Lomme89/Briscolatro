import { CardStyle } from '../types/game';

export interface CardStyleDefinition {
  id: CardStyle;
  name: string;
  subtitle: string;
  tag: string;
  icon: string;
  cardBgClass: string;
  cardInnerBg: string;
  cardBorderClass: string;
  cardSelectedRing: string;
  cardBackBg: string;
  cardBackInner: string;
  cardBackBorder: string;
  cardBackText: string;
  cardBackIcons: [string, string, string, string];
  rankTextColor: string;
  pointsBadgeClass: string;
  briscolaBadgeClass: string;
  sealBorderClass: string;
  shimmerBlendClass: string;
  accentColors: {
    asso: string;
    re: string;
    cav: string;
    fan: string;
  };
}

const CARD_STYLES: CardStyleDefinition[] = [
  {
    id: 'classic',
    name: 'Classic Retro',
    subtitle: 'Carte tradizionali con papiro e colori caldi a 8-bit',
    tag: 'ORIGINALE',
    icon: '📜',
    cardBgClass: 'bg-[#fcfbf7] text-slate-900',
    cardInnerBg: 'bg-gradient-to-b from-white/95 via-amber-50/80 to-amber-100/90',
    cardBorderClass: 'border-slate-800',
    cardSelectedRing: 'border-amber-400 ring-3 sm:ring-4 ring-amber-400/70 shadow-xl shadow-amber-500/40',
    cardBackBg: 'bg-slate-900 border-2 sm:border-3 border-amber-600',
    cardBackInner: 'bg-gradient-to-br from-amber-950/90 to-slate-950/95 border-amber-500/40',
    cardBackBorder: 'border-amber-600',
    cardBackText: 'text-amber-400',
    cardBackIcons: ['🪙', '🏆', '⚔️', '🪵'],
    rankTextColor: 'text-slate-900',
    pointsBadgeClass: 'bg-slate-900 text-amber-300',
    briscolaBadgeClass: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-500/40',
    sealBorderClass: 'border-amber-200',
    shimmerBlendClass: 'mix-blend-overlay opacity-80',
    accentColors: {
      asso: 'text-amber-500',
      re: 'text-amber-700',
      cav: 'text-emerald-700',
      fan: 'text-sky-700',
    },
  },
  {
    id: 'neo_noir',
    name: 'Neo-Noir',
    subtitle: 'Finitura carbonio fumé, cromo e dettagli scarlatti ad alto contrasto',
    tag: 'ATMOSFERICO',
    icon: '🕶️',
    cardBgClass: 'bg-[#18181b] text-slate-100',
    cardInnerBg: 'bg-gradient-to-b from-zinc-800/95 via-zinc-900/90 to-black/95',
    cardBorderClass: 'border-zinc-700',
    cardSelectedRing: 'border-red-500 ring-3 sm:ring-4 ring-red-500/70 shadow-xl shadow-red-500/40',
    cardBackBg: 'bg-black border-2 sm:border-3 border-red-800',
    cardBackInner: 'bg-gradient-to-br from-red-950/90 to-zinc-950/95 border-red-700/50',
    cardBackBorder: 'border-red-800',
    cardBackText: 'text-red-400',
    cardBackIcons: ['🩸', '🗡️', '🍷', '🚬'],
    rankTextColor: 'text-zinc-100',
    pointsBadgeClass: 'bg-red-950/90 text-red-300 border border-red-800/60',
    briscolaBadgeClass: 'bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-red-500/50 border border-red-400/40',
    sealBorderClass: 'border-red-400',
    shimmerBlendClass: 'mix-blend-screen opacity-70',
    accentColors: {
      asso: 'text-red-400',
      re: 'text-rose-300',
      cav: 'text-zinc-300',
      fan: 'text-slate-300',
    },
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyber',
    subtitle: 'Stile synthwave futuristico con bagliori ciano, magenta e laser',
    tag: 'FUTURISTICO',
    icon: '⚡',
    cardBgClass: 'bg-[#0b0c16] text-cyan-200',
    cardInnerBg: 'bg-gradient-to-b from-[#1c1836]/90 via-[#0d0d1b]/95 to-[#05050a]/95',
    cardBorderClass: 'border-cyan-500/70',
    cardSelectedRing: 'border-fuchsia-400 ring-3 sm:ring-4 ring-fuchsia-500/80 shadow-xl shadow-fuchsia-500/50',
    cardBackBg: 'bg-[#090a14] border-2 sm:border-3 border-cyan-500',
    cardBackInner: 'bg-gradient-to-br from-purple-950/90 via-indigo-950/90 to-slate-950/95 border-cyan-400/50',
    cardBackBorder: 'border-cyan-500',
    cardBackText: 'text-cyan-300',
    cardBackIcons: ['💾', '⚡', '🌌', '🕹️'],
    rankTextColor: 'text-cyan-100',
    pointsBadgeClass: 'bg-purple-950/90 text-cyan-300 border border-cyan-400/50',
    briscolaBadgeClass: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-cyan-500 text-white shadow-fuchsia-500/60 border border-cyan-300/60',
    sealBorderClass: 'border-cyan-300',
    shimmerBlendClass: 'mix-blend-screen opacity-90',
    accentColors: {
      asso: 'text-cyan-300',
      re: 'text-fuchsia-300',
      cav: 'text-teal-300',
      fan: 'text-pink-300',
    },
  },
];

export function getCardStyleDefinition(styleId?: CardStyle): CardStyleDefinition {
  const found = CARD_STYLES.find((s) => s.id === styleId);
  return found || CARD_STYLES[0];
}
