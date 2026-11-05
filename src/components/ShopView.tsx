import { ArrowRight, Coins } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Joker, UnoCard, BoosterPack, Voucher, PlayingCard } from '../types/game';
import { ALL_BOOSTER_PACKS, ALL_VOUCHERS, ALL_UNO_CARDS } from '../data/unoCards';
import { getRandomJokers, RARITY_LABEL } from '../data/jokers';
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
  onOpenDeckViewer: () => void;
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
    onOpenDeckViewer,
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
    <div className="shop-screen flex-1 flex flex-col p-2 sm:p-4 max-w-6xl mx-auto w-full relative pb-16 sm:pb-4 select-none">
      {/* 1. L'INSEGNA DEL BANCONE
          L'insegna di legno del Bar Sport, la stessa del locale nella scelta
          del tavolo: nome in ottone, dove sei arrivato e quanto hai in tasca. */}
      <div className="shop-header wood-sign rounded-[8px] mb-2.5">
        <div className="rounded-[3px] px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-pixel painted-sign text-[22px] sm:text-[26px] tracking-[0.06em] leading-none truncate">
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
              className="group flex items-center gap-2 cursor-pointer min-h-[44px] px-3.5 py-2 rounded-[6px] bg-[#f0cf6c] hover:bg-[#f7dd90] shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)] transition-colors duration-150 active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="font-condensed text-[#2f2418] text-[22px] sm:text-[26px] leading-none uppercase whitespace-nowrap">
                Torna al tavolo
              </span>
              <ArrowRight
                size={20}
                strokeWidth={1.9}
                className="text-[#2f2418] transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. LA TUA DOTAZIONE
          Sempre aperta, anche sul telefono: un jolly si compra guardando quelli
          che hai gia'. Prima era una tendina chiusa di default. */}
      <section className="shop-panel rounded-xl p-2.5 sm:p-3 mb-3" aria-label="La tua dotazione">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <ShelfHeading label="I tuoi Jolly" count={`${jokers.length}/${maxJokers}`} />
              <button onClick={onOpenDeckViewer} className="price-btn price-btn-ghost font-pixel text-[14px] px-2.5 min-h-[36px] rounded-lg">
                Il tuo mazzo
              </button>
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
                        setInspectedItem({ type: 'joker', item: j, isShop: false, inventoryIndex: i });
                      }}
                      onSell={() => onSellJoker(i)}
                      // VENDI lives in the inspector the tap opens.
                      showSellButton={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 border-t md:border-t-0 md:border-l border-[#2c3b31] pt-2 md:pt-0 md:pl-4">
            <ShelfHeading label="Carte Sola" count={`${consumables.length}/${maxConsumables}`} />
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
                        u ? () => setInspectedItem({ type: 'uno', item: u, isShop: false, inventoryIndex: i }) : undefined
                      }
                      onSell={() => onSellUnoCard(i)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {(jokers.length > 0 || consumables.length > 0) && (
          <p className="font-retro text-[14px] chalk-dim mt-1.5 px-1">Tocca una carta per vederla o venderla.</p>
        )}
      </section>

      {/* 3. IL BANCONE
          Una sola colonna di lettura: prima jolly e Carte Sola, poi bustine e
          tagliandi. Niente schede sul telefono: meta' delle offerte stava
          dietro una linguetta. */}
      <section className="shop-panel rounded-xl p-2.5 sm:p-4 mb-3" aria-label="Jolly e Carte Sola in vendita">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h3 className="font-pixel text-[18px] sm:text-[20px] chalk-yellow leading-none">Al bancone</h3>
          <button
            onClick={handleReroll}
            disabled={money < rerollCost}
            className="price-btn price-btn-ghost font-pixel text-[15px] px-3 min-h-[40px] rounded-lg"
          >
            Cambia offerte · ${rerollCost}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {shopJokers.map((joker, idx) => {
            const cost = discountedShopCost(joker.cost, hasSconto);
            return (
              <ShelfItem
                key={joker.id + idx}
                badge={RARITY_LABEL[joker.rarity]}
                badgeTone={joker.rarity}
                name={joker.name}
                description={joker.description}
                art={getJokerArtUrl(joker.id)}
                icon={joker.icon}
                cost={cost}
                money={money}
                full={jokers.length >= maxJokers}
                onInspect={() => setInspectedItem({ type: 'joker', item: joker, isShop: true, cost })}
                onBuy={() => {
                  sound.playCashChime();
                  purchaseShelfItem(`joker:${rerolls}:${joker.id}`, () => onBuyJoker(joker, cost));
                }}
              />
            );
          })}
          {shopUnoCards.map((unoCard, idx) => {
            const cost = discountedShopCost(unoCard.cost, hasSconto);
            return (
              <ShelfItem
                key={unoCard.id + idx}
                badge="Carta Sola"
                badgeTone="sola"
                name={unoCard.name}
                description={unoCard.description}
                art={getUnoArtUrl(unoCard.id)}
                icon={unoCard.icon}
                cost={cost}
                money={money}
                full={consumables.length >= maxConsumables}
                onInspect={() => setInspectedItem({ type: 'uno', item: unoCard, isShop: true, cost })}
                onBuy={() => {
                  sound.playCashChime();
                  purchaseShelfItem(`sola:${rerolls}:${unoCard.id}`, () => onBuyUnoCard(unoCard, cost));
                }}
              />
            );
          })}
          {shopJokers.length + shopUnoCards.length === 0 && (
            <p className="col-span-full font-retro text-[16px] chalk-dim py-4 text-center">
              Il bancone è vuoto. Cambia le offerte o torna al tavolo.
            </p>
          )}
        </div>
      </section>

      {/* 4. BUSTINE / TAGLIANDI E SERVIZI
          Gli slot si compravano in tre posti diversi (due servizi sotto la
          dotazione e un tagliando): ora stanno tutti qui, uno accanto all'altro,
          cosi' si vede che Tavolo Allargato e Amplia Tavolo sono parenti. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
        <section className="shop-panel rounded-xl p-2.5 sm:p-4" aria-label="Bustine">
          <h3 className="font-pixel text-[18px] sm:text-[20px] chalk-yellow leading-none mb-2.5">Bustine</h3>
          <div className="space-y-2">
            {shopPacks.length === 0 && (
              <p className="font-retro text-[15px] chalk-dim py-2">Bustine finite per stasera.</p>
            )}
            {shopPacks.map((pack) => {
              const cost = discountedShopCost(pack.cost, hasSconto);
              return (
                <ShopRow
                  key={pack.id}
                  icon={pack.icon}
                  name={pack.name}
                  detail={pack.subtitle}
                  action={
                    <button onClick={() => handleOpenBooster(pack)} disabled={money < cost} className="price-btn font-pixel text-[16px] px-3 min-h-[40px] min-w-[64px] rounded-lg">
                      ${cost}
                    </button>
                  }
                />
              );
            })}
          </div>
        </section>

        <section className="shop-panel rounded-xl p-2.5 sm:p-4" aria-label="Tagliandi e servizi">
          <h3 className="font-pixel text-[18px] sm:text-[20px] chalk-yellow leading-none mb-2.5">Tagliandi e servizi</h3>
          <div className="space-y-2">
            {shopVouchers.map((voucher) => {
              const isBought = vouchers.some((v) => v.id === voucher.id && v.bought);
              const cost = discountedShopCost(voucher.cost, hasSconto);
              return (
                <ShopRow
                  key={voucher.id}
                  icon={voucher.icon}
                  name={voucher.name}
                  detail={voucher.description}
                  action={
                    isBought ? (
                      <span className="font-pixel text-[15px] chalk-green px-2">Attivo</span>
                    ) : (
                      <button
                        onClick={() => {
                          sound.playCashChime();
                          purchaseShelfItem(`voucher:${voucher.id}`, () => onBuyVoucher(voucher, cost));
                        }}
                        disabled={money < cost}
                        className="price-btn font-pixel text-[16px] px-3 min-h-[40px] min-w-[64px] rounded-lg"
                      >
                        ${cost}
                      </button>
                    )
                  }
                />
              );
            })}
            {/* Always for sale until the cap: a bad reroll must never hide them. */}
            <SlotServiceButton
              icon="🪑"
              label="Amplia tavolo"
              microcopy="+1 slot Jolly"
              currentSlots={maxJokers}
              cap={getJokerSlotCap(slotRules)}
              offer={jokerSlotOffer}
              money={money}
              onBuy={() => buySlot(jokerSlotOffer, onBuyJokerSlot)}
            />
            <SlotServiceButton
              icon="👝"
              label="Allarga tasca"
              microcopy="+1 slot Carte Sola"
              currentSlots={maxConsumables}
              cap={getConsumableSlotCap(slotRules)}
              offer={consumableSlotOffer}
              money={money}
              onBuy={() => buySlot(consumableSlotOffer, onBuyConsumableSlot)}
            />
          </div>
        </section>
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
                <span className="font-pixel text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase mb-2 border border-amber-500/40">
                  {RARITY_LABEL[inspectedItem.item.rarity]}
                </span>
              ) : inspectedItem.type === 'uno' ? (
                <span className="font-pixel text-[11px] px-2 py-0.5 rounded bg-red-600/20 text-red-300 uppercase mb-2 border border-red-500/40">
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
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-pixel text-[13px] py-2 rounded-lg pixel-box font-bold cursor-pointer"
                  >
                    VENDI (+${'sellValue' in inspectedItem.item ? inspectedItem.item.sellValue : 1})
                  </button>
                )}
                <button
                  onClick={() => setInspectedItem(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-[13px] py-2 rounded-lg pixel-box cursor-pointer"
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
                <span className="block text-[14px] text-slate-400 mt-1">
                  Tocca una carta per guardarla da vicino.
                </span>
                {activeBooster.cards.length > 0 && (
                  <span className="block text-[14px] text-slate-400 mt-1">
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
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel text-[12px] font-bold px-2 py-1 rounded-lg pixel-box shadow cursor-pointer"
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
                      className="bg-red-600 hover:bg-red-500 text-white font-pixel text-[12px] font-bold px-2 py-1 rounded-lg pixel-box shadow cursor-pointer"
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
                      className="bg-rose-600 hover:bg-rose-500 text-white font-pixel text-[12px] font-bold px-2 py-1 rounded-lg pixel-box shadow cursor-pointer"
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
                      className="font-pixel text-[12px] sm:text-[13px] text-slate-200 px-3 py-2 border border-slate-600 rounded-lg pixel-box cursor-pointer"
                    >
                      CONTINUA A SCEGLIERE
                    </button>
                    <button
                      onClick={() => {
                        setConfirmBoosterAbandon(false);
                        setActiveBooster(null);
                      }}
                      className="font-pixel text-[12px] sm:text-[13px] text-white bg-rose-700 hover:bg-rose-600 px-3 py-2 border border-rose-400 rounded-lg pixel-box cursor-pointer"
                    >
                      {boosterAbandonLabel(activeBooster.pack.selectCount, activeBooster.selectedCount)}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmBoosterAbandon(true)}
                  className="font-pixel text-[13px] sm:text-[13px] text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded-lg pixel-box cursor-pointer"
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
  onBuy: () => void;
}> = ({ icon, label, microcopy, currentSlots, cap, offer, money, onBuy }) => (
  <ShopRow
    icon={icon}
    name={label}
    detail={
      currentSlots >= cap || !offer
        ? `${microcopy} · al massimo (${cap})`
        : `${microcopy} · da ${currentSlots} a ${offer.toSlots} (max ${cap})`
    }
    action={
      currentSlots >= cap || !offer ? (
        <span className="font-pixel text-[15px] chalk-dim px-2">Max</span>
      ) : (
        <button onClick={onBuy} disabled={money < offer.cost} className="price-btn font-pixel text-[16px] px-3 min-h-[40px] min-w-[64px] rounded-lg">
          ${offer.cost}
        </button>
      )
    }
  />
);

const ShelfHeading: React.FC<{ label: string; count: string }> = ({ label, count }) => (
  <div className="flex items-baseline gap-2 px-1 mb-1">
    <span className="font-pixel text-[16px] sm:text-[17px] chalk-yellow">{label}</span>
    <span className="font-condensed text-[16px] chalk-dim tabular-nums">{count}</span>
  </div>
);

/** One line of the right-hand lists: icon, what it is, one price on the right. */
const ShopRow: React.FC<{ icon: string; name: string; detail: string; action: React.ReactNode }> = ({ icon, name, detail, action }) => (
  <div className="shop-item rounded-lg px-2.5 py-2 flex items-center justify-between gap-2.5">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="text-xl shrink-0" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <div className="font-pixel text-[16px] sm:text-[17px] chalk leading-tight">{name}</div>
        {/* Two lines, not one truncated: half the voucher text used to end in an ellipsis. */}
        <div className="font-retro text-[14px] sm:text-[15px] chalk-dim leading-snug line-clamp-2">{detail}</div>
      </div>
    </div>
    <div className="shrink-0">{action}</div>
  </div>
);

const BADGE_TONE: Record<string, string> = {
  common: 'chalk-dim',
  uncommon: 'chalk-green',
  rare: 'chalk-yellow',
  legendary: 'chalk-red',
  sola: 'chalk-red',
};

/**
 * Una carta sul bancone. Il colore sta solo nell'etichetta della categoria: il
 * tasto del prezzo e' uguale per tutto, cosi' l'occhio confronta i prezzi e non
 * i gradienti (prima giallo, rosso, viola e arancio a seconda dello scaffale).
 */
const ShelfItem: React.FC<{
  badge: string;
  badgeTone: string;
  name: string;
  description: string;
  art: string | null | undefined;
  icon: string;
  cost: number;
  money: number;
  full: boolean;
  onInspect: () => void;
  onBuy: () => void;
}> = ({ badge, badgeTone, name, description, art, icon, cost, money, full, onInspect, onBuy }) => (
  <div className="shop-item rounded-xl p-2 flex flex-col gap-1.5">
    <button type="button" onClick={onInspect} className="flex flex-col items-center text-center cursor-pointer min-w-0" aria-label={`Dettagli: ${name}`}>
      <span className={`font-pixel text-[13px] uppercase tracking-[0.06em] self-start ${BADGE_TONE[badgeTone] ?? 'chalk-dim'}`}>{badge}</span>
      <div className={`${PICKER_CARD_BOX} rounded-lg bg-[#0f1813] flex items-center justify-center overflow-hidden my-1`}>
        {art ? <CardFaceArt src={art} alt={name} /> : <span className="text-2xl">{icon}</span>}
      </div>
      <span className="font-pixel text-[16px] sm:text-[17px] chalk leading-tight line-clamp-2">{name}</span>
      <span className="font-retro text-[14px] chalk-dim leading-snug line-clamp-3 mt-0.5">{description}</span>
    </button>
    <button onClick={onBuy} disabled={full || money < cost} className="price-btn font-pixel text-[16px] w-full min-h-[40px] rounded-lg mt-auto">
      {full ? 'Slot pieni' : `Compra · $${cost}`}
    </button>
  </div>
);
