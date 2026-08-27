import { PlayingCard, Suit } from '../../types/game';
import { createStandardDeck, resolveTrick } from '../briscola';
import { drawNextTrickCards, prepareRoundDeck } from '../gameState';
import { chooseOpponentFollow, chooseOpponentLead } from '../ai';
import { OpponentAiProfile } from '../aiProfiles';
import { PlayerThreat } from '../opponentThreat';

export interface DuelResult {
  /** Briscola points taken by the seat on the left, out of 120 per round. */
  leftPoints: number;
  rightPoints: number;
  leftTricks: number;
  rightTricks: number;
  /** Rounds where the left seat took more than 60 of the 120 points. */
  leftWins: number;
  rounds: number;
}

/**
 * Sits two profiles down at a real table and deals them rounds.
 *
 * Both seats see only what a seat can see: their own hand, the trump, and the
 * cards already played. The record each one keeps is built here from the table,
 * exactly the way the game builds it, so a profile with a good memory has an
 * advantage it earned rather than one it was handed.
 */
export function duel(
  left: OpponentAiProfile,
  right: OpponentAiProfile,
  rounds: number,
  deckFor: () => PlayingCard[] = createStandardDeck,
  /**
   * A build the RIGHT seat can see on the left seat's side of the table. Used
   * to measure what the denial heuristic actually costs the player: the left
   * seat plays identically either way, only the right seat's reading changes.
   */
  leftBuild?: PlayerThreat
): DuelResult {
  const out: DuelResult = {
    leftPoints: 0,
    rightPoints: 0,
    leftTricks: 0,
    rightTricks: 0,
    leftWins: 0,
    rounds,
  };

  for (let round = 0; round < rounds; round++) {
    const deal = prepareRoundDeck(deckFor());
    let leftHand = deal.playerHand;
    let rightHand = deal.opponentHand;
    let pile = deal.roundDrawPile;
    let trump: PlayingCard | null = deal.trumpCard;
    const briscolaSuit: Suit = deal.briscolaSuit;
    const playedCards: PlayingCard[] = [];

    let leftLeads = round % 2 === 0;
    let leftPoints = 0;
    let leftTricks = 0;

    while (leftHand.length > 0 && rightHand.length > 0) {
      const leftCtx = { briscolaSuit, profile: left, playedCards };
      const rightCtx = { briscolaSuit, profile: right, playedCards, playerThreat: leftBuild };

      let leftCard: PlayingCard;
      let rightCard: PlayingCard;
      if (leftLeads) {
        leftCard = chooseOpponentLead(leftHand, leftCtx)!;
        rightCard = chooseOpponentFollow(rightHand, leftCard, rightCtx)!;
      } else {
        rightCard = chooseOpponentLead(rightHand, rightCtx)!;
        leftCard = chooseOpponentFollow(leftHand, rightCard, leftCtx)!;
      }

      leftHand = leftHand.filter((c) => c.id !== leftCard.id);
      rightHand = rightHand.filter((c) => c.id !== rightCard.id);
      playedCards.push(leftCard, rightCard);

      const clash = resolveTrick(
        leftLeads ? leftCard : rightCard,
        leftLeads ? rightCard : leftCard,
        briscolaSuit,
        leftLeads
      );
      const leftWon = leftLeads ? clash.playerWon : !clash.playerWon;
      if (leftWon) {
        leftPoints += clash.rawPoints;
        leftTricks++;
      }

      const drawn = drawNextTrickCards(leftWon, pile, trump, leftHand, rightHand);
      leftHand = drawn.newPlayerHand;
      rightHand = drawn.newOpponentHand;
      pile = drawn.newDrawPile;
      trump = drawn.newTrumpCard;
      leftLeads = leftWon;
    }

    out.leftPoints += leftPoints;
    out.rightPoints += 120 - leftPoints;
    out.leftTricks += leftTricks;
    out.rightTricks += 20 - leftTricks;
    if (leftPoints > 60) out.leftWins++;
  }

  return out;
}

/** Share of the 120 points a round is worth that the left seat took. */
export function pointShare(result: DuelResult): number {
  return result.leftPoints / (result.leftPoints + result.rightPoints);
}
