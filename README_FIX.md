# Briscolatro — fix core Briscola / turni

Pacchetto preparato sullo stato attuale di `Lomme89/Briscolatro` (`main`, 26/08/2026).

## Cosa corregge

- **Una sola implementazione delle regole di Briscola** (`src/game/briscola.ts`).
- Il seme di apertura conta davvero: se nessuno gioca Briscola e il secondo cambia seme, **vince chi ha aperto**.
- Briscola batte sempre non-Briscola; il modifier Reverse inverte solo la gerarchia dei ranghi confrontabili, non le regole fondamentali del seme/Briscola.
- L'AI sceglie le risposte usando **lo stesso `resolveTrick()` del motore**, quindi Boss/Wild/Reverse non mandano più AI e motore in disaccordo.
- Rimossa la fallback impossibile che, con mano AI vuota, duplicava la carta del giocatore per risolvere la presa.
- Il giocatore viene bloccato appena gioca una carta e durante `opponent_thinking`, `resolving`, `tally` e pesca.
- Se l'AI vince la presa, il tavolo resta bloccato mentre l'AI prepara l'apertura successiva: niente finestra di ~700 ms in cui il player poteva rubarle il turno.
- Un solo timer governa le transizioni di turno, così callback AI vecchie non si accavallano.
- `GameTable` usa `src/game/briscola.ts` invece del vecchio `src/data/cards.ts`.
- `GameTable` riceve il vero **leader della presa**: non calcola più il vincitore fingendo che abbia sempre aperto il giocatore.
- Scarto e UNO sono bloccati quando non è realmente il turno del player.
- L'overlay del conteggio punti ora **intercetta i tap** invece di lasciarli passare al tavolo sottostante.
- Lo Scarto non scambia più una carta con la Briscola scoperta quando il tallone è terminato.
- Le due carte UNO `+2` non gonfiano più unilateralmente la mano del player (che rompeva la parità delle prese): ora ciclano due carte mantenendo invariati mano e tallone.

## File già pronti da sostituire

Copia sopra quelli del repo:

- `src/game/briscola.ts`
- `src/game/gameState.ts`
- `src/game/ai.ts` (nuovo)
- `src/game/briscola.test.ts` (nuovo)
- `src/game/ai.test.ts` (nuovo)
- `src/game/gameState.test.ts` (nuovo)

## Modifiche ai file grossi

Per evitare di consegnarti un `App.tsx` ricostruito a mano da 40+ KB, il pacchetto contiene un patcher **mirato allo snapshot corrente di main**:

```bash
node scripts/apply-turn-fix.mjs
```

Il patcher modifica in-place:

- `src/App.tsx`
- `src/components/GameTable.tsx`
- `src/components/ScoreTallyOverlay.tsx`
- `src/game/unoEffects.ts`
- `src/data/unoCards.ts`

È volutamente fail-fast: se Gemini ha cambiato nel frattempo una sezione attesa, termina con errore invece di fare una sostituzione ambigua.

## Ordine consigliato

1. Fai una copia/commit del repo corrente.
2. Estrai questo ZIP nella root del progetto, mantenendo le cartelle.
3. Esegui:

```bash
node scripts/apply-turn-fix.mjs
bun run lint
bunx vitest run src/game/briscola.test.ts src/game/ai.test.ts src/game/gameState.test.ts
bun run build
```

4. Prova una partita completa senza UNO/Boss prima, poi prova i modifier.

## Verifiche fatte qui

Sul core estratto ho eseguito TypeScript 5.8.3 in strict mode e una simulazione completa di Briscola:

- 40 carte
- 120 punti grezzi totali
- 20 prese esatte
- mani sempre della stessa dimensione dopo ogni pesca
- vincitore pesca per primo
- la Briscola scoperta viene pescata per ultima
- AI non inventa carte e usa il resolver canonico

La build React completa va comunque eseguita nel repo dopo il patcher, perché qui non ho il `node_modules` del tuo progetto.
