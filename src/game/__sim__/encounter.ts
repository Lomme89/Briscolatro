import { BossBlind, Joker, PlayingCard, Suit, UnoCard } from '../../types/game';
import { ALL_UNO_CARDS } from '../../data/unoCards';
import { resolveTrick } from '../briscola';
import {
  clearSpecialInRunDeck,
  drawNextTrickCards,
  foilRandomCardInRunDeck,
  isRoundFinished,
  prepareRoundDeck,
} from '../gameState';
import { chooseOpponentFollow, chooseOpponentLead } from '../ai';
import { AI_PROFILES } from '../aiProfiles';
import { BOSS_RULES } from '../bossRules';
import { calculateTrickScore } from '../scoring';
import { getActiveBossRules } from '../endlessBosses';
import { JOKER_EFFECTS } from '../jokerEffects';
import { resolveSpecialForTrick, visiblePlayerCards } from '../specialCards';
import { executeUnoCard } from '../unoEffects';
import { createBlueSealReward, getUnoDefinitionId, sameUnoInstance } from '../itemInstances';
import { readPlayerThreat } from '../opponentThreat';
import { PlayerPolicy, PolicyState } from './policies';
import { SolaPlan, SolaPolicy } from './solaPlay';

/**
 * L'incontro, giocato con le funzioni del gioco.
 *
 * The old harness played a simplified Briscola beside the real one: money was
 * a constant 10, a Carta Sola was "x1.5 on some trick", and a Boss was a
 * `debuffType` string handed to `resolveTrick` and nothing more. Every one of
 * those is a place where a balance number could be wrong in a direction nobody
 * could see.
 *
 * So this drives the encounter through exactly the calls App.tsx drives it
 * through: `prepareRoundDeck`, `resolveTrick`, `drawNextTrickCards`,
 * `calculateTrickScore`, `JOKER_EFFECTS`, `BOSS_RULES`, `executeUnoCard`,
 * `resolveSpecialForTrick`, `foilRandomCardInRunDeck`. It is a second *driver*,
 * not a second implementation - the rules live in one place and this reads them
 * from there.
 *
 * What is still approximate is stated in `APPROXIMATIONS` at the bottom of this
 * file and printed by the report. Nothing here decides anything about balance.
 */

/** The house opponent. Fixed, so a difference is a difference in the player. */
const HOUSE = { ...AI_PROFILES.gennaro_habitue, noise: 0 };

export interface EncounterConfig {
  playPolicy: PlayerPolicy;
  solaPolicy: SolaPolicy;
  jokers: Joker[];
  runDeck: PlayingCard[];
  boss: BossBlind | null;
  /** Real bankroll at the moment the encounter starts. */
  money: number;
  discardsLeft: number;
  consumables: UnoCard[];
  maxJokers: number;
  maxConsumables: number;
  targetScore: number;
}

/** One Carta Sola actually cast, for the consumption audit. */
interface SolaCast {
  definitionId: string;
  instanceId?: string;
  trick: number;
}

export interface EncounterReport {
  score: number;
  briscolaPoints: number;
  opponentBriscolaPoints: number;
  tricksWon: number;
  tricksLost: number;
  tricksPlayed: number;
  /** Permanent joker growth, carried to the next encounter. */
  jokersAfter: Joker[];
  /** The run deck as the Falsario and a broken Vetro left it. */
  runDeckAfter: PlayingCard[];
  /** Bankroll after gold cards, gold seals, Azzardi and Carte Sola. */
  moneyAfter: number;
  discardsLeftAfter: number;
  /** What is left in the consumable slots, blue-seal rewards included. */
  consumablesAfter: UnoCard[];
  solaCasts: SolaCast[];
  /** Cards the Falsario stamped Foil during this encounter. */
  foilStamped: number;
  /** Tricks played while a joker was silenced by the Sovrano. */
  silencedTricks: number;
  /** Tricks played under a Scudo Protettivo. */
  shieldedTricks: number;
  briscolaRotations: number;
  /** Tricks where the hand, after playing, held a Re and a Cavallo of a suit. */
  accusaArmedTricks: number;
  /** Tricks where the boss forced the opening suit. */
  forcedLeadTricks: number;
  /** Per-trick score of each joker instance, for contribution analysis. */
  jokerTriggerCounts: Record<string, number>;
  /** Score of the tricks in which each joker instance was among the triggers. */
  jokerTriggerScore: Record<string, number>;
  /** (money at the trick, score of the trick) for every won trick. */
  moneyScoreSamples: Array<[number, number]>;
  /** How many cards of the played hand carried Acciaio, per trick. */
  steelHeldSamples: Array<[number, number]>;
  /** Score of tricks won with a Wild card played, and with a plain one. */
  wildPlayedScore: number;
  wildPlayedTricks: number;
  plainPlayedScore: number;
  plainPlayedTricks: number;
}

interface LiveState {
  hand: PlayingCard[];
  oppHand: PlayingCard[];
  pile: PlayingCard[];
  trump: PlayingCard | null;
  briscolaSuit: Suit;
  money: number;
  discardsLeft: number;
  jokers: Joker[];
  consumables: UnoCard[];
  runDeck: PlayingCard[];
  activeUnoMultiplier: number;
  isReverseActive: boolean;
  bossShieldTricks: number;
  stealLead: boolean;
  score: number;
}

/**
 * Plays one full encounter and reports what it cost and what it paid.
 *
 * The loop is App.tsx's loop with the animations taken out: cast the Carte Sola
 * the policy wants to cast, let whoever is on lead open, resolve, score, bank
 * growth, draw, rotate the Briscola if the Boss says so, repeat.
 */
export function simulateEncounter(config: EncounterConfig): EncounterReport {
  const deal = prepareRoundDeck(config.runDeck);

  const live: LiveState = {
    hand: deal.playerHand,
    oppHand: deal.opponentHand,
    pile: deal.roundDrawPile,
    trump: deal.trumpCard,
    briscolaSuit: deal.briscolaSuit,
    money: config.money,
    discardsLeft: config.discardsLeft,
    jokers: config.jokers.map((joker) => ({ ...joker, stats: { ...(joker.stats || {}) } })),
    consumables: [...config.consumables],
    runDeck: config.runDeck,
    activeUnoMultiplier: 1,
    isReverseActive: false,
    bossShieldTricks: 0,
    stealLead: false,
    score: 0,
  };

  const report: EncounterReport = {
    score: 0,
    briscolaPoints: 0,
    opponentBriscolaPoints: 0,
    tricksWon: 0,
    tricksLost: 0,
    tricksPlayed: 0,
    jokersAfter: live.jokers,
    runDeckAfter: live.runDeck,
    moneyAfter: live.money,
    discardsLeftAfter: live.discardsLeft,
    consumablesAfter: live.consumables,
    solaCasts: [],
    foilStamped: 0,
    silencedTricks: 0,
    shieldedTricks: 0,
    briscolaRotations: 0,
    accusaArmedTricks: 0,
    forcedLeadTricks: 0,
    jokerTriggerCounts: {},
    jokerTriggerScore: {},
    moneyScoreSamples: [],
    steelHeldSamples: [],
    wildPlayedScore: 0,
    wildPlayedTricks: 0,
    plainPlayedScore: 0,
    plainPlayedTricks: 0,
  };

  const captured = new Set<number>();
  let streak = 0;
  let lossStreak = 0;
  let played = 0;
  let playerLeads = true;
  let lastWinningSuit: Suit | null = null;
  /** Every card that has been face-up this round: the house counts them too. */
  let playedCards: PlayingCard[] = [];

  /** What the player's board looks like from across the table, read fresh. */
  const threat = () =>
    readPlayerThreat(live.jokers, {
      briscolaSuit: live.briscolaSuit,
      streak,
      remainingTricks: Math.floor(live.pile.length / 2) + live.hand.length,
      boss: enforcedBoss(),
      silencedJokerIndex: BOSS_RULES.getSilencedJokerIndex(
        enforcedBoss(),
        played,
        live.jokers.length
      ),
    });

  /** The boss whose rules are in force, or null while the Scudo is up. */
  const enforcedBoss = (): BossBlind | null =>
    live.bossShieldTricks > 0 ? null : config.boss;

  while (live.hand.length > 0 && live.oppHand.length > 0) {
    if (live.bossShieldTricks > 0) report.shieldedTricks++;

    const boss = enforcedBoss();
    const silencedIndex = BOSS_RULES.getSilencedJokerIndex(boss, played, live.jokers.length);
    if (silencedIndex !== null) report.silencedTricks++;

    // --- Carte Sola --------------------------------------------------------
    // The player is on turn before the trick opens, which is the window the
    // game allows: `trickPhase === 'idle'`.
    castSola(live, config, report, played, null, silencedIndex);

    // The opponent opens before the policy has to answer, so the policy sees
    // the position a person would be looking at.
    let oppCard: PlayingCard | null = null;
    if (!playerLeads) {
      oppCard = chooseOpponentLead(live.oppHand, {
        briscolaSuit: live.briscolaSuit,
        bossDebuff: getActiveBossRules(boss),
        isReverse: live.isReverseActive,
        knownPlayerCards: visiblePlayerCards(live.hand),
        profile: HOUSE,
        playedCards,
        playerThreat: threat(),
      })!;
      // Answering is a second window for a Carta Sola.
      castSola(live, config, report, played, oppCard, silencedIndex);
    }

    // Il Maestro dei Bastoni: the opening suit can be forced.
    const forcedLead = playerLeads
      ? BOSS_RULES.getForcedLeadSuit(boss, lastWinningSuit, live.hand)
      : null;
    if (forcedLead) report.forcedLeadTricks++;

    const legalHand = legalOpenings(live.hand, boss, playerLeads, lastWinningSuit);

    const state: PolicyState = {
      hand: legalHand,
      briscolaSuit: live.briscolaSuit,
      jokers: live.jokers,
      boss,
      opponentCard: oppCard,
      tricksWon: report.tricksWon,
      streak,
      tricksPlayed: played,
      remainingTricks: Math.floor(live.pile.length / 2) + live.hand.length,
      capturedDenari: captured,
      money: live.money,
    };

    const playerCard = config.playPolicy.choose(state);

    if (playerLeads) {
      oppCard = chooseOpponentFollow(live.oppHand, playerCard, {
        briscolaSuit: live.briscolaSuit,
        bossDebuff: getActiveBossRules(boss),
        isReverse: live.isReverseActive,
        knownPlayerCards: visiblePlayerCards(live.hand),
        profile: HOUSE,
        playedCards,
        playerThreat: threat(),
      })!;
    }

    // Read before the two cards join the record: Il Contacarte only ever sees
    // the ranks of PREVIOUS tricks.
    const seenRanksBeforeTrick = new Set(playedCards.map((card) => card.rank));
    playedCards = [...playedCards, playerCard, oppCard!];
    live.hand = live.hand.filter((c) => c.id !== playerCard.id);
    live.oppHand = live.oppHand.filter((c) => c.id !== oppCard!.id);

    // Accusa Trionfale reads the hand AFTER the card has left it, so the audit
    // counter has to look at exactly the same hand the joker looks at.
    if (holdsRoyalPair(live.hand)) report.accusaArmedTricks++;

    // Lo Sgambetto moves the lead rather than handing the trick over.
    const stoleLead = live.stealLead;
    live.stealLead = false;
    const resolvedLeadIsPlayer = stoleLead ? true : playerLeads;

    const clash = resolveTrick(
      resolvedLeadIsPlayer ? playerCard : oppCard!,
      resolvedLeadIsPlayer ? oppCard! : playerCard,
      live.briscolaSuit,
      resolvedLeadIsPlayer,
      getActiveBossRules(boss),
      live.isReverseActive
    );

    if (clash.playerWon) {
      const result = calculateTrickScore(
        playerCard,
        oppCard!,
        clash,
        live.briscolaSuit,
        live.jokers,
        boss,
        {
          money: live.money,
          playerHand: live.hand,
          consecutiveWinStreak: streak,
          totalTricksPlayedThisRound: played,
          remainingTricksCount: Math.floor(live.pile.length / 2) + live.hand.length,
          capturedDenariRanksThisRound: captured,
          consecutiveLossStreak: lossStreak,
          seenRanksBeforeTrick,
          roundPointsTaken: report.briscolaPoints,
          opponentPointsTaken: report.opponentBriscolaPoints,
        },
        live.activeUnoMultiplier,
        silencedIndex,
        playerLeads
      );

      report.moneyScoreSamples.push([live.money, result.finalScore]);
      report.steelHeldSamples.push([
        live.hand.filter((card) => card.enhancement === 'steel').length,
        result.finalScore,
      ]);
      if (playerCard.enhancement === 'wild') {
        report.wildPlayedTricks++;
        report.wildPlayedScore += result.finalScore;
      } else {
        report.plainPlayedTricks++;
        report.plainPlayedScore += result.finalScore;
      }

      for (const id of result.triggeredJokerIds) {
        report.jokerTriggerCounts[id] = (report.jokerTriggerCounts[id] ?? 0) + 1;
        report.jokerTriggerScore[id] = (report.jokerTriggerScore[id] ?? 0) + result.finalScore;
      }

      live.score += result.finalScore;
      live.money = Math.max(0, live.money + result.bonusDollars);
      live.discardsLeft += result.sealEvents.extraDiscards;

      // A Sigillo Blu rolls a free Carta Sola, if there is a slot for it.
      if (result.sealEvents.spawnUnoCard && live.consumables.length < config.maxConsumables) {
        const reward = createBlueSealReward(ALL_UNO_CARDS);
        if (reward) live.consumables.push(reward);
      }

      if (result.statGrowth.length > 0) {
        live.jokers = JOKER_EFFECTS.applyStatGrowth(live.jokers, result.statGrowth);
      }

      // Il Falsario stamps one card of the run deck Foil, for the whole run.
      if (result.foilRandomCard) {
        const stamped = foilRandomCardInRunDeck(live.runDeck);
        if (stamped.foiledCardId) {
          live.runDeck = stamped.deck;
          report.foilStamped++;
        }
      }

      report.briscolaPoints += clash.rawPoints;
      report.tricksWon++;
      streak++;
      lossStreak = 0;
      lastWinningSuit = playerCard.suit;
      if (playerCard.suit === 'denari') captured.add(playerCard.rank);
      if (oppCard!.suit === 'denari') captured.add(oppCard!.rank);
    } else {
      // The other half of the Azzardo: a Vetro breaks, a Traditrice pays up.
      const special = resolveSpecialForTrick({
        card: playerCard,
        playerLed: playerLeads,
        playerWon: false,
        money: live.money,
      });
      if (special.dollarsToAdd < 0) live.money = Math.max(0, live.money + special.dollarsToAdd);
      if (special.brokenSpecialCardId) {
        live.runDeck = clearSpecialInRunDeck(live.runDeck, special.brokenSpecialCardId);
      }

      report.opponentBriscolaPoints += clash.rawPoints;
      report.tricksLost++;
      streak = 0;
      lossStreak++;
      lastWinningSuit = null;
    }

    // The multiplier and the Reverse last exactly one trick, as in the game.
    live.activeUnoMultiplier = 1;
    live.isReverseActive = false;
    if (live.bossShieldTricks > 0) live.bossShieldTricks--;

    played++;
    playerLeads = clash.playerWon;

    // Il Conte rimescola: every three tricks the Briscola moves.
    if (BOSS_RULES.shouldRotateBriscola(played, enforcedBoss())) {
      live.briscolaSuit = BOSS_RULES.getRotatedBriscolaSuit(live.briscolaSuit);
      report.briscolaRotations++;
    }

    if (isRoundFinished(live.hand, live.oppHand, live.pile, live.trump)) break;
    const drawn = drawNextTrickCards(
      clash.playerWon,
      live.pile,
      live.trump,
      live.hand,
      live.oppHand
    );
    live.hand = drawn.newPlayerHand;
    live.oppHand = drawn.newOpponentHand;
    live.pile = drawn.newDrawPile;
    live.trump = drawn.newTrumpCard;
  }

  report.score = live.score;
  report.tricksPlayed = played;
  report.jokersAfter = live.jokers;
  report.runDeckAfter = live.runDeck;
  report.moneyAfter = live.money;
  report.discardsLeftAfter = live.discardsLeft;
  report.consumablesAfter = live.consumables;
  return report;
}

/** Accusa Trionfale's condition: a Re and a Cavallo of the same suit in hand. */
function holdsRoyalPair(hand: PlayingCard[]): boolean {
  return hand.some(
    (card) => card.rank === 10 && hand.some((other) => other.rank === 9 && other.suit === card.suit)
  );
}

/**
 * The cards the policy is allowed to open with.
 *
 * Il Cambiavalute forbids opening in Denari and il Maestro forces a suit; both
 * rules escape when they cannot be obeyed, and `canPlayerLeadCard` already
 * encodes that. Filtering the hand is how the sim obeys a rule the UI enforces
 * by refusing the tap.
 */
function legalOpenings(
  hand: PlayingCard[],
  boss: BossBlind | null,
  playerLeads: boolean,
  lastWinningSuit: Suit | null
): PlayingCard[] {
  if (!playerLeads || !boss) return hand;
  const legal = hand.filter(
    (card) => BOSS_RULES.canPlayerLeadCard(card, boss, hand, lastWinningSuit).allowed
  );
  return legal.length > 0 ? legal : hand;
}

/**
 * Casts whatever Carta Sola the policy wants to cast right now.
 *
 * Runs `executeUnoCard`, the same dispatcher the app runs, so cycling through
 * the stock, the Reverse, the Scudo, lo Sgambetto, il Tocco di Briscola, the
 * cash and the x3 all behave exactly as they do at the table - and a card that
 * the handler refuses (`consumed === false`) stays in the slot.
 */
function castSola(
  live: LiveState,
  config: EncounterConfig,
  report: EncounterReport,
  trick: number,
  opponentCard: PlayingCard | null,
  silencedIndex: number | null
): void {
  void silencedIndex;
  let guard = 0;
  while (guard++ < 2 && live.consumables.length > 0) {
    const plan: SolaPlan | null = config.solaPolicy.choose({
      consumables: live.consumables,
      hand: live.hand,
      drawPile: live.pile,
      briscolaSuit: live.briscolaSuit,
      money: live.money,
      boss: config.boss,
      bossShieldTricks: live.bossShieldTricks,
      opponentCard,
      trick,
      tricksRemaining: Math.floor(live.pile.length / 2) + live.hand.length,
      roundScore: live.score,
      targetScore: config.targetScore,
    });
    if (!plan) return;

    const result = executeUnoCard({
      unoCard: plan.card,
      targetCard: plan.targetCard,
      chosenSuit: plan.chosenSuit,
      drawPile: live.pile,
      playerHand: live.hand,
      opponentHand: live.oppHand,
      briscolaSuit: live.briscolaSuit,
      money: live.money,
      discardsLeft: live.discardsLeft,
      activeJokers: live.jokers,
      maxJokers: config.maxJokers,
      currentRoundScore: live.score,
      bossDebuffActive: config.boss !== null && live.bossShieldTricks === 0,
      activeUnoMultiplier: live.activeUnoMultiplier,
      isReverseActive: live.isReverseActive,
    });

    live.pile = result.newDrawPile;
    live.hand = result.newPlayerHand;
    live.oppHand = result.newOpponentHand;
    live.briscolaSuit = result.newBriscolaSuit;
    live.money = Math.max(0, result.newMoney);
    live.discardsLeft = result.newDiscardsLeft;
    live.jokers = result.newActiveJokers;
    live.score = result.newRoundScore;
    live.activeUnoMultiplier = result.newActiveUnoMultiplier;
    live.isReverseActive = result.newIsReverseActive;
    if (result.stealLeadCurrentTrick) live.stealLead = true;
    if (config.boss && result.bossShieldTricks && result.bossShieldTricks > 0) {
      live.bossShieldTricks = result.bossShieldTricks;
    }
    if (result.cardUpgradedInRunDeck) {
      const up = result.cardUpgradedInRunDeck;
      live.runDeck = live.runDeck.map((card) =>
        card.id === up.id ? { ...card, ...up.updates } : card
      );
    }

    // A refused effect returns the card to the slot and is not a use.
    if (result.consumed === false) return;

    report.solaCasts.push({
      definitionId: getUnoDefinitionId(plan.card),
      instanceId: plan.card.instanceId,
      trick,
    });
    live.consumables = live.consumables.filter((owned) => !sameUnoInstance(owned, plan.card));
  }
}

/**
 * What this harness still does not model, stated plainly.
 *
 * Printed by the report so no number coming out of it is ever read as more than
 * it is. None of these change a rule; they change how faithfully a *player* is
 * being imitated, which is exactly the part a simulator cannot settle.
 */
export const APPROXIMATIONS: string[] = [
  'Il giocatore e una policy euristica a un ply, non un umano: i tassi di vittoria vanno letti come confronti fra policy, non come win rate reali.',
  'Lo Scarto (discard) viene ricalcolato a ogni incontro come in initRound, ma nessuna policy lo usa mai.',
  'Le Carte Sola vengono giocate da una euristica fissa (solaPlay.ts), uguale per tutte le policy di acquisto.',
  'Il Falsario, i sigilli e gli Azzardi sono applicati davvero, ma il giocatore non li considera quando sceglie la carta.',
  'Il boss Ciccio (carta coperta) non nasconde nulla alla policy, che comunque non guarda la mano avversaria.',
];
