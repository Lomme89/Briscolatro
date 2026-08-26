# Briscolatro — direzione di design

Questo documento spiega *perché* il punteggio è fatto così. Serve a decidere, non a
descrivere: se un numero qui non ti convince, si cambia qui e si rimisura.

Tutti i numeri citati sono **misurati**, non stimati: `src/game/__sim__/` gioca run
intere con motore, AI e scoring veri e stampa i risultati (`bunx vitest run
src/game/__sim__/balance.test.ts --reporter=verbose`).

## Il principio

Balatro ha **una** condizione di vittoria per blind: superi il punteggio o muori.
La tensione nasce da un unico numero che cresce più in fretta di te, e dal fatto che
non sai se ce la fai finché non ti impegni.

Briscolatro ne aveva due in OR: `punteggio >= target` **oppure** `punti briscola > 60`.
L'effetto misurato era che nessuna delle due contava davvero:

- Ai primi ante il target era decorativo — bastava vincere la briscola tradizionale,
  cosa che capita nel 50% dei round anche giocando a caso.
- Agli ante alti il target era irraggiungibile e la maggioranza briscola diventava
  l'unica via, cioè di nuovo una monetina.

**Decisione:** una sola condizione, il punteggio. La maggioranza dei punti briscola
(>60 su 120) paga **+$4**. Vincere la partita vera di Briscola non ti fa passare la
manche: ti finanzia. Resta la cosa che tutti al tavolo sanno contare, senza scavalcare
il livello roguelite.

## Il Mult base era il vero bug di design

Il Mult base era una costante: `1`. Conseguenze misurate:

- Ogni jolly "+Chips" era inutile: i chips non venivano moltiplicati da niente.
- Ogni jolly "+Mult" era uno swing da 9x da solo (da 1 a 9).
- Dal nulla a due jolly comuni il punteggio faceva **×9**; da lì in poi, plateau.

**Decisione:** il Mult base è quello che la presa *vale*, come il tipo di mano in
Balatro, e dipende da cosa catturi:

| | |
|---|---|
| base | 1 |
| ogni Carico catturato (Asso, Tre) | +1 |
| almeno una Figura catturata | +1 |
| presa vinta di Briscola | +1 |

Range 1–5. Il punteggio torna così sopra la Briscola vera: carichi e briscole sono
esattamente ciò per cui si combatte al tavolo. Effetto misurato: mediana a mani nude
da 300 a ~800, e il salto 0→2 jolly da ×9 a ×4.5.

## Serviva una crescita permanente

Nessun jolly cresceva tra un round e l'altro (`Joker.stats` esisteva nei tipi e non
veniva mai scritto). Con bonus tutti piatti la potenza del giocatore si ferma dopo
2–3 acquisti, mentre il target sale in esponenziale: oltre un certo ante la partita
diventa impossibile per aritmetica, non per bravura.

**Decisione:** più jolly, su rarità diverse, accumulano per tutta la run — è il
motore che in Balatro fanno Ride the Bus, Green Joker, Obelisco:

- *La Strega del Vesuvio* (non comune): +1 Mult permanente per ogni presa con Briscola.
- *Il Barone di Briscola* (non comune): +10 Chips permanenti per ogni presa incatenata.
- *Il Duellante Finale* (rara): +x0.1 permanenti per ogni finale di round vinto.
- *La Napola Cosmica* (rara): la combo cresce di x0.05 ogni volta che scatta.
- *Il Sovrano di Briscolatro* (leggendaria): +25 Chips permanenti per presa vinta.

La crescita è **condizionata** di proposito: quella incondizionata supera qualunque
curva (misurato: +1 Mult per presa qualsiasi porta a 26x sopra il bersaglio all'ante 8).

## La seconda via: il mazzo

Sigilli ed enhancement erano dichiarati nei tipi, generati dal negozio e **mai letti**
dal punteggio. Ora funzionano, e sono la via di crescita alternativa ai jolly:

- **Sigillo rosso**: ritrigger della carta giocata. **Oro**: +$2 alla cattura.
  **Blu**: 20% di una carta UNO gratis. **Viola**: +1 scarto.
- **Bonus** +30 Chips · **Mult** +4 Mult · **Acciaio** x1.5 mentre resta in mano ·
  **Vetro** x2 con 1 su 4 di rompersi · **Pietra** +50 Chips e nessun seme.

Il Vetro rotto **non** sparisce dal mazzo: perde l'enhancement. La Briscola a due
richiede un mazzo pari, quindi niente in questo gioco può distruggere una carta —
per la stessa ragione le carte comprate ne *sostituiscono* una invece di aggiungersi.

## La curva

`ANTE_BASE_TARGETS = [300, 900, 4000, 11000, 28000, 70000, 150000, 300000]`,
moltiplicata ×1 / ×1.5 / ×2 per Piccolo / Grande / Boss.

Il salto tra un ante e il successivo è più largo dove la run fa il suo scatto di
potenza (x4.4 entrando nell'ante 3, quando il negozio ha finalmente armato una build)
e si stringe a x2.0 alla fine, perché anche la crescita del giocatore rallenta quando
gli slot jolly si riempiono: un moltiplicatore costante banalizzerebbe il centro
partita o murerebbe il finale. È la stessa forma di Balatro (300 → 800 → 2800 → … →
50000, rapporti decrescenti).

L'ante 1 resta 300, il numero di sempre: è l'unico blind battibile senza un solo jolly.

### Cosa dice la simulazione (% di round superati)

| Build | A1 | A3 | A5 | A7 | A8 boss |
|---|---|---|---|---|---|
| riferimento (2 comuni + crescita) | 100% | 100% | 100% | 93% | 83% |
| leggendaria + chips | 100% | 100% | 100% | 97% | 70% |
| solo 3 jolly | 100% | 100% | 20% | 0% | 0% |
| build sul mazzo (2 jolly) | 100% | 80% | 20% | 0% | 0% |
| solo rare xMult | 100% | 50% | 17% | 0% | 0% |
| nessuna crescita (5 jolly piatti) | 100% | 3% | 0% | 0% | 0% |

Lettura: i primi tre ante li passa chiunque (è la fase in cui impari), dal quarto
servono un motore e un mazzo, il boss dell'ante 8 resta una vera sfida anche per la
build migliore. Una run senza motore muore intorno all'ante 3–4, ed è voluto.

## Cosa resta aperto

- **Le rare xMult sono deboli**: moltiplicare una base piccola non basta. In Balatro
  l'xMult funziona perché la base cresce (livelli delle mani). Qui la base è 1–5 e si
  ferma lì. La soluzione naturale sarebbe un equivalente delle carte Pianeta —
  consumabili che alzano permanentemente Chips e Mult base di un *tipo di presa*
  ("Presa con Carico: livello 2"). È la prossima cosa che farei.
- Nessun consumabile assegna enhancement: si trovano solo nelle bustine.
- Il pool di jolly non ha ancora un vero equilibrio rarità/potenza: alcune comuni
  battono delle rare.
