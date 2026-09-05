import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Suit, UnoCard } from '../types/game';
import { UnoCardSlot } from './UnoCardSlot';
import { PixelSuitIcon } from './PixelSuitIcon';
import { getSuitDisplayName } from '../game/briscola';

interface UnoConfirmModalProps {
  unoCard: UnoCard | null;
  briscolaSuit: Suit;
  onCancel: () => void;
  onConfirm: (chosenSuit?: Suit) => void;
}
const SUITS: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];

export const UnoConfirmModal: React.FC<UnoConfirmModalProps> = ({ unoCard, briscolaSuit, onCancel, onConfirm }) => {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const [chosenSuit, setChosenSuit] = React.useState<Suit | null>(null);
  const needsTarget = unoCard?.targetType === 'card_in_hand';
  const needsSuit = unoCard?.id === 'uno_wild_suit';
  React.useEffect(() => {
    setChosenSuit(null);
    if (unoCard && !dialog.current?.open) dialog.current?.showModal();
    if (!unoCard && dialog.current?.open) dialog.current.close();
  }, [unoCard]);

  return createPortal(
    <dialog ref={dialog} className="sola-confirm" aria-labelledby="sola-confirm-title" onCancel={onCancel}
      onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      {unoCard && <div className="sola-confirm-content">
        <header><h2 id="sola-confirm-title">Giochi questa Sola?</h2>
          <button type="button" className="sola-confirm-close" onClick={onCancel} aria-label="Chiudi conferma Sola" autoFocus><X size={22} /></button>
        </header>
        <div className="sola-confirm-card">
          <UnoCardSlot unoCard={unoCard} canUse={false} size="md" disableTooltip />
          <div><h3>{unoCard.name}</h3><p>{unoCard.description}</p></div>
        </div>
        {needsSuit && <fieldset>
          <legend>Scegli la nuova Briscola</legend>
          <div className="sola-confirm-suits">{SUITS.map(suit => <button key={suit} type="button"
            disabled={suit === briscolaSuit} aria-pressed={chosenSuit === suit} onClick={() => setChosenSuit(suit)}
            title={suit === briscolaSuit ? 'È già la Briscola attuale' : getSuitDisplayName(suit)}>
            <PixelSuitIcon suit={suit} size={22} /><span>{getSuitDisplayName(suit)}</span>
          </button>)}</div>
        </fieldset>}
        <p className="sola-confirm-note">{needsTarget ? 'Poi scegli una carta della mano. La Sola si usa solo quando scegli il bersaglio.' : needsSuit ? 'La Briscola cambia nel seme scelto e questa Sola viene consumata.' : 'Ha effetto subito e questa Sola viene consumata.'}</p>
        <footer><button type="button" onClick={onCancel}>Annulla</button>
          <button type="button" data-testid="uno-confirm" disabled={needsSuit && (!chosenSuit || chosenSuit === briscolaSuit)} onClick={() => onConfirm(chosenSuit ?? undefined)}>
            {needsTarget ? 'Scegli carta' : 'Usa Sola'}
          </button>
        </footer>
      </div>}
    </dialog>, document.body,
  );
};
