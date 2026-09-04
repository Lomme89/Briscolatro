import React from 'react';
import { motion } from 'motion/react';
import { isBossEncounter } from '../game/gameState';
import { getEndlessTier } from '../game/endless';
import {
  BRISCOLA_TARGET_POINTS,
  getVictoryHudPresentation,
  VICTORY_MODES,
  victoryHeadline,
} from '../game/victoryModes';
import { sound } from '../services/soundEngine';
import { RoundSummaryData } from '../types/runSummaries';
import {
  InkButton,
  ReceiptHead,
  ReceiptLine,
  ReceiptPerf,
  ReceiptSheet,
  ReceiptTotal,
  RubberStamp,
} from './diegetic/Receipt';

interface RoundSummaryModalProps {
  isOpen: boolean;
  data: RoundSummaryData | null;
  onContinue: () => void;
}

const it = (n: number) => n.toLocaleString('it-IT');

/**
 * La fine di una manche e' un conto.
 *
 * Era una pila di schede scure dentro un'altra scheda scura, con tre barre di
 * avanzamento a dire quello che i numeri dicevano gia'. Un elenco di voci con
 * una cifra a destra e un totale in fondo e' pero' un oggetto che esiste gia'
 * nel locale, e che tutti sanno leggere senza istruzioni: lo scontrino.
 * L'esito non e' un badge, e' il timbro che ci sbattono sopra.
 */
export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  data,
  onContinue,
}) => {
  if (!isOpen || !data) return null;

  const isBoss = isBossEncounter(data.round);
  const tier = getEndlessTier(data.ante);
  const scoreExceeded = data.victory.chipsPassed;
  const modeInfo = VICTORY_MODES[data.victory.mode];
  const hud = getVictoryHudPresentation(data.victory.mode);
  const headline = victoryHeadline(data.victory, data.playerTrickPoints);
  const totalCash = data.cashEarned + data.interestEarned + data.briscolaBonus;

  const subject = [
    `Ante ${data.ante}`,
    tier ? tier.name : null,
    isBoss ? `Boss · ${data.bossName || 'Il Campione'}` : 'Il Tavolo',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mobile-dialog fixed inset-0 z-50 bg-[rgba(9,6,3,0.86)] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden select-none">
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="w-full max-w-md mx-auto max-h-[94dvh] overflow-y-auto"
      >
        <ReceiptSheet tilt={-0.6}>
          <ReceiptHead place="Osteria Briscolatro" subject={subject} />

          {/* Il timbro arriva dopo il conto, e arriva storto. In riga e non
              sovrapposto: un timbro sopra una cifra e' un timbro che nasconde
              il numero che il giocatore e' venuto a leggere. */}
          <div className="flex justify-end mt-3 mb-1 pr-1">
            <RubberStamp
              text={data.won ? 'Saldato' : 'Insoluto'}
              tone={data.won ? 'green' : 'red'}
              tilt={data.won ? -4 : 3}
            />
          </div>

          <ReceiptPerf className="my-3" />

          <div className="space-y-1.5">
            {hud.showChipsObjective && (
              <div className="mb-3">
                <ReceiptTotal
                  label="Chips fatti"
                  note={`su ${it(data.targetScore)} richiesti`}
                  value={it(data.achievedScore)}
                  tone={scoreExceeded ? 'green' : 'red'}
                />
              </div>
            )}

            <ReceiptLine
              label="Punti briscola tuoi"
              note={`${data.playerTricksWon} prese`}
              value={`${data.playerTrickPoints}`}
            />
            <ReceiptLine
              label="Punti briscola suoi"
              note={`${data.opponentTricksWon} prese`}
              value={`${data.opponentTrickPoints}`}
              tone="dim"
            />
          </div>

          <ReceiptPerf className="my-3.5" />

          {/* Le due condizioni, sempre tutte e due: il confronto fra le due
              anime del gioco e' il motivo per cui esistono le modalita'. */}
          <div className="font-pixel ink-dim text-[8px] uppercase tracking-[0.14em] mb-1.5">
            Come si chiudeva
          </div>
          <div className="space-y-1.5">
            <ReceiptLine
              label="Soglia chips"
              note={modeInfo.needsChips ? 'richiesta' : 'non richiesta'}
              value={`${it(data.achievedScore)} / ${it(data.targetScore)}`}
              tone={modeInfo.needsChips ? (scoreExceeded ? 'ink' : 'red') : 'dim'}
            />
            <ReceiptLine
              label="Soglia briscola"
              note={modeInfo.needsBriscola ? 'richiesta' : 'non richiesta'}
              value={`${data.playerTrickPoints} / ${BRISCOLA_TARGET_POINTS}`}
              tone={
                modeInfo.needsBriscola ? (data.victory.briscolaPassed ? 'ink' : 'red') : 'dim'
              }
            />
          </div>

          {data.won && (
            <>
              <ReceiptPerf className="my-3.5" />
              <div className="space-y-1.5">
                <ReceiptLine label="Ricompensa ante" value={`+$${data.cashEarned}`} />
                {data.interestEarned > 0 && (
                  <ReceiptLine label="Interessi" value={`+$${data.interestEarned}`} />
                )}
                {data.briscolaBonus > 0 && (
                  <ReceiptLine
                    label="Maggioranza briscola"
                    note="oltre 60"
                    value={`+$${data.briscolaBonus}`}
                  />
                )}
                <div className="pt-2.5 mt-1.5 border-t-2 border-double border-[rgba(58,44,24,0.55)]">
                  <ReceiptTotal label="Da incassare" value={`+$${totalCash}`} tone="green" />
                </div>
              </div>
            </>
          )}

          <p className="font-condensed ink text-[19px] sm:text-[22px] leading-snug text-center mt-4">
            {headline}
          </p>

          <div className="mt-4">
            <InkButton
              tone={data.won ? 'ink' : 'red'}
              onClick={() => {
                sound.playCardFlick();
                onContinue();
              }}
            >
              {data.won ? 'Passa alla bottega' : 'Vedi il conto finale'}
            </InkButton>
          </div>
        </ReceiptSheet>
      </motion.div>
    </div>
  );
};
