import { describe, expect, it } from 'vitest';
import { createCard, resolveTrick } from './briscola';
import { resolveSpecialForTrick, SPECIAL_INFO, visiblePlayerCards } from './specialCards';
import { calculateTrickScore } from './scoring';
import { chooseOpponentLead } from './ai';
import { applyTrickResult, RoundStateSnapshot } from './gameState';
import { PlayingCard, CardSpecial } from '../types/game';

const card = (special: CardSpecial, id = 'test') =>
  createCard('coppe', 4, 'standard', 'none', 'none', id, special);

function trick(playerCard: PlayingCard, opponentCard: PlayingCard, playerLed = true) {
  return resolveTrick(
    playerLed ? playerCard : opponentCard,
    playerLed ? opponentCard : playerCard,
    'denari',
    playerLed
  );
}

function score(playerCard: PlayingCard, opponentCard: PlayingCard, money = 10, playerLed = true) {
  return calculateTrickScore(
    playerCard,
    opponentCard,
    trick(playerCard, opponentCard, playerLed),
    'denari',
    [],
    null,
    {
      money,
      playerHand: [],
      tricksWonThisRound: 0,
      consecutiveWinStreak: 0,
      totalTricksPlayedThisRound: 0,
      remainingTricksCount: 10,
      capturedDenariRanksThisRound: new Set<number>(),
    },
    1,
    null,
    playerLed
  );
}

describe('Vetro', () => {
  it('doubles the Mult on a won trick', () => {
    const plain = score(card('none'), createCard('coppe', 2));
    const vetro = score(card('vetro'), createCard('coppe', 2));
    expect(vetro.xMult).toBe(plain.xMult * 2);
    expect(vetro.special.brokenSpecialCardId).toBeNull();
  });

  it('breaks for good when the trick is lost', () => {
    const out = resolveSpecialForTrick({
      card: card('vetro', 'il_mio_quattro'),
      playerLed: true,
      playerWon: false,
      money: 10,
    });
    expect(out.brokenSpecialCardId).toBe('il_mio_quattro');
    expect(out.xMultToMultiply).toBe(1);
    expect(out.reasons).toContain('Vetro spezzato');
  });

  it('is deterministic: winning never breaks it, losing always does', () => {
    for (let i = 0; i < 20; i++) {
      const won = resolveSpecialForTrick({ card: card('vetro'), playerLed: true, playerWon: true, money: 5 });
      const lost = resolveSpecialForTrick({ card: card('vetro'), playerLed: true, playerWon: false, money: 5 });
      expect(won.brokenSpecialCardId).toBeNull();
      expect(lost.brokenSpecialCardId).toBe('test');
    }
  });
});

describe('Segnata', () => {
  it('adds 15 Mult on a won trick', () => {
    const plain = score(card('none'), createCard('coppe', 2));
    const segnata = score(card('segnata'), createCard('coppe', 2));
    expect(segnata.bonusMult - plain.bonusMult).toBe(15);
  });

  it('is the only thing the opponent gets to see of the hand', () => {
    const hand = [
      createCard('spade', 1, 'standard', 'none', 'none', 'asso_nascosto'),
      createCard('coppe', 4, 'standard', 'none', 'none', 'segnata_visibile', 'segnata'),
      createCard('bastoni', 3, 'standard', 'none', 'none', 'tre_nascosto'),
    ];
    const visible = visiblePlayerCards(hand);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('segnata_visibile');
    expect(visible.some((c) => c.id === 'asso_nascosto')).toBe(false);
    expect(visible.some((c) => c.id === 'tre_nascosto')).toBe(false);
  });

  it('an unmarked hand tells the opponent nothing at all', () => {
    const hand = [createCard('spade', 1), createCard('coppe', 3), createCard('denari', 10)];
    expect(visiblePlayerCards(hand)).toEqual([]);
  });

  it('the AI declines to walk points into a card it can see', () => {
    // Two Fanti, identical to the opponent in every way it normally weighs.
    // The marked Cavallo di Coppe takes one of them and not the other, so the
    // knowledge - and only that knowledge - decides which one it leads.
    const oppHand = [
      createCard('coppe', 8, 'standard', 'none', 'none', 'fante_coppe'),
      createCard('spade', 8, 'standard', 'none', 'none', 'fante_spade'),
    ];
    const marked = [
      createCard('coppe', 9, 'standard', 'none', 'none', 'cavallo_segnato', 'segnata'),
    ];

    const blind = chooseOpponentLead(oppHand, { briscolaSuit: 'denari' });
    const informed = chooseOpponentLead(oppHand, {
      briscolaSuit: 'denari',
      knownPlayerCards: marked,
    });

    expect(blind!.id).toBe('fante_coppe');
    expect(informed!.id).toBe('fante_spade');
  });

  it('an unmarked hand of the same cards changes nothing', () => {
    const oppHand = [
      createCard('coppe', 8, 'standard', 'none', 'none', 'fante_coppe'),
      createCard('spade', 8, 'standard', 'none', 'none', 'fante_spade'),
    ];
    const hidden = [createCard('coppe', 9, 'standard', 'none', 'none', 'cavallo_nascosto')];

    const informed = chooseOpponentLead(oppHand, {
      briscolaSuit: 'denari',
      knownPlayerCards: visiblePlayerCards(hidden),
    });
    expect(informed!.id).toBe('fante_coppe');
  });
});

describe('A Debito', () => {
  it('pays a dollar and hands over 100 Chips on a won trick', () => {
    const plain = score(card('none'), createCard('coppe', 2), 5);
    const debito = score(card('debito'), createCard('coppe', 2), 5);
    expect(debito.bonusChips - plain.bonusChips).toBe(100);
    expect(debito.special.dollarsToAdd).toBe(-1);
  });

  it('costs the dollar on a lost trick too, with no bonus', () => {
    const out = resolveSpecialForTrick({ card: card('debito'), playerLed: false, playerWon: false, money: 3 });
    expect(out.dollarsToAdd).toBe(-1);
    expect(out.chipsToAdd).toBe(0);
  });

  it('with an empty till it charges nothing and pays nothing', () => {
    const out = resolveSpecialForTrick({ card: card('debito'), playerLed: true, playerWon: true, money: 0 });
    expect(out.dollarsToAdd).toBe(0);
    expect(out.chipsToAdd).toBe(0);
    expect(out.unpaidDebt).toBe(true);
  });

  it('never pushes money below zero, whatever the trick did', () => {
    for (const money of [0, 1, 2]) {
      for (const won of [true, false]) {
        const out = resolveSpecialForTrick({ card: card('debito'), playerLed: true, playerWon: won, money });
        expect(money + out.dollarsToAdd).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('Traditrice', () => {
  it('doubles the Mult when it opens the trick and wins', () => {
    const plain = score(card('none'), createCard('coppe', 2), 10, true);
    const traditrice = score(card('traditrice'), createCard('coppe', 2), 10, true);
    expect(traditrice.xMult).toBe(plain.xMult * 2);
  });

  it('gives nothing when it wins as an answer', () => {
    const out = resolveSpecialForTrick({ card: card('traditrice'), playerLed: false, playerWon: true, money: 10 });
    expect(out.xMultToMultiply).toBe(1);
    expect(out.dollarsToAdd).toBe(0);
  });

  it('charges $2 when it answers and loses', () => {
    const out = resolveSpecialForTrick({ card: card('traditrice'), playerLed: false, playerWon: false, money: 10 });
    expect(out.dollarsToAdd).toBe(-2);
  });

  it('costs nothing when it opens and loses', () => {
    const out = resolveSpecialForTrick({ card: card('traditrice'), playerLed: true, playerWon: false, money: 10 });
    expect(out.dollarsToAdd).toBe(0);
  });

  it('takes only what is in the till', () => {
    expect(
      resolveSpecialForTrick({ card: card('traditrice'), playerLed: false, playerWon: false, money: 1 }).dollarsToAdd
    ).toBe(-1);
    expect(
      resolveSpecialForTrick({ card: card('traditrice'), playerLed: false, playerWon: false, money: 0 }).dollarsToAdd
    ).toBe(0);
  });
});

describe('the Azzardo as a whole', () => {
  it('a plain card triggers nothing at all', () => {
    const out = resolveSpecialForTrick({ card: card('none'), playerLed: true, playerWon: false, money: 0 });
    expect(out).toMatchObject({
      chipsToAdd: 0,
      multToAdd: 0,
      xMultToMultiply: 1,
      dollarsToAdd: 0,
      brokenSpecialCardId: null,
      reasons: [],
    });
  });

  it('every Azzardo says both what it gives and what it costs', () => {
    for (const info of Object.values(SPECIAL_INFO)) {
      expect(info.bonus.length).toBeGreaterThan(0);
      expect(info.cost.length).toBeGreaterThan(0);
      expect(info.badge).toBe(info.badge.toUpperCase());
    }
  });

  it('no outcome depends on a hidden roll', () => {
    // The same trick, resolved a hundred times, gives the same answer every
    // time: the player can reason about the risk before playing.
    const specials: CardSpecial[] = ['segnata', 'vetro', 'debito', 'traditrice'];
    for (const special of specials) {
      const first = JSON.stringify(
        resolveSpecialForTrick({ card: card(special), playerLed: false, playerWon: false, money: 4 })
      );
      for (let i = 0; i < 100; i++) {
        expect(
          JSON.stringify(
            resolveSpecialForTrick({ card: card(special), playerLed: false, playerWon: false, money: 4 })
          )
        ).toBe(first);
      }
    }
  });
});

describe('the till', () => {
  it('the Azzardo cost is carried once, in bonusDollars', () => {
    // It used to be charged twice: once here and once again by the caller.
    const debito = score(card('debito'), createCard('coppe', 2), 5);
    const plain = score(card('none'), createCard('coppe', 2), 5);
    expect(debito.bonusDollars - plain.bonusDollars).toBe(-1);
    expect(debito.special.dollarsToAdd).toBe(-1);
  });

  it('a trick can empty the till but never take it below zero', () => {
    const snapshot = { money: 1, totalMoneyEarned: 20 } as RoundStateSnapshot;
    const next = applyTrickResult(
      { ...snapshot, currentRoundScore: 0, totalScore: 0 } as RoundStateSnapshot,
      false,
      0,
      0,
      -2
    );
    expect(next.money).toBe(0);
    // Spending is not earning: the lifetime counter does not go backwards.
    expect(next.totalMoneyEarned).toBe(20);
  });
});
