import React from 'react';

/**
 * Il conto.
 *
 * Un riepilogo di fine manche e' una lista di voci con un numero a destra e un
 * totale in fondo: e' gia' uno scontrino, e non lo era solo perche' era stato
 * disegnato come una pila di schede scure. Qui e' carta da bar, stampata male,
 * strappata dal rotolo.
 */
export function ReceiptSheet({
  children,
  className = '',
  tilt = -0.5,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number;
}) {
  return (
    <div
      className={`bar-paper paper-torn max-w-full px-3.5 py-4 sm:px-6 sm:py-5 ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </div>
  );
}

/** L'intestazione stampata sul rotolo, uguale su ogni conto del locale. */
export function ReceiptHead({ place, subject }: { place: string; subject: string }) {
  return (
    <div className="text-center">
      <div className="font-pixel ink text-[9px] sm:text-[11px] tracking-[0.16em] uppercase">
        {place}
      </div>
      <div className="font-condensed ink-dim text-[15px] sm:text-[17px] uppercase tracking-[0.14em] mt-1">
        {subject}
      </div>
    </div>
  );
}

export function ReceiptPerf({ className = '' }: { className?: string }) {
  return <div className={`receipt-perf ${className}`} aria-hidden />;
}

type InkTone = 'ink' | 'dim' | 'red' | 'green';

const INK: Record<InkTone, string> = {
  ink: 'ink',
  dim: 'ink-dim',
  red: 'ink-red',
  green: 'ink-green',
};

/**
 * Una voce del conto: descrizione a sinistra, puntini di guida, cifra a destra.
 */
export function ReceiptLine({
  label,
  value,
  tone = 'ink',
  strong = false,
  note,
}: {
  label: string;
  value: string;
  tone?: InkTone;
  strong?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-1.5 font-condensed ${
        strong ? 'text-[18px] sm:text-[21px]' : 'text-[15px] sm:text-[17px]'
      }`}
    >
      <span className={`${INK[tone]} uppercase min-w-0 ${strong ? 'font-bold' : ''}`}>{label}</span>
      {note && <span className="ink-dim text-[13px] sm:text-[14px] lowercase">{note}</span>}
      <span className="receipt-leader" aria-hidden />
      <span className={`${INK[tone]} tabular-nums ml-auto shrink-0 ${strong ? 'font-bold' : ''}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * La cifra che si legge da lontano.
 *
 * Su uno scontrino il totale non e' una voce come le altre: sta sotto una
 * riga doppia, in grande, e chi lo guarda vede quella e basta. Le voci sopra
 * servono a spiegarla, non a contendersela.
 */
export function ReceiptTotal({
  label,
  value,
  note,
  tone = 'ink',
}: {
  label: string;
  value: string;
  note?: string;
  tone?: InkTone;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="font-pixel ink-dim text-[8px] sm:text-[9px] uppercase tracking-[0.14em]">
          {label}
        </div>
        {note && (
          <div className="font-condensed ink-dim text-[15px] sm:text-[17px] leading-none mt-1">
            {note}
          </div>
        )}
      </div>
      <div
        className={`font-condensed ${INK[tone]} text-[40px] sm:text-[50px] leading-[0.8] tabular-nums shrink-0`}
      >
        {value}
      </div>
    </div>
  );
}

/** Il timbro di gomma sbattuto sul conto quando si chiude. */
export function RubberStamp({
  text,
  tone = 'red',
  tilt = -7,
  className = '',
}: {
  text: string;
  tone?: 'red' | 'green';
  tilt?: number;
  className?: string;
}) {
  return (
    <div
      className={`rubber-stamp ${tone === 'red' ? 'ink-red' : 'ink-green'} px-3 py-1.5 inline-block ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <span className="font-pixel text-[10px] sm:text-[12px] uppercase font-bold">{text}</span>
    </div>
  );
}

/**
 * Il bottone sul conto: inchiostro premuto sulla carta, non un pulsante di
 * vetro. Si abbassa quando lo premi, perche' e' un timbro.
 */
export function InkButton({
  children,
  onClick,
  tone = 'ink',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'ink' | 'red';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[44px] font-pixel text-[10px] sm:text-[11px] uppercase tracking-[0.12em] cursor-pointer border-2 px-3 py-3 transition-transform duration-100 active:translate-y-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 ${
        tone === 'red'
          ? 'ink-red border-current hover:bg-[rgba(158,58,46,0.12)]'
          : 'ink border-current hover:bg-[rgba(47,36,24,0.1)]'
      }`}
    >
      {children}
    </button>
  );
}
