import { BuyerPolicy, jokerAppeal } from './runSim';

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
  },
};

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
  },
};

export const ALL_BUYERS: BuyerPolicy[] = [ECONOMY_FIRST, JOKER_ENGINE, DECK_UPGRADES, BALANCED];
