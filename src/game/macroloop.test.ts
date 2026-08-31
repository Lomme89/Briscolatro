import { describe, expect, it } from 'vitest';
import {
  calculateRoundOutcome,
  createRunDeck,
  encounterFor,
  ENCOUNTERS_PER_ANTE,
  ENCOUNTER_TARGET_MULTIPLIERS,
  getBlindBaseReward,
  getBlindTargetScore,
  getEncounterReward,
  isBossEncounter,
  isRoundFinished,
  drawNextTrickCards,
  prepareRoundDeck,
  RoundStateSnapshot,
} from './gameState';
import { BOSS_RULES } from './bossRules';
import { getOpponentIntro } from '../data/opponents';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { ALL_DECKS } from '../data/decks';
import { evaluateVictoryCondition, VictoryMode } from './victoryModes';
import { PlayingCard } from '../types/game';

function snapshot(over: Partial<RoundStateSnapshot> = {}): RoundStateSnapshot {
  return {
    currentRoundScore: 0,
    totalScore: 0,
    roundPointsTaken: 0,
    opponentPointsTaken: 0,
    roundTricksWon: 0,
    roundTricksLost: 0,
    totalTricksWon: 0,
    totalTricksLost: 0,
    totalBriscolaPointsPlayer: 0,
    totalBriscolaPointsOpponent: 0,
    money: 4,
    totalMoneyEarned: 10,
    targetScore: 1000,
    ante: 1,
    round: 1,
    vouchers: [],
    bossesDefeated: 0,
    solaCardsUsed: 0,
    ...over,
  };
}

describe('un Ante, due incontri', () => {
  it('Tavolo e Boss, e niente altro', () => {
    expect(ENCOUNTERS_PER_ANTE).toBe(2);
    expect(encounterFor(1)).toBe('table');
    expect(encounterFor(2)).toBe('boss');
    expect(isBossEncounter(1)).toBe(false);
    expect(isBossEncounter(2)).toBe(true);
  });

  it('la run e sedici partite, non ventiquattro', () => {
    // Eight antes of two encounters. Twenty tricks each, so the whole run is
    // 320 tricks against the old 480.
    const encounters = 8 * ENCOUNTERS_PER_ANTE;
    expect(encounters).toBe(16);
    expect(encounters * 20).toBe(320);
  });

  it('del Grande Buio non resta niente nel flusso', () => {
    // The old middle blind was the small one played twice. Nothing addresses a
    // third encounter any more: the sequence is Tavolo, shop, Boss, shop.
    for (let ante = 1; ante <= 8; ante++) {
      expect(getOpponentIntro(ante, 1).isBoss).toBe(false);
      expect(getOpponentIntro(ante, 2).isBoss).toBe(true);
    }
  });

  it('il malus del Boss vale solo sul Boss', () => {
    for (let ante = 1; ante <= 8; ante++) {
      expect(getOpponentIntro(ante, 1).boss).toBeNull();
      expect(getOpponentIntro(ante, 2).boss).not.toBeNull();
      expect(getOpponentIntro(ante, 2).boss!.ante).toBe(ante);
    }
  });
});

describe('i target dei due incontri', () => {
  it('il Tavolo chiede 1.25x, il Boss 2x', () => {
    expect(ENCOUNTER_TARGET_MULTIPLIERS.table).toBe(1.25);
    expect(ENCOUNTER_TARGET_MULTIPLIERS.boss).toBe(2);
  });

  it('il Boss e sempre piu duro del Tavolo, a ogni Ante', () => {
    for (let ante = 1; ante <= 8; ante++) {
      const table = getBlindTargetScore(ante, 1);
      const boss = getBlindTargetScore(ante, 2, {
        bossMultiplier: BOSS_RULES.getTargetScoreMultiplier(
          ALL_BOSS_BLINDS.find((b) => b.ante === ante)!
        ),
      });
      expect({ ante, harder: boss > table }).toEqual({ ante, harder: true });
    }
  });

  it('il Tavolo sta fra i due vecchi buii', () => {
    // It absorbed the Small (x1) and the Big (x1.5) and sits between them.
    for (let ante = 1; ante <= 8; ante++) {
      const table = getBlindTargetScore(ante, 1);
      const oldSmall = getBlindTargetScore(ante, 1) / 1.25;
      expect(table).toBeGreaterThan(oldSmall);
      expect(table).toBeLessThan(oldSmall * 1.5);
    }
  });
});

describe('il denaro di un Ante non e cambiato', () => {
  it('due premi valgono quanto i tre di prima', () => {
    for (let ante = 1; ante <= 8; ante++) {
      const before = getBlindBaseReward(ante) * 3;
      const after = getEncounterReward(ante, 1) + getEncounterReward(ante, 2);
      expect({ ante, before, after }).toEqual({ ante, before, after: before });
    }
  });

  it('il Boss paga piu del Tavolo', () => {
    for (let ante = 1; ante <= 8; ante++) {
      expect(getEncounterReward(ante, 2)).toBeGreaterThan(getEncounterReward(ante, 1));
    }
  });

  it('il premio finisce davvero nel calcolo di fine incontro', () => {
    const table = calculateRoundOutcome(
      snapshot({ ante: 4, round: 1, currentRoundScore: 5000 }),
      0,
      []
    );
    const boss = calculateRoundOutcome(
      snapshot({ ante: 4, round: 2, currentRoundScore: 5000 }),
      0,
      []
    );
    expect(table.baseReward).toBe(getEncounterReward(4, 1));
    expect(boss.baseReward).toBe(getEncounterReward(4, 2));
    expect(boss.baseReward).toBeGreaterThan(table.baseReward);
  });
});

describe('quello che contava sul round 3 conta ora sul Boss', () => {
  it('il contatore dei Boss sconfitti scatta sul secondo incontro', () => {
    const won = { currentRoundScore: 5000, targetScore: 1000 };
    const atTable = calculateRoundOutcome(snapshot({ round: 1, ...won }), 0, []);
    const atBoss = calculateRoundOutcome(snapshot({ round: 2, ...won }), 0, []);
    // Three beaten bosses unlock the Trevigiano; the Tavolo must never count.
    expect(
      calculateRoundOutcome(snapshot({ round: 1, bossesDefeated: 2, ...won }), 0, [])
        .newUnlockedDecks
    ).not.toContain('deck_spade');
    expect(
      calculateRoundOutcome(snapshot({ round: 2, bossesDefeated: 2, ...won }), 0, [])
        .newUnlockedDecks
    ).toContain('deck_spade');
    expect(atTable.won).toBe(true);
    expect(atBoss.won).toBe(true);
  });

  it('la run si vince battendo il Boss dell Ante 8, non il suo Tavolo', () => {
    const won = { currentRoundScore: 5000, targetScore: 1000, ante: 8 };
    expect(calculateRoundOutcome(snapshot({ round: 1, ...won }), 0, []).isAnte8Victory).toBe(false);
    expect(calculateRoundOutcome(snapshot({ round: 2, ...won }), 0, []).isAnte8Victory).toBe(true);
  });

  it('un Boss perso non conta come sconfitto', () => {
    const lost = calculateRoundOutcome(
      snapshot({ round: 2, bossesDefeated: 2, currentRoundScore: 10, targetScore: 1000 }),
      0,
      []
    );
    expect(lost.won).toBe(false);
    expect(lost.newUnlockedDecks).not.toContain('deck_spade');
  });
});

describe('ogni incontro resta una Briscola intera', () => {
  it('quaranta carte, venti prese, una copia di ogni identita', () => {
    for (const deckDef of ALL_DECKS) {
      const runDeck = createRunDeck(deckDef);
      expect(runDeck).toHaveLength(40);

      const deal = prepareRoundDeck(runDeck);
      let playerHand: PlayingCard[] = deal.playerHand;
      let opponentHand: PlayingCard[] = deal.opponentHand;
      let pile = deal.roundDrawPile;
      let trump: PlayingCard | null = deal.trumpCard;
      let tricks = 0;

      while (!isRoundFinished(playerHand, opponentHand, pile, trump)) {
        playerHand = playerHand.slice(1);
        opponentHand = opponentHand.slice(1);
        const drawn = drawNextTrickCards(true, pile, trump, playerHand, opponentHand);
        playerHand = drawn.newPlayerHand;
        opponentHand = drawn.newOpponentHand;
        pile = drawn.newDrawPile;
        trump = drawn.newTrumpCard;
        tricks++;
      }

      expect({ deck: deckDef.id, tricks: tricks + playerHand.length }).toEqual({
        deck: deckDef.id,
        tricks: 20,
      });
    }
  });

  it('i 61 punti restano 61 su 120, in ogni incontro e in ogni modalita', () => {
    const modes: VictoryMode[] = ['briscolatro', 'sbaraglio', 'traditional', 'double_challenge'];
    for (const mode of modes) {
      for (const round of [1, 2]) {
        const target = getBlindTargetScore(1, round);
        expect(
          evaluateVictoryCondition({ mode, score: 0, targetScore: target, playerBriscolaPoints: 61 })
            .briscolaPassed
        ).toBe(true);
        expect(
          evaluateVictoryCondition({ mode, score: 0, targetScore: target, playerBriscolaPoints: 60 })
            .briscolaPassed
        ).toBe(false);
      }
    }
  });

  it('le quattro modalita decidono ancora esattamente come prima', () => {
    const target = getBlindTargetScore(3, 2);
    const cases: Array<[VictoryMode, number, number, boolean]> = [
      ['briscolatro', target, 20, true],
      ['briscolatro', target - 1, 80, false],
      ['sbaraglio', target - 1, 61, true],
      ['sbaraglio', target - 1, 60, false],
      ['traditional', target * 10, 60, false],
      ['traditional', 0, 61, true],
      ['double_challenge', target, 60, false],
      ['double_challenge', target, 61, true],
    ];
    for (const [mode, score, points, expected] of cases) {
      expect({ mode, score, points, won: evaluateVictoryCondition({
        mode,
        score,
        targetScore: target,
        playerBriscolaPoints: points,
      }).won }).toEqual({ mode, score, points, won: expected });
    }
  });
});
