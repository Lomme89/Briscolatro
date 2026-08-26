#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`File non trovato: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}

function write(rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf8');
  console.log(`✓ ${rel}`);
}

function replaceOnce(text, search, replacement, label) {
  const matches = typeof search === 'string'
    ? text.split(search).length - 1
    : [...text.matchAll(new RegExp(search.source, search.flags.includes('g') ? search.flags : search.flags + 'g'))].length;
  if (matches !== 1) throw new Error(`${label}: attese 1 corrispondenza, trovate ${matches}`);
  return text.replace(search, replacement);
}

// ---------------------------------------------------------------------------
// App.tsx — make turn ownership authoritative and remove race windows.
// ---------------------------------------------------------------------------
let app = read('src/App.tsx');

app = replaceOnce(
  app,
  "import { resolveTrick } from './game/briscola';",
  "import { resolveTrick } from './game/briscola';\nimport { chooseOpponentLead, chooseOpponentFollow } from './game/ai';",
  'App import AI'
);

app = replaceOnce(
  app,
  `export type TrickPhase =\n  | 'idle'\n  | 'waiting_player_follow'\n  | 'resolving'\n  | 'tally'\n  | 'drawing'\n  | 'round_end';`,
  `export type TrickPhase =\n  | 'idle'\n  | 'opponent_thinking'\n  | 'waiting_player_follow'\n  | 'resolving'\n  | 'tally'\n  | 'drawing'\n  | 'round_end';`,
  'App TrickPhase'
);

app = replaceOnce(
  app,
  "  const [trickPhase, setTrickPhase] = useState<TrickPhase>('idle');",
  "  const [trickPhase, setTrickPhase] = useState<TrickPhase>('idle');\n  const [leadIsPlayer, setLeadIsPlayer] = useState<boolean>(true);",
  'App lead state'
);

app = replaceOnce(
  app,
  `  const isReverseActiveRef = useRef<boolean>(isReverseActive);\n  isReverseActiveRef.current = isReverseActive;`,
  `  const isReverseActiveRef = useRef<boolean>(isReverseActive);\n  isReverseActiveRef.current = isReverseActive;\n  const playerTrickCardRef = useRef<PlayingCard | null>(playerTrickCard);\n  playerTrickCardRef.current = playerTrickCard;\n  const opponentTrickCardRef = useRef<PlayingCard | null>(opponentTrickCard);\n  opponentTrickCardRef.current = opponentTrickCard;\n  const leadIsPlayerRef = useRef<boolean>(leadIsPlayer);\n  leadIsPlayerRef.current = leadIsPlayer;\n  const flowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n\n  const cancelFlowAction = useCallback(() => {\n    if (flowTimerRef.current !== null) {\n      clearTimeout(flowTimerRef.current);\n      flowTimerRef.current = null;\n    }\n  }, []);\n\n  const scheduleFlowAction = useCallback((fn: () => void, delayMs: number) => {\n    if (flowTimerRef.current !== null) clearTimeout(flowTimerRef.current);\n    flowTimerRef.current = setTimeout(() => {\n      flowTimerRef.current = null;\n      fn();\n    }, delayMs);\n  }, []);`,
  'App refs/flow timer'
);

app = replaceOnce(
  app,
  `  useEffect(() => {\n    return () => {\n      activeTimersRef.current.forEach(clearTimeout);\n    };\n  }, []);`,
  `  useEffect(() => {\n    return () => {\n      activeTimersRef.current.forEach(clearTimeout);\n      if (flowTimerRef.current !== null) clearTimeout(flowTimerRef.current);\n    };\n  }, []);`,
  'App cleanup'
);

app = replaceOnce(
  app,
  `    setPlayerTrickCard(null);\n    setOpponentTrickCard(null);\n    setTricksPlayedInRound(0);`,
  `    cancelFlowAction();\n    setPlayerTrickCard(null);\n    playerTrickCardRef.current = null;\n    setOpponentTrickCard(null);\n    opponentTrickCardRef.current = null;\n    setLeadIsPlayer(true);\n    leadIsPlayerRef.current = true;\n    setTricksPlayedInRound(0);`,
  'App init trick refs'
);

const aiBlock = `  // --- Opponent Lead AI ---
  const triggerOpponentLead = (overrideHand?: PlayingCard[], overrideSuit?: Suit) => {
    const currentHand = overrideHand ?? opponentHandRef.current;
    const currentSuit = overrideSuit ?? briscolaSuitRef.current;

    // A scheduled AI action is stale if a card is already on the table.
    if (playerTrickCardRef.current || opponentTrickCardRef.current) return;

    setIsPlayerTurn(false);
    setTrickPhase('opponent_thinking');
    setLeadIsPlayer(false);
    leadIsPlayerRef.current = false;

    const chosenCard = chooseOpponentLead(currentHand, {
      briscolaSuit: currentSuit,
      bossDebuff: activeBossRef.current?.debuffType,
      isReverse: isReverseActiveRef.current,
    });

    if (!chosenCard) {
      // Never fabricate a card. Empty-hand here means an invariant was already broken.
      console.error('Briscolatro invariant: opponent asked to lead with an empty hand');
      return;
    }

    const nextHand = currentHand.filter((c) => c.id !== chosenCard.id);
    opponentHandRef.current = nextHand;
    opponentTrickCardRef.current = chosenCard;
    setOpponentHand(nextHand);
    setOpponentTrickCard(chosenCard);
    sound.playCardSlam();

    setIsPlayerTurn(true);
    setTrickPhase('waiting_player_follow');
  };

  // --- Opponent Follow AI ---
  const triggerOpponentFollow = (playerCardPlayed: PlayingCard, overrideHand?: PlayingCard[]) => {
    const currentHand = overrideHand ?? opponentHandRef.current;

    // Ignore stale/doubled scheduled callbacks.
    if (opponentTrickCardRef.current || playerTrickCardRef.current?.id !== playerCardPlayed.id) return;

    setIsPlayerTurn(false);
    setTrickPhase('opponent_thinking');

    const chosenCard = chooseOpponentFollow(currentHand, playerCardPlayed, {
      briscolaSuit: briscolaSuitRef.current,
      bossDebuff: activeBossRef.current?.debuffType,
      isReverse: isReverseActiveRef.current,
    });

    if (!chosenCard) {
      console.error('Briscolatro invariant: opponent asked to follow with an empty hand');
      return;
    }

    const nextHand = currentHand.filter((c) => c.id !== chosenCard.id);
    opponentHandRef.current = nextHand;
    opponentTrickCardRef.current = chosenCard;
    setOpponentHand(nextHand);
    setOpponentTrickCard(chosenCard);
    sound.playCardSlam();

    scheduleFlowAction(() => {
      resolveCurrentClash(playerCardPlayed, chosenCard, true);
    }, 450);
  };

`;

app = replaceOnce(
  app,
  /  \/\/ --- Opponent Lead AI ---[\s\S]*?(?=  \/\/ --- Resolve Trick Clash ---)/,
  aiBlock,
  'App AI block'
);

const resolveBlock = `  // --- Resolve Trick Clash ---
  const resolveCurrentClash = (
    playerCard: PlayingCard,
    oppCard: PlayingCard,
    leadWasPlayer: boolean
  ) => {
    // Only resolve the exact two cards currently on the table.
    if (playerTrickCardRef.current?.id !== playerCard.id || opponentTrickCardRef.current?.id !== oppCard.id) {
      return;
    }

    setIsPlayerTurn(false);
    setTrickPhase('resolving');

    const currentBriscola = briscolaSuitRef.current;
    const currentBoss = activeBossRef.current;
    const currentReverse = isReverseActiveRef.current;
    setLeadIsPlayer(leadWasPlayer);
    leadIsPlayerRef.current = leadWasPlayer;

    const clash = resolveTrick(
      leadWasPlayer ? playerCard : oppCard,
      leadWasPlayer ? oppCard : playerCard,
      currentBriscola,
      leadWasPlayer,
      currentBoss?.debuffType,
      currentReverse
    );

    if (clash.playerWon) {
      sound.playTrickWin();
      triggerScreenShake();

      const livePlayerHand = playerHandRef.current;
      const cardsStillInStock = drawPileRef.current.length + (trumpCardRef.current ? 1 : 0);
      const remainingTricks = livePlayerHand.length + Math.ceil(cardsStillInStock / 2);
      const scoreResult = calculateTrickScore(
        playerCard,
        oppCard,
        clash,
        currentBriscola,
        activeJokers,
        currentBoss,
        {
          money,
          playerHand: livePlayerHand,
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

      if (scoreResult.transmutedCard) {
        const trans = scoreResult.transmutedCard;
        setRunDeck((prev) => {
          const idx = prev.findIndex((c) => c.suit !== 'denari');
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], suit: trans.suit, edition: trans.edition };
          return next;
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
      setTallyData({ chips: 0, mult: 1, finalScore: 0, trickPoints: clash.points, playerWon: false });
    }

    setTrickPhase('tally');
  };

`;

app = replaceOnce(
  app,
  /  \/\/ --- Resolve Trick Clash ---[\s\S]*?(?=  \/\/ --- Tally Complete State Transition ---)/,
  resolveBlock,
  'App resolve block'
);

app = replaceOnce(
  app,
  `    // Reset trick variables\n    setPlayerTrickCard(null);\n    setOpponentTrickCard(null);`,
  `    // Reset trick variables\n    setPlayerTrickCard(null);\n    playerTrickCardRef.current = null;\n    setOpponentTrickCard(null);\n    opponentTrickCardRef.current = null;`,
  'App tally clear refs'
);

app = replaceOnce(
  app,
  `    } else {\n      // Round continues!\n      setIsPlayerTurn(playerWon);\n      setTrickPhase('idle');\n\n      if (!playerWon) {\n        // Opponent's turn to lead - pass the freshly dealt hand and suit directly!\n        scheduleAction(() => {\n          triggerOpponentLead(newOpponentHand, nextBriscolaSuit);\n        }, 700);\n      }\n    }`,
  `    } else {\n      // The trick winner leads the next trick. Keep the table locked while the AI thinks.\n      if (playerWon) {\n        setLeadIsPlayer(true);\n        leadIsPlayerRef.current = true;\n        setIsPlayerTurn(true);\n        setTrickPhase('idle');\n      } else {\n        setLeadIsPlayer(false);\n        leadIsPlayerRef.current = false;\n        setIsPlayerTurn(false);\n        setTrickPhase('opponent_thinking');\n        scheduleFlowAction(() => {\n          triggerOpponentLead(newOpponentHand, nextBriscolaSuit);\n        }, 550);\n      }\n    }`,
  'App next leader transition'
);

const playerBlock = `  // --- Player Plays Card ---
  const handlePlayCard = (requestedCard: PlayingCard) => {
    if (!isPlayerTurn) return;

    const playerIsLeading = trickPhase === 'idle' && opponentTrickCardRef.current === null;
    const playerIsFollowing = trickPhase === 'waiting_player_follow' && opponentTrickCardRef.current !== null;
    if (!playerIsLeading && !playerIsFollowing) return;
    if (playerTrickCardRef.current !== null) return;

    const card = playerHandRef.current.find((c) => c.id === requestedCard.id);
    if (!card) return; // stale UI click / double tap

    if (playerIsLeading) {
      const bossCheck = BOSS_RULES.canPlayerLeadCard(card, activeBossRef.current);
      if (!bossCheck.allowed) {
        sound.playTrickLose();
        setOpponentSpeech(bossCheck.reason || 'Mossa non consentita!');
        return;
      }
    }

    // Lock input synchronously before any animation/timer can fire.
    setIsPlayerTurn(false);
    sound.playCardSlam();

    const nextPlayerHand = playerHandRef.current.filter((c) => c.id !== card.id);
    playerHandRef.current = nextPlayerHand;
    playerTrickCardRef.current = card;
    setPlayerHand(nextPlayerHand);
    setPlayerTrickCard(card);

    if (playerIsLeading) {
      setLeadIsPlayer(true);
      leadIsPlayerRef.current = true;
      setTrickPhase('opponent_thinking');
      scheduleFlowAction(() => triggerOpponentFollow(card, opponentHandRef.current), 500);
      return;
    }

    const opponentLeadCard = opponentTrickCardRef.current;
    if (!opponentLeadCard) return;
    setLeadIsPlayer(false);
    leadIsPlayerRef.current = false;
    setTrickPhase('resolving');
    scheduleFlowAction(() => resolveCurrentClash(card, opponentLeadCard, false), 400);
  };

`;

app = replaceOnce(
  app,
  /  \/\/ --- Player Plays Card ---[\s\S]*?(?=  \/\/ --- Player Discards Card \(Scarto as Exchange\) ---)/,
  playerBlock,
  'App player play block'
);

app = replaceOnce(
  app,
  `  const handleUseUnoCard = (unoCard: UnoCard, targetCard?: PlayingCard) => {\n    sound.playBoosterRip();`,
  `  const handleUseUnoCard = (unoCard: UnoCard, targetCard?: PlayingCard) => {\n    const canUseNow =\n      isPlayerTurn &&\n      playerTrickCardRef.current === null &&\n      (trickPhase === 'idle' || trickPhase === 'waiting_player_follow');\n    if (!canUseNow) return;\n\n    sound.playBoosterRip();`,
  'App UNO guard'
);

app = replaceOnce(
  app,
  `            opponentTrickCard={opponentTrickCard}\n            isPlayerTurn={isPlayerTurn && trickPhase !== 'resolving' && trickPhase !== 'tally'}`,
  `            opponentTrickCard={opponentTrickCard}\n            leadIsPlayer={leadIsPlayer}\n            isReverseActive={isReverseActive}\n            isPlayerTurn={\n              isPlayerTurn &&\n              (trickPhase === 'idle' || trickPhase === 'waiting_player_follow')\n            }`,
  'App GameTable turn props'
);

write('src/App.tsx', app);


// ---------------------------------------------------------------------------
// UNO +2 cards — never change only one player's hand size in a trick game.
// They now cycle two stock cards while keeping the player's hand size constant.
// ---------------------------------------------------------------------------
let uno = read('src/game/unoEffects.ts');

uno = replaceOnce(
  uno,
  `export const UNO_EFFECT_HANDLERS: Record<\n  string,\n  (ctx: UnoActionContext) => UnoActionResult\n> = {`,
  `function cycleTwoStockCards(ctx: UnoActionContext, preferCarichi = false) {\n  const nextPile = [...ctx.drawPile];\n  const originalSize = ctx.playerHand.length;\n  const drawn: PlayingCard[] = [];\n  for (let i = 0; i < 2 && nextPile.length > 0; i++) drawn.push(nextPile.pop()!);\n  if (drawn.length === 0) return { hand: ctx.playerHand, pile: ctx.drawPile, cycled: 0 };\n\n  const desirability = (card: PlayingCard) => {\n    const trump = card.suit === ctx.briscolaSuit || card.enhancement === 'wild' ? 12 : 0;\n    const carico = preferCarichi ? card.points * 40 : card.points * 25;\n    const edition = card.edition === 'standard' ? 0 : 6;\n    return carico + card.power + trump + edition;\n  };\n\n  const combined = [...ctx.playerHand, ...drawn].sort((a, b) => desirability(b) - desirability(a));\n  const hand = combined.slice(0, originalSize);\n  const returned = combined.slice(originalSize);\n  // Returned cards go to the bottom. Stock size and hand size are unchanged.\n  nextPile.unshift(...returned);\n  return { hand, pile: nextPile, cycled: drawn.length };\n}\n\nexport const UNO_EFFECT_HANDLERS: Record<\n  string,\n  (ctx: UnoActionContext) => UnoActionResult\n> = {`,
  'UNO cycle helper'
);

uno = replaceOnce(
  uno,
  /  \/\/ \+2 Pesca Due \(Rosso\):[\s\S]*?(?=  \/\/ \+2 Pesca Due \(Blu\):)/,
  `  // +2 Rosso: cycle two stock cards without breaking player/opponent hand parity.\n  uno_plus_two_red: (ctx) => {\n    const cycled = cycleTwoStockCards(ctx, false);\n    return {\n      newDrawPile: cycled.pile,\n      newPlayerHand: cycled.hand,\n      newOpponentHand: ctx.opponentHand,\n      newBriscolaSuit: ctx.briscolaSuit,\n      newMoney: ctx.money,\n      newDiscardsLeft: ctx.discardsLeft,\n      newActiveJokers: ctx.activeJokers,\n      newRoundScore: ctx.currentRoundScore + 60,\n      newBossDebuffActive: ctx.bossDebuffActive,\n      newActiveUnoMultiplier: ctx.activeUnoMultiplier,\n      newIsReverseActive: ctx.isReverseActive,\n      feedbackMessage: cycled.cycled > 0\n        ? \`+2: hai ciclato \${cycled.cycled} carte mantenendo la mano a \${ctx.playerHand.length}. +60 Chips!\`\n        : '+60 Chips! Il mazzo è ormai esaurito.',\n    };\n  },\n\n`,
  'UNO red +2 parity'
);

uno = replaceOnce(
  uno,
  /  \/\/ \+2 Pesca Due \(Blu\):[\s\S]*?(?=  \/\/ \+4 Jolly Pesca Quattro:)/,
  `  // +2 Blu: same safe cycle, biased toward keeping Carichi.\n  uno_plus_two_blue: (ctx) => {\n    const cycled = cycleTwoStockCards(ctx, true);\n    return {\n      newDrawPile: cycled.pile,\n      newPlayerHand: cycled.hand,\n      newOpponentHand: ctx.opponentHand,\n      newBriscolaSuit: ctx.briscolaSuit,\n      newMoney: ctx.money + 3,\n      newDiscardsLeft: ctx.discardsLeft,\n      newActiveJokers: ctx.activeJokers,\n      newRoundScore: ctx.currentRoundScore,\n      newBossDebuffActive: ctx.bossDebuffActive,\n      newActiveUnoMultiplier: ctx.activeUnoMultiplier,\n      newIsReverseActive: ctx.isReverseActive,\n      feedbackMessage: cycled.cycled > 0\n        ? \`+2 Blu: cercati Carichi tra \${cycled.cycled} carte. +$3!\`\n        : '+$3! Il mazzo è ormai esaurito.',\n    };\n  },\n\n`,
  'UNO blue +2 parity'
);

write('src/game/unoEffects.ts', uno);

let unoCards = read('src/data/unoCards.ts');
unoCards = replaceOnce(
  unoCards,
  "description: 'Pesca immediatamente 2 carte dal mazzo e conferisce +60 Chips alla presa attuale!',",
  "description: 'Guarda 2 carte dal mazzo, tieni automaticamente le migliori e rimetti 2 carte in fondo. La mano resta a 3 carte. +60 Chips!',",
  'UNO red description'
);
unoCards = replaceOnce(
  unoCards,
  "description: 'Pesca 2 carte cariche dal mazzo e aggiunge +$3 al tuo portafoglio.',",
  "description: 'Cerca Carichi tra 2 carte del mazzo, tieni automaticamente le migliori e rimetti 2 carte in fondo. +$3.',",
  'UNO blue description'
);
write('src/data/unoCards.ts', unoCards);

// ---------------------------------------------------------------------------
// GameTable.tsx — presentation must use the same resolver/leader as App.
// ---------------------------------------------------------------------------
let table = read('src/components/GameTable.tsx');

table = replaceOnce(table, "import { resolveTrick } from '../data/cards';", "import { resolveTrick } from '../game/briscola';", 'GameTable canonical resolver');

table = replaceOnce(
  table,
  `  opponentTrickCard: PlayingCard | null;\n  isPlayerTurn: boolean;`,
  `  opponentTrickCard: PlayingCard | null;\n  leadIsPlayer: boolean;\n  isReverseActive: boolean;\n  isPlayerTurn: boolean;`,
  'GameTable prop types'
);

table = replaceOnce(
  table,
  `  opponentTrickCard,\n  isPlayerTurn,`,
  `  opponentTrickCard,\n  leadIsPlayer,\n  isReverseActive,\n  isPlayerTurn,`,
  'GameTable destructure'
);

table = replaceOnce(
  table,
  `  const handleCardClick = (card: PlayingCard) => {\n    sound.playCardSelect();`,
  `  const handleCardClick = (card: PlayingCard) => {\n    if (!isPlayerTurn) return;\n    sound.playCardSelect();`,
  'GameTable card gate'
);

table = replaceOnce(
  table,
  `  const handleDiscardSelected = () => {\n    if (!selectedCard || discardsLeft <= 0) return;`,
  `  const handleDiscardSelected = () => {\n    if (!selectedCard || discardsLeft <= 0 || !isPlayerTurn) return;`,
  'GameTable discard gate'
);

table = replaceOnce(
  table,
  `  const handleUnoCardClick = (unoCard: UnoCard) => {\n    if (unoCard.targetType === 'card_in_hand') {`,
  `  const handleUnoCardClick = (unoCard: UnoCard) => {\n    if (!isPlayerTurn) return;\n    if (unoCard.targetType === 'card_in_hand') {`,
  'GameTable UNO gate'
);

table = replaceOnce(
  table,
  `    const res = resolveTrick(\n      playerTrickCard,\n      opponentTrickCard,\n      briscolaSuit,\n      true,\n      currentBoss?.debuffType\n    );`,
  `    const leadCard = leadIsPlayer ? playerTrickCard : opponentTrickCard;\n    const followCard = leadIsPlayer ? opponentTrickCard : playerTrickCard;\n    const res = resolveTrick(\n      leadCard,\n      followCard,\n      briscolaSuit,\n      leadIsPlayer,\n      currentBoss?.debuffType,\n      isReverseActive\n    );`,
  'GameTable winner display'
);

write('src/components/GameTable.tsx', table);

// ---------------------------------------------------------------------------
// Score overlay must BLOCK the table, not pass taps through it.
// ---------------------------------------------------------------------------
let tally = read('src/components/ScoreTallyOverlay.tsx');
const before = tally;
tally = tally.replaceAll('pointer-events-none', 'pointer-events-auto');
if (tally === before) throw new Error('ScoreTallyOverlay: pointer-events-none non trovato');
write('src/components/ScoreTallyOverlay.tsx', tally);

console.log('\nFix turni applicato. Ora esegui:');
console.log('  bun run lint');
console.log('  bunx vitest run src/game/briscola.test.ts src/game/ai.test.ts');
console.log('  bun run build');
