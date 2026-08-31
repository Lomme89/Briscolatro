import { describe, expect, it, beforeEach } from 'vitest';
import { PlayingCard } from '../types/game';
import { ALL_DECKS } from '../data/decks';
import { ALL_JOKERS } from '../data/jokers';
import { ALL_UNO_CARDS, ALL_VOUCHERS } from '../data/unoCards';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { createRunDeck, drawNextTrickCards, prepareRoundDeck } from './gameState';
import { resolveTrick } from './briscola';
import { instantiateJoker, instantiateUnoCard } from './itemInstances';
import {
  clearRunSnapshot,
  loadRunSnapshot,
  restoreRun,
  RunSnapshotInput,
  RunSnapshotV1,
  saveRunSnapshot,
  serializeRun,
  validateRunSnapshot,
} from './runPersistence';
import { getRunRngState, randomRun, seedRunRng, setRunRngState } from './runRng';
import { getNextConsumableExpansion, getNextJokerExpansion } from './slotExpansions';
import { endlessBossForAnte, getActiveBossRules } from './endlessBosses';

/** The tests run in node: localStorage has to exist before they touch it. */
function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  } as Storage;
}

const deck = ALL_DECKS[0];

function buildInput(overrides: Partial<RunSnapshotInput> = {}): RunSnapshotInput {
  seedRunRng(1234);
  const runDeck = createRunDeck(deck);
  const dealt = prepareRoundDeck(runDeck);

  const joker = instantiateJoker(ALL_JOKERS[0], 'joker_fixed_1');
  joker.stats = { timesTriggered: 7, accumulatedMult: 42, accumulatedChips: 900 };

  return {
    phase: 'playing',
    deck,
    victoryMode: 'sbaraglio',
    ante: 3,
    round: 2,
    money: 17,
    totalScore: 5400,
    totalTricksWon: 21,
    totalTricksLost: 9,
    totalBriscolaPointsPlayer: 140,
    totalBriscolaPointsOpponent: 100,
    totalMoneyEarned: 60,
    bossesDefeated: 2,
    maxJokers: 6,
    maxConsumables: 3,
    runDeck,
    activeJokers: [joker],
    consumables: [instantiateUnoCard(ALL_UNO_CARDS[0], 'sola_fixed_1')],
    vouchers: [{ ...ALL_VOUCHERS[0], bought: true }],
    rng: getRunRngState(),
    shop: null,
    encounter: {
      playerHand: dealt.playerHand,
      opponentHand: dealt.opponentHand,
      drawPile: dealt.roundDrawPile,
      trumpCard: dealt.trumpCard,
      briscolaSuit: dealt.briscolaSuit,
      targetScore: 4000,
      currentRoundScore: 1200,
      roundPointsTaken: 33,
      opponentPointsTaken: 12,
      roundTricksWon: 4,
      roundTricksLost: 2,
      tricksPlayedInRound: 6,
      capturedDenariRanks: new Set([1, 10]),
      consecutiveWinStreak: 2,
      discardsLeft: 1,
      isPlayerTurn: true,
      boss: ALL_BOSS_BLINDS[0],
      bossDebuffNeutralized: false,
      bossShieldTricks: 0,
      lastWinningSuit: 'coppe',
      playedCards: [],
    },
    ...overrides,
  };
}

function roundTrip(snapshot: RunSnapshotV1) {
  return restoreRun(JSON.stringify(snapshot));
}

beforeEach(() => {
  installLocalStorage();
  clearRunSnapshot();
});

describe('Endless attraverso il salvataggio', () => {
  it('conserva la fase della run e il Boss composto, senza ri-tirarlo', () => {
    const endlessBoss = endlessBossForAnte(35, 2024).boss;
    expect(endlessBoss.endless!.modifierIds.length).toBeGreaterThan(0);

    const input = buildInput({ runPhase: 'endless', ante: 35 });
    input.encounter!.boss = endlessBoss;
    const restored = roundTrip(serializeRun(input))!;

    expect(restored.snapshot.runPhase).toBe('endless');
    expect(restored.snapshot.ante).toBe(35);
    // Stesso Boss di base, stessi modificatori, stesse regole in vigore.
    expect(restored.boss!.id).toBe(endlessBoss.id);
    expect(restored.boss!.endless).toEqual(endlessBoss.endless);
    expect(getActiveBossRules(restored.boss)).toEqual(getActiveBossRules(endlessBoss));
    expect(restored.boss!.debuffDescription).toBe(endlessBoss.debuffDescription);
  });

  it('un salvataggio pre-Endless vale ancora e vale come campagna', () => {
    const snapshot = serializeRun(buildInput()) as unknown as Record<string, unknown>;
    delete snapshot.runPhase;
    expect(validateRunSnapshot(snapshot).valid).toBe(true);
    const restored = roundTrip(snapshot as unknown as RunSnapshotV1)!;
    expect(restored.snapshot.runPhase ?? 'campaign').toBe('campaign');
  });

  it('rifiuta una fase della run inventata', () => {
    const snapshot = serializeRun(buildInput()) as unknown as Record<string, unknown>;
    snapshot.runPhase = 'ascension';
    expect(validateRunSnapshot(snapshot).valid).toBe(false);
  });

  it("un Boss di campagna non porta con se modificatori Endless", () => {
    const restored = roundTrip(serializeRun(buildInput()))!;
    expect(restored.boss!.endless).toBeUndefined();
    expect(getActiveBossRules(restored.boss)).toHaveLength(1);
  });
});

describe('serialize -> parse -> validate -> restore', () => {
  it('keeps every run value it was given', () => {
    const input = buildInput();
    const snapshot = serializeRun(input);
    const restored = roundTrip(snapshot);

    expect(restored).not.toBeNull();
    const back = restored!.snapshot;
    expect(back.schemaVersion).toBe(1);
    expect(back.ante).toBe(3);
    expect(back.round).toBe(2);
    expect(back.victoryMode).toBe('sbaraglio');
    expect(restored!.deck.id).toBe(deck.id);
    expect(back.totalScore).toBe(5400);
    expect(back.totalTricksWon).toBe(21);
    expect(back.bossesDefeated).toBe(2);
    expect(restored!.boss?.id).toBe(ALL_BOSS_BLINDS[0].id);
  });

  it('keeps money, slots and vouchers', () => {
    const restored = roundTrip(serializeRun(buildInput()))!;
    expect(restored.snapshot.money).toBe(17);
    expect(restored.snapshot.maxJokers).toBe(6);
    expect(restored.snapshot.maxConsumables).toBe(3);
    expect(restored.snapshot.vouchers).toHaveLength(1);
    expect(restored.snapshot.vouchers[0].bought).toBe(true);
  });

  it('restores the slot caps themselves, not the size of what is in them', () => {
    // Un Jolly posseduto su sei slot: il livello deve venire dal cap salvato,
    // altrimenti al ricaricamento il negozio rivende scalini gia' pagati.
    const restored = roundTrip(serializeRun(buildInput()))!;
    expect(restored.snapshot.activeJokers).toHaveLength(1);
    expect(restored.snapshot.maxJokers).toBe(6);
    expect(restored.snapshot.consumables).toHaveLength(1);
    expect(restored.snapshot.maxConsumables).toBe(3);

    // Il negozio riaperto offre lo scalino giusto per quei cap.
    const context = { hasTavoloAllargato: false, hasHouseDiscount: false };
    expect(getNextJokerExpansion(restored.snapshot.maxJokers, context)).toMatchObject({
      fromSlots: 6,
      toSlots: 7,
      cost: 24,
    });
    expect(getNextConsumableExpansion(restored.snapshot.maxConsumables, context)).toMatchObject({
      fromSlots: 3,
      toSlots: 4,
      cost: 14,
    });
  });

  it('keeps joker instance ids and accumulated stats', () => {
    const restored = roundTrip(serializeRun(buildInput()))!;
    const joker = restored.snapshot.activeJokers[0];
    expect(joker.id).toBe(ALL_JOKERS[0].id);
    expect(joker.instanceId).toBe('joker_fixed_1');
    expect(joker.stats).toEqual({ timesTriggered: 7, accumulatedMult: 42, accumulatedChips: 900 });
    expect(restored.snapshot.consumables[0].instanceId).toBe('sola_fixed_1');
    expect(restored.snapshot.consumables[0].definitionId).toBe(ALL_UNO_CARDS[0].id);
  });

  it('keeps modified cards in the run deck', () => {
    const input = buildInput();
    const target = input.runDeck[5];
    input.runDeck = input.runDeck.map((card) =>
      card.id === target.id
        ? { ...card, edition: 'polychrome' as const, seal: 'blue' as const, special: 'vetro' as const }
        : card
    );

    const restored = roundTrip(serializeRun(input))!;
    const back = restored.snapshot.runDeck.find((card) => card.id === target.id)!;
    expect(back.edition).toBe('polychrome');
    expect(back.seal).toBe('blue');
    expect(back.special).toBe('vetro');
  });

  it('keeps the encounter as forty distinct cards', () => {
    const restored = roundTrip(serializeRun(buildInput()))!;
    const encounter = restored.snapshot.encounter!;
    const all = [
      ...encounter.playerHand,
      ...encounter.opponentHand,
      ...encounter.drawPile,
      ...(encounter.trumpCard ? [encounter.trumpCard] : []),
    ];
    expect(all).toHaveLength(40);
    expect(new Set(all.map((card) => card.id)).size).toBe(40);
    expect(new Set(all.map((card) => `${card.suit}_${card.rank}`)).size).toBe(40);
  });
});

describe('rejection', () => {
  it('refuses a corrupted payload', () => {
    expect(restoreRun('{ not json')).toBeNull();
    expect(restoreRun('null')).toBeNull();
    expect(restoreRun('[]')).toBeNull();
    expect(restoreRun(null)).toBeNull();
  });

  it('refuses an unknown schema version', () => {
    const snapshot = serializeRun(buildInput());
    const bumped = { ...snapshot, schemaVersion: 2 };
    expect(validateRunSnapshot(bumped).valid).toBe(false);
    expect(restoreRun(JSON.stringify(bumped))).toBeNull();
  });

  it('refuses a corrupted run deck', () => {
    const snapshot = serializeRun(buildInput());
    const duplicated: PlayingCard[] = [...snapshot.runDeck];
    duplicated[1] = { ...duplicated[0], id: 'clone' };
    const broken = { ...snapshot, runDeck: duplicated };

    const verdict = validateRunSnapshot(broken);
    expect(verdict.valid).toBe(false);
    expect(verdict.problems[0]).toContain('mazzo della run');
    expect(restoreRun(JSON.stringify(broken))).toBeNull();
  });

  it('refuses an unknown deck, mode, joker, sola or boss', () => {
    const snapshot = serializeRun(buildInput());
    expect(validateRunSnapshot({ ...snapshot, deckId: 'deck_inesistente' }).valid).toBe(false);
    expect(validateRunSnapshot({ ...snapshot, victoryMode: 'roulette' }).valid).toBe(false);
    expect(
      validateRunSnapshot({ ...snapshot, activeJokers: [{ ...snapshot.activeJokers[0], id: 'j_fantasma' }] }).valid
    ).toBe(false);
    expect(
      validateRunSnapshot({
        ...snapshot,
        consumables: [{ ...snapshot.consumables[0], id: 'uno_fantasma', definitionId: 'uno_fantasma' }],
      }).valid
    ).toBe(false);
    expect(
      validateRunSnapshot({
        ...snapshot,
        encounter: { ...snapshot.encounter!, bossId: 'boss_fantasma' },
      }).valid
    ).toBe(false);
  });

  it('refuses negative or non finite numbers and impossible slots', () => {
    const snapshot = serializeRun(buildInput());
    expect(validateRunSnapshot({ ...snapshot, money: -3 }).valid).toBe(false);
    expect(validateRunSnapshot({ ...snapshot, totalScore: Number.NaN }).valid).toBe(false);
    expect(validateRunSnapshot({ ...snapshot, maxJokers: 0 }).valid).toBe(false);
    expect(validateRunSnapshot({ ...snapshot, maxConsumables: 0 }).valid).toBe(false);
  });

  it('refuses a playing snapshot with no encounter, and a table with a duplicated card', () => {
    const snapshot = serializeRun(buildInput());
    expect(validateRunSnapshot({ ...snapshot, encounter: null }).valid).toBe(false);

    const encounter = snapshot.encounter!;
    const doubled = {
      ...encounter,
      playerHand: [...encounter.playerHand, { ...encounter.opponentHand[0] }],
      opponentHand: [...encounter.opponentHand, { ...encounter.opponentHand[1] }],
    };
    expect(validateRunSnapshot({ ...snapshot, encounter: doubled }).valid).toBe(false);
  });

  it('deletes an invalid snapshot instead of handing it back', () => {
    localStorage.setItem('briscolatro_run_v1', '{"schemaVersion":99}');
    expect(loadRunSnapshot()).toBeNull();
    expect(localStorage.getItem('briscolatro_run_v1')).toBeNull();
  });

  it('stores and reloads a valid snapshot', () => {
    saveRunSnapshot(serializeRun(buildInput()));
    const reloaded = loadRunSnapshot();
    expect(reloaded).not.toBeNull();
    expect(reloaded!.snapshot.ante).toBe(3);
    clearRunSnapshot();
    expect(loadRunSnapshot()).toBeNull();
  });
});

describe('deterministic run RNG', () => {
  it('replays the same future from the same snapshot', () => {
    seedRunRng(99);
    for (let i = 0; i < 25; i++) randomRun();
    const saved = getRunRngState();

    const first = [randomRun(), randomRun(), randomRun()];

    // A reload puts the stream back exactly where the save left it.
    const parsed = JSON.parse(JSON.stringify(saved)) as typeof saved;
    setRunRngState(parsed);
    const second = [randomRun(), randomRun(), randomRun()];

    expect(second).toEqual(first);
  });

  it('travels inside the snapshot', () => {
    seedRunRng(7);
    randomRun();
    randomRun();
    const expected = getRunRngState();
    const snapshot = serializeRun(buildInput({ rng: expected }));

    const restored = roundTrip(snapshot)!;
    expect(restored.snapshot.rng).toEqual(expected);

    setRunRngState(restored.snapshot.rng);
    const afterRestore = randomRun();
    setRunRngState(expected);
    expect(randomRun()).toBe(afterRestore);
  });

  it('gives different runs different streams', () => {
    seedRunRng(1);
    const a = [randomRun(), randomRun()];
    seedRunRng(2);
    const b = [randomRun(), randomRun()];
    expect(b).not.toEqual(a);
  });
});

describe('a save taken after a trick', () => {
  it('never replays that trick', () => {
    seedRunRng(4242);
    const runDeck = createRunDeck(deck);
    const dealt = prepareRoundDeck(runDeck);

    const playerCard = dealt.playerHand[0];
    const oppCard = dealt.opponentHand[0];
    const clash = resolveTrick(playerCard, oppCard, dealt.briscolaSuit, true);

    const afterPlayer = dealt.playerHand.filter((c) => c.id !== playerCard.id);
    const afterOpponent = dealt.opponentHand.filter((c) => c.id !== oppCard.id);
    const drawn = drawNextTrickCards(
      clash.playerWon,
      dealt.roundDrawPile,
      dealt.trumpCard,
      afterPlayer,
      afterOpponent
    );

    const rng = getRunRngState();
    const snapshot = serializeRun(
      buildInput({
        rng,
        runDeck,
        encounter: {
          playerHand: drawn.newPlayerHand,
          opponentHand: drawn.newOpponentHand,
          drawPile: drawn.newDrawPile,
          trumpCard: drawn.newTrumpCard,
          briscolaSuit: dealt.briscolaSuit,
          targetScore: 300,
          currentRoundScore: clash.playerWon ? 120 : 0,
          roundPointsTaken: clash.playerWon ? clash.rawPoints : 0,
          opponentPointsTaken: clash.playerWon ? 0 : clash.rawPoints,
          roundTricksWon: clash.playerWon ? 1 : 0,
          roundTricksLost: clash.playerWon ? 0 : 1,
          tricksPlayedInRound: 1,
          capturedDenariRanks: new Set<number>(),
          consecutiveWinStreak: clash.playerWon ? 1 : 0,
          discardsLeft: 1,
          isPlayerTurn: clash.playerWon,
          boss: null,
          bossDebuffNeutralized: false,
          bossShieldTricks: 0,
          lastWinningSuit: clash.playerWon ? playerCard.suit : null,
          playedCards: [playerCard, oppCard],
        },
      })
    );

    const restored = roundTrip(snapshot)!;
    const encounter = restored.snapshot.encounter!;

    // The two cards of the resolved trick are gone from both hands and from the
    // stock: there is nothing left on the table to re-resolve.
    const onTable = [
      ...encounter.playerHand,
      ...encounter.opponentHand,
      ...encounter.drawPile,
      ...(encounter.trumpCard ? [encounter.trumpCard] : []),
    ].map((card) => card.id);
    expect(onTable).not.toContain(playerCard.id);
    expect(onTable).not.toContain(oppCard.id);
    expect(onTable).toHaveLength(38);
    expect(new Set(onTable).size).toBe(38);

    expect(encounter.tricksPlayedInRound).toBe(1);
    expect(encounter.roundTricksWon + encounter.roundTricksLost).toBe(1);
    // The opponent's memory of the round comes back rebuilt from the run deck.
    expect(restored.playedCards.map((c) => c.id).sort()).toEqual([playerCard.id, oppCard.id].sort());
  });

  it('carries on into the next trick from the restored position', () => {
    seedRunRng(555);
    const runDeck = createRunDeck(deck);
    const dealt = prepareRoundDeck(runDeck);
    const rng = getRunRngState();
    const snapshot = serializeRun(
      buildInput({
        rng,
        runDeck,
        encounter: {
          playerHand: dealt.playerHand,
          opponentHand: dealt.opponentHand,
          drawPile: dealt.roundDrawPile,
          trumpCard: dealt.trumpCard,
          briscolaSuit: dealt.briscolaSuit,
          targetScore: 300,
          currentRoundScore: 0,
          roundPointsTaken: 0,
          opponentPointsTaken: 0,
          roundTricksWon: 0,
          roundTricksLost: 0,
          tricksPlayedInRound: 0,
          capturedDenariRanks: new Set<number>(),
          consecutiveWinStreak: 0,
          discardsLeft: 1,
          isPlayerTurn: true,
          boss: null,
          bossDebuffNeutralized: false,
          bossShieldTricks: 0,
          lastWinningSuit: null,
          playedCards: [],
        },
      })
    );

    const restored = roundTrip(snapshot)!;
    const encounter = restored.snapshot.encounter!;
    setRunRngState(restored.snapshot.rng);

    const playerCard = encounter.playerHand[0];
    const oppCard = encounter.opponentHand[0];
    const clash = resolveTrick(playerCard, oppCard, encounter.briscolaSuit, true);
    const drawn = drawNextTrickCards(
      clash.playerWon,
      encounter.drawPile,
      encounter.trumpCard,
      encounter.playerHand.filter((c) => c.id !== playerCard.id),
      encounter.opponentHand.filter((c) => c.id !== oppCard.id)
    );

    expect(drawn.newPlayerHand).toHaveLength(3);
    expect(drawn.newOpponentHand).toHaveLength(3);
    const stillInPlay = [
      ...drawn.newPlayerHand,
      ...drawn.newOpponentHand,
      ...drawn.newDrawPile,
      ...(drawn.newTrumpCard ? [drawn.newTrumpCard] : []),
    ];
    expect(stillInPlay).toHaveLength(38);
    expect(new Set(stillInPlay.map((c) => c.id)).size).toBe(38);
  });
});

describe('cio che il negozio e la vittoria si portano dietro', () => {
  beforeEach(() => {
    installLocalStorage();
    clearRunSnapshot();
  });

  it('il Conto Sospeso gia pagato sopravvive al ricaricamento', () => {
    const snapshot = serializeRun(
      buildInput({
        phase: 'shop',
        encounter: null,
        shop: {
          seed: 99,
          rerolls: 1,
          boughtKeys: ['joker:il_conte'],
          spent: 12,
          contoSospesoPaidIds: ['joker_fixed_1'],
        },
      })
    );
    saveRunSnapshot(snapshot);

    const restored = loadRunSnapshot();
    expect(restored).not.toBeNull();
    expect(restored!.snapshot.shop?.spent).toBe(12);
    expect(restored!.snapshot.shop?.contoSospesoPaidIds).toEqual(['joker_fixed_1']);
  });

  it('un vecchio salvataggio senza i campi del negozio resta valido', () => {
    const snapshot = serializeRun(
      buildInput({ phase: 'shop', encounter: null, shop: { seed: 5, rerolls: 0, boughtKeys: [] } })
    ) as RunSnapshotV1 & { shop: Record<string, unknown> | null };
    delete snapshot.shop!.spent;
    delete snapshot.shop!.contoSospesoPaidIds;
    expect(validateRunSnapshot(snapshot).valid).toBe(true);
  });

  it('la run lasciata sull offerta Endless torna alla domanda, non al Boss', () => {
    const snapshot = serializeRun(
      buildInput({
        phase: 'blind_select',
        ante: 8,
        encounter: null,
        shop: null,
        pendingVictory: { won: true, ante: 8, campaignVictory: true } as never,
      })
    );
    saveRunSnapshot(snapshot);

    const restored = loadRunSnapshot();
    expect(restored!.snapshot.pendingVictory).toMatchObject({ won: true, ante: 8 });
    expect(restored!.snapshot.encounter).toBeNull();
  });

  it('una vittoria salvata che non e un oggetto invalida lo snapshot', () => {
    const snapshot = serializeRun(buildInput({ phase: 'blind_select', encounter: null })) as RunSnapshotV1;
    (snapshot as unknown as Record<string, unknown>).pendingVictory = 'vinto';
    expect(validateRunSnapshot(snapshot).valid).toBe(false);
  });
});
