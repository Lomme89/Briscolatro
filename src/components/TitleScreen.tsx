import { motion } from 'motion/react';
import { Armchair, BookOpen, Download, Eraser, Lamp, WalletCards } from 'lucide-react';
import { PlayingCard } from '../types/game';
import { PixelCard } from './PixelCard';
import { MenuCard, MenuEntry, MenuRule, PaperScrap } from './diegetic/Paper';

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
 * lampadina - e sopra c'e' il menù dell'osteria, su carta: inchiostro scuro su
 * fondo chiaro, perche' il menu principale e' la prima cosa che si legge.
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
    <div className="title-screen flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-10 z-10 relative">
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[23rem] sm:max-w-[29rem]"
      >
        {/* LE CARTE, IN VETRINA
            Stavano dietro la lavagna, in basso, smorzate: il prodotto del
            locale nascosto dietro il cartello che lo annuncia. Ora sono la
            prima cosa che si vede - calate sul bordo alto della cornice, come
            le lascia chi le mostra a chi entra - e sono le stesse carte con
            cui poi si gioca, alla loro luce vera. */}
        <div className="relative z-20 flex justify-center -mb-7 sm:-mb-9 pointer-events-none">
          {titleHand.map((card, index) => (
            <motion.div
              key={card.id}
              // Calate una alla volta, da sopra: e' il gesto di chi apre il
              // tavolo, non tre carte che compaiono.
              initial={{ y: -26, opacity: 0, rotate: 0 }}
              animate={{ y: 0, opacity: 1, rotate: -13 + index * 13 }}
              transition={{
                type: 'spring',
                damping: 16,
                stiffness: 220,
                delay: 0.12 + index * 0.11,
              }}
              className={index === 1 ? 'z-10 -mx-3 sm:-mx-3.5' : '-mx-2 sm:-mx-2.5'}
              style={{ transformOrigin: 'bottom center' }}
            >
              <div className="drop-shadow-[0_16px_18px_rgba(0,0,0,0.8)]">
                <PixelCard card={card} size="lg" showPoints={false} showChips={false} />
              </div>
            </motion.div>
          ))}
        </div>

        <MenuCard tilt={-0.8} className="relative z-10">
          {/* Il nome del locale: dipinto sulla lavagna una volta sola, e da
              allora sbiadisce. Non e' gesso, quindi non si cancella. */}
          <div className="text-center pt-5 sm:pt-6">
            <h1 className="font-pixel painted-sign text-[34px] sm:text-[42px] leading-none tracking-[0.06em]">
              BRISCOLATRO
            </h1>
            <p className="font-retro ink-dim text-[14px] sm:text-[15px] tracking-[0.2em] mt-2">
              OSTERIA · CARTE · SCOMMESSE
            </p>
          </div>

          <MenuRule className="my-4 sm:my-5" />

          <div className="space-y-3.5 sm:space-y-4">
            {hasResumableRun && (
              <MenuEntry
                label="Riprendi la partita"
                note={`Ante ${resumableAnte}`}
                icon={<Armchair {...stroke} />}
                tone="accent"
                size="lg"
                onClick={onResume}
              />
            )}

            <MenuEntry
              label="Nuova partita"
              note="Carte nuove"
              icon={<WalletCards {...stroke} />}
              tone={hasResumableRun ? 'ink' : 'accent'}
              size={hasResumableRun ? 'md' : 'lg'}
              onClick={onNewRun}
            />

            <MenuEntry
              label="Come si gioca"
              note="Le regole della casa"
              icon={<BookOpen {...stroke} />}
              size="sm"
              onClick={onOpenTutorial}
            />

            <MenuEntry
              label="Impostazioni"
              note="Luci e musica"
              icon={<Lamp {...stroke} />}
              size="sm"
              onClick={onOpenSettings}
            />

            {hasResumableRun && (
              <MenuEntry
                label="Abbandona la run"
                note="Passa lo straccio"
                icon={<Eraser {...stroke} />}
                tone="red"
                size="sm"
                onClick={onAbandon}
              />
            )}

            {!isStandalone && (
              <MenuEntry
                label="Installa l'app"
                note="Portatela a casa"
                icon={<Download {...stroke} />}
                tone="dim"
                size="sm"
                onClick={onInstall}
              />
            )}
          </div>

          {/* Il record e' segnato nell'angolo, storto, dove lo segnerebbe chi
              non aveva piu' spazio sulla lavagna. */}
          <div className="mt-6 sm:mt-7 flex justify-end">
            <div
              className="px-3 py-1.5 border border-[rgba(47,36,24,0.35)] rounded-[2px]"
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
        </MenuCard>

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
