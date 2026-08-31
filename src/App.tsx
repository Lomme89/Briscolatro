import React, { useState, useRef, useReducer, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  DeckDefinition,
  GamePhase,
  Joker,
  PlayingCard,
  Suit,
  UnoCard,
  Voucher,
  BossBlind,
} from './types/game';
import { ALL_DECKS } from './data/decks';
import { ALL_JOKERS } from './data/jokers';
import { ALL_BOSS_BLINDS } from './data/bosses';
import { ALL_UNO_CARDS, ALL_VOUCHERS } from './data/unoCards';
import {
  createRunDeck,
  upgradeCardInRunDeck,
  clearSpecialInRunDeck,
  assertRunDeckIntegrity,
  foilRandomCardInRunDeck,
  getBlindTargetScore,
  prepareRoundDeck,
  performExchangeDiscard,
  drawNextTrickCards,
  isRoundFinished,
  applyTrickResult,
  calculateRoundOutcome,
  canDiscardCardNow,
  RoundStateSnapshot,
  isBossEncounter,
} from './game/gameState';
import { createCard, resolveTrick } from './game/briscola';
import { chooseOpponentFollow, chooseOpponentLead } from './game/ai';
import { resolveSpecialForTrick, visiblePlayerCards } from './game/specialCards';
import { BOSS_RULES } from './game/bossRules';
import { JOKER_EFFECTS } from './game/jokerEffects';
import { calculateTrickScore, TrickScoreCalculation } from './game/scoring';
import { executeUnoCard } from './game/unoEffects';
import { createBlueSealReward, instantiateJoker, instantiateUnoCard, sameUnoInstance } from './game/itemInstances';
import { trySpendMoney } from './game/shopRules';
import {
  applyTavoloAllargato,
  getNextConsumableExpansion,
  getNextJokerExpansion,
  purchaseSlotExpansion,
} from './game/slotExpansions';
import {
  CAMPAIGN_FINAL_ANTE,
  ENDLESS_TIERS,
  getEndlessTier,
  getSlotRulesForAnte,
  isEndlessAnte,
  RunPhase,
} from './game/endless';
import {
  endlessBossForAnte,
  getBossDiscardPenalty,
  getActiveBossRules,
} from './game/endlessBosses';
import {
  saveRunSnapshot,
  serializeRun,
  ShopSnapshotV1,
} from './game/runPersistence';
import { getRunRngState, randomRun, seedRunRng, setRunRngState } from './game/runRng';
import { musicDissonanceFor, musicIntensityFor, sound } from './services/soundEngine';

import { GameTable } from './components/GameTable';
import { getOpponentIntro } from './data/opponents';
import { getAiProfile } from './game/aiProfiles';
import {
  VICTORY_MODES,
  VictoryMode,
} from './game/victoryModes';
import { readPlayerThreat } from './game/opponentThreat';
import { ShopView } from './components/ShopView';
import { BlindSelectView } from './components/BlindSelectView';
import { ScoreTallyOverlay } from './components/ScoreTallyOverlay';
import { RoundSummaryModal } from './components/RoundSummaryModal';
import { GameOverModal } from './components/GameOverModal';
import { EndlessOfferModal } from './components/EndlessOfferModal';
import { TutorialModal } from './components/TutorialModal';
import { DeckSelectModal } from './components/DeckSelectModal';
import { VictoryModeSelectModal } from './components/VictoryModeSelectModal';
import { DeckViewerModal } from './components/DeckViewerModal';
import { SettingsModal } from './components/SettingsModal';
import { UnoCastOverlay } from './components/UnoCastOverlay';
import { CardChipsProvider } from './context/CardChipsContext';
import { DevDebugDrawer } from './components/DevDebugDrawer';
import { TitleScreen } from './components/TitleScreen';
import { useActionScheduler } from './hooks/useActionScheduler';
import { useGameSettings } from './hooks/useGameSettings';
import { useLatest } from './hooks/useLatest';
import { useMetaProgression } from './hooks/useMetaProgression';
import { usePwaInstall } from './hooks/usePwaInstall';
import { trickFlowReducer } from './game/trickFlow';
import { useAutosaveBoundary } from './hooks/useAutosaveBoundary';
import { GameOverSummaryData, RoundSummaryData } from './types/runSummaries';
import {
  buildCampaignVictorySummary,
  buildDefeatSummary,
  buildRoundSummary,
} from './game/runSummaries';
import {
  RunConfirmation,
  RunConfirmationModal,
} from './components/RunConfirmationModal';
import { useStoredRunSlot } from './hooks/useStoredRunSlot';

function App() {
  const { settings, updateSettings: handleUpdateSettings } = useGameSettings();
  const { isStandalone, promptInstall } = usePwaInstall();
  const {
    unlockedDeckIds,
    setUnlockedDeckIds,
    bossesDefeated,
    setBossesDefeated,
    solaCardsUsed,
    setSolaCardsUsed,
    victoryMode,
    setVictoryMode,
    highScores,
    setHighScores,
    modeWins,
    setModeWins,
    modeBestAnte,
    setModeBestAnte,
    modeBestEndlessAnte,
    setModeBestEndlessAnte,
    highScore,
    setHighScore,
    resetProgress,
  } = useMetaProgression();

  const handleInstallApp = async () => {
    if (!(await promptInstall())) setShowSettings(true);
  };

  const handleResetProgress = () => {
    resetProgress();
    sound.playCardFlick();
  };

  // --- Save / Resume ---
  const { resumableRun, saveNotice, hideStoredRun, clearStoredRun } = useStoredRunSlot();
  /** Which confirmation the title screen is waiting on. */
  const [pendingConfirm, setPendingConfirm] = useState<RunConfirmation | null>(null);

  // --- Run State ---
  const [phase, setPhase] = useState<GamePhase>('title');
  const [selectedDeck, setSelectedDeck] = useState<DeckDefinition>(ALL_DECKS[0]);
  const [ante, setAnte] = useState<number>(1);
  /** 1 = Tavolo, 2 = Boss. Two encounters an Ante, both full games of Briscola. */
  const [round, setRound] = useState<number>(1);
  const [money, setMoney] = useState<number>(4);
  const [discardsLeft, setDiscardsLeft] = useState<number>(1);
  const [targetScore, setTargetScore] = useState<number>(300);
  const [scoreLedger, setScoreLedger] = useState({
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
    totalMoneyEarned: 0,
  });
  const {
    currentRoundScore,
    totalScore,
    roundPointsTaken,
    opponentPointsTaken,
    roundTricksWon,
    roundTricksLost,
    totalTricksWon,
    totalTricksLost,
    totalBriscolaPointsPlayer,
    totalBriscolaPointsOpponent,
    totalMoneyEarned,
  } = scoreLedger;

  // --- Persistent Run Deck & Active Match Cards ---
  const [runDeck, setRunDeck] = useState<PlayingCard[]>([]);
  const [drawPile, setDrawPile] = useState<PlayingCard[]>([]);
  const [briscolaSuit, setBriscolaSuit] = useState<Suit>('denari');
  const [trumpCard, setTrumpCard] = useState<PlayingCard | null>(null);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [opponentHand, setOpponentHand] = useState<PlayingCard[]>([]);
  const [playerTrickCard, setPlayerTrickCard] = useState<PlayingCard | null>(null);
  const [opponentTrickCard, setOpponentTrickCard] = useState<PlayingCard | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  // Who opened the trick on the table: the lead suit decides who wins it.
  const [trickLeadIsPlayer, setTrickLeadIsPlayer] = useState<boolean>(true);
  // True while the opening hand is being dealt, so the table can stagger it.
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [activeBoss, setActiveBoss] = useState<BossBlind | null>(null);
  /**
   * Which half of the run this is.
   *
   * Never derived from `ante > 8` at the call sites: a run sitting on the
   * Ante 8 victory screen has not chosen yet, and the two states have to be
   * distinguishable. Everything Endless reads this or the helpers in
   * `game/endless.ts`.
   */
  const [runPhase, setRunPhase] = useState<RunPhase>('campaign');
  /** The tournament has been won in this run, whatever happens from here. */
  const [campaignVictory, setCampaignVictory] = useState<boolean>(false);
  /** The Ante 8 Boss is down and the player has not yet said stop or double. */
  const [endlessOffer, setEndlessOffer] = useState<GameOverSummaryData | null>(null);
  // The round the blind-select screen is announcing, dealt only once you sit down.
  const [pendingRound, setPendingRound] = useState<{
    ante: number;
    round: number;
    deck: DeckDefinition;
    runDeck: PlayingCard[];
  } | null>(null);
  const [opponentSpeech, setOpponentSpeech] = useState<string>('Che vinca il migliore al tavolo!');

  // --- Jokers, Consumables & Vouchers ---
  const [activeJokers, setActiveJokers] = useState<Joker[]>([]);
  const [consumables, setConsumables] = useState<UnoCard[]>([]);
  // The consumable currently taking the middle of the screen, effect pending.
  const [castingUno, setCastingUno] = useState<{
    unoCard: UnoCard;
    targetCard?: PlayingCard;
    chosenSuit?: Suit;
  } | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [maxJokers, setMaxJokers] = useState<number>(5);
  const [maxConsumables, setMaxConsumables] = useState<number>(2);
  /**
   * The shop shelf, as its derivation rather than its result.
   *
   * The shelf itself lives in ShopView, rebuilt from these numbers every time
   * it mounts, so re-entering a saved shop shows the same three jolly instead
   * of rerolling them for free.
   */
  const [shopState, setShopState] = useState<ShopSnapshotV1 | null>(null);
  const [triggeringJokerId, setTriggeringJokerId] = useState<string | null>(null);
  // Transaction guards read and update these synchronously; React state alone
  // can be one render behind during a rapid double tap.
  const moneyRef = useLatest(money);
  const activeJokersRef = useLatest(activeJokers);
  const consumablesRef = useLatest(consumables);
  const vouchersRef = useLatest(vouchers);

  // --- Trick State Machine & Scoring ---
  const [trickPhase, dispatchTrickFlow] = useReducer(trickFlowReducer, 'idle');
  const [disabledJokerIndex, setDisabledJokerIndex] = useState<number | null>(null);
  // Transient rule switches are read only by delayed game callbacks. Keeping
  // them in React state caused renders without changing anything on screen.
  const activeUnoMultiplierRef = useRef<number>(1.0);
  const isReverseActiveRef = useRef<boolean>(false);
  const [bossDebuffNeutralized, setBossDebuffNeutralized] = useState<boolean>(false);
  const [tricksPlayedInRound, setTricksPlayedInRound] = useState<number>(0);
  /**
   * Every card that has been face-up on this table this round, both sides.
   *
   * A ref rather than state: nothing renders from it, and the AI reads it from
   * inside a delayed callback where state would be stale. It is the same record
   * a player keeps in their head, which is the point - an opponent with a good
   * memory reads this, and there is nothing else for it to read.
   */
  const playedCardsRef = useRef<PlayingCard[]>([]);
  /**
   * What the current shop visit has really cost, and which Conti Sospesi have
   * already collected on it. Both reset when a new shop opens: only the +1 Mult
   * they earn is permanent, and that lives in the joker.
   */
  const shopSpentRef = useRef<number>(0);
  const contoSospesoPaidRef = useRef<Set<string>>(new Set());
  /**
   * The suit of the card the player last WON a trick with.
   *
   * Il Maestro dei Bastoni chains the next opening to it. A ref because the
   * check runs from the same delayed callbacks the AI does, and state there is
   * a render behind.
   */
  const lastWinningSuitRef = useRef<Suit | null>(null);
  const [forcedLeadSuit, setForcedLeadSuit] = useState<Suit | null>(null);
  /**
   * The temperament of tonight's opponent, fixed when the round starts.
   *
   * A ref because the AI runs from delayed callbacks where state would be one
   * render behind, and because who is sitting there cannot change mid-round.
   */
  const opponentProfileRef = useRef(getAiProfile('neutral'));
  const [consecutiveWinStreak, setConsecutiveWinStreak] = useState<number>(0);
  /** Tricks lost back to back. Il Contropiede arms itself on this. */
  const [consecutiveLossStreak, setConsecutiveLossStreak] = useState<number>(0);
  const [capturedDenariRanksThisRound, setCapturedDenariRanksThisRound] = useState<Set<number>>(
    new Set()
  );

  const [tallyData, setTallyData] = useState<{
    chips: number;
    mult: number;
    finalScore: number;
    trickPoints: number;
    playerWon: boolean;
    scoreResult?: TrickScoreCalculation;
  } | null>(null);

  // --- Summaries & Modals ---
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(null);
  const [gameOverSummary, setGameOverSummary] = useState<GameOverSummaryData | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDeckSelect, setShowDeckSelect] = useState(false);
  /** The deck chosen, waiting on the rule the run will be played under. */
  const [pendingDeck, setPendingDeck] = useState<DeckDefinition | null>(null);
  const [showDeckViewer, setShowDeckViewer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  /** 0 = still. 1-3 = how hard the table just got hit. */
  const [shakeTier, setShakeTier] = useState<0 | 1 | 2 | 3>(0);

  /**
   * Every pause between tricks goes through here. A round is 20 tricks, so the
   * pacing is most of the time spent in a run: "Partita Rapida" nearly halves it.
   */
  const { beat, scheduleAction } = useActionScheduler(settings.fastMode);

  const requestSave = useAutosaveBoundary(writeRunSnapshot);

  // Synchronized state refs to eliminate asynchronous closure staleness
  const playerHandRef = useLatest(playerHand);
  const opponentHandRef = useLatest(opponentHand);
  const drawPileRef = useLatest(drawPile);
  const trumpCardRef = useLatest(trumpCard);
  const briscolaSuitRef = useLatest(briscolaSuit);
  const activeBossRef = useLatest(activeBoss);
  const bossDebuffNeutralizedRef = useLatest(bossDebuffNeutralized);
  /**
   * The two slot caps, mirrored. A shop service is bought from a click handler
   * that closed over an older render: reading the cap out of state there is how
   * a double tap buys the same chair twice.
   */
  const runPhaseRef = useLatest(runPhase);
  const anteRef = useRef<number>(1);
  const maxJokersRef = useLatest(maxJokers);
  const maxConsumablesRef = useLatest(maxConsumables);
  /** One expansion per press, whatever the browser does with the second one. */
  const slotPurchaseLockRef = useRef<boolean>(false);
  /**
   * Tricks left on the Scudo Protettivo.
   *
   * It used to switch the boss off for the whole blind, which turns a boss into
   * no boss. A window has to be placed, so it counts down and the rule comes
   * back - and the HUD keeps saying so while it lasts.
   */
  const bossShieldTricksRef = useRef<number>(0);
  const [bossShieldTricks, setBossShieldTricks] = useState<number>(0);
  // Set by "Salto Turno": the next trick is awarded to the player whatever falls.
  const forcedTrickWinRef = useRef<boolean>(false);
  const playGuardRef = useRef<boolean>(false);
  const tallyGuardRef = useRef<boolean>(false);

  /** Boss whose rules are in force, or null while the Scudo Protettivo is up. */
  const getEnforcedBoss = (): BossBlind | null =>
    bossDebuffNeutralizedRef.current ? null : activeBossRef.current;

  /** Boss debuff currently in force, or undefined while the shield is up. */
  /**
   * Every rule in force this trick, not just one.
   *
   * An Endless Boss enforces its own rule plus its modifiers', so the engine is
   * handed the whole list. A campaign Boss returns a single-entry list, which
   * every resolver reads exactly as it read the bare string.
   */
  const getActiveBossDebuff = (): string[] | undefined => {
    const rules = getActiveBossRules(getEnforcedBoss());
    return rules.length > 0 ? rules : undefined;
  };

  /**
   * `intensity` is the share of the round's target the hit was worth. Below a
   * tenth of it nothing moves: a shake on all twenty tricks of a round stops
   * meaning anything, and on a phone it drags the viewport with it.
   */
  /**
   * How loud the room should be. A Boss owns the level outright; short of one
   * it climbs with a win streak, and the deep Antes are never quiet.
   */
  useEffect(() => {
    sound.setMusicIntensity(
      musicIntensityFor({
        hasBoss: !!activeBoss,
        winStreak: consecutiveWinStreak,
        ante,
        isEndless: isEndlessAnte(ante),
      })
    );
    // The Endless tier is a second dial: how much is playing, and whether it
    // still agrees with itself.
    const tier = getEndlessTier(ante);
    sound.setMusicDissonance(
      musicDissonanceFor(tier ? ENDLESS_TIERS.findIndex((entry) => entry.id === tier.id) : null)
    );
  }, [activeBoss, consecutiveWinStreak, ante]);

  const triggerScreenShake = (intensity: number = 0.4) => {
    if (
      !settings.screenShake ||
      (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) return;
    const tier: 0 | 1 | 2 | 3 =
      intensity >= 0.6 ? 3 : intensity >= 0.25 ? 2 : intensity >= 0.09 ? 1 : 0;
    if (tier === 0) return;
    setShakeTier(tier);
    setTimeout(() => setShakeTier(0), tier === 3 ? 620 : tier === 2 ? 400 : 240);
  };

  // --- Initialize Match Round ---
  const initRound = (
    currentAnte: number,
    currentRoundNum: number,
    deckDef: DeckDefinition = selectedDeck,
    currentRunDeck: PlayingCard[] = runDeck
  ) => {
    setScoreLedger((ledger) => ({
      ...ledger,
      currentRoundScore: 0,
      roundPointsTaken: 0,
      opponentPointsTaken: 0,
      roundTricksWon: 0,
      roundTricksLost: 0,
    }));
    setRoundSummary(null);
    setPlayerTrickCard(null);
    setOpponentTrickCard(null);
    setTricksPlayedInRound(0);
    playedCardsRef.current = [];
    lastWinningSuitRef.current = null;
    setForcedLeadSuit(null);
    // Who you are playing tonight decides how they play, for the whole round.
    opponentProfileRef.current = getAiProfile(
      getOpponentIntro(currentAnte, currentRoundNum).aiProfileId
    );
    setConsecutiveWinStreak(0);
    setCapturedDenariRanksThisRound(new Set());
    activeUnoMultiplierRef.current = 1.0;
    isReverseActiveRef.current = false;
    setBossDebuffNeutralized(false);
    bossShieldTricksRef.current = 0;
    setBossShieldTricks(0);
    bossDebuffNeutralizedRef.current = false;
    forcedTrickWinRef.current = false;
    playGuardRef.current = false;
    tallyGuardRef.current = false;
    setTallyData(null);

    anteRef.current = currentAnte;

    // The second encounter of every Ante is the Boss. Past Ante 8 the pool is
    // the same eight, rolled from the run's own generator and dressed with the
    // tier's modifiers - so reloading sits down at the same table, with the
    // same rules, every time.
    let bossToSet: BossBlind | null = null;
    if (isBossEncounter(currentRoundNum)) {
      bossToSet = isEndlessAnte(currentAnte)
        ? endlessBossForAnte(currentAnte, getRunRngState().seed).boss
        : ALL_BOSS_BLINDS.find((b) => b.ante === currentAnte) || ALL_BOSS_BLINDS[0];
      setActiveBoss(bossToSet);
      activeBossRef.current = bossToSet;
      setOpponentSpeech(bossToSet.bossQuote);
      sound.playBossSting();
    } else {
      setActiveBoss(null);
      activeBossRef.current = null;
      // The banter belongs to whoever is sitting there: generic table talk made
      // every venue sound the same.
      const normalQuotes = getOpponentIntro(currentAnte, currentRoundNum).banter;
      setOpponentSpeech(normalQuotes[Math.floor(Math.random() * normalQuotes.length)]);
    }

    const finalTarget = getBlindTargetScore(currentAnte, currentRoundNum, {
      bossMultiplier: BOSS_RULES.getTargetScoreMultiplier(bossToSet),
      deckMultiplier: deckDef.specialDeckPerk === 'high_stakes_vision' ? 1.25 : 1,
    });
    setTargetScore(finalTarget);

    // Reset Discards
    const extraScarto = vouchers.some((v) => v.id === 'v_scarto' && v.bought) ? 1 : 0;
    const jokerExtraDiscards = JOKER_EFFECTS.getExtraDiscards(activeJokers);
    // An Endless modifier can take one away. Never below zero: a negative
    // allowance is not a rule, it is a bug with a minus sign.
    const bossPenalty = getBossDiscardPenalty(bossToSet);
    setDiscardsLeft(
      Math.max(0, deckDef.startingDiscards + extraScarto + jokerExtraDiscards - bossPenalty)
    );

    // Prepare Round Deal from persistent runDeck
    const { roundDrawPile, trumpCard: dealTrump, briscolaSuit: dealSuit, playerHand: pHand, opponentHand: oHand } =
      prepareRoundDeck(currentRunDeck);

    playerHandRef.current = pHand;
    opponentHandRef.current = oHand;
    drawPileRef.current = roundDrawPile;
    trumpCardRef.current = dealTrump;
    briscolaSuitRef.current = dealSuit;

    setDrawPile(roundDrawPile);
    setTrumpCard(dealTrump);
    setBriscolaSuit(dealSuit);
    setPlayerHand(pHand);
    setOpponentHand(oHand);

    setDisabledJokerIndex(BOSS_RULES.getSilencedJokerIndex(bossToSet, 0, activeJokers.length));
    setIsPlayerTurn(true);
    setTrickLeadIsPlayer(true);
    dispatchTrickFlow({ type: 'RESET' });

    // Deal the opening hand card by card instead of having six appear at once.
    setIsDealing(true);
    for (let card = 0; card < 6; card++) {
      scheduleAction(() => sound.playCardFlick(), 120 + card * 130);
    }
    // 900ms: the beat GameTable turns the trump over on (TRUMP_FLIP_DELAY).
    scheduleAction(() => sound.playTrumpSlam(), 120 + 6 * 130);
    scheduleAction(() => setIsDealing(false), 1400);

    // Boundary 1: the encounter exists and is legal. The deal animation that
    // follows changes nothing about the position.
    requestSave('playing');
  };

  // --- Start a New Run ---
  const startNewRun = (deck: DeckDefinition = selectedDeck, mode: VictoryMode = victoryMode) => {
    // A new run gets a new stream, and it has to be running before the deck is
    // built: the forty card ids and the first shuffle come out of it.
    seedRunRng();
    clearStoredRun();
    setPendingConfirm(null);
    setShopState(null);
    setVictoryMode(mode);
    try {
      localStorage.setItem('briscolatro_victory_mode', mode);
    } catch {}
    setSelectedDeck(deck);
    setAnte(1);
    setBossesDefeated(0);
    setRound(1);
    setMoney(deck.startingMoney);
    setDiscardsLeft(deck.startingDiscards);
    setScoreLedger({
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
      totalMoneyEarned: deck.startingMoney,
    });
    setRoundSummary(null);
    setGameOverSummary(null);

    // Slots
    const initialMaxJokers = 5;
    const initialMaxConsumables = deck.specialDeckPerk === 'holo_figures' ? 3 : 2;
    setRunPhase('campaign');
    runPhaseRef.current = 'campaign';
    setCampaignVictory(false);
    setEndlessOffer(null);
    anteRef.current = 1;
    setMaxJokers(initialMaxJokers);
    maxJokersRef.current = initialMaxJokers;
    setMaxConsumables(initialMaxConsumables);
    maxConsumablesRef.current = initialMaxConsumables;

    // Starting Vouchers
    const initialVouchers: Voucher[] = [];
    if (deck.startingVouchers.length > 0) {
      deck.startingVouchers.forEach((vId) => {
        const found = ALL_VOUCHERS.find((v) => v.id === vId);
        if (found) initialVouchers.push({ ...found, bought: true });
      });
    }
    setVouchers(initialVouchers);

    // Starting Jokers
    const startJokers: Joker[] = [];
    deck.startingJokers.forEach((jId) => {
      const found = ALL_JOKERS.find((j) => j.id === jId);
      if (found) startJokers.push(instantiateJoker(found));
    });
    setActiveJokers(startJokers);
    setConsumables([]);

    // Create persistent Run Deck
    const newRunDeck = createRunDeck(deck);
    // A run starts from the forty identities and never leaves them: if a deck
    // perk ever broke that, this is where it would show up first.
    if (import.meta.env.DEV) assertRunDeckIntegrity(newRunDeck, 'inizio run');
    setRunDeck(newRunDeck);

    setPendingRound({ ante: 1, round: 1, deck, runDeck: newRunDeck });
    setPhase('blind_select');
    sound.playCardFlick();
    requestSave('blind_select');
  };

  /** Deck first, then the rule, then the table. */
  const handleDeckChosen = (deck: DeckDefinition) => {
    setShowDeckSelect(false);
    setPendingDeck(deck);
  };

  /**
   * What the player's board is paying them for right now.
   *
   * Read fresh each trick from things that are face-up on the screen anyway -
   * the jolly, the streak, the boss rule, the tricks left - so the opponent can
   * notice it is feeding a build without ever seeing a card in hand.
   */
  const readThreat = () =>
    readPlayerThreat(activeJokers, {
      briscolaSuit: briscolaSuitRef.current,
      streak: consecutiveWinStreak,
      remainingTricks:
        Math.floor(drawPileRef.current.length / 2) + playerHandRef.current.length,
      boss: getEnforcedBoss(),
      silencedJokerIndex: disabledJokerIndex,
    });

  // --- Opponent Lead AI ---
  const triggerOpponentLead = (overrideHand?: PlayingCard[], overrideSuit?: Suit) => {
    const currentHand = overrideHand || opponentHandRef.current;
    const currentSuit = overrideSuit || briscolaSuitRef.current;

    const chosenCard = chooseOpponentLead(currentHand, {
      briscolaSuit: currentSuit,
      bossDebuff: getActiveBossDebuff(),
      isReverse: isReverseActiveRef.current,
      // A Segnata card is the only thing it gets to know, and it knows it the
      // whole time that card is in hand.
      knownPlayerCards: visiblePlayerCards(playerHandRef.current),
      profile: opponentProfileRef.current,
      playedCards: playedCardsRef.current,
      playerThreat: readThreat(),
    });

    if (!chosenCard) {
      // No cards left to lead with: hand the table back to the player.
      setIsPlayerTurn(true);
      dispatchTrickFlow({ type: 'CANCEL_CLASH' });
      return;
    }

    const nextHand = currentHand.filter((c) => c.id !== chosenCard.id);
    opponentHandRef.current = nextHand;
    setOpponentHand(nextHand);
    setOpponentTrickCard(chosenCard);
    setTrickLeadIsPlayer(false);
    sound.playCardSlam(chosenCard.points, chosenCard.suit === briscolaSuitRef.current);

    setIsPlayerTurn(true);
    dispatchTrickFlow({ type: 'OPPONENT_LED' });
  };

  // --- Opponent Follow AI ---
  const triggerOpponentFollow = (playerCardPlayed: PlayingCard, overrideHand?: PlayingCard[]) => {
    const currentHand = overrideHand || opponentHandRef.current;

    // Same resolver as the engine, so boss/wild/reverse modifiers can never make
    // the AI's idea of the winner disagree with the actual clash.
    const chosenCard = chooseOpponentFollow(currentHand, playerCardPlayed, {
      briscolaSuit: briscolaSuitRef.current,
      bossDebuff: getActiveBossDebuff(),
      isReverse: isReverseActiveRef.current,
      knownPlayerCards: visiblePlayerCards(playerHandRef.current),
      profile: opponentProfileRef.current,
      playedCards: playedCardsRef.current,
      playerThreat: readThreat(),
    });

    if (!chosenCard) {
      // The opponent cannot answer: take the card back rather than inventing one
      // for it (the old fallback resolved the trick against a copy of the
      // player's own card).
      const restoredHand = [...playerHandRef.current, playerCardPlayed];
      playerHandRef.current = restoredHand;
      setPlayerHand(restoredHand);
      setPlayerTrickCard(null);
      setIsPlayerTurn(true);
      dispatchTrickFlow({ type: 'CANCEL_CLASH' });
      return;
    }

    const nextHand = currentHand.filter((c) => c.id !== chosenCard.id);
    opponentHandRef.current = nextHand;
    setOpponentHand(nextHand);
    setOpponentTrickCard(chosenCard);
    sound.playCardSlam(chosenCard.points, chosenCard.suit === briscolaSuitRef.current);

    // Proceed to trick resolution
    scheduleAction(() => {
      resolveCurrentClash(playerCardPlayed, chosenCard, true);
    }, beat(550));
  };

  // --- Resolve Trick Clash ---
  const resolveCurrentClash = (
    playerCard: PlayingCard,
    oppCard: PlayingCard,
    leadIsPlayer: boolean
  ) => {
    tallyGuardRef.current = false;
    dispatchTrickFlow({ type: 'BEGIN_CLASH' });

    // Both cards are face-up now, so both go into the public record. Memory is
    // built only from here.
    // Read BEFORE the two cards join the record: Il Contacarte must only ever
    // see the ranks of PREVIOUS tricks.
    const seenRanksBeforeTrick = new Set(playedCardsRef.current.map((card) => card.rank));
    playedCardsRef.current = [...playedCardsRef.current, playerCard, oppCard];

    // Refs, not state: this runs from a delayed callback, and the boss that
    // rotates the Briscola changes these values between the play and the clash.
    const bossDebuff = getActiveBossDebuff();
    const scoringBoss = getEnforcedBoss();

    // Lo Sgambetto does not hand the trick over - it moves the lead. Resolving
    // with the player as opener is the whole effect: at crossed suits rule 4
    // gives them the trick, and a Briscola from across the table still takes it.
    const stoleLead = forcedTrickWinRef.current;
    forcedTrickWinRef.current = false;
    const resolvedLeadIsPlayer = stoleLead ? true : leadIsPlayer;

    const clash = resolveTrick(
      resolvedLeadIsPlayer ? playerCard : oppCard,
      resolvedLeadIsPlayer ? oppCard : playerCard,
      briscolaSuitRef.current,
      resolvedLeadIsPlayer,
      bossDebuff,
      isReverseActiveRef.current
    );

    if (clash.playerWon) {
      sound.playTrickWin();

      // Calculate score with Jokers and Boss debuffs
      const remainingTricks =
        Math.floor(drawPileRef.current.length / 2) + playerHandRef.current.length;
      const scoreResult = calculateTrickScore(
        playerCard,
        oppCard,
        clash,
        briscolaSuitRef.current,
        activeJokers,
        scoringBoss,
        {
          money,
          playerHand: playerHandRef.current,
          consecutiveWinStreak,
          totalTricksPlayedThisRound: tricksPlayedInRound,
          remainingTricksCount: remainingTricks,
          capturedDenariRanksThisRound,
          consecutiveLossStreak,
          seenRanksBeforeTrick,
          roundPointsTaken,
          opponentPointsTaken,
        },
        activeUnoMultiplierRef.current,
        disabledJokerIndex,
        leadIsPlayer
      );

      // Seals: a blue seal can roll a free UNO card, a purple one refunds a
      // discard.
      const seals = scoreResult.sealEvents;
      if (seals.extraDiscards > 0) {
        setDiscardsLeft((d) => d + seals.extraDiscards);
      }
      if (seals.spawnUnoCard) {
        setConsumables((prev) => {
          if (prev.length >= maxConsumables) return prev;
          const reward = createBlueSealReward(ALL_UNO_CARDS);
          return reward ? [...prev, reward] : prev;
        });
        setOpponentSpeech('Sigillo Blu: una Carta Sola gratis!');
      }
      // The Azzardo's dollars ride along in scoreResult.bonusDollars, which
      // handleTallyComplete pays out: charging again here would take it twice.
      if (scoreResult.special.unpaidDebt) {
        setOpponentSpeech('Cassa vuota: la carta A Debito non paga il bonus.');
      }

      // Bank permanent joker growth for the rest of the run.
      if (scoreResult.statGrowth.length > 0) {
        setActiveJokers((prev) => {
          const next = JOKER_EFFECTS.applyStatGrowth(prev, scoreResult.statGrowth);
          activeJokersRef.current = next;
          return next;
        });
      }

      if (scoreResult.triggeredJokerIds.length > 0) {
        setTriggeringJokerId(scoreResult.triggeredJokerIds[0]);
        // The joker shakes on screen: it should be heard going off too.
        sound.playJokerTrigger();
        setTimeout(() => setTriggeringJokerId(null), 1200);
      }

      // The forger's stamp: a card of the run deck picks up a Foil edition and
      // nothing else. Suit and rank are never touched, so the forty identities
      // survive every stamp; a deck already all Foil simply gets nothing.
      if (scoreResult.foilRandomCard) {
        setRunDeck((prev) => {
          const { deck, foiledCardId } = foilRandomCardInRunDeck(prev);
          if (!foiledCardId) return prev;
          if (import.meta.env.DEV) assertRunDeckIntegrity(deck, 'Falsario');
          return deck;
        });
      }

      setTallyData({
        chips: scoreResult.totalChips,
        mult: scoreResult.totalMult,
        finalScore: scoreResult.finalScore,
        trickPoints: clash.rawPoints,
        playerWon: true,
        scoreResult,
      });
    } else {
      sound.playTrickLose();

      // calculateTrickScore never runs on a lost trick, so the other half of
      // the Azzardo lives here: this is where a Vetro breaks and a Traditrice
      // presents the bill.
      const special = resolveSpecialForTrick({
        card: playerCard,
        playerLed: leadIsPlayer,
        playerWon: false,
        money,
      });
      if (special.dollarsToAdd < 0) {
        setMoney((m) => Math.max(0, m + special.dollarsToAdd));
      }
      if (special.brokenSpecialCardId) {
        // The card stays in the deck - it is one of the forty - it just stops
        // being special.
        setRunDeck((prev) => clearSpecialInRunDeck(prev, special.brokenSpecialCardId!));
        setPlayerHand((prev) =>
          prev.map((c) => (c.id === special.brokenSpecialCardId ? { ...c, special: 'none' as const } : c))
        );
        sound.playCardShatter();
      }
      if (special.reasons.length > 0) {
        setOpponentSpeech(special.reasons.join(' · '));
      }

      setTallyData({
        chips: 0,
        mult: 1,
        finalScore: 0,
        trickPoints: clash.rawPoints,
        playerWon: false,
      });
    }

    dispatchTrickFlow({ type: 'SHOW_TALLY' });
  };

  // --- Tally Complete State Transition ---
  const handleTallyComplete = () => {
    if (!tallyData || tallyGuardRef.current) return;
    tallyGuardRef.current = true;

    const { playerWon, finalScore, trickPoints, scoreResult } = tallyData;
    const bonusDollars = scoreResult?.bonusDollars || 0;

    // Construct fresh snapshot
    const currentSnapshot: RoundStateSnapshot = {
      ...scoreLedger,
      money,
      targetScore,
      ante,
      round,
      vouchers,
      bossesDefeated,
      solaCardsUsed,
      victoryMode,
    };

    // 1. Update scores & money deterministically
    const nextSnapshot = applyTrickResult(
      currentSnapshot,
      playerWon,
      finalScore,
      trickPoints,
      bonusDollars
    );

    setScoreLedger({
      currentRoundScore: nextSnapshot.currentRoundScore,
      totalScore: nextSnapshot.totalScore,
      roundPointsTaken: nextSnapshot.roundPointsTaken,
      opponentPointsTaken: nextSnapshot.opponentPointsTaken,
      roundTricksWon: nextSnapshot.roundTricksWon,
      roundTricksLost: nextSnapshot.roundTricksLost,
      totalTricksWon: nextSnapshot.totalTricksWon,
      totalTricksLost: nextSnapshot.totalTricksLost,
      totalBriscolaPointsPlayer: nextSnapshot.totalBriscolaPointsPlayer,
      totalBriscolaPointsOpponent: nextSnapshot.totalBriscolaPointsOpponent,
      totalMoneyEarned: nextSnapshot.totalMoneyEarned,
    });
    setMoney(nextSnapshot.money);

    // Update Denari captured set
    if (playerWon) {
      setCapturedDenariRanksThisRound((prev) => {
        const next = new Set(prev);
        if (playerTrickCard?.suit === 'denari') next.add(playerTrickCard.rank);
        if (opponentTrickCard?.suit === 'denari') next.add(opponentTrickCard.rank);
        return next;
      });
      setConsecutiveWinStreak((s) => s + 1);
      setConsecutiveLossStreak(0);
    } else {
      setConsecutiveWinStreak(0);
      setConsecutiveLossStreak((s) => s + 1);
    }

    const newTricksPlayed = tricksPlayedInRound + 1;
    setTricksPlayedInRound(newTricksPlayed);

    // 2. Deal next cards using latest refs
    const { newPlayerHand, newOpponentHand, newDrawPile, newTrumpCard } = drawNextTrickCards(
      playerWon,
      drawPileRef.current,
      trumpCardRef.current,
      playerHandRef.current,
      opponentHandRef.current
    );

    // Two cards come off the stock: one flick each, close together.
    if (newDrawPile.length !== drawPileRef.current.length) {
      sound.playCardDraw();
      scheduleAction(() => sound.playCardDraw(), beat(140));
    }

    playerHandRef.current = newPlayerHand;
    opponentHandRef.current = newOpponentHand;
    drawPileRef.current = newDrawPile;
    trumpCardRef.current = newTrumpCard;

    setPlayerHand(newPlayerHand);
    setOpponentHand(newOpponentHand);
    setDrawPile(newDrawPile);
    setTrumpCard(newTrumpCard);

    let nextBriscolaSuit = briscolaSuitRef.current;
    // Check boss rotating briscola
    if (BOSS_RULES.shouldRotateBriscola(newTricksPlayed, getEnforcedBoss())) {
      nextBriscolaSuit = BOSS_RULES.getRotatedBriscolaSuit(nextBriscolaSuit);
      briscolaSuitRef.current = nextBriscolaSuit;
      setBriscolaSuit(nextBriscolaSuit);
      setOpponentSpeech(`Il mazzo è stato rimescolato: Briscola ${nextBriscolaSuit.toUpperCase()}!`);
      sound.playBoosterRip();
    }

    // Reset trick variables
    setPlayerTrickCard(null);
    setOpponentTrickCard(null);
    setTallyData(null);
    activeUnoMultiplierRef.current = 1.0;
    isReverseActiveRef.current = false;

    // The Scudo burns a trick, and when it runs out the boss speaks again.
    if (bossShieldTricksRef.current > 0) {
      bossShieldTricksRef.current -= 1;
      setBossShieldTricks(bossShieldTricksRef.current);
      if (bossShieldTricksRef.current === 0) {
        bossDebuffNeutralizedRef.current = false;
        setBossDebuffNeutralized(false);
        if (activeBossRef.current) setOpponentSpeech('Lo Scudo si è consumato: il Boss torna in gioco.');
      }
    }

    // The toll is charged on the suit you won with, and only while you still
    // hold that suit: a chain that cannot be followed simply ends.
    lastWinningSuitRef.current = playerWon ? (playerTrickCard?.suit ?? null) : null;
    setForcedLeadSuit(
      BOSS_RULES.getForcedLeadSuit(getEnforcedBoss(), lastWinningSuitRef.current, newPlayerHand)
    );

    // The Sovrano walks the rail in order, so the next silence is knowable.
    setDisabledJokerIndex(
      BOSS_RULES.getSilencedJokerIndex(getEnforcedBoss(), newTricksPlayed, activeJokers.length)
    );

    // 3. Check if Round Finished
    const roundEnded = isRoundFinished(newPlayerHand, newOpponentHand, newDrawPile, newTrumpCard);

    if (roundEnded) {
      dispatchTrickFlow({ type: 'FINISH_ROUND' });

      // Evaluate outcome
      const outcome = calculateRoundOutcome(nextSnapshot, highScore, unlockedDeckIds);

      // Four rules mean four records: a Briscola run and a Briscolatro run are
      // not the same achievement and must never overwrite each other.
      if (nextSnapshot.totalScore > highScores[victoryMode]) {
        setHighScores((prev) => ({ ...prev, [victoryMode]: nextSnapshot.totalScore }));
        try {
          localStorage.setItem(
            VICTORY_MODES[victoryMode].highScoreKey,
            `${nextSnapshot.totalScore}`
          );
        } catch {}
      }
      if (outcome.newHighScore) setHighScore(nextSnapshot.totalScore);

      // The campaign record counts campaign antes. An Endless run keeps its own
      // number, a few lines down, so one cannot inflate the other.
      if (runPhaseRef.current === 'campaign' && ante > modeBestAnte[victoryMode]) {
        const updatedAnte = { ...modeBestAnte, [victoryMode]: ante };
        setModeBestAnte(updatedAnte);
        try {
          localStorage.setItem('briscolatro_mode_ante', JSON.stringify(updatedAnte));
        } catch {}
      }

      if (outcome.newUnlockedDecks.length > 0) {
        const updated = Array.from(new Set([...unlockedDeckIds, ...outcome.newUnlockedDecks]));
        setUnlockedDeckIds(updated);
        try {
          localStorage.setItem('briscolatro_unlocked_decks', JSON.stringify(updated));
        } catch {}
      }

      if (outcome.won) {
        if (isBossEncounter(round)) setBossesDefeated((n) => n + 1);
        // Boundary 3: the encounter is over and the shop is next. The shelf is
        // rolled here so the snapshot carries it, rather than in ShopView where
        // it would be re-rolled by every reload.
        if (!outcome.isAnte8Victory) {
          setShopState({
            seed: Math.floor(randomRun() * 0x7fffffff),
            rerolls: 0,
            boughtKeys: [],
          });
          requestSave('shop');
        }
        sound.playRoundWin();
        confetti({ particleCount: 70, spread: 80 });

        setMoney((m) => m + outcome.totalReward);
        setScoreLedger((ledger) => ({
          ...ledger,
          totalMoneyEarned: ledger.totalMoneyEarned + outcome.totalReward,
        }));

        const endRoundJokerBonus = JOKER_EFFECTS.getRoundEndBonusDollars(activeJokers, nextSnapshot.money);
        if (endRoundJokerBonus > 0) {
          setMoney((m) => m + endRoundJokerBonus);
        }

        setRoundSummary(
          buildRoundSummary({
            snapshot: nextSnapshot,
            outcome,
            boss: activeBoss,
            activeJokersCount: activeJokers.length,
          })
        );

        if (outcome.isAnte8Victory) {
          // The whole run, not just a blind: this is what the fanfare is for.
          //
          // Everything that makes this a VICTORY is registered right here,
          // before the player is asked anything. Whatever they pick next - walk
          // out or double the stake - the tournament is already won and the
          // record already written.
          const wins = { ...modeWins, [victoryMode]: modeWins[victoryMode] + 1 };
          setModeWins(wins);
          try {
            localStorage.setItem('briscolatro_mode_wins', JSON.stringify(wins));
          } catch {}
          setCampaignVictory(true);
          sound.playVictoryFanfare();
          // The snapshot is NOT cleared yet: the run may well continue. It is
          // cleared when the player closes it out, or when Endless kills them.
          setEndlessOffer(
            buildCampaignVictorySummary({
              snapshot: nextSnapshot,
              outcome,
              jokers: activeJokers,
              deckName: selectedDeck.name,
            })
          );
          // The offer is a settled position too: a reload here comes back to
          // the question, not to the Boss that was already beaten.
          requestSave('blind_select');
        }
      } else {
        sound.playRoundLose();
        // The run is lost: the snapshot goes with it.
        clearStoredRun();

        setRoundSummary(
          buildRoundSummary({
            snapshot: nextSnapshot,
            outcome,
            boss: activeBoss,
            activeJokersCount: activeJokers.length,
          })
        );

        const endlessTier = getEndlessTier(ante);
        const isNewEndlessRecord =
          runPhaseRef.current === 'endless' && ante > modeBestEndlessAnte[victoryMode];
        if (isNewEndlessRecord) {
          const updated = { ...modeBestEndlessAnte, [victoryMode]: ante };
          setModeBestEndlessAnte(updated);
          try {
            localStorage.setItem('briscolatro_mode_endless', JSON.stringify(updated));
          } catch {}
        }

        setGameOverSummary(
          buildDefeatSummary({
            snapshot: nextSnapshot,
            outcome,
            jokers: activeJokers,
            deckName: selectedDeck.name,
            campaignVictory,
            endlessAnte: runPhaseRef.current === 'endless' ? ante : undefined,
            endlessTierName: endlessTier?.name,
            isNewEndlessRecord,
          })
        );
      }
    } else {
      // Round continues!
      playGuardRef.current = false;
      setIsPlayerTurn(playerWon);
      dispatchTrickFlow({ type: 'CONTINUE_ROUND' });

      // Boundary 2: the trick is awarded, the scores moved, the growth banked,
      // the cards drawn and the next opener decided. The AI lead below is
      // scheduled but not taken, so a reload replays it rather than skipping it.
      requestSave('playing');

      if (!playerWon) {
        // Opponent's turn to lead - pass the freshly dealt hand and suit directly!
        scheduleAction(() => {
          triggerOpponentLead(newOpponentHand, nextBriscolaSuit);
        }, beat(700));
      }
    }
  };

  // --- Player Plays Card ---
  const handlePlayCard = (card: PlayingCard) => {
    if (playGuardRef.current) return;
    if (trickPhase !== 'idle' && trickPhase !== 'waiting_player_follow') return;
    if (playerTrickCard !== null) return;

    // Check Boss lead restriction (e.g. Il Cambiavalute)
    if (opponentTrickCard === null) {
      const bossCheck = BOSS_RULES.canPlayerLeadCard(
        card,
        getEnforcedBoss(),
        playerHandRef.current,
        lastWinningSuitRef.current
      );
      if (!bossCheck.allowed) {
        sound.playTrickLose();
        setOpponentSpeech(bossCheck.reason || 'Mossa non consentita!');
        return;
      }
    }

    playGuardRef.current = true;
    sound.playCardSlam(card.points, card.suit === briscolaSuitRef.current);

    const nextPlayerHand = playerHandRef.current.filter((c) => c.id !== card.id);
    playerHandRef.current = nextPlayerHand;
    setPlayerHand(nextPlayerHand);
    setPlayerTrickCard(card);

    if (opponentTrickCard === null) {
      // Player led first
      setTrickLeadIsPlayer(true);
      setIsPlayerTurn(false);
      dispatchTrickFlow({ type: 'BEGIN_CLASH' });

      scheduleAction(() => {
        triggerOpponentFollow(card, opponentHandRef.current);
      }, beat(600));
    } else {
      // Player responded to opponent's lead
      dispatchTrickFlow({ type: 'BEGIN_CLASH' });

      scheduleAction(() => {
        resolveCurrentClash(card, opponentTrickCard, false);
      }, beat(550));
    }
  };

  // --- Player Discards Card (Scarto as Exchange) ---
  const handleDiscardCard = (card: PlayingCard) => {
    if (!canDiscardCardNow({
      discardsLeft,
      trickPhase,
      isPlayerTurn,
      drawPileCount: drawPileRef.current.length,
      playerCardAlreadyPlayed: playerTrickCard !== null,
    })) {
      setOpponentSpeech('Lo Scarto non è disponibile in questo momento.');
      return;
    }

    const res = performExchangeDiscard(
      card,
      playerHandRef.current,
      drawPileRef.current,
      trumpCardRef.current
    );
    if (res.success) {
      sound.playDiscard();
      playerHandRef.current = res.newPlayerHand;
      drawPileRef.current = res.newDrawPile;
      trumpCardRef.current = res.newTrumpCard;
      setPlayerHand(res.newPlayerHand);
      setDrawPile(res.newDrawPile);
      setTrumpCard(res.newTrumpCard);
      setDiscardsLeft((d) => Math.max(0, d - 1));
    }
  };

  // --- Use UNO Action Card ---
  const handleUseUnoCard = (unoCard: UnoCard, targetCard?: PlayingCard, chosenSuit?: Suit) => {
    // UNO cards mutate hands and the stock, so they are only legal while the
    // player is actually on turn: firing one mid-resolution races the timers
    // that are already resolving the trick.
    const canUseNow =
      (trickPhase === 'idle' || trickPhase === 'waiting_player_follow') && isPlayerTurn;
    if (!canUseNow) {
      sound.playTrickLose();
      setOpponentSpeech('Aspetta il tuo turno per giocare una Carta Sola!');
      return;
    }
    // One cast at a time: the board is already changing under the last one.
    if (castingUno) return;

    // The card goes up first and the effect goes off when it lands, so you can
    // see what you spent before the numbers move.
    setCastingUno({ unoCard, targetCard, chosenSuit });
  };

  /** The landing frame of the cast: everything the card does happens here. */
  const applyUnoCard = (unoCard: UnoCard, targetCard?: PlayingCard, chosenSuit?: Suit) => {
    triggerScreenShake();

    const ctx = {
      unoCard,
      targetCard,
      chosenSuit,
      drawPile: drawPileRef.current,
      playerHand: playerHandRef.current,
      opponentHand: opponentHandRef.current,
      briscolaSuit: briscolaSuitRef.current,
      money,
      discardsLeft,
      activeJokers,
      maxJokers,
      currentRoundScore,
      bossDebuffActive: activeBossRef.current !== null,
      activeUnoMultiplier: activeUnoMultiplierRef.current,
      isReverseActive: isReverseActiveRef.current,
    };

    const res = executeUnoCard(ctx);

    // Refused effects (notably Jolly Misterioso with full slots) return the
    // owned card and do not advance the permanent usage counter.
    if (res.consumed !== false) {
      setSolaCardsUsed((used) => {
        const next = used + 1;
        try {
          localStorage.setItem('briscolatro_sola_used', `${next}`);
        } catch {}
        return next;
      });
    }

    playerHandRef.current = res.newPlayerHand;
    opponentHandRef.current = res.newOpponentHand;
    drawPileRef.current = res.newDrawPile;
    briscolaSuitRef.current = res.newBriscolaSuit;
    isReverseActiveRef.current = res.newIsReverseActive;

    setDrawPile(res.newDrawPile);
    setPlayerHand(res.newPlayerHand);
    setOpponentHand(res.newOpponentHand);
    setBriscolaSuit(res.newBriscolaSuit);
    moneyRef.current = Math.max(0, res.newMoney);
    setMoney(moneyRef.current);
    setDiscardsLeft(res.newDiscardsLeft);
    activeJokersRef.current = res.newActiveJokers;
    setActiveJokers(res.newActiveJokers);
    setScoreLedger((ledger) => ({ ...ledger, currentRoundScore: res.newRoundScore }));
    activeUnoMultiplierRef.current = res.newActiveUnoMultiplier;
    setOpponentSpeech(res.feedbackMessage);

    // Scudo Protettivo: the boss rule goes quiet for a set number of tricks.
    if (activeBossRef.current && res.bossShieldTricks && res.bossShieldTricks > 0) {
      bossShieldTricksRef.current = res.bossShieldTricks;
      setBossShieldTricks(res.bossShieldTricks);
      setBossDebuffNeutralized(true);
      bossDebuffNeutralizedRef.current = true;
    }

    // Sgambetto: the player counts as this trick's leader.
    if (res.stealLeadCurrentTrick) {
      forcedTrickWinRef.current = true;
    }

    // Apply permanent upgrade to runDeck if applicable
    if (res.cardUpgradedInRunDeck) {
      const up = res.cardUpgradedInRunDeck;
      setRunDeck((prev) =>
        prev.map((c) => (c.id === up.id ? { ...c, ...up.updates } : c))
      );
    }

    if (res.consumed !== false) {
      setConsumables((prev) => {
        const next = prev.filter((owned) => !sameUnoInstance(owned, unoCard));
        consumablesRef.current = next;
        return next;
      });
    }
  };

  /**
   * CHIUDI LA PARTITA: the victorious game over, exactly as it always was.
   * The win was registered when the Boss fell; this only closes the run out.
   */
  const handleCloseCampaign = () => {
    if (!endlessOffer) return;
    sound.playCardFlick();
    clearStoredRun();
    setGameOverSummary(endlessOffer);
    setEndlessOffer(null);
    setPhase('game_over');
  };

  /**
   * RADDOPPIA LA POSTA: on into Endless, through the shop like any other Ante.
   * The macroloop is untouched - Tavolo, shop, Boss, shop, next Ante - so the
   * first Endless Ante is reached exactly the way Ante 8 was.
   */
  const handleDoubleDown = () => {
    if (!endlessOffer) return;
    sound.playShopEnter();
    setRunPhase('endless');
    runPhaseRef.current = 'endless';
    setEndlessOffer(null);
    shopSpentRef.current = 0;
    contoSospesoPaidRef.current = new Set();
    setShopState({ seed: Math.floor(randomRun() * 0x7fffffff), rerolls: 0, boughtKeys: [] });
    setPhase('shop');
    requestSave('shop');
  };

  // --- Round Summary Continue ---
  const handleContinueFromRoundSummary = () => {
    if (!roundSummary) return;

    if (roundSummary.won) {
      setRoundSummary(null);
      // The Ante 8 Boss is the only encounter that does not lead to a shop: it
      // leads to the question. Every Endless Boss after it goes back to the
      // shop like any other.
      if (endlessOffer) {
        setPhase('game_over');
      } else {
        sound.playShopEnter();
        // A fresh visit: the Conto Sospeso can be paid once more.
        shopSpentRef.current = 0;
        contoSospesoPaidRef.current = new Set();
        // The shelf is normally rolled when the encounter is cleared; a run
        // that somehow arrives without one still gets a deterministic shop.
        if (!shopState) {
          setShopState({ seed: Math.floor(randomRun() * 0x7fffffff), rerolls: 0, boughtKeys: [] });
        }
        setPhase('shop');
        requestSave('shop');
      }
    } else {
      setRoundSummary(null);
      setPhase('game_over');
    }
  };

  // --- Shop Handlers ---
  const spendMoney = (cost: number): boolean => {
    const transaction = trySpendMoney(moneyRef.current, cost);
    if (!transaction.success) return false;
    moneyRef.current = transaction.balance;
    setMoney(moneyRef.current);

    // Every shop article, reroll included, comes through here. Free picks and
    // sales do not: a $0 transaction is not spending.
    if (cost > 0) {
      shopSpentRef.current += cost;
      const settled = JOKER_EFFECTS.applyShopSpend(
        activeJokersRef.current,
        shopSpentRef.current,
        contoSospesoPaidRef.current
      );
      if (settled.paidInstanceIds.length > 0) {
        settled.paidInstanceIds.forEach((id) => contoSospesoPaidRef.current.add(id));
        activeJokersRef.current = settled.jokers;
        setActiveJokers(settled.jokers);
      }
    }
    return true;
  };

  const handleBuyJoker = (joker: Joker, cost: number): boolean => {
    if (activeJokersRef.current.length >= maxJokersRef.current || !spendMoney(cost)) return false;
    const next = [...activeJokersRef.current, instantiateJoker(joker)];
    activeJokersRef.current = next;
    setActiveJokers(next);
    requestSave('shop');
    return true;
  };

  const handleBuyUnoCard = (unoCard: UnoCard, cost: number): boolean => {
    if (consumablesRef.current.length >= maxConsumablesRef.current || !spendMoney(cost)) return false;
    const next = [...consumablesRef.current, instantiateUnoCard(unoCard)];
    consumablesRef.current = next;
    setConsumables(next);
    requestSave('shop');
    return true;
  };

  const handleBuyVoucher = (voucher: Voucher, cost: number): boolean => {
    if (vouchersRef.current.some((owned) => owned.id === voucher.id) || !spendMoney(cost)) return false;
    const next = [...vouchersRef.current, { ...voucher, bought: true }];
    vouchersRef.current = next;
    setVouchers(next);

    if (voucher.id === 'v_tavolo') {
      // A free chair, never past the cap. The 25% off later expansions is read
      // straight off the owned vouchers, so there is nothing else to store.
      const widened = applyTavoloAllargato(maxJokersRef.current, slotRules());
      maxJokersRef.current = widened;
      setMaxJokers(widened);
    }
    requestSave('shop');
    return true;
  };

  /** What the two permanent services cost right now, vouchers included. */
  /** The caps this Ante plays under. Campaign 7, then 8 / 9 / 10 by tier. */
  const slotRules = () => getSlotRulesForAnte(anteRef.current);

  const slotExpansionContext = () => ({
    hasTavoloAllargato: vouchersRef.current.some((v) => v.id === 'v_tavolo' && v.bought),
    hasHouseDiscount: vouchersRef.current.some((v) => v.id === 'v_sconto' && v.bought),
  });

  /**
   * One atomic step up the ladder.
   *
   * Everything it decides on - the cap, the price, the balance - is read from a
   * ref, so a second click landing in the same tick sees the chair already
   * bought rather than the state from before the first one. The lock on top of
   * that is what stops a double tap from walking two rungs at once.
   */
  const buySlotExpansion = (kind: 'joker' | 'consumable'): boolean => {
    if (slotPurchaseLockRef.current) return false;
    const currentRef = kind === 'joker' ? maxJokersRef : maxConsumablesRef;
    const offer =
      kind === 'joker'
        ? getNextJokerExpansion(currentRef.current, slotExpansionContext(), slotRules())
        : getNextConsumableExpansion(currentRef.current, slotExpansionContext(), slotRules());
    const till = purchaseSlotExpansion(offer, moneyRef.current, currentRef.current);
    if (!till.bought) return false;

    slotPurchaseLockRef.current = true;
    if (!spendMoney(offer!.cost)) {
      slotPurchaseLockRef.current = false;
      return false;
    }
    currentRef.current = till.slots;
    if (kind === 'joker') setMaxJokers(till.slots);
    else setMaxConsumables(till.slots);
    requestSave('shop');
    setTimeout(() => {
      slotPurchaseLockRef.current = false;
    }, 0);
    return true;
  };

  const handleBuyJokerSlot = (): boolean => buySlotExpansion('joker');
  const handleBuyConsumableSlot = (): boolean => buySlotExpansion('consumable');

  const handleSellJoker = (index: number) => {
    const joker = activeJokersRef.current[index];
    if (!joker) return;
    sound.playCashChime();
    moneyRef.current += joker.sellValue;
    setMoney(moneyRef.current);
    const next = activeJokersRef.current.filter((_, i) => i !== index);
    activeJokersRef.current = next;
    setActiveJokers(next);
    requestSave('shop');
  };

  const handleSellUnoCard = (index: number) => {
    if (!consumablesRef.current[index]) return;
    sound.playCashChime();
    moneyRef.current += 1;
    setMoney(moneyRef.current);
    const next = consumablesRef.current.filter((_, i) => i !== index);
    consumablesRef.current = next;
    setConsumables(next);
    requestSave('shop');
  };

  const handleUpgradeCard = (upgraded: PlayingCard) => {
    // The 4 di Spade Vetro IS your 4 di Spade: the upgrade rewrites that one
    // entry. Nothing is added, nothing is dropped, and the forty identities of
    // the Italian deck stay exactly as they are.
    setRunDeck((prev) => {
      const next = upgradeCardInRunDeck(prev, upgraded);
      if (import.meta.env.DEV) assertRunDeckIntegrity(next, 'upgrade in bustina');
      return next;
    });
    requestSave('shop');
  };

  const handleNextRoundFromShop = () => {
    // Tavolo, shop, Boss, shop, next Ante. The Ante 8 Boss never reaches here:
    // clearing it ends the run.
    const nextAnte = isBossEncounter(round) ? ante + 1 : ante;
    const nextRound = isBossEncounter(round) ? 1 : round + 1;
    setAnte(nextAnte);
    setRound(nextRound);
    setPendingRound({ ante: nextAnte, round: nextRound, deck: selectedDeck, runDeck });
    setPhase('blind_select');
    // Boundary 5: out of the shop, the next encounter not yet dealt.
    setShopState(null);
    shopSpentRef.current = 0;
    contoSospesoPaidRef.current = new Set();
    requestSave('blind_select');
  };

  /** Boundary 4: a shop transaction landed, or the shelf was rerolled. */
  const handleShopStateChange = (patch: Partial<ShopSnapshotV1>) => {
    setShopState((prev) => (prev ? { ...prev, ...patch } : prev));
    requestSave('shop');
  };

  // A fixed hand for the title screen: real cards, not decoration, and stable
  // ids so they are not re-created (and re-animated) on every render.
  const titleHand = React.useMemo(
    () => [
      createCard('denari', 1, 'gold', 'none', 'none', 'title_asso'),
      createCard('coppe', 3, 'polychrome', 'none', 'none', 'title_tre'),
      createCard('bastoni', 10, 'foil', 'none', 'none', 'title_re'),
    ],
    []
  );

  /**
   * Sits back down at the stored run.
   *
   * The refs are written before any state is, and before anything is
   * scheduled: the engine reads hands, stock and briscola out of refs from
   * inside delayed callbacks, so a restore that only calls setState leaves the
   * AI playing the previous run's cards. Nothing mid-trick is rebuilt - the
   * table comes back clear, at a position the rules allow.
   */
  const handleResumeRun = () => {
    const restored = resumableRun;
    if (!restored) return;
    const snap = restored.snapshot;

    setRunRngState(snap.rng);

    setVictoryMode(snap.victoryMode);
    setSelectedDeck(restored.deck);
    setAnte(snap.ante);
    setRound(snap.round);
    setBossesDefeated(snap.bossesDefeated);
    setMoney(snap.money);
    moneyRef.current = snap.money;
    setScoreLedger((ledger) => ({
      ...ledger,
      totalScore: snap.totalScore,
      totalTricksWon: snap.totalTricksWon,
      totalTricksLost: snap.totalTricksLost,
      totalBriscolaPointsPlayer: snap.totalBriscolaPointsPlayer,
      totalBriscolaPointsOpponent: snap.totalBriscolaPointsOpponent,
      totalMoneyEarned: snap.totalMoneyEarned,
    }));
    const restoredPhase = snap.runPhase ?? 'campaign';
    setRunPhase(restoredPhase);
    runPhaseRef.current = restoredPhase;
    const pendingVictory = snap.pendingVictory ?? null;
    setCampaignVictory(restoredPhase === 'endless' || pendingVictory !== null);
    setEndlessOffer(pendingVictory);
    anteRef.current = snap.ante;
    setMaxJokers(snap.maxJokers);
    maxJokersRef.current = snap.maxJokers;
    setMaxConsumables(snap.maxConsumables);
    maxConsumablesRef.current = snap.maxConsumables;
    setRunDeck(snap.runDeck);
    activeJokersRef.current = snap.activeJokers;
    setActiveJokers(snap.activeJokers);
    consumablesRef.current = snap.consumables;
    setConsumables(snap.consumables);
    vouchersRef.current = snap.vouchers;
    setVouchers(snap.vouchers);
    // A shop snapshot without a shelf still has to open a shop.
    setShopState(
      snap.shop ?? { seed: Math.floor(randomRun() * 0x7fffffff), rerolls: 0, boughtKeys: [] }
    );
    // The visit resumes where it was: what has already been spent, and which
    // Jolly the Conto Sospeso has already paid out for it.
    shopSpentRef.current = snap.shop?.spent ?? 0;
    contoSospesoPaidRef.current = new Set(snap.shop?.contoSospesoPaidIds ?? []);

    // Everything purely visual starts from zero: a restore is a stable
    // position, not a replayed animation frame.
    setRoundSummary(null);
    setGameOverSummary(null);
    setCastingUno(null);
    setTallyData(null);
    setPlayerTrickCard(null);
    setOpponentTrickCard(null);
    setTriggeringJokerId(null);
    setIsDealing(false);
    activeUnoMultiplierRef.current = 1.0;
    isReverseActiveRef.current = false;
    forcedTrickWinRef.current = false;
    playGuardRef.current = false;
    tallyGuardRef.current = false;
    hideStoredRun();
    setPendingConfirm(null);

    // Standing on the Ante 8 offer: back to the question, nothing else.
    if (pendingVictory) {
      setPhase('game_over');
      return;
    }

    const encounter = snap.encounter;
    if (snap.phase !== 'playing' || !encounter) {
      if (snap.phase === 'shop') {
        setPhase('shop');
      } else {
        setPendingRound({
          ante: snap.ante,
          round: snap.round,
          deck: restored.deck,
          runDeck: snap.runDeck,
        });
        setPhase('blind_select');
      }
      return;
    }

    // Refs first, always.
    playerHandRef.current = encounter.playerHand;
    opponentHandRef.current = encounter.opponentHand;
    drawPileRef.current = encounter.drawPile;
    trumpCardRef.current = encounter.trumpCard;
    briscolaSuitRef.current = encounter.briscolaSuit;
    activeBossRef.current = restored.boss;
    bossDebuffNeutralizedRef.current = encounter.bossDebuffNeutralized;
    bossShieldTricksRef.current = encounter.bossShieldTricks;
    playedCardsRef.current = restored.playedCards;
    lastWinningSuitRef.current = encounter.lastWinningSuit;
    opponentProfileRef.current = getAiProfile(
      getOpponentIntro(snap.ante, snap.round).aiProfileId
    );

    setPlayerHand(encounter.playerHand);
    setOpponentHand(encounter.opponentHand);
    setDrawPile(encounter.drawPile);
    setTrumpCard(encounter.trumpCard);
    setBriscolaSuit(encounter.briscolaSuit);
    setActiveBoss(restored.boss);
    setBossDebuffNeutralized(encounter.bossDebuffNeutralized);
    setBossShieldTricks(encounter.bossShieldTricks);
    setTargetScore(encounter.targetScore);
    setScoreLedger((ledger) => ({
      ...ledger,
      currentRoundScore: encounter.currentRoundScore,
      roundPointsTaken: encounter.roundPointsTaken,
      opponentPointsTaken: encounter.opponentPointsTaken,
      roundTricksWon: encounter.roundTricksWon,
      roundTricksLost: encounter.roundTricksLost,
    }));
    setTricksPlayedInRound(encounter.tricksPlayedInRound);
    setCapturedDenariRanksThisRound(restored.capturedDenariRanks);
    setConsecutiveWinStreak(encounter.consecutiveWinStreak);
    setConsecutiveLossStreak(encounter.consecutiveLossStreak ?? 0);
    setDiscardsLeft(encounter.discardsLeft);

    // Derived from the boss and the position, never stored: two copies of the
    // same fact are one copy too many.
    const enforcedBoss = encounter.bossDebuffNeutralized ? null : restored.boss;
    setForcedLeadSuit(
      BOSS_RULES.getForcedLeadSuit(enforcedBoss, encounter.lastWinningSuit, encounter.playerHand)
    );
    setDisabledJokerIndex(
      BOSS_RULES.getSilencedJokerIndex(
        enforcedBoss,
        encounter.tricksPlayedInRound,
        snap.activeJokers.length
      )
    );

    setIsPlayerTurn(encounter.isPlayerTurn);
    setTrickLeadIsPlayer(encounter.isPlayerTurn);
    dispatchTrickFlow({ type: 'RESET' });
    setOpponentSpeech(
      restored.boss ? restored.boss.bossQuote : 'Riprendiamo da dove avevamo lasciato.'
    );
    setPhase('playing');

    // The snapshot was taken before this lead was played, so replaying it is
    // the position resuming, not an action happening twice.
    if (!encounter.isPlayerTurn) {
      scheduleAction(() => {
        triggerOpponentLead(encounter.opponentHand, encounter.briscolaSuit);
      }, beat(700));
    }
  };

  /** Throws the stored run away. Permanent progress is untouched. */
  const handleAbandonRun = () => {
    clearStoredRun();
    setPendingConfirm(null);
    sound.playCardFlick();
  };

  /** Deals the round the reveal screen was announcing. */
  const handleSitDown = () => {
    if (!pendingRound) return;
    initRound(pendingRound.ante, pendingRound.round, pendingRound.deck, pendingRound.runDeck);
    setPendingRound(null);
    setPhase('playing');
  };

  function writeRunSnapshot(phaseForSave: Parameters<typeof serializeRun>[0]['phase']) {
    saveRunSnapshot(
      serializeRun({
        phase: phaseForSave,
        deck: selectedDeck,
        victoryMode,
        runPhase,
        ante,
        round,
        money,
        totalScore,
        totalTricksWon,
        totalTricksLost,
        totalBriscolaPointsPlayer,
        totalBriscolaPointsOpponent,
        totalMoneyEarned,
        bossesDefeated,
        maxJokers,
        maxConsumables,
        runDeck,
        activeJokers,
        consumables,
        vouchers,
        rng: getRunRngState(),
        shop:
          phaseForSave === 'shop' && shopState
            ? {
                ...shopState,
                spent: shopSpentRef.current,
                contoSospesoPaidIds: [...contoSospesoPaidRef.current],
              }
            : null,
        pendingVictory: endlessOffer,
        encounter:
          phaseForSave === 'playing'
            ? {
                playerHand,
                opponentHand,
                drawPile,
                trumpCard,
                briscolaSuit,
                targetScore,
                currentRoundScore,
                roundPointsTaken,
                opponentPointsTaken,
                roundTricksWon,
                roundTricksLost,
                tricksPlayedInRound,
                capturedDenariRanks: capturedDenariRanksThisRound,
                consecutiveWinStreak,
                consecutiveLossStreak,
                discardsLeft,
                isPlayerTurn,
                boss: activeBoss,
                bossDebuffNeutralized,
                bossShieldTricks,
                lastWinningSuit: lastWinningSuitRef.current,
                playedCards: playedCardsRef.current,
              }
            : null,
      })
    );
  }

  return (
    <CardChipsProvider enabled={settings.showCardChips !== false}>
      <div
        // overflow-x-hidden would force overflow-y to `auto`, turning this into a
        // scroll box that clips the table instead of letting the page grow.
        // dvh, not vh: on a phone `100vh` is the viewport as it would be with
        // the browser chrome hidden, so a shell floored at 100vh is taller than
        // what is actually visible and the page scrolls by exactly the height of
        // the address bar. Every inner screen already measures itself in dvh.
        className={`min-h-[100dvh] w-full bar-table text-amber-50 flex flex-col justify-between overflow-x-clip relative ${
          settings.crtScanlines ? 'crt-overlay' : ''
        } ${shakeTier > 0 ? `table-shake-${shakeTier}` : ''}`}
      >
        {/* The lamp over the table. A boss makes the bulb stutter. */}
        <div
          className={`fixed inset-0 pointer-events-none bar-lamp transition-opacity duration-700 ${
            phase === 'title' ? 'opacity-0' : 'opacity-100'
          } ${activeBoss ? 'bar-lamp--flicker' : ''}`}
        />
        <div className="fixed inset-0 pointer-events-none bar-vignette" />

        {/* TITLE SCREEN VIEW */}
        {phase === 'title' && (
          <TitleScreen
            titleHand={titleHand}
            highScore={highScore}
            saveNotice={saveNotice}
            resumableAnte={resumableRun?.snapshot.ante ?? null}
            isStandalone={isStandalone}
            onResume={() => {
              sound.playCardFlick();
              handleResumeRun();
            }}
            onNewRun={() => {
              sound.playCardFlick();
              if (resumableRun) setPendingConfirm('new_run');
              else setShowDeckSelect(true);
            }}
            onAbandon={() => {
              sound.playCardFlick();
              setPendingConfirm('abandon');
            }}
            onOpenTutorial={() => {
              sound.playCardFlick();
              setShowTutorial(true);
            }}
            onOpenSettings={() => {
              sound.playCardFlick();
              setShowSettings(true);
            }}
            onInstall={() => {
              sound.playCardFlick();
              void handleInstallApp();
            }}
          />
        )}

        {/* OPPONENT REVEAL, BEFORE THE DEAL */}
        {phase === 'blind_select' && pendingRound && (
          <BlindSelectView
            ante={pendingRound.ante}
            round={pendingRound.round}
            money={money}
            deckMultiplier={
              pendingRound.deck.specialDeckPerk === 'high_stakes_vision' ? 1.25 : 1
            }
            victoryMode={victoryMode}
            endlessBoss={
              isEndlessAnte(pendingRound.ante)
                ? endlessBossForAnte(pendingRound.ante, getRunRngState().seed).boss
                : null
            }
            onSitDown={handleSitDown}
          />
        )}

        {/* ACTIVE MATCH VIEW */}
        {phase === 'playing' && (
          <GameTable
            model={{
              hud: {
                ante,
                round,
                targetScore,
                currentRoundScore,
                money,
                discardsLeft,
                briscolaSuit,
                deckCount: drawPile.length,
                roundPointsTaken,
                opponentPointsTaken,
                tricksPlayedInRound,
              },
              cards: {
                trumpCard,
                playerHand,
                opponentHand,
                playerTrickCard,
                opponentTrickCard,
              },
              interaction: {
                isPlayerTurn:
                  isPlayerTurn &&
                  trickPhase !== 'resolving' &&
                  trickPhase !== 'tally' &&
                  !isDealing,
                canPlay:
                  (trickPhase === 'idle' || trickPhase === 'waiting_player_follow') &&
                  isPlayerTurn &&
                  playerTrickCard === null &&
                  !isDealing,
                canDiscard: canDiscardCardNow({
                  discardsLeft,
                  trickPhase,
                  isPlayerTurn,
                  drawPileCount: drawPile.length,
                  playerCardAlreadyPlayed: playerTrickCard !== null,
                }),
                canUseSola:
                  (trickPhase === 'idle' || trickPhase === 'waiting_player_follow') &&
                  isPlayerTurn &&
                  !castingUno,
                trickLeadIsPlayer,
                isDealing,
                visionActive:
                  tricksPlayedInRound === 0 &&
                  activeJokers.some((joker) => joker.id === 'j_specchietto_baro'),
              },
              build: {
                activeJokers,
                consumables,
                maxJokers,
                triggeringJokerId,
              },
              encounter: {
                currentBoss: activeBoss,
                bossDebuffNeutralized,
                bossShieldTricks,
                forcedLeadSuit,
                silencedJokerIndex: disabledJokerIndex,
                victoryMode,
                opponentSpeech,
              },
            }}
            actions={{
              onPlayCard: handlePlayCard,
              onDiscardCard: handleDiscardCard,
              onUseUnoCard: handleUseUnoCard,
              onOpenDeckViewer: () => setShowDeckViewer(true),
              onOpenTutorial: () => setShowTutorial(true),
              onOpenSettings: () => setShowSettings(true),
            }}
          />
        )}

        {/* SHOP VIEW BETWEEN ROUNDS */}
        {phase === 'shop' && shopState && (
          <ShopView
            model={{
              build: {
                money,
                jokers: activeJokers,
                consumables,
                vouchers,
                maxJokers,
                maxConsumables,
              },
              visit: {
                slotRules: getSlotRulesForAnte(ante),
                runDeck,
                ante,
                round,
                shopState,
              },
            }}
            actions={{
              onBuyJoker: handleBuyJoker,
              onBuyUnoCard: handleBuyUnoCard,
              onBuyVoucher: handleBuyVoucher,
              onSellJoker: handleSellJoker,
              onSellUnoCard: handleSellUnoCard,
              onBuyJokerSlot: handleBuyJokerSlot,
              onBuyConsumableSlot: handleBuyConsumableSlot,
              onUpgradeCard: handleUpgradeCard,
              onNextRound: handleNextRoundFromShop,
              onReroll: spendMoney,
              onShopStateChange: handleShopStateChange,
            }}
          />
        )}

        {/* SCORE TALLY OVERLAY ON TRICK CLASH */}
        {tallyData && (
          <ScoreTallyOverlay
            chips={tallyData.chips}
            mult={tallyData.mult}
            finalScore={tallyData.finalScore}
            trickPoints={tallyData.trickPoints}
            playerWon={tallyData.playerWon}
            multReasons={tallyData.scoreResult?.baseMultReasons}
            steps={tallyData.scoreResult?.steps}
            onImpact={triggerScreenShake}
            baseChips={tallyData.scoreResult?.baseChips}
            baseMult={tallyData.scoreResult?.baseMult}
            fastMode={settings.fastMode}
            onComplete={handleTallyComplete}
            targetScore={targetScore}
            currentTotalScore={currentRoundScore}
            playerBriscolaPoints={
              roundPointsTaken + (tallyData.playerWon ? tallyData.trickPoints : 0)
            }
            opponentBriscolaPoints={
              opponentPointsTaken + (tallyData.playerWon ? 0 : tallyData.trickPoints)
            }
          />
        )}

        {/* ROUND SUMMARY MODAL */}
        <RoundSummaryModal
          isOpen={roundSummary !== null}
          data={roundSummary}
          onContinue={handleContinueFromRoundSummary}
        />

        {/* ANTE 8 CLEARED: cash out, or double the stake. */}
        <EndlessOfferModal
          isOpen={phase === 'game_over' && endlessOffer !== null}
          nextAnte={CAMPAIGN_FINAL_ANTE + 1}
          totalScore={endlessOffer?.totalScore ?? 0}
          onClose={handleCloseCampaign}
          onDouble={handleDoubleDown}
        />

        {/* GAME OVER / VICTORY MODAL */}
        {gameOverSummary && !endlessOffer && (
          <GameOverModal
            isOpen={phase === 'game_over'}
            summary={gameOverSummary}
            onPlayAgain={() => startNewRun(selectedDeck)}
            onChangeDeck={() => {
              setPhase('title');
              setShowDeckSelect(true);
            }}
          />
        )}

        {/* MODALS */}
        <TutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
        />

        <DeckSelectModal
          isOpen={showDeckSelect}
          onClose={() => setShowDeckSelect(false)}
          unlockedDeckIds={unlockedDeckIds}
          onSelectDeck={handleDeckChosen}
        />

        <VictoryModeSelectModal
          isOpen={pendingDeck !== null}
          deck={pendingDeck}
          highScores={highScores}
          onBack={() => {
            setPendingDeck(null);
            setShowDeckSelect(true);
          }}
          onSelect={(mode) => {
            const deck = pendingDeck;
            setPendingDeck(null);
            if (deck) startNewRun(deck, mode);
          }}
        />

        <DeckViewerModal
          isOpen={showDeckViewer}
          onClose={() => setShowDeckViewer(false)}
          deck={phase === 'playing' ? [...drawPile, ...(trumpCard ? [trumpCard] : []), ...playerHand] : runDeck}
          briscolaSuit={briscolaSuit}
        />

        <UnoCastOverlay
          card={castingUno?.unoCard ?? null}
          fast={settings.fastMode}
          onImpact={() => {
            if (castingUno) {
              applyUnoCard(castingUno.unoCard, castingUno.targetCard, castingUno.chosenSuit);
            }
          }}
          onDone={() => setCastingUno(null)}
        />

        <RunConfirmationModal
          confirmation={pendingConfirm}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={(confirmation) => {
            handleAbandonRun();
            if (confirmation === 'new_run') setShowDeckSelect(true);
          }}
        />

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          highScore={highScore}
          unlockedDeckCount={unlockedDeckIds.length}
          totalDeckCount={ALL_DECKS.length}
        />

        {/* DEV DEBUG UTILITY */}
        <DevDebugDrawer
          onAddMoney={(amount) => setMoney((m) => m + amount)}
          onAddScore={(amount) =>
            setScoreLedger((ledger) => ({
              ...ledger,
              currentRoundScore: ledger.currentRoundScore + amount,
            }))
          }
          onAddDiscards={(amount) => setDiscardsLeft((d) => d + amount)}
          onAddJoker={(joker) => {
            if (activeJokers.length < maxJokers) {
              setActiveJokers((prev) => [...prev, instantiateJoker(joker)]);
            }
          }}
          onAddUnoCard={(unoCard) => {
            if (consumables.length < maxConsumables) {
              setConsumables((prev) => [...prev, instantiateUnoCard(unoCard)]);
            }
          }}
          onSetBoss={(boss) => {
            setActiveBoss(boss);
            setOpponentSpeech(boss.bossQuote);
          }}
          onJumpToEndgame={() => {
            // Leave an EVEN number of drawable cards (stock + face-up trump), or
            // the two hands end the round with different sizes.
            const target = trumpCard ? 3 : 4;
            if (drawPile.length > target) {
              const trimmed = drawPile.slice(0, target);
              drawPileRef.current = trimmed;
              setDrawPile(trimmed);
            }
          }}
          onWinRound={() => {
            setScoreLedger((ledger) => ({
              ...ledger,
              currentRoundScore: ledger.currentRoundScore + targetScore,
            }));
          }}
          victoryMode={victoryMode}
          onSetVictoryMode={(mode) => {
            setVictoryMode(mode);
            try {
              localStorage.setItem('briscolatro_victory_mode', mode);
            } catch {}
          }}
          onForceOutcome={(chips, briscola) => {
            // Drops the round straight into one of the four corners of the two
            // conditions, so every mode's verdict can be seen in a few clicks.
            setScoreLedger((ledger) => ({
              ...ledger,
              currentRoundScore: chips ? targetScore : 0,
              roundPointsTaken: briscola ? 61 : 40,
              opponentPointsTaken: briscola ? 59 : 80,
            }));
          }}
          onGiveSpecial={(special) => {
            const target = playerHandRef.current[0];
            if (!target) return;
            const stamped = { ...target, special };
            playerHandRef.current = [stamped, ...playerHandRef.current.slice(1)];
            setPlayerHand(playerHandRef.current);
            // The run deck holds the same identity: keep the two in step.
            setRunDeck((prev) =>
              prev.map((c) =>
                c.suit === target.suit && c.rank === target.rank ? { ...c, special } : c
              )
            );
          }}
          onChangeBriscola={(suit) => {
            setBriscolaSuit(suit);
          }}
        />
      </div>
    </CardChipsProvider>
  );
}

export default App;
