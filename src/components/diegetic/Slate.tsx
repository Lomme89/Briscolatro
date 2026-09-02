import React from 'react';

/**
 * La lavagna del locale.
 *
 * Un pannello e' un rettangolo che galleggia; questa e' una lavagna appoggiata
 * al tavolo, quindi ha un peso, una cornice, una bacinella per i gessetti e una
 * inclinazione, perche' nessuno la rimette mai dritta.
 */
export function SlateBoard({
  children,
  className = '',
  tilt = -0.7,
  ledge = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Gradi di inclinazione. Zero solo dove la lavagna e' incassata nel layout. */
  tilt?: number;
  ledge?: boolean;
}) {
  return (
    <div
      className={`slate-frame rounded-[10px] p-2.5 sm:p-3 ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <div className="slate-board rounded-[3px] px-4 py-5 sm:px-7 sm:py-6 relative overflow-hidden">
        {children}
      </div>
      {ledge && (
        <div className="slate-ledge h-2 sm:h-2.5 mt-2.5 rounded-b-[4px] relative">
          {/* Il gessetto consumato, dove lo lascia sempre chi ha scritto. */}
          <div className="absolute -top-1 right-5 w-5 h-1.5 rounded-[1px] bg-[#ddd6c6] shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
          <div className="absolute -top-1 right-12 w-3 h-1.5 rounded-[1px] bg-[#e8c766] shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
        </div>
      )}
    </div>
  );
}

/** Una riga tirata a mano sulla lavagna. */
export function ChalkRule({ className = '' }: { className?: string }) {
  return <div className={`chalk-rule ${className}`} aria-hidden />;
}

type ChalkTone = 'chalk' | 'dim' | 'yellow' | 'red' | 'green';

const TONE_CLASS: Record<ChalkTone, string> = {
  chalk: 'chalk',
  dim: 'chalk-dim',
  yellow: 'chalk-yellow',
  red: 'chalk-red',
  green: 'chalk-green',
};

const TONE_STROKE: Record<ChalkTone, string> = {
  chalk: 'rgba(236,229,214,0.85)',
  dim: 'rgba(185,179,163,0.7)',
  yellow: 'rgba(232,199,102,0.85)',
  red: 'rgba(212,117,106,0.85)',
  green: 'rgba(158,201,138,0.85)',
};

/**
 * Una voce della lista.
 *
 * Non e' un bottone colorato: e' una riga scritta a gesso. Lo stato attivo non
 * si prende con un riempimento, si prende ripassando il tratto - che e'
 * esattamente cosa fa chi vuole far notare il piatto del giorno.
 */
export function ChalkEntry({
  label,
  note,
  icon,
  tone = 'chalk',
  size = 'md',
  delay = 0,
  onClick,
  ariaLabel,
}: {
  label: string;
  note?: string;
  icon?: React.ReactNode;
  tone?: ChalkTone;
  size?: 'lg' | 'md' | 'sm';
  /** Secondi. La lista si scrive una voce alla volta. */
  delay?: number;
  onClick: () => void;
  ariaLabel?: string;
}) {
  const text =
    size === 'lg'
      ? 'text-[30px] sm:text-[38px]'
      : size === 'md'
        ? 'text-[24px] sm:text-[29px]'
        : 'text-[19px] sm:text-[23px]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      style={{ animationDelay: `${delay}s` }}
      className="chalk-write group w-full text-left cursor-pointer bg-transparent block focus:outline-none"
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-4">
        {icon && (
          <span
            className={`${TONE_CLASS[tone]} shrink-0 self-center opacity-80 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100`}
            style={{ color: TONE_STROKE[tone] }}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <span
          className={`font-condensed leading-none min-w-0 ${text} ${TONE_CLASS[tone]} uppercase tracking-[0.02em] transition-[filter,opacity] duration-200 opacity-[0.88] group-hover:opacity-100 group-hover:brightness-[1.15] group-focus-visible:opacity-100 group-focus-visible:brightness-[1.15]`}
        >
          {label}
        </span>
        {note && (
          <span className="font-condensed chalk-dim text-[16px] sm:text-[19px] leading-none ml-auto shrink-0 uppercase">
            {note}
          </span>
        )}
      </span>
      {/* Il tratto che si tira sotto la voce mentre la si sceglie. */}
      <span
        className="chalk-underline chalk-rule block mt-1.5 scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
        aria-hidden
      />
    </button>
  );
}

/**
 * Il foglietto incastrato nella cornice: tutto cio' che non e' scritto a gesso
 * perche' non lo ha scritto l'oste.
 */
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
    <div
      className={`bar-paper px-3.5 py-2.5 ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </div>
  );
}
