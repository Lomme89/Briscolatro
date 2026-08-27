import { describe, expect, it } from 'vitest';
import { executeUnoCard, UnoActionContext } from './unoEffects';
import { createCard, createStandardDeck, resolveTrick } from './briscola';
import { prepareRoundDeck } from './gameState';
import { ALL_UNO_CARDS } from '../data/unoCards';
import { CardRank, PlayingCard, Suit, UnoCard } from '../types/game';

const c = (suit: Suit, rank: CardRank, id?: string) =>
  createCard(suit, rank, 'standard', 'none', 'none', id ?? `${suit}_${rank}`);

const sola = (id: string): UnoCard => ALL_UNO_CARDS.find((u) => u.id === id)!;

function ctx(id: string, over: Partial<UnoActionContext> = {}): UnoActionContext {
  const deal = prepareRoundDeck(createStandardDeck());
  return {
    unoCard: sola(id),
    drawPile: deal.roundDrawPile,
    playerHand: deal.playerHand,
    opponentHand: deal.opponentHand,
    briscolaSuit: 'denari',
    money: 10,
    discardsLeft: 1,
    activeJokers: [],
    maxJokers: 5,
    currentRoundScore: 0,
    bossDebuffActive: true,
    activeUnoMultiplier: 1,
    isReverseActive: false,
    ...over,
  };
}

/** Hands must stay the same size on both sides, or the round desynchronises. */
function expectHandsBalanced(before: UnoActionContext, after: ReturnType<typeof executeUnoCard>) {
  expect(after.newPlayerHand).toHaveLength(before.playerHand.length);
  expect(after.newOpponentHand).toHaveLength(before.opponentHand.length);
}

/** No card may exist in two places at once, nor vanish from the round. */
function expectNoDuplicates(after: ReturnType<typeof executeUnoCard>) {
  const all = [...after.newPlayerHand, ...after.newOpponentHand, ...after.newDrawPile];
  const ids = all.map((card) => card.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Sgambetto: ruba la mano, non la presa', () => {
  const briscola: Suit = 'denari';

  it('non decide piu la presa da solo: e il leader che cambia', () => {
    const result = executeUnoCard(ctx('uno_skip_red'));
    expect(result.stealLeadCurrentTrick).toBe(true);
    // The old field is gone: nothing can hand a trick over any more.
    expect('forceWinCurrentTrick' in result).toBe(false);
  });

  it('a semi incrociati la presa passa a chi ruba la mano', () => {
    // The opponent opened with Coppe, the player answered off-suit with
    // Bastoni. Normally the opener keeps it; with the lead stolen it flips.
    const oppCard = c('coppe', 10, 'loro');
    const playerCard = c('bastoni', 4, 'mia');

    const asPlayed = resolveTrick(oppCard, playerCard, briscola, false);
    expect(asPlayed.playerWon).toBe(false);

    const withSgambetto = resolveTrick(playerCard, oppCard, briscola, true);
    expect(withSgambetto.playerWon).toBe(true);
  });

  it('una Briscola avversaria vince lo stesso: non e un auto-win', () => {
    const oppCard = c('denari', 2, 'loro_briscola');
    const playerCard = c('coppe', 1, 'mio_asso');

    const withSgambetto = resolveTrick(playerCard, oppCard, briscola, true);
    expect(withSgambetto.playerWon).toBe(false);
  });

  it('e una carta di seme piu alto pure', () => {
    const oppCard = c('coppe', 1, 'loro_asso');
    const playerCard = c('coppe', 4, 'mia_liscia');
    expect(resolveTrick(playerCard, oppCard, briscola, true).playerWon).toBe(false);
  });

  it('non tocca mani, tallone o Briscola', () => {
    const before = ctx('uno_skip_red');
    const after = executeUnoCard(before);
    expectHandsBalanced(before, after);
    expectNoDuplicates(after);
    expect(after.newBriscolaSuit).toBe(before.briscolaSuit);
    expect(after.newDrawPile).toEqual(before.drawPile);
  });
});

describe('Scambia Carta: scegli cosa dai, non cosa prendi', () => {
  it('scambia esattamente la carta scelta, e le mani restano pari', () => {
    const playerHand = [c('coppe', 4, 'mia_a'), c('spade', 5, 'mia_b')];
    const opponentHand = [c('bastoni', 1, 'loro_a'), c('denari', 3, 'loro_b')];
    const before = ctx('uno_swap_yellow', {
      playerHand,
      opponentHand,
      targetCard: playerHand[0],
    });
    const after = executeUnoCard(before);

    expectHandsBalanced(before, after);
    expectNoDuplicates(after);
    expect(after.newPlayerHand.some((card) => card.id === 'mia_a')).toBe(false);
    expect(after.newOpponentHand.some((card) => card.id === 'mia_a')).toBe(true);
  });

  it('non legge la mano avversaria: la carta che arriva e casuale', () => {
    // Their best card is the Asso. Over many casts it must NOT come back every
    // time - if it did, the effect would be reading a hand it cannot see.
    const playerHand = [c('coppe', 4, 'mia')];
    const opponentHand = [c('bastoni', 1, 'asso'), c('spade', 2, 'liscia'), c('coppe', 6, 'media')];

    const taken = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const after = executeUnoCard(
        ctx('uno_swap_yellow', { playerHand, opponentHand, targetCard: playerHand[0] })
      );
      const arrived = after.newPlayerHand.find((card) => card.id !== 'mia');
      taken.add(arrived!.id);
    }
    expect(taken.size).toBeGreaterThan(1);
    expect(taken.has('liscia')).toBe(true);
  });

  it('senza una carta scelta non succede niente', () => {
    const before = ctx('uno_swap_yellow', { targetCard: undefined });
    const after = executeUnoCard(before);
    expect(after.newPlayerHand).toEqual(before.playerHand);
    expect(after.newOpponentHand).toEqual(before.opponentHand);
  });

  it('una carta che non e in mano non puo essere data', () => {
    const before = ctx('uno_swap_yellow', { targetCard: c('coppe', 7, 'non_mia') });
    const after = executeUnoCard(before);
    expect(after.newPlayerHand).toEqual(before.playerHand);
  });

  it('con la mano avversaria vuota non rompe nulla', () => {
    const playerHand = [c('coppe', 4, 'mia')];
    const before = ctx('uno_swap_yellow', { playerHand, opponentHand: [], targetCard: playerHand[0] });
    const after = executeUnoCard(before);
    expect(after.newPlayerHand).toHaveLength(1);
    expect(after.newOpponentHand).toHaveLength(0);
  });

  it('la carta chiede al giocatore di sceglierla', () => {
    expect(sola('uno_swap_yellow').targetType).toBe('card_in_hand');
    expect(sola('uno_swap_yellow').description).toMatch(/a caso/i);
  });
});

describe('Tocco di Briscola: una carta, non tutta la mano', () => {
  it('trasforma solo la carta scelta', () => {
    const playerHand = [c('coppe', 1, 'asso_coppe'), c('spade', 4, 'liscia'), c('bastoni', 9, 'cavallo')];
    const before = ctx('uno_all_wild', { playerHand, targetCard: playerHand[0] });
    const after = executeUnoCard(before);

    const changed = after.newPlayerHand.filter((card) => card.suit === 'denari');
    expect(changed).toHaveLength(1);
    expect(changed[0].id).toBe('asso_coppe');
    // Everything else is exactly as it was.
    expect(after.newPlayerHand.find((c2) => c2.id === 'liscia')!.suit).toBe('spade');
    expect(after.newPlayerHand.find((c2) => c2.id === 'cavallo')!.suit).toBe('bastoni');
  });

  it('la carta conserva valore e potenza: cambia solo il seme', () => {
    const playerHand = [c('coppe', 1, 'asso_coppe')];
    const after = executeUnoCard(ctx('uno_all_wild', { playerHand, targetCard: playerHand[0] }));
    const transformed = after.newPlayerHand[0];
    expect(transformed.rank).toBe(1);
    expect(transformed.points).toBe(11);
    expect(transformed.power).toBe(10);
  });

  it('non scrive mai nel mazzo della run', () => {
    const playerHand = [c('coppe', 1, 'asso_coppe')];
    const after = executeUnoCard(ctx('uno_all_wild', { playerHand, targetCard: playerHand[0] }));
    // The run deck is only ever touched through cardUpgradedInRunDeck, and this
    // card must never set it: the forty identities are not up for editing.
    expect(after.cardUpgradedInRunDeck).toBeUndefined();
  });

  it('senza una carta scelta la mano resta intatta', () => {
    const before = ctx('uno_all_wild', { targetCard: undefined });
    const after = executeUnoCard(before);
    expect(after.newPlayerHand).toEqual(before.playerHand);
  });
});

describe('Scudo Protettivo: una finestra, non un interruttore', () => {
  it('dura tre prese e lo dice', () => {
    const after = executeUnoCard(ctx('uno_block_boss'));
    expect(after.bossShieldTricks).toBe(3);
    expect(after.newBossDebuffActive).toBe(false);
    expect(sola('uno_block_boss').description).toMatch(/3 prese/);
    expect(sola('uno_block_boss').description).toMatch(/torna attivo/i);
  });

  it('nessun altra Carta Sola alza lo scudo', () => {
    for (const card of ALL_UNO_CARDS) {
      if (card.id === 'uno_block_boss') continue;
      const after = executeUnoCard(ctx(card.id, { targetCard: undefined }));
      expect({ id: card.id, shield: after.bossShieldTricks ?? 0 }).toEqual({ id: card.id, shield: 0 });
    }
  });
});

describe('tutte le Carte Sola restano oneste sul tavolo', () => {
  it('nessuna sbilancia le mani, duplica una carta o corrompe il tallone', () => {
    for (const card of ALL_UNO_CARDS) {
      const before = ctx(card.id, { targetCard: undefined });
      const withTarget = ctx(card.id, { targetCard: before.playerHand[0] });

      for (const input of [before, withTarget]) {
        const after = executeUnoCard(input);
        const total =
          after.newPlayerHand.length + after.newOpponentHand.length + after.newDrawPile.length;
        const originalTotal =
          input.playerHand.length + input.opponentHand.length + input.drawPile.length;

        expect({ id: card.id, total }).toEqual({ id: card.id, total: originalTotal });
        expect({ id: card.id, balanced: after.newPlayerHand.length === after.newOpponentHand.length })
          .toEqual({ id: card.id, balanced: input.playerHand.length === input.opponentHand.length });
        expectNoDuplicates(after);
      }
    }
  });

  it('ogni carta dice cosa fa, senza promesse piu grandi del vero', () => {
    for (const card of ALL_UNO_CARDS) {
      expect(card.description.length).toBeGreaterThan(15);
    }
    // The four rewritten ones no longer claim certainties they do not deliver.
    expect(sola('uno_skip_red').description).not.toMatch(/presa vinta|qualunque carta/i);
    expect(sola('uno_all_wild').description).not.toMatch(/tutte le carte/i);
    expect(sola('uno_block_boss').description).not.toMatch(/annulla/i);
  });
});

/** Types the harness needs but the game already guarantees elsewhere. */
export type _Unused = PlayingCard;
