import { BossBlind, PlayingCard, Suit, UnoCard } from '../../types/game';
import { getUnoDefinitionId } from '../itemInstances';

/**
 * Quando si gioca una Carta Sola, e su cosa.
 *
 * The old harness spent a consumable as "x1.5 on some trick", which made every
 * Carta Sola the same card and made the slot worth a flat amount. They are not
 * the same card: il Raddoppio Soldi is an economy card, lo Scudo is a boss
 * answer, il Tocco di Briscola decides a round, and la Giravolta is a trap
 * unless the hand is full of lisce.
 *
 * So the sim picks a card and a target the way a competent player would, and
 * then hands both to `executeUnoCard` - the game's own dispatcher - so the
 * effect that lands is the real one. The heuristic is deliberately the same for
 * every buying policy: what is being compared is what a policy *bought*, not
 * how cleverly it played what it bought.
 */
export interface SolaSituation {
  consumables: UnoCard[];
  hand: PlayingCard[];
  drawPile: PlayingCard[];
  briscolaSuit: Suit;
  money: number;
  boss: BossBlind | null;
  bossShieldTricks: number;
  /** The card to answer, or null when the player is about to open. */
  opponentCard: PlayingCard | null;
  trick: number;
  tricksRemaining: number;
  roundScore: number;
  targetScore: number;
}

export interface SolaPlan {
  card: UnoCard;
  targetCard?: PlayingCard;
  chosenSuit?: Suit;
}

export interface SolaPolicy {
  id: string;
  choose(situation: SolaSituation): SolaPlan | null;
}

/** The card in hand that would gain the most from becoming trump. */
function bestTouchTarget(hand: PlayingCard[], briscolaSuit: Suit): PlayingCard | null {
  const candidates = hand.filter((card) => card.suit !== briscolaSuit);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => b.points - a.points || b.power - a.power)[0];
}

/** The card the player would least mind losing, for lo Scambio. */
function worstCard(hand: PlayingCard[], briscolaSuit: Suit): PlayingCard | null {
  if (hand.length === 0) return null;
  return [...hand].sort(
    (a, b) =>
      Number(a.suit === briscolaSuit) - Number(b.suit === briscolaSuit) ||
      a.points - b.points ||
      a.power - b.power
  )[0];
}

/** The suit the hand is longest in: the one worth making trump. */
function longestSuit(hand: PlayingCard[], briscolaSuit: Suit): Suit | undefined {
  const counts = new Map<Suit, number>();
  for (const card of hand) counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  let best: Suit | undefined;
  let bestCount = 0;
  for (const [suit, count] of counts) {
    if (suit === briscolaSuit) continue;
    if (count > bestCount) {
      best = suit;
      bestCount = count;
    }
  }
  return bestCount >= 2 ? best : undefined;
}

/**
 * Whether this trick is the one worth spending a scoring card on.
 *
 * A x3 is wasted on a trick that pays nothing, so the multiplier cards wait for
 * a hand that can actually take a fat trick: a Briscola or a carico in hand,
 * or an opponent carico already on the table.
 */
function bigTrickAhead(situation: SolaSituation): boolean {
  const opponentCarico = situation.opponentCard
    ? situation.opponentCard.rank === 1 || situation.opponentCard.rank === 3
    : false;
  const holdsTrump = situation.hand.some((card) => card.suit === situation.briscolaSuit);
  const holdsCarico = situation.hand.some((card) => card.rank === 1 || card.rank === 3);
  return opponentCarico || (holdsTrump && holdsCarico);
}

/**
 * The default player of Carte Sola.
 *
 * Ordered by how much a wrong moment costs: the cards that are simply free
 * money go first, the ones that need a position wait for it, and everything is
 * dumped in the last three tricks rather than being carried out of a round it
 * cannot be carried out of.
 */
export const STANDARD_SOLA: SolaPolicy = {
  id: 'standard',
  choose(situation) {
    const endOfRound = situation.tricksRemaining <= 2;

    for (const card of situation.consumables) {
      const id = getUnoDefinitionId(card);

      switch (id) {
        // Free money, and worth more the more there is: cast on sight.
        case 'uno_double_cash':
          if (situation.money >= 4 || endOfRound) return { card };
          break;
        case 'uno_plus_two_blue':
        case 'uno_gold_yellow':
          return { card };

        // Permanent card upgrades: the sooner they land the longer they pay.
        case 'uno_custom_foil':
        case 'uno_custom_holo':
        case 'uno_custom_polychrome': {
          const target = [...situation.hand].sort((a, b) => b.points - a.points)[0];
          if (target) return { card, targetCard: target };
          break;
        }

        // Needs a stock to cycle through.
        case 'uno_plus_two_red':
          if (situation.drawPile.length >= 2 || endOfRound) return { card };
          break;

        // The boss answer. Held until there is a boss rule actually running.
        case 'uno_block_boss':
          if (situation.boss && situation.bossShieldTricks === 0) return { card };
          if (endOfRound) return { card };
          break;

        // Decides a round, so it wants a hand worth deciding.
        case 'uno_all_wild': {
          const target = bestTouchTarget(situation.hand, situation.briscolaSuit);
          if (target && (target.points >= 3 || endOfRound)) return { card, targetCard: target };
          break;
        }

        case 'uno_wild_suit':
        case 'uno_plus_four_wild': {
          const suit = longestSuit(situation.hand, situation.briscolaSuit);
          if (suit) return { card, chosenSuit: suit };
          if (endOfRound) return { card };
          break;
        }

        // Multiplier cards: only on a trick that can pay.
        case 'uno_call_uno':
          if (bigTrickAhead(situation) || endOfRound) return { card };
          break;

        // Lo Sgambetto only means something while answering.
        case 'uno_skip_red':
          if (situation.opponentCard || endOfRound) return { card };
          break;

        // La Giravolta inverts the hierarchy: good only with a hand of lisce.
        case 'uno_reverse_green': {
          const lisce = situation.hand.filter((c) => c.points === 0).length;
          if (lisce >= 2 || endOfRound) return { card };
          break;
        }

        case 'uno_swap_yellow': {
          const give = worstCard(situation.hand, situation.briscolaSuit);
          if (give && (give.points === 0 || endOfRound)) return { card, targetCard: give };
          break;
        }

        default:
          // Anything else (il Jolly Misterioso and friends) is cast when there
          // is nothing better to hold it for.
          if (endOfRound) return { card };
          break;
      }
    }

    return null;
  },
};

/** Never spends a thing: the control group for measuring what the slot is worth. */
export const NEVER_SOLA: SolaPolicy = {
  id: 'never',
  choose: () => null,
};
