import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layers, X } from 'lucide-react';
import { Joker, UnoCard } from '../types/game';
import { CardFaceArt, getJokerArtUrl, getUnoArtUrl } from './CardFaceArt';

interface Props {
  open: boolean;
  onClose: () => void;
  jokers: Joker[];
  consumables: UnoCard[];
  maxJokers: number;
  canUseSola: boolean;
  silencedJokerIndex: number | null;
  triggeringJokerId: string | null;
  onUse: (card: UnoCard) => void;
}

function DrawerArt({ src, name }: { src: string | undefined; name: string }) {
  return src ? <CardFaceArt src={src} alt={name} /> : <Layers size={40} aria-hidden="true" />;
}

/** Native modal keeps keyboard focus and taps inside the open table drawer. */
export function TableCardDrawer({ open, onClose, jokers, consumables, maxJokers, canUseSola, silencedJokerIndex, triggeringJokerId, onUse }: Props) {
  const [section, setSection] = useState<'jokers' | 'sola'>(consumables.length ? 'sola' : 'jokers');
  const rarityNames: Record<string, string> = { common: 'Comune', uncommon: 'Non comune', rare: 'Raro', legendary: 'Leggendario' };
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return createPortal(
    <dialog ref={dialog} id="table-card-drawer" className="table-card-drawer" aria-labelledby="table-card-drawer-title"
      onCancel={onClose} onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="table-card-drawer-interior">
        <header className="table-card-drawer-heading">
          <div><h2 id="table-card-drawer-title"><Layers size={22} aria-hidden="true" />Il portacarte</h2>
            <p>I tuoi assi nella manica.</p></div>
          <button type="button" className="table-card-drawer-close" onClick={onClose} aria-label="Chiudi portacarte" autoFocus><X size={22} /></button>
        </header>
        <nav className="table-card-drawer-tabs" aria-label="Carte nel portacarte">
          <button type="button" aria-pressed={section === 'jokers'} onClick={() => setSection('jokers')}>Jolly · {jokers.length}</button>
          <button type="button" aria-pressed={section === 'sola'} onClick={() => setSection('sola')}>Carte Sola · {consumables.length}</button>
        </nav>
        <div className="table-card-drawer-sections" data-section={section}>
          <section aria-labelledby="drawer-jokers">
            <h3 id="drawer-jokers">Jolly <span>{jokers.length}/{maxJokers}</span></h3>
            <p className="table-card-drawer-hint">Passivi · fanno il loro gioco da soli.</p>
            {jokers.length === 0 && <p className="table-card-drawer-empty">Nessun jolly in tasca. Puoi acquistarli in negozio tra un tavolo e l’altro.</p>}
            {jokers.map((joker, index) => <article className="table-card-drawer-card" key={joker.instanceId ?? `${joker.id}-${index}`}>
              <div className="table-card-drawer-art"><DrawerArt src={getJokerArtUrl(joker.id)} name={joker.name} /></div>
              <div><h4>{joker.name}</h4><p>{joker.description}</p>
                {Boolean(joker.stats?.accumulatedMult) && <p className="table-card-drawer-status">+{joker.stats?.accumulatedMult} Mult accumulati</p>}
                {Boolean(joker.stats?.accumulatedChips) && <p className="table-card-drawer-status">+{joker.stats?.accumulatedChips} Chips accumulati</p>}
                <p className="table-card-drawer-status">{index === silencedJokerIndex ? 'Silenziato per questa presa' : triggeringJokerId === joker.id ? 'Effetto in azione' : 'Passivo'} · {rarityNames[joker.rarity] ?? joker.rarity}</p>
              </div>
            </article>)}
          </section>
          <section aria-labelledby="drawer-sola">
            <h3 id="drawer-sola">Carte Sola <span>{consumables.length}</span></h3>
            <p className="table-card-drawer-hint">Attive · scegli tu quando usarle.</p>
            {!canUseSola && consumables.length > 0 && <p className="table-card-drawer-status" role="status">Aspetta il tuo turno per usare una Sola.</p>}
            {consumables.length === 0 && <p className="table-card-drawer-empty">Nessuna Sola da giocare. Fai scorta in negozio.</p>}
            {consumables.map((card, index) => <article className="table-card-drawer-card" key={card.instanceId ?? `${card.id}-${index}`}>
              <div className="table-card-drawer-art"><DrawerArt src={getUnoArtUrl(card.id)} name={card.name} /></div>
              <div><h4>{card.name}</h4><p>{card.description}</p>
                <button type="button" className="table-card-drawer-use" disabled={!canUseSola} onClick={() => onUse(card)} aria-label={`Usa ${card.name}`}>Usa questa Sola</button>
              </div>
            </article>)}
          </section>
        </div>
      </div>
    </dialog>, document.body,
  );
}
