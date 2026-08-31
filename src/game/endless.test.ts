import { describe, expect, it } from 'vitest';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { ALL_DECKS } from '../data/decks';
import { BossBlind } from '../types/game';
import { BOSS_RULES } from './bossRules';
import {
  CAMPAIGN_FINAL_ANTE,
  CONSUMABLE_CAP,
  ENDLESS_MAX_TARGET_MULTIPLIER,
  ENDLESS_TIERS,
  getEndlessTargetMultiplier,
  getEndlessTier,
  getSlotRulesForAnte,
  isEndlessAnte,
} from './endless';
import {
  canCombineModifier,
  composeEndlessBoss,
  endlessBossForAnte,
  ENDLESS_MODIFIERS,
  getActiveBossRules,
  getBossDiscardPenalty,
  getBriscolaRotationPeriod,
  getEndlessModifier,
  getModifierCountForTier,
  isLegalBossComposition,
  restoreEndlessBoss,
} from './endlessBosses';
import {
  ANTE_BASE_TARGETS,
  calculateRoundOutcome,
  ENCOUNTERS_PER_ANTE,
  encounterFor,
  getBlindTargetScore,
  isBossEncounter,
  RoundStateSnapshot,
} from './gameState';
import { getNextJokerExpansion } from './slotExpansions';
import { createRunRng } from './runRng';

const NO_VOUCHERS = { hasTavoloAllargato: false, hasHouseDiscount: false };

describe('confini dei tier', () => {
  it('la campagna non ha tier', () => {
    for (let ante = 1; ante <= CAMPAIGN_FINAL_ANTE; ante++) {
      expect(isEndlessAnte(ante)).toBe(false);
      expect(getEndlessTier(ante)).toBeNull();
    }
  });

  it('assegna ogni Ante Endless al tier giusto, agli estremi', () => {
    const expected: Array<[number, string]> = [
      [9, 'ASCESO'],
      [16, 'ASCESO'],
      [17, 'SOVRACCARICO'],
      [24, 'SOVRACCARICO'],
      [25, 'ULTRA-ISTINTO'],
      [32, 'ULTRA-ISTINTO'],
      [33, 'TRASCENDENTE'],
      [40, 'TRASCENDENTE'],
      [41, 'FUORI SCALA'],
      [500, 'FUORI SCALA'],
    ];
    for (const [ante, name] of expected) {
      expect(getEndlessTier(ante)!.name).toBe(name);
    }
  });

  it('i tier coprono ogni Ante senza buchi ne\' sovrapposizioni', () => {
    for (let index = 1; index < ENDLESS_TIERS.length; index++) {
      expect(ENDLESS_TIERS[index].fromAnte).toBe(ENDLESS_TIERS[index - 1].toAnte! + 1);
    }
    expect(ENDLESS_TIERS[0].fromAnte).toBe(CAMPAIGN_FINAL_ANTE + 1);
    expect(ENDLESS_TIERS[ENDLESS_TIERS.length - 1].toAnte).toBeNull();
  });
});

describe('curva dei target', () => {
  it('non tocca la campagna: Ante 1-8 restano i numeri misurati', () => {
    for (let ante = 1; ante <= CAMPAIGN_FINAL_ANTE; ante++) {
      expect(getEndlessTargetMultiplier(ante)).toBe(1);
      // Tavolo = 1.25 del base, Boss = 2.0. Esattamente come prima.
      expect(getBlindTargetScore(ante, 1)).toBe(Math.round(ANTE_BASE_TARGETS[ante - 1] * 1.25));
      expect(getBlindTargetScore(ante, 2)).toBe(Math.round(ANTE_BASE_TARGETS[ante - 1] * 2));
    }
  });

  it('riparte in continuita\' da Ante 8', () => {
    expect(getEndlessTargetMultiplier(8)).toBe(1);
    // Un solo passo di ASCESO sopra l'ultimo Ante di campagna.
    expect(getEndlessTargetMultiplier(9)).toBeCloseTo(1.55, 6);
    expect(getBlindTargetScore(9, 2)).toBeGreaterThan(getBlindTargetScore(8, 2));
  });

  it('accelera per tier', () => {
    const step = (ante: number) =>
      getEndlessTargetMultiplier(ante) / getEndlessTargetMultiplier(ante - 1);
    expect(step(10)).toBeCloseTo(1.55, 6); // ASCESO
    expect(step(18)).toBeCloseTo(1.75, 6); // SOVRACCARICO
    expect(step(26)).toBeCloseTo(1.95, 6); // ULTRA-ISTINTO
    expect(step(34)).toBeCloseTo(2.15, 6); // TRASCENDENTE
    expect(step(42)).toBeCloseTo(2.35, 6); // FUORI SCALA
    // Monotona: ogni tier e' piu' ripido del precedente.
    expect(step(18)).toBeGreaterThan(step(10));
    expect(step(26)).toBeGreaterThan(step(18));
    expect(step(34)).toBeGreaterThan(step(26));
    expect(step(42)).toBeGreaterThan(step(34));
  });

  it('resta finita e crescente fino ad Ante 100 e oltre', () => {
    const probes = [8, 9, 16, 17, 24, 25, 32, 33, 40, 41, 50, 100, 300, 1000];
    let previous = 0;
    for (const ante of probes) {
      const target = getBlindTargetScore(ante, 2);
      expect(Number.isFinite(target)).toBe(true);
      expect(target).toBeGreaterThan(0);
      expect(target).toBeGreaterThanOrEqual(previous);
      previous = target;
    }
  });

  it('il tetto impedisce l\'overflow senza mai diventare Infinity', () => {
    expect(getEndlessTargetMultiplier(10000)).toBe(ENDLESS_MAX_TARGET_MULTIPLIER);
    expect(Number.isFinite(getBlindTargetScore(10000, 2))).toBe(true);
  });
});

describe('macroloop Endless', () => {
  it('resta a due incontri per Ante, Tavolo e poi Boss', () => {
    expect(ENCOUNTERS_PER_ANTE).toBe(2);
    for (const ante of [9, 17, 25, 33, 41]) {
      expect(encounterFor(1)).toBe('table');
      expect(encounterFor(2)).toBe('boss');
      expect(isBossEncounter(1)).toBe(false);
      expect(isBossEncounter(2)).toBe(true);
      // Il target esiste per entrambi gli incontri dell'Ante.
      expect(getBlindTargetScore(ante, 1)).toBeGreaterThan(0);
      expect(getBlindTargetScore(ante, 2)).toBeGreaterThan(getBlindTargetScore(ante, 1));
    }
  });
});

describe('cap degli slot per tier', () => {
  it('sale 7 -> 8 -> 9 -> 10 e mai oltre', () => {
    expect(getSlotRulesForAnte(8).jokerCap).toBe(7);
    expect(getSlotRulesForAnte(9).jokerCap).toBe(8);
    expect(getSlotRulesForAnte(16).jokerCap).toBe(8);
    expect(getSlotRulesForAnte(17).jokerCap).toBe(9);
    expect(getSlotRulesForAnte(32).jokerCap).toBe(9);
    expect(getSlotRulesForAnte(33).jokerCap).toBe(10);
    expect(getSlotRulesForAnte(41).jokerCap).toBe(10);
    expect(getSlotRulesForAnte(999).jokerCap).toBe(10);
  });

  it('le Carte Sola restano a 4 a ogni Ante', () => {
    for (const ante of [1, 8, 9, 17, 25, 33, 41, 100]) {
      expect(getSlotRulesForAnte(ante).consumableCap).toBe(CONSUMABLE_CAP);
    }
  });

  it('il cap piu\' alto apre un\'espansione acquistabile, non regala lo slot', () => {
    // Al cap di campagna con 7 slot non c'e' nulla da comprare...
    expect(getNextJokerExpansion(7, NO_VOUCHERS, getSlotRulesForAnte(8))).toBeNull();
    // ...ad ASCESO lo stesso giocatore trova lo scalino sullo scaffale.
    expect(getNextJokerExpansion(7, NO_VOUCHERS, getSlotRulesForAnte(9))).toMatchObject({
      fromSlots: 7,
      toSlots: 8,
      cost: 40,
    });
    expect(getNextJokerExpansion(8, NO_VOUCHERS, getSlotRulesForAnte(17))).toMatchObject({
      toSlots: 9,
      cost: 64,
    });
    expect(getNextJokerExpansion(9, NO_VOUCHERS, getSlotRulesForAnte(33))).toMatchObject({
      toSlots: 10,
      cost: 96,
    });
    expect(getNextJokerExpansion(10, NO_VOUCHERS, getSlotRulesForAnte(41))).toBeNull();
  });
});

describe('Boss Endless', () => {
  it('sono deterministici nel seed e nell\'Ante', () => {
    for (const ante of [9, 17, 25, 33, 41]) {
      const first = endlessBossForAnte(ante, 4242);
      const second = endlessBossForAnte(ante, 4242);
      expect(second.boss.id).toBe(first.boss.id);
      expect(second.boss.endless!.modifierIds).toEqual(first.boss.endless!.modifierIds);
    }
  });

  it('seed diversi producono tavoli diversi', () => {
    const signature = (seed: number) =>
      [9, 17, 25, 33, 41]
        .map((ante) => {
          const roll = endlessBossForAnte(ante, seed);
          return `${roll.boss.id}:${roll.boss.endless!.modifierIds.join(',')}`;
        })
        .join('|');
    expect(signature(1)).not.toBe(signature(2));
  });

  it('non consumano lo stream della run: la preview e\' l\'incontro', () => {
    const stream = createRunRng(777);
    stream.random();
    // Derivare il Boss (due volte, come fanno BlindSelect e startEncounter)
    // non deve toccare il generatore della run.
    endlessBossForAnte(19, 777);
    endlessBossForAnte(19, 777);
    const after = stream.random();

    const untouched = createRunRng(777);
    untouched.random();
    expect(after).toBe(untouched.random());
  });

  it('ogni tier applica il numero di modificatori dichiarato', () => {
    const cases: Array<[number, number]> = [
      [9, 1],
      [17, 1],
      [25, 1],
      [33, 2],
      [41, 2],
    ];
    for (const [ante, expected] of cases) {
      expect(getModifierCountForTier(getEndlessTier(ante)!.id)).toBe(expected);
      for (let seed = 1; seed <= 40; seed++) {
        expect(endlessBossForAnte(ante, seed).modifiers).toHaveLength(expected);
      }
    }
  });

  it('riusa il pool di Boss esistente senza inventarne di nuovi', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const roll = endlessBossForAnte(37, seed);
      expect(ALL_BOSS_BLINDS.some((boss) => boss.id === roll.boss.id)).toBe(true);
    }
  });

  it('scrive tutte le regole attive nella descrizione della blind', () => {
    const roll = endlessBossForAnte(33, 11);
    for (const modifier of roll.modifiers) {
      expect(roll.boss.debuffDescription).toContain(modifier.name);
    }
    const base = ALL_BOSS_BLINDS.find((boss) => boss.id === roll.boss.id)!;
    expect(roll.boss.debuffDescription).toContain(base.debuffDescription);
  });
});

describe('compatibilita\' dei modificatori', () => {
  it('nessuna composizione generata e\' illegale, su tutto lo spazio dei seed', () => {
    for (const ante of [9, 17, 25, 33, 41, 77]) {
      for (let seed = 1; seed <= 150; seed++) {
        const { boss } = endlessBossForAnte(ante, seed);
        expect(isLegalBossComposition(boss)).toBe(true);
      }
    }
  });

  it('non mette mai due restrizioni di apertura sullo stesso Boss', () => {
    // Riaprire di Denari mentre i Denari non possono aprire e' una mano senza
    // carte legali: la partita si fermerebbe.
    const pedaggio = getEndlessModifier('mod_pedaggio')!;
    const bancoChiuso = getEndlessModifier('mod_banco_chiuso')!;
    const neutral = ALL_BOSS_BLINDS.find((boss) => boss.debuffType === 'no_lisce_chips')!;
    expect(canCombineModifier(pedaggio, neutral, [])).toBe(true);
    expect(canCombineModifier(bancoChiuso, neutral, [pedaggio])).toBe(false);
  });

  it('non riscrive il seme in due modi contemporaneamente', () => {
    const mescolo = getEndlessModifier('mod_mescolo')!;
    const lame = getEndlessModifier('mod_lame')!;
    const neutral = ALL_BOSS_BLINDS.find((boss) => boss.debuffType === 'no_lisce_chips')!;
    expect(canCombineModifier(lame, neutral, [mescolo])).toBe(false);
    // E nemmeno con la regola di base del Boss.
    const conte = ALL_BOSS_BLINDS.find((boss) => boss.debuffType === 'spades_are_briscola')!;
    expect(canCombineModifier(mescolo, conte, [])).toBe(false);
  });

  it('non duplica la regola che il Boss ha gia\'', () => {
    for (const boss of ALL_BOSS_BLINDS) {
      const duplicate = ENDLESS_MODIFIERS.find((modifier) =>
        modifier.grants.includes(boss.debuffType)
      );
      if (duplicate) expect(canCombineModifier(duplicate, boss, [])).toBe(false);
    }
  });

  it('non impila due volte lo stesso modificatore', () => {
    const maniLegate = getEndlessModifier('mod_mani_legate')!;
    const neutral = ALL_BOSS_BLINDS.find((boss) => boss.debuffType === 'no_lisce_chips')!;
    expect(canCombineModifier(maniLegate, neutral, [maniLegate])).toBe(false);
  });
});

describe('il motore applica le regole composte', () => {
  const neutral = ALL_BOSS_BLINDS.find((boss) => boss.debuffType === 'no_lisce_chips')!;
  const compose = (ids: string[]): BossBlind =>
    composeEndlessBoss(
      neutral,
      ids.map((id) => getEndlessModifier(id)!),
      'trascendente'
    );

  it('un Boss di campagna espone una sola regola', () => {
    expect(getActiveBossRules(neutral)).toEqual(['no_lisce_chips']);
    expect(getActiveBossRules(null)).toEqual([]);
  });

  it('un Boss Endless espone la sua regola piu\' quelle dei modificatori', () => {
    const boss = compose(['mod_pedaggio', 'mod_carichi_dimezzati']);
    expect(getActiveBossRules(boss).sort()).toEqual(
      ['forced_suit_chain', 'half_carichi', 'no_lisce_chips'].sort()
    );
  });

  it('le regole aggiunte sono davvero applicate dal motore', () => {
    const boss = compose(['mod_banco_chiuso']);
    const hand = [
      { suit: 'denari', rank: 1 },
      { suit: 'coppe', rank: 4 },
    ] as never[];
    const denaro = { suit: 'denari', rank: 1 } as never;
    expect(BOSS_RULES.canPlayerLeadCard(denaro, neutral, hand, null).allowed).toBe(true);
    expect(BOSS_RULES.canPlayerLeadCard(denaro, boss, hand, null).allowed).toBe(false);
  });

  it('Mescolo Stretto accorcia il periodo di rotazione', () => {
    const normale = compose(['mod_mescolo']);
    const stretto = compose(['mod_mescolo_stretto']);
    expect(getBriscolaRotationPeriod(neutral)).toBe(3);
    expect(getBriscolaRotationPeriod(normale)).toBe(3);
    expect(getBriscolaRotationPeriod(stretto)).toBe(2);
    expect(BOSS_RULES.shouldRotateBriscola(2, normale)).toBe(false);
    expect(BOSS_RULES.shouldRotateBriscola(3, normale)).toBe(true);
    expect(BOSS_RULES.shouldRotateBriscola(2, stretto)).toBe(true);
    expect(BOSS_RULES.shouldRotateBriscola(4, stretto)).toBe(true);
    expect(BOSS_RULES.shouldRotateBriscola(3, stretto)).toBe(false);
  });

  it('Mani Legate toglie uno Scarto e nient\'altro', () => {
    expect(getBossDiscardPenalty(neutral)).toBe(0);
    expect(getBossDiscardPenalty(compose(['mod_mani_legate']))).toBe(1);
  });

  it('un Boss Endless si ricostruisce identico dai soli id salvati', () => {
    const original = endlessBossForAnte(35, 99).boss;
    const restored = restoreEndlessBoss(
      ALL_BOSS_BLINDS.find((boss) => boss.id === original.id)!,
      original.endless!.modifierIds,
      original.endless!.tierId
    );
    expect(restored.endless).toEqual(original.endless);
    expect(restored.debuffDescription).toBe(original.debuffDescription);
    expect(getActiveBossRules(restored)).toEqual(getActiveBossRules(original));
  });
});

describe('vittoria di campagna e record Endless', () => {
  const snapshot = (overrides: Partial<RoundStateSnapshot>): RoundStateSnapshot =>
    ({
      currentRoundScore: 999999,
      totalScore: 999999,
      roundPointsTaken: 70,
      opponentPointsTaken: 50,
      roundTricksWon: 12,
      roundTricksLost: 8,
      totalTricksWon: 12,
      totalTricksLost: 8,
      totalBriscolaPointsPlayer: 70,
      totalBriscolaPointsOpponent: 50,
      money: 20,
      totalMoneyEarned: 60,
      targetScore: 100,
      ante: 8,
      round: 2,
      vouchers: [],
      bossesDefeated: 7,
      solaCardsUsed: 0,
      victoryMode: 'briscolatro',
      ...overrides,
    }) as RoundStateSnapshot;

  it('registra la vittoria esattamente al Boss di Ante 8', () => {
    const outcome = calculateRoundOutcome(snapshot({}), 0, [...ALL_DECKS.map((d) => d.id)]);
    expect(outcome.won).toBe(true);
    expect(outcome.isAnte8Victory).toBe(true);
  });

  it('non la registra al Tavolo di Ante 8', () => {
    const outcome = calculateRoundOutcome(snapshot({ round: 1 }), 0, []);
    expect(outcome.isAnte8Victory).toBe(false);
  });

  it('non la ri-registra a ogni Boss Endless', () => {
    for (const ante of [9, 17, 25, 33, 41]) {
      const outcome = calculateRoundOutcome(snapshot({ ante }), 0, []);
      expect(outcome.won).toBe(true);
      expect(outcome.isAnte8Victory).toBe(false);
    }
  });

  it('una sconfitta Endless resta una sconfitta di quell\'incontro, non del torneo', () => {
    const outcome = calculateRoundOutcome(
      snapshot({ ante: 23, currentRoundScore: 0, roundPointsTaken: 10, opponentPointsTaken: 110 }),
      0,
      []
    );
    expect(outcome.won).toBe(false);
    expect(outcome.isAnte8Victory).toBe(false);
  });
});
