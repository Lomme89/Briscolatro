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

/**
 * What people are called once the Antes stop being countable.
 *
 * An Endless run recycles the same fifteen faces forever, and each of them was
 * introduced with the epithet they had in Ante 1: Gennaro is still "l'Habitué"
 * forty Antes into a night that has stopped ending. Each tier renames everyone
 * one rung further out along their own arc, so the drift belongs to the
 * character rather than being the same adjective bolted onto all of them.
 *
 * Keyed by characterId for the regulars and by Boss id for the Bosses, which
 * is what getOpponentIntro hands out either way.
 */
export const ENDLESS_TITLES: Record<EndlessTierId, Record<string, string>> = {
  asceso: {
    gennaro: 'Habitué del Turno di Notte',
    assunta: 'Matriarca della Bocciofila',
    mimi: 'Stella del Varietà di Provincia',
    o_muto: 'Quello che Non Parla Più da un Pezzo',
    salvatore: 'Lama Giovane del Rione',
    rocco: 'Boscaiolo del Turno Lungo',
    esposito: 'Contabile del Debito Serale',
    boss_ante_1: 'Campione del Bar Sport Notturno',
    boss_ante_2: 'Decano della Piazza Deserta',
    boss_ante_3: 'Regina del Mescolo Infinito',
    boss_ante_4: 'Le Mani Più Veloci del Rione',
    boss_ante_5: "Maestro d'Armi della Sala Chiusa",
    boss_ante_6: 'Gigante del Tavolo Lungo',
    boss_ante_7: 'Padrone del Banco dei Pegni',
    boss_ante_8: "Campione Supremo dell'Infinito",
  },
  sovraccarico: {
    gennaro: 'Alcolista Anonimo di Grado Ignoto',
    assunta: 'Vedova Nera della Bocciofila',
    mimi: 'Diva del Sipario che Non Cala',
    o_muto: 'Il Silenzio Fatto Uomo',
    salvatore: 'Spadaccino Senza Maestro',
    rocco: 'Spaccalegna dei Bastoni Vivi',
    esposito: 'Ragioniere degli Interessi Composti',
    boss_ante_1: "Barista dell'Ultimo Ordine",
    boss_ante_2: 'Padrino del Tavolo Fisso',
    boss_ante_3: 'Sacerdotessa del Taglio del Mazzo',
    boss_ante_4: "Prestigiatore del Quinto Asso",
    boss_ante_5: 'Duca del Filo della Lama',
    boss_ante_6: 'Colosso dei Bastoni Nodosi',
    boss_ante_7: 'Usuraio delle Ore Impegnate',
    boss_ante_8: 'Sovrano del Tavolo Senza Fine',
  },
  ultra_istinto: {
    gennaro: 'Cavaliere Errante del Bancone',
    assunta: 'Custode delle Bocce Proibite',
    mimi: 'Prima Donna del Teatro Vuoto',
    o_muto: 'Voto di Silenzio di Nono Grado',
    salvatore: 'Duellante dei Mille Tagli',
    rocco: 'Taglialegna della Foresta che Ricresce',
    esposito: 'Esattore delle Partite Mai Chiuse',
    boss_ante_1: 'Alchimista della Macchina del Caffè',
    boss_ante_2: 'Patriarca delle Mani Non Giocate',
    boss_ante_3: 'Tessitrice degli Ordini Possibili',
    boss_ante_4: 'Illusionista delle Carte che Non Esistono',
    boss_ante_5: 'Conte delle Spade che Tagliano il Tempo',
    boss_ante_6: 'Titano che Regge il Soffitto',
    boss_ante_7: 'Cambiavalute di Monete Mai Coniate',
    boss_ante_8: 'Monarca di un Regno di Quaranta Carte',
  },
  trascendente: {
    gennaro: 'Supernova di Grappa',
    assunta: 'La Parca che Tiene il Punteggio',
    mimi: 'La Voce che Canta a Luci Spente',
    o_muto: 'Colui che Tace in Tutte le Lingue',
    salvatore: "L'Ultimo Cadetto Rimasto",
    rocco: "Titano con l'Ascia Spuntata",
    esposito: 'Auditor del Libro Mastro Infinito',
    boss_ante_1: "Oste dell'Osteria Fuori dal Tempo",
    boss_ante_2: 'Il Don che Nessuno Ha Mai Visto Perdere',
    boss_ante_3: 'Colei che Rimescola gli Anni',
    boss_ante_4: 'Baro che Bara a Sé Stesso',
    boss_ante_5: 'Spettro in Armatura da Duello',
    boss_ante_6: 'La Montagna che Si è Seduta',
    boss_ante_7: 'Mercante che Compra il Tuo Domani',
    boss_ante_8: 'Corona Vuota sul Trono Vuoto',
  },
  fuori_scala: {
    gennaro: 'Gennaro, Primo e Ultimo di Sé Stesso',
    assunta: 'Assunta, Antecedente al Bar',
    mimi: 'Mimì, Applauso Senza Pubblico',
    o_muto: "'O Muto, Frase Mai Pronunciata",
    salvatore: 'Salvatore, Fendente che Precede la Spada',
    rocco: 'Rocco, Ceppo su cui Poggia il Tavolo',
    esposito: 'Esposito, Bilancio che Non Torna Mai',
    boss_ante_1: 'Gigi, Ottava Meraviglia del Bancone',
    boss_ante_2: 'Don Vito, Consuetudine Fatta Persona',
    boss_ante_3: 'Rosa, Permutazione Numero Zero',
    boss_ante_4: 'Ciccio, Asso Nascosto nella Manica del Mondo',
    boss_ante_5: 'Il Conte, Ferita che Precede il Colpo',
    boss_ante_6: 'Il Maestro, Radice Sotto il Pavimento',
    boss_ante_7: "Il Cambiavalute, Tasso d'Interesse dell'Universo",
    boss_ante_8: 'Il Sovrano, Regola che Gioca Sé Stessa',
  },
};
