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
  forceWinCurrentTrick?: boolean;
}

export const UNO_EFFECT_HANDLERS: Record<
  string,
  (ctx: UnoActionContext) => UnoActionResult
> = {
  // +2 Pesca Due (Rosso): Draw 2 cards + 60 Chips to round score
  uno_plus_two_red: (ctx) => {
    let nextPile = [...ctx.drawPile];
    let nextHand = [...ctx.playerHand];
    const drawn = nextPile.slice(0, 2);
    nextPile = nextPile.slice(2);
    nextHand = [...nextHand, ...drawn];
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
      feedbackMessage: '+2 Carte pescate e +60 Chips assegnate!',
    };
  },

  // +2 Pesca Due (Blu): Draw 2 cards + $3 cash
  uno_plus_two_blue: (ctx) => {
    let nextPile = [...ctx.drawPile];
    let nextHand = [...ctx.playerHand];
    const drawn = nextPile.slice(0, 2);
    nextPile = nextPile.slice(2);
    nextHand = [...nextHand, ...drawn];
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
      feedbackMessage: '+2 Carte pescate e +$3 incassati!',
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

  // Salto Turno (Skip): Opponent skips, player auto-wins trick
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
      feedbackMessage: "SALTO TURNO: L'avversario è bloccato, presa vinta!",
      forceWinCurrentTrick: true,
    };
  },

  // Cambio Colore (Wild Seme): Change Briscola to random other suit
  uno_wild_suit: (ctx) => {
    const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
    const otherSuits = suits.filter((s) => s !== ctx.briscolaSuit);
    const newSuit = otherSuits[Math.floor(Math.random() * otherSuits.length)];
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

  // Scambia Carta (Swap): Steal opponent's best card and give them player's worst
  uno_swap_yellow: (ctx) => {
    let nextOpponentHand = [...ctx.opponentHand];
    let nextPlayerHand = [...ctx.playerHand];

    if (nextOpponentHand.length > 0 && nextPlayerHand.length > 0) {
      // Find opponent's best card (highest points/power)
      nextOpponentHand.sort((a, b) => b.power - a.power);
      const stolenCard = nextOpponentHand.shift()!;

      // Find player's weakest card
      nextPlayerHand.sort((a, b) => a.power - b.power);
      const givenCard = nextPlayerHand.shift()!;

      nextPlayerHand.push(stolenCard);
      nextOpponentHand.push(givenCard);

      return {
        newDrawPile: ctx.drawPile,
        newPlayerHand: nextPlayerHand,
        newOpponentHand: nextOpponentHand,
        newBriscolaSuit: ctx.briscolaSuit,
        newMoney: ctx.money,
        newDiscardsLeft: ctx.discardsLeft,
        newActiveJokers: ctx.activeJokers,
        newRoundScore: ctx.currentRoundScore,
        newBossDebuffActive: ctx.bossDebuffActive,
        newActiveUnoMultiplier: ctx.activeUnoMultiplier,
        newIsReverseActive: ctx.isReverseActive,
        feedbackMessage: `SWAP: Hai rubato ${stolenCard.rank} di ${stolenCard.suit.toUpperCase()} all'avversario!`,
      };
    }

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
      feedbackMessage: 'Nessuna carta da scambiare.',
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
      feedbackMessage: 'Carta dorata creata! Regala +$3 extra alla fine del round.',
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

  // Tutto Briscola (Wild All): Transform all cards in hand to Briscola suit
  uno_all_wild: (ctx) => {
    const nextHand = ctx.playerHand.map((c) => ({
      ...c,
      suit: ctx.briscolaSuit,
    }));
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
      feedbackMessage: 'Tutte le carte in mano sono ora di BRISCOLA!',
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

  // Scudo Protettivo (Block): Cancel boss debuff + 80 Chips
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
      feedbackMessage: 'SCUDO ATTIVATO: Debuff del Boss annullato e +80 Chips!',
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
