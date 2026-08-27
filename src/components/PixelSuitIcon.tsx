import React from 'react';
import { CardStyle, Suit } from '../types/game';

interface Props {
  suit: Suit;
  className?: string;
  size?: number;
  style?: CardStyle;
}

export const PixelSuitIcon: React.FC<Props> = ({ suit, className = '', size = 24, style }) => {
  const activeStyle = style || 'classic';

  // --- 1. NEO-NOIR SUIT ASSETS ---
  if (activeStyle === 'neo_noir') {
    switch (suit) {
      case 'denari':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Dark Onyx & Silver Coin */}
            <rect x="6" y="2" width="12" height="2" fill="#52525b" />
            <rect x="4" y="4" width="2" height="2" fill="#52525b" />
            <rect x="18" y="4" width="2" height="2" fill="#52525b" />
            <rect x="2" y="6" width="2" height="12" fill="#3f3f46" />
            <rect x="20" y="6" width="2" height="12" fill="#3f3f46" />
            <rect x="4" y="18" width="2" height="2" fill="#52525b" />
            <rect x="18" y="18" width="2" height="2" fill="#52525b" />
            <rect x="6" y="20" width="12" height="2" fill="#52525b" />
            {/* Platinum Fill */}
            <rect x="6" y="4" width="12" height="16" fill="#e4e4e7" />
            <rect x="4" y="6" width="16" height="12" fill="#d4d4d8" />
            <rect x="6" y="6" width="12" height="12" fill="#f4f4f5" />
            {/* Blood Ruby Core Glint */}
            <rect x="11" y="7" width="2" height="10" fill="#991b1b" />
            <rect x="7" y="11" width="10" height="2" fill="#991b1b" />
            <rect x="9" y="9" width="6" height="6" fill="#dc2626" />
            <rect x="11" y="11" width="2" height="2" fill="#fecaca" />
          </svg>
        );

      case 'coppe':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Dark Gothic Goblet Rim */}
            <rect x="5" y="3" width="14" height="2" fill="#71717a" />
            <rect x="4" y="5" width="16" height="3" fill="#b91c1c" />
            {/* Red Elixir Bowl */}
            <rect x="6" y="8" width="12" height="4" fill="#991b1b" />
            <rect x="8" y="12" width="8" height="3" fill="#7f1d1d" />
            <rect x="10" y="15" width="4" height="4" fill="#52525b" />
            {/* Base */}
            <rect x="6" y="19" width="12" height="2" fill="#3f3f46" />
            <rect x="4" y="21" width="16" height="2" fill="#27272a" />
            {/* Glint */}
            <rect x="8" y="6" width="3" height="3" fill="#f87171" />
            <rect x="11" y="10" width="2" height="2" fill="#ffffff" />
          </svg>
        );

      case 'spade':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Chrome Blade */}
            <rect x="11" y="2" width="2" height="3" fill="#f4f4f5" />
            <rect x="10" y="5" width="4" height="3" fill="#ffffff" />
            <rect x="9" y="8" width="5" height="4" fill="#e4e4e7" />
            <rect x="8" y="12" width="5" height="3" fill="#a1a1aa" />
            <rect x="9" y="15" width="4" height="2" fill="#71717a" />
            {/* Gunmetal Crossguard */}
            <rect x="5" y="17" width="14" height="2" fill="#27272a" />
            <rect x="4" y="16" width="2" height="4" fill="#ef4444" />
            <rect x="18" y="16" width="2" height="4" fill="#ef4444" />
            {/* Handle & Ruby Pommel */}
            <rect x="11" y="19" width="2" height="3" fill="#18181b" />
            <rect x="10" y="22" width="4" height="2" fill="#dc2626" />
            {/* Sharp Reflection */}
            <rect x="11" y="5" width="1" height="8" fill="#ffffff" />
          </svg>
        );

      case 'bastoni':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Smoked Ebony Club */}
            <rect x="10" y="2" width="4" height="4" fill="#27272a" />
            <rect x="9" y="6" width="6" height="5" fill="#3f3f46" />
            <rect x="10" y="11" width="4" height="5" fill="#27272a" />
            <rect x="9" y="16" width="6" height="4" fill="#18181b" />
            <rect x="11" y="20" width="2" height="3" fill="#09090b" />
            {/* Rose Thorn Accents */}
            <rect x="6" y="7" width="3" height="2" fill="#f43f5e" />
            <rect x="5" y="8" width="2" height="2" fill="#e11d48" />
            <rect x="15" y="12" width="3" height="2" fill="#f43f5e" />
            <rect x="17" y="13" width="2" height="2" fill="#e11d48" />
            {/* Silver Edge */}
            <rect x="11" y="4" width="1" height="4" fill="#e4e4e7" />
            <rect x="12" y="12" width="1" height="4" fill="#e4e4e7" />
          </svg>
        );
    }
  }

  // --- 2. NEON CYBER SUIT ASSETS ---
  if (activeStyle === 'neon_cyber') {
    switch (suit) {
      case 'denari':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Cyber Data Coin Outer Ring */}
            <rect x="6" y="2" width="12" height="2" fill="#06b6d4" />
            <rect x="4" y="4" width="2" height="2" fill="#06b6d4" />
            <rect x="18" y="4" width="2" height="2" fill="#06b6d4" />
            <rect x="2" y="6" width="2" height="12" fill="#0891b2" />
            <rect x="20" y="6" width="2" height="12" fill="#0891b2" />
            <rect x="4" y="18" width="2" height="2" fill="#06b6d4" />
            <rect x="18" y="18" width="2" height="2" fill="#06b6d4" />
            <rect x="6" y="20" width="12" height="2" fill="#06b6d4" />
            {/* Neon Gold Disc */}
            <rect x="6" y="4" width="12" height="16" fill="#facc15" />
            <rect x="4" y="6" width="16" height="12" fill="#fbbf24" />
            <rect x="6" y="6" width="12" height="12" fill="#fef08a" />
            {/* Cyber Matrix Core */}
            <rect x="11" y="7" width="2" height="10" fill="#06b6d4" />
            <rect x="7" y="11" width="10" height="2" fill="#06b6d4" />
            <rect x="9" y="9" width="6" height="6" fill="#38bdf8" />
            <rect x="11" y="11" width="2" height="2" fill="#ffffff" />
          </svg>
        );

      case 'coppe':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Synthwave Plasma Goblet */}
            <rect x="5" y="3" width="14" height="2" fill="#ec4899" />
            <rect x="4" y="5" width="16" height="3" fill="#f472b6" />
            {/* Magenta Chalice */}
            <rect x="6" y="8" width="12" height="4" fill="#db2777" />
            <rect x="8" y="12" width="8" height="3" fill="#be185d" />
            <rect x="10" y="15" width="4" height="4" fill="#06b6d4" />
            {/* Laser Base */}
            <rect x="6" y="19" width="12" height="2" fill="#831843" />
            <rect x="4" y="21" width="16" height="2" fill="#06b6d4" />
            {/* Neon Cyan & White Plasma Glow */}
            <rect x="8" y="6" width="3" height="3" fill="#67e8f9" />
            <rect x="11" y="10" width="2" height="2" fill="#ffffff" />
          </svg>
        );

      case 'spade':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Neon Laser Blade */}
            <rect x="11" y="2" width="2" height="3" fill="#67e8f9" />
            <rect x="10" y="5" width="4" height="3" fill="#a5f3fc" />
            <rect x="9" y="8" width="5" height="4" fill="#38bdf8" />
            <rect x="8" y="12" width="5" height="3" fill="#0284c7" />
            <rect x="9" y="15" width="4" height="2" fill="#0369a1" />
            {/* Electric Magenta Guard */}
            <rect x="5" y="17" width="14" height="2" fill="#ec4899" />
            <rect x="4" y="16" width="2" height="4" fill="#f472b6" />
            <rect x="18" y="16" width="2" height="4" fill="#f472b6" />
            {/* Grip */}
            <rect x="11" y="19" width="2" height="3" fill="#1e1b4b" />
            <rect x="10" y="22" width="4" height="2" fill="#06b6d4" />
            {/* Electric Beam Spine */}
            <rect x="11" y="5" width="1" height="8" fill="#ffffff" />
          </svg>
        );

      case 'bastoni':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`pixelated ${className}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Matrix Data Baton */}
            <rect x="10" y="2" width="4" height="4" fill="#059669" />
            <rect x="9" y="6" width="6" height="5" fill="#10b981" />
            <rect x="10" y="11" width="4" height="5" fill="#059669" />
            <rect x="9" y="16" width="6" height="4" fill="#047857" />
            <rect x="11" y="20" width="2" height="3" fill="#064e3b" />
            {/* Cyan & Lime Nodes */}
            <rect x="6" y="7" width="3" height="2" fill="#67e8f9" />
            <rect x="5" y="8" width="2" height="2" fill="#4ade80" />
            <rect x="15" y="12" width="3" height="2" fill="#67e8f9" />
            <rect x="17" y="13" width="2" height="2" fill="#4ade80" />
            {/* Circuit Line */}
            <rect x="11" y="4" width="1" height="4" fill="#a7f3d0" />
            <rect x="12" y="12" width="1" height="4" fill="#a7f3d0" />
          </svg>
        );
    }
  }

  // --- 3. CLASSIC RETRO (DEFAULT) ---
  switch (suit) {
    case 'denari':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`pixelated ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pixel Coin Outer Ring */}
          <rect x="6" y="2" width="12" height="2" fill="#d97706" />
          <rect x="4" y="4" width="2" height="2" fill="#d97706" />
          <rect x="18" y="4" width="2" height="2" fill="#d97706" />
          <rect x="2" y="6" width="2" height="12" fill="#d97706" />
          <rect x="20" y="6" width="2" height="12" fill="#d97706" />
          <rect x="4" y="18" width="2" height="2" fill="#d97706" />
          <rect x="18" y="18" width="2" height="2" fill="#d97706" />
          <rect x="6" y="20" width="12" height="2" fill="#d97706" />
          {/* Gold Coin Fill */}
          <rect x="6" y="4" width="12" height="16" fill="#fbbf24" />
          <rect x="4" y="6" width="16" height="12" fill="#f59e0b" />
          <rect x="6" y="6" width="12" height="12" fill="#fde047" />
          {/* Sun Rays / Star Center */}
          <rect x="11" y="7" width="2" height="10" fill="#b45309" />
          <rect x="7" y="11" width="10" height="2" fill="#b45309" />
          <rect x="9" y="9" width="6" height="6" fill="#f59e0b" />
          <rect x="11" y="11" width="2" height="2" fill="#ffffff" />
        </svg>
      );

    case 'coppe':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`pixelated ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Goblet Rim */}
          <rect x="5" y="3" width="14" height="2" fill="#ef4444" />
          <rect x="4" y="5" width="16" height="3" fill="#f87171" />
          {/* Cup Bowl */}
          <rect x="6" y="8" width="12" height="4" fill="#ef4444" />
          <rect x="8" y="12" width="8" height="3" fill="#dc2626" />
          <rect x="10" y="15" width="4" height="4" fill="#fbbf24" />
          {/* Base */}
          <rect x="6" y="19" width="12" height="2" fill="#b45309" />
          <rect x="4" y="21" width="16" height="2" fill="#f59e0b" />
          {/* Wine / Gold Glint */}
          <rect x="8" y="6" width="3" height="3" fill="#fef08a" />
          <rect x="11" y="10" width="2" height="2" fill="#fef08a" />
        </svg>
      );

    case 'spade':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`pixelated ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Curved Sword Blade */}
          <rect x="11" y="2" width="2" height="3" fill="#93c5fd" />
          <rect x="10" y="5" width="4" height="3" fill="#e0f2fe" />
          <rect x="9" y="8" width="5" height="4" fill="#93c5fd" />
          <rect x="8" y="12" width="5" height="3" fill="#60a5fa" />
          <rect x="9" y="15" width="4" height="2" fill="#3b82f6" />
          {/* Crossguard */}
          <rect x="5" y="17" width="14" height="2" fill="#d97706" />
          <rect x="4" y="16" width="2" height="4" fill="#fbbf24" />
          <rect x="18" y="16" width="2" height="4" fill="#fbbf24" />
          {/* Hilt and Pommel */}
          <rect x="11" y="19" width="2" height="3" fill="#78350f" />
          <rect x="10" y="22" width="4" height="2" fill="#d97706" />
          {/* Blade Highlight */}
          <rect x="11" y="5" width="1" height="8" fill="#ffffff" />
        </svg>
      );

    case 'bastoni':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`pixelated ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Knotted Club Trunk */}
          <rect x="10" y="2" width="4" height="4" fill="#15803d" />
          <rect x="9" y="6" width="6" height="5" fill="#16a34a" />
          <rect x="10" y="11" width="4" height="5" fill="#15803d" />
          <rect x="9" y="16" width="6" height="4" fill="#166534" />
          <rect x="11" y="20" width="2" height="3" fill="#14532d" />
          {/* Sprouting Green Leaves */}
          <rect x="6" y="7" width="3" height="2" fill="#4ade80" />
          <rect x="5" y="8" width="2" height="2" fill="#22c55e" />
          <rect x="15" y="12" width="3" height="2" fill="#4ade80" />
          <rect x="17" y="13" width="2" height="2" fill="#22c55e" />
          {/* Wood Grain Highlights */}
          <rect x="11" y="4" width="1" height="4" fill="#86efac" />
          <rect x="12" y="12" width="1" height="4" fill="#86efac" />
        </svg>
      );
  }
};
