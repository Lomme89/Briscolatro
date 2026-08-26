import React from 'react';
import { CardStyle, Suit } from '../types/game';

interface Props {
  rank: number;
  suit: Suit;
  style?: CardStyle;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const NeapolitanCardIllustration: React.FC<Props> = ({
  rank,
  suit,
  style = 'classic',
  size = 'md',
}) => {
  const isNoir = style === 'neo_noir';
  const isCyber = style === 'neon_cyber';

  // Palette adaptations for styles
  const goldMain = isNoir ? '#e4e4e7' : isCyber ? '#facc15' : '#f59e0b';
  const goldLight = isNoir ? '#f4f4f5' : isCyber ? '#fef08a' : '#fde047';
  const goldDark = isNoir ? '#71717a' : isCyber ? '#ca8a04' : '#b45309';
  const redMain = isNoir ? '#ef4444' : isCyber ? '#f43f5e' : '#dc2626';
  const redLight = isNoir ? '#fca5a5' : isCyber ? '#fda4af' : '#f87171';
  const greenMain = isNoir ? '#52525b' : isCyber ? '#10b981' : '#15803d';
  const greenLight = isNoir ? '#a1a1aa' : isCyber ? '#6ee7b7' : '#4ade80';
  const steelMain = isNoir ? '#d4d4d8' : isCyber ? '#38bdf8' : '#60a5fa';
  const steelLight = isNoir ? '#ffffff' : isCyber ? '#e0f2fe' : '#dbeafe';
  const darkOutline = isNoir ? '#09090b' : isCyber ? '#020617' : '#1e293b';

  // --- 1. DENARI (COINS / SUNS) ---
  if (suit === 'denari') {
    // Reusable Sun Coin Component
    const SunCoin = ({ cx, cy, r = 16, isSpecial = false }: { cx: number; cy: number; r?: number; isSpecial?: boolean }) => (
      <g transform={`translate(${cx}, ${cy})`}>
        {/* Outer Coin Ring */}
        <circle cx="0" cy="0" r={r} fill={goldDark} />
        <circle cx="0" cy="0" r={r - 1.5} fill={goldMain} />
        <circle cx="0" cy="0" r={r - 3.5} fill={goldLight} />
        {/* Sun Rays */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={-r + 2}
            x2="0"
            y2={-r + 5}
            stroke={goldDark}
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${i * 45})`}
          />
        ))}
        {/* Inner Sun Face */}
        <circle cx="0" cy="0" r={r * 0.52} fill={isSpecial ? '#fef08a' : goldMain} stroke={goldDark} strokeWidth="1" />
        {/* Face details */}
        <circle cx={-r * 0.18} cy={-r * 0.08} r={r * 0.08} fill={darkOutline} />
        <circle cx={r * 0.18} cy={-r * 0.08} r={r * 0.08} fill={darkOutline} />
        <path
          d={`M ${-r * 0.22} ${r * 0.14} Q 0 ${r * 0.32} ${r * 0.22} ${r * 0.14}`}
          stroke={darkOutline}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );

    if (rank === 1) {
      // Asso di Denari: Classic Double Ring with Eagle at top and Golden Sun at bottom
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          {/* Upper Ring with Eagle Heads */}
          <g transform="translate(50, 42)">
            <circle cx="0" cy="0" r="26" fill="none" stroke={goldDark} strokeWidth="5" />
            <circle cx="0" cy="0" r="23" fill="none" stroke={goldLight} strokeWidth="2.5" />
            {/* Double Eagle / Crown */}
            <path d="M -16 -24 Q -22 -14 -12 -12 Q -6 -28 0 -18 Q 6 -28 12 -12 Q 22 -14 16 -24 Z" fill={redMain} stroke={darkOutline} strokeWidth="1" />
            <circle cx="-10" cy="-18" r="1.5" fill="#ffffff" />
            <circle cx="10" cy="-18" r="1.5" fill="#ffffff" />
          </g>
          {/* Middle Ribbon knot */}
          <path d="M 40 68 C 45 64 55 64 60 68 C 65 74 35 74 40 68 Z" fill={redMain} stroke={darkOutline} strokeWidth="1" />
          {/* Lower Large Golden Sun Coin */}
          <SunCoin cx={50} cy={98} r={28} isSpecial={true} />
        </svg>
      );
    }

    if (rank === 2) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <SunCoin cx={50} cy={38} r={20} />
          <SunCoin cx={50} cy={102} r={20} />
        </svg>
      );
    }

    if (rank === 3) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <SunCoin cx={50} cy={32} r={17} />
          <SunCoin cx={28} cy={95} r={17} />
          <SunCoin cx={72} cy={95} r={17} />
        </svg>
      );
    }

    if (rank === 4) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <SunCoin cx={28} cy={34} r={16} />
          <SunCoin cx={72} cy={34} r={16} />
          {/* Central Coat of Arms / Emblem */}
          <g transform="translate(50, 70)">
            <rect x="-14" y="-12" width="28" height="24" rx="4" fill={redMain} stroke={goldDark} strokeWidth="1.5" />
            <path d="M -10 -4 L 10 -4 M -10 4 L 10 4" stroke={goldLight} strokeWidth="1.5" />
            <polygon points="0,-8 5,0 0,8 -5,0" fill={goldLight} />
          </g>
          <SunCoin cx={28} cy={106} r={16} />
          <SunCoin cx={72} cy={106} r={16} />
        </svg>
      );
    }

    if (rank === 5) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <SunCoin cx={26} cy={32} r={15} />
          <SunCoin cx={74} cy={32} r={15} />
          <SunCoin cx={50} cy={70} r={20} isSpecial={true} />
          <SunCoin cx={26} cy={108} r={15} />
          <SunCoin cx={74} cy={108} r={15} />
        </svg>
      );
    }

    if (rank === 6) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <SunCoin cx={30} cy={30} r={14} />
          <SunCoin cx={70} cy={30} r={14} />
          <SunCoin cx={30} cy={70} r={14} />
          <SunCoin cx={70} cy={70} r={14} />
          <SunCoin cx={30} cy={110} r={14} />
          <SunCoin cx={70} cy={110} r={14} />
        </svg>
      );
    }

    if (rank === 7) {
      // Settebello: Iconic central sun with 6 surrounding suns
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[92%]">
          <SunCoin cx={28} cy={28} r={13} />
          <SunCoin cx={72} cy={28} r={13} />
          <SunCoin cx={50} cy={70} r={22} isSpecial={true} />
          <SunCoin cx={22} cy={70} r={13} />
          <SunCoin cx={78} cy={70} r={13} />
          <SunCoin cx={28} cy={112} r={13} />
          <SunCoin cx={72} cy={112} r={13} />
          {/* Radiant Halo for Settebello */}
          <circle cx="50" cy="70" r="26" fill="none" stroke={goldLight} strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      );
    }

    // Court Figures: Fante (8), Cavallo (9), Re (10)
    if (rank === 8) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          {/* Pedestal Base */}
          <rect x="25" y="120" width="50" height="8" rx="2" fill={goldDark} stroke={darkOutline} strokeWidth="1" />
          {/* Fante (Page) Figure */}
          <g transform="translate(50, 68)">
            {/* Legs */}
            <rect x="-10" y="24" width="8" height="28" rx="3" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <rect x="2" y="24" width="8" height="28" rx="3" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
            {/* Tunic / Torso */}
            <path d="M -16 0 L 16 0 L 14 24 L -14 24 Z" fill={redMain} stroke={darkOutline} strokeWidth="1.2" />
            <rect x="-4" y="0" width="8" height="24" fill={goldLight} />
            {/* Head & Renaissance Cap with Feather */}
            <circle cx="0" cy="-14" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -12 -22 Q 0 -30 12 -22 Q 14 -14 -12 -14 Z" fill={goldDark} stroke={darkOutline} strokeWidth="1" />
            <path d="M 8 -26 Q 16 -34 18 -20" stroke={redMain} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Raised Hand holding Sun Coin */}
            <path d="M 14 6 Q 26 0 24 -16" stroke={redMain} strokeWidth="4" fill="none" strokeLinecap="round" />
            <SunCoin cx={26} cy={-22} r={9} />
          </g>
        </svg>
      );
    }

    if (rank === 9) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          {/* Cavallo (Knight on Horse) */}
          <rect x="20" y="120" width="60" height="8" rx="2" fill={goldDark} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(48, 70)">
            {/* Horse Body */}
            <ellipse cx="0" cy="14" rx="24" ry="14" fill="#b45309" stroke={darkOutline} strokeWidth="1.2" />
            {/* Horse Legs */}
            <path d="M -18 24 L -20 48 M -10 26 L -8 48 M 8 26 L 12 48 M 18 24 L 20 48" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            {/* Horse Neck & Head */}
            <path d="M -16 10 Q -24 -6 -30 -10 Q -32 -2 0 4 Z" fill="#92400e" stroke={darkOutline} strokeWidth="1" />
            <ellipse cx="-28" cy="-8" rx="6" ry="4" fill="#78350f" />
            {/* Knight Rider */}
            <circle cx="2" cy="-14" r="8" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -4 -8 L 8 -8 L 6 12 L -6 12 Z" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <path d="M -8 -20 Q 2 -26 12 -20 Z" fill={redMain} />
            {/* Coin raised in hand */}
            <path d="M 6 -2 L 18 -16" stroke={greenMain} strokeWidth="3" strokeLinecap="round" />
            <SunCoin cx={24} cy={-22} r={9} />
          </g>
        </svg>
      );
    }

    if (rank === 10) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          {/* Re di Denari (Standing King) */}
          <rect x="25" y="120" width="50" height="8" rx="2" fill={goldDark} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(50, 64)">
            {/* Royal Cloak */}
            <path d="M -22 8 L -26 52 L 26 52 L 22 8 Z" fill={redMain} stroke={darkOutline} strokeWidth="1.2" />
            {/* Inner Robe */}
            <rect x="-12" y="8" width="24" height="44" fill={goldLight} stroke={darkOutline} strokeWidth="1" />
            {/* King Head & Beard */}
            <circle cx="0" cy="-6" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -8 -4 Q 0 8 8 -4 Z" fill={darkOutline} />
            {/* Crown */}
            <polygon points="-12,-12 -6,-20 0,-14 6,-20 12,-12" fill={goldMain} stroke={darkOutline} strokeWidth="1.2" />
            {/* Sword in Left Hand */}
            <line x1="-18" y1="-4" x2="-22" y2="40" stroke={steelMain} strokeWidth="2.5" strokeLinecap="round" />
            {/* Raised Right Hand holding Sun Coin */}
            <SunCoin cx={24} cy={-18} r={9} />
          </g>
        </svg>
      );
    }
  }

  // --- 2. COPPE (CUPS / CHALICES) ---
  if (suit === 'coppe') {
    // Reusable Neapolitan Cup Component
    const NeapCup = ({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) => (
      <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
        {/* Pedestal Base */}
        <path d="M -12 18 L 12 18 L 8 12 L -8 12 Z" fill={goldDark} stroke={darkOutline} strokeWidth="1" />
        <rect x="-4" y="6" width="8" height="6" fill={goldMain} />
        {/* Cup Bowl */}
        <path d="M -16 -6 C -16 8 16 8 16 -6 Z" fill={redMain} stroke={darkOutline} strokeWidth="1.2" />
        <path d="M -12 -6 C -12 4 12 4 12 -6 Z" fill={redLight} />
        {/* Cup Rim & Band */}
        <rect x="-18" y="-10" width="36" height="4" rx="1.5" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
        <line x1="-14" y1="-8" x2="14" y2="-8" stroke={goldLight} strokeWidth="1.5" />
      </g>
    );

    if (rank === 1) {
      // Asso di Coppe: Ornate Classical Urn with winged handles and lid
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <g transform="translate(50, 70)">
            {/* Base */}
            <path d="M -24 44 L 24 44 L 14 30 L -14 30 Z" fill={goldDark} stroke={darkOutline} strokeWidth="1.5" />
            <rect x="-8" y="20" width="16" height="10" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
            {/* Urn Body */}
            <path d="M -30 -16 C -34 22 34 22 30 -16 Z" fill={greenMain} stroke={darkOutline} strokeWidth="1.5" />
            <path d="M -22 -16 C -26 14 26 14 22 -16 Z" fill={redMain} />
            {/* Face on Vase / Emblem */}
            <circle cx="0" cy="2" r="8" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
            <circle cx="-3" cy="0" r="1" fill={darkOutline} />
            <circle cx="3" cy="0" r="1" fill={darkOutline} />
            <path d="M -3 4 Q 0 7 3 4" stroke={darkOutline} strokeWidth="1" fill="none" />
            {/* Winged Side Handles */}
            <path d="M -30 -12 C -46 -6 -42 16 -24 20" fill="none" stroke={goldMain} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 30 -12 C 46 -6 42 16 24 20" fill="none" stroke={goldMain} strokeWidth="3.5" strokeLinecap="round" />
            {/* Rim & Dome Lid */}
            <rect x="-32" y="-22" width="64" height="6" rx="2" fill={goldMain} stroke={darkOutline} strokeWidth="1.2" />
            <path d="M -20 -22 Q 0 -44 20 -22 Z" fill={goldDark} stroke={darkOutline} strokeWidth="1.2" />
            <circle cx="0" cy="-44" r="5" fill={goldLight} stroke={darkOutline} strokeWidth="1" />
          </g>
        </svg>
      );
    }

    if (rank === 2) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapCup cx={50} cy={38} scale={1.2} />
          <NeapCup cx={50} cy={102} scale={1.2} />
        </svg>
      );
    }

    if (rank === 3) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapCup cx={50} cy={34} scale={1.05} />
          <NeapCup cx={30} cy={98} scale={1.05} />
          <NeapCup cx={70} cy={98} scale={1.05} />
        </svg>
      );
    }

    if (rank === 4) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapCup cx={30} cy={36} scale={0.95} />
          <NeapCup cx={70} cy={36} scale={0.95} />
          <NeapCup cx={30} cy={104} scale={0.95} />
          <NeapCup cx={70} cy={104} scale={0.95} />
        </svg>
      );
    }

    if (rank === 5) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapCup cx={28} cy={32} scale={0.88} />
          <NeapCup cx={72} cy={32} scale={0.88} />
          <NeapCup cx={50} cy={70} scale={1.05} />
          <NeapCup cx={28} cy={108} scale={0.88} />
          <NeapCup cx={72} cy={108} scale={0.88} />
        </svg>
      );
    }

    if (rank === 6) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapCup cx={30} cy={30} scale={0.82} />
          <NeapCup cx={70} cy={30} scale={0.82} />
          <NeapCup cx={30} cy={70} scale={0.82} />
          <NeapCup cx={70} cy={70} scale={0.82} />
          <NeapCup cx={30} cy={110} scale={0.82} />
          <NeapCup cx={70} cy={110} scale={0.82} />
        </svg>
      );
    }

    if (rank === 7) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[92%]">
          <NeapCup cx={28} cy={28} scale={0.78} />
          <NeapCup cx={72} cy={28} scale={0.78} />
          <NeapCup cx={28} cy={66} scale={0.78} />
          <NeapCup cx={50} cy={70} scale={0.88} />
          <NeapCup cx={72} cy={66} scale={0.78} />
          <NeapCup cx={28} cy={112} scale={0.78} />
          <NeapCup cx={72} cy={112} scale={0.78} />
        </svg>
      );
    }

    // Court Figures Coppe
    if (rank === 8) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="25" y="120" width="50" height="8" rx="2" fill={redMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(50, 68)">
            <rect x="-10" y="24" width="8" height="28" rx="3" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
            <rect x="2" y="24" width="8" height="28" rx="3" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <path d="M -16 0 L 16 0 L 14 24 L -14 24 Z" fill={greenMain} stroke={darkOutline} strokeWidth="1.2" />
            <circle cx="0" cy="-14" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -12 -22 Q 0 -30 12 -22 Q 14 -14 -12 -14 Z" fill={redMain} stroke={darkOutline} strokeWidth="1" />
            {/* Cup in hand */}
            <NeapCup cx={-22} cy={-12} scale={0.75} />
          </g>
        </svg>
      );
    }

    if (rank === 9) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="20" y="120" width="60" height="8" rx="2" fill={redMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(48, 70)">
            <ellipse cx="0" cy="14" rx="24" ry="14" fill="#d97706" stroke={darkOutline} strokeWidth="1.2" />
            <path d="M -18 24 L -20 48 M -10 26 L -8 48 M 8 26 L 12 48 M 18 24 L 20 48" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
            <circle cx="2" cy="-14" r="8" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -4 -8 L 8 -8 L 6 12 L -6 12 Z" fill={redMain} stroke={darkOutline} strokeWidth="1" />
            <NeapCup cx={22} cy={-24} scale={0.75} />
          </g>
        </svg>
      );
    }

    if (rank === 10) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="25" y="120" width="50" height="8" rx="2" fill={redMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(50, 64)">
            <path d="M -22 8 L -26 52 L 26 52 L 22 8 Z" fill={greenMain} stroke={darkOutline} strokeWidth="1.2" />
            <rect x="-12" y="8" width="24" height="44" fill={redMain} stroke={darkOutline} strokeWidth="1" />
            <circle cx="0" cy="-6" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <polygon points="-12,-12 -6,-20 0,-14 6,-20 12,-12" fill={goldMain} stroke={darkOutline} strokeWidth="1.2" />
            <line x1="20" y1="0" x2="24" y2="44" stroke={goldLight} strokeWidth="2.5" strokeLinecap="round" />
            <NeapCup cx={-20} cy={0} scale={0.75} />
          </g>
        </svg>
      );
    }
  }

  // --- 3. BASTONI (WOODEN CLUBS / TRUNKS) ---
  if (suit === 'bastoni') {
    // Reusable Neapolitan Curved Bastone Component
    const NeapClub = ({ cx, cy, rotate = 0, scale = 1 }: { cx: number; cy: number; rotate?: number; scale?: number }) => (
      <g transform={`translate(${cx}, ${cy}) rotate(${rotate}) scale(${scale})`}>
        {/* Main curved knobby green wooden trunk */}
        <path
          d="M -5 32 C -7 18 -10 -10 -4 -30 C 0 -36 8 -36 10 -28 C 12 -12 6 18 3 32 Z"
          fill={greenMain}
          stroke={darkOutline}
          strokeWidth="1.2"
        />
        {/* Red Stem / Grip end */}
        <path d="M -5 32 C -6 38 2 40 4 32 Z" fill={redMain} stroke={darkOutline} strokeWidth="1" />
        {/* Sprouting Golden Foliage / Knots */}
        <path d="M -7 -4 Q -16 -12 -10 -16 Q -4 -12 -5 -4" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
        <path d="M 8 4 Q 18 -4 12 -8 Q 6 -4 7 4" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
        <path d="M -6 14 Q -14 8 -10 4 Q -4 8 -5 14" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
        <path d="M 6 22 Q 14 16 10 12 Q 4 16 5 22" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
      </g>
    );

    if (rank === 1) {
      // Asso di Bastoni: Grand curved green mace with sprouting golden leaves
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <NeapClub cx={50} cy={70} rotate={-16} scale={1.45} />
        </svg>
      );
    }

    if (rank === 2) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapClub cx={34} cy={70} rotate={0} scale={1.15} />
          <NeapClub cx={66} cy={70} rotate={0} scale={1.15} />
        </svg>
      );
    }

    if (rank === 3) {
      // 3 Bastoni: Fan crossing at base with central sun mask
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[92%]">
          <NeapClub cx={50} cy={64} rotate={0} scale={1.1} />
          <NeapClub cx={42} cy={68} rotate={-24} scale={1.05} />
          <NeapClub cx={58} cy={68} rotate={24} scale={1.05} />
          {/* Central Mask at base */}
          <g transform="translate(50, 100)">
            <circle cx="0" cy="0" r="10" fill={goldMain} stroke={darkOutline} strokeWidth="1.2" />
            <circle cx="-3" cy="-2" r="1.5" fill={darkOutline} />
            <circle cx="3" cy="-2" r="1.5" fill={darkOutline} />
            <path d="M -4 4 Q 0 7 4 4" stroke={darkOutline} strokeWidth="1.2" fill="none" />
          </g>
        </svg>
      );
    }

    if (rank === 4) {
      // 4 Bastoni: Crossed in pairs forming X
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapClub cx={50} cy={70} rotate={-36} scale={1.05} />
          <NeapClub cx={50} cy={70} rotate={36} scale={1.05} />
          <NeapClub cx={36} cy={70} rotate={-15} scale={0.9} />
          <NeapClub cx={64} cy={70} rotate={15} scale={0.9} />
        </svg>
      );
    }

    if (rank === 5) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapClub cx={32} cy={40} rotate={-15} scale={0.78} />
          <NeapClub cx={68} cy={40} rotate={15} scale={0.78} />
          <NeapClub cx={50} cy={70} rotate={90} scale={0.88} />
          <NeapClub cx={32} cy={102} rotate={-15} scale={0.78} />
          <NeapClub cx={68} cy={102} rotate={15} scale={0.78} />
        </svg>
      );
    }

    if (rank === 6) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapClub cx={28} cy={42} rotate={-10} scale={0.75} />
          <NeapClub cx={50} cy={42} rotate={0} scale={0.75} />
          <NeapClub cx={72} cy={42} rotate={10} scale={0.75} />
          <NeapClub cx={28} cy={98} rotate={-10} scale={0.75} />
          <NeapClub cx={50} cy={98} rotate={0} scale={0.75} />
          <NeapClub cx={72} cy={98} rotate={10} scale={0.75} />
        </svg>
      );
    }

    if (rank === 7) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[92%]">
          <NeapClub cx={28} cy={36} rotate={-10} scale={0.7} />
          <NeapClub cx={50} cy={36} rotate={0} scale={0.7} />
          <NeapClub cx={72} cy={36} rotate={10} scale={0.7} />
          <NeapClub cx={50} cy={70} rotate={90} scale={0.8} />
          <NeapClub cx={28} cy={104} rotate={-10} scale={0.7} />
          <NeapClub cx={50} cy={104} rotate={0} scale={0.7} />
          <NeapClub cx={72} cy={104} rotate={10} scale={0.7} />
        </svg>
      );
    }

    // Court Figures Bastoni
    if (rank === 8) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="25" y="120" width="50" height="8" rx="2" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(50, 68)">
            <rect x="-10" y="24" width="8" height="28" rx="3" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <rect x="2" y="24" width="8" height="28" rx="3" fill={redMain} stroke={darkOutline} strokeWidth="1" />
            <path d="M -16 0 L 16 0 L 14 24 L -14 24 Z" fill={goldDark} stroke={darkOutline} strokeWidth="1.2" />
            <circle cx="0" cy="-14" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -12 -22 Q 0 -30 12 -22 Q 14 -14 -12 -14 Z" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <NeapClub cx={22} cy={-2} rotate={-12} scale={0.65} />
          </g>
        </svg>
      );
    }

    if (rank === 9) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="20" y="120" width="60" height="8" rx="2" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(48, 70)">
            <ellipse cx="0" cy="14" rx="24" ry="14" fill="#a16207" stroke={darkOutline} strokeWidth="1.2" />
            <path d="M -18 24 L -20 48 M -10 26 L -8 48 M 8 26 L 12 48 M 18 24 L 20 48" stroke="#713f12" strokeWidth="3" strokeLinecap="round" />
            <circle cx="2" cy="-14" r="8" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -4 -8 L 8 -8 L 6 12 L -6 12 Z" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <NeapClub cx={22} cy={-20} rotate={20} scale={0.65} />
          </g>
        </svg>
      );
    }

    if (rank === 10) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="25" y="120" width="50" height="8" rx="2" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(50, 64)">
            <path d="M -22 8 L -26 52 L 26 52 L 22 8 Z" fill={redMain} stroke={darkOutline} strokeWidth="1.2" />
            <rect x="-12" y="8" width="24" height="44" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <circle cx="0" cy="-6" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <polygon points="-12,-12 -6,-20 0,-14 6,-20 12,-12" fill={goldMain} stroke={darkOutline} strokeWidth="1.2" />
            <NeapClub cx={22} cy={16} rotate={0} scale={0.7} />
          </g>
        </svg>
      );
    }
  }

  // --- 4. SPADE (SWORDS / SCIMITARS) ---
  if (suit === 'spade') {
    // Reusable Straight Neapolitan Sword Component
    const NeapSword = ({ cx, cy, rotate = 0, scale = 1 }: { cx: number; cy: number; rotate?: number; scale?: number }) => (
      <g transform={`translate(${cx}, ${cy}) rotate(${rotate}) scale(${scale})`}>
        {/* Steel Blade */}
        <polygon points="-3,20 0,38 3,20 2,-28 -2,-28" fill={steelMain} stroke={darkOutline} strokeWidth="1" />
        <line x1="0" y1="-26" x2="0" y2="34" stroke={steelLight} strokeWidth="1.2" />
        {/* Golden Crossguard */}
        <path d="M -14 -28 L 14 -28 L 12 -32 L -12 -32 Z" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
        <circle cx="-13" cy="-30" r="2.5" fill={goldDark} />
        <circle cx="13" cy="-30" r="2.5" fill={goldDark} />
        {/* Hilt and Pommel */}
        <rect x="-2" y="-38" width="4" height="6" fill={darkOutline} />
        <circle cx="0" cy="-41" r="3.5" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
      </g>
    );

    if (rank === 1) {
      // Asso di Spade: Curved Scimitar coiled with scabbard & ribbon
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <g transform="translate(50, 70)">
            {/* Scabbard / Serpent Ribbon coil */}
            <path
              d="M -18 36 C -32 10 -22 -20 -4 -38 C 14 -28 10 -4 -8 18 C -14 26 -16 32 -18 36 Z"
              fill={darkOutline}
              stroke={steelMain}
              strokeWidth="1.2"
            />
            {/* Curved Steel Blade */}
            <path
              d="M -12 32 C -24 8 -16 -16 4 -32 C 12 -22 6 2 -6 18 Z"
              fill={steelMain}
              stroke={darkOutline}
              strokeWidth="1.2"
            />
            <path d="M -10 26 C -20 6 -12 -12 2 -26" stroke={steelLight} strokeWidth="1.5" fill="none" />
            {/* Crossguard & Pommel */}
            <g transform="translate(-16, 36) rotate(45)">
              <rect x="-10" y="-3" width="20" height="6" rx="2" fill={goldMain} stroke={darkOutline} strokeWidth="1" />
              <rect x="-2" y="3" width="4" height="8" fill={redMain} />
              <circle cx="0" cy="12" r="3.5" fill={goldDark} />
            </g>
            {/* Flowing Ribbon */}
            <path d="M 0 -8 C 18 4 22 24 10 38" stroke={redMain} strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      );
    }

    if (rank === 2) {
      // 2 Spade: Connected by flowing red ribbon
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapSword cx={34} cy={70} scale={1.1} />
          <NeapSword cx={66} cy={70} scale={1.1} />
          {/* Swirling Red Ribbon */}
          <path d="M 34 50 C 50 36 50 84 66 70" stroke={redMain} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 34 76 C 50 90 50 42 66 56" stroke={redMain} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }

    if (rank === 3) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapSword cx={26} cy={70} scale={1.05} />
          <NeapSword cx={50} cy={70} scale={1.05} />
          <NeapSword cx={74} cy={70} scale={1.05} />
          {/* Interlacing Ribbon */}
          <path d="M 26 60 Q 50 40 74 60 Q 50 80 26 60" stroke={redMain} strokeWidth="3" fill="none" />
        </svg>
      );
    }

    if (rank === 4) {
      // 4 Spade: Crossed in pairs with central floral wreath
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapSword cx={50} cy={70} rotate={-35} scale={1.05} />
          <NeapSword cx={50} cy={70} rotate={35} scale={1.05} />
          {/* Central Floral Laurel Wreath */}
          <g transform="translate(50, 70)">
            <circle cx="0" cy="0" r="14" fill="none" stroke={greenMain} strokeWidth="3" />
            <circle cx="0" cy="0" r="10" fill={goldLight} />
            <circle cx="-5" cy="-5" r="2" fill={redMain} />
            <circle cx="5" cy="5" r="2" fill={redMain} />
          </g>
        </svg>
      );
    }

    if (rank === 5) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapSword cx={28} cy={40} scale={0.78} />
          <NeapSword cx={72} cy={40} scale={0.78} />
          <NeapSword cx={50} cy={70} rotate={90} scale={0.88} />
          <NeapSword cx={28} cy={102} scale={0.78} />
          <NeapSword cx={72} cy={102} scale={0.78} />
        </svg>
      );
    }

    if (rank === 6) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[90%]">
          <NeapSword cx={28} cy={40} scale={0.75} />
          <NeapSword cx={50} cy={40} scale={0.75} />
          <NeapSword cx={72} cy={40} scale={0.75} />
          <NeapSword cx={28} cy={100} scale={0.75} />
          <NeapSword cx={50} cy={100} scale={0.75} />
          <NeapSword cx={72} cy={100} scale={0.75} />
        </svg>
      );
    }

    if (rank === 7) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[92%]">
          <NeapSword cx={28} cy={36} scale={0.7} />
          <NeapSword cx={50} cy={36} scale={0.7} />
          <NeapSword cx={72} cy={36} scale={0.7} />
          <NeapSword cx={50} cy={70} rotate={90} scale={0.8} />
          <NeapSword cx={28} cy={104} scale={0.7} />
          <NeapSword cx={50} cy={104} scale={0.7} />
          <NeapSword cx={72} cy={104} scale={0.7} />
        </svg>
      );
    }

    // Court Figures Spade
    if (rank === 8) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="25" y="120" width="50" height="8" rx="2" fill={steelMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(50, 68)">
            <rect x="-10" y="24" width="8" height="28" rx="3" fill={greenMain} stroke={darkOutline} strokeWidth="1" />
            <rect x="2" y="24" width="8" height="28" rx="3" fill={redMain} stroke={darkOutline} strokeWidth="1" />
            <path d="M -16 0 L 16 0 L 14 24 L -14 24 Z" fill={redMain} stroke={darkOutline} strokeWidth="1.2" />
            <circle cx="0" cy="-14" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -12 -22 Q 0 -30 12 -22 Q 14 -14 -12 -14 Z" fill={goldDark} stroke={darkOutline} strokeWidth="1" />
            <NeapSword cx={24} cy={0} scale={0.65} />
          </g>
        </svg>
      );
    }

    if (rank === 9) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="20" y="120" width="60" height="8" rx="2" fill={steelMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(48, 70)">
            <ellipse cx="0" cy="14" rx="24" ry="14" fill="#64748b" stroke={darkOutline} strokeWidth="1.2" />
            <path d="M -18 24 L -20 48 M -10 26 L -8 48 M 8 26 L 12 48 M 18 24 L 20 48" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            <circle cx="2" cy="-14" r="8" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <path d="M -4 -8 L 8 -8 L 6 12 L -6 12 Z" fill={steelMain} stroke={darkOutline} strokeWidth="1" />
            <NeapSword cx={22} cy={-22} rotate={-35} scale={0.65} />
          </g>
        </svg>
      );
    }

    if (rank === 10) {
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full max-h-[95%]">
          <rect x="25" y="120" width="50" height="8" rx="2" fill={steelMain} stroke={darkOutline} strokeWidth="1" />
          <g transform="translate(50, 64)">
            <path d="M -22 8 L -26 52 L 26 52 L 22 8 Z" fill={steelMain} stroke={darkOutline} strokeWidth="1.2" />
            <rect x="-12" y="8" width="24" height="44" fill={redMain} stroke={darkOutline} strokeWidth="1" />
            <circle cx="0" cy="-6" r="10" fill="#fde047" stroke={darkOutline} strokeWidth="1" />
            <polygon points="-12,-12 -6,-20 0,-14 6,-20 12,-12" fill={goldMain} stroke={darkOutline} strokeWidth="1.2" />
            <NeapSword cx={-20} cy={14} scale={0.75} />
          </g>
        </svg>
      );
    }
  }

  return null;
};
