import { motion } from 'motion/react';
import { Armchair, BookOpen, Download, Eraser, Lamp, WalletCards } from 'lucide-react';
import { PlayingCard } from '../types/game';
import { PixelCard } from './PixelCard';
import { ChalkEntry, ChalkRule, PaperScrap, SlateBoard } from './diegetic/Slate';

interface TitleScreenProps {
  titleHand: PlayingCard[];
  highScore: number;
  saveNotice: string | null;
  resumableAnte: number | null;
  isStandalone: boolean;
  onResume: () => void;
  onNewRun: () => void;
  onAbandon: () => void;
  onOpenTutorial: () => void;
  onOpenSettings: () => void;
  onInstall: () => void;
}

/**
 * Il menu principale e' il menu del locale.
 *
 * Prima era un pannello scuro con dei bottoni sfumati, appoggiato sopra un
 * tavolo che il gioco aveva gia' costruito: due mondi, uno sopra l'altro.
 * Adesso il tavolo e' uno solo - lo stesso su cui si gioca, sotto la stessa
 * lampadina - e sopra c'e' la lavagna dell'osteria: il nome dipinto in alto
 * anni fa, la lista della serata scritta a gesso sotto.
 */
export function TitleScreen({
  titleHand,
  highScore,
  saveNotice,
  resumableAnte,
  isStandalone,
  onResume,
  onNewRun,
  onAbandon,
  onOpenTutorial,
  onOpenSettings,
  onInstall,
}: TitleScreenProps) {
  const hasResumableRun = resumableAnte !== null;
  const stroke = { size: 22, strokeWidth: 1.6 } as const;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-10 z-10 relative">
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[23rem] sm:max-w-[29rem]"
      >
        <SlateBoard tilt={-1.2} className="relative z-10">
          {/* Il nome del locale: dipinto sulla lavagna una volta sola, e da
              allora sbiadisce. Non e' gesso, quindi non si cancella. */}
          <div className="text-center">
            <h1 className="font-pixel painted-sign text-[15px] sm:text-[19px] leading-tight tracking-[0.14em]">
              BRISCOLATRO
            </h1>
            <p className="font-pixel painted-sign text-[6.5px] sm:text-[7.5px] tracking-[0.22em] mt-2 opacity-70">
              OSTERIA · CARTE · SCOMMESSE
            </p>
          </div>

          <ChalkRule className="my-4 sm:my-5" />

          <div className="space-y-3.5 sm:space-y-4">
            {hasResumableRun && (
              <ChalkEntry
                label="Riprendi la partita"
                note={`Ante ${resumableAnte}`}
                icon={<Armchair {...stroke} />}
                tone="yellow"
                size="lg"
                delay={0.18}
                onClick={onResume}
              />
            )}

            <ChalkEntry
              label="Carte nuove"
              note={hasResumableRun ? 'Da capo' : 'Nuova partita'}
              icon={<WalletCards {...stroke} />}
              tone={hasResumableRun ? 'chalk' : 'yellow'}
              size={hasResumableRun ? 'md' : 'lg'}
              delay={hasResumableRun ? 0.3 : 0.18}
              onClick={onNewRun}
            />

            <ChalkEntry
              label="Le regole della casa"
              note="Briscola"
              icon={<BookOpen {...stroke} />}
              size="sm"
              delay={hasResumableRun ? 0.42 : 0.3}
              onClick={onOpenTutorial}
            />

            <ChalkEntry
              label="Luci e musica"
              note="Impostazioni"
              icon={<Lamp {...stroke} />}
              size="sm"
              delay={hasResumableRun ? 0.52 : 0.4}
              onClick={onOpenSettings}
            />

            {hasResumableRun && (
              <ChalkEntry
                label="Passa lo straccio"
                note="Abbandona la run"
                icon={<Eraser {...stroke} />}
                tone="red"
                size="sm"
                delay={0.62}
                onClick={onAbandon}
              />
            )}

            {!isStandalone && (
              <ChalkEntry
                label="Portatela a casa"
                note="Installa"
                icon={<Download {...stroke} />}
                tone="dim"
                size="sm"
                delay={hasResumableRun ? 0.72 : 0.5}
                onClick={onInstall}
              />
            )}
          </div>

          {/* Il record e' segnato nell'angolo, storto, dove lo segnerebbe chi
              non aveva piu' spazio sulla lavagna. */}
          <div className="mt-6 sm:mt-7 flex justify-end">
            <div
              className="px-3 py-1.5 border border-[rgba(236,229,214,0.32)] rounded-[2px]"
              style={{ transform: 'rotate(-1.6deg)' }}
            >
              <span className="font-condensed chalk-dim text-[14px] sm:text-[17px] uppercase">
                Record della casa{' '}
              </span>
              <span className="font-condensed chalk text-[18px] sm:text-[22px] tabular-nums">
                {highScore.toLocaleString('it-IT')}
              </span>
            </div>
          </div>
        </SlateBoard>

        {/* La mano di chi si e' alzato da tavolo: le carte restano dove le ha
            lasciate, davanti alla lavagna, e l'ombra della lavagna ci cade
            sopra. Non sono decorazione - sono le stesse carte del gioco. */}
        <div className="relative -mt-6 sm:-mt-8 flex justify-end pr-4 sm:pr-8 pointer-events-none z-0">
          {titleHand.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ y: -14 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.35 + index * 0.09 }}
              className={index === 1 ? '-mx-3.5 sm:-mx-4' : '-mx-2.5 sm:-mx-3'}
            >
              {/* Il ventaglio e' una rotazione statica, non un'animazione: chi
                  ha ridotto il movimento vede comunque tre carte, non tre carte
                  impilate una sull'altra. */}
              <div
                className="drop-shadow-[0_14px_16px_rgba(0,0,0,0.85)] brightness-[0.72] saturate-[0.85] contrast-[1.05]"
                style={{ transform: `rotate(${-16 + index * 13}deg)` }}
              >
                <PixelCard card={card} size="md" showPoints={false} showChips={false} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Cio' che non ha scritto l'oste sta su carta, incastrata nella
            cornice. */}
        {saveNotice && (
          <PaperScrap
            tilt={-2.2}
            className="absolute -bottom-5 -left-2 sm:-left-6 z-20 max-w-[16rem] rounded-[1px]"
          >
            <p className="font-condensed text-[16px] leading-tight text-[#6d2b22] uppercase">
              {saveNotice}
            </p>
          </PaperScrap>
        )}
      </motion.div>

      {/* Sul legno, non sulla lavagna: la targhetta di chi ha messo su il
          locale. */}
      <div className="mt-12 sm:mt-14 text-center font-condensed text-[15px] leading-snug text-[#a08b6d] max-w-xs">
        Ispirato a Balatro &amp; alla tradizione delle carte napoletane
        <div className="text-[13px] text-[#7d6a52] mt-0.5">
          Con le Carte Sola, gioco di carte legalmente distinto.
        </div>
      </div>
    </div>
  );
}
