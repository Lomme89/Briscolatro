import { BuyerPolicy, jokerAppeal, RunPolicy } from './runSim';
import { CONSERVATIVE, HYBRID } from './policies';

/**
 * Quattro modi di spendere.
 *
 * None of them has a shopping list. Each one is a set of preferences applied to
 * whatever the shop actually put on the shelf that evening, which is the whole
 * point: a run that receives the Vesuvio at ante 3 by decree tells you nothing
 * about whether a run can find one.
 *
 * They all keep a small float rather than spending to zero, because the
 * interest is real money - a dollar for every five held, up to five - and a
 * policy that ignores it is not modelling a player, it is modelling a bug.
 */

/**
 * A dollar of interest for every five held, capped at five - so a float of
 * twenty-five is the point past which holding money stops paying and anything
 * above it is free to spend. The VIP card moves the cap to ten, and the float
 * with it.
 */
const INTEREST_STEP = 5;

/**
 * A. Prima i soldi.
 *
 * Buys the economy vouchers on sight, then sits on its float and lets the
 * interest compound. It buys jokers only out of what is above the next interest
 * step, so it is almost always the poorest board and the fattest wallet.
 */
export const ECONOMY_FIRST: BuyerPolicy = {
  id: 'economy_first',
  name: 'Economy first',
  blurb: 'Compra i tagliandi economici e poi lascia lavorare gli interessi.',
  shop(state, offer, actions) {
    for (const voucher of [...offer.vouchers]) {
      if (voucher.id === 'v_interessi' || voucher.id === 'v_sconto') {
        actions.buyVoucher(voucher);
      }
    }

    // Everything above the float earns nothing, so everything above the float
    // gets spent - on the best thing the shop happens to be showing.
    const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;
    const cap = state.vouchers.some((v) => v.id === 'v_interessi') ? 10 : 5;
    const float = cap * INTEREST_STEP;

    // The float only applies once there is a board to hoard for. Nobody
    // saves their way through ante 3 with an empty rail, and a policy that
    // tried would be a strawman rather than a strategy.
    const seeded = state.jokers.length >= 2;
    const room = (cost: number) => (seeded ? state.money - cost >= float : state.money >= cost);

    const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
    for (const joker of ranked) {
      if (state.jokers.length >= state.maxJokers) break;
      const cost = Math.max(1, joker.cost - discount);
      if (room(cost)) actions.buyJoker(joker, cost);
    }

    for (const pack of [...offer.packs]) {
      const cost = Math.max(1, pack.cost - discount);
      if (room(cost)) actions.openPack(pack, cost);
    }

    if (seeded) spendTheChange(state, offer, actions, discount);
  },
};

/**
 * B. Il motore di Jolly.
 *
 * Spends down to nothing on jolly and on the packs that contain them, and will
 * reroll to go looking. It sells its weakest jolly to make room for a better
 * one, which is the only reason selling exists in the shop.
 */
export const JOKER_ENGINE: BuyerPolicy = {
  id: 'joker_engine',
  name: 'Joker engine',
  blurb: 'Tutto in Jolly: compra, rerolla e vende il peggiore per fare posto.',
  shop(state, offer, actions) {
    const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;
    const tavolo = offer.vouchers.find((v) => v.id === 'v_tavolo');
    if (tavolo) actions.buyVoucher(tavolo);

    let attempts = 0;
    while (attempts < 6) {
      attempts++;

      const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
      let bought = false;
      for (const joker of ranked) {
        const cost = Math.max(1, joker.cost - discount);
        if (state.money < cost) continue;

        if (state.jokers.length < state.maxJokers) {
          bought = actions.buyJoker(joker, cost) || bought;
        } else {
          // Full board: only trade up, and only for something clearly better.
          const worst = [...state.jokers].sort((a, b) => jokerAppeal(a) - jokerAppeal(b))[0];
          if (jokerAppeal(joker) > jokerAppeal(worst) + 2) {
            actions.sellWorstJoker();
            bought = actions.buyJoker(joker, cost) || bought;
          }
        }
      }

      const jokerPack = offer.packs.find((p) => p.type === 'joker' || p.type === 'celeste');
      if (jokerPack) {
        const cost = Math.max(1, jokerPack.cost - discount);
        if (state.money >= cost) bought = actions.openPack(jokerPack, cost) || bought;
      }

      if (bought) continue;
      // Nothing worth having: go looking, while it is still cheap.
      if (state.money >= offer.rerollCost + 4 && offer.rerollCost <= 8) {
        if (!actions.reroll()) break;
      } else {
        break;
      }
    }
  },
};

/**
 * C. Le carte prima di tutto.
 *
 * Buys card boosters and upgrades the forty identities it already owns. Slower
 * to come online than a jolly board and, in principle, harder to lose.
 */
export const DECK_UPGRADES: BuyerPolicy = {
  id: 'deck_upgrades',
  name: 'Deck upgrades',
  blurb: 'Bustine napoletane e carte potenziate: la build sta nel mazzo.',
  shop(state, offer, actions) {
    const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;

    for (let i = 0; i < 4; i++) {
      const pack = offer.packs.find((p) => p.type === 'cards' || p.type === 'celeste');
      if (!pack) break;
      const cost = Math.max(1, pack.cost - discount);
      if (state.money < cost + 3) break;
      if (!actions.openPack(pack, cost)) break;
    }

    // A free slot is still a free slot: a jolly on the shelf and room for it is
    // not something a deck build should walk past.
    if (state.jokers.length < state.maxJokers) {
      const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
      for (const joker of ranked) {
        const cost = Math.max(1, joker.cost - discount);
        if (state.money >= cost + 5) actions.buyJoker(joker, cost);
      }
    }

    spendTheChange(state, offer, actions, discount);
  },
};

/**
 * What to do with money that has stopped earning.
 *
 * The first version of these policies sat on a hundred and fifty dollars at
 * ante 8 - past the interest cap, where a held dollar is worth exactly nothing.
 * Vouchers first because they are permanent, then a reroll to go looking, then
 * whatever the fresh shelf turned up.
 */
function spendTheChange(
  state: Parameters<BuyerPolicy['shop']>[0],
  offer: Parameters<BuyerPolicy['shop']>[1],
  actions: Parameters<BuyerPolicy['shop']>[2],
  discount: number
): void {
  const cap = state.vouchers.some((v) => v.id === 'v_interessi') ? 10 : 5;
  const idle = () => state.money - cap * 5;

  for (const voucher of [...offer.vouchers]) {
    if (idle() >= voucher.cost) actions.buyVoucher(voucher);
  }

  let guard = 0;
  while (idle() >= offer.rerollCost + 6 && guard < 5) {
    guard++;
    if (!actions.reroll()) break;

    const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
    for (const joker of ranked) {
      const cost = Math.max(1, joker.cost - discount);
      if (state.jokers.length < state.maxJokers && idle() >= cost) {
        actions.buyJoker(joker, cost);
      }
    }
    for (const pack of [...offer.packs]) {
      const cost = Math.max(1, pack.cost - discount);
      if (idle() >= cost) actions.openPack(pack, cost);
    }
    for (const card of [...offer.unoCards]) {
      const cost = Math.max(1, card.cost - discount);
      if (idle() >= cost) actions.buyUno(card, cost);
    }
  }
}

/**
 * D. Un po' di tutto.
 *
 * Fills the joker slots first because they are the biggest single multiplier in
 * the game, keeps a float for the interest, and puts the rest into packs and
 * the occasional Carta Sola.
 */
export const BALANCED: BuyerPolicy = {
  id: 'balanced',
  name: 'Balanced',
  blurb: 'Riempie gli slot, tiene un fondo per gli interessi, e il resto in bustine.',
  shop(state, offer, actions) {
    const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;

    const economy = offer.vouchers.find((v) => v.id === 'v_sconto' || v.id === 'v_interessi');
    if (economy && state.money >= economy.cost + 5) actions.buyVoucher(economy);

    const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
    for (const joker of ranked) {
      if (state.jokers.length >= state.maxJokers) break;
      const cost = Math.max(1, joker.cost - discount);
      if (state.money >= cost + 5) actions.buyJoker(joker, cost);
    }

    for (const pack of [...offer.packs]) {
      const cost = Math.max(1, pack.cost - discount);
      if (state.money >= cost + 8) actions.openPack(pack, cost);
    }

    for (const card of [...offer.unoCards]) {
      const cost = Math.max(1, card.cost - discount);
      if (state.money >= cost + 12) actions.buyUno(card, cost);
    }

    spendTheChange(state, offer, actions, discount);
  },
};

export const ALL_BUYERS: BuyerPolicy[] = [ECONOMY_FIRST, JOKER_ENGINE, DECK_UPGRADES, BALANCED];

/**
 * Le jolly che pagano in contanti, e le Sola che le alimentano.
 *
 * Named here rather than scored, because their value is not printed on them:
 * il Jolly del Bar Sport reads the wallet, l'Oste pays at the end of a round,
 * and il Raddoppio Soldi is worth exactly what is in the bank when it lands. A
 * policy that hunts an economy engine has to know which cards those are.
 */
const ECONOMY_JOKERS = ['j_jolly_sport', 'j_oste', 'j_orafo', 'j_re_mida'];
const ECONOMY_SOLA = ['uno_double_cash', 'uno_gold_yellow', 'uno_plus_two_blue'];

/**
 * E. Il tirchio.
 *
 * Holds the float and lets the interest compound, and only breaks it for
 * something whose return is the money itself: the economy vouchers, il Bar
 * Sport, l'Oste, il Raddoppio. Everything else has to come out of the money
 * already above the interest cap, which is earning nothing where it sits.
 */
export const CASH_HOARDER: BuyerPolicy = {
  id: 'cash_hoarder',
  name: 'Cash hoarder',
  blurb: 'Tiene i soldi: solo motori economici, il resto con la cassa sopra il tetto degli interessi.',
  shop(state, offer, actions) {
    for (const voucher of [...offer.vouchers]) {
      if (voucher.id === 'v_interessi' || voucher.id === 'v_sconto') actions.buyVoucher(voucher);
    }

    const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;
    const cap = state.vouchers.some((v) => v.id === 'v_interessi') ? 10 : 5;
    const float = cap * INTEREST_STEP;

    // The engine cards are worth breaking the float for: they pay it back.
    for (const joker of offer.jokers.filter((j) => ECONOMY_JOKERS.includes(j.id))) {
      if (state.jokers.length >= state.maxJokers) break;
      const cost = Math.max(1, joker.cost - discount);
      if (state.money >= cost) actions.buyJoker(joker, cost);
    }
    for (const card of offer.unoCards.filter((c) => ECONOMY_SOLA.includes(c.id))) {
      const cost = Math.max(1, card.cost - discount);
      if (state.money >= cost) actions.buyUno(card, cost);
    }

    const idle = () => state.money - float;
    const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
    for (const joker of ranked) {
      if (state.jokers.length >= state.maxJokers) break;
      const cost = Math.max(1, joker.cost - discount);
      if (idle() >= cost) actions.buyJoker(joker, cost);
    }
    for (const pack of [...offer.packs]) {
      const cost = Math.max(1, pack.cost - discount);
      if (idle() >= cost) actions.openPack(pack, cost);
    }
  },
};

/**
 * F. Chi investe subito.
 *
 * The opposite bet: a dollar held is a dollar not compounding on the board, so
 * it spends down to almost nothing every shop and lets the rewards refill it.
 * It should look strongest early and thinnest at the antes where the interest
 * would have been paying for a second jolly.
 */
export const AGGRESSIVE_SPENDER: BuyerPolicy = {
  id: 'aggressive_spender',
  name: 'Aggressive spender',
  blurb: 'Investe tutto e subito: slot pieni presto e cassa quasi vuota a ogni uscita dal negozio.',
  shop(state, offer, actions) {
    const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;
    const RESERVE = 1;

    for (let pass = 0; pass < 3; pass++) {
      let bought = false;

      const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
      for (const joker of ranked) {
        const cost = Math.max(1, joker.cost - discount);
        if (state.money - cost < RESERVE) continue;
        if (state.jokers.length < state.maxJokers) {
          bought = actions.buyJoker(joker, cost) || bought;
        } else {
          const worst = [...state.jokers].sort((a, b) => jokerAppeal(a) - jokerAppeal(b))[0];
          if (jokerAppeal(joker) > jokerAppeal(worst) + 2) {
            actions.sellWorstJoker();
            bought = actions.buyJoker(joker, cost) || bought;
          }
        }
      }

      for (const pack of [...offer.packs]) {
        const cost = Math.max(1, pack.cost - discount);
        if (state.money - cost >= RESERVE) bought = actions.openPack(pack, cost) || bought;
      }

      for (const card of [...offer.unoCards]) {
        const cost = Math.max(1, card.cost - discount);
        if (state.money - cost >= RESERVE) bought = actions.buyUno(card, cost) || bought;
      }

      if (bought) continue;
      if (state.money - offer.rerollCost >= RESERVE + 4) {
        if (!actions.reroll()) break;
      } else break;
    }

    for (const voucher of [...offer.vouchers]) {
      if (state.money - voucher.cost >= RESERVE) actions.buyVoucher(voucher);
    }
  },
};

/**
 * G. Il briscolista.
 *
 * Buys for the sixty-one rather than for the Chips: card upgrades, because they
 * make the forty identities better at taking tricks, and only the jolly it can
 * afford without emptying the wallet. Paired with the conservative play policy
 * it is the closest thing here to somebody who came for the Briscola.
 */
export const TRADITIONAL_BUYER: BuyerPolicy = {
  id: 'traditional_player',
  name: 'Traditional player',
  blurb: 'Compra per i 61 punti: carte potenziate e poco altro, senza rincorrere il motore.',
  shop(state, offer, actions) {
    const discount = state.vouchers.some((v) => v.id === 'v_sconto') ? 2 : 0;

    for (let i = 0; i < 3; i++) {
      const pack = offer.packs.find((p) => p.type === 'cards' || p.type === 'celeste');
      if (!pack) break;
      const cost = Math.max(1, pack.cost - discount);
      if (state.money < cost + 4) break;
      if (!actions.openPack(pack, cost)) break;
    }

    if (state.jokers.length < state.maxJokers) {
      const ranked = [...offer.jokers].sort((a, b) => jokerAppeal(b) - jokerAppeal(a));
      for (const joker of ranked) {
        const cost = Math.max(1, joker.cost - discount);
        if (state.money >= cost + 8) actions.buyJoker(joker, cost);
      }
    }

    const useful = offer.vouchers.find((v) => v.id === 'v_scarto' || v.id === 'v_interessi');
    if (useful && state.money >= useful.cost + 5) actions.buyVoucher(useful);

    spendTheChange(state, offer, actions, discount);
  },
};

/**
 * Le sei policy del report.
 *
 * A run policy is a way of buying AND a way of playing: pairing the traditional
 * buyer with the score-greedy player would measure neither. `ALL_BUYERS` stays
 * the older four so the existing macroloop test keeps measuring what it did.
 */
export const ALL_RUN_POLICIES: RunPolicy[] = [
  { id: 'cash_hoarder', name: 'Cash hoarder', blurb: CASH_HOARDER.blurb, buyer: CASH_HOARDER, play: HYBRID },
  {
    id: 'aggressive_spender',
    name: 'Aggressive spender',
    blurb: AGGRESSIVE_SPENDER.blurb,
    buyer: AGGRESSIVE_SPENDER,
    play: HYBRID,
  },
  { id: 'joker_heavy', name: 'Joker heavy', blurb: JOKER_ENGINE.blurb, buyer: JOKER_ENGINE, play: HYBRID },
  { id: 'upgrade_heavy', name: 'Upgrade heavy', blurb: DECK_UPGRADES.blurb, buyer: DECK_UPGRADES, play: HYBRID },
  {
    id: 'traditional_player',
    name: 'Traditional player',
    blurb: TRADITIONAL_BUYER.blurb,
    buyer: TRADITIONAL_BUYER,
    play: CONSERVATIVE,
  },
  { id: 'balanced', name: 'Balanced', blurb: BALANCED.blurb, buyer: BALANCED, play: HYBRID },
];
