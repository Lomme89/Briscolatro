import { CardSpecial, PlayingCard } from '../types/game';

/**
 * Azzardo: the modifiers that can bite back.
 *
 * Every other modifier in the game is pure upside, so a card carrying one is
 * simply the better version of itself and there is nothing to think about. An
 * Azzardo is a question - the bonus is worth having, the cost is real, and both
 * are spelled out on the card. No hidden rolls: the player takes the risk with
 * their eyes open, which is the only kind of risk worth offering.
 */
export interface SpecialInfo {
  id: Exclude<CardSpecial, 'none'>;
  /** The word on the badge. */
  name: string;
  badge: string;
  bonus: string;
  cost: string;
  /** One line, the way it would be explained at the table. */
  flavor: string;
  className: string;
}

export const SPECIAL_INFO: Record<Exclude<CardSpecial, 'none'>, SpecialInfo> = {
  segnata: {
    id: 'segnata',
    name: 'Segnata',
    badge: 'SEGNATA',
    bonus: '+15 Mult se contribuisce a una presa vinta',
    cost: "L'avversario sa che ce l'hai in mano",
    flavor: "Il dorso ha una piega che conosci solo tu. E anche lui.",
    className: 'bg-amber-600 text-white border-amber-300',
  },
  vetro: {
    id: 'vetro',
    name: 'Vetro',
    badge: 'VETRO',
    bonus: 'x2 Mult se contribuisce a una presa vinta',
    cost: 'Se la giochi e perdi la presa, il Vetro si spezza per sempre',
    flavor: 'Regge finché vinci. Il giorno che perdi, si sente il rumore.',
    className: 'bg-cyan-500 text-slate-900 border-cyan-200',
  },
  debito: {
    id: 'debito',
    name: 'A Debito',
    badge: 'DEBITO',
    bonus: '+100 Chips se contribuisce a una presa vinta',
    cost: 'Ti costa $1 ogni volta che la giochi, vinca o perda',
    flavor: 'Il barista segna sul quaderno. Prima o poi passa a riscuotere.',
    className: 'bg-emerald-600 text-white border-emerald-300',
  },
  traditrice: {
    id: 'traditrice',
    name: 'Traditrice',
    badge: 'TRADITRICE',
    bonus: 'x2 Mult se apre la presa e la vince',
    cost: 'Se risponde e perde la presa, ti costa $2',
    flavor: 'In mano tua è una bandiera. In mano sua è un coltello.',
    className: 'bg-rose-600 text-white border-rose-300',
  },
};

export function getSpecialInfo(special: CardSpecial): SpecialInfo | null {
  return special === 'none' ? null : SPECIAL_INFO[special];
}

export interface SpecialTrickContext {
  /** The card the player put on the table this trick. */
  card: PlayingCard;
  /** True when the player opened the trick rather than answering it. */
  playerLed: boolean;
  playerWon: boolean;
  /** Money BEFORE the trick: A Debito cannot push it below zero. */
  money: number;
}

export interface SpecialTrickOutcome {
  chipsToAdd: number;
  multToAdd: number;
  xMultToMultiply: number;
  /** Negative: what the Azzardo costs. Never more than the player has. */
  dollarsToAdd: number;
  /** A Vetro that broke: strip the Azzardo from this card in the run deck. */
  brokenSpecialCardId: string | null;
  /** A Debito that could not be paid, so it paid nothing back either. */
  unpaidDebt: boolean;
  /** One line for the tally overlay, when something actually happened. */
  reasons: string[];
}

const NOTHING: SpecialTrickOutcome = {
  chipsToAdd: 0,
  multToAdd: 0,
  xMultToMultiply: 1,
  dollarsToAdd: 0,
  brokenSpecialCardId: null,
  unpaidDebt: false,
  reasons: [],
};

/**
 * The whole Azzardo resolution for one trick, win or lose.
 *
 * It runs on lost tricks too, which is the point: that is where Vetro breaks
 * and Traditrice charges. calculateTrickScore only ever sees a won trick, so
 * this stays a separate call rather than living inside it.
 */
export function resolveSpecialForTrick(ctx: SpecialTrickContext): SpecialTrickOutcome {
  const { card, playerLed, playerWon, money } = ctx;
  if (card.special === 'none') return { ...NOTHING };

  const out: SpecialTrickOutcome = { ...NOTHING, reasons: [] };

  switch (card.special) {
    case 'segnata':
      // The price was paid before the card was played: the opponent already
      // knew it was coming.
      if (playerWon) {
        out.multToAdd += 15;
        out.reasons.push('Segnata +15 Mult');
      }
      break;

    case 'vetro':
      if (playerWon) {
        out.xMultToMultiply *= 2;
        out.reasons.push('Vetro x2 Mult');
      } else {
        out.brokenSpecialCardId = card.id;
        out.reasons.push('Vetro spezzato');
      }
      break;

    case 'debito':
      // Paid on play, win or lose. With nothing in the till there is no debt
      // and no bonus either: the card plays as an ordinary one this trick.
      if (money >= 1) {
        out.dollarsToAdd -= 1;
        out.reasons.push('A Debito -$1');
        if (playerWon) {
          out.chipsToAdd += 100;
          out.reasons.push('A Debito +100 Chips');
        }
      } else {
        out.unpaidDebt = true;
        out.reasons.push('A Debito non pagato: nessun bonus');
      }
      break;

    case 'traditrice':
      if (playerLed && playerWon) {
        out.xMultToMultiply *= 2;
        out.reasons.push('Traditrice x2 Mult');
      } else if (!playerLed && !playerWon) {
        // Capped at what is actually in the till: no negative money, ever.
        const charged = Math.min(2, Math.max(0, money));
        if (charged > 0) {
          out.dollarsToAdd -= charged;
          out.reasons.push(`Traditrice -$${charged}`);
        } else {
          out.reasons.push('Traditrice: niente da pagare');
        }
      }
      break;
  }

  return out;
}

/**
 * What the opponent is allowed to know about the player's hand.
 *
 * A Segnata card is public information - that is the whole cost of it - and
 * nothing else is. This function is the only door: the AI never receives the
 * hand itself, so it cannot start reading cards it has no business seeing.
 */
export function visiblePlayerCards(playerHand: PlayingCard[]): PlayingCard[] {
  return playerHand.filter((card) => card.special === 'segnata');
}
