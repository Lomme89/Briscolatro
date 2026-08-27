import React, { useState } from 'react';
import { Joker, UnoCard, BossBlind, PlayingCard, Suit, CardSpecial } from '../types/game';
import { SPECIAL_INFO } from '../game/specialCards';
import { ALL_JOKERS } from '../data/jokers';
import { ALL_UNO_CARDS } from '../data/unoCards';
import { ALL_BOSS_BLINDS } from '../data/bosses';

interface DevDebugDrawerProps {
  onAddMoney: (amount: number) => void;
  onAddScore: (amount: number) => void;
  onAddDiscards: (amount: number) => void;
  onAddJoker: (joker: Joker) => void;
  onAddUnoCard: (unoCard: UnoCard) => void;
  onSetBoss: (boss: BossBlind) => void;
  onJumpToEndgame: () => void;
  onWinRound: () => void;
  onChangeBriscola: (suit: Suit) => void;
  /** Stamps an Azzardo on the first card in hand, to try it without a booster. */
  onGiveSpecial: (special: Exclude<CardSpecial, 'none'>) => void;
}

export const DevDebugDrawer: React.FC<DevDebugDrawerProps> = ({
  onAddMoney,
  onAddScore,
  onAddDiscards,
  onAddJoker,
  onAddUnoCard,
  onSetBoss,
  onJumpToEndgame,
  onWinRound,
  onChangeBriscola,
  onGiveSpecial,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only render in dev environment
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-2 right-2 z-50 font-pixel">
      {isOpen ? (
        <div className="bg-slate-950 border-2 border-emerald-500 rounded-xl p-3 shadow-2xl text-xs max-w-xs w-80 max-h-96 overflow-y-auto pixel-box">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="text-emerald-400 font-bold">🛠️ DEV DEBUG MENU</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-[9px]">
            {/* Quick Cheats */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => onAddMoney(50)}
                className="bg-amber-900/60 hover:bg-amber-800 text-amber-300 p-1.5 rounded pixel-box"
              >
                +$50 Soldi
              </button>
              <button
                onClick={() => onAddScore(1000)}
                className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 p-1.5 rounded pixel-box"
              >
                +1,000 Punti
              </button>
              <button
                onClick={() => onAddDiscards(5)}
                className="bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 p-1.5 rounded pixel-box"
              >
                +5 Scarti
              </button>
              <button
                onClick={onJumpToEndgame}
                className="bg-purple-900/60 hover:bg-purple-800 text-purple-300 p-1.5 rounded pixel-box"
              >
                Ultime 3 Prese
              </button>
              <button
                onClick={onWinRound}
                className="bg-blue-900/60 hover:bg-blue-800 text-blue-300 p-1.5 rounded pixel-box col-span-2"
              >
                Vinci Round Subito 🏆
              </button>
            </div>

            {/* Set Briscola */}
            <div>
              <span className="text-slate-400 block mb-1">Cambia Briscola:</span>
              <div className="grid grid-cols-4 gap-1">
                {(['denari', 'coppe', 'spade', 'bastoni'] as Suit[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onChangeBriscola(s)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1 rounded text-center capitalize"
                  >
                    {s[0].toUpperCase() + s.slice(1, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Joker */}
            <div>
              <span className="text-slate-400 block mb-1">Aggiungi Jolly:</span>
              <select
                onChange={(e) => {
                  const j = ALL_JOKERS.find((item) => item.id === e.target.value);
                  if (j) onAddJoker(j);
                  e.target.value = '';
                }}
                className="w-full bg-slate-900 border border-slate-700 text-amber-300 p-1 rounded text-[8px]"
                defaultValue=""
              >
                <option value="" disabled>
                  -- Seleziona Jolly --
                </option>
                {ALL_JOKERS.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.rarity})
                  </option>
                ))}
              </select>
            </div>

            {/* Add UNO Card */}
            <div>
              <span className="text-slate-400 block mb-1">Aggiungi Carta Sola:</span>
              <select
                onChange={(e) => {
                  const u = ALL_UNO_CARDS.find((item) => item.id === e.target.value);
                  if (u) onAddUnoCard(u);
                  e.target.value = '';
                }}
                className="w-full bg-slate-900 border border-slate-700 text-red-300 p-1 rounded text-[8px]"
                defaultValue=""
              >
                <option value="" disabled>
                  -- Seleziona Carta Sola --
                </option>
                {ALL_UNO_CARDS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Azzardo on the first card in hand */}
            <div>
              <span className="text-slate-400 block mb-1">Azzardo sulla 1ª carta in mano:</span>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(SPECIAL_INFO) as Array<Exclude<CardSpecial, 'none'>>).map((id) => (
                  <button
                    key={id}
                    onClick={() => onGiveSpecial(id)}
                    className="bg-slate-900 border border-slate-700 text-amber-300 py-1 rounded text-[8px] cursor-pointer hover:border-amber-500"
                  >
                    {SPECIAL_INFO[id].badge}
                  </button>
                ))}
              </div>
            </div>

            {/* Set Boss */}
            <div>
              <span className="text-slate-400 block mb-1">Imposta Boss Attuale:</span>
              <select
                onChange={(e) => {
                  const b = ALL_BOSS_BLINDS.find((item) => item.id === e.target.value);
                  if (b) onSetBoss(b);
                  e.target.value = '';
                }}
                className="w-full bg-slate-900 border border-slate-700 text-red-400 p-1 rounded text-[8px]"
                defaultValue=""
              >
                <option value="" disabled>
                  -- Seleziona Boss --
                </option>
                {ALL_BOSS_BLINDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    A{b.ante}: {b.name} ({b.debuffType})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-slate-900/90 border border-emerald-500/70 hover:border-emerald-400 text-emerald-400 p-1.5 rounded-lg shadow-lg text-[9px] cursor-pointer flex items-center gap-1"
          title="Apri Debug Menu"
        >
          <span>🛠️</span>
          <span>DEV</span>
        </button>
      )}
    </div>
  );
};
