import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PixelSuitIcon } from './PixelSuitIcon';
import { CARD_POWER_VALUES as V } from '../data/cardPowers';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'briscola' | 'points' | 'roguelike' | 'jokers'>('briscola');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mobile-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-slate-900 border-2 sm:border-3 border-amber-500 rounded-2xl pixel-box max-w-2xl w-full p-4 sm:p-5 shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📖</span>
            <h2 className="font-pixel text-xs sm:text-sm text-amber-400 font-bold uppercase tracking-wide">
              MANUALE DI BRISCOLATRO
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-pixel text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg pixel-box cursor-pointer min-h-[36px] flex items-center justify-center transition-colors"
          >
            ✕ CHIUDI
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0">
          {[
            { id: 'briscola', label: 'BRISCOLA', icon: '🎴' },
            { id: 'points', label: 'PUNTI', icon: '⭐' },
            { id: 'roguelike', label: 'VITTORIA', icon: '🏆' },
            { id: 'jokers', label: 'JOLLY', icon: '🃏' },
          ].map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`py-2 px-1 font-pixel text-[8px] sm:text-[9px] rounded-lg pixel-box flex flex-col items-center gap-0.5 cursor-pointer min-h-[44px] transition-colors ${
                tab === t.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300'
              }`}
            >
              <span className="text-xs sm:text-sm">{t.icon}</span>
              <span className="leading-tight text-center break-words">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content with Smooth Touch Scrolling */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 text-slate-200 font-retro text-xs space-y-3 touch-pan-y custom-scrollbar">
          {tab === 'briscola' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <h3 className="font-pixel text-[11px] text-amber-400 mb-1">
                  Cos'è la Briscola?
                </h3>
                <p className="leading-relaxed">
                  La Briscola è il celebre gioco di carte tradizionale italiano con un mazzo da 40 carte diviso in 4 semi:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-amber-500/40">
                    <PixelSuitIcon suit="denari" size={20} />
                    <span className="font-bold text-amber-300">Denari (Oro/Sole)</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-red-500/40">
                    <PixelSuitIcon suit="coppe" size={20} />
                    <span className="font-bold text-red-300">Coppe (Calice)</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-blue-500/40">
                    <PixelSuitIcon suit="spade" size={20} />
                    <span className="font-bold text-blue-300">Spade (Sciabola)</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-green-500/40">
                    <PixelSuitIcon suit="bastoni" size={20} />
                    <span className="font-bold text-green-300">Bastoni (Mazza)</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <h3 className="font-pixel text-[11px] text-orange-400 mb-1">
                  Il Seme di Briscola (La Carta Guida)
                </h3>
                <p className="leading-relaxed">
                  All'inizio della partita, una carta viene estratta scoperta sotto il mazzo. Il suo seme diventa il <strong>Seme di Briscola</strong>:
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300">
                  <li>Qualsiasi carta di Briscola <strong>batte qualsiasi carta di un altro seme</strong>!</li>
                  <li>Se entrambi giocano Briscola, vince quella con valore gerarchico più alto.</li>
                  <li>Se nessuno gioca Briscola, vince la carta più alta del <strong>seme giocato per primo</strong>.</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'points' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <h3 className="font-pixel text-[11px] text-amber-400 mb-2">
                  Gerarchia e Valore delle Carte
                </h3>
                <p className="mb-2">Nel mazzo ci sono 120 punti complessivi. Non tutte le carte hanno lo stesso valore:</p>
                
                <div className="space-y-1.5 font-pixel text-[9px] sm:text-[10px]">
                  <div className="flex items-center justify-between bg-amber-950/60 p-2 rounded-lg border border-amber-500">
                    <span className="text-amber-300 font-bold">1. ASSO (1)</span>
                    <span className="text-amber-400 font-bold">11 PUNTI (Carico Supremo)</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-950/40 p-2 rounded-lg border border-amber-600/70">
                    <span className="text-amber-200 font-bold">2. TRE (3)</span>
                    <span className="text-amber-300 font-bold">10 PUNTI (Carico)</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded-lg border border-slate-700">
                    <span className="text-slate-200">3. RE (10)</span>
                    <span className="text-amber-300">4 PUNTI (Figura)</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded-lg border border-slate-700">
                    <span className="text-slate-200">4. CAVALLO (9)</span>
                    <span className="text-amber-300">3 PUNTI (Figura)</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded-lg border border-slate-700">
                    <span className="text-slate-200">5. FANTE (8)</span>
                    <span className="text-amber-300">2 PUNTI (Figura)</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg text-slate-400">
                    <span>6. LISCE (7, 6, 5, 4, 2)</span>
                    <span>0 PUNTI (Ma utili per prese tattiche!)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'roguelike' && (
            <div className="space-y-3">
              {/* Come si Vince la Manche */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/50">
                <h3 className="font-pixel text-[11px] text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <span>🏆</span> COME SI VINCE UNA MANCHE (ROUND)
                </h3>
                <p className="leading-relaxed text-slate-200">
                  A fine smazzata (dopo aver giocato tutte le carte del mazzo), <strong>vinci la manche</strong> se hai raggiunto il <strong>Punteggio Target</strong> del Blind. È l'unica condizione.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-amber-500/40">
                    <div className="font-pixel text-[9.5px] text-amber-300 font-bold mb-1 flex items-center gap-1">
                      <span>🎯</span> Punteggio Target
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Ogni presa vinta vale <strong>Chips × Mult</strong>. Il Mult base dipende da <em>cosa</em> catturi: +1 per ogni Carico (Asso o Tre), +1 se prendi una Figura, +1 se vinci con la Briscola. I Jolly e le carte potenziate fanno il resto.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-orange-500/40">
                    <div className="font-pixel text-[9.5px] text-orange-300 font-bold mb-1 flex items-center gap-1">
                      <span>🎴</span> Maggioranza Briscola
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Fare <strong>più di 60 Punti Briscola</strong> su 120 non vince la manche, ma paga <strong>+$4</strong>: vincere la partita vera finanzia la tua run.
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-[10.5px] text-amber-200 bg-amber-950/40 p-2 rounded border border-amber-500/30">
                  💡 <em>Curiosità:</em> puoi perdere la Briscola tradizionale 70 a 50 e vincere lo stesso la manche, se le prese giuste hanno acceso i Jolly. Ma senza carichi e briscole il Mult resta basso: le due cose vanno a braccetto.
                </div>
              </div>

              {/* Quando Avviene il Game Over */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-red-500/50">
                <h3 className="font-pixel text-[11px] text-red-400 mb-1.5 flex items-center gap-1.5">
                  <span>💀</span> QUANDO AVVIENE IL GAME OVER?
                </h3>
                <p className="leading-relaxed text-slate-200">
                  Il <strong>Game Over</strong> si verifica se alla fine della smazzata:
                </p>
                <div className="bg-red-950/40 p-2 rounded-lg border border-red-500/40 text-red-200 text-xs mt-1.5 space-y-1 font-medium">
                  <div className="flex items-start gap-1.5">
                    <span>❌</span> <span><strong>NON hai raggiunto il Punteggio Target</strong> del Blind.</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  In tal caso la tua run si conclude, vedrai il riepilogo con tutte le statistiche e dovrai ripartire dall'Ante 1.
                </p>
              </div>

              {/* Formula Chips x Mult */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <h3 className="font-pixel text-[11px] text-cyan-400 mb-1">
                  La Formula dei Punti: [Chips × Moltiplicatore]
                </h3>
                <div className="my-2 p-2 bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 border-2 border-amber-400 rounded-lg text-center font-pixel text-xs">
                  <span className="text-blue-300">[ CHIPS ]</span> × <span className="text-red-300">[ MOLTIPLICATORE ]</span> = <span className="text-amber-300">PUNTI ASSEGNATI</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                  <li><strong>Chips:</strong> base 20 + 3 per ogni punto della carta giocata; Foil aggiunge +{V.foilPlayedChips}, Bonus +{V.bonusChips} e Pietra +{V.stoneChips}.</li>
                  <li><strong>Edizioni:</strong> Olografica +{V.holoPlayedMult} Mult; Policroma x{V.polychromePlayedXMult} Mult.</li>
                  <li><strong>Acciaio:</strong> x{V.steelXMult} Mult solo mentre la carta resta in mano.</li>
                  <li><strong>Moltiplicatore:</strong> Potenziato dai tuoi Jolly passivi e combinazioni speciali.</li>
                  <li>Gli obiettivi scalano progressivamente dall'<strong>Ante 1 all'Ante 8</strong>!</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'jokers' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <h3 className="font-pixel text-[11px] text-red-400 mb-1 flex items-center gap-1.5">
                  <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-bold">SOLA</span>
                  Jolly, Carte Sola & Negozio
                </h3>
                <p className="leading-relaxed mb-2">
                  Tra una manche e l'altra visiterai il <strong>Negozio del Bar Sport</strong>, dove potrai spendere i soldi guadagnati:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-lg shrink-0">🃏</span>
                    <div>
                      <strong className="text-amber-300 font-pixel text-[10px]">I Jolly (Personaggi del Bar):</strong>
                      <p className="text-xs text-slate-300 mt-0.5">Fino a 5 slot di abilità passive che creano sinergie devastanti (moltiplicatori, bonus per semi, protezione carichi).</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-red-500 font-bold text-base shrink-0">🔴</span>
                    <div>
                      <strong className="text-red-300 font-pixel text-[10px]">Carte Sola:</strong>
                      <p className="text-xs text-slate-300 mt-0.5">Quelle carte lì: +2 Pesca Due, Sgambetto ⊘, Giravolta ⇄, Jolly Matto 🎨, Scambio 🔀 e il grido "SOLA!". Le abbiamo chiamate diversamente, per il resto ci siamo capiti.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-lg shrink-0">🎁</span>
                    <div>
                      <strong className="text-cyan-300 font-pixel text-[10px]">Bustine & Carte Sola:</strong>
                      <p className="text-xs text-slate-300 mt-0.5">Apri pacchetti speciali per trovare Carte Azione, modificatori e Jolly leggendari.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-red-950/60 p-2 rounded-lg border border-red-500/50">
                    <span className="text-lg shrink-0">💀</span>
                    <div>
                      <strong className="text-red-400 font-pixel text-[10px]">Boss (2° incontro di ogni Ante):</strong>
                      <p className="text-xs text-red-200 mt-0.5">Nel 2° incontro affronterai un Boss con un <strong>Malus speciale</strong> (es. Gigi riduce le lisce, Don Vito dimezza i carichi nello scoring, Ciccio nasconde le sue carte). Leggi sempre il banner del Boss in cima al tavolo!</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-pixel text-xs font-bold px-5 py-2.5 rounded-lg pixel-box cursor-pointer min-h-[40px] transition-colors"
          >
            HO CAPITO! GIOCA
          </button>
        </div>
      </motion.div>
    </div>
  );
};
