import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  prepareRoundDeck,
  performExchangeDiscard,
  drawNextTrickCards,
  isRoundFinished,
  applyTrickResult,
  calculateRoundOutcome,
  RoundStateSnapshot,
} from './game/gameState';
import { resolveTrick } from './game/briscola';
import { BOSS_RULES } from './game/bossRules';
import { JOKER_EFFECTS } from './game/jokerEffects';
import { calculateTrickScore, TrickScoreCalculation } from './game/scoring';
import { executeUnoCard } from './game/unoEffects';
import { sound } from './services/soundEngine';

import { GameTable } from './components/GameTable';
import { ShopView } from './components/ShopView';
import { ScoreTallyOverlay } from './components/ScoreTallyOverlay';
import { RoundSummaryModal, RoundSummaryData } from './components/RoundSummaryModal';
import { GameOverModal, GameOverSummaryData } from './components/GameOverModal';
import { TutorialModal } from './components/TutorialModal';
import { DeckSelectModal } from './components/DeckSelectModal';
import { DeckViewerModal } from './components/DeckViewerModal';
import { SettingsModal } from './components/SettingsModal';
import { DevDebugDrawer } from './components/DevDebugDrawer';
import { CardStyleProvider } from './context/CardStyleContext';
import { GameSettings } from './types/game';

export type TrickPhase =
  | 'idle'
  | 'waiting_player_follow'
  | 'resolving'
  | 'tally'
  | 'drawing'
  | 'round_end';

export function App() {
  // --- Persistent Settings ---
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('briscolatro_settings');
      return saved
        ? JSON.parse(saved)
        : {
            soundEnabled: true,
            musicEnabled: true,
            sfxVolume: 80,
            musicVolume: 50,
            crtScanlines: false,
            screenShake: true,
            fastMode: false,
            cardStyle: 'classic',
          };
    } catch {
      return {
        soundEnabled: true,
        musicEnabled: true,
        sfxVolume: 80,
        musicVolume: 50,
        crtScanlines: false,
        screenShake: true,
        fastMode: false,
        cardStyle: 'classic',
      };
    }
  });

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('briscolatro_settings', JSON.stringify(updated));
      } catch {}
      if (updated.sfxVolume !== undefined) {
        sound.setSfxVolume(updated.soundEnabled ? updated.sfxVolume / 100 : 0);
      }
      if (updated.musicVolume !== undefined) {
        sound.setMusicVolume(updated.musicEnabled ? updated.musicVolume / 100 : 0);
      }
      return updated;
    });
  };

  // --- PWA Installation & Navigation ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowSettings(true);
    }
  };

  // --- Meta Progression (Persisted) ---
  const [unlockedDeckIds, setUnlockedDeckIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('briscolatro_unlocked_decks');
      return saved ? JSON.parse(saved) : ['deck_napoletano', 'deck_bastoni'];
    } catch {
      return ['deck_napoletano', 'deck_bastoni'];
    }
  });

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('briscolatro_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });

  // --- Run State ---
  const [phase, setPhase] = useState<GamePhase>('title');
  const [selectedDeck, setSelectedDeck] = useState<DeckDefinition>(ALL_DECKS[0]);
  const [ante, setAnte] = useState<number>(1);
  const [round, setRound] = useState<number>(1); // 1 = Small Blind, 2 = Big Blind, 3 = Boss
  const [money, setMoney] = useState<number>(4);
  const [discardsLeft, setDiscardsLeft] = useState<number>(1);
  const [targetScore, setTargetScore] = useState<number>(300);
  const [currentRoundScore, setCurrentRoundScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [totalTricksWon, setTotalTricksWon] = useState<number>(0);
  const [totalTricksLost, setTotalTricksLost] = useState<number>(0);
  const [totalBriscolaPointsPlayer, setTotalBriscolaPointsPlayer] = useState<number>(0);
  const [totalBriscolaPointsOpponent, setTotalBriscolaPointsOpponent] = useState<number>(0);
  const [totalMoneyEarned, setTotalMoneyEarned] = useState<number>(0);

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
  const [roundPointsTaken, setRoundPointsTaken] = useState<number>(0);
  const [opponentPointsTaken, setOpponentPointsTaken] = useState<number>(0);
  const [roundTricksWon, setRoundTricksWon] = useState<number>(0);
  const [roundTricksLost, setRoundTricksLost] = useState<number>(0);
  const [activeBoss, setActiveBoss] = useState<BossBlind | null>(null);
  const [opponentSpeech, setOpponentSpeech] = useState<string>('Che vinca il migliore al tavolo!');

  // --- Jokers, Consumables & Vouchers ---
  const [activeJokers, setActiveJokers] = useState<Joker[]>([]);
  const [consumables, setConsumables] = useState<UnoCard[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [maxJokers, setMaxJokers] = useState<number>(5);
  const [maxConsumables, setMaxConsumables] = useState<number>(2);
  const [triggeringJokerId, setTriggeringJokerId] = useState<string | null>(null);

  // --- Trick State Machine & Scoring ---
  const [trickPhase, setTrickPhase] = useState<TrickPhase>('idle');
  const [disabledJokerIndex, setDisabledJokerIndex] = useState<number | null>(null);
  const [activeUnoMultiplier, setActiveUnoMultiplier] = useState<number>(1.0);
  const [isReverseActive, setIsReverseActive] = useState<boolean>(false);
  const [tricksPlayedInRound, setTricksPlayedInRound] = useState<number>(0);
  const [consecutiveWinStreak, setConsecutiveWinStreak] = useState<number>(0);
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
  const [showDeckViewer, setShowDeckViewer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Timers cleanup ref
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const scheduleAction = useCallback((fn: () => void, delayMs: number) => {
    const timer = setTimeout(fn, delayMs);
    activeTimersRef.current.push(timer);
    return timer;
  }, []);

  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const triggerScreenShake = () => {
    if (!settings.screenShake) return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
  };

  // --- Initialize Match Round ---
  const initRound = (
    currentAnte: number,
    currentRoundNum: number,
    deckDef: DeckDefinition = selectedDeck,
    currentRunDeck: PlayingCard[] = runDeck
  ) => {
    setCurrentRoundScore(0);
    setRoundPointsTaken(0);
    setOpponentPointsTaken(0);
    setRoundTricksWon(0);
    setRoundTricksLost(0);
    setRoundSummary(null);
    setPlayerTrickCard(null);
    setOpponentTrickCard(null);
    setTricksPlayedInRound(0);
    setConsecutiveWinStreak(0);
    setCapturedDenariRanksThisRound(new Set());
    setActiveUnoMultiplier(1.0);
    setIsReverseActive(false);
    setTallyData(null);

    // Calculate Target Score for this round
    let baseTarget = 300 * Math.pow(1.8, currentAnte - 1);
    if (currentRoundNum === 2) baseTarget *= 1.4;
    if (currentRoundNum === 3) baseTarget *= 1.8;
    if (deckDef.specialDeckPerk === 'high_stakes_vision') baseTarget *= 1.25;

    // Check if Boss round (Round 3)
    let bossToSet: BossBlind | null = null;
    if (currentRoundNum === 3) {
      bossToSet = ALL_BOSS_BLINDS.find((b) => b.ante === currentAnte) || ALL_BOSS_BLINDS[0];
      baseTarget *= BOSS_RULES.getTargetScoreMultiplier(bossToSet);
      setActiveBoss(bossToSet);
      setOpponentSpeech(bossToSet.bossQuote);
      sound.playBossAlarm();
    } else {
      setActiveBoss(null);
      const normalQuotes = [
        'Vediamo cosa sai fare con queste carte!',
        'Sul tavolo del Bar Sport non si fanno sconti.',
        'Pronto a perdere la posta in gioco?',
        'Oggi ho pescato un mazzo fortunato!',
      ];
      setOpponentSpeech(normalQuotes[Math.floor(Math.random() * normalQuotes.length)]);
    }

    const finalTarget = Math.round(baseTarget);
    setTargetScore(finalTarget);

    // Reset Discards
    const extraScarto = vouchers.some((v) => v.id === 'v_scarto' && v.bought) ? 1 : 0;
    const jokerExtraDiscards = JOKER_EFFECTS.getExtraDiscards(activeJokers);
    setDiscardsLeft(deckDef.startingDiscards + extraScarto + jokerExtraDiscards);

    // Prepare Round Deal from persistent runDeck
    const { roundDrawPile, trumpCard: dealTrump, briscolaSuit: dealSuit, playerHand: pHand, opponentHand: oHand } =
      prepareRoundDeck(currentRunDeck);

    setDrawPile(roundDrawPile);
    setTrumpCard(dealTrump);
    setBriscolaSuit(dealSuit);
    setPlayerHand(pHand);
    setOpponentHand(oHand);

    setDisabledJokerIndex(BOSS_RULES.getDisabledJokerIndex(bossToSet, activeJokers.length));
    setIsPlayerTurn(true);
    setTrickPhase('idle');
  };

  // --- Start a New Run ---
  const startNewRun = (deck: DeckDefinition = selectedDeck) => {
    setSelectedDeck(deck);
    setAnte(1);
    setRound(1);
    setMoney(deck.startingMoney);
    setDiscardsLeft(deck.startingDiscards);
    setCurrentRoundScore(0);
    setTotalScore(0);
    setTotalTricksWon(0);
    setTotalTricksLost(0);
    setTotalBriscolaPointsPlayer(0);
    setTotalBriscolaPointsOpponent(0);
    setTotalMoneyEarned(deck.startingMoney);
    setRoundSummary(null);
    setGameOverSummary(null);

    // Slots
    const initialMaxJokers = 5;
    const initialMaxConsumables = deck.specialDeckPerk === 'holo_figures' ? 3 : 2;
    setMaxJokers(initialMaxJokers);
    setMaxConsumables(initialMaxConsumables);

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
      if (found) startJokers.push({ ...found });
    });
    setActiveJokers(startJokers);
    setConsumables([]);

    // Create persistent Run Deck
    const newRunDeck = createRunDeck(deck);
    setRunDeck(newRunDeck);

    initRound(1, 1, deck, newRunDeck);
    setPhase('playing');
    sound.playCardFlick();
  };

  // --- Opponent Lead AI ---
  const triggerOpponentLead = useCallback(() => {
    if (opponentHand.length === 0) return;

    // AI selects a smart lead card (prefers low point liscia of non-briscola)
    let leadCandidates = opponentHand.filter((c) => c.suit !== briscolaSuit);
    if (leadCandidates.length === 0) leadCandidates = opponentHand;

    // Sort by lowest points then lowest power
    leadCandidates.sort((a, b) => a.points - b.points || a.power - b.power);
    const chosenCard = leadCandidates[0];

    const nextHand = opponentHand.filter((c) => c.id !== chosenCard.id);
    setOpponentHand(nextHand);
    setOpponentTrickCard(chosenCard);
    sound.playCardSlam();

    setIsPlayerTurn(true);
    setTrickPhase('waiting_player_follow');
  }, [opponentHand, briscolaSuit]);

  // --- Opponent Follow AI ---
  const triggerOpponentFollow = useCallback(
    (playerCardPlayed: PlayingCard) => {
      if (opponentHand.length === 0) return;

      // Smart Briscola follow logic
      const isPlayerBriscola = playerCardPlayed.suit === briscolaSuit;
      let chosenCard: PlayingCard;

      const sameSuitCards = opponentHand.filter((c) => c.suit === playerCardPlayed.suit);
      const briscolaCards = opponentHand.filter((c) => c.suit === briscolaSuit);
      const winningSameSuit = sameSuitCards.filter((c) => c.power > playerCardPlayed.power);

      if (!isPlayerBriscola) {
        if (winningSameSuit.length > 0) {
          // Take with cheapest winning same-suit card
          winningSameSuit.sort((a, b) => a.power - b.power);
          chosenCard = winningSameSuit[0];
        } else if (playerCardPlayed.points >= 10 && briscolaCards.length > 0) {
          // High carico from player: cut with lowest briscola!
          briscolaCards.sort((a, b) => a.power - b.power);
          chosenCard = briscolaCards[0];
        } else {
          // Throw lowest liscia of different suit
          const throwaways = opponentHand.filter((c) => c.suit !== briscolaSuit);
          if (throwaways.length > 0) {
            throwaways.sort((a, b) => a.points - b.points || a.power - b.power);
            chosenCard = throwaways[0];
          } else {
            const sorted = [...opponentHand].sort((a, b) => a.power - b.power);
            chosenCard = sorted[0];
          }
        }
      } else {
        // Player led with Briscola
        const winningBriscola = briscolaCards.filter((c) => c.power > playerCardPlayed.power);
        if (winningBriscola.length > 0) {
          winningBriscola.sort((a, b) => a.power - b.power);
          chosenCard = winningBriscola[0];
        } else {
          // Throw lowest non-briscola
          const nonBriscola = opponentHand.filter((c) => c.suit !== briscolaSuit);
          if (nonBriscola.length > 0) {
            nonBriscola.sort((a, b) => a.points - b.points || a.power - b.power);
            chosenCard = nonBriscola[0];
          } else {
            const sorted = [...opponentHand].sort((a, b) => a.power - b.power);
            chosenCard = sorted[0];
          }
        }
      }

      const nextHand = opponentHand.filter((c) => c.id !== chosenCard.id);
      setOpponentHand(nextHand);
      setOpponentTrickCard(chosenCard);
      sound.playCardSlam();

      // Proceed to trick resolution
      scheduleAction(() => {
        resolveCurrentClash(playerCardPlayed, chosenCard, true);
      }, 550);
    },
    [opponentHand, briscolaSuit, scheduleAction]
  );

  // --- Resolve Trick Clash ---
  const resolveCurrentClash = (
    playerCard: PlayingCard,
    oppCard: PlayingCard,
    leadIsPlayer: boolean
  ) => {
    setTrickPhase('resolving');

    const clash = resolveTrick(
      leadIsPlayer ? playerCard : oppCard,
      leadIsPlayer ? oppCard : playerCard,
      briscolaSuit,
      leadIsPlayer,
      activeBoss?.debuffType,
      isReverseActive
    );

    if (clash.playerWon) {
      sound.playTrickWin();
      triggerScreenShake();

      // Calculate score with Jokers and Boss debuffs
      const remainingTricks = Math.floor(drawPile.length / 2) + playerHand.length;
      const scoreResult = calculateTrickScore(
        playerCard,
        oppCard,
        clash,
        briscolaSuit,
        activeJokers,
        activeBoss,
        {
          money,
          playerHand,
          tricksWonThisRound: roundTricksWon,
          consecutiveWinStreak,
          totalTricksPlayedThisRound: tricksPlayedInRound,
          remainingTricksCount: remainingTricks,
          capturedDenariRanksThisRound,
        },
        activeUnoMultiplier,
        disabledJokerIndex
      );

      if (scoreResult.triggeredJokerIds.length > 0) {
        setTriggeringJokerId(scoreResult.triggeredJokerIds[0]);
        setTimeout(() => setTriggeringJokerId(null), 1200);
      }

      // If transmute triggered (Alchimista d'Oro), update a card in runDeck and playerHand
      if (scoreResult.transmutedCard) {
        const trans = scoreResult.transmutedCard;
        setRunDeck((prev) => {
          const idx = prev.findIndex((c) => c.suit !== 'denari');
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], suit: trans.suit, edition: trans.edition };
            return next;
          }
          return prev;
        });
      }

      setTallyData({
        chips: scoreResult.totalChips,
        mult: scoreResult.totalMult,
        finalScore: scoreResult.finalScore,
        trickPoints: clash.points,
        playerWon: true,
        scoreResult,
      });
    } else {
      sound.playTrickLose();
      setTallyData({
        chips: 0,
        mult: 1,
        finalScore: 0,
        trickPoints: clash.points,
        playerWon: false,
      });
    }

    setTrickPhase('tally');
  };

  // --- Tally Complete State Transition ---
  const handleTallyComplete = () => {
    if (!tallyData) return;

    const { playerWon, finalScore, trickPoints, scoreResult } = tallyData;
    const bonusDollars = scoreResult?.bonusDollars || 0;

    // Construct fresh snapshot
    const currentSnapshot: RoundStateSnapshot = {
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
      money,
      totalMoneyEarned,
      targetScore,
      ante,
      round,
      playerHand,
      opponentHand,
      drawPile,
      trumpCard,
      briscolaSuit,
      activeBoss,
      vouchers,
      activeJokers,
    };

    // 1. Update scores & money deterministically
    const nextSnapshot = applyTrickResult(
      currentSnapshot,
      playerWon,
      finalScore,
      trickPoints,
      bonusDollars
    );

    setCurrentRoundScore(nextSnapshot.currentRoundScore);
    setTotalScore(nextSnapshot.totalScore);
    setRoundPointsTaken(nextSnapshot.roundPointsTaken);
    setOpponentPointsTaken(nextSnapshot.opponentPointsTaken);
    setRoundTricksWon(nextSnapshot.roundTricksWon);
    setRoundTricksLost(nextSnapshot.roundTricksLost);
    setTotalTricksWon(nextSnapshot.totalTricksWon);
    setTotalTricksLost(nextSnapshot.totalTricksLost);
    setTotalBriscolaPointsPlayer(nextSnapshot.totalBriscolaPointsPlayer);
    setTotalBriscolaPointsOpponent(nextSnapshot.totalBriscolaPointsOpponent);
    setMoney(nextSnapshot.money);
    setTotalMoneyEarned(nextSnapshot.totalMoneyEarned);

    // Update Denari captured set
    if (playerWon) {
      setCapturedDenariRanksThisRound((prev) => {
        const next = new Set(prev);
        if (playerTrickCard?.suit === 'denari') next.add(playerTrickCard.rank);
        if (opponentTrickCard?.suit === 'denari') next.add(opponentTrickCard.rank);
        return next;
      });
      setConsecutiveWinStreak((s) => s + 1);
    } else {
      setConsecutiveWinStreak(0);
    }

    const newTricksPlayed = tricksPlayedInRound + 1;
    setTricksPlayedInRound(newTricksPlayed);

    // 2. Deal next cards
    const { newPlayerHand, newOpponentHand, newDrawPile, newTrumpCard } = drawNextTrickCards(
      playerWon,
      drawPile,
      trumpCard,
      playerHand,
      opponentHand
    );

    setPlayerHand(newPlayerHand);
    setOpponentHand(newOpponentHand);
    setDrawPile(newDrawPile);
    setTrumpCard(newTrumpCard);

    // Check boss rotating briscola
    if (BOSS_RULES.shouldRotateBriscola(newTricksPlayed, activeBoss)) {
      const newSuit = BOSS_RULES.getRotatedBriscolaSuit(briscolaSuit);
      setBriscolaSuit(newSuit);
      setOpponentSpeech(`La Fattucchiera ha cambiato la Briscola in ${newSuit.toUpperCase()}!`);
      sound.playBoosterRip();
    }

    // Reset trick variables
    setPlayerTrickCard(null);
    setOpponentTrickCard(null);
    setTallyData(null);
    setActiveUnoMultiplier(1.0);
    setIsReverseActive(false);

    // Pick new disabled joker if debuff active
    setDisabledJokerIndex(BOSS_RULES.getDisabledJokerIndex(activeBoss, activeJokers.length));

    // 3. Check if Round Finished
    const roundEnded = isRoundFinished(newPlayerHand, newOpponentHand, newDrawPile, newTrumpCard);

    if (roundEnded) {
      setTrickPhase('round_end');

      // Evaluate outcome
      const outcome = calculateRoundOutcome(nextSnapshot, highScore, unlockedDeckIds);

      if (outcome.newHighScore) {
        setHighScore(nextSnapshot.totalScore);
        try {
          localStorage.setItem('briscolatro_highscore', `${nextSnapshot.totalScore}`);
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
        sound.playVictoryFanfare();
        confetti({ particleCount: 70, spread: 80 });

        setMoney((m) => m + outcome.totalReward);
        setTotalMoneyEarned((m) => m + outcome.totalReward);

        const endRoundJokerBonus = JOKER_EFFECTS.getRoundEndBonusDollars(activeJokers, nextSnapshot.money);
        if (endRoundJokerBonus > 0) {
          setMoney((m) => m + endRoundJokerBonus);
        }

        setRoundSummary({
          ante,
          round,
          targetScore,
          achievedScore: nextSnapshot.currentRoundScore,
          playerTrickPoints: nextSnapshot.roundPointsTaken,
          opponentTrickPoints: nextSnapshot.opponentPointsTaken,
          playerTricksWon: nextSnapshot.roundTricksWon,
          opponentTricksWon: nextSnapshot.roundTricksLost,
          totalTricks: nextSnapshot.roundTricksWon + nextSnapshot.roundTricksLost,
          won: true,
          bossName: activeBoss?.name,
          bossAvatar: activeBoss?.avatar,
          cashEarned: outcome.baseReward,
          interestEarned: outcome.interest,
          capturedCarichi: [],
          activeJokersCount: activeJokers.length,
        });

        if (outcome.isAnte8Victory) {
          setGameOverSummary({
            won: true,
            ante,
            round,
            totalScore: nextSnapshot.totalScore,
            targetScore,
            totalTricksWon: nextSnapshot.totalTricksWon,
            totalTricksLost: nextSnapshot.totalTricksLost,
            totalBriscolaPointsPlayer: nextSnapshot.totalBriscolaPointsPlayer,
            totalBriscolaPointsOpponent: nextSnapshot.totalBriscolaPointsOpponent,
            finalMoney: nextSnapshot.money + outcome.totalReward,
            totalMoneyEarned: nextSnapshot.totalMoneyEarned + outcome.totalReward,
            jokersUsed: [...activeJokers],
            deckName: selectedDeck.name,
            newUnlockedDecks: outcome.newUnlockedDecks,
            isNewHighScore: outcome.newHighScore,
          });
        }
      } else {
        sound.playTrickLose();

        setRoundSummary({
          ante,
          round,
          targetScore,
          achievedScore: nextSnapshot.currentRoundScore,
          playerTrickPoints: nextSnapshot.roundPointsTaken,
          opponentTrickPoints: nextSnapshot.opponentPointsTaken,
          playerTricksWon: nextSnapshot.roundTricksWon,
          opponentTricksWon: nextSnapshot.roundTricksLost,
          totalTricks: nextSnapshot.roundTricksWon + nextSnapshot.roundTricksLost,
          won: false,
          bossName: activeBoss?.name,
          bossAvatar: activeBoss?.avatar,
          cashEarned: 0,
          interestEarned: 0,
          capturedCarichi: [],
          activeJokersCount: activeJokers.length,
        });

        setGameOverSummary({
          won: false,
          ante,
          round,
          totalScore: nextSnapshot.totalScore,
          targetScore,
          totalTricksWon: nextSnapshot.totalTricksWon,
          totalTricksLost: nextSnapshot.totalTricksLost,
          totalBriscolaPointsPlayer: nextSnapshot.totalBriscolaPointsPlayer,
          totalBriscolaPointsOpponent: nextSnapshot.totalBriscolaPointsOpponent,
          finalMoney: nextSnapshot.money,
          totalMoneyEarned: nextSnapshot.totalMoneyEarned,
          jokersUsed: [...activeJokers],
          deckName: selectedDeck.name,
          newUnlockedDecks: [],
          isNewHighScore: outcome.newHighScore,
          defeatReason: `Hai totalizzato ${nextSnapshot.currentRoundScore.toLocaleString()} punti (Target: ${targetScore.toLocaleString()}) e ${nextSnapshot.roundPointsTaken}/120 punti Briscola.`,
        });
      }
    } else {
      // Round continues!
      setIsPlayerTurn(playerWon);
      setTrickPhase('idle');

      if (!playerWon) {
        // Opponent's turn to lead
        scheduleAction(() => {
          triggerOpponentLead();
        }, 750);
      }
    }
  };

  // --- Player Plays Card ---
  const handlePlayCard = (card: PlayingCard) => {
    if (trickPhase !== 'idle' && trickPhase !== 'waiting_player_follow') return;
    if (playerTrickCard !== null) return;

    // Check Boss lead restriction (e.g. Alchimista Oscuro)
    if (opponentTrickCard === null) {
      const bossCheck = BOSS_RULES.canPlayerLeadCard(card, activeBoss);
      if (!bossCheck.allowed) {
        sound.playTrickLose();
        setOpponentSpeech(bossCheck.reason || 'Mossa non consentita!');
        return;
      }
    }

    sound.playCardSlam();

    const nextPlayerHand = playerHand.filter((c) => c.id !== card.id);
    setPlayerHand(nextPlayerHand);
    setPlayerTrickCard(card);

    if (opponentTrickCard === null) {
      // Player led first
      setIsPlayerTurn(false);
      setTrickPhase('resolving');

      scheduleAction(() => {
        triggerOpponentFollow(card);
      }, 650);
    } else {
      // Player responded to opponent's lead
      setTrickPhase('resolving');

      scheduleAction(() => {
        resolveCurrentClash(card, opponentTrickCard, false);
      }, 550);
    }
  };

  // --- Player Discards Card (Scarto as Exchange) ---
  const handleDiscardCard = (card: PlayingCard) => {
    if (discardsLeft <= 0 || trickPhase !== 'idle' || !isPlayerTurn) return;

    const res = performExchangeDiscard(card, playerHand, drawPile, trumpCard);
    if (res.success) {
      sound.playCardSelect();
      setPlayerHand(res.newPlayerHand);
      setDrawPile(res.newDrawPile);
      setTrumpCard(res.newTrumpCard);
      setDiscardsLeft((d) => Math.max(0, d - 1));
    }
  };

  // --- Use UNO Action Card ---
  const handleUseUnoCard = (unoCard: UnoCard, targetCard?: PlayingCard) => {
    sound.playBoosterRip();

    const ctx = {
      unoCard,
      targetCard,
      drawPile,
      playerHand,
      opponentHand,
      briscolaSuit,
      money,
      discardsLeft,
      activeJokers,
      maxJokers,
      currentRoundScore,
      bossDebuffActive: activeBoss !== null,
      activeUnoMultiplier,
      isReverseActive,
    };

    const res = executeUnoCard(ctx);

    setDrawPile(res.newDrawPile);
    setPlayerHand(res.newPlayerHand);
    setOpponentHand(res.newOpponentHand);
    setBriscolaSuit(res.newBriscolaSuit);
    setMoney(res.newMoney);
    setDiscardsLeft(res.newDiscardsLeft);
    setActiveJokers(res.newActiveJokers);
    setCurrentRoundScore(res.newRoundScore);
    setActiveUnoMultiplier(res.newActiveUnoMultiplier);
    setIsReverseActive(res.newIsReverseActive);
    setOpponentSpeech(res.feedbackMessage);

    // Apply permanent upgrade to runDeck if applicable
    if (res.cardUpgradedInRunDeck) {
      const up = res.cardUpgradedInRunDeck;
      setRunDeck((prev) =>
        prev.map((c) => (c.id === up.id ? { ...c, ...up.updates } : c))
      );
    }

    // Remove consumed UNO card
    setConsumables((prev) => prev.filter((u) => u.id !== unoCard.id));
  };

  // --- Round Summary Continue ---
  const handleContinueFromRoundSummary = () => {
    if (!roundSummary) return;

    if (roundSummary.won) {
      setRoundSummary(null);
      if (ante >= 8 && round === 3) {
        setPhase('game_over');
      } else {
        setPhase('shop');
      }
    } else {
      setRoundSummary(null);
      setPhase('game_over');
    }
  };

  // --- Shop Handlers ---
  const handleBuyJoker = (joker: Joker, cost: number) => {
    if (activeJokers.length >= maxJokers || money < cost) return;
    setMoney((m) => m - cost);
    setActiveJokers((prev) => [...prev, joker]);
  };

  const handleBuyUnoCard = (unoCard: UnoCard, cost: number) => {
    if (consumables.length >= maxConsumables || money < cost) return;
    setMoney((m) => m - cost);
    setConsumables((prev) => [...prev, unoCard]);
  };

  const handleBuyVoucher = (voucher: Voucher) => {
    if (money < voucher.cost) return;
    setMoney((m) => m - voucher.cost);
    setVouchers((prev) => [...prev, { ...voucher, bought: true }]);

    if (voucher.id === 'v_tavolo') {
      setMaxJokers(6);
    }
  };

  const handleSellJoker = (index: number) => {
    const joker = activeJokers[index];
    if (!joker) return;
    sound.playCashChime();
    setMoney((m) => m + joker.sellValue);
    setActiveJokers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSellUnoCard = (index: number) => {
    sound.playCashChime();
    setMoney((m) => m + 1);
    setConsumables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCardToDeck = (card: PlayingCard) => {
    setRunDeck((prev) => [card, ...prev]);
    setDrawPile((prev) => [card, ...prev]);
  };

  const handleNextRoundFromShop = () => {
    if (round >= 3) {
      setAnte((a) => a + 1);
      setRound(1);
      initRound(ante + 1, 1, selectedDeck, runDeck);
    } else {
      setRound((r) => r + 1);
      initRound(ante, round + 1, selectedDeck, runDeck);
    }
    setPhase('playing');
  };

  return (
    <CardStyleProvider style={settings.cardStyle || 'classic'}>
      <div
        className={`min-h-screen w-full bg-[#0b0f19] text-amber-50 flex flex-col justify-between overflow-x-hidden relative ${
          settings.crtScanlines ? 'crt-overlay' : ''
        } ${settings.screenShake && isShaking ? 'animate-bounce' : ''}`}
      >
        {/* Background Retro Canvas Atmosphere */}
        <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl plasma-bg" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl plasma-bg" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl plasma-bg" />
        </div>

        {/* TITLE SCREEN VIEW */}
        {phase === 'title' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
            <motion.div
              initial={{ scale: 0.85, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center max-w-lg w-full bg-slate-900/90 border-3 border-amber-500 rounded-3xl p-8 pixel-box shadow-2xl relative"
            >
              {/* Italian Card Suits Row */}
              <div className="flex gap-4 mb-3">
                <span className="text-3xl animate-bounce">🪙</span>
                <span className="text-3xl animate-bounce [animation-delay:0.1s]">🏆</span>
                <span className="text-3xl animate-bounce [animation-delay:0.2s]">⚔️</span>
                <span className="text-3xl animate-bounce [animation-delay:0.3s]">🪵</span>
              </div>

              {/* Game Logo */}
              <h1 className="font-pixel text-2xl sm:text-3xl text-amber-400 font-bold tracking-wider uppercase drop-shadow">
                BRISCOLATRO
              </h1>
              <p className="font-retro text-xs text-amber-200 mt-1 uppercase tracking-widest">
                IL ROGUELIKE DELLA BRISCOLA ITALIANA
              </p>

              {/* High score pill */}
              <div className="mt-4 bg-slate-950/80 border border-amber-500/60 px-4 py-1.5 rounded-full pixel-box text-xs font-pixel text-amber-300">
                MIGLIOR RECORD: {highScore.toLocaleString()} PUNTI
              </div>

              {/* Action Buttons Menu */}
              <div className="w-full space-y-3 mt-6">
                <button
                  onClick={() => {
                    sound.playCardFlick();
                    setShowDeckSelect(true);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-pixel text-sm font-bold py-3.5 rounded-xl pixel-box shadow-xl cursor-pointer transition-transform hover:scale-102 flex items-center justify-center gap-2"
                >
                  <span>GIOCA NUOVA PARTITA</span>
                  <span>➔</span>
                </button>

                <button
                  onClick={() => {
                    sound.playCardFlick();
                    setShowTutorial(true);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-pixel text-xs py-3 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📖 GUIDA & REGOLE BRISCOLA</span>
                </button>

                <button
                  onClick={() => {
                    sound.playCardFlick();
                    setShowSettings(true);
                  }}
                  className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-pixel text-xs py-2.5 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>⚙️ IMPOSTAZIONI & AUDIO</span>
                </button>

                {/* PWA Install Button (If not in standalone app mode) */}
                {!isStandalone && (
                  <button
                    onClick={() => {
                      sound.playCardFlick();
                      handleInstallApp();
                    }}
                    className="w-full bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/60 hover:border-emerald-400 text-emerald-300 font-pixel text-xs py-2.5 rounded-xl pixel-box cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-101 shadow-md"
                  >
                    <span>📲</span>
                    <span>INSTALLA SU SCHERMATA HOME</span>
                  </button>
                )}
              </div>

              {/* Footer Traditional Tag */}
              <div className="mt-6 pt-3 border-t border-slate-800 text-[10px] font-retro text-slate-400">
                Ispirato a Balatro & alla tradizione delle carte napoletane
              </div>
            </motion.div>
          </div>
        )}

        {/* ACTIVE MATCH VIEW */}
        {phase === 'playing' && (
          <GameTable
            ante={ante}
            round={round}
            targetScore={targetScore}
            currentRoundScore={currentRoundScore}
            money={money}
            discardsLeft={discardsLeft}
            handsLeft={3}
            briscolaSuit={briscolaSuit}
            trumpCard={trumpCard}
            deckCount={drawPile.length}
            playerHand={playerHand}
            opponentHand={opponentHand}
            playerTrickCard={playerTrickCard}
            opponentTrickCard={opponentTrickCard}
            isPlayerTurn={isPlayerTurn && trickPhase !== 'resolving' && trickPhase !== 'tally'}
            activeJokers={activeJokers}
            consumables={consumables}
            maxJokers={maxJokers}
            maxConsumables={maxConsumables}
            currentBoss={activeBoss}
            opponentSpeech={opponentSpeech}
            onPlayCard={handlePlayCard}
            onDiscardCard={handleDiscardCard}
            onUseUnoCard={handleUseUnoCard}
            onSellJoker={handleSellJoker}
            onSellUnoCard={handleSellUnoCard}
            onOpenDeckViewer={() => setShowDeckViewer(true)}
            onOpenTutorial={() => setShowTutorial(true)}
            onOpenSettings={() => setShowSettings(true)}
            triggeringJokerId={triggeringJokerId}
            roundPointsTaken={roundPointsTaken}
            totalPointsDeck={120}
          />
        )}

        {/* SHOP VIEW BETWEEN ROUNDS */}
        {phase === 'shop' && (
          <ShopView
            money={money}
            jokers={activeJokers}
            consumables={consumables}
            vouchers={vouchers}
            maxJokers={maxJokers}
            maxConsumables={maxConsumables}
            onBuyJoker={handleBuyJoker}
            onBuyUnoCard={handleBuyUnoCard}
            onBuyVoucher={handleBuyVoucher}
            onSellJoker={handleSellJoker}
            onSellUnoCard={handleSellUnoCard}
            onAddCardToDeck={handleAddCardToDeck}
            onNextRound={handleNextRoundFromShop}
            onReroll={(cost) => setMoney((m) => Math.max(0, m - cost))}
            ante={ante}
            round={round}
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
            onComplete={handleTallyComplete}
            targetScore={targetScore}
            currentTotalScore={currentRoundScore}
          />
        )}

        {/* ROUND SUMMARY MODAL */}
        <RoundSummaryModal
          isOpen={roundSummary !== null}
          data={roundSummary}
          onContinue={handleContinueFromRoundSummary}
        />

        {/* GAME OVER / VICTORY MODAL */}
        {gameOverSummary && (
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
          onSelectDeck={(deck) => {
            setShowDeckSelect(false);
            startNewRun(deck);
          }}
        />

        <DeckViewerModal
          isOpen={showDeckViewer}
          onClose={() => setShowDeckViewer(false)}
          deck={phase === 'playing' ? [...drawPile, ...(trumpCard ? [trumpCard] : []), ...playerHand] : runDeck}
          briscolaSuit={briscolaSuit}
        />

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />

        {/* DEV DEBUG UTILITY */}
        <DevDebugDrawer
          onAddMoney={(amount) => setMoney((m) => m + amount)}
          onAddScore={(amount) => setCurrentRoundScore((s) => s + amount)}
          onAddDiscards={(amount) => setDiscardsLeft((d) => d + amount)}
          onAddJoker={(joker) => {
            if (activeJokers.length < maxJokers) {
              setActiveJokers((prev) => [...prev, { ...joker }]);
            }
          }}
          onAddUnoCard={(unoCard) => {
            if (consumables.length < maxConsumables) {
              setConsumables((prev) => [...prev, { ...unoCard }]);
            }
          }}
          onSetBoss={(boss) => {
            setActiveBoss(boss);
            setOpponentSpeech(boss.bossQuote);
          }}
          onJumpToEndgame={() => {
            // Leave only 2 cards in deck to test endgame
            if (drawPile.length > 2) {
              setDrawPile((prev) => prev.slice(0, 2));
            }
          }}
          onWinRound={() => {
            setCurrentRoundScore((s) => s + targetScore);
          }}
          onChangeBriscola={(suit) => {
            setBriscolaSuit(suit);
          }}
        />
      </div>
    </CardStyleProvider>
  );
}

export default App;
