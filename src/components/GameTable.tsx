import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PlayingCard, Joker, UnoCard, Suit, BossBlind } from '../types/game';
import { PixelCard } from './PixelCard';
import { PixelSuitIcon } from './PixelSuitIcon';
import { PixelAvatar, OpponentEmotion } from './PixelAvatar';
import { CaricoParticles } from './CaricoParticles';
import { resolveTrick, getSuitDisplayName } from '../game/briscola';
import { BOSS_RULES } from '../game/bossRules';
import { TableCardDrawer } from './TableCardDrawer';
import { UnoConfirmModal } from './UnoConfirmModal';
import { sound } from '../services/soundEngine';
import { SPECIAL_INFO } from '../game/specialCards';
import { getTableThemeForAnte } from '../data/tableThemes';
import { getEndlessTier } from '../game/endless';
import {
  BRISCOLA_TARGET_POINTS,
  evaluateVictoryCondition,
  getTrickHudPresentation,
  getVictoryHudPresentation,
  VictoryMode,
} from '../game/victoryModes';
import { getRegularForAnte } from '../data/opponents';
import { TableFeltPattern } from './TableFeltPattern';
import { ArrowUp, BookOpen, ChevronDown, Layers, Menu, RotateCcw, Settings } from 'lucide-react';

interface GameTableModel {
  hud: {
    ante: number;
    round: number;
    targetScore: number;
    currentRoundScore: number;
    money: number;
    discardsLeft: number;
    briscolaSuit: Suit;
    deckCount: number;
    roundPointsTaken: number;
    opponentPointsTaken: number;
    tricksPlayedInRound: number;
  };
  cards: {
    trumpCard: PlayingCard | null;
    playerHand: PlayingCard[];
    opponentHand: PlayingCard[];
    playerTrickCard: PlayingCard | null;
    opponentTrickCard: PlayingCard | null;
  };
  interaction: {
    isPlayerTurn: boolean;
    canPlay: boolean;
    canDiscard: boolean;
    canUseSola: boolean;
    trickLeadIsPlayer: boolean;
    isDealing: boolean;
    visionActive: boolean;
  };
  build: {
    activeJokers: Joker[];
    consumables: UnoCard[];
    maxJokers: number;
    triggeringJokerId: string | null;
  };
  encounter: {
    currentBoss: BossBlind | null;
    bossDebuffNeutralized: boolean;
    bossShieldTricks: number;
    forcedLeadSuit: Suit | null;
    silencedJokerIndex: number | null;
    victoryMode: VictoryMode;
    opponentSpeech: string;
  };
}

interface GameTableActions {
  onPlayCard: (card: PlayingCard) => void;
  onDiscardCard: (card: PlayingCard) => void;
  onUseUnoCard: (card: UnoCard, targetCard?: PlayingCard, chosenSuit?: Suit) => void;
  onOpenDeckViewer: () => void;
  onOpenTutorial: () => void;
  onOpenSettings: () => void;
}

interface GameTableProps {
  model: GameTableModel;
  actions: GameTableActions;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  React.useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/**
 * L'altezza vera di un elemento, mentre cambia.
 *
 * Serve per il centro del panno: quanto spazio e' rimasto li' dentro dipende
 * da cosa c'e' sopra - la regola della casa, la battuta, i jolly - e cambia
 * durante la partita. Una media query sull'altezza dello schermo non lo sa.
 */
function useMeasuredSize<T extends HTMLElement>(): [React.RefObject<T | null>, number, number] {
  const ref = React.useRef<T>(null);
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(Math.round(entry.contentRect.height));
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, height, width];
}

/** Seconds into the deal at which the stock is turned over. */
const TRUMP_FLIP_DELAY = 0.9;

export const GameTable: React.FC<GameTableProps> = ({ model, actions }) => {
  const {
    hud: {
      ante,
      round,
      targetScore,
      currentRoundScore,
      money,
      discardsLeft,
      briscolaSuit,
      deckCount,
      roundPointsTaken,
      opponentPointsTaken,
      tricksPlayedInRound,
    },
    cards: { trumpCard, playerHand, opponentHand, playerTrickCard, opponentTrickCard },
    interaction: {
      isPlayerTurn,
      canPlay,
      canDiscard,
      canUseSola,
      trickLeadIsPlayer,
      isDealing,
      visionActive,
    },
    build: { activeJokers, consumables, maxJokers, triggeringJokerId },
    encounter: {
      currentBoss,
      bossDebuffNeutralized,
      bossShieldTricks,
      forcedLeadSuit,
      silencedJokerIndex,
      victoryMode,
      opponentSpeech,
    },
  } = model;
  const {
    onPlayCard,
    onDiscardCard,
    onUseUnoCard,
    onOpenDeckViewer,
    onOpenTutorial,
    onOpenSettings,
  } = actions;
  const reduceMotion = useReducedMotion();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeUnoToApply, setActiveUnoToApply] = useState<UnoCard | null>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const openNotes = () => tableRef.current?.querySelectorAll<HTMLDetailsElement>('details[data-table-disclosure][open]') ?? [];
    const closeOutside = (event: PointerEvent) => {
      for (const note of openNotes()) {
        if (event.target instanceof Node && !note.contains(event.target)) note.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      for (const note of openNotes()) {
        note.open = false;
        note.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  // A UNO card is consumed on use, so it asks before firing.
  const [unoPendingConfirm, setUnoPendingConfirm] = useState<UnoCard | null>(null);
  // Which item of the build is open for reading. A tooltip anchored to the slot
  // gets clipped by the rail's own scroll container and by the top of the
  // screen, so the details render as a panel underneath instead.
  // A tall phone has room for a proper clash: the middle of the felt used to be
  // dead space with two small cards floating in it.
  const roomyTable = useMediaQuery('(min-height: 720px) and (min-width: 380px)');
  // A short screen (or a browser with its address bar showing) has to fit the
  // whole table without scrolling: the hand shrinks a size rather than pushing
  // the action buttons past the fold.
  const shortScreen = useMediaQuery('(max-height: 700px)');

  // Desktop has room the phone layout never had, and the two things that were
  // still sized for a phone there are the stock and whoever is sitting across
  // the table: both were reading as decoration next to a 140px trick card.
  // Width alone is not enough: a wide but short window (a 1024x600 laptop, a
  // half-height browser) would take the big sizes and push the hand off screen.
  const wideTable = useMediaQuery('(min-width: 1024px) and (min-height: 800px)');
  const deckCardSize = wideTable ? 'md' : roomyTable ? 'sm' : 'xs';
  // Coperte e mute: stanno una misura sotto al mazzo, che invece si conta.
  const opponentCardSize = wideTable ? 'sm' : 'xs';
  const avatarSize = wideTable ? 56 : 32;
  const [feltRef, feltHeight, feltWidth] = useMeasuredSize<HTMLDivElement>();
  const [topBandRef, topBandHeight] = useMeasuredSize<HTMLDivElement>();
  const landscapeTable = useMediaQuery('(min-width: 640px) and (max-height: 500px)');
  const wideScreen = useMediaQuery('(min-width: 1024px)');
  const mediumScreen = useMediaQuery('(min-width: 768px)');
  const smallUp = useMediaQuery('(min-width: 640px)');
  const desktopNotes = smallUp && !landscapeTable;
  const cardHeight = (size: 'sm' | 'md' | 'lg') => {
    const step = wideScreen ? 3 : mediumScreen ? 2 : smallUp ? 1 : 0;
    if (size === 'sm') return [80, 104, 104, 104][step];
    if (size === 'md') return [112, 136, 152, 152][step];
    return [138, 164, 184, 200][step];
  };
  // Quello che la mano si porta dietro oltre alle carte: la riga di stato e i
  // due tasti.
  const HAND_CHROME = 152;
  const free = feltHeight > 0 ? feltHeight - topBandHeight - 26 : 0;
  const measured = free > 0;

  // La mano viene prima: e' quella che si tocca. Prende la misura piu' grande
  // che lascia comunque in piedi una presa leggibile.
  const handCardSize: 'sm' | 'md' | 'lg' = landscapeTable
    ? 'sm'
    : !measured
    ? 'md'
    : (smallUp || feltWidth >= 336) && cardHeight('lg') + HAND_CHROME + cardHeight('md') <= free
      ? 'lg'
      : cardHeight('md') + HAND_CHROME + cardHeight('sm') <= free
        ? 'md'
        : 'sm';

  const arenaBudget = landscapeTable ? free : measured ? free - cardHeight(handCardSize) - HAND_CHROME : 0;
  const cardWidth = (size: 'sm' | 'md' | 'lg') => {
    const step = wideScreen ? 3 : mediumScreen ? 2 : smallUp ? 1 : 0;
    if (size === 'sm') return [56, 72, 72, 72][step];
    if (size === 'md') return [80, 96, 104, 104][step];
    return [96, 114, 128, 140][step];
  };
  const clashWidth = landscapeTable ? feltWidth * 0.48 - 90 : !smallUp ? feltWidth - 90 : feltWidth - (wideTable ? 300 : 160);
  const fits = (size: 'sm' | 'md' | 'lg', stacked: boolean) =>
    arenaBudget >= cardHeight(size) * (stacked ? 2 : 1) + (stacked ? 10 : 0)
    && clashWidth >= cardWidth(size) * (stacked ? 1 : 2) + (stacked ? 0 : 16);
  const stackedClash = smallUp && !landscapeTable && fits('md', true);
  const trickCardSize: 'sm' | 'md' | 'lg' = stackedClash
    ? fits('lg', true)
      ? 'lg'
      : 'md'
    : fits('lg', false)
      ? 'lg'
      : fits('md', false)
        ? 'md'
        : 'sm';
  // The empty slot has to be the size of the card that will fill it, all the
  // way up, or the clash zone resizes the moment someone plays.
  const trickSlotClass =
    trickCardSize === 'lg'
      ? 'w-[96px] sm:w-[114px] md:w-[128px] lg:w-[140px] h-[138px] sm:h-[164px] md:h-[184px] lg:h-[200px]'
      : trickCardSize === 'md'
        ? 'w-20 sm:w-24 md:w-26 h-28 sm:h-34 md:h-38'
        : 'w-14 sm:w-18 h-20 sm:h-26';

  const [cardDrawerOpen, setCardDrawerOpen] = useState(false);

  const selectedCard = playerHand.find((c) => c.id === selectedCardId);

  // Opening the trick is where both lead restrictions bite. Working it out here
  // means an illegal card is visibly out of reach instead of being refused
  // after the tap - the rule reads as part of the table, not as a rejection.
  // The deal runs for about a second before the stock is turned over; the flip
  // has to land after the last card, not on top of it.
  const briscolaName = getSuitDisplayName(briscolaSuit);

  // The suit that decides the whole hand deserves to be said out loud once,
  // when it is turned over, and then get out of the way.
  const [announceBriscola, setAnnounceBriscola] = useState(false);
  const trumpId = trumpCard?.id ?? null;
  // Keyed on the trump alone, not on the deal: isDealing is released well
  // before the call has finished being read, and tearing the effect down with
  // it took the banner off the table half a second after it appeared.
  useEffect(() => {
    if (!trumpId) return;
    const show = setTimeout(() => setAnnounceBriscola(true), TRUMP_FLIP_DELAY * 1000);
    const hide = setTimeout(() => setAnnounceBriscola(false), TRUMP_FLIP_DELAY * 1000 + 1600);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      setAnnounceBriscola(false);
    };
  }, [trumpId]);

  const isOpeningTrick = opponentTrickCard === null;
  const effectiveBoss = bossDebuffNeutralized ? null : currentBoss;
  // Ciccio il Baro: his card lands face down and stays that way until the
  // player has committed one. The card is in the state the whole time - this
  // only covers its face.
  const hideOpponentTrickCard = BOSS_RULES.shouldRenderOpponentCardFaceDown(
    currentBoss,
    bossDebuffNeutralized,
    playerTrickCard !== null
  );
  const isCardPlayable = (card: PlayingCard): boolean => {
    if (!isOpeningTrick) return true;
    return BOSS_RULES.canPlayerLeadCard(card, effectiveBoss, playerHand, forcedLeadSuit).allowed;
  };

  const handleCardClick = (card: PlayingCard) => {
    if (activeUnoToApply && !canUseSola) return;
    if (!activeUnoToApply && !canPlay) return;
    sound.playCardSelect();
    if (activeUnoToApply) {
      // Apply UNO action card to this card!
      onUseUnoCard(activeUnoToApply, card);
      setActiveUnoToApply(null);
      return;
    }

    if (!isCardPlayable(card)) {
      sound.playTrickLose();
      return;
    }

    if (selectedCardId === card.id) {
      // Double click or tap when already selected -> play it directly!
      if (canPlay) {
        onPlayCard(card);
        setSelectedCardId(null);
      }
    } else {
      setSelectedCardId(card.id);
    }
  };

  const handlePlaySelected = () => {
    if (!selectedCard || !canPlay || !isCardPlayable(selectedCard)) return;
    onPlayCard(selectedCard);
    setSelectedCardId(null);
  };

  const handleDiscardSelected = () => {
    if (!selectedCard || !canDiscard) return;
    onDiscardCard(selectedCard);
    setSelectedCardId(null);
  };

  const handleUnoCardClick = (unoCard: UnoCard) => {
    if (!canUseSola) return;
    // Tapping the one already armed for targeting disarms it.
    if (activeUnoToApply?.id === unoCard.id) {
      setActiveUnoToApply(null);
      return;
    }
    setCardDrawerOpen(false);
    setUnoPendingConfirm(unoCard);
  };

  const confirmUnoCard = (chosenSuit?: Suit) => {
    const unoCard = unoPendingConfirm;
    if (!unoCard || !canUseSola) return;
    setUnoPendingConfirm(null);
    if (unoCard.targetType === 'card_in_hand') {
      setActiveUnoToApply(unoCard);
    } else {
      onUseUnoCard(unoCard, undefined, chosenSuit);
    }
  };

  // Calculate score progress percentage
  const scoreProgress = Math.min(100, Math.round((currentRoundScore / targetScore) * 100));

  // What this table actually needs, asked of the one function that decides it.
  // The HUD used to test `score >= target` on its own, which reads as a lie the
  // moment the blind is not won that way.
  const hud = getVictoryHudPresentation(victoryMode);
  const trickHud = getTrickHudPresentation(tricksPlayedInRound);
  const victory = evaluateVictoryCondition({
    mode: victoryMode,
    score: currentRoundScore,
    targetScore,
    playerBriscolaPoints: roundPointsTaken,
  });
  const reachedTarget = victory.chipsPassed;

  // Vision is granted by App, and only for the first trick of a round: a
  // permanent x-ray on the opponent's hand removes the whole guessing game.
  const hasVision = visionActive;

  // Dynamic emotion for Opponent Pixel Avatar
  let opponentEmotion: OpponentEmotion = 'idle';
  let playerWonTrick = false;
  if (opponentTrickCard && playerTrickCard) {
    // The lead card decides the trick, so the real leader has to be passed in:
    // assuming the player always opened flipped the outcome on opponent leads.
    const res = resolveTrick(
      trickLeadIsPlayer ? playerTrickCard : opponentTrickCard,
      trickLeadIsPlayer ? opponentTrickCard : playerTrickCard,
      briscolaSuit,
      trickLeadIsPlayer,
      bossDebuffNeutralized ? undefined : currentBoss?.debuffType
    );
    playerWonTrick = res.playerWon;

    const playerIsBriscola = playerTrickCard.suit === briscolaSuit;
    const oppIsBriscola = opponentTrickCard.suit === briscolaSuit;
    if (playerIsBriscola && !oppIsBriscola) {
      opponentEmotion = 'shocked';
    } else if (!playerIsBriscola && oppIsBriscola) {
      opponentEmotion = 'happy';
    } else if (playerTrickCard.points >= 10 && opponentTrickCard.points < 10) {
      opponentEmotion = 'shocked';
    } else if (playerTrickCard.points > opponentTrickCard.points) {
      opponentEmotion = 'angry';
    } else if (opponentTrickCard.points > playerTrickCard.points) {
      opponentEmotion = 'happy';
    }
  } else if (opponentSpeech.includes('!') || opponentSpeech.includes('?')) {
    opponentEmotion = 'thinking';
  }

  /**
   * The opponent has a body, not just a face.
   *
   * The avatar already changed expression; the frame around it never moved, so
   * a Boss taking your Asso and a Boss losing to it read the same from across
   * the table. These are the whole vocabulary: recoil, lean in, bounce, sway.
   * One sprite each, no extra art - the reaction lives in the transform.
   */
  const bodyReaction: Record<OpponentEmotion, Record<string, number | number[]>> = {
    shocked: { x: [0, -5, 4, -2, 0], y: [0, -7, 0], rotate: [0, -5, 3, 0] },
    angry: { x: [0, 3, -3, 2, 0], y: [0, 4, 0], rotate: [0, 2, -2, 0], scale: [1, 1.06, 1] },
    happy: { y: [0, -6, 0], rotate: [0, 4, 0] },
    thinking: { rotate: [0, -2.5, 2.5, 0] },
    idle: { x: 0, y: 0, rotate: 0 },
  };

  // Sweat is for being in trouble, which is not the same as having just lost a
  // trick: it stays up while the player is on the doorstep.
  const opponentSweating = opponentEmotion === 'shocked' || reachedTarget;

  /**
   * When the opponent has already led, the outcome of the selected card is fully
   * determined - so show it. Balatro never hides what a play is worth once the
   * inputs are known, and the base-Mult rule is only learnable if you can see it
   * before committing.
   */
  const followPreview = (() => {
    if (!opponentTrickCard || playerTrickCard || !selectedCard) return null;
    // Reading out "you win this" would hand back exactly what Ciccio covered.
    if (hideOpponentTrickCard) return null;
    const clash = resolveTrick(
      opponentTrickCard,
      selectedCard,
      briscolaSuit,
      false,
      bossDebuffNeutralized ? undefined : currentBoss?.debuffType
    );
    const captured = clash.playerWon ? [selectedCard, opponentTrickCard] : [];
    const carichi = captured.filter((c) => c.rank === 1 || c.rank === 3).length;
    const figure = captured.filter((c) => c.rank >= 8 && c.rank <= 10).length;
    const baseMult =
      1 + carichi + (figure > 0 ? 1 : 0) + (clash.playerWon && clash.playerIsBriscola ? 1 : 0);
    return { wins: clash.playerWon, points: clash.rawPoints, baseMult };
  })();

  const tableTheme = getTableThemeForAnte(ante);
  // null through the whole campaign: the HUD only grows the extra line past Ante 8.
  const endlessTier = getEndlessTier(ante);
  // Who is sitting opposite when it is not the boss of the ante: every venue
  // has its own regular, so the name and the face have to follow the ante.
  const regular = getRegularForAnte(ante);

  // Particle burst condition: Player plays or wins with Asso (1, 11pt) or Tre (3, 10pt)
  const isPlayerCarico = playerTrickCard && (playerTrickCard.rank === 1 || playerTrickCard.rank === 3);
  const showPlayerCaricoParticles = Boolean(
    !reduceMotion && isPlayerCarico && (!opponentTrickCard || playerWonTrick)
  );

  // The particles were silent: a Carico landing is the loudest thing that
  // happens in a hand of Briscola, so it gets a sound the first frame it shows.
  React.useEffect(() => {
    if (showPlayerCaricoParticles) sound.playCaricoWin();
  }, [showPlayerCaricoParticles]);

  // If opponent played an Ace or Three and player captures it!
  const isOpponentCarico = opponentTrickCard && (opponentTrickCard.rank === 1 || opponentTrickCard.rank === 3);
  const showOpponentCaricoCaptured = Boolean(
    !reduceMotion && isOpponentCarico && playerTrickCard && playerWonTrick
  );

  return (
    <div
      ref={tableRef}
      // `max-w-6xl` lasciava il tavolo largo come un foglio di calcolo: su
      // desktop il panno si allargava e le carte restavano dov'erano, quindi
      // ogni cosa galleggiava lontana dall'altra. Un tavolo ha una misura.
      className="game-screen flex-1 flex flex-col justify-between p-1.5 sm:p-2 max-w-3xl mx-auto w-full relative h-[100dvh] max-h-[100dvh] min-h-0 select-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      {/* The score and table account sit in the table's upper edge. */}
      <div className="game-hud-frame shrink-0 z-50 relative" data-game-hud>
        <div className="game-hud-board">
          <div className="game-hud-heading">
            <span
              className="game-hud-ante font-condensed text-[17px] sm:text-[20px] leading-none uppercase tracking-[0.06em] shrink-0"
              title={endlessTier ? `Ante ${ante} · ${endlessTier.name}` : `Ante ${ante}, round ${round}`}
              style={{ color: endlessTier ? endlessTier.accentColor : 'var(--chalk-yellow)' }}
            >
              Ante {ante} <span className="chalk-dim">· R{round}</span>
              {endlessTier && <span className="hidden sm:inline ml-1.5 text-[14px] sm:text-[16px]">{endlessTier.name}</span>}
            </span>

            <span className="game-hud-venue font-condensed chalk-dim">
              {tableTheme.name}
            </span>

            <span
              className={`game-hud-trick font-condensed text-[15px] sm:text-[17px] leading-none uppercase tabular-nums sm:ml-auto shrink-0 ${
                trickHud.isFinalThree ? 'chalk-red' : 'chalk-dim'
              }`}
              title={trickHud.isFinalThree ? 'Ultime tre prese' : 'Presa corrente'}
            >
              Presa {trickHud.current}/{trickHud.total}
            </span>

            <details className="game-hud-tools sm:hidden" name="table-disclosure" data-table-disclosure>
              <summary className="table-disclosure-toggle chalk-dim p-2 cursor-pointer" aria-label="Menu partita">
                <Menu size={17} strokeWidth={1.7} />
              </summary>
              <div className="game-hud-menu absolute right-0 top-full mt-1 p-1 rounded-md z-40 min-w-44">
                <div className="flex flex-col p-1" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); }}>
                  {[
                    { label: 'Ispettore Mazzo', Icon: Layers, action: onOpenDeckViewer },
                    { label: 'Guida', Icon: BookOpen, action: onOpenTutorial },
                    { label: 'Impostazioni', Icon: Settings, action: onOpenSettings },
                  ].map(({ label, Icon, action }) => (
                    <button key={label} type="button" onClick={action} className="chalk flex items-center gap-2 px-3 py-2 min-h-11 text-left font-condensed text-xl cursor-pointer hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-200">
                      <Icon size={17} strokeWidth={1.7} />{label}
                    </button>
                  ))}
                </div>
              </div>
            </details>
            <div className="hidden sm:flex items-center gap-0.5 shrink-0 -mr-1.5">
              <button
                type="button"
                onClick={onOpenDeckViewer}
                className="chalk-dim hover:text-[#ece5d6] p-2 cursor-pointer bg-transparent transition-colors"
                title="Ispettore Mazzo"
                aria-label="Ispettore Mazzo"
              >
                <Layers size={17} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={onOpenTutorial}
                className="chalk-dim hover:text-[#ece5d6] p-2 cursor-pointer bg-transparent transition-colors"
                title="Guida"
                aria-label="Guida"
              >
                <BookOpen size={17} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="chalk-dim hover:text-[#ece5d6] p-2 cursor-pointer bg-transparent transition-colors"
                title="Impostazioni"
                aria-label="Impostazioni"
              >
                <Settings size={17} strokeWidth={1.7} />
              </button>
            </div>
          </div>

          {/* Il numero della manche: decide se vivi, quindi e' scritto come il
              piatto del giorno e non come una didascalia. */}
          <div className="game-hud-stats">
            {hud.showChipsObjective && (
              <div className="game-hud-score flex items-baseline gap-1 sm:gap-1.5 min-w-0 shrink" role="group" aria-label={`Chips: ${currentRoundScore.toLocaleString('it-IT')} su ${targetScore.toLocaleString('it-IT')}`} >
                <motion.span
                  key={currentRoundScore}
                  initial={reduceMotion ? false : { scale: 1.18 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 320 }}
                  className={`font-condensed leading-[0.8] tabular-nums ${shortScreen ? 'text-[26px]' : 'text-[30px] sm:text-[34px]'} ${
                    reachedTarget ? 'chalk-green' : 'chalk'
                  }`}
                >
                  {currentRoundScore.toLocaleString('it-IT')}
                </motion.span>
                <span className="font-condensed chalk-dim text-[19px] sm:text-[23px] leading-none tabular-nums whitespace-nowrap">
                  <span className="game-hud-target-label">Obiettivo </span>{targetScore.toLocaleString('it-IT')}
                </span>
              </div>
            )}

            <div className="game-hud-resources sm:order-3 flex items-center gap-2 sm:gap-4 sm:ml-auto shrink-0 sm:pb-0.5">
              <span aria-label={`Briscola: ${getSuitDisplayName(briscolaSuit)}`} className="flex items-center gap-1 font-condensed chalk-yellow text-[20px] sm:text-[24px] leading-none">
                <PixelSuitIcon suit={briscolaSuit} size={14} />
                <span className="game-hud-suit-name uppercase text-[17px]">{briscolaSuit}</span>
              </span>
              <span className="font-condensed chalk-yellow text-[20px] sm:text-[24px] leading-none tabular-nums">
                ${money}
              </span>
              <span
                className="flex items-center gap-1 font-condensed chalk-dim text-[20px] sm:text-[24px] leading-none tabular-nums"
                title="Scarti rimasti"
              >
                <RotateCcw size={14} strokeWidth={1.8} />
                {discardsLeft}
              </span>
            </div>
            {/* La Briscola vera, che al tavolo si conta comunque. */}
            <div className={`game-hud-briscola ${hud.showChipsObjective ? '' : 'game-hud-briscola-primary'} sm:order-2 flex items-baseline gap-1 sm:gap-2 font-condensed tabular-nums sm:flex-wrap pb-0.5`}>
              <span className="game-hud-briscola-label chalk-dim text-[16px] uppercase">Briscola</span>
              <span className="chalk-dim text-[14px] sm:text-[16px] uppercase">tu</span>
              <span className={`chalk leading-none ${hud.primary === 'briscola' ? 'text-[22px] sm:text-[26px]' : 'text-[18px] sm:text-[21px]'}`}>
                {roundPointsTaken}
              </span>
              <span className="chalk-dim text-[16px] leading-none">&mdash;</span>
              <span className="chalk-dim text-[14px] sm:text-[16px] uppercase">AI</span>
              <span className={`chalk-red leading-none ${hud.primary === 'briscola' ? 'text-[22px] sm:text-[26px]' : 'text-[18px] sm:text-[21px]'}`}>
                {opponentPointsTaken}
              </span>
              {hud.showBriscolaObjective && (
                <span className={`text-[17px] sm:text-[19px] leading-none ${victory.briscolaPassed ? 'chalk-green' : 'chalk-dim'}`}>
                  <span className="hidden sm:inline">{victory.briscolaPassed ? 'fatto · ' : ''}su </span><span className="sm:hidden">/</span>{BRISCOLA_TARGET_POINTS}
                </span>
              )}
              <div className="game-hud-lead" role="img" aria-label={`Punti Briscola: tu ${roundPointsTaken}, AI ${opponentPointsTaken}. ${roundPointsTaken === opponentPointsTaken ? 'Parità' : roundPointsTaken > opponentPointsTaken ? 'Sei in vantaggio' : 'AI in vantaggio'}`}>
                <div className="game-hud-lead-track" data-empty={roundPointsTaken + opponentPointsTaken === 0}>
                  <span style={{ width: `${roundPointsTaken + opponentPointsTaken === 0 ? 50 : roundPointsTaken / (roundPointsTaken + opponentPointsTaken) * 100}%` }} />
                </div>
                <span className="game-hud-lead-caption">{roundPointsTaken === opponentPointsTaken ? 'Parità' : roundPointsTaken > opponentPointsTaken ? `Tu +${roundPointsTaken - opponentPointsTaken}` : `AI +${opponentPointsTaken - roundPointsTaken}`}</span>
              </div>
              {reachedTarget && hud.showChipsObjective && (
                <span className="hidden sm:inline chalk-green text-[17px] leading-none ml-auto uppercase">
                  Target fatto · si continua per i punti
                </span>
              )}
            </div>
          </div>

          {/* Il tratto di gesso che si allunga: una riga sotto il numero, non un
              tubo di vetro con dentro un gradiente. */}
          {hud.showChipsObjective && (
            <div className="game-hud-progress mt-1 h-[3px] w-full bg-[rgba(236,229,214,0.12)] overflow-hidden">
              <motion.div
                className="h-full"
                style={{
                  background: reachedTarget
                    ? '#9ec98a'
                    : '#c5a568',
                }}
                animate={{ width: `${scoreProgress}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              />
            </div>
          )}

        </div>

      </div>

      {/* UNO Action Prime Floating Banner */}
      <AnimatePresence>
        {activeUnoToApply && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="my-1 bg-red-950/95 border-2 border-red-400 px-2.5 py-1 rounded-xl pixel-box flex items-center justify-between shadow-xl z-20 shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🃏</span>
              <span className="text-[8.5px] sm:text-[9.5px] font-pixel text-red-200">
                <strong>{activeUnoToApply.name} ({activeUnoToApply.symbol}):</strong> Tocca una carta nella tua mano per applicare!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveUnoToApply(null)}
              className="font-pixel text-[7.5px] sm:text-[8px] text-yellow-300 bg-red-900 hover:bg-red-800 px-1.5 py-0.5 rounded cursor-pointer ml-2"
            >
              Annulla ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. THE FELT CARD TABLE (THEMED BY CURRENT ANTE PROGRESSION) */}
      <div
        // Tre fasce e non un elenco: chi hai davanti in cima, il tavolo che si
        // prende tutto lo spazio che avanza, la tua mano in fondo. Con
        // `justify-between` lo spazio libero si accumulava in due buchi morti
        // in mezzo al panno; qui e' l'arena a tenerselo, che e' dove si guarda.
        ref={feltRef}
        className={`game-felt my-0.5 flex-1 grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] bg-gradient-to-b ${tableTheme.feltGradient} border-2 sm:border-3 ${tableTheme.feltBorder} ${tableTheme.feltOuterRing} rounded-2xl pixel-box ${shortScreen ? 'p-1.5' : 'p-2 sm:p-3'} relative shadow-2xl min-h-0 transition-colors duration-500`}
      >
        {/* Only the decoration is clipped. The felt itself must grow with its
            content: clipping it cut the hand and the action buttons off the
            bottom on phones with a large system font. */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <TableFeltPattern theme={tableTheme} />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${tableTheme.ambientGlow} 0%, rgba(0,0,0,0.6) 100%)`,
            }}
          />
        </div>

        {/* Felt Watermark Venue Stamp (Top-Right) */}
        <div
          className={`game-theme absolute top-2 right-2.5 z-10 pointer-events-none hidden md:flex items-center gap-1.5 font-pixel text-[8px] sm:text-[9px] ${tableTheme.accentBadge.text} bg-black/40 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-xs`}
        >
          <span>{tableTheme.icon}</span>
          <span className="uppercase font-bold tracking-wider">{tableTheme.name}</span>
        </div>

        {/* THE CALL: what suit is trump, once, as it is turned over. */}
        {/* The scaling belongs to the badge, never to this box. Animating a full
            size `inset-0` overlay to scale 1.15 grows it past the felt on every
            side, which is enough overflow to flash the page scrollbar for the
            length of the exit. */}
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <AnimatePresence>
            {announceBriscola && (
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.15, y: -14 }}
                transition={{ type: 'spring', damping: 16, stiffness: 260 }}
                className="flex items-center gap-2.5 bg-slate-950/95 border-3 border-orange-500 px-4 py-2.5 rounded-2xl pixel-box shadow-2xl">
                <PixelSuitIcon suit={briscolaSuit} size={26} />
                <div className="text-left leading-tight">
                  <div className="font-pixel text-[7.5px] text-orange-300/80 uppercase tracking-widest">
                    Briscola
                  </div>
                  <div className="font-pixel text-sm text-orange-400 font-bold uppercase">
                    {briscolaName}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* OPPONENT SECTION (Top of felt table) */}
        <div ref={topBandRef} data-opponent-band className={`relative flex flex-col min-w-0 z-20 shrink-0 border-b ${tableTheme.dividerBorder} pb-1.5`}>
          <div className="flex items-center justify-between gap-2">
            {/* Opponent Info */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
              <motion.div
                key={`${opponentEmotion}-${opponentTrickCard?.id ?? 'none'}`}
                animate={reduceMotion ? undefined : bodyReaction[opponentEmotion]}
                transition={
                  opponentEmotion === 'thinking'
                    ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.45, ease: 'easeOut' }
                }
                className="w-9 h-9 sm:w-10 sm:h-10 lg:w-16 lg:h-16 rounded-lg bg-slate-900 border-2 border-amber-500/70 pixel-box flex items-center justify-center p-0.5 shadow-lg shrink-0 relative"
              >
                <PixelAvatar
                  characterId={currentBoss ? currentBoss.id : regular.characterId}
                  emotion={opponentEmotion}
                  size={avatarSize}
                  showGlow={!!currentBoss}
                />

                {/* Beads of sweat. Three divs over whoever is sitting there, so
                    it costs no art and works for every character and Boss. */}
                {opponentSweating && !reduceMotion && (
                  <>
                    {[
                      { left: '8%', top: '14%', delay: 0 },
                      { left: '82%', top: '22%', delay: 0.5 },
                      { left: '24%', top: '6%', delay: 1.1 },
                    ].map((bead) => (
                      <motion.span
                        key={`${bead.left}-${bead.top}`}
                        initial={{ opacity: 0, y: 0, scaleY: 0.7 }}
                        animate={{ opacity: [0, 1, 1, 0], y: [0, 5, 13], scaleY: [0.7, 1, 1.3] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 0.9,
                          delay: bead.delay,
                          ease: 'easeIn',
                        }}
                        style={{ left: bead.left, top: bead.top }}
                        className="absolute w-[3px] h-[5px] lg:w-[5px] lg:h-[8px] rounded-b-full bg-sky-300/90 shadow-[0_0_3px_rgba(125,211,252,0.9)] pointer-events-none"
                      />
                    ))}
                  </>
                )}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 leading-none min-w-0">
                  <span className="font-pixel text-[9px] sm:text-[11px] lg:text-[15px] text-amber-300 font-bold truncate sm:whitespace-normal">
                    {currentBoss ? currentBoss.name : regular.name}
                  </span>
                  {currentBoss && (
                    <span className={`hidden sm:inline text-[7.5px] lg:text-[9px] bg-red-900 border border-red-500 text-red-200 px-1 lg:px-1.5 py-0.5 rounded font-pixel uppercase font-bold ${reduceMotion ? '' : 'animate-pulse'}`}>
                      BOSS
                    </span>
                  )}
                </div>
                {opponentSpeech && (
                  <details className="sm:hidden mt-1" name="table-disclosure" data-table-disclosure>
                    <summary className="table-disclosure-toggle flex items-center gap-1 min-h-8 cursor-pointer font-condensed text-[17px] chalk-dim" aria-label={`Dialogo di ${currentBoss ? currentBoss.name : regular.name}`}>
                      <span className="truncate min-w-0">&ldquo;{opponentSpeech}&rdquo;</span>
                      <ChevronDown size={12} className="shrink-0" />
                    </summary>
                    <div className="table-note-popover absolute top-full left-0 right-0 mt-1 z-40 bar-paper px-3 py-2 font-condensed text-[20px] leading-snug ink">
                      <div className="ink-red">{currentBoss ? currentBoss.name : regular.name}</div>
                      <p>&ldquo;{opponentSpeech}&rdquo;</p>
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Opponent Face-down Cards */}
            <div className="game-opponent-cards flex items-center gap-1 sm:gap-1.5 shrink-0">
              {hasVision && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-sky-950/90 border border-sky-400 text-sky-200 font-pixel text-[6.5px] sm:text-[7.5px] px-1 py-0.5 rounded uppercase whitespace-nowrap"
                  title="Lo Specchietto del Baro: solo per questa presa"
                >
                  🪞 1ª presa
                </motion.span>
              )}
              {opponentHand.map((card, i) => (
                <PixelCard
                  key={card.id || i}
                  card={card}
                  faceDown={!hasVision}
                  size={opponentCardSize}
                  animateDeal={true}
                  dealDelay={isDealing ? 0.06 + i * 0.26 : i * 0.06}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-2">
          {/* On phones the rule stays one line; its full text floats over the
              felt so reading it never resizes the hand or the clash. */}
          {currentBoss && (
            <details className="game-boss-note sm:flex-1 sm:min-w-0" name={desktopNotes ? undefined : 'table-disclosure'} open={desktopNotes} data-table-disclosure={desktopNotes ? undefined : true}>
              <summary className="table-disclosure-toggle sm:hidden mt-1 bar-paper px-2 min-h-8 flex items-center gap-2 cursor-pointer font-condensed text-[17px] leading-none">
                <span className="ink-red shrink-0">Malus</span>
                <span className={`min-w-0 truncate ${bossDebuffNeutralized ? 'ink-green' : 'ink'}`}>
                  {bossDebuffNeutralized
                    ? `Scudo · ${bossShieldTricks} ${bossShieldTricks === 1 ? 'presa' : 'prese'}`
                    : forcedLeadSuit && isOpeningTrick
                      ? `Apri di ${getSuitDisplayName(forcedLeadSuit)}`
                      : silencedJokerIndex !== null && activeJokers[silencedJokerIndex]
                        ? `Zitto: ${activeJokers[silencedJokerIndex].name}`
                        : currentBoss.debuffDescription}
                </span>
                <ChevronDown size={14} className="ink-red ml-auto shrink-0" />
              </summary>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="table-note-popover absolute top-full left-0 right-0 z-40 sm:static bar-paper mt-1.5 px-3 py-1.5 flex items-start gap-2 sm:min-w-0"
                style={{ transform: 'rotate(-0.4deg)' }}
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-pixel text-[8px] sm:text-[9px] ink-red uppercase tracking-[0.12em] flex items-center gap-1.5 flex-wrap">
                    <span>Regola della casa · {currentBoss.name}</span>
                    {bossDebuffNeutralized && (
                      <span className="ink-green">
                        scudo · {bossShieldTricks} {bossShieldTricks === 1 ? 'presa' : 'prese'}
                      </span>
                    )}
                  </div>
                  <div
                    className={`font-condensed text-[18px] leading-tight mt-0.5 ${
                      bossDebuffNeutralized ? 'ink-dim line-through' : 'ink'
                    }`}
                  >
                    {currentBoss.debuffDescription}
                  </div>

                  {/* The rule as it stands this instant. The description says what
                      the boss does; this says what it is doing to you now. */}
                  {!bossDebuffNeutralized && forcedLeadSuit && isOpeningTrick && (
                    <div className="mt-1 inline-flex items-center gap-1.5">
                      <PixelSuitIcon suit={forcedLeadSuit} size={11} />
                      <span className="font-condensed ink-red text-[16px] sm:text-[18px] uppercase leading-none">
                        Pedaggio: apri di {getSuitDisplayName(forcedLeadSuit)}
                      </span>
                    </div>
                  )}
                  {!bossDebuffNeutralized &&
                    silencedJokerIndex !== null &&
                    activeJokers[silencedJokerIndex] && (
                      <div className="mt-1 inline-flex items-baseline gap-1.5">
                        <span className="font-condensed ink-red text-[16px] sm:text-[18px] uppercase leading-none">
                          Zitto: {activeJokers[silencedJokerIndex].name}
                        </span>
                        {activeJokers.length > 1 && (
                          <span className="font-condensed ink-dim text-[15px] leading-none">
                            poi {activeJokers[(silencedJokerIndex + 1) % activeJokers.length].name}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </motion.div>
            </details>
          )}

          {/* Desktop keeps its paper note; mobile reads it from the name row. */}
          {opponentSpeech && !shortScreen && (
            <motion.div
              key={opponentSpeech}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="hidden sm:block mt-1.5 self-start max-w-full bar-paper px-3 py-1.5 sm:flex-1 sm:min-w-0"
              style={{ transform: 'rotate(-0.5deg)' }}
            >
              <span
                className="font-condensed ink text-[17px] sm:text-[20px] leading-snug line-clamp-2"
                title={opponentSpeech}
              >
                &ldquo;{opponentSpeech}&rdquo;
              </span>
            </motion.div>
          )}
          </div>
        </div>

        {/* CENTER ARENA: DECK + TRICK CLASH (ENLARGED CARDS) */}
        {/* A row of two centres the pair, not the clash: the stock sits only on
            the left, so whatever it takes it takes off the middle. That was
            invisible while the stock was 44px wide and obvious once it was not.
            Three columns with the clash in the auto-sized middle one put it back
            on the real centre of the felt, with the stock hanging off its own
            side. */}
        <div className="game-arena min-h-0 my-1 py-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-3 z-10 relative px-1 min-w-0">
          {/* Left: Deck & Briscola Face-Up Card */}
          <div 
            className="col-start-1 flex flex-col items-center cursor-pointer group shrink-0 justify-self-start"
            onClick={onOpenDeckViewer}
            role="button"
            tabIndex={0}
            aria-label="Apri il mazzo"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenDeckViewer();
              }
            }}
            title="Ispettore Mazzo (Tocca per vedere)"
          >
            <div className="relative flex items-center justify-center min-w-[70px] sm:min-w-[80px] lg:min-w-[150px]">
              {/* Deck top face-down card (in background) */}
              {deckCount > 0 ? (
                <div className="relative z-10 mr-1">
                  <PixelCard
                    card={trumpCard ?? playerHand[0] ?? null}
                    faceDown={true}
                    size={deckCardSize}
                  />
                  <div className="absolute -top-1.5 -left-1 bg-amber-500 text-slate-950 font-pixel text-[7px] sm:text-[8px] lg:text-[11px] px-1 lg:px-1.5 py-0.2 rounded shadow font-bold pixel-box whitespace-nowrap z-15">
                    {deckCount}
                  </div>
                </div>
              ) : (
                <div className="w-11 sm:w-13 lg:w-26 h-16 sm:h-18 lg:h-38 border border-dashed border-slate-700/60 rounded-lg flex items-center justify-center text-slate-500 font-pixel text-[6.5px] lg:text-[9px] text-center p-0.5 z-10 mr-1">
                  FINE
                </div>
              )}

              {/* Briscola card face-up IN FRONT (foreground z-20).

                  It used to simply be there once the round existed, which made
                  the one moment that decides the whole hand the only one with no
                  gesture attached. It is turned over now: dealt face-down with
                  the rest, then flipped. Two stacked faces with their backs
                  hidden, because rotating a single face just shows it mirrored
                  halfway through. */}
              {trumpCard && (
                <motion.div
                  key={trumpCard.id}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { rotateY: 180, x: -34, y: -16, scale: 0.7, opacity: 0 }
                  }
                  animate={{ rotateY: 0, x: 0, y: 0, scale: 1, opacity: 1 }}
                  transition={
                    reduceMotion
                      ? { duration: 0.2 }
                      : {
                          type: 'spring',
                          damping: 15,
                          stiffness: 260,
                          delay: isDealing ? TRUMP_FLIP_DELAY : 0,
                        }
                  }
                  style={{ transformPerspective: 900, transformStyle: 'preserve-3d' }}
                  className="relative -ml-3 sm:-ml-4 lg:-ml-9 z-20 rotate-6 group-hover:rotate-0 transition-transform duration-200 shadow-xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                >
                  <div style={{ backfaceVisibility: 'hidden' }}>
                    <PixelCard
                      card={trumpCard}
                      isBriscola={true}
                      showBriscolaBadge={false}
                      size={deckCardSize}
                      showPoints={false}
                    />
                  </div>
                  <div
                    className="absolute inset-0"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <PixelCard card={trumpCard} faceDown size={deckCardSize} />
                  </div>
                </motion.div>
              )}
              {/* Il posto vuoto di fronte al mazzo: senza, il centro del panno
              cadeva sempre un mazzo piu' a destra di dove lo si guarda. */}
        </div>

            {/* Briscola Suit Pill Under Deck */}
            <div className="mt-1.5 lg:mt-2.5 flex items-center gap-1 lg:gap-1.5 bg-slate-950/90 border border-orange-500/80 px-1.5 lg:px-3 py-0.5 lg:py-1 rounded-full pixel-box shadow">
              <PixelSuitIcon suit={briscolaSuit} size={wideTable ? 16 : 10} />
              <span className="font-pixel text-[6.5px] sm:text-[7.5px] lg:text-[10px] text-orange-400 font-bold uppercase">
                {briscolaSuit}
              </span>
            </div>
          </div>

          {/* IL CENTRO DEL TAVOLO
              Una presa si gioca in verticale: lui cala, tu copri. Erano due
              caselle affiancate dentro un riquadro tratteggiato, cioe' un box
              disegnato attorno al niente; il panno e' gia' il contenitore. */}
          <div
            className={`col-start-2 justify-self-center flex items-center justify-center min-w-0 ${
              stackedClash ? 'flex-col gap-2 sm:gap-3' : 'flex-row gap-3 sm:gap-5 lg:gap-8'
            }`}
          >
            {/* Opponent Card in Trick */}
            <div className="flex flex-col items-center relative">
              <AnimatePresence mode="wait">
                {opponentTrickCard ? (
                  <div className="relative">
                    {/* Landing Impact Shockwave Ring */}
                    <motion.div
                      initial={reduceMotion ? { opacity: 0 } : { scale: 0.3, opacity: 0.9 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-xl bg-amber-400/30 border border-amber-300 pointer-events-none -z-10"
                    />
                    {/* Opponent Slam Trajectory Motion */}
                    <motion.div
                      key={opponentTrickCard.id}
                      initial={reduceMotion ? { opacity: 0 } : { y: -150, scale: 0.55, rotate: 26, opacity: 0 }}
                      animate={{ 
                        y: 0,
                        scale: 1,
                        rotate: 0,
                        opacity: 1 
                      }}
                      // The trick is swept to whoever took it: the cards leave
                      // toward the winner's side instead of fading in place.
                      exit={{
                        y: playerWonTrick ? 160 : -160,
                        scale: 0.55,
                        opacity: 0,
                        rotate: playerWonTrick ? 12 : -12,
                        transition: { duration: 0.32, ease: 'easeIn' },
                      }}
                      transition={{ type: 'spring', damping: 13, stiffness: 420, delay: 0.05 }}
                    >
                      <PixelCard
                        card={opponentTrickCard}
                        size={trickCardSize}
                        isBriscola={!hideOpponentTrickCard && opponentTrickCard.suit === briscolaSuit}
                        faceDown={hideOpponentTrickCard}
                        className="shadow-xl"
                      />
                    </motion.div>

                    {/* Captured Carico Particle Burst */}
                    {showOpponentCaricoCaptured && (
                      <CaricoParticles
                        key={`opp-captured-${opponentTrickCard.id}`}
                        card={opponentTrickCard}
                        isBriscola={opponentTrickCard.suit === briscolaSuit}
                      />
                    )}
                  </div>
                ) : (
                  <div className={`${trickSlotClass} border border-dashed ${tableTheme.cardSlotBorder} ${tableTheme.cardSlotBg} rounded-lg flex items-center justify-center font-condensed chalk-dim text-[17px] sm:text-[19px] uppercase text-center p-1`}>
                    {isPlayerTurn ? 'Aspetta' : 'Cala lui'}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Player Card in Trick */}
            <div className="flex flex-col items-center relative">
              <AnimatePresence mode="wait">
                {playerTrickCard ? (
                  <div className="relative">
                    {/* Landing Impact Shockwave Ring */}
                    <motion.div
                      initial={reduceMotion ? { opacity: 0 } : { scale: 0.3, opacity: 0.9 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className={`absolute inset-0 rounded-xl border pointer-events-none -z-10 ${
                        playerTrickCard.suit === briscolaSuit
                          ? 'bg-orange-500/40 border-orange-400'
                          : 'bg-amber-400/30 border-amber-300'
                      }`}
                    />
                    {/* Player Slam Trajectory Motion */}
                    <motion.div
                      key={playerTrickCard.id}
                      initial={reduceMotion ? { opacity: 0 } : { y: 150, scale: 0.55, rotate: -26, opacity: 0 }}
                      animate={{ 
                        y: 0,
                        scale: 1,
                        rotate: 0,
                        opacity: 1 
                      }}
                      exit={{
                        y: playerWonTrick ? 160 : -160,
                        scale: 0.55,
                        opacity: 0,
                        rotate: playerWonTrick ? -12 : 12,
                        transition: { duration: 0.32, ease: 'easeIn' },
                      }}
                      transition={{ type: 'spring', damping: 13, stiffness: 420, delay: 0.05 }}
                    >
                      <PixelCard
                        card={playerTrickCard}
                        size={trickCardSize}
                        isBriscola={playerTrickCard.suit === briscolaSuit}
                        className={`shadow-xl ${
                          playerTrickCard.suit === briscolaSuit
                            ? 'ring-2 ring-orange-500/80 shadow-orange-500/40'
                            : ''
                        }`}
                      />
                    </motion.div>

                    {/* Winning Carico (Asso / Tre) Framer Motion Particle Burst */}
                    {showPlayerCaricoParticles && (
                      <CaricoParticles
                        key={`player-carico-${playerTrickCard.id}`}
                        card={playerTrickCard}
                        isBriscola={playerTrickCard.suit === briscolaSuit}
                      />
                    )}
                  </div>
                ) : (
                  <div className={`${trickSlotClass} border border-dashed ${tableTheme.cardSlotBorder} ${tableTheme.cardSlotBg} rounded-lg flex items-center justify-center font-condensed text-[17px] sm:text-[19px] uppercase text-center p-1 ${
                    isPlayerTurn ? 'chalk-yellow' : 'chalk-dim'
                  }`}>
                    {isPlayerTurn ? 'Cala tu' : 'Aspetta'}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* 3. PLAYER HAND & ACTION CONTROLS (THE MAIN FOCUS) */}
        <div className={`game-hand z-10 flex flex-col items-center shrink-0 border-t ${tableTheme.dividerBorder} pt-1`}>
          {/* One line, one job: what happens if you commit. When the opponent has
              already led the outcome is known, so it replaces the generic prompt. */}
          <div className="game-turn-status mb-1.5 flex items-center justify-center gap-1.5 leading-none min-h-[18px]" role="status">
            {followPreview ? (
              <motion.div
                key={`${followPreview.wins}-${followPreview.points}-${followPreview.baseMult}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-baseline gap-2 font-condensed uppercase text-[19px] sm:text-[22px] leading-none ${
                  followPreview.wins ? 'chalk-green' : 'chalk-red'
                }`}
              >
                <span>{followPreview.wins ? 'La prendi' : 'La perdi'}</span>
                <span className="chalk-dim text-[17px] sm:text-[19px] tabular-nums">
                  {followPreview.points} pt briscola
                </span>
                {followPreview.wins && followPreview.baseMult > 1 && (
                  <span className="chalk-yellow text-[17px] sm:text-[19px] tabular-nums">
                    mult ×{followPreview.baseMult}
                  </span>
                )}
              </motion.div>
            ) : (
              <>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDealing ? 'bg-slate-400' : isPlayerTurn ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'
                  }`}
                />
                <span className="font-condensed chalk-dim text-[18px] sm:text-[21px] leading-none uppercase">
                  {isDealing
                    ? 'Si distribuiscono le carte...'
                    : isPlayerTurn
                      ? activeUnoToApply ? 'Scegli la carta a cui applicare la Sola' : selectedCard ? 'Premi Gioca per calare la carta' : 'Scegli una carta dalla mano'
                      : 'L\'avversario sta giocando...'}
                </span>
              </>
            )}
          </div>

          {/* The Player Hand Cards with Fan Spread and Gentle Floating Idle */}
          <div
            className="game-hand-cards relative flex items-center justify-center mt-6 mb-2 w-full max-w-md sm:max-w-lg px-2"
            style={{ minHeight: cardHeight(handCardSize) }}
          >
            {/* Cards overlap instead of spilling past the felt when an effect
                leaves the player holding more than the usual three. */}
            <AnimatePresence mode="popLayout">
              {playerHand.map((card, i) => {
                const isSelected = selectedCardId === card.id;
                const total = playerHand.length;
                const handSpacing =
                  total > 4 ? '-mx-4 sm:-mx-2' : total > 3 ? '-mx-1 sm:mx-1' : 'mx-1 sm:mx-2';
                // Player and opponent alternate, the way a real deal goes round.
                const dealDelay = isDealing ? 0.18 + i * 0.26 : 0;
                const middle = (total - 1) / 2;
                const offset = i - middle; // -1, 0, +1 for 3 cards
                const fanRotate = offset * 4.5; // gentle fan angle
                const fanY = Math.abs(offset) * 4; // subtle arc curve

                return (
                  <motion.div
                    key={card.id}
                    layout
                    // Cards arrive from the stock on the left, one at a time.
                    initial={{ x: -150, y: -110, opacity: 0, scale: 0.45, rotate: -40 }}
                    animate={{
                      x: 0,
                      y: isSelected ? -8 : fanY,
                      rotate: isSelected ? 0 : fanRotate,
                      scale: 1,
                      opacity: 1,
                      zIndex: isSelected ? 30 : 10 + i,
                    }}
                    transition={{
                      x: { type: 'spring', damping: 18, stiffness: 260, delay: dealDelay },
                      y: {
                        repeat: 0,
                        duration: reduceMotion ? 0 : 0.2,
                        ease: 'easeInOut',
                        delay: dealDelay,
                      },
                      rotate: {
                        repeat: 0,
                        duration: reduceMotion ? 0 : 0.2,
                        ease: 'easeInOut',
                        delay: dealDelay,
                      },
                      scale: { type: 'spring', damping: 20, stiffness: 350, delay: dealDelay },
                      opacity: { duration: 0.2, delay: dealDelay },
                    }}
                    whileHover={{
                      y: -14,
                      scale: 1.06,
                      zIndex: 35,
                      transition: { duration: 0.15 },
                    }}
                    exit={{
                      // Thrown at the table rather than shrunk where it stood.
                      // It leaves upward, toward the clash zone, accelerating and
                      // spinning: the trick card arriving from below then reads
                      // as the same card landing instead of a second one fading
                      // in somewhere else.
                      y: -140,
                      x: offset * -22,
                      rotate: offset * -14 + 16,
                      opacity: 0,
                      scale: 0.8,
                      // Explicit, finite exit: inheriting the infinite float
                      // transition below leaves played cards in the DOM forever,
                      // still taking layout space and pushing the hand off-centre.
                      transition: { duration: 0.22, ease: 'easeIn' },
                    }}
                    className={`flex flex-col items-center shrink-0 ${handSpacing}`}
                  >
                    <PixelCard
                      card={card}
                      selected={isSelected}
                      disabled={activeUnoToApply ? !canUseSola : !canPlay || !isCardPlayable(card)}
                      onClick={() => handleCardClick(card)}
                      isBriscola={card.suit === briscolaSuit}
                      size={handCardSize}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* The Azzardo on the selected card, said out loud before it is
              played. A Debito takes a dollar whatever happens, so the player
              reads the price here rather than discovering it afterwards. */}
          {selectedCard && selectedCard.special !== 'none' && (
            <div className="w-full max-w-xs sm:max-w-sm text-center mb-1 px-2">
              <span className="font-pixel text-[7px] text-amber-300">
                {SPECIAL_INFO[selectedCard.special].badge}
              </span>
              {/* With an empty till A Debito simply does not fire: the player
                  has to know that before playing it, not after. */}
              {selectedCard.special === 'debito' && money < 1 ? (
                <span className="font-retro text-[10px] text-slate-400 ml-1.5">
                  Non hai $1: la carta si gioca normalmente, senza bonus e senza costo.
                </span>
              ) : (
                <>
                  <span className="font-retro text-[10px] text-slate-300 ml-1.5">
                    {SPECIAL_INFO[selectedCard.special].bonus}
                  </span>
                  <span className="font-retro text-[10px] text-rose-300 block leading-tight">
                    {SPECIAL_INFO[selectedCard.special].cost}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Ergonomic Hand Action Buttons */}
          <div className="game-hand-actions flex items-center gap-2 w-full max-w-md sm:max-w-lg justify-center px-2 mb-0.5">
            <button
              type="button"
              onClick={handlePlaySelected}
              disabled={!selectedCard || !canPlay || !isCardPlayable(selectedCard)}
              // Da spento restava al 40% di opacita' su fondo scuro: il tasto
              // principale del gioco spariva dal panno. Ora spento e' scritto
              // in gesso consumato, che si legge e si capisce.
              className={`flex-1 font-condensed text-[24px] sm:text-[28px] uppercase leading-none tracking-[0.04em] py-2.5 rounded-[6px] flex items-center justify-center gap-2 cursor-pointer transition-[filter,opacity] duration-150 active:translate-y-[1px] min-h-[48px] border-2 ${
                selectedCard && canPlay && isCardPlayable(selectedCard)
                  ? 'chalk-yellow border-[rgba(232,199,102,0.75)] bg-[rgba(232,199,102,0.1)] hover:bg-[rgba(232,199,102,0.18)]'
                  : 'chalk-dim border-[rgba(185,179,163,0.28)] opacity-70 cursor-not-allowed'
              }`}
            >
              <span>Gioca</span>
              <ArrowUp size={19} strokeWidth={1.9} />
            </button>

            <button
              type="button"
              onClick={handleDiscardSelected}
              disabled={!selectedCard || !canDiscard}
              className={`font-condensed text-[21px] sm:text-[24px] uppercase leading-none px-4 py-2.5 rounded-[6px] flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px] border-2 transition-[filter,opacity] duration-150 active:translate-y-[1px] ${
                selectedCard && canDiscard
                  ? 'chalk-red border-[rgba(212,117,106,0.7)] bg-[rgba(212,117,106,0.1)] hover:bg-[rgba(212,117,106,0.18)]'
                  : 'chalk-dim border-[rgba(185,179,163,0.28)] opacity-70 cursor-not-allowed'
              }`}
            >
              <RotateCcw size={17} strokeWidth={1.9} />
              <span>Scarta {discardsLeft}</span>
            </button>
          </div>
          <button
            type="button"
            className="table-card-drawer-trigger"
            aria-haspopup="dialog"
            aria-label={`Portacarte: ${activeJokers.length} Jolly e ${consumables.length} Sola`}
            aria-expanded={cardDrawerOpen}
            aria-controls="table-card-drawer"
            onClick={() => setCardDrawerOpen(true)}
          >
            <Layers size={19} aria-hidden="true" />
            <span>Portacarte</span>
            <span className="table-card-drawer-counts">{activeJokers.length} Jolly · {consumables.length} Sola</span>
            <ChevronDown size={16} className="rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>

      <TableCardDrawer
        open={cardDrawerOpen}
        onClose={() => setCardDrawerOpen(false)}
        jokers={activeJokers}
        consumables={consumables}
        maxJokers={maxJokers}
        canUseSola={canUseSola}
        silencedJokerIndex={silencedJokerIndex}
        triggeringJokerId={triggeringJokerId}
        onUse={handleUnoCardClick}
      />

      <UnoConfirmModal
        unoCard={unoPendingConfirm}
        briscolaSuit={briscolaSuit}
        onCancel={() => setUnoPendingConfirm(null)}
        onConfirm={confirmUnoCard}
      />
    </div>
  );
};
