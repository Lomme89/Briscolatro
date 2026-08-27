import { describe, expect, it } from 'vitest';
import {
  ALL_VICTORY_MODES,
  BRISCOLA_TARGET_POINTS,
  DEFAULT_VICTORY_MODE,
  evaluateVictoryCondition,
  parseVictoryMode,
  VICTORY_MODES,
  VictoryMode,
  victoryHeadline,
} from './victoryModes';
import { calculateRoundOutcome, getBlindTargetScore, RoundStateSnapshot } from './gameState';
import { BOSS_RULES } from './bossRules';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { createStandardDeck } from './briscola';
import { drawNextTrickCards, isRoundFinished, prepareRoundDeck } from './gameState';

const check = (mode: VictoryMode, score: number, points: number, target = 10000) =>
  evaluateVictoryCondition({ mode, score, targetScore: target, playerBriscolaPoints: points });

describe('BRISCOLATRO - il gioco storico', () => {
  it('chips PASS, briscola FAIL -> vittoria', () => {
    const v = check('briscolatro', 10500, 45);
    expect(v.won).toBe(true);
    expect(v.victoryRoute).toBe('chips');
  });

  it('chips FAIL, briscola PASS -> sconfitta', () => {
    const v = check('briscolatro', 9500, 70);
    expect(v.won).toBe(false);
    // The requirement it met is still reported: the summary shows both.
    expect(v.briscolaPassed).toBe(true);
    expect(v.victoryRoute).toBe('briscola');
  });

  it('i punti Briscola non spostano mai il verdetto', () => {
    for (let points = 0; points <= 120; points += 10) {
      expect(check('briscolatro', 10000, points).won).toBe(true);
      expect(check('briscolatro', 9999, points).won).toBe(false);
    }
  });
});

describe('SBARAGLIO - basta una delle due', () => {
  it('chips PASS, briscola FAIL -> vittoria', () => {
    expect(check('sbaraglio', 10000, 20).won).toBe(true);
  });
  it('chips FAIL, briscola PASS -> vittoria', () => {
    expect(check('sbaraglio', 0, 61).won).toBe(true);
  });
  it('entrambi PASS -> vittoria', () => {
    const v = check('sbaraglio', 12000, 80);
    expect(v.won).toBe(true);
    expect(v.victoryRoute).toBe('both');
  });
  it('entrambi FAIL -> sconfitta', () => {
    const v = check('sbaraglio', 9999, 60);
    expect(v.won).toBe(false);
    expect(v.victoryRoute).toBe('none');
  });
});

describe('BRISCOLA - tradizionale', () => {
  it('punteggio enorme con 60 punti -> sconfitta', () => {
    const v = check('traditional', 200000, 60);
    expect(v.won).toBe(false);
    expect(v.chipsPassed).toBe(true);
  });
  it('punteggio zero con 61 punti -> vittoria', () => {
    const v = check('traditional', 0, 61);
    expect(v.won).toBe(true);
    expect(v.chipsPassed).toBe(false);
  });
});

describe('DOPPIA SFIDA - servono entrambe', () => {
  it('chips PASS, briscola FAIL -> sconfitta', () => {
    expect(check('double_challenge', 10000, 54).won).toBe(false);
  });
  it('chips FAIL, briscola PASS -> sconfitta', () => {
    expect(check('double_challenge', 9000, 68).won).toBe(false);
  });
  it('entrambi PASS -> vittoria', () => {
    expect(check('double_challenge', 10000, 63).won).toBe(true);
  });
  it('entrambi FAIL -> sconfitta', () => {
    expect(check('double_challenge', 100, 10).won).toBe(false);
  });
});

describe('61 significa 61', () => {
  it('61-59 passa, 60-60 no, 59-61 no', () => {
    expect(check('traditional', 0, 61).briscolaPassed).toBe(true);
    expect(check('traditional', 0, 60).briscolaPassed).toBe(false);
    expect(check('traditional', 0, 59).briscolaPassed).toBe(false);
  });

  it('non e una maggioranza relativa: e una soglia sui 120', () => {
    // A 60-60 split is a majority over nobody and is not a win.
    expect(BRISCOLA_TARGET_POINTS).toBe(61);
    expect(check('traditional', 0, 60).won).toBe(false);
  });
});

describe('migrazione dei salvataggi', () => {
  it('un save senza modalita atterra su Briscolatro', () => {
    expect(parseVictoryMode(null)).toBe('briscolatro');
    expect(parseVictoryMode(undefined)).toBe('briscolatro');
    expect(parseVictoryMode('')).toBe('briscolatro');
    expect(parseVictoryMode('una_modalita_che_non_esiste')).toBe('briscolatro');
    expect(DEFAULT_VICTORY_MODE).toBe('briscolatro');
  });

  it('le quattro modalita hanno record separati, e il vecchio e quello di Briscolatro', () => {
    const keys = ALL_VICTORY_MODES.map((m) => m.highScoreKey);
    expect(new Set(keys).size).toBe(4);
    // The historical key belongs to Briscolatro: the old game asked for Chips.
    expect(VICTORY_MODES.briscolatro.highScoreKey).toBe('briscolatro_highscore');
    for (const mode of ALL_VICTORY_MODES) {
      if (mode.id !== 'briscolatro') {
        expect(mode.highScoreKey).not.toBe('briscolatro_highscore');
      }
    }
  });

  it('ogni modalita si spiega in una riga e porta un badge', () => {
    for (const mode of ALL_VICTORY_MODES) {
      expect(mode.description.length).toBeGreaterThan(10);
      expect(mode.badge.length).toBeGreaterThan(0);
      expect(mode.label.length).toBeGreaterThan(0);
    }
    // Sbaraglio is not presented as "normal": the 61 does not scale with the
    // Ante while the target does.
    expect(VICTORY_MODES.sbaraglio.badge).toBe('PIÙ LIBERA');
  });
});

describe("l'esito del round passa solo da qui", () => {
  function snapshot(over: Partial<RoundStateSnapshot> = {}): RoundStateSnapshot {
    const deal = prepareRoundDeck(createStandardDeck());
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
      playerHand: deal.playerHand,
      opponentHand: deal.opponentHand,
      drawPile: deal.roundDrawPile,
      trumpCard: deal.trumpCard,
      briscolaSuit: deal.briscolaSuit,
      activeBoss: null,
      vouchers: [],
      activeJokers: [],
      bossesDefeated: 0,
      solaCardsUsed: 0,
      ...over,
    };
  }

  it('senza modalita nello snapshot si comporta come il gioco storico', () => {
    expect(calculateRoundOutcome(snapshot({ currentRoundScore: 1000 }), 0, []).won).toBe(true);
    expect(calculateRoundOutcome(snapshot({ currentRoundScore: 999 }), 0, []).won).toBe(false);
  });

  it('in Briscola si vince a 61 punti e si perde con il punteggio pieno', () => {
    const lost = calculateRoundOutcome(
      snapshot({ victoryMode: 'traditional', currentRoundScore: 999999, roundPointsTaken: 60 }),
      0,
      []
    );
    expect(lost.won).toBe(false);

    const won = calculateRoundOutcome(
      snapshot({ victoryMode: 'traditional', currentRoundScore: 0, roundPointsTaken: 61 }),
      0,
      []
    );
    expect(won.won).toBe(true);
  });

  it('il bonus dei 61 punti resta uno solo, anche quando e pure la vittoria', () => {
    // $4 for the majority, exactly as before modes existed. Winning the blind
    // WITH those points must not pay it twice.
    const traditional = calculateRoundOutcome(
      snapshot({ victoryMode: 'traditional', currentRoundScore: 0, roundPointsTaken: 70 }),
      0,
      []
    );
    const briscolatro = calculateRoundOutcome(
      snapshot({ victoryMode: 'briscolatro', currentRoundScore: 1000, roundPointsTaken: 70 }),
      0,
      []
    );

    expect(traditional.briscolaBonus).toBe(4);
    expect(briscolaBonusOf(briscolatro)).toBe(4);
    expect(traditional.totalReward).toBe(briscolatro.totalReward);
  });

  it('il verdetto completo viaggia con il risultato', () => {
    const outcome = calculateRoundOutcome(
      snapshot({ victoryMode: 'sbaraglio', currentRoundScore: 0, roundPointsTaken: 61 }),
      0,
      []
    );
    expect(outcome.victory.won).toBe(true);
    expect(outcome.victory.victoryRoute).toBe('briscola');
    expect(outcome.victory.mode).toBe('sbaraglio');
  });

  it('il moltiplicatore del Boss finisce nel target, non nella condizione', () => {
    const boss = ALL_BOSS_BLINDS.find((b) => b.ante === 3)!;
    const target = getBlindTargetScore(3, 3, {
      bossMultiplier: BOSS_RULES.getTargetScoreMultiplier(boss),
    });
    expect(target).toBeGreaterThan(getBlindTargetScore(3, 1));
    // The condition reads whatever target it is handed, boss or not.
    expect(check('briscolatro', target, 0, target).won).toBe(true);
    expect(check('briscolatro', target - 1, 0, target).won).toBe(false);
  });
});

function briscolaBonusOf(outcome: { briscolaBonus: number }): number {
  return outcome.briscolaBonus;
}

describe('i messaggi dicono cosa e successo', () => {
  it('Sbaraglio distingue la strada con cui hai vinto', () => {
    expect(victoryHeadline(check('sbaraglio', 10000, 20), 20)).toMatch(/Target/);
    expect(victoryHeadline(check('sbaraglio', 0, 61), 61)).toMatch(/Briscola/);
    expect(victoryHeadline(check('sbaraglio', 10000, 61), 61)).toMatch(/COMPLETA/);
  });

  it('Doppia Sfida dice quale meta e mancata', () => {
    expect(victoryHeadline(check('double_challenge', 10000, 54), 54)).toMatch(/perso la Briscola/);
    expect(victoryHeadline(check('double_challenge', 9000, 68), 68)).toMatch(/non hai raggiunto il target/);
  });

  it('Briscola conta i punti', () => {
    expect(victoryHeadline(check('traditional', 0, 67), 67)).toMatch(/67 punti/);
  });
});

describe('il round arriva sempre alla sua fine naturale', () => {
  it('isRoundFinished non sa nulla di punteggio ne di modalita', () => {
    // The signature is the guarantee: only cards decide when a round is over,
    // so passing the target at trick four cannot cut the Briscola short.
    const deal = prepareRoundDeck(createStandardDeck());
    expect(isRoundFinished(deal.playerHand, deal.opponentHand, deal.roundDrawPile, deal.trumpCard)).toBe(
      false
    );
    expect(isRoundFinished([], [], [], null)).toBe(true);
    expect(isRoundFinished.length).toBe(4);
  });

  it('una mano intera gioca sempre venti prese, in qualunque modalita', () => {
    // The cards do not know what is being played for, which is exactly why one
    // set of playthroughs can be judged by all four sets of rules.
    let playerHand = [] as ReturnType<typeof prepareRoundDeck>['playerHand'];
    const deal = prepareRoundDeck(createStandardDeck());
    playerHand = deal.playerHand;
    let opponentHand = deal.opponentHand;
    let pile = deal.roundDrawPile;
    let trump = deal.trumpCard as typeof deal.trumpCard | null;
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
      expect(tricks).toBeLessThan(25);
    }
    expect(tricks + playerHand.length).toBe(20);
  });
});
