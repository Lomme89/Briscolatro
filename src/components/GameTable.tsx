import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayingCard, Joker, UnoCard, Suit, BossBlind } from '../types/game';
import { PixelCard } from './PixelCard';
import { PixelSuitIcon } from './PixelSuitIcon';
import { PixelAvatar, OpponentEmotion } from './PixelAvatar';
import { CaricoParticles } from './CaricoParticles';
import { resolveTrick, getSuitDisplayName } from '../game/briscola';
import { BOSS_RULES } from '../game/bossRules';
import { JokerSlot } from './JokerSlot';
import { UnoCardSlot } from './UnoCardSlot';
import { UnoConfirmModal } from './UnoConfirmModal';
import { sound } from '../services/soundEngine';
import { SPECIAL_INFO } from '../game/specialCards';
import { getTableThemeForAnte } from '../data/tableThemes';
import {
  BRISCOLA_TARGET_POINTS,
  evaluateVictoryCondition,
  VICTORY_MODES,
  VictoryMode,
} from '../game/victoryModes';
import { getRegularForAnte } from '../data/opponents';
import { TableFeltPattern } from './TableFeltPattern';
import { CardFaceArt, getJokerArtUrl, getUnoArtUrl } from './CardFaceArt';

interface GameTableProps {
  ante: number;
  round: number;
  targetScore: number;
  currentRoundScore: number;
  money: number;
  discardsLeft: number;
  handsLeft: number;
  briscolaSuit: Suit;
  trumpCard: PlayingCard | null;
  deckCount: number;
  playerHand: PlayingCard[];
  opponentHand: PlayingCard[];
  playerTrickCard: PlayingCard | null;
  opponentTrickCard: PlayingCard | null;
  isPlayerTurn: boolean;
  /** True when the player opened the trick currently on the table. */
  trickLeadIsPlayer: boolean;
  /** True while the opening hand is being dealt, so cards fly in one by one. */
  isDealing: boolean;
  /** The Baro's mirror is live: the opponent's hand is face up this trick. */
  visionActive: boolean;
  activeJokers: Joker[];
  consumables: UnoCard[];
  maxJokers: number;
  maxConsumables: number;
  currentBoss: BossBlind | null;
  bossDebuffNeutralized: boolean;
  /** Tricks left on the Scudo Protettivo. Zero when the boss is speaking. */
  bossShieldTricks: number;
  /** Il Maestro dei Bastoni: the suit the next opening is chained to. */
  forcedLeadSuit: Suit | null;
  /** Il Sovrano: which slot on the joker rail is silent this trick. */
  silencedJokerIndex: number | null;
  /** The rule this table is being played under. */
  victoryMode: VictoryMode;
  opponentSpeech: string;
  onPlayCard: (card: PlayingCard) => void;
  onDiscardCard: (card: PlayingCard) => void;
  onUseUnoCard: (card: UnoCard, targetCard?: PlayingCard, chosenSuit?: Suit) => void;
  onOpenDeckViewer: () => void;
  onOpenTutorial: () => void;
  onOpenSettings: () => void;
  triggeringJokerId: string | null;
  roundPointsTaken: number;
  totalPointsDeck: number;
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

export const GameTable: React.FC<GameTableProps> = ({
  ante,
  round,
  targetScore,
  currentRoundScore,
  money,
  discardsLeft,
  briscolaSuit,
  trumpCard,
  deckCount,
  playerHand,
  opponentHand,
  playerTrickCard,
  opponentTrickCard,
  isPlayerTurn,
  trickLeadIsPlayer,
  isDealing,
  visionActive,
  activeJokers,
  consumables,
  maxJokers,
  maxConsumables,
  currentBoss,
  bossDebuffNeutralized,
  bossShieldTricks,
  forcedLeadSuit,
  silencedJokerIndex,
  victoryMode,
  opponentSpeech,
  onPlayCard,
  onDiscardCard,
  onUseUnoCard,
  onOpenDeckViewer,
  onOpenTutorial,
  onOpenSettings,
  triggeringJokerId,
  roundPointsTaken,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeUnoToApply, setActiveUnoToApply] = useState<UnoCard | null>(null);
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
  const handCardSize = shortScreen ? 'md' : 'lg';
  const handRowMinHeight = shortScreen
    ? 'min-h-[118px]'
    : 'min-h-[148px] sm:min-h-[175px] md:min-h-[195px]';
  const trickCardSize = roomyTable ? 'lg' : 'md';
  const trickSlotClass = roomyTable
    ? 'w-[96px] sm:w-[114px] h-[138px] sm:h-[164px]'
    : 'w-20 sm:w-24 md:w-26 h-28 sm:h-34 md:h-38';

  const [inspected, setInspected] = useState<
    { kind: 'joker'; index: number } | { kind: 'uno'; index: number } | null
  >(null);

  const selectedCard = playerHand.find((c) => c.id === selectedCardId);

  // Opening the trick is where both lead restrictions bite. Working it out here
  // means an illegal card is visibly out of reach instead of being refused
  // after the tap - the rule reads as part of the table, not as a rejection.
  const isOpeningTrick = opponentTrickCard === null;
  const effectiveBoss = bossDebuffNeutralized ? null : currentBoss;
  const isCardPlayable = (card: PlayingCard): boolean => {
    if (!isOpeningTrick) return true;
    return BOSS_RULES.canPlayerLeadCard(card, effectiveBoss, playerHand, forcedLeadSuit).allowed;
  };

  const handleCardClick = (card: PlayingCard) => {
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
      if (isPlayerTurn) {
        onPlayCard(card);
        setSelectedCardId(null);
      }
    } else {
      setSelectedCardId(card.id);
    }
  };

  const handlePlaySelected = () => {
    if (!selectedCard || !isPlayerTurn) return;
    onPlayCard(selectedCard);
    setSelectedCardId(null);
  };

  const handleDiscardSelected = () => {
    if (!selectedCard || discardsLeft <= 0) return;
    onDiscardCard(selectedCard);
    setSelectedCardId(null);
  };

  const handleUnoCardClick = (unoCard: UnoCard) => {
    // Tapping the one already armed for targeting disarms it.
    if (activeUnoToApply?.id === unoCard.id) {
      setActiveUnoToApply(null);
      return;
    }
    setUnoPendingConfirm(unoCard);
  };

  const confirmUnoCard = (chosenSuit?: Suit) => {
    const unoCard = unoPendingConfirm;
    if (!unoCard) return;
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
  const modeInfo = VICTORY_MODES[victoryMode];
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
   * When the opponent has already led, the outcome of the selected card is fully
   * determined - so show it. Balatro never hides what a play is worth once the
   * inputs are known, and the base-Mult rule is only learnable if you can see it
   * before committing.
   */
  const followPreview = (() => {
    if (!opponentTrickCard || playerTrickCard || !selectedCard) return null;
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
    return { wins: clash.playerWon, points: clash.points, baseMult };
  })();

  const inspectedItem = (() => {
    if (!inspected) return null;
    if (inspected.kind === 'joker') {
      const joker = activeJokers[inspected.index];
      if (!joker) return null;
      const badges: string[] = [joker.rarity.toUpperCase()];
      if (joker.stats?.accumulatedMult) badges.push(`+${joker.stats.accumulatedMult} Mult accumulati`);
      if (joker.stats?.accumulatedChips) badges.push(`+${joker.stats.accumulatedChips} Chips accumulati`);
      return {
        icon: joker.icon,
        artUrl: getJokerArtUrl(joker.id),
        name: joker.name,
        description: joker.description,
        badges,
      };
    }
    const unoCard = consumables[inspected.index];
    if (!unoCard) return null;
    return {
      icon: unoCard.icon,
      artUrl: getUnoArtUrl(unoCard.id),
      name: unoCard.name,
      description: unoCard.description,
      badges: ['CARTA SOLA'],
    };
  })();

  const tableTheme = getTableThemeForAnte(ante);
  // Who is sitting opposite when it is not the boss of the ante: every venue
  // has its own regular, so the name and the face have to follow the ante.
  const regular = getRegularForAnte(ante);

  // Particle burst condition: Player plays or wins with Asso (1, 11pt) or Tre (3, 10pt)
  const isPlayerCarico = playerTrickCard && (playerTrickCard.rank === 1 || playerTrickCard.rank === 3);
  const showPlayerCaricoParticles = Boolean(
    isPlayerCarico && (!opponentTrickCard || playerWonTrick)
  );

  // The particles were silent: a Carico landing is the loudest thing that
  // happens in a hand of Briscola, so it gets a sound the first frame it shows.
  React.useEffect(() => {
    if (showPlayerCaricoParticles) sound.playCaricoWin();
  }, [showPlayerCaricoParticles]);

  // If opponent played an Ace or Three and player captures it!
  const isOpponentCarico = opponentTrickCard && (opponentTrickCard.rank === 1 || opponentTrickCard.rank === 3);
  const showOpponentCaricoCaptured = Boolean(
    isOpponentCarico && playerTrickCard && playerWonTrick
  );

  return (
    <div className="flex-1 flex flex-col justify-between p-1.5 sm:p-3 max-w-6xl mx-auto w-full relative min-h-[100dvh] sm:min-h-0 select-none">
      {/* 1. TOP MINIMALIST HEADER */}
      <div className="bg-slate-900/95 border-2 border-slate-700/80 px-2 sm:px-3 py-1.5 rounded-xl pixel-box shadow-lg shrink-0 z-30 relative">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Ante/Round & Target Score */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="bg-slate-950 px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/50 flex flex-col items-center justify-center shrink-0">
              <span className="font-pixel text-[8px] sm:text-[9.5px] text-amber-400 font-bold leading-none">
                A{ante} R{round}
              </span>
            </div>

            {/* Ante Venue Atmosphere Tag */}
            <div
              className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded border text-[8px] sm:text-[9px] font-pixel shrink-0 ${tableTheme.accentBadge.bg} ${tableTheme.accentBadge.border} ${tableTheme.accentBadge.text}`}
              title={tableTheme.subtitle}
            >
              <span>{tableTheme.icon}</span>
              <span className="font-bold truncate max-w-[120px]">{tableTheme.name}</span>
            </div>

            {/* Briscola Suit Pill */}
            <div className="bg-slate-950 border border-orange-500/80 px-1.5 sm:px-2 py-0.5 rounded-full text-orange-400 font-pixel text-[8px] sm:text-[9px] font-bold flex items-center gap-1 shrink-0">
              <PixelSuitIcon suit={briscolaSuit} size={12} />
              <span className="hidden sm:inline uppercase">{briscolaSuit}</span>
            </div>
          </div>

          {/* Right: Money, Discards & Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="bg-slate-950 border border-amber-500/60 px-1.5 sm:px-2 py-0.5 rounded text-amber-300 font-pixel text-[8px] sm:text-[9.5px] font-bold flex items-center gap-0.5">
              <span>💰</span>
              <span>${money}</span>
            </div>

            <div className="bg-slate-950 border border-cyan-500/60 px-1.5 sm:px-2 py-0.5 rounded text-cyan-300 font-pixel text-[8px] sm:text-[9.5px] font-bold flex items-center gap-0.5" title="Scarti rimasti">
              <span>🔄</span>
              <span>{discardsLeft}</span>
            </div>

            {/* Briscola points taken. It used to flank the table, where on a
                narrow phone it hung off the right edge of the screen. */}
            <div
              className={`bg-slate-950 border px-1.5 sm:px-2 py-0.5 rounded font-pixel text-[8px] sm:text-[9.5px] font-bold flex items-center gap-0.5 tabular-nums ${
                modeInfo.needsBriscola
                  ? victory.briscolaPassed
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-emerald-500/50 text-emerald-300'
                  : 'border-amber-500/50 text-amber-300'
              }`}
              title={
                modeInfo.needsBriscola
                  ? `Punti Briscola: ${roundPointsTaken} su 120, ne servono ${BRISCOLA_TARGET_POINTS}`
                  : 'Punti Briscola presi su 120'
              }
            >
              <span>🃏</span>
              {modeInfo.needsBriscola ? (
                <span>
                  {victory.briscolaPassed ? '✓ ' : ''}
                  {roundPointsTaken}/{BRISCOLA_TARGET_POINTS}
                </span>
              ) : (
                <span>{roundPointsTaken}</span>
              )}
            </div>

            {/* Extra Menu buttons */}
            <button
              type="button"
              onClick={onOpenDeckViewer}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-[8px] sm:text-[9px] p-1 rounded pixel-box cursor-pointer"
              title="Ispettore Mazzo"
            >
              🎴
            </button>
            <button
              type="button"
              onClick={onOpenTutorial}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-pixel text-[8px] sm:text-[9px] p-1 rounded pixel-box cursor-pointer"
              title="Guida"
            >
              ❓
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-[8px] sm:text-[9px] p-1 rounded pixel-box cursor-pointer"
              title="Impostazioni"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Score and target on their own row: on a narrow phone they cannot share
            a line with the money, the discards and the menu. */}
        <div className="flex items-center gap-2 mt-1 min-w-0">
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="font-pixel text-[7.5px] sm:text-[9px] text-slate-400 uppercase">Punti</span>
            <motion.span
              key={currentRoundScore}
              initial={{ scale: 1.3, color: '#fbbf24' }}
              animate={{ scale: 1, color: reachedTarget ? '#34d399' : '#f8fafc' }}
              transition={{ type: 'spring', damping: 12, stiffness: 320 }}
              className="font-pixel text-xs sm:text-lg font-bold leading-none tabular-nums"
            >
              {currentRoundScore.toLocaleString('it-IT')}
            </motion.span>
          </div>
          <div className="flex-1 min-w-[40px] bg-slate-950 h-2 sm:h-2.5 rounded-full border border-slate-700 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                reachedTarget
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-300'
              }`}
              animate={{ width: `${scoreProgress}%` }}
              transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            />
          </div>
          <span
            className={`font-pixel text-[8px] sm:text-[9.5px] tabular-nums shrink-0 ${
              reachedTarget ? 'text-emerald-300' : 'text-slate-400'
            }`}
          >
            {modeInfo.needsChips
              ? reachedTarget
                ? '✓ FATTO'
                : `🎯 ${targetScore.toLocaleString('it-IT')}`
              : 'PUNTEGGIO'}
          </span>
        </div>

        {/* The build, always on screen. It used to live behind a toggle, which
            hid the one thing that decides whether the blind is beatable. */}
        {(activeJokers.length > 0 || consumables.length > 0) && (
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-800 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 shrink-0">
              {activeJokers.map((joker, i) => (
                <JokerSlot
                  key={`${joker.id}-${i}`}
                  joker={joker}
                  onClick={() =>
                    setInspected((prev) =>
                      prev && prev.kind === 'joker' && prev.index === i ? null : { kind: 'joker', index: i }
                    )
                  }
                  isTriggering={joker.id === triggeringJokerId}
                  isSilenced={silencedJokerIndex === i}
                  showSellButton={false}
                  size="sm"
                />
              ))}
              {activeJokers.length < maxJokers && (
                <span className="font-pixel text-[7px] sm:text-[8px] text-slate-600 px-1 shrink-0">
                  {activeJokers.length}/{maxJokers}
                </span>
              )}
            </div>

            {consumables.length > 0 && (
              <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-slate-800">
                {consumables.map((unoCard, i) => (
                  <UnoCardSlot
                    key={`${unoCard.id}-${i}`}
                    unoCard={unoCard}
                    onUse={() => handleUnoCardClick(unoCard)}
                    canUse={true}
                    isSelected={activeUnoToApply?.id === unoCard.id}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details of whatever you tapped in the rail. */}
        <AnimatePresence>
          {inspectedItem && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              // Floats over the felt: pushing the table down would shove the
              // hand and its buttons off a phone screen.
              className="absolute left-0 right-0 top-full mt-1 z-40 px-1"
            >
              <div className="bg-slate-950/97 backdrop-blur-sm border-2 border-amber-500/70 rounded-lg px-2.5 py-2 flex items-start gap-2.5 shadow-2xl">
                {inspectedItem.artUrl ? (
                  <div className="w-9 h-12 shrink-0 rounded overflow-hidden border border-amber-500/40">
                    <CardFaceArt src={inspectedItem.artUrl} alt={inspectedItem.name} />
                  </div>
                ) : (
                  <span className="text-lg shrink-0 leading-none mt-0.5">{inspectedItem.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-pixel text-[9px] sm:text-[11px] text-amber-300 font-bold truncate">
                      {inspectedItem.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspected(null)}
                      className="font-pixel text-[8px] text-slate-400 hover:text-white px-1 cursor-pointer shrink-0"
                      aria-label="Chiudi dettagli"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="font-retro text-[11px] sm:text-xs text-slate-200 leading-snug mt-0.5">
                    {inspectedItem.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {inspectedItem.badges.map((badge) => (
                      <span
                        key={badge}
                        className="bg-slate-900 border border-slate-600 text-slate-200 font-pixel text-[7.5px] sm:text-[8.5px] px-1.5 py-0.5 rounded"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              <span className="text-sm animate-bounce">🃏</span>
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
        className={`my-1 flex-1 flex flex-col justify-between bg-gradient-to-b ${tableTheme.feltGradient} border-2 sm:border-3 ${tableTheme.feltBorder} ${tableTheme.feltOuterRing} rounded-2xl pixel-box p-2 sm:p-3 relative shadow-2xl min-h-0 transition-colors duration-500`}
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
          className={`absolute top-2 right-2.5 z-10 pointer-events-none hidden md:flex items-center gap-1.5 font-pixel text-[8px] sm:text-[9px] ${tableTheme.accentBadge.text} bg-black/40 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-xs`}
        >
          <span>{tableTheme.icon}</span>
          <span className="uppercase font-bold tracking-wider">{tableTheme.name}</span>
        </div>

        {/* OPPONENT SECTION (Top of felt table) */}
        <div className={`flex flex-col z-10 shrink-0 border-b ${tableTheme.dividerBorder} pb-1.5`}>
          <div className="flex items-center justify-between gap-2">
            {/* Opponent Info */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-900 border-2 border-amber-500/70 pixel-box flex items-center justify-center p-0.5 shadow-lg shrink-0 overflow-hidden relative">
                <PixelAvatar
                  characterId={currentBoss ? currentBoss.id : regular.characterId}
                  emotion={opponentEmotion}
                  size={32}
                  showGlow={!!currentBoss}
                />
              </div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-pixel text-[9px] sm:text-[11px] text-amber-300 font-bold">
                  {currentBoss ? currentBoss.name : regular.name}
                </span>
                {currentBoss && (
                  <span className="text-[6.5px] sm:text-[7.5px] bg-red-900 border border-red-500 text-red-200 px-1 py-0.5 rounded font-pixel uppercase font-bold animate-pulse">
                    BOSS
                  </span>
                )}
              </div>
            </div>

            {/* Opponent Face-down Cards */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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
                  size={roomyTable ? 'sm' : 'xs'}
                  animateDeal={true}
                  dealDelay={isDealing ? 0.06 + i * 0.26 : i * 0.06}
                />
              ))}
            </div>
          </div>

          {/* Dedicated Clear Boss Debuff Box (Never cut off or truncated) */}
          {currentBoss && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 bg-gradient-to-r from-red-950/95 via-red-900/90 to-red-950/95 border-2 border-red-500/80 px-2.5 py-1.5 rounded-xl shadow-lg flex items-start gap-2 text-red-100"
            >
              <div className="bg-red-800 border border-red-400 text-white rounded p-1 text-[11px] shrink-0 mt-0.5">
                💀
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-pixel text-[8px] sm:text-[9.5px] text-red-300 font-bold uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                  <span>MALUS DEL BOSS • {currentBoss.name}</span>
                  {bossDebuffNeutralized && (
                    <span className="bg-emerald-600 border border-emerald-300 text-white px-1 py-0.5 rounded text-[6.5px] sm:text-[7.5px]">
                      🛡️ SCUDO · {bossShieldTricks}{' '}
                      {bossShieldTricks === 1 ? 'PRESA' : 'PRESE'}
                    </span>
                  )}
                </div>
                <div
                  className={`font-retro text-[11px] sm:text-xs font-medium leading-tight mt-0.5 ${
                    bossDebuffNeutralized ? 'text-red-300/60 line-through' : 'text-red-100'
                  }`}
                >
                  {currentBoss.debuffDescription}
                </div>

                {/* The rule as it stands this instant. The description says what
                    the boss does; this says what it is doing to you now. */}
                {!bossDebuffNeutralized && forcedLeadSuit && isOpeningTrick && (
                  <div className="mt-1 inline-flex items-center gap-1.5 bg-red-800/80 border border-red-400 rounded-lg px-1.5 py-0.5">
                    <PixelSuitIcon suit={forcedLeadSuit} size={11} />
                    <span className="font-pixel text-[7px] sm:text-[8px] text-white uppercase">
                      Pedaggio: apri di {getSuitDisplayName(forcedLeadSuit)}
                    </span>
                  </div>
                )}
                {!bossDebuffNeutralized &&
                  silencedJokerIndex !== null &&
                  activeJokers[silencedJokerIndex] && (
                    <div className="mt-1 inline-flex items-center gap-1.5 bg-red-800/80 border border-red-400 rounded-lg px-1.5 py-0.5">
                      <span className="font-pixel text-[7px] sm:text-[8px] text-white uppercase">
                        🔇 Zitto: {activeJokers[silencedJokerIndex].name}
                      </span>
                      {activeJokers.length > 1 && (
                        <span className="font-retro text-[9px] text-red-200">
                          poi {activeJokers[(silencedJokerIndex + 1) % activeJokers.length].name}
                        </span>
                      )}
                    </div>
                  )}
              </div>
            </motion.div>
          )}

          {/* Multi-line Comic Speech Bubble (Clear, Uncompressed & Legible) */}
          {opponentSpeech && (
            <motion.div
              key={opponentSpeech}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="mt-1 bg-slate-950/90 border border-amber-500/50 text-slate-100 font-retro text-[10px] sm:text-xs px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1.5"
            >
              <span className="text-amber-400 font-pixel text-xs shrink-0">💬</span>
              <span className="leading-snug italic font-medium">"{opponentSpeech}"</span>
            </motion.div>
          )}
        </div>

        {/* CENTER ARENA: DECK + TRICK CLASH (ENLARGED CARDS) */}
        <div className="flex-1 min-h-0 my-1 py-1 flex items-center justify-center gap-1 sm:gap-4 z-10 relative px-1 min-w-0">
          {/* Left: Deck & Briscola Face-Up Card */}
          <div 
            className="flex flex-col items-center cursor-pointer group shrink-0"
            onClick={onOpenDeckViewer}
            title="Ispettore Mazzo (Tocca per vedere)"
          >
            <div className="relative flex items-center justify-center min-w-[70px] sm:min-w-[80px]">
              {/* Deck top face-down card (in background) */}
              {deckCount > 0 ? (
                <div className="relative z-10 mr-1">
                  <PixelCard
                    card={trumpCard ?? playerHand[0] ?? null}
                    faceDown={true}
                    size="xs"
                  />
                  <div className="absolute -top-1.5 -left-1 bg-amber-500 text-slate-950 font-pixel text-[7px] sm:text-[8px] px-1 py-0.2 rounded shadow font-bold pixel-box whitespace-nowrap z-15">
                    {deckCount}
                  </div>
                </div>
              ) : (
                <div className="w-11 sm:w-13 h-16 sm:h-18 border border-dashed border-slate-700/60 rounded-lg flex items-center justify-center text-slate-500 font-pixel text-[6.5px] text-center p-0.5 z-10 mr-1">
                  FINE
                </div>
              )}

              {/* Briscola card face-up IN FRONT (foreground z-20) */}
              {trumpCard && (
                <div className="relative -ml-3 sm:-ml-4 z-20 transform rotate-6 group-hover:rotate-0 transition-transform duration-200 shadow-xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                  <PixelCard
                    card={trumpCard}
                    isBriscola={true}
                    showBriscolaBadge={false}
                    size="xs"
                    showPoints={true}
                  />
                </div>
              )}
            </div>

            {/* Briscola Suit Pill Under Deck */}
            <div className="mt-1.5 flex items-center gap-1 bg-slate-950/90 border border-orange-500/80 px-1.5 py-0.5 rounded-full pixel-box shadow">
              <PixelSuitIcon suit={briscolaSuit} size={10} />
              <span className="font-pixel text-[6.5px] sm:text-[7.5px] text-orange-400 font-bold uppercase">
                {briscolaSuit}
              </span>
            </div>
          </div>

          {/* Center: Trick Cards Clash Zone (LARGE IMPACT CARDS) */}
          <div className="flex-1 min-w-0 max-w-[300px] sm:max-w-md flex items-center justify-center gap-1.5 sm:gap-4 p-2 bg-black/45 border border-dashed border-emerald-800/60 rounded-xl pixel-box relative shadow-xl mx-auto">
            {/* Opponent Card in Trick */}
            <div className="flex flex-col items-center relative">
              <span className="text-[7px] sm:text-[8px] font-pixel text-slate-400 mb-0.5">AVVERSARIO</span>
              <AnimatePresence mode="wait">
                {opponentTrickCard ? (
                  <div className="relative">
                    {/* Landing Impact Shockwave Ring */}
                    <motion.div
                      initial={{ scale: 0.3, opacity: 0.9 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-xl bg-amber-400/30 border border-amber-300 pointer-events-none -z-10"
                    />
                    {/* Opponent Slam Trajectory Motion */}
                    <motion.div
                      key={opponentTrickCard.id}
                      initial={{ y: -80, scale: 0.5, rotate: 18, opacity: 0 }}
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
                      transition={{ type: 'spring', damping: 18, stiffness: 300 }}
                    >
                      <PixelCard
                        card={opponentTrickCard}
                        size={trickCardSize}
                        isBriscola={opponentTrickCard.suit === briscolaSuit}
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
                  <div className={`${trickSlotClass} border border-dashed ${tableTheme.cardSlotBorder} ${tableTheme.cardSlotBg} rounded-lg flex items-center justify-center text-slate-500 font-pixel text-[7.5px] text-center p-1`}>
                    ...
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* VS Emblem & Energy Clash Indicator */}
            <div className="flex flex-col items-center px-0.5 relative shrink-0">
              <motion.div
                animate={{ scale: opponentTrickCard && playerTrickCard ? [1, 1.25, 1] : 1 }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="text-xs sm:text-sm font-pixel font-black text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
              >
                VS
              </motion.div>
            </div>

            {/* Player Card in Trick */}
            <div className="flex flex-col items-center relative">
              <span className="text-[7px] sm:text-[8px] font-pixel text-amber-400 mb-0.5">LA TUA CARTA</span>
              <AnimatePresence mode="wait">
                {playerTrickCard ? (
                  <div className="relative">
                    {/* Landing Impact Shockwave Ring */}
                    <motion.div
                      initial={{ scale: 0.3, opacity: 0.9 }}
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
                      initial={{ y: 80, scale: 0.5, rotate: -18, opacity: 0 }}
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
                      transition={{ type: 'spring', damping: 18, stiffness: 300 }}
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
                  <div className={`${trickSlotClass} border border-dashed ${tableTheme.cardSlotBorder} ${tableTheme.cardSlotBg} rounded-lg flex items-center justify-center text-slate-400 font-pixel text-[7.5px] text-center p-1`}>
                    {isPlayerTurn ? 'SCEGLI' : '...'}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* 3. PLAYER HAND & ACTION CONTROLS (THE MAIN FOCUS) */}
        <div className={`z-10 flex flex-col items-center shrink-0 border-t ${tableTheme.dividerBorder} pt-1 pb-0.5`}>
          {/* One line, one job: what happens if you commit. When the opponent has
              already led the outcome is known, so it replaces the generic prompt. */}
          <div className="mb-0.5 flex items-center justify-center gap-1.5 leading-none min-h-[16px]">
            {followPreview ? (
              <motion.div
                key={`${followPreview.wins}-${followPreview.points}-${followPreview.baseMult}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`px-2 py-0.5 rounded-md border-2 flex items-center gap-1.5 font-pixel text-[8px] sm:text-[9.5px] font-bold ${
                  followPreview.wins
                    ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
                    : 'bg-red-950/95 border-red-500/80 text-red-200'
                }`}
              >
                <span>{followPreview.wins ? '✔ PRENDI' : '✘ PERDI'}</span>
                <span className="text-slate-300">{followPreview.points} pt</span>
                {followPreview.wins && followPreview.baseMult > 1 && (
                  <span className="text-red-300">MULT ×{followPreview.baseMult}</span>
                )}
              </motion.div>
            ) : (
              <>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDealing ? 'bg-slate-400' : isPlayerTurn ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'
                  }`}
                />
                <span className="font-pixel text-[7.5px] sm:text-[9px] text-amber-300 font-bold uppercase">
                  {isDealing
                    ? 'Si distribuiscono le carte...'
                    : isPlayerTurn
                      ? 'Tocca una carta per giocare'
                      : 'L\'avversario sta giocando...'}
                </span>
              </>
            )}
          </div>

          {/* The Player Hand Cards with Fan Spread and Gentle Floating Idle */}
          <div className={`relative flex items-center justify-center my-1.5 w-full max-w-md sm:max-w-lg px-2 ${handRowMinHeight}`}>
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
                      y: isSelected ? -20 : [fanY, fanY - 4, fanY],
                      rotate: isSelected ? 0 : [fanRotate, fanRotate + (offset < 0 ? -0.8 : offset > 0 ? 0.8 : 0), fanRotate],
                      scale: isSelected ? 1.08 : 1,
                      opacity: 1,
                      zIndex: isSelected ? 30 : 10 + i,
                    }}
                    transition={{
                      x: { type: 'spring', damping: 18, stiffness: 260, delay: dealDelay },
                      y: {
                        repeat: isSelected ? 0 : Infinity,
                        duration: 2.8 + i * 0.4,
                        ease: 'easeInOut',
                        delay: dealDelay,
                      },
                      rotate: {
                        repeat: isSelected ? 0 : Infinity,
                        duration: 3.4 + i * 0.4,
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
                      y: -50,
                      opacity: 0,
                      scale: 0.5,
                      // Explicit, finite exit: inheriting the infinite float
                      // transition below leaves played cards in the DOM forever,
                      // still taking layout space and pushing the hand off-centre.
                      transition: { duration: 0.2, ease: 'easeIn' },
                    }}
                    className={`flex flex-col items-center shrink-0 ${handSpacing}`}
                  >
                    <PixelCard
                      card={card}
                      selected={isSelected}
                      disabled={!isCardPlayable(card)}
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
          <div className="flex items-center gap-2 w-full max-w-xs sm:max-w-sm justify-center mb-0.5">
            <button
              type="button"
              onClick={handlePlaySelected}
              disabled={!selectedCard || !isPlayerTurn}
              className={`flex-1 font-pixel text-[10px] sm:text-xs py-1.5 sm:py-2 rounded-xl pixel-box font-bold flex items-center justify-center gap-1 shadow-lg cursor-pointer transition-all active:scale-[0.98] min-h-[36px] sm:min-h-[40px] ${
                selectedCard && isPlayerTurn
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-40'
              }`}
            >
              <span>GIOCA</span>
              <span>⚔️</span>
            </button>

            <button
              type="button"
              onClick={handleDiscardSelected}
              disabled={!selectedCard || discardsLeft <= 0}
              className={`font-pixel text-[9px] sm:text-[10px] px-2.5 py-1.5 sm:py-2 rounded-xl pixel-box font-bold flex items-center justify-center gap-1 cursor-pointer min-h-[36px] sm:min-h-[40px] transition-all active:scale-[0.98] ${
                selectedCard && discardsLeft > 0
                  ? 'bg-red-800 hover:bg-red-700 text-white shadow-md'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              <span>SCARTA ({discardsLeft})</span>
              <span>🔄</span>
            </button>
          </div>
        </div>
      </div>

      <UnoConfirmModal
        unoCard={unoPendingConfirm}
        briscolaSuit={briscolaSuit}
        onCancel={() => setUnoPendingConfirm(null)}
        onConfirm={confirmUnoCard}
      />
    </div>
  );
};