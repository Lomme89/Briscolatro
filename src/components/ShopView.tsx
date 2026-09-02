import { ArrowRight, Coins } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Joker, UnoCard, BoosterPack, Voucher, PlayingCard } from '../types/game';
import { ALL_BOOSTER_PACKS, ALL_VOUCHERS, ALL_UNO_CARDS } from '../data/unoCards';
import { getRandomJokers } from '../data/jokers';
import { JokerSlot } from './JokerSlot';
import { UnoCardSlot } from './UnoCardSlot';
import { PixelCard } from './PixelCard';
import { CardInspectorModal } from './CardInspectorModal';
import { CardUpgradeModal } from './CardUpgradeModal';
import { rollCardUpgrade } from '../game/cardUpgrades';
import { InspectableItem, ItemInspectorModal } from './ItemInspectorModal';
import { PICKER_CARD_BOX } from './cardSizing';
import { CardFaceArt, getJokerArtUrl, getUnoArtUrl } from './CardFaceArt';
import { sound } from '../services/soundEngine';
import confetti from 'canvas-confetti';
import { boosterAbandonLabel, discountedShopCost } from '../game/shopRules';
import {
  getConsumableSlotCap,
  getJokerSlotCap,
  getNextConsumableExpansion,
  getNextJokerExpansion,
  isTavoloAllargatoUseful,
  SlotExpansion,
  SlotRules,
} from '../game/slotExpansions';
import { createRunRng, pickRun, shuffleRun } from '../game/runRng';
import { ShopSnapshotV1 } from '../game/runPersistence';

interface ShopViewModel {
  build: {
    money: number;
    jokers: Joker[];
    consumables: UnoCard[];
    vouchers: Voucher[];
    maxJokers: number;
    maxConsumables: number;
  };
  visit: {
    slotRules: SlotRules;
    runDeck: PlayingCard[];
    ante: number;
    round: number;
    shopState: ShopSnapshotV1;
  };
}

interface ShopViewActions {
  onBuyJoker: (joker: Joker, cost: number) => boolean;
  onBuyUnoCard: (unoCard: UnoCard, cost: number) => boolean;
  onBuyVoucher: (voucher: Voucher, cost: number) => boolean;
  onSellJoker: (index: number) => void;
  onSellUnoCard: (index: number) => void;
  onBuyJokerSlot: () => boolean;
  onBuyConsumableSlot: () => boolean;
  onUpgradeCard: (upgraded: PlayingCard) => void;
  onNextRound: () => void;
  onReroll: (cost: number) => boolean;
  onShopStateChange: (patch: Partial<ShopSnapshotV1>) => void;
}

interface ShopViewProps {
  model: ShopViewModel;
  actions: ShopViewActions;
}

export const ShopView: React.FC<ShopViewProps> = ({ model, actions }) => {
  const {
    build: { money, jokers, consumables, vouchers, maxJokers, maxConsumables },
    visit: { slotRules, runDeck, ante, round, shopState },
  } = model;
  const {
    onBuyJoker,
    onBuyUnoCard,
    onBuyVoucher,
    onSellJoker,
    onSellUnoCard,
    onBuyJokerSlot,
    onBuyConsumableSlot,
    onUpgradeCard,
    onNextRound,
    onReroll,
    onShopStateChange,
  } = actions;
  const hasSconto = vouchers.some(v => v.id === 'v_sconto' && v.bought);
  const hasTavolo = vouchers.some(v => v.id === 'v_tavolo' && v.bought);

  // The two permanent services. Same helpers the till uses, so the price on the
  // button is the price that gets charged - there is no second formula here.
  const slotContext = { hasTavoloAllargato: hasTavolo, hasHouseDiscount: hasSconto };
  const jokerSlotOffer = getNextJokerExpansion(maxJokers, slotContext, slotRules);
  const consumableSlotOffer = getNextConsumableExpansion(maxConsumables, slotContext, slotRules);

  // Three on the shelf, not two.
  //
  // The run went from twenty-three shops to fifteen when the Ante lost its
  // middle blind, and a measured run came out with a third fewer jolly and half
  // the upgraded cards. The answer is more to choose from, not more money:
  // prices, rewards and interest are all untouched.
  //
  // The shelf is derived, never stored.
  //
  // Save/Resume made the difference matter: a shelf held in component state
  // disappears with the component, and a run reloaded into the shop would roll
  // a brand new one. A shelf that is a pure function of (seed, rerolls) comes
  // back exactly as it was left, and the snapshot only has to carry two numbers.
  const { seed: shopSeed, rerolls } = shopState;
  const shelfRng = (salt: number) => createRunRng(shopSeed + salt * 7919 + rerolls * 104729);

  // Bought is a key, not a splice: removing an entry from the array would
  // shift the keys of everything after it, and the shelf has to be addressable
  // the same way before and after a reload.
  const isSold = (key: string) => shopState.boughtKeys.includes(key);
  const shopJokers = React.useMemo<Joker[]>(
    () => getRandomJokers(3, [], shelfRng(1).random),
    [shopSeed, rerolls]
  ).filter((joker) => !isSold(`joker:${rerolls}:${joker.id}`));
  const shopUnoCards = React.useMemo<UnoCard[]>(
    () => shelfRng(2).shuffle(ALL_UNO_CARDS).slice(0, 2),
    [shopSeed, rerolls]
  ).filter((unoCard) => !isSold(`sola:${rerolls}:${unoCard.id}`));
  // Packs and vouchers survive a reroll: only the jolly and the Carte Sola are
  // what the player is paying to change.
  const offeredPacks = React.useMemo<BoosterPack[]>(
    () => createRunRng(shopSeed + 3 * 7919).shuffle(ALL_BOOSTER_PACKS).slice(0, 3),
    [shopSeed]
  );
  // The shelf used to be ALL_VOUCHERS.slice(0, 2), so Scarto Tattico and
  // Tessera VIP existed in the data and never in a shop. Two are drawn from
  // whatever you did not own on the way in - a roguelike offer, not a fixed
  // catalogue.
  const [shopVouchers] = useState<Voucher[]>(() => {
    const owned = new Set(vouchers.filter((v) => v.bought).map((v) => v.id));
    // Tavolo Allargato at the jolly cap has no chair to give and no later
    // expansion to discount: an empty box is not an offer.
    const useful = (voucher: Voucher) =>
      voucher.id !== 'v_tavolo' || isTavoloAllargatoUseful(maxJokers, slotRules);
    return createRunRng(shopSeed + 4 * 7919)
      .shuffle(ALL_VOUCHERS.filter((v) => !owned.has(v.id) && useful(v)))
      .slice(0, 2);
  });
  // A pack leaves the shelf for good once it has been opened.
  const shopPacks = offeredPacks.filter((pack) => !isSold(`pack:${pack.id}`));
  const rerollCost = discountedShopCost(5 + rerolls, hasSconto);
  // A booster card is picked at thumbnail size, so it opens in the inspector
  // first: the artwork at a readable size and every power written out.
  const [inspectedCard, setInspectedCard] = useState<PlayingCard | null>(null);
  // The upgrade waiting to be compared against the card the player already has.
  const [pendingUpgrade, setPendingUpgrade] = useState<PlayingCard | null>(null);
  // Same idea for the jolly and the carte UNO of a booster: their slots carry a
  // tooltip built for the table, which in a grid covers the neighbours.
  const [inspectedBoosterItem, setInspectedBoosterItem] = useState<InspectableItem | null>(null);
  const [mobileTab, setMobileTab] = useState<'cards' | 'packs'>('cards');

  // Selected item inspection modal on mobile
  const [inspectedItem, setInspectedItem] = useState<{
    type: 'joker' | 'uno' | 'voucher';
    item: Joker | UnoCard | Voucher;
    isShop?: boolean;
    cost?: number;
    inventoryIndex?: number;
  } | null>(null);

  const inspectedArtUrl = !inspectedItem
    ? undefined
    : inspectedItem.type === 'joker'
      ? getJokerArtUrl(inspectedItem.item.id)
      : inspectedItem.type === 'uno'
        ? getUnoArtUrl(inspectedItem.item.id)
        : undefined;

  // Active opening booster pack state
  const [activeBooster, setActiveBooster] = useState<{
    pack: BoosterPack;
    cards: PlayingCard[];
    unoCards: UnoCard[];
    jokers: Joker[];
    selectedCount: number;
  } | null>(null);
  const [confirmBoosterAbandon, setConfirmBoosterAbandon] = useState(false);
  const boosterChoiceLockRef = useRef(false);
  const rerollLockRef = useRef(false);
  // Same shape as the reroll guard: one expansion per press, so a fast double
  // tap cannot walk two rungs of the ladder before React has re-rendered.
  const slotLockRef = useRef(false);
  // The ref is the double-tap guard (state is a render behind); the prop is
  // what survives a reload.
  const boughtShelfItemsRef = useRef(new Set<string>(shopState.boughtKeys));

  const publishBoughtKeys = () => {
    onShopStateChange({ boughtKeys: [...boughtShelfItemsRef.current] });
  };

  const purchaseShelfItem = (key: string, purchase: () => boolean): boolean => {
    if (boughtShelfItemsRef.current.has(key)) return false;
    boughtShelfItemsRef.current.add(key);
    if (purchase()) {
      publishBoughtKeys();
      return true;
    }
    boughtShelfItemsRef.current.delete(key);
    return false;
  };

  const buySlot = (offer: SlotExpansion | null, purchase: () => boolean) => {
    if (!offer || money < offer.cost || slotLockRef.current) return;
    slotLockRef.current = true;
    if (purchase()) sound.playCashChime();
    setTimeout(() => { slotLockRef.current = false; }, 0);
  };

  const handleReroll = () => {
    if (money < rerollCost || rerollLockRef.current) return;
    rerollLockRef.current = true;
    sound.playCardFlick();
    if (!onReroll(rerollCost)) {
      rerollLockRef.current = false;
      return;
    }
    onShopStateChange({ rerolls: rerolls + 1 });
    setTimeout(() => { rerollLockRef.current = false; }, 0);
  };

  const handleOpenBooster = (pack: BoosterPack) => {
    const cost = discountedShopCost(pack.cost, hasSconto);
    if (money < cost) return;

    sound.playBoosterRip();
    if (boughtShelfItemsRef.current.has(`pack:${pack.id}`) || !onReroll(cost)) return;
    boughtShelfItemsRef.current.add(`pack:${pack.id}`);
    publishBoughtKeys();
    setConfirmBoosterAbandon(false);
    boosterChoiceLockRef.current = false;

    // The mega pack used to roll packSize of *each* type: fifteen options for
    // two picks, which is where the scrolling came from. packSize is how many
    // options the pack offers in total.
    const shuffle = <T,>(items: T[]): T[] => shuffleRun(items);
    const drawTypes = (): Array<BoosterPack['type']> => {
      if (pack.type !== 'celeste') return Array(pack.packSize).fill(pack.type);
      // One of each is guaranteed, so an All-Star always looks like an All-Star.
      const mix: Array<BoosterPack['type']> = ['cards', 'uno', 'joker'];
      while (mix.length < pack.packSize) {
        mix.push(pickRun<BoosterPack['type']>(['cards', 'uno', 'joker']) ?? 'cards');
      }
      return shuffle(mix).slice(0, pack.packSize);
    };

    const types = drawTypes();
    const countOf = (type: BoosterPack['type']) => types.filter((t) => t === type).length;

    // Drawn from the run deck itself: the pack proposes upgrades to cards the
    // player owns, so there is never a card on offer that the deck does not
    // already contain exactly once.
    const cards: PlayingCard[] = shuffle(runDeck)
      .slice(0, countOf('cards'))
      .map((c) => rollCardUpgrade(c));
    const unoCards: UnoCard[] = shuffle(ALL_UNO_CARDS).slice(0, countOf('uno'));
    const generatedJokers: Joker[] = getRandomJokers(countOf('joker'));

    setActiveBooster({
      pack,
      cards,
      unoCards,
      jokers: generatedJokers,
      selectedCount: 0,
    });
  };

  // Nothing is applied until the player has seen what the upgrade does to
  // their card and confirmed it: cancelling drops back into the pack with
  // every option still on the table.
  const handleSelectBoosterCard = (card: PlayingCard) => {
    if (!activeBooster) return;
    sound.playCardSelect();
    setPendingUpgrade(card);
  };

  const commitBoosterCard = (card: PlayingCard) => {
    if (!activeBooster || boosterChoiceLockRef.current) return;
    boosterChoiceLockRef.current = true;
    sound.playCashChime();
    setConfirmBoosterAbandon(false);
    onUpgradeCard(card);

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
    setTimeout(() => { boosterChoiceLockRef.current = false; }, 0);
  };

  const handleSelectBoosterUnoCard = (unoCard: UnoCard) => {
    if (!activeBooster || boosterChoiceLockRef.current) return;
    if (consumables.length >= maxConsumables) {
      alert('Non hai abbastanza spazio per altre Carte Sola!');
      return;
    }
    sound.playCashChime();
    setConfirmBoosterAbandon(false);
    boosterChoiceLockRef.current = true;
    if (!onBuyUnoCard(unoCard, 0)) {
      boosterChoiceLockRef.current = false;
      return;
    }

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
    setTimeout(() => { boosterChoiceLockRef.current = false; }, 0);
  };

  const handleSelectBoosterJoker = (joker: Joker) => {
    if (!activeBooster || boosterChoiceLockRef.current) return;
    if (jokers.length >= maxJokers) {
      alert('Non hai abbastanza slot per altri Jolly!');
      return;
    }
    sound.playCashChime();
    setConfirmBoosterAbandon(false);
    boosterChoiceLockRef.current = true;
    if (!onBuyJoker(joker, 0)) {
      boosterChoiceLockRef.current = false;
      return;
    }

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
    setTimeout(() => { boosterChoiceLockRef.current = false; }, 0);
  };

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 max-w-6xl mx-auto w-full relative pb-16 sm:pb-4 select-none">
      {/* 1. L'INSEGNA DEL BANCONE
          Il negozio e' il bancone del Bar Sport, e sopra il bancone c'e' la
          stessa lavagna del menu: nome dipinto, e a gesso quello che cambia
          ogni sera - dove sei arrivato e quanto ti resta in tasca. */}
      <div className="slate-frame rounded-[8px] p-1.5 sm:p-2 mb-2.5">
        <div className="slate-board rounded-[3px] px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-pixel painted-sign text-[11px] sm:text-[13px] tracking-[0.12em] leading-tight truncate">
              BAR SPORT
            </h2>
            <p className="font-condensed chalk-dim text-[15px] sm:text-[17px] uppercase leading-none mt-1">
              Ante {ante} · Round {round}
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0 ml-auto">
            <div className="flex items-center gap-1.5" title="Quello che ti resta in tasca">
              <Coins size={18} strokeWidth={1.6} className="chalk-yellow" />
              <span className="font-condensed chalk-yellow text-[22px] sm:text-[26px] leading-none tabular-nums">
                ${money}
              </span>
            </div>

            {/* Scritto a gesso e basta, "Si gioca" era una voce del menu, non
                un tasto: la cosa piu' importante della bottega non si capiva
                che si poteva premere. Adesso e' un cartello inquadrato, alto
                quanto un dito, e dice dove porta. */}
            <button
              type="button"
              onClick={() => {
                sound.playCardFlick();
                onNextRound();
              }}
              className="group flex items-center gap-2 cursor-pointer min-h-[44px] px-3.5 py-2 rounded-[6px] border-2 border-[rgba(232,199,102,0.75)] bg-[rgba(232,199,102,0.12)] hover:bg-[rgba(232,199,102,0.22)] transition-colors duration-150 active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="font-condensed chalk-yellow text-[22px] sm:text-[26px] leading-none uppercase whitespace-nowrap">
                Torna al tavolo
              </span>
              <ArrowRight
                size={20}
                strokeWidth={1.9}
                className="chalk-yellow transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>
          </div>
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
                  <div key={i}>
                    <JokerSlot
                      joker={j}
                      size="sm"
                      // The rail already opens the inspector on a tap, so the
                      // slot's own tooltip only pinned itself over the neighbours.
                      disableTooltip
                      onClick={() => {
                        if (!j) return;
                        setInspectedItem({
                          type: 'joker',
                          item: j,
                          isShop: false,
                          inventoryIndex: i,
                        });
                      }}
                      onSell={() => onSellJoker(i)}
                      // The rail clips it in half anyway; VENDI lives in the
                      // inspector the tap opens.
                      showSellButton={false}
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
                <span className="bg-red-600 text-white px-1 rounded text-[7.5px] font-black">SOLA</span>
                CARTE AZIONE ({consumables.length}/{maxConsumables})
              </span>
              <span className="text-[8px] text-slate-400">Tocca per vendere</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
              {Array.from({ length: maxConsumables }).map((_, i) => {
                const u = consumables[i] || null;
                return (
                  <div key={i}>
                    <UnoCardSlot
                      unoCard={u}
                      size="sm"
                      disableTooltip
                      onInspect={
                        u
                          ? () =>
                              setInspectedItem({
                                type: 'uno',
                                item: u,
                                isShop: false,
                                inventoryIndex: i,
                              })
                          : undefined
                      }
                      onSell={() => onSellUnoCard(i)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/*
          The two permanent services, in a fixed strip under the dock they act
          on. Deliberately not on the random shelves: these are always for sale
          until the cap, so a bad reroll must never be able to hide them.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-slate-800">
          <SlotServiceButton
            icon="🪑"
            label="AMPLIA TAVOLO"
            microcopy="+1 SLOT JOLLY"
            currentSlots={maxJokers}
            cap={getJokerSlotCap(slotRules)}
            offer={jokerSlotOffer}
            money={money}
            accent="amber"
            onBuy={() => buySlot(jokerSlotOffer, onBuyJokerSlot)}
          />
          <SlotServiceButton
            icon="👝"
            label="ALLARGA TASCA"
            microcopy="+1 SLOT CARTE SOLA"
            currentSlots={maxConsumables}
            cap={getConsumableSlotCap(slotRules)}
            offer={consumableSlotOffer}
            money={money}
            accent="red"
            onBuy={() => buySlot(consumableSlotOffer, onBuyConsumableSlot)}
          />
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
          <span>JOLLY & SOLA ({shopJokers.length + shopUnoCards.length})</span>
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
                <span>🃏</span> PERSONAGGI & CARTE SOLA
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
                const cost = discountedShopCost(joker.cost, hasSconto);
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

                      <div className={`${PICKER_CARD_BOX} rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center justify-center overflow-hidden my-0.5`}>
                        {getJokerArtUrl(joker.id) ? (
                          <CardFaceArt src={getJokerArtUrl(joker.id)!} alt={joker.name} />
                        ) : (
                          <span className="text-xl sm:text-2xl">{joker.icon}</span>
                        )}
                      </div>

                      <div className="font-pixel text-[9px] sm:text-[10px] text-amber-300 font-bold leading-tight mt-0.5 line-clamp-2">
                        {joker.name}
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-300 line-clamp-3 leading-tight mt-0.5 font-retro">
                        {joker.description}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!canAfford) return;
                        sound.playCashChime();
                        purchaseShelfItem(`joker:${rerolls}:${joker.id}`, () => onBuyJoker(joker, cost));
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
                const cost = discountedShopCost(unoCard.cost, hasSconto);
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
                          SOLA
                        </span>
                        <span className="text-[9px] text-slate-400">ⓘ Info</span>
                      </div>

                      <div className={`${PICKER_CARD_BOX} rounded-lg bg-slate-900 border border-red-800 flex flex-col items-center justify-center overflow-hidden my-0.5`}>
                        {getUnoArtUrl(unoCard.id) ? (
                          <CardFaceArt src={getUnoArtUrl(unoCard.id)!} alt={unoCard.name} />
                        ) : (
                          <span className="text-xl sm:text-2xl">{unoCard.icon}</span>
                        )}
                      </div>

                      <div className="font-pixel text-[9px] sm:text-[10px] text-red-300 font-bold leading-tight mt-0.5 line-clamp-2">
                        {unoCard.name}
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-300 line-clamp-3 leading-tight mt-0.5 font-retro">
                        {unoCard.description}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!canAfford) return;
                        sound.playCashChime();
                        purchaseShelfItem(`sola:${rerolls}:${unoCard.id}`, () => onBuyUnoCard(unoCard, cost));
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
                const cost = discountedShopCost(pack.cost, hasSconto);
                const canAfford = money >= cost;
                return (
                  <div
                    key={pack.id}
                    className="p-2 sm:p-2.5 bg-slate-950/80 border border-purple-800/80 rounded-xl pixel-box flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl sm:text-2xl shrink-0">{pack.icon}</span>
                      <div className="min-w-0">
                        <div className="font-pixel text-[9px] sm:text-[10px] text-purple-200 font-bold line-clamp-2">
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
                {shopVouchers.length === 0 && (
                  <div className="font-retro text-[11px] text-slate-500 px-1 py-2">
                    Hai già tutti i tagliandi. Il barista non sa più cosa venderti.
                  </div>
                )}
                {shopVouchers.map((voucher) => {
                  const isBought = vouchers.some(v => v.id === voucher.id && v.bought);
                  const cost = discountedShopCost(voucher.cost, hasSconto);
                  const canAfford = money >= cost && !isBought;
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
                          <div className="font-pixel text-[8.5px] sm:text-[9px] font-bold line-clamp-2">
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
                            purchaseShelfItem(`voucher:${voucher.id}`, () => onBuyVoucher(voucher, cost));
                          }}
                          disabled={!canAfford}
                          className={`font-pixel text-[8px] sm:text-[8.5px] px-2.5 py-1.5 rounded-lg pixel-box font-bold shrink-0 cursor-pointer transition-all active:scale-95 ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                              : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          ${cost}
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
              className={`bg-slate-900 border-2 rounded-2xl pixel-box p-4 max-w-xs w-full shadow-2xl flex flex-col items-center text-center ${
                inspectedItem.type === 'uno' ? 'border-red-500' : 'border-amber-400'
              }`}
            >
              {inspectedArtUrl ? (
                // The one place with room for it: the full illustration, big.
                <div
                  className={`w-28 h-38 mb-2 rounded-lg overflow-hidden border-2 pixel-box ${
                    inspectedItem.type === 'uno' ? 'border-red-500/60' : 'border-amber-500/50'
                  }`}
                >
                  <CardFaceArt src={inspectedArtUrl} alt={inspectedItem.item.name} />
                </div>
              ) : (
                <span className="text-3xl mb-1">{inspectedItem.item.icon}</span>
              )}
              <h3
                className={`font-pixel text-xs sm:text-sm font-bold mb-1 ${
                  inspectedItem.type === 'uno' ? 'text-red-300' : 'text-amber-300'
                }`}
              >
                {inspectedItem.item.name}
              </h3>
              {'rarity' in inspectedItem.item ? (
                <span className="font-pixel text-[7.5px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase mb-2 border border-amber-500/40">
                  {inspectedItem.item.rarity}
                </span>
              ) : inspectedItem.type === 'uno' ? (
                <span className="font-pixel text-[7.5px] px-2 py-0.5 rounded bg-red-600/20 text-red-300 uppercase mb-2 border border-red-500/40">
                  Carta Sola
                </span>
              ) : null}
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
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3"
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
              <p className="font-retro text-xs text-slate-300 mb-3">
                Scegli {activeBooster.pack.selectCount - activeBooster.selectedCount}{' '}
                {activeBooster.pack.selectCount - activeBooster.selectedCount === 1 ? 'carta' : 'carte'}!
                <span className="block text-[10px] text-slate-400 mt-1">
                  Tocca una carta per guardarla da vicino.
                </span>
                {activeBooster.cards.length > 0 && (
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Ogni carta qui è una TUA carta potenziata: la trasformi, non la aggiungi. Il mazzo resta di {runDeck.length} carte.
                  </span>
                )}
              </p>

              {/* Cards options grid. Every option is the same box, whatever it
                  is, and the whole pack fits on a phone without scrolling. */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-2 gap-y-3 justify-items-center mb-4">
                {activeBooster.cards.map((card) => (
                  <div key={card.id} className="flex flex-col items-center gap-1.5">
                    <PixelCard
                      card={card}
                      size="pick"
                      onClick={() => {
                        sound.playCardSelect();
                        setInspectedCard(card);
                      }}
                    />
                    <button
                      onClick={() => handleSelectBoosterCard(card)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel text-[8px] font-bold px-2 py-1 rounded-lg pixel-box shadow cursor-pointer"
                    >
                      SCEGLI
                    </button>
                  </div>
                ))}

                {activeBooster.unoCards.map((unoCard) => (
                  <div key={unoCard.id} className="flex flex-col items-center gap-1.5">
                    <UnoCardSlot
                      unoCard={unoCard}
                      size="pick"
                      disableTooltip
                      onInspect={() => setInspectedBoosterItem({ kind: 'uno', item: unoCard })}
                    />
                    <button
                      onClick={() => handleSelectBoosterUnoCard(unoCard)}
                      className="bg-red-600 hover:bg-red-500 text-white font-pixel text-[8px] font-bold px-2 py-1 rounded-lg pixel-box shadow cursor-pointer"
                    >
                      SCEGLI
                    </button>
                  </div>
                ))}

                {activeBooster.jokers.map((joker) => (
                  <div key={joker.id} className="flex flex-col items-center gap-1.5">
                    <JokerSlot
                      joker={joker}
                      size="pick"
                      showSellButton={false}
                      disableTooltip
                      onClick={() => setInspectedBoosterItem({ kind: 'joker', item: joker })}
                    />
                    <button
                      onClick={() => handleSelectBoosterJoker(joker)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-pixel text-[8px] font-bold px-2 py-1 rounded-lg pixel-box shadow cursor-pointer"
                    >
                      SCEGLI
                    </button>
                  </div>
                ))}
              </div>

              {confirmBoosterAbandon ? (
                <div className="w-full border-2 border-rose-500 bg-rose-950/60 rounded-xl p-2.5">
                  <p className="font-retro text-xs text-rose-200 mb-2">
                    La bustina è già stata pagata. Le scelte non usate andranno perse.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setConfirmBoosterAbandon(false)}
                      className="font-pixel text-[8px] sm:text-[9px] text-slate-200 px-3 py-2 border border-slate-600 rounded-lg pixel-box cursor-pointer"
                    >
                      CONTINUA A SCEGLIERE
                    </button>
                    <button
                      onClick={() => {
                        setConfirmBoosterAbandon(false);
                        setActiveBooster(null);
                      }}
                      className="font-pixel text-[8px] sm:text-[9px] text-white bg-rose-700 hover:bg-rose-600 px-3 py-2 border border-rose-400 rounded-lg pixel-box cursor-pointer"
                    >
                      {boosterAbandonLabel(activeBooster.pack.selectCount, activeBooster.selectedCount)}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmBoosterAbandon(true)}
                  className="font-pixel text-[9px] sm:text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded-lg pixel-box cursor-pointer"
                >
                  SALTA / CHIUDI
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Your card, and your card wearing the upgrade. Nothing else. */}
      <CardUpgradeModal
        upgraded={pendingUpgrade}
        current={
          pendingUpgrade
            ? runDeck.find((c) => c.suit === pendingUpgrade.suit && c.rank === pendingUpgrade.rank) ?? null
            : null
        }
        onConfirm={() => {
          const card = pendingUpgrade;
          setPendingUpgrade(null);
          if (card) commitBoosterCard(card);
        }}
        onCancel={() => setPendingUpgrade(null)}
      />

      {/* Card inspector, opened by tapping a booster card */}
      <CardInspectorModal
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
        onConfirm={() => {
          if (!inspectedCard) return;
          const card = inspectedCard;
          setInspectedCard(null);
          handleSelectBoosterCard(card);
        }}
        confirmLabel="SCEGLI QUESTA"
      />

      {/* Same, for a personaggio or a carta UNO out of a booster */}
      <ItemInspectorModal
        entry={inspectedBoosterItem}
        onClose={() => setInspectedBoosterItem(null)}
        onConfirm={() => {
          const entry = inspectedBoosterItem;
          if (!entry) return;
          setInspectedBoosterItem(null);
          if (entry.kind === 'joker') handleSelectBoosterJoker(entry.item);
          else handleSelectBoosterUnoCard(entry.item);
        }}
        confirmLabel="SCEGLI QUESTA"
      />
    </div>
  );
};


/**
 * One permanent service: what you have, what the next one costs, MAX at the cap.
 *
 * The touch target is a real 44px on phones - this sits directly under the
 * inventory rail, where a mis-tap costs money.
 */
const SlotServiceButton: React.FC<{
  icon: string;
  label: string;
  microcopy: string;
  currentSlots: number;
  cap: number;
  offer: SlotExpansion | null;
  money: number;
  accent: 'amber' | 'red';
  onBuy: () => void;
}> = ({ icon, label, microcopy, currentSlots, cap, offer, money, accent, onBuy }) => {
  const atCap = currentSlots >= cap;
  const canAfford = offer !== null && money >= offer.cost;
  const accentText = accent === 'amber' ? 'text-amber-300' : 'text-red-300';
  const accentButton =
    accent === 'amber'
      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950'
      : 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white';

  return (
    <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl px-2 py-1.5 pixel-box flex items-center justify-between gap-2 min-h-[44px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-lg sm:text-xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className={`font-pixel text-[8.5px] sm:text-[9.5px] font-bold truncate ${accentText}`}>
            {label}
          </div>
          <div className="font-retro text-[8.5px] sm:text-[9.5px] text-slate-400 truncate">
            {microcopy} • {currentSlots}/{cap}
            {offer && <span className="text-slate-300"> ➔ {offer.toSlots}</span>}
          </div>
        </div>
      </div>

      {atCap || !offer ? (
        <span className="font-pixel text-[8px] sm:text-[8.5px] bg-emerald-800 text-emerald-100 px-2.5 rounded shrink-0 flex items-center min-h-[36px]">
          MAX
        </span>
      ) : (
        <button
          onClick={onBuy}
          disabled={!canAfford}
          className={`shrink-0 font-pixel text-[8.5px] sm:text-[9px] px-3 rounded-lg pixel-box font-bold cursor-pointer transition-all active:scale-95 min-h-[36px] min-w-[56px] ${
            canAfford ? `${accentButton} shadow-md` : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          ${offer.cost}
        </button>
      )}
    </div>
  );
};
