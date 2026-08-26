import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Joker, UnoCard, BoosterPack, Voucher, PlayingCard } from '../types/game';
import { ALL_BOOSTER_PACKS, ALL_VOUCHERS, ALL_UNO_CARDS } from '../data/unoCards';
import { getRandomJokers } from '../data/jokers';
import { createStandardDeck } from '../data/cards';
import { JokerSlot } from './JokerSlot';
import { UnoCardSlot } from './UnoCardSlot';
import { PixelCard } from './PixelCard';
import { sound } from '../services/soundEngine';
import confetti from 'canvas-confetti';

interface ShopViewProps {
  money: number;
  jokers: Joker[];
  consumables: UnoCard[];
  vouchers: Voucher[];
  maxJokers: number;
  maxConsumables: number;
  onBuyJoker: (joker: Joker, cost: number) => void;
  onBuyUnoCard: (unoCard: UnoCard, cost: number) => void;
  onBuyVoucher: (voucher: Voucher) => void;
  onSellJoker: (index: number) => void;
  onSellUnoCard: (index: number) => void;
  onAddCardToDeck: (card: PlayingCard) => void;
  onNextRound: () => void;
  onReroll: (cost: number) => void;
  ante: number;
  round: number;
}

export const ShopView: React.FC<ShopViewProps> = ({
  money,
  jokers,
  consumables,
  vouchers,
  maxJokers,
  maxConsumables,
  onBuyJoker,
  onBuyUnoCard,
  onBuyVoucher,
  onSellJoker,
  onSellUnoCard,
  onAddCardToDeck,
  onNextRound,
  onReroll,
  ante,
  round,
}) => {
  const hasSconto = vouchers.some(v => v.id === 'v_sconto' && v.bought);
  const discount = hasSconto ? 2 : 0;

  const [shopJokers, setShopJokers] = useState<Joker[]>(() => getRandomJokers(2));
  const [shopUnoCards, setShopUnoCards] = useState<UnoCard[]>(() => {
    const shuffled = [...ALL_UNO_CARDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  });
  const [shopPacks] = useState<BoosterPack[]>(() => {
    const shuffled = [...ALL_BOOSTER_PACKS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  });
  const [rerollCost, setRerollCost] = useState(5 - discount);
  const [mobileTab, setMobileTab] = useState<'cards' | 'packs'>('cards');

  // Selected item inspection modal on mobile
  const [inspectedItem, setInspectedItem] = useState<{
    type: 'joker' | 'uno' | 'voucher';
    item: Joker | UnoCard | Voucher;
    isShop?: boolean;
    cost?: number;
    inventoryIndex?: number;
  } | null>(null);

  // Active opening booster pack state
  const [activeBooster, setActiveBooster] = useState<{
    pack: BoosterPack;
    cards: PlayingCard[];
    unoCards: UnoCard[];
    jokers: Joker[];
    selectedCount: number;
  } | null>(null);

  const handleReroll = () => {
    if (money < rerollCost) return;
    sound.playCardFlick();
    onReroll(rerollCost);
    setShopJokers(getRandomJokers(2));
    const shuffledUno = [...ALL_UNO_CARDS].sort(() => Math.random() - 0.5);
    setShopUnoCards(shuffledUno.slice(0, 2));
    setRerollCost(prev => prev + 1);
  };

  const handleOpenBooster = (pack: BoosterPack) => {
    const cost = Math.max(1, pack.cost - discount);
    if (money < cost) return;

    sound.playBoosterRip();
    onReroll(cost);

    let cards: PlayingCard[] = [];
    let unoCards: UnoCard[] = [];
    let generatedJokers: Joker[] = [];

    if (pack.type === 'cards' || pack.type === 'celeste') {
      const fullDeck = createStandardDeck();
      cards = fullDeck.slice(0, pack.packSize).map(c => {
        const rand = Math.random();
        if (rand < 0.35) c.edition = 'foil';
        else if (rand < 0.6) c.edition = 'holo';
        else if (rand < 0.8) c.edition = 'polychrome';
        else c.edition = 'gold';

        if (Math.random() < 0.4) c.seal = 'red';
        return c;
      });
    }

    if (pack.type === 'uno' || pack.type === 'tarot' || pack.type === 'celeste') {
      const shuffled = [...ALL_UNO_CARDS].sort(() => Math.random() - 0.5);
      unoCards = shuffled.slice(0, pack.packSize);
    }

    if (pack.type === 'joker' || pack.type === 'celeste') {
      generatedJokers = getRandomJokers(pack.packSize);
    }

    setActiveBooster({
      pack,
      cards,
      unoCards,
      jokers: generatedJokers,
      selectedCount: 0,
    });
  };

  const handleSelectBoosterCard = (card: PlayingCard) => {
    if (!activeBooster) return;
    sound.playCashChime();
    onAddCardToDeck(card);

    const nextCount = activeBooster.selectedCount + 1;
    if (nextCount >= activeBooster.pack.selectCount) {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } });
      setActiveBooster(null);
    } else {
      setActiveBooster({
        ...activeBooster,
        cards: activeBooster.cards.filter(c => c.id !== card.id),
        selectedCount: nextCount,
      });
    }
  };

  const handleSelectBoosterUnoCard = (unoCard: UnoCard) => {
    if (!activeBooster) return;
    if (consumables.length >= maxConsumables) {
      alert('Non hai abbastanza spazio per altre Carte Azione UNO!');
      return;
    }
    sound.playCashChime();
    onBuyUnoCard(unoCard, 0);

    const nextCount = activeBooster.selectedCount + 1;
    if (nextCount >= activeBooster.pack.selectCount) {
      setActiveBooster(null);
    } else {
      setActiveBooster({
        ...activeBooster,
        unoCards: activeBooster.unoCards.filter(t => t.id !== unoCard.id),
        selectedCount: nextCount,
      });
    }
  };

  const handleSelectBoosterJoker = (joker: Joker) => {
    if (!activeBooster) return;
    if (jokers.length >= maxJokers) {
      alert('Non hai abbastanza slot per altri Jolly!');
      return;
    }
    sound.playCashChime();
    onBuyJoker(joker, 0);

    const nextCount = activeBooster.selectedCount + 1;
    if (nextCount >= activeBooster.pack.selectCount) {
      setActiveBooster(null);
    } else {
      setActiveBooster({
        ...activeBooster,
        jokers: activeBooster.jokers.filter(j => j.id !== joker.id),
        selectedCount: nextCount,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 max-w-6xl mx-auto w-full relative pb-16 sm:pb-4 select-none">
      {/* 1. TOP RESPONSIVE HEADER BAR */}
      <div className="flex items-center justify-between bg-slate-900/95 border-2 border-amber-500/80 p-2 sm:p-3 rounded-xl pixel-box mb-2.5 shadow-lg gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl sm:text-3xl shrink-0">🏪</span>
          <div className="min-w-0">
            <h2 className="font-pixel text-[11px] sm:text-sm text-amber-400 font-bold uppercase truncate leading-tight">
              BAR SPORT
            </h2>
            <p className="font-retro text-[9px] sm:text-xs text-slate-300 truncate">
              Ante {ante} • Round {round}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-amber-950/90 border border-amber-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg pixel-box flex items-center gap-1.5">
            <span className="text-base sm:text-lg">💰</span>
            <span className="font-pixel text-sm sm:text-base text-amber-300 font-bold">${money}</span>
          </div>

          <button
            onClick={() => {
              sound.playCardFlick();
              onNextRound();
            }}
            className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-slate-950 font-pixel text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-2 rounded-lg pixel-box shadow-lg flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <span>GIOCA</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      {/* 2. PLAYER INVENTORY DOCK (Jolly & Carte UNO) */}
      <div className="bg-slate-900/85 border border-slate-700/80 p-2 sm:p-3 rounded-xl pixel-box mb-3 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
          {/* Active Jokers Row */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-pixel text-slate-300 px-1">
              <span className="text-amber-400 flex items-center gap-1 font-bold">
                <span>🃏</span> JOLLY ATTIVI ({jokers.length}/{maxJokers})
              </span>
              <span className="text-[8px] text-slate-400">Tocca per vendere</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
              {Array.from({ length: maxJokers }).map((_, i) => {
                const j = jokers[i] || null;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (j) {
                        setInspectedItem({
                          type: 'joker',
                          item: j,
                          isShop: false,
                          inventoryIndex: i,
                        });
                      }
                    }}
                  >
                    <JokerSlot
                      joker={j}
                      size="sm"
                      onSell={() => onSellJoker(i)}
                      showSellButton={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Uno Cards Row */}
          <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-slate-800 pt-1.5 md:pt-0 md:pl-3">
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-pixel text-slate-300 px-1">
              <span className="text-red-400 flex items-center gap-1 font-bold">
                <span className="bg-red-600 text-white px-1 rounded text-[7.5px] font-black">UNO</span>
                CARTE AZIONE ({consumables.length}/{maxConsumables})
              </span>
              <span className="text-[8px] text-slate-400">Tocca per vendere</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
              {Array.from({ length: maxConsumables }).map((_, i) => {
                const u = consumables[i] || null;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (u) {
                        setInspectedItem({
                          type: 'uno',
                          item: u,
                          isShop: false,
                          inventoryIndex: i,
                        });
                      }
                    }}
                  >
                    <UnoCardSlot
                      unoCard={u}
                      size="sm"
                      onSell={() => onSellUnoCard(i)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MOBILE TAB SWITCHER (Hidden on Desktop) */}
      <div className="flex md:hidden items-center justify-center gap-2 mb-3 bg-slate-900/90 p-1 rounded-xl border border-slate-800 pixel-box">
        <button
          onClick={() => setMobileTab('cards')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-pixel text-[9.5px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'cards'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🃏</span>
          <span>JOLLY & UNO ({shopJokers.length + shopUnoCards.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('packs')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-pixel text-[9.5px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'packs'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🎁</span>
          <span>BUSTINE & VOUCHER</span>
        </button>
      </div>

      {/* 4. MAIN SHOP CONTENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1">
        {/* LEFT / TAB 1: Jolly & Carte Azione UNO Shelf */}
        <div
          className={`md:col-span-7 bg-slate-900/90 border border-amber-500/50 p-2.5 sm:p-4 rounded-xl pixel-box flex flex-col justify-between shadow-lg ${
            mobileTab === 'cards' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div>
            {/* Shelf Header */}
            <div className="flex items-center justify-between mb-2.5 border-b border-slate-800 pb-2">
              <span className="font-pixel text-[10.5px] sm:text-xs text-amber-400 font-bold flex items-center gap-1.5">
                <span>🃏</span> PERSONAGGI & CARTE UNO
              </span>
              <button
                onClick={handleReroll}
                disabled={money < rerollCost}
                className={`font-pixel text-[8.5px] sm:text-[9.5px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded pixel-box flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                  money >= rerollCost
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>REROLL</span>
                <span className="font-bold">(${rerollCost})</span>
              </button>
            </div>

            {/* Shop Cards Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Jokers for sale */}
              {shopJokers.map((joker, idx) => {
                const cost = Math.max(1, joker.cost - discount);
                const canAfford = money >= cost && jokers.length < maxJokers;
                const isFull = jokers.length >= maxJokers;

                return (
                  <div
                    key={joker.id + idx}
                    className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-2 pixel-box flex flex-col justify-between gap-1.5 shadow-sm hover:border-amber-400 transition-colors"
                  >
                    <div
                      className="cursor-pointer flex flex-col items-center text-center"
                      onClick={() =>
                        setInspectedItem({
                          type: 'joker',
                          item: joker,
                          isShop: true,
                          cost,
                        })
                      }
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[7px] font-pixel px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase font-bold border border-amber-500/30">
                          {joker.rarity}
                        </span>
                        <span className="text-[9px] text-slate-400">ⓘ Info</span>
                      </div>

                      <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center justify-center p-1 my-0.5">
                        <span className="text-xl sm:text-2xl">{joker.icon}</span>
                      </div>

                      <div className="font-pixel text-[9px] sm:text-[10px] text-amber-300 font-bold leading-tight mt-0.5 line-clamp-1">
                        {joker.name}
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-300 line-clamp-2 leading-tight mt-0.5 font-retro">
                        {joker.description}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!canAfford) return;
                        sound.playCashChime();
                        onBuyJoker(joker, cost);
                        setShopJokers(prev => prev.filter((_, i) => i !== idx));
                      }}
                      disabled={!canAfford}
                      className={`w-full py-1.5 px-2 rounded-lg font-pixel text-[8.5px] sm:text-[9.5px] font-bold flex items-center justify-center gap-1 pixel-box transition-all active:scale-95 cursor-pointer ${
                        isFull
                          ? 'bg-red-950/60 border border-red-800 text-red-400 cursor-not-allowed'
                          : canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md'
                          : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isFull ? (
                        <span>SLOT PIENI</span>
                      ) : (
                        <>
                          <span>COMPRA</span>
                          <span>${cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Uno Cards for sale */}
              {shopUnoCards.map((unoCard, idx) => {
                const cost = Math.max(1, unoCard.cost - discount);
                const canAfford = money >= cost && consumables.length < maxConsumables;
                const isFull = consumables.length >= maxConsumables;

                return (
                  <div
                    key={unoCard.id + idx}
                    className="bg-slate-950/80 border border-red-500/40 rounded-xl p-2 pixel-box flex flex-col justify-between gap-1.5 shadow-sm hover:border-red-400 transition-colors"
                  >
                    <div
                      className="cursor-pointer flex flex-col items-center text-center"
                      onClick={() =>
                        setInspectedItem({
                          type: 'uno',
                          item: unoCard,
                          isShop: true,
                          cost,
                        })
                      }
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[7px] font-pixel px-1 py-0.2 rounded bg-red-600 text-white uppercase font-black">
                          UNO
                        </span>
                        <span className="text-[9px] text-slate-400">ⓘ Info</span>
                      </div>

                      <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-lg bg-slate-900 border border-red-800 flex flex-col items-center justify-center p-1 my-0.5">
                        <span className="text-xl sm:text-2xl">{unoCard.icon}</span>
                      </div>

                      <div className="font-pixel text-[9px] sm:text-[10px] text-red-300 font-bold leading-tight mt-0.5 line-clamp-1">
                        {unoCard.name}
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-300 line-clamp-2 leading-tight mt-0.5 font-retro">
                        {unoCard.description}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!canAfford) return;
                        sound.playCashChime();
                        onBuyUnoCard(unoCard, cost);
                        setShopUnoCards(prev => prev.filter((_, i) => i !== idx));
                      }}
                      disabled={!canAfford}
                      className={`w-full py-1.5 px-2 rounded-lg font-pixel text-[8.5px] sm:text-[9.5px] font-bold flex items-center justify-center gap-1 pixel-box transition-all active:scale-95 cursor-pointer ${
                        isFull
                          ? 'bg-red-950/60 border border-red-800 text-red-400 cursor-not-allowed'
                          : canAfford
                          ? 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-md'
                          : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isFull ? (
                        <span>SLOT PIENI</span>
                      ) : (
                        <>
                          <span>COMPRA</span>
                          <span>${cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT / TAB 2: Bustine & Tagliandi (Vouchers) */}
        <div
          className={`md:col-span-5 bg-slate-900/90 border border-purple-500/50 p-2.5 sm:p-4 rounded-xl pixel-box flex flex-col justify-between shadow-lg ${
            mobileTab === 'packs' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div>
            <div className="font-pixel text-[10.5px] sm:text-xs text-purple-400 font-bold mb-2.5 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <span>🎁</span> BUSTINE & VOUCHER
            </div>

            {/* Booster Packs List */}
            <div className="space-y-2 mb-3">
              {shopPacks.map((pack) => {
                const cost = Math.max(1, pack.cost - discount);
                const canAfford = money >= cost;
                return (
                  <div
                    key={pack.id}
                    className="p-2 sm:p-2.5 bg-slate-950/80 border border-purple-800/80 rounded-xl pixel-box flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl sm:text-2xl shrink-0">{pack.icon}</span>
                      <div className="min-w-0">
                        <div className="font-pixel text-[9px] sm:text-[10px] text-purple-200 font-bold truncate">
                          {pack.name}
                        </div>
                        <div className="font-retro text-[8px] sm:text-[9px] text-slate-400 truncate">
                          {pack.subtitle}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenBooster(pack)}
                      disabled={!canAfford}
                      className={`shrink-0 font-pixel text-[8.5px] sm:text-[9px] px-2.5 sm:px-3 py-1.5 rounded-lg pixel-box font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                        canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                          : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>APRI</span>
                      <span>${cost}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Vouchers Section */}
            <div className="border-t border-slate-800 pt-2.5">
              <div className="font-pixel text-[9px] sm:text-[10px] text-amber-300 font-bold mb-2 flex items-center gap-1">
                <span>🏷️</span> TAGLIANDI PERMANENTI
              </div>
              <div className="space-y-1.5">
                {ALL_VOUCHERS.slice(0, 2).map((voucher) => {
                  const isBought = vouchers.some(v => v.id === voucher.id && v.bought);
                  const canAfford = money >= voucher.cost && !isBought;
                  return (
                    <div
                      key={voucher.id}
                      className={`p-2 rounded-xl border pixel-box flex items-center justify-between gap-2 text-xs ${
                        isBought
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base sm:text-lg shrink-0">{voucher.icon}</span>
                        <div className="min-w-0">
                          <div className="font-pixel text-[8.5px] sm:text-[9px] font-bold truncate">
                            {voucher.name}
                          </div>
                          <div className="text-[8px] sm:text-[8.5px] text-slate-400 leading-tight truncate font-retro">
                            {voucher.description}
                          </div>
                        </div>
                      </div>

                      {isBought ? (
                        <span className="font-pixel text-[7.5px] bg-emerald-700 text-white px-2 py-1 rounded shrink-0">
                          ATTIVO
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            sound.playCashChime();
                            onBuyVoucher(voucher);
                          }}
                          disabled={!canAfford}
                          className={`font-pixel text-[8px] sm:text-[8.5px] px-2.5 py-1.5 rounded-lg pixel-box font-bold shrink-0 cursor-pointer transition-all active:scale-95 ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                              : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          ${voucher.cost}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ITEM INSPECTION MODAL (Tapping on card on mobile or anywhere) */}
      <AnimatePresence>
        {inspectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInspectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-amber-400 rounded-2xl pixel-box p-4 max-w-xs w-full shadow-2xl flex flex-col items-center text-center"
            >
              <span className="text-3xl mb-1">{inspectedItem.item.icon}</span>
              <h3 className="font-pixel text-xs sm:text-sm text-amber-300 font-bold mb-1">
                {inspectedItem.item.name}
              </h3>
              {'rarity' in inspectedItem.item && (
                <span className="font-pixel text-[7.5px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase mb-2 border border-amber-500/40">
                  {inspectedItem.item.rarity}
                </span>
              )}
              <p className="font-retro text-xs text-slate-200 mb-4 leading-relaxed">
                {inspectedItem.item.description}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full">
                {!inspectedItem.isShop && inspectedItem.inventoryIndex !== undefined && (
                  <button
                    onClick={() => {
                      if (inspectedItem.type === 'joker') {
                        onSellJoker(inspectedItem.inventoryIndex!);
                      } else {
                        onSellUnoCard(inspectedItem.inventoryIndex!);
                      }
                      setInspectedItem(null);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-pixel text-[9px] py-2 rounded-lg pixel-box font-bold cursor-pointer"
                  >
                    VENDI (+${'sellValue' in inspectedItem.item ? inspectedItem.item.sellValue : 1})
                  </button>
                )}
                <button
                  onClick={() => setInspectedItem(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-[9px] py-2 rounded-lg pixel-box cursor-pointer"
                >
                  CHIUDI
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. BOOSTER PACK OPENING MODAL */}
      <AnimatePresence>
        {activeBooster && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="bg-slate-900 border-3 border-purple-400 rounded-2xl pixel-box p-4 sm:p-6 max-w-2xl w-full text-center shadow-2xl flex flex-col items-center my-auto"
            >
              <div className="text-3xl mb-1">{activeBooster.pack.icon}</div>
              <h3 className="font-pixel text-xs sm:text-base text-purple-300 font-bold mb-1">
                {activeBooster.pack.name}
              </h3>
              <p className="font-retro text-xs text-slate-300 mb-4">
                Scegli {activeBooster.pack.selectCount - activeBooster.selectedCount} carta!
                {activeBooster.cards.length > 0 && (
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Ogni carta scelta prende il posto della carta più debole del mazzo (il mazzo resta di 40 carte).
                  </span>
                )}
              </p>

              {/* Cards options grid */}
              <div className="flex gap-2.5 sm:gap-4 flex-wrap justify-center mb-5 max-h-[50vh] overflow-y-auto p-1">
                {activeBooster.cards.map((card) => (
                  <div key={card.id} className="flex flex-col items-center">
                    <PixelCard card={card} size="sm" />
                    <button
                      onClick={() => handleSelectBoosterCard(card)}
                      className="mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel text-[8px] sm:text-[9px] font-bold px-2.5 py-1.5 rounded-lg pixel-box shadow cursor-pointer"
                    >
                      SCEGLI
                    </button>
                  </div>
                ))}

                {activeBooster.unoCards.map((unoCard) => (
                  <div key={unoCard.id} className="flex flex-col items-center">
                    <UnoCardSlot unoCard={unoCard} size="sm" />
                    <button
                      onClick={() => handleSelectBoosterUnoCard(unoCard)}
                      className="mt-2 bg-red-600 hover:bg-red-500 text-white font-pixel text-[8px] sm:text-[9px] font-bold px-2.5 py-1.5 rounded-lg pixel-box shadow cursor-pointer"
                    >
                      SCEGLI
                    </button>
                  </div>
                ))}

                {activeBooster.jokers.map((joker) => (
                  <div key={joker.id} className="flex flex-col items-center">
                    <JokerSlot joker={joker} size="sm" showSellButton={false} />
                    <button
                      onClick={() => handleSelectBoosterJoker(joker)}
                      className="mt-2 bg-rose-600 hover:bg-rose-500 text-white font-pixel text-[8px] sm:text-[9px] font-bold px-2.5 py-1.5 rounded-lg pixel-box shadow cursor-pointer"
                    >
                      SCEGLI
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveBooster(null)}
                className="font-pixel text-[9px] sm:text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded-lg pixel-box cursor-pointer"
              >
                SALTA / CHIUDI
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
