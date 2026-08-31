import { EndlessTierId } from '../game/endless';

/**
 * What the table says once the tournament is already over.
 *
 * The eight opponents keep coming back forever in Endless, and they kept
 * saying the same eight things: the run got harder every Ante and nobody at
 * the table noticed. These lines go in with the character's own and crowd them
 * out a tier at a time, so the first strange thing anyone says still sounds
 * like bar talk and the last one does not.
 */
export const ENDLESS_BANTER: Record<EndlessTierId, string[]> = {
  // The bar is closed. Everyone is still here. Nobody says why.
  asceso: [
    'Che ore sono? No, lascia stare. Non voglio saperlo.',
    'Ho gia’ giocato questa mano. Ieri. Con te.',
    'Il caffè è ancora caldo. È da un pezzo che è ancora caldo.',
    'Fuori non c’è nessuno. Fuori non c’è niente. Gioca.',
    'La serranda è mezza giù da tre ore e non scende di un dito.',
  ],
  // The table has started moving and it is being ignored.
  sovraccarico: [
    'Senti pure tu che il tavolo vibra, vero? Vero?',
    'Ho contato le carte. Erano quaranta. Poi quarantadue. Ora non conto più.',
    'Il mio bicchiere si riempie da solo. Non me ne lamento.',
    'Le luci pulsano a tempo con le prese. Ci ho fatto l’abitudine.',
    'Non alzarti. Chi si alza non torna al tavolo.',
  ],
  // The cards are arriving before the decision to play them.
  ultra_istinto: [
    'Hai già giocato. Lo vedo dalla tua faccia di adesso.',
    'Io la carta la calo prima di sceglierla. Tu no? Impara.',
    'Sto rispondendo a quello che dirai dopo.',
    'Le mani finiscono prima di cominciare. Comodo, alla lunga.',
    'Non pensare. Pensare ti fa perdere mezzo secondo che non hai.',
  ],
  // Nobody is keeping score any more, and the game continues.
  trascendente: [
    'Il conto non lo porta più nessuno. Il conto siamo noi.',
    'Ho vinto. Ho perso. Le due cose insieme, va bene lo stesso.',
    'Questo tavolo è più vecchio del bar. Il bar l’hanno costruito intorno.',
    'Non ricordo la tua faccia e ti guardo da quarant’anni.',
    'I semi sono quattro perché ci siamo accordati così. Potevano essere altri.',
  ],
  // Off the scale. The fiction stops pretending.
  fuori_scala: [
    'Non ci sono numeri per questa mano. Li abbiamo finiti.',
    'Continua a giocare. È l’unica cosa che tiene su tutto quanto.',
    'Il Sovrano non esiste. Non è mai esistito. Lo battiamo lo stesso.',
    'Da qui si vede il fondo del mazzo. Non c’è fondo.',
    'Sono io a distribuire, sono io a rispondere, sei tu a perdere. Sempre.',
  ],
};
