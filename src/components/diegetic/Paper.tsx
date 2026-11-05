import React from 'react';

/**
 * Il menù dell'osteria.
 *
 * Prima era una lavagna: gesso chiaro su ardesia scura, con alone di polvere.
 * Bello da vedere, faticoso da leggere: poco contrasto, glow che sfoca i bordi,
 * testo grigio su grigio. La carta stampata e' lo stesso locale, ma con
 * inchiostro scuro su fondo chiaro - il contrasto piu' alto che un tavolo
 * verde e scuro possa offrire. Lo scontrino lo usava gia'; ora lo usa tutto
 * cio' che va letto.
 */
export function MenuCard({
  children,
  className = '',
  tilt = -0.6,
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Gradi di inclinazione. Zero dove la carta e' incassata nel layout. */
  tilt?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`menu-card bar-paper rounded-[4px] ${compact ? 'p-1.5' : 'p-2 sm:p-2.5'} ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <div className={`menu-card-inner rounded-[2px] ${compact ? 'px-3 py-3 sm:px-4' : 'px-4 py-5 sm:px-7 sm:py-6'} relative`}>
        {children}
      </div>
    </div>
  );
}

/** Il filetto tipografico fra le sezioni del menù. */
export function MenuRule({ className = '' }: { className?: string }) {
  return <div className={`menu-rule ${className}`} aria-hidden />;
}

type MenuTone = 'ink' | 'dim' | 'accent' | 'red' | 'green';

const TONE_CLASS: Record<MenuTone, string> = {
  ink: 'ink',
  dim: 'ink-dim',
  accent: 'ink',
  red: 'ink-red',
  green: 'ink-green',
};

/**
 * Una voce del menù. L'etichetta dice cosa fa; la nota a destra e' il colore
 * del locale, mai l'informazione.
 */
export function MenuEntry({
  label,
  note,
  icon,
  tone = 'ink',
  size = 'md',
  onClick,
  ariaLabel,
}: {
  label: string;
  note?: string;
  icon?: React.ReactNode;
  tone?: MenuTone;
  size?: 'lg' | 'md' | 'sm';
  onClick: () => void;
  ariaLabel?: string;
}) {
  const text =
    size === 'lg' ? 'text-[24px] sm:text-[27px]' : size === 'md' ? 'text-[20px] sm:text-[22px]' : 'text-[18px] sm:text-[20px]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`menu-entry group w-full text-left cursor-pointer block rounded-[3px] px-2.5 py-2 -mx-2.5 ${size === 'lg' ? 'menu-entry-primary' : ''}`}
    >
      <span className="flex items-center gap-3">
        {icon && (
          <span className={`${TONE_CLASS[tone]} shrink-0`} aria-hidden>
            {icon}
          </span>
        )}
        {/* Sul telefono la nota va sotto: l'etichetta non deve mai andare a capo. */}
        <span className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 min-w-0 flex-1">
          <span className={`font-pixel leading-tight whitespace-nowrap ${text} ${TONE_CLASS[tone]}`}>{label}</span>
          {note && (
            <span className="font-retro ink-dim text-[14px] sm:text-[15px] leading-none sm:ml-auto sm:text-right">
              {note}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/** Il foglietto incastrato: avvisi e regole del boss. */
export function PaperScrap({
  children,
  className = '',
  tilt = 1.4,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number;
}) {
  return (
    <div className={`bar-paper px-3.5 py-2.5 ${className}`} style={{ transform: `rotate(${tilt}deg)` }}>
      {children}
    </div>
  );
}
