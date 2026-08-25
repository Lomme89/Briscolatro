/**
 * BRISCOLATRO - Roguelike Briscola Pixel Art
 * Ultra-dynamic Balatro-style single player Italian Briscola roguelike.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  PlayingCard,
  Suit,
  Joker,
  UnoCard,
  Voucher,
  BossBlind,
  DeckDefinition,
  GameSettings,
  GamePhase,
} from './types/game';
import { createStandardDeck, resolveTrick } from './data/cards';
import { ALL_DECKS } from './data/decks';
import { ALL_BOSS_BLINDS } from './data/bosses';
import { ALL_JOKERS } from './data/jokers';
import { ALL_UNO_CARDS } from './data/unoCards';
import { GameTable } from './components/GameTable';
import { ShopView } from './components/ShopView';
import { ScoreTallyOverlay } from './components/ScoreTallyOverlay';
import { TutorialModal } from './components/TutorialModal';
import { DeckSelectModal } from './components/DeckSelectModal';
import { DeckViewerModal } from './components/DeckViewerModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal, GameOverSummaryData } from './components/GameOverModal';
import { RoundSummaryModal, RoundSummaryData } from './components/RoundSummaryModal';
import { PixelSuitIcon } from './components/PixelSuitIcon';
import { sound } from './services/soundEngine';
import { CardStyleProvider } from './context/CardStyleContext';

export default function App() {
  // --- Game Settings ---
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('briscolatro_settings');
      if (saved) {
        return {
          soundEnabled: true,
          musicEnabled: false,
          sfxVolume: 0.6,
          musicVolume: 0.3,
          crtScanlines: true,
          screenShake: true,
          fastMode: false,
          cardStyle: 'classic',
          ...JSON.parse(saved),
        };
      }
    } catch {}
    return {
      soundEnabled: true,
      musicEnabled: false,
      sfxVolume: 0.6,
      musicVolume: 0.3,
      crtScanlines: true,
      screenShake: true,
      fastMode: false,
      cardStyle: 'classic',
    };
  });

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('briscolatro_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // --- Modals State ---
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDeckSelect, setShowDeckSelect] = useState(false);
  const [showDeckViewer, setShowDeckViewer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
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

  // --- Progression (Persisted) ---
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

  // --- Active Deck & Cards ---
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

  // --- Round Summary State ---
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(null);
  const [gameOverSummary, setGameOverSummary] = useState<GameOverSummaryData | null>(null);

  // --- Active Jokers & Consumables ---
  const [activeJokers, setActiveJokers] = useState<Joker[]>([]);
  const [consumables, setConsumables] = useState<UnoCard[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [maxJokers, setMaxJokers] = useState<number>(5);
  const [maxConsumables, setMaxConsumables] = useState<number>(2);
  const [triggeringJokerId, setTriggeringJokerId] = useState<string | null>(null);

  // --- Score Tally Overlay State ---
  const [tallyData, setTallyData] = useState<{
    chips: number;
    mult: number;
    finalScore: number;
    trickPoints: number;
    playerWon: boolean;
  } | null>(null);

  // --- Screen Shake Trigger ---
  const [isShaking, setIsShaking] = useState(false);

  const triggerScreenShake = () => {
    if (!settings.screenShake) return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
  };

  // --- Start a New Run ---
  const startNewRun = (deck: DeckDefinition = selectedDeck) => {
    setSelectedDeck(deck);
    setAnte(1);
    setRound(1);
    setMoney(deck.startingMoney);
    setDiscardsLeft(deck.startingDiscards);
    setTargetScore(300);
    setCurrentRoundScore(0);
    setTotalScore(0);
    setTotalTricksWon(0);
    setTotalTricksLost(0);
    setTotalBriscolaPointsPlayer(0);
    setTotalBriscolaPointsOpponent(0);
    setTotalMoneyEarned(deck.startingMoney);
    setRoundSummary(null);
    setGameOverSummary(null);
    setMaxJokers(5);
    setMaxConsumables(2);
    setVouchers([]);

    // Initialize starting jokers if any
    const startJokers: Joker[] = [];
    deck.startingJokers.forEach((jId) => {
      const found = ALL_JOKERS.find((j) => j.id === jId);
      if (found) startJokers.push({ ...found });
    });
    setActiveJokers(startJokers);
    setConsumables([]);

    initRound(1, 1, deck);
    setPhase('playing');
    sound.playCardFlick();
  };

  // --- Initialize a Match Round ---
  const initRound = (
    currentAnte: number,
    currentRoundNum: number,
    deckDef: DeckDefinition = selectedDeck
  ) => {
    setCurrentRoundScore(0);
    setRoundPointsTaken(0);
    setOpponentPointsTaken(0);
    setRoundTricksWon(0);
    setRoundTricksLost(0);
    setRoundSummary(null);
    setPlayerTrickCard(null);
    setOpponentTrickCard(null);

    // Calculate Target Score for this round
    let baseTarget = 300 * Math.pow(1.8, currentAnte - 1);
    if (currentRoundNum === 2) baseTarget *= 1.4;
    if (currentRoundNum === 3) baseTarget *= 1.8;
    if (deckDef.specialDeckPerk === 'high_stakes_vision') baseTarget *= 1.25;
    const finalTarget = Math.round(baseTarget);
    setTargetScore(finalTarget);

    // Check if Boss round (Round 3)
    if (currentRoundNum === 3) {
      const boss = ALL_BOSS_BLINDS.find((b) => b.ante === currentAnte) || ALL_BOSS_BLINDS[0];
      setActiveBoss(boss);
      setOpponentSpeech(boss.bossQuote);
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

    // Reset Discards
    const extraScarto = vouchers.some((v) => v.id === 'v_scarto' && v.bought) ? 1 : 0;
    setDiscardsLeft(deckDef.startingDiscards + extraScarto);

    // Generate and shuffle standard 40-card Italian deck
    let fullDeck = createStandardDeck();

    // Apply deck perks
    if (deckDef.specialDeckPerk === 'bastoni_foil') {
      let foilCount = 0;
      fullDeck = fullDeck.map((c) => {
        if (c.suit === 'bastoni' && foilCount < 3) {
          foilCount++;
          return { ...c, edition: 'foil' };
        }
        return c;
      });
    } else if (deckDef.specialDeckPerk === 'holo_figures') {
      fullDeck = fullDeck.map((c) => {
        if (c.rank >= 8) return { ...c, edition: 'holo' };
        return c;
      });
    }

    // Draw the Briscola trump card (1 card placed sideways under deck)
    const trump = fullDeck.pop()!;
    setTrumpCard(trump);
    setBriscolaSuit(trump.suit);

    // Deal 3 cards to Player and 3 cards to Opponent
    const pHand: PlayingCard[] = [];
    const oHand: PlayingCard[] = [];
    for (let i = 0; i < 3; i++) {
      if (fullDeck.length > 0) pHand.push(fullDeck.pop()!);
      if (fullDeck.length > 0) oHand.push(fullDeck.pop()!);
    }

    setPlayerHand(pHand);
    setOpponentHand(oHand);
    setDrawPile(fullDeck);
    setIsPlayerTurn(true);
  };

  // --- AI Opponent Move ---
  const makeAIMove = (currentOpponentHand: PlayingCard[], playerPlayed: PlayingCard | null) => {
    if (!currentOpponentHand || currentOpponentHand.length === 0) {
      checkRoundEnd();
      return;
    }

    let chosenCard: PlayingCard;

    if (playerPlayed) {
      // Opponent is answering player's card
      const effectiveBriscola = briscolaSuit;
      // Try to win the trick smartly!
      const winningCards = currentOpponentHand.filter((card) => {
        const res = resolveTrick(playerPlayed, card, effectiveBriscola, true, activeBoss?.debuffType);
        return !res.playerWon;
      });

      if (winningCards.length > 0) {
        // If player played a valuable Carico (Asso 11 or Tre 10), opponent will use best winning card!
        if (playerPlayed.points >= 10) {
          winningCards.sort((a, b) => b.power - a.power);
          chosenCard = winningCards[0];
          setOpponentSpeech('Quell\'Asso me lo porto via io!');
        } else {
          // If player played a small card, win with lowest winning card
          winningCards.sort((a, b) => a.power - b.power);
          chosenCard = winningCards[0];
        }
      } else {
        // Cannot win -> discard the weakest liscia
        const lisce = currentOpponentHand.filter((c) => c.suit !== effectiveBriscola);
        if (lisce.length > 0) {
          lisce.sort((a, b) => a.points - b.points);
          chosenCard = lisce[0];
        } else {
          chosenCard = currentOpponentHand[0];
        }
      }
    } else {
      // Opponent is leading the trick
      // Play a low liscia from non-briscola suit
      const nonBriscolaLisce = currentOpponentHand.filter(
        (c) => c.suit !== briscolaSuit && c.points === 0
      );
      if (nonBriscolaLisce.length > 0) {
        chosenCard = nonBriscolaLisce[Math.floor(Math.random() * nonBriscolaLisce.length)];
      } else {
        // Sort lowest points
        const sorted = [...currentOpponentHand].sort((a, b) => a.points - b.points);
        chosenCard = sorted[0];
      }
      setOpponentSpeech('Fatti sotto, tocca a te rispondere!');
    }

    setOpponentTrickCard(chosenCard);
    setOpponentHand((prev) => prev.filter((c) => c.id !== chosenCard.id));
    sound.playCardFlick();

    if (playerPlayed) {
      // Both cards are played! Resolve trick
      evaluateTrickClash(playerPlayed, chosenCard, true);
    } else {
      // Now it's player's turn to respond to opponent's lead
      setIsPlayerTurn(true);
    }
  };

  // --- Player Plays Card ---
  const handlePlayCard = (card: PlayingCard) => {
    if (!isPlayerTurn) return;

    sound.playCardFlick();
    if (card.suit === briscolaSuit) {
      sound.playTrumpSlam();
      triggerScreenShake();
    }

    setPlayerTrickCard(card);
    setPlayerHand((prev) => prev.filter((c) => c.id !== card.id));
    setIsPlayerTurn(false);

    if (opponentTrickCard) {
      // Player answered opponent's lead! Resolve trick
      evaluateTrickClash(opponentTrickCard, card, false);
    } else {
      // Player led the trick. Opponent responds after brief delay
      setTimeout(() => {
        makeAIMove(opponentHand, card);
      }, 700);
    }
  };

  // --- Player Discards Card ---
  const handleDiscardCard = (card: PlayingCard) => {
    if (discardsLeft <= 0) return;
    sound.playCardFlick();
    setDiscardsLeft((prev) => prev - 1);
    setPlayerHand((prev) => prev.filter((c) => c.id !== card.id));

    // Draw replacement if drawPile has cards or from trumpCard
    if (drawPile.length > 0) {
      const nextPile = [...drawPile];
      const newCard = nextPile.pop()!;
      setPlayerHand((prev) => [...prev, newCard]);
      setDrawPile(nextPile);
    } else if (trumpCard) {
      setPlayerHand((prev) => [...prev, trumpCard]);
      setTrumpCard(null);
    }
  };

  // --- Evaluate Trick Resolution & Balatro Scoring Formula ---
  const evaluateTrickClash = (
    leadCard: PlayingCard,
    followCard: PlayingCard,
    leadIsPlayer: boolean
  ) => {
    const playerCard = leadIsPlayer ? leadCard : followCard;
    const opponentCard = leadIsPlayer ? followCard : leadCard;

    const result = resolveTrick(
      leadCard,
      followCard,
      briscolaSuit,
      leadIsPlayer,
      activeBoss?.debuffType
    );

    // Scoring Engine: Calculate Base Chips & Multiplier
    let chips = 20 + result.points * 10; // e.g. 11pt Asso = 110 chips, 10pt Tre = 100 chips
    let mult = 1;

    // Apply Card Editions & Enhancements
    [playerCard, opponentCard].forEach((c) => {
      if (c.edition === 'foil') chips += 50;
      if (c.edition === 'holo') mult += 10;
      if (c.edition === 'polychrome') mult *= 1.5;
      if (c.edition === 'gold') setMoney((m) => m + 1);
    });

    // Check Boss Debuff
    if (activeBoss?.debuffType === 'no_lisce_chips' && result.points === 0) {
      chips = 5;
    }

    // Apply Active Jokers (Synergies!)
    if (result.playerWon) {
      activeJokers.forEach((joker) => {
        let didTrigger = false;

        // Il Carrettiere: +8 Mult on Bastoni
        if (
          joker.id === 'j_carrettiere' &&
          (playerCard.suit === 'bastoni' || opponentCard.suit === 'bastoni')
        ) {
          mult += joker.multBonus || 8;
          didTrigger = true;
        }

        // L'Orafo di Napoli: +35 Chips and +$1 per Denari
        if (
          joker.id === 'j_orafo' &&
          (playerCard.suit === 'denari' || opponentCard.suit === 'denari')
        ) {
          chips += joker.chipsBonus || 35;
          setMoney((m) => m + (joker.dollarsBonus || 1));
          didTrigger = true;
        }

        // Lo Spadaccino: +10 Mult on Spade
        if (joker.id === 'j_spadaccino' && playerCard.suit === 'spade') {
          mult += joker.multBonus || 10;
          didTrigger = true;
        }

        // La Cantina: +50 Chips on Coppe
        if (
          joker.id === 'j_cantina' &&
          (playerCard.suit === 'coppe' || opponentCard.suit === 'coppe')
        ) {
          chips += joker.chipsBonus || 50;
          didTrigger = true;
        }

        // Lo Sbaraglio: +14 Mult if won with a Liscia (0 pt)
        if (joker.id === 'j_sbaraglio' && playerCard.points === 0) {
          mult += joker.multBonus || 14;
          didTrigger = true;
        }

        // Briscola Folle: +60 Chips for each Briscola in trick
        if (joker.id === 'j_briscola_folle') {
          let count = 0;
          if (playerCard.suit === briscolaSuit) count++;
          if (opponentCard.suit === briscolaSuit) count++;
          if (count > 0) {
            chips += count * (joker.chipsBonus || 60);
            didTrigger = true;
          }
        }

        // Il Cacciatore di Carichi: x2.0 Mult if captured opponent's Asso (11) or Tre (10)
        if (joker.id === 'j_cacciatore_carichi' && opponentCard.points >= 10) {
          mult *= joker.xMultBonus || 2.0;
          didTrigger = true;
        }

        // Re Mida: +120 Chips and +$2 on Re
        if (
          joker.id === 'j_re_mida' &&
          (playerCard.rank === 10 || opponentCard.rank === 10)
        ) {
          chips += joker.chipsBonus || 120;
          setMoney((m) => m + (joker.dollarsBonus || 2));
          didTrigger = true;
        }

        // Il Jolly del Bar Sport: +1 Mult per $ possessed
        if (joker.id === 'j_jolly_sport') {
          mult += money;
          didTrigger = true;
        }

        // Il Tredici Fortunato: x3.5 Mult on 3, 7, 13 points
        if (
          joker.id === 'j_superstizione' &&
          [3, 7, 13].includes(result.points)
        ) {
          mult *= 3.5;
          didTrigger = true;
        }

        if (didTrigger) {
          sound.playJokerTrigger();
          setTriggeringJokerId(joker.id);
          setTimeout(() => setTriggeringJokerId(null), 500);
        }
      });
    }

    const calculatedScore = result.playerWon ? Math.round(chips * mult) : 0;

    // Trigger special Carico sound fanfare if player won with/captured an Asso (1) or Tre (3)
    if (
      result.playerWon &&
      (playerCard.rank === 1 ||
        playerCard.rank === 3 ||
        opponentCard.rank === 1 ||
        opponentCard.rank === 3)
    ) {
      sound.playCaricoWin();
    }

    // Show celebratory Score Tally Overlay
    setTimeout(() => {
      setTallyData({
        chips,
        mult: Math.round(mult),
        finalScore: calculatedScore,
        trickPoints: result.points,
        playerWon: result.playerWon,
      });
    }, 400);
  };

  // --- Finish Score Tally & Draw Next Cards ---
  const handleTallyComplete = () => {
    if (!tallyData) return;

    if (tallyData.playerWon) {
      setCurrentRoundScore((prev) => prev + tallyData.finalScore);
      setTotalScore((prev) => prev + tallyData.finalScore);
      setRoundPointsTaken((prev) => prev + tallyData.trickPoints);
      setTotalBriscolaPointsPlayer((prev) => prev + tallyData.trickPoints);
      setRoundTricksWon((prev) => prev + 1);
      setTotalTricksWon((prev) => prev + 1);
    } else {
      setOpponentPointsTaken((prev) => prev + tallyData.trickPoints);
      setTotalBriscolaPointsOpponent((prev) => prev + tallyData.trickPoints);
      setRoundTricksLost((prev) => prev + 1);
      setTotalTricksLost((prev) => prev + 1);
    }

    const playerWonLastTrick = tallyData.playerWon;
    setTallyData(null);
    setPlayerTrickCard(null);
    setOpponentTrickCard(null);

    // Draw cards from pile for next trick (Winner draws first, loser draws second)
    // The trump card sitting under the deck is the final card of the deck.
    let currentPile = [...drawPile];
    let currentTrump = trumpCard;
    let nextPlayerHand = [...playerHand];
    let nextOpponentHand = [...opponentHand];

    const drawOneCard = (): PlayingCard | null => {
      if (currentPile.length > 0) {
        return currentPile.pop()!;
      }
      if (currentTrump) {
        const t = currentTrump;
        currentTrump = null;
        return t;
      }
      return null;
    };

    if (playerWonLastTrick) {
      const pCard = drawOneCard();
      if (pCard) nextPlayerHand.push(pCard);
      const oCard = drawOneCard();
      if (oCard) nextOpponentHand.push(oCard);
    } else {
      const oCard = drawOneCard();
      if (oCard) nextOpponentHand.push(oCard);
      const pCard = drawOneCard();
      if (pCard) nextPlayerHand.push(pCard);
    }

    setDrawPile(currentPile);
    setTrumpCard(currentTrump);
    setPlayerHand(nextPlayerHand);
    setOpponentHand(nextOpponentHand);

    // Check if match is finished (hands are empty)
    if (nextPlayerHand.length === 0 || nextOpponentHand.length === 0) {
      checkRoundEnd();
    } else {
      // Winner of trick leads next trick!
      setIsPlayerTurn(playerWonLastTrick);
      if (!playerWonLastTrick) {
        setTimeout(() => {
          makeAIMove(nextOpponentHand, null);
        }, 800);
      }
    }
  };

  // --- Round End / Match End Evaluation ---
  const checkRoundEnd = () => {
    const wonRound = currentRoundScore >= targetScore || roundPointsTaken > 60;

    // Calculate Reward cash
    const baseReward = 4 + ante;
    const interestCap = vouchers.some((v) => v.id === 'v_interessi' && v.bought)
      ? 10
      : 5;
    const interest = Math.min(interestCap, Math.floor(money / 5));
    const totalReward = baseReward + interest;

    if (wonRound) {
      sound.playVictoryFanfare();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });

      setMoney((m) => m + totalReward);
      setTotalMoneyEarned((m) => m + totalReward);

      // Check Deck Unlocks
      const newUnlocked: string[] = [];
      if (!unlockedDeckIds.includes('deck_denari') && money + totalReward >= 30) {
        newUnlocked.push('deck_denari');
      }
      if (!unlockedDeckIds.includes('deck_spade') && ante >= 3) {
        newUnlocked.push('deck_spade');
      }
      if (!unlockedDeckIds.includes('deck_baro') && ante >= 5) {
        newUnlocked.push('deck_baro');
      }

      if (newUnlocked.length > 0) {
        const updated = [...unlockedDeckIds, ...newUnlocked];
        setUnlockedDeckIds(updated);
        try {
          localStorage.setItem('briscolatro_unlocked_decks', JSON.stringify(updated));
        } catch {}
      }

      // Check High Score
      const isNewBest = totalScore > highScore;
      if (isNewBest) {
        setHighScore(totalScore);
        try {
          localStorage.setItem('briscolatro_highscore', totalScore.toString());
        } catch {}
      }

      // Present the comprehensive Round Summary
      setRoundSummary({
        ante,
        round,
        targetScore,
        achievedScore: currentRoundScore,
        playerTrickPoints: roundPointsTaken,
        opponentTrickPoints: opponentPointsTaken,
        playerTricksWon: roundTricksWon,
        opponentTricksWon: roundTricksLost,
        totalTricks: roundTricksWon + roundTricksLost,
        won: true,
        bossName: activeBoss?.name,
        bossAvatar: activeBoss?.avatar,
        cashEarned: baseReward,
        interestEarned: interest,
        capturedCarichi: [],
        activeJokersCount: activeJokers.length,
      });

      // Prepare Game Over summary if it's the ultimate Ante 8 Boss victory
      if (ante >= 8 && round === 3) {
        setGameOverSummary({
          won: true,
          ante,
          round,
          totalScore,
          targetScore,
          totalTricksWon,
          totalTricksLost,
          totalBriscolaPointsPlayer,
          totalBriscolaPointsOpponent,
          finalMoney: money + totalReward,
          totalMoneyEarned: totalMoneyEarned + totalReward,
          jokersUsed: [...activeJokers],
          deckName: selectedDeck.name,
          newUnlockedDecks: newUnlocked,
          isNewHighScore: isNewBest,
        });
      }
    } else {
      // Defeat!
      sound.playTrickLose();

      setRoundSummary({
        ante,
        round,
        targetScore,
        achievedScore: currentRoundScore,
        playerTrickPoints: roundPointsTaken,
        opponentTrickPoints: opponentPointsTaken,
        playerTricksWon: roundTricksWon,
        opponentTricksWon: roundTricksLost,
        totalTricks: roundTricksWon + roundTricksLost,
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
        totalScore,
        targetScore,
        totalTricksWon,
        totalTricksLost,
        totalBriscolaPointsPlayer,
        totalBriscolaPointsOpponent,
        finalMoney: money,
        totalMoneyEarned,
        jokersUsed: [...activeJokers],
        deckName: selectedDeck.name,
        newUnlockedDecks: [],
        isNewHighScore: totalScore > highScore,
        defeatReason: `Hai totalizzato ${currentRoundScore.toLocaleString()} punti (Target: ${targetScore.toLocaleString()}) e ${roundPointsTaken}/120 punti Briscola.`,
      });
    }
  };

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
    setDrawPile((prev) => [card, ...prev]);
  };

  const handleNextRoundFromShop = () => {
    if (round >= 3) {
      setAnte((a) => a + 1);
      setRound(1);
      initRound(ante + 1, 1);
    } else {
      setRound((r) => r + 1);
      initRound(ante, round + 1);
    }
    setPhase('playing');
  };

  // --- Use UNO Action Card Consumable ---
  const handleUseUnoCard = (unoCard: UnoCard, targetCard?: PlayingCard) => {
    sound.playBoosterRip();

    if (unoCard.id === 'uno_draw_two') {
      // Draw 2 extra cards from drawPile if available
      if (drawPile.length > 0) {
        const drawn = drawPile.slice(0, 2);
        setDrawPile((prev) => prev.slice(2));
        setPlayerHand((prev) => [...prev, ...drawn]);
      }
    } else if (unoCard.id === 'uno_wild_draw_four') {
      // Draw 2 cards and gain +$4
      if (drawPile.length > 0) {
        const drawn = drawPile.slice(0, 2);
        setDrawPile((prev) => prev.slice(2));
        setPlayerHand((prev) => [...prev, ...drawn]);
      }
      setMoney((m) => m + 4);
      sound.playCashChime();
    } else if (unoCard.id === 'uno_reverse') {
      // Give player immediate lead & +15 bonus Mult to current round
      setIsPlayerTurn(true);
      setCurrentRoundScore((s) => s + 50);
      setOpponentSpeech('Accidenti! Mi hai invertito il gioco!');
    } else if (unoCard.id === 'uno_skip') {
      // Force opponent to play worst card or speak
      setOpponentSpeech('Cosa?! Salto il giro?! Non posso giocare il carico!');
      setCurrentRoundScore((s) => s + 80);
    } else if (unoCard.id === 'uno_wild_suit') {
      // Change Briscola suit randomly
      const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];
      const otherSuits = suits.filter((s) => s !== briscolaSuit);
      const newSuit = otherSuits[Math.floor(Math.random() * otherSuits.length)];
      setBriscolaSuit(newSuit);
      setOpponentSpeech(`Nuovo colore di Briscola: ${newSuit.toUpperCase()}!`);
    } else if (unoCard.id === 'uno_shout') {
      // UNO Shout: +80 Chips & +12 Mult boost
      setCurrentRoundScore((s) => s + 120);
      confetti({ particleCount: 35, spread: 60 });
    } else if (unoCard.id === 'uno_swap_hand' && targetCard) {
      // Swap with Ace or Three
      const caricoRank = Math.random() < 0.5 ? 1 : 3;
      setPlayerHand((prev) =>
        prev.map((c) =>
          c.id === targetCard.id
            ? { ...c, rank: caricoRank, value: caricoRank === 1 ? 11 : 10, isCarico: true }
            : c
        )
      );
    } else if (unoCard.id === 'uno_foil_custom' && targetCard) {
      setPlayerHand((prev) =>
        prev.map((c) => (c.id === targetCard.id ? { ...c, edition: 'foil' } : c))
      );
    } else if (unoCard.id === 'uno_holo_custom' && targetCard) {
      setPlayerHand((prev) =>
        prev.map((c) => (c.id === targetCard.id ? { ...c, edition: 'holo' } : c))
      );
    } else if (unoCard.id === 'uno_polychrome_custom' && targetCard) {
      setPlayerHand((prev) =>
        prev.map((c) => (c.id === targetCard.id ? { ...c, edition: 'polychrome' } : c))
      );
    } else if (unoCard.id === 'uno_gold_card' && targetCard) {
      setPlayerHand((prev) =>
        prev.map((c) => (c.id === targetCard.id ? { ...c, edition: 'gold' } : c))
      );
    } else if (unoCard.id === 'uno_double_cash') {
      const gain = Math.min(20, money);
      setMoney((m) => m + gain);
      sound.playCashChime();
    } else if (unoCard.id === 'uno_discard_refill') {
      setDiscardsLeft((d) => d + 3);
    } else if (unoCard.id === 'uno_red_seal' && targetCard) {
      setPlayerHand((prev) =>
        prev.map((c) => (c.id === targetCard.id ? { ...c, seal: 'red' } : c))
      );
    } else if (unoCard.id === 'uno_wild_joker') {
      const randomJoker = ALL_JOKERS[Math.floor(Math.random() * ALL_JOKERS.length)];
      if (activeJokers.length < maxJokers) {
        setActiveJokers((prev) => [...prev, { ...randomJoker }]);
      }
    } else if (unoCard.id === 'uno_all_briscola') {
      setPlayerHand((prev) => prev.map((c) => ({ ...c, suit: briscolaSuit })));
    }

    setConsumables((prev) => prev.filter((t) => t.id !== unoCard.id));
  };

  return (
    <CardStyleProvider style={settings.cardStyle || 'classic'}>
      <div
        className={`min-h-screen w-full bg-[#0b0f19] text-amber-50 flex flex-col justify-between overflow-x-hidden relative ${
          settings.crtScanlines ? 'crt-overlay' : ''
        } ${settings.screenShake && isShaking ? 'animate-bounce' : ''}`}
      >
        {/* Background Animated Retro Geometry */}
        <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl plasma-bg" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl plasma-bg" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl plasma-bg" />
        </div>

      {/* TITLE SCREEN VIEW */}
      {phase === 'title' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <motion.div
            initial={{ scale: 0.8, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
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
          isPlayerTurn={isPlayerTurn}
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
      <GameOverModal
        isOpen={phase === 'game_over'}
        won={gameOverSummary ? gameOverSummary.won : (ante >= 8 && round === 3 && currentRoundScore >= targetScore)}
        ante={ante}
        round={round}
        totalScore={totalScore}
        totalTricksWon={totalTricksWon}
        money={money}
        newUnlockedDecks={gameOverSummary?.newUnlockedDecks || []}
        summaryData={gameOverSummary || undefined}
        onPlayAgain={() => startNewRun(selectedDeck)}
        onChangeDeck={() => {
          setPhase('title');
          setShowDeckSelect(true);
        }}
      />

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
        deck={[...drawPile, ...(trumpCard ? [trumpCard] : []), ...playerHand]}
        briscolaSuit={briscolaSuit}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  </CardStyleProvider>
);
}
