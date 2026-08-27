import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlayingCard, Suit } from '../types/game';
import { PixelCard } from './PixelCard';
import { PixelSuitIcon } from './PixelSuitIcon';
import { CardInspectorModal } from './CardInspectorModal';
import { getSuitDisplayName, RANK_INFO } from '../game/briscola';
import { sound } from '../services/soundEngine';

interface DeckReplaceModalProps {
  /** The card just taken from a booster. Null keeps the screen closed. */
  newCard: PlayingCard | null;
  runDeck: PlayingCard[];
  onConfirm: (removedCardId: string) => void;
  onCancel: () => void;
}

const SUIT_ORDER: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];

/** What the card carries beyond its rank, spelled out for the summary bar. */
function modifierLabels(card: PlayingCard): string[] {
  const labels: string[] = [];
  if (card.edition !== 'standard') labels.push(card.edition.toUpperCase());
  if (card.enhancement !== 'none') labels.push(card.enhancement.toUpperCase());
  if (card.seal !== 'none') labels.push(`SIGILLO ${card.seal.toUpperCase()}`);
  return labels;
}

const Summary: React.FC<{ card: PlayingCard | null; tone: 'in' | 'out' }> = ({ card, tone }) => {
  const accent = tone === 'in' ? 'text-emerald-300' : 'text-rose-300';
  if (!card) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-[62px] sm:w-[74px] h-[86px] sm:h-[102px] rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-2xl">
          ?
        </div>
        <span className="font-retro text-[10px] text-slate-500">Scegli sotto</span>
      </div>
    );
  }

  const labels = modifierLabels(card);
  return (
    <div className="flex flex-col items-center gap-1">
      <PixelCard card={card} size="pick" showBriscolaBadge={false} />
      <span className={`font-pixel text-[8px] ${accent}`}>
        {RANK_INFO[card.rank]?.shortName ?? card.rank} {getSuitDisplayName(card.suit)}
      </span>
      {labels.length > 0 && (
        <span className="font-retro text-[9px] text-amber-300 leading-tight text-center max-w-[86px]">
          {labels.join(' · ')}
        </span>
      )}
    </div>
  );
};

/**
 * "Sostituisci una carta": the screen that decides which card leaves the run
 * deck when a new one arrives.
 *
 * The engine used to drop the cheapest plain card on its own, which reads as a
 * convenience and plays as a loss of control: a two of Bastoni can be the whole
 * point of a Jolly build. Nothing is chosen here without a tap and a confirm,
 * and the deck comes out of it the same size it went in.
 */
export const DeckReplaceModal: React.FC<DeckReplaceModalProps> = ({
  newCard,
  runDeck,
  onConfirm,
  onCancel,
}) => {
  const [removedId, setRemovedId] = useState<string | null>(null);
  const [inspected, setInspected] = useState<PlayingCard | null>(null);

  const grouped = useMemo(() => {
    return SUIT_ORDER.map((suit) => ({
      suit,
      cards: runDeck
        .filter((card) => card.suit === suit)
        .sort((a, b) => a.rank - b.rank),
    })).filter((group) => group.cards.length > 0);
  }, [runDeck]);

  const removed = removedId ? runDeck.find((card) => card.id === removedId) ?? null : null;

  // A second tap on the card already chosen opens it big: one tap to pick,
  // one more to read what it actually does.
  const handleTap = (card: PlayingCard) => {
    if (removedId === card.id) {
      sound.playCardSelect();
      setInspected(card);
      return;
    }
    sound.playCardSelect();
    setRemovedId(card.id);
  };

  return (
    <>
      <AnimatePresence>
        {newCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-slate-950/95 backdrop-blur-md flex flex-col p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              className="bg-slate-900 border-3 border-amber-400 rounded-2xl pixel-box flex flex-col w-full max-w-2xl mx-auto my-auto min-h-0 max-h-full overflow-hidden"
            >
              {/* Header: what comes in, what goes out, nothing else. */}
              <div className="shrink-0 px-3 pt-3 pb-2 border-b-2 border-slate-700 text-center">
                <h3 className="font-pixel text-[10px] sm:text-sm text-amber-300 font-bold">
                  SOSTITUISCI UNA CARTA
                </h3>
                <p className="font-retro text-[10px] sm:text-xs text-slate-400 mt-0.5">
                  Il mazzo resta di {runDeck.length} carte: una entra, una esce.
                </p>

                <div className="flex items-start justify-center gap-2 sm:gap-4 mt-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-pixel text-[8px] text-emerald-400">ENTRA</span>
                    <Summary card={newCard} tone="in" />
                  </div>
                  <div className="self-center font-pixel text-lg sm:text-2xl text-slate-500 pt-4">→</div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-pixel text-[8px] text-rose-400">ESCE</span>
                    <Summary card={removed} tone="out" />
                  </div>
                </div>

                <button
                  onClick={() => setInspected(newCard)}
                  className="font-retro text-[10px] text-sky-300 hover:text-sky-200 underline mt-2 cursor-pointer"
                >
                  Guarda da vicino la carta nuova
                </button>
              </div>

              {/* The run deck. This is the only part that scrolls. */}
              <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
                <p className="font-retro text-[10px] text-slate-500 text-center mb-2">
                  Tocca una carta per sceglierla, toccala di nuovo per ispezionarla.
                </p>
                {grouped.map((group) => (
                  <div key={group.suit} className="mb-3">
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <PixelSuitIcon suit={group.suit} size={14} />
                      <span className="font-pixel text-[8px] text-slate-400">
                        {getSuitDisplayName(group.suit).toUpperCase()}
                      </span>
                      <span className="font-retro text-[10px] text-slate-600">
                        {group.cards.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-x-1.5 gap-y-2 justify-items-center">
                      {group.cards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => handleTap(card)}
                          className={`relative rounded-lg transition-all cursor-pointer ${
                            removedId === card.id
                              ? 'outline outline-3 outline-rose-400 outline-offset-2 scale-105'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          <PixelCard card={card} size="pick" showBriscolaBadge={false} />
                          {removedId === card.id && (
                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white font-pixel text-[7px] px-1.5 py-0.5 rounded pixel-box whitespace-nowrap">
                              ESCE
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer: cancel keeps the booster open, confirm needs a pick. */}
              <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-t-2 border-slate-700 bg-slate-900">
                <button
                  onClick={onCancel}
                  className="font-pixel text-[9px] text-slate-400 hover:text-white px-3 py-2 border border-slate-700 rounded-lg pixel-box cursor-pointer"
                >
                  ANNULLA
                </button>
                <button
                  onClick={() => removedId && onConfirm(removedId)}
                  disabled={!removedId}
                  className={`flex-1 font-pixel text-[9px] sm:text-xs font-bold px-3 py-2 rounded-lg pixel-box ${
                    removedId
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {removed
                    ? `CONFERMA: ESCE ${RANK_INFO[removed.rank]?.shortName ?? removed.rank} DI ${getSuitDisplayName(removed.suit).toUpperCase()}`
                    : 'SCEGLI LA CARTA CHE ESCE'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sits above this screen so a card can be read without losing the pick. */}
      <CardInspectorModal card={inspected} onClose={() => setInspected(null)} />
    </>
  );
};
