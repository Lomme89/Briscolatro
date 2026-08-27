import { describe, it, expect } from 'vitest';
import {
  createCard,
  createStandardDeck,
  withRank,
  resolveTrick,
  RANK_INFO,
} from '../game/briscola';
import {
  createRunDeck,
  prepareRoundDeck,
  performExchangeDiscard,
  drawNextTrickCards,
  isRoundFinished,
  applyTrickResult,
  calculateRoundOutcome,
  RoundStateSnapshot,
} from '../game/gameState';
import { calculateTrickScore } from '../game/scoring';
import { executeUnoCard, UnoActionContext } from '../game/unoEffects';
import { BOSS_RULES } from '../game/bossRules';
import { ALL_DECKS } from '../data/decks';
import { ALL_JOKERS } from '../data/jokers';
import { ALL_UNO_CARDS } from '../data/unoCards';
import { PlayingCard, Suit } from '../types/game';

describe('Briscola Core Game Rules & Invariants', () => {
  it('creates a standard 40-card deck with exactly 120 total points', () => {
    const deck = createStandardDeck();
    expect(deck.length).toBe(40);

    const totalPoints = deck.reduce((sum, card) => sum + card.points, 0);
    expect(totalPoints).toBe(120);

    // Verify 4 of each rank
    for (let r = 1; r <= 10; r++) {
      const count = deck.filter((c) => c.rank === r).length;
      expect(count).toBe(4);
    }
  });

  it('atomically synchronizes points and power with withRank()', () => {
    const card = createCard('denari', 2);
    expect(card.points).toBe(0);
    expect(card.power).toBe(1);

    const upgradedToAce = withRank(card, 1);
    expect(upgradedToAce.rank).toBe(1);
    expect(upgradedToAce.points).toBe(11);
    expect(upgradedToAce.power).toBe(10);

    const upgradedToThree = withRank(card, 3);
    expect(upgradedToThree.rank).toBe(3);
    expect(upgradedToThree.points).toBe(10);
    expect(upgradedToThree.power).toBe(9);

    const upgradedToKing = withRank(card, 10);
    expect(upgradedToKing.rank).toBe(10);
    expect(upgradedToKing.points).toBe(4);
    expect(upgradedToKing.power).toBe(8);
  });

  it('correctly resolves trick when player leads and opponent responds', () => {
    const briscolaSuit: Suit = 'spade';

    // 1. Lead with Briscola vs non-briscola -> Player wins
    const playerAceSpade = createCard('spade', 1);
    const oppThreeDenari = createCard('denari', 3);
    const res1 = resolveTrick(playerAceSpade, oppThreeDenari, briscolaSuit, true);
    expect(res1.playerWon).toBe(true);
    expect(res1.points).toBe(21);

    // 2. Lead with Liscia vs opponent Briscola -> Opponent wins
    const playerLisciaCoppe = createCard('coppe', 4);
    const oppDueSpade = createCard('spade', 2);
    const res2 = resolveTrick(playerLisciaCoppe, oppDueSpade, briscolaSuit, true);
    expect(res2.playerWon).toBe(false);
    expect(res2.points).toBe(0);

    // 3. Both play same non-briscola suit -> Higher power wins
    const playerTreCoppe = createCard('coppe', 3); // power 9
    const oppReCoppe = createCard('coppe', 10);   // power 8
    const res3 = resolveTrick(playerTreCoppe, oppReCoppe, briscolaSuit, true);
    expect(res3.playerWon).toBe(true);
    expect(res3.points).toBe(14);

    // 4. Opponent plays different non-briscola suit -> Lead player wins!
    const playerQuattroBastoni = createCard('bastoni', 4);
    const oppAssoDenari = createCard('denari', 1);
    const res4 = resolveTrick(playerQuattroBastoni, oppAssoDenari, briscolaSuit, true);
    expect(res4.playerWon).toBe(true);
    expect(res4.points).toBe(11);
  });

  it('correctly resolves trick when opponent leads and player responds', () => {
    const briscolaSuit: Suit = 'denari';

    // Opponent leads with Asso Bastoni (11 pt)
    const oppAssoBastoni = createCard('bastoni', 1);

    // Player takes with Due Denari (Briscola, 0 pt)
    const playerDueDenari = createCard('denari', 2);
    const res = resolveTrick(oppAssoBastoni, playerDueDenari, briscolaSuit, false);
    expect(res.playerWon).toBe(true);
    expect(res.points).toBe(11);
  });

  it('preserves the strict 40-card invariant during discards (Scarto as Exchange)', () => {
    const runDeck = createStandardDeck();
    const { roundDrawPile, trumpCard, playerHand, opponentHand } = prepareRoundDeck(runDeck);

    expect(playerHand.length).toBe(3);
    expect(opponentHand.length).toBe(3);
    expect(roundDrawPile.length).toBe(33);
    expect(trumpCard).not.toBeNull();

    const totalBefore = playerHand.length + opponentHand.length + roundDrawPile.length + (trumpCard ? 1 : 0);
    expect(totalBefore).toBe(40);

    // Discard 1 card
    const cardToDiscard = playerHand[0];
    const discardRes = performExchangeDiscard(cardToDiscard, playerHand, roundDrawPile, trumpCard);

    expect(discardRes.success).toBe(true);
    expect(discardRes.newPlayerHand.length).toBe(3);
    expect(discardRes.newDrawPile.length).toBe(33);

    const totalAfter = discardRes.newPlayerHand.length + opponentHand.length + discardRes.newDrawPile.length + (discardRes.newTrumpCard ? 1 : 0);
    expect(totalAfter).toBe(40);
  });

  it('draws replacement cards correctly in sequence after a trick', () => {
    const runDeck = createStandardDeck();
    const { roundDrawPile, trumpCard, playerHand, opponentHand } = prepareRoundDeck(runDeck);

    // Simulate 1 card played from each hand
    const pHand = playerHand.slice(1);
    const oHand = opponentHand.slice(1);

    const drawRes = drawNextTrickCards(true, roundDrawPile, trumpCard, pHand, oHand);
    expect(drawRes.newPlayerHand.length).toBe(3);
    expect(drawRes.newOpponentHand.length).toBe(3);
    expect(drawRes.newDrawPile.length).toBe(31);
  });

  it('detects when round is finished (both hands and deck exhausted)', () => {
    expect(isRoundFinished([], [], [], null)).toBe(true);
    expect(isRoundFinished([createCard('denari', 1)], [], [], null)).toBe(false);
    expect(isRoundFinished([], [], [createCard('denari', 1)], null)).toBe(false);
  });
});

describe('Joker & Scoring Engine', () => {
  it('correctly applies Carrettiere (Mult on Bastoni) and Orafo (Chips & $1 on Denari)', () => {
    const carrettiere = ALL_JOKERS.find((j) => j.id === 'j_carrettiere')!;
    const orafo = ALL_JOKERS.find((j) => j.id === 'j_orafo')!;

    const playerCard = createCard('bastoni', 1); // Asso Bastoni (11pt)
    const oppCard = createCard('denari', 3);    // Tre Denari (10pt)
    const clash = resolveTrick(playerCard, oppCard, 'coppe', true);

    const score = calculateTrickScore(
      playerCard,
      oppCard,
      clash,
      'coppe',
      [carrettiere, orafo],
      null,
      {
        money: 10,
        playerHand: [],
        tricksWonThisRound: 0,
        consecutiveWinStreak: 0,
        totalTricksPlayedThisRound: 0,
        remainingTricksCount: 15,
        capturedDenariRanksThisRound: new Set(),
      }
    );

    expect(score.bonusMult).toBe(10); // Carrettiere triggered
    expect(score.bonusChips).toBe(45); // Orafo triggered
    expect(score.bonusDollars).toBe(1); // Orafo +$1
    expect(score.finalScore).toBeGreaterThan(0);
  });

  it('handles Boss Debuffs properly in Boss Rules & Scoring', () => {
    const bossGigi = {
      id: 'boss_ante_1',
      name: 'Gigi',
      characterTitle: 'Il Tagliatore',
      avatar: 'gigi',
      bossQuote: 'Niente lisce!',
      ante: 1,
      targetScore: 300,
      reward: 5,
      debuffDescription: 'Le Lisce non danno chips',
      debuffType: 'no_lisce_chips' as const,
    };

    const playerLiscia = createCard('denari', 2); // 0 pt
    const oppLiscia = createCard('coppe', 4);     // 0 pt
    const clash = resolveTrick(playerLiscia, oppLiscia, 'denari', true);

    const score = calculateTrickScore(
      playerLiscia,
      oppLiscia,
      clash,
      'denari',
      [],
      bossGigi,
      {
        money: 0,
        playerHand: [],
        tricksWonThisRound: 0,
        consecutiveWinStreak: 0,
        totalTricksPlayedThisRound: 0,
        remainingTricksCount: 10,
        capturedDenariRanksThisRound: new Set(),
      }
    );

    expect(score.baseChips).toBe(5); // reduced from standard 20
  });
});

describe('UNO Action Cards Execution', () => {
  it('cycles cards with +2 Pesca Due without changing hand size', () => {
    const plusTwo = ALL_UNO_CARDS.find((u) => u.id === 'uno_plus_two_red')!;
    const drawPile = [createCard('denari', 1), createCard('denari', 2), createCard('denari', 3)];
    const playerHand = [createCard('coppe', 7)];

    const ctx: UnoActionContext = {
      unoCard: plusTwo,
      drawPile,
      playerHand,
      opponentHand: [],
      briscolaSuit: 'spade',
      money: 5,
      discardsLeft: 1,
      activeJokers: [],
      maxJokers: 5,
      currentRoundScore: 100,
      bossDebuffActive: true,
      activeUnoMultiplier: 1.0,
      isReverseActive: false,
    };

    const res = executeUnoCard(ctx);
    // +2 cycles cards through the stock: hand and stock sizes must not change,
    // or the two hands desynchronise for the rest of the round.
    expect(res.newPlayerHand.length).toBe(1);
    expect(res.newDrawPile.length).toBe(3);
    expect(res.newPlayerHand[0].id).not.toBe(playerHand[0].id);
    expect(res.newRoundScore).toBe(160);      // 100 + 60 bonus
  });

  it('executes UNO Custom Foil upgrades correctly', () => {
    const foilCard = ALL_UNO_CARDS.find((u) => u.id === 'uno_custom_foil')!;
    const target = createCard('denari', 1);
    const playerHand = [target];

    const ctx: UnoActionContext = {
      unoCard: foilCard,
      targetCard: target,
      drawPile: [],
      playerHand,
      opponentHand: [],
      briscolaSuit: 'bastoni',
      money: 10,
      discardsLeft: 2,
      activeJokers: [],
      maxJokers: 5,
      currentRoundScore: 0,
      bossDebuffActive: false,
      activeUnoMultiplier: 1.0,
      isReverseActive: false,
    };

    const res = executeUnoCard(ctx);
    expect(res.newPlayerHand[0].edition).toBe('foil');
    expect(res.cardUpgradedInRunDeck?.updates.edition).toBe('foil');
  });
});
