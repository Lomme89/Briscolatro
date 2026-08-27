import { UnoCard, PlayingCard, Suit, Joker } from '../types/game';
import { ALL_JOKERS } from '../data/jokers';
import { withRank } from './briscola';

export interface UnoActionContext {
  unoCard: UnoCard;
  targetCard?: PlayingCard;
  drawPile: PlayingCard[];
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
  briscolaSuit: Suit;
  money: number;
  discardsLeft: number;
  activeJokers: Joker[];
  maxJokers: number;
  currentRoundScore: number;
  bossDebuffActive: boolean;
  activeUnoMultiplier: number;
  isReverseActive: boolean;
  /** The suit the player picked, for the cards that say the player picks. */
  chosenSuit?: Suit;
}

export interface UnoActionResult {
  newDrawPile: PlayingCard[];
  newPlayerHand: PlayingCard[];
  newOpponentHand: PlayingCard[];
  newBriscolaSuit: Suit;
  newMoney: number;
  newDiscardsLeft: number;
  newActiveJokers: Joker[];
  newRoundScore: number;
  newBossDebuffActive: boolean;
  newActiveUnoMultiplier: number;
  newIsReverseActive: boolean;
  feedbackMessage: string;
  cardUpgradedInRunDeck?: { id: string; updates: Partial<PlayingCard> };
  /**
   * Lo Sgambetto: for this trick the player counts as the one who opened it.
   *
   * It used to hand the trick over outright, which is not a card you think
   * about - it is a card you press when you are behind. Stealing the lead is
   * the same fantasy without the certainty: at crossed suits the trick is
   * yours, and a Briscola from across the table still takes it off you.
   */
  stealLeadCurrentTrick?: boolean;
  /** Lo Scudo: how many tricks the boss rule stays suspended for. */
  bossShieldTricks?: number;
}

/**
 * Roguelite draw = CYCLE, never a net gain of cards.
 *
 * Two-player Briscola only stays consistent while both hands hold the same
 * number of cards: every trick spends one card per side and the stock is dealt
 * in pairs. Handing the player extra cards desynchronises the hands for the
 * rest of the round, so "+2" swaps the two least useful cards in hand for the
 * two on top of the stock and puts the old ones back at the bottom.
 * Stock top = end of the array (same convention as drawNextTrickCards).
 */
function cycleCardsFromStock(
  playerHand: PlayingCard[],
  drawPile: PlayingCard[],
  briscolaSuit: Suit,
  count: number
): { nextHand: PlayingCard[]; nextPile: PlayingCard[]; cycled: number } {
  const cycled = Math.min(count, playerHand.length, drawPile.length);
  if (cycled === 0) {
    return { nextHand: playerHand, nextPile: drawPile, cycled: 0 };
  }

  const worstFirst = [...playerHand].sort(
    (a, b) =>
      Number(a.suit === briscolaSuit) - Number(b.suit === briscolaSuit) ||
      a.points - b.points ||
      a.power - b.power
  );
  const discardedIds = new Set(worstFirst.slice(0, cycled).map((card) => card.id));

  const nextPile = [...drawPile];
  const drawn = nextPile.splice(nextPile.length - cycled, cycled);
  const nextHand = playerHand.filter((card) => !discardedIds.has(card.id));
  nextHand.push(...drawn);
  nextPile.unshift(...playerHand.filter((card) => discardedIds.has(card.id)));

  return { nextHand, nextPile, cycled };
}

export const UNO_EFFECT_HANDLERS: Record<
  string,
  (ctx: UnoActionContext) => UnoActionResult
> = {
  // +2 Pesca Due (Rosso): Cycle 2 cards through the stock + 60 Chips to round score
  uno_plus_two_red: (ctx) => {
    const { nextHand, nextPile, cycled } = cycleCardsFromStock(
      ctx.playerHand,
      ctx.drawPile,
      ctx.briscolaSuit,
      2
    );
    return {
      newDrawPile: nextPile,
      newPlayerHand: nextHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore + 60,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: cycled > 0
        ? `+2 Cambio carte (${cycled}) e +60 Chips assegnate!`
        : 'Tallone esaurito: nessun cambio, +60 Chips assegnate!',
    };
  },

  // +2 Pesca Due (Blu): Cycle 2 cards through the stock + $3 cash
  uno_plus_two_blue: (ctx) => {
    const { nextHand, nextPile, cycled } = cycleCardsFromStock(
      ctx.playerHand,
      ctx.drawPile,
      ctx.briscolaSuit,
      2
    );
    return {
      newDrawPile: nextPile,
      newPlayerHand: nextHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money + 3,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: cycled > 0
        ? `+2 Cambio carte (${cycled}) e +$3 incassati!`
        : 'Tallone esaurito: nessun cambio, +$3 incassati!',
    };
  },

  // +4 Jolly Pesca Quattro: Change Briscola, refill +4 discards, +$4 cash
  uno_plus_four_wild: (ctx) => {
    const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
    const otherSuits = suits.filter((s) => s !== ctx.briscolaSuit);
    const newSuit = otherSuits[Math.floor(Math.random() * otherSuits.length)];
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: newSuit,
      newMoney: ctx.money + 4,
      newDiscardsLeft: ctx.discardsLeft + 4,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: `Briscola cambiata in ${newSuit.toUpperCase()}! +4 Scarti e +$4!`,
    };
  },

  // Cambio Giro (Reverse): Reverse trick hierarchy (lisce beat carichi) for current trick
  uno_reverse_green: (ctx) => {
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore + 40,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: true,
      feedbackMessage: 'REVERSE ATTIVO: Le Lisce (0 pt) ora battono i Carichi!',
    };
  },

  // Sgambetto: the player becomes the leader of this trick.
  uno_skip_red: (ctx) => {
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore + 80,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: 'SGAMBETTO: la mano è tua! A semi incrociati la presa la prendi tu.',
      stealLeadCurrentTrick: true,
    };
  },

  // Cambio Colore (Wild Seme): Change Briscola to random other suit
  uno_wild_suit: (ctx) => {
    // The card promises "il seme che preferisci" and used to roll a die. The
    // player picks it in the confirmation, and only falls back to a random one
    // if somehow nothing was chosen.
    const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
    const otherSuits = suits.filter((s) => s !== ctx.briscolaSuit);
    const newSuit =
      ctx.chosenSuit && ctx.chosenSuit !== ctx.briscolaSuit
        ? ctx.chosenSuit
        : otherSuits[Math.floor(Math.random() * otherSuits.length)];
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: newSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: `Colore Briscola trasformato in ${newSuit.toUpperCase()}!`,
    };
  },

  /**
   * Scambia Carta: you choose what leaves, chance decides what arrives.
   *
   * It used to take their best card and hand back your worst, which is not a
   * decision - it is a button, and one that quietly read their whole hand to
   * find the best. Now the give is yours to pick (part with a liscia? bait them
   * with a carico?) and the take is blind, so nothing about their hand is
   * learned beyond the one card that ends up in yours.
   */
  uno_swap_yellow: (ctx) => {
    const unchanged = {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
    };

    const given =
      ctx.targetCard && ctx.playerHand.some((c) => c.id === ctx.targetCard!.id)
        ? ctx.targetCard
        : null;

    if (!given || ctx.opponentHand.length === 0) {
      return { ...unchanged, feedbackMessage: 'Nessuno scambio possibile.' };
    }

    // Blind pick: the card comes back at random, so the effect never becomes a
    // way of reading a hand it is not allowed to see.
    const takenIndex = Math.floor(Math.random() * ctx.opponentHand.length);
    const taken = ctx.opponentHand[takenIndex];

    const nextPlayerHand = ctx.playerHand.filter((c) => c.id !== given.id);
    nextPlayerHand.push(taken);
    const nextOpponentHand = ctx.opponentHand.filter((_, i) => i !== takenIndex);
    nextOpponentHand.push(given);

    return {
      ...unchanged,
      newPlayerHand: nextPlayerHand,
      newOpponentHand: nextOpponentHand,
      feedbackMessage: `SCAMBIO: hai dato il ${given.rank} di ${given.suit.toUpperCase()} e pescato il ${taken.rank} di ${taken.suit.toUpperCase()}!`,
    };
  },

  // Jolly Foil (+50 Chips permanent)
  uno_custom_foil: (ctx) => {
    if (!ctx.targetCard) return fallbackResult(ctx);
    const targetId = ctx.targetCard.id;
    const nextHand = ctx.playerHand.map((c) =>
      c.id === targetId ? { ...c, edition: 'foil' as const } : c
    );
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: nextHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: 'Carta potenziata con finitura FOIL (+50 Chips)!',
      cardUpgradedInRunDeck: { id: targetId, updates: { edition: 'foil' } },
    };
  },

  // Jolly Olografico (+10 Mult permanent)
  uno_custom_holo: (ctx) => {
    if (!ctx.targetCard) return fallbackResult(ctx);
    const targetId = ctx.targetCard.id;
    const nextHand = ctx.playerHand.map((c) =>
      c.id === targetId ? { ...c, edition: 'holo' as const } : c
    );
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: nextHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: 'Carta potenziata con finitura OLOGRAFICA (+10 Mult)!',
      cardUpgradedInRunDeck: { id: targetId, updates: { edition: 'holo' } },
    };
  },

  // Jolly Policromo (x1.5 Mult permanent)
  uno_custom_polychrome: (ctx) => {
    if (!ctx.targetCard) return fallbackResult(ctx);
    const targetId = ctx.targetCard.id;
    const nextHand = ctx.playerHand.map((c) =>
      c.id === targetId ? { ...c, edition: 'polychrome' as const } : c
    );
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: nextHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: 'Carta potenziata con POLICROMIA (x1.5 Mult moltiplicativo)!',
      cardUpgradedInRunDeck: { id: targetId, updates: { edition: 'polychrome' } },
    };
  },

  // Jolly Dorato (+$3 / Round)
  uno_gold_yellow: (ctx) => {
    if (!ctx.targetCard) return fallbackResult(ctx);
    const targetId = ctx.targetCard.id;
    const nextHand = ctx.playerHand.map((c) =>
      c.id === targetId ? { ...c, edition: 'gold' as const } : c
    );
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: nextHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: 'Carta dorata creata! +$1 quando la giochi, +$2 se la catturi.',
      cardUpgradedInRunDeck: { id: targetId, updates: { edition: 'gold' } },
    };
  },

  // Dichiara "UNO!" (x3.0 Mult on winning trick)
  uno_call_uno: (ctx) => {
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: 3.0,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: 'HAI GRIDATO "UNO!": x3.0 Moltiplicatore sulla prossima presa vinta!',
    };
  },

  /**
   * Tocco di Briscola: one card of your choosing becomes trump for the round.
   *
   * It used to convert the whole hand, which wins the next three tricks with no
   * decisions left in them. One card is still a huge play - your Asso di Coppe
   * becoming the Asso di Briscola decides a round - but you have to say which,
   * and a liscia turned trump is a different plan from a carico turned trump.
   *
   * The hand holds copies dealt from the run deck, so the forty identities are
   * untouched: nothing here writes to the deck.
   */
  uno_all_wild: (ctx) => {
    const unchanged = {
      newDrawPile: ctx.drawPile,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
    };

    const target =
      ctx.targetCard && ctx.playerHand.some((c) => c.id === ctx.targetCard!.id)
        ? ctx.targetCard
        : null;

    if (!target) {
      return {
        ...unchanged,
        newPlayerHand: ctx.playerHand,
        feedbackMessage: 'Scegli una carta da trasformare in Briscola.',
      };
    }

    const nextHand = ctx.playerHand.map((card) =>
      card.id === target.id ? { ...card, suit: ctx.briscolaSuit } : card
    );

    return {
      ...unchanged,
      newPlayerHand: nextHand,
      feedbackMessage: `Il ${target.rank} di ${target.suit.toUpperCase()} è ora BRISCOLA per tutto il round!`,
    };
  },

  // Raddoppio Soldi (2x Cash): Double bank funds up to +$20
  uno_double_cash: (ctx) => {
    const gain = Math.min(20, Math.max(1, ctx.money));
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money + gain,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: `Fondi raddoppiati! +$${gain} aggiunti al portafoglio!`,
    };
  },

  /**
   * Scudo Protettivo: three tricks of quiet, not a round of it.
   *
   * Cancelling the rule for the whole blind turns an interesting boss into no
   * boss at all, and the card into something you press on sight. Three tricks
   * is still enormous against a boss - a window you place where it hurts them
   * most - and it asks when rather than whether.
   */
  uno_block_boss: (ctx) => {
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: ctx.activeJokers,
      newRoundScore: ctx.currentRoundScore + 80,
      newBossDebuffActive: false,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      bossShieldTricks: 3,
      feedbackMessage: 'SCUDO ATTIVATO: il Boss tace per 3 prese, e +80 Chips!',
    };
  },

  // Jolly Misterioso (Crea Personaggio): Generate 1 random Joker
  uno_wild_joker: (ctx) => {
    let nextJokers = [...ctx.activeJokers];
    let msg = 'Slot Jolly pieni, nessun Jolly aggiunto.';
    if (nextJokers.length < ctx.maxJokers) {
      const existingIds = new Set(nextJokers.map((j) => j.id));
      const pool = ALL_JOKERS.filter((j) => !existingIds.has(j.id));
      const chosen = pool[Math.floor(Math.random() * pool.length)] || ALL_JOKERS[0];
      nextJokers.push({ ...chosen });
      msg = `Nuovo Jolly creato: ${chosen.name}!`;
    }
    return {
      newDrawPile: ctx.drawPile,
      newPlayerHand: ctx.playerHand,
      newOpponentHand: ctx.opponentHand,
      newBriscolaSuit: ctx.briscolaSuit,
      newMoney: ctx.money,
      newDiscardsLeft: ctx.discardsLeft,
      newActiveJokers: nextJokers,
      newRoundScore: ctx.currentRoundScore,
      newBossDebuffActive: ctx.bossDebuffActive,
      newActiveUnoMultiplier: ctx.activeUnoMultiplier,
      newIsReverseActive: ctx.isReverseActive,
      feedbackMessage: msg,
    };
  },
};

function fallbackResult(ctx: UnoActionContext): UnoActionResult {
  return {
    newDrawPile: ctx.drawPile,
    newPlayerHand: ctx.playerHand,
    newOpponentHand: ctx.opponentHand,
    newBriscolaSuit: ctx.briscolaSuit,
    newMoney: ctx.money,
    newDiscardsLeft: ctx.discardsLeft,
    newActiveJokers: ctx.activeJokers,
    newRoundScore: ctx.currentRoundScore,
    newBossDebuffActive: ctx.bossDebuffActive,
    newActiveUnoMultiplier: ctx.activeUnoMultiplier,
    newIsReverseActive: ctx.isReverseActive,
    feedbackMessage: 'Azione applicata.',
  };
}

export function executeUnoCard(ctx: UnoActionContext): UnoActionResult {
  const handler = UNO_EFFECT_HANDLERS[ctx.unoCard.id];
  if (handler) {
    return handler(ctx);
  }
  return fallbackResult(ctx);
}
