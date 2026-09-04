import React from 'react';
import { isBossEncounter } from '../game/gameState';
import { motion } from 'motion/react';
import { sound } from '../services/soundEngine';
import { CardFaceArt, getJokerArtUrl } from './CardFaceArt';
import { GameOverSummaryData } from '../types/runSummaries';
import {
  InkButton,
  ReceiptHead,
  ReceiptLine,
  ReceiptPerf,
  ReceiptSheet,
  RubberStamp,
} from './diegetic/Receipt';

interface GameOverModalProps {
  isOpen: boolean;
  summary: GameOverSummaryData;
  onPlayAgain: () => void;
  onChangeDeck: () => void;
}

const it = (n: number) => n.toLocaleString('it-IT');

/**
 * La fine della serata e' il conto della serata.
 *
 * Prima erano quattro schede metriche in griglia dentro una scheda, cioe' il
 * template che qualunque prodotto usa per qualunque riepilogo. Il locale ne ha
 * gia' uno suo: il foglio che ti mettono davanti quando ti alzi, con tutto
 * quello che hai consumato e un timbro sopra.
 */
export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  summary,
  onPlayAgain,
  onChangeDeck,
}) => {
  if (!isOpen) return null;

  const {
    won,
    ante,
    round,
    totalScore,
    targetScore,
    totalTricksWon,
    totalTricksLost,
    totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent,
    finalMoney,
    totalMoneyEarned,
    jokersUsed,
    deckName,
    newUnlockedDecks,
    isNewHighScore,
  } = summary;

  const totalTricks = totalTricksWon + totalTricksLost;
  const winRate = totalTricks > 0 ? Math.round((totalTricksWon / totalTricks) * 100) : 0;

  return (
    <div className="mobile-dialog fixed inset-0 z-50 bg-[rgba(9,6,3,0.9)] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden select-none">
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-lg mx-auto max-h-[92dvh] overflow-y-auto"
      >
        <ReceiptSheet tilt={-0.4}>
          <ReceiptHead
            place="Osteria Briscolatro"
            subject={
              won
                ? 'Conto della serata · torneo vinto'
                : `Conto della serata · ante ${ante} · ${isBossEncounter(round) ? 'Boss' : 'Tavolo'}`
            }
          />

          <div className="flex justify-end mt-3 mb-1 pr-1">
            <RubberStamp
              text={won ? 'Campione' : 'Chiuso'}
              tone={won ? 'green' : 'red'}
              tilt={won ? -4 : 3}
            />
          </div>

          <ReceiptPerf className="my-3" />

          <p className="font-condensed ink text-[17px] sm:text-[18px] leading-snug text-center max-w-md mx-auto">
            {won
              ? 'Sei il nuovo Campione indiscusso del Torneo di Briscolatro! Tutti i bari e i veterani del Bar Sport si inchinano alla tua maestria.'
              : summary.defeatReason ||
                `Non hai raggiunto il target di ${it(targetScore)} Chips ad Ante ${ante}. Riprova combinando nuovi Jolly e Carte Sola!`}
          </p>

          {/* Una run Endless che finisce e' comunque una run vinta: la campagna
              e il record Endless restano due righe separate. */}
          {summary.campaignVictory && !won && (
            <div className="mt-3 space-y-1.5">
              <ReceiptLine label="Campagna" value="completata" tone="green" />
              {summary.endlessAnte !== undefined && (
                <ReceiptLine
                  label="Record endless"
                  value={`Ante ${summary.endlessAnte}`}
                  tone="ink"
                />
              )}
              {summary.endlessTierName && (
                <ReceiptLine label="Tier" value={summary.endlessTierName} tone="dim" />
              )}
              {summary.isNewEndlessRecord && (
                <ReceiptLine label="Nuovo record endless" value="segnato" tone="green" />
              )}
            </div>
          )}

          <ReceiptPerf className="my-3.5" />

          <div className="space-y-1.5">
            <ReceiptLine label="Punteggio totale" value={it(totalScore)} tone="ink" strong />
            <ReceiptLine
              label="Ante raggiunto"
              note={isBossEncounter(round) ? 'boss' : 'tavolo'}
              value={`${ante}`}
            />
            <ReceiptLine
              label="Prese vinte"
              note={`su ${totalTricks}`}
              value={`${totalTricksWon} · ${winRate}%`}
            />
            <ReceiptLine
              label="Punti briscola"
              note="tu / lui"
              value={`${totalBriscolaPointsPlayer} / ${totalBriscolaPointsOpponent}`}
            />
            <ReceiptLine label="Mazzo" value={deckName} tone="dim" />
            <ReceiptLine label="Incassato nella run" value={`$${totalMoneyEarned}`} tone="green" />
            <div className="pt-2 mt-1 border-t-2 border-[rgba(58,44,24,0.5)]">
              <ReceiptLine label="Resta in tasca" value={`$${finalMoney}`} tone="ink" strong />
            </div>
          </div>

          {isNewHighScore && (
            <div className="mt-4 flex justify-center">
              <RubberStamp text="Record della casa" tone="green" tilt={-2} />
            </div>
          )}

          {jokersUsed.length > 0 && (
            <>
              <ReceiptPerf className="my-3.5" />
              <div className="font-condensed ink-dim text-[16px] uppercase tracking-[0.1em] mb-2">
                Spillati al conto · {jokersUsed.length} jolly
              </div>
              {/* Le figure con cui hai giocato, spillate al conto come fanno con
                  gli scontrini della cassa. */}
              <div className="flex flex-wrap gap-2">
                {jokersUsed.map((joker, idx) => (
                  <div
                    key={`${joker.id}-${idx}`}
                    className="w-[68px] shrink-0"
                    style={{ transform: `rotate(${((idx % 3) - 1) * 1.6}deg)` }}
                    title={`${joker.name} · ${joker.italianTitle}`}
                  >
                    {getJokerArtUrl(joker.id) ? (
                      <div className="w-full h-[88px] overflow-hidden border-2 border-[rgba(58,44,24,0.45)] bg-[#d9cdae]">
                        <CardFaceArt src={getJokerArtUrl(joker.id)!} alt={joker.name} />
                      </div>
                    ) : (
                      <div className="w-full h-[88px] border-2 border-[rgba(58,44,24,0.45)] bg-[#d9cdae] flex items-center justify-center">
                        <span className="text-lg">{joker.icon}</span>
                      </div>
                    )}
                    <span className="block font-condensed ink text-[14px] leading-tight mt-1 truncate">
                      {joker.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {newUnlockedDecks && newUnlockedDecks.length > 0 && (
            <>
              <ReceiptPerf className="my-3.5" />
              <ReceiptLine
                label="Mazzi sbloccati"
                note="nella collezione"
                value={`${newUnlockedDecks.length}`}
                tone="green"
              />
            </>
          )}

          <div className="mt-5 space-y-2.5">
            <InkButton
              onClick={() => {
                sound.playCardFlick();
                onPlayAgain();
              }}
            >
              Un&apos;altra mano
            </InkButton>
            <InkButton
              onClick={() => {
                sound.playCardFlick();
                onChangeDeck();
              }}
            >
              Torna al menu · cambia mazzo
            </InkButton>
          </div>
        </ReceiptSheet>
      </motion.div>
    </div>
  );
};
