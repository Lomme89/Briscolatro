import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { GameSettings } from '../types/game';
import { sound } from '../services/soundEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  /** Wipes the record and the unlocked decks. */
  onResetProgress: () => void;
  highScore: number;
  unlockedDeckCount: number;
  totalDeckCount: number;
}

const Section: React.FC<{
  icon: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-3">
    <div className="font-pixel text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5">
      <span>{icon}</span>
      <span>{title}</span>
    </div>
    {children}
  </div>
);

const Row: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <div className="font-pixel text-[10px] sm:text-[11px] text-slate-300">{label}</div>
      {hint && <div className="text-[10px] text-slate-400 font-retro leading-snug">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{
  on: boolean;
  onClick: () => void;
  onLabel?: string;
  offLabel?: string;
}> = ({ on, onClick, onLabel = 'ON', offLabel = 'OFF' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`font-pixel text-[9px] sm:text-[10px] px-3 py-1.5 rounded-lg pixel-box font-bold cursor-pointer transition-colors min-h-[34px] min-w-[74px] ${
      on ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
    }`}
  >
    {on ? onLabel : offLabel}
  </button>
);

/**
 * A slider you can actually hit with a thumb.
 *
 * sfxVolume and musicVolume were in the settings and applied to the sound
 * engine from the first line, but nothing on this screen could move them: you
 * could only have the audio all the way up or off.
 */
const VolumeSlider: React.FC<{
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit?: () => void;
}> = ({ value, disabled, onChange, onCommit }) => (
  <div className="flex items-center gap-2">
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      onMouseUp={onCommit}
      onTouchEnd={onCommit}
      className="w-32 sm:w-40 accent-amber-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
    />
    <span
      className={`font-pixel text-[9px] w-8 text-right ${disabled ? 'text-slate-600' : 'text-amber-300'}`}
    >
      {value}
    </span>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetProgress,
  highScore,
  unlockedDeckCount,
  totalDeckCount,
}) => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  // Wiping the record is not something you should manage on one tap.
  const [confirmReset, setConfirmReset] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) setConfirmReset(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-slate-900 border-2 sm:border-3 border-slate-700 rounded-2xl pixel-box max-w-lg w-full p-3.5 sm:p-5 shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">⚙️</span>
            <div>
              <h2 className="font-pixel text-xs sm:text-sm text-slate-200 font-bold uppercase tracking-wide">
                IMPOSTAZIONI
              </h2>
              <p className="text-[10px] text-slate-400 font-retro">Audio, ritmo di gioco e app</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-pixel text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg pixel-box cursor-pointer min-h-[36px] flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5 overflow-y-auto pr-0.5">
          {/* --- AUDIO --- */}
          <Section icon="🔊" title="AUDIO">
            <Row label="Effetti sonori">
              <Toggle
                on={settings.soundEnabled}
                onLabel="ATTIVI"
                offLabel="MUTI"
                onClick={() => {
                  const next = !settings.soundEnabled;
                  onUpdateSettings({ soundEnabled: next });
                  sound.setMuted(!next);
                  if (next) sound.playCardSelect();
                }}
              />
            </Row>
            <Row label="Volume effetti">
              <VolumeSlider
                value={settings.sfxVolume}
                disabled={!settings.soundEnabled}
                onChange={(value) => onUpdateSettings({ sfxVolume: value })}
                // A volume slider you cannot hear is a guess: play a card on release.
                onCommit={() => settings.soundEnabled && sound.playCardSelect()}
              />
            </Row>

            <div className="border-t border-slate-800 pt-3 space-y-3">
              <Row label="Musica chiptune">
                <Toggle
                  on={settings.musicEnabled}
                  onLabel="ATTIVA"
                  offLabel="MUTA"
                  onClick={() => {
                    const next = !settings.musicEnabled;
                    onUpdateSettings({ musicEnabled: next });
                    sound.toggleMusic(next);
                  }}
                />
              </Row>
              <Row label="Volume musica">
                <VolumeSlider
                  value={settings.musicVolume}
                  disabled={!settings.musicEnabled}
                  onChange={(value) => onUpdateSettings({ musicVolume: value })}
                />
              </Row>
            </div>
          </Section>

          {/* --- PARTITA --- */}
          <Section icon="🃏" title="PARTITA">
            <Row label="Partita rapida" hint="Dimezza le pause tra una presa e l'altra">
              <Toggle
                on={settings.fastMode}
                onClick={() => onUpdateSettings({ fastMode: !settings.fastMode })}
              />
            </Row>
          </Section>

          {/* --- EFFETTI --- */}
          <Section icon="📺" title="EFFETTI">
            <Row label="Monitor CRT" hint="Filtro retro arcade stile cabinato">
              <Toggle
                on={settings.crtScanlines}
                onClick={() => onUpdateSettings({ crtScanlines: !settings.crtScanlines })}
              />
            </Row>
            <Row label="Scuotimento schermo" hint="Feedback cinetico su carichi e prese forti">
              <Toggle
                on={settings.screenShake}
                onClick={() => onUpdateSettings({ screenShake: !settings.screenShake })}
              />
            </Row>
          </Section>

          {/* --- PROGRESSI --- */}
          <Section icon="🏆" title="PROGRESSI">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-2">
                <div className="font-pixel text-[8px] text-slate-500 uppercase">Record</div>
                <div className="font-pixel text-[11px] text-amber-300 font-bold">
                  {highScore.toLocaleString('it-IT')}
                </div>
              </div>
              <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-2">
                <div className="font-pixel text-[8px] text-slate-500 uppercase">Mazzi sbloccati</div>
                <div className="font-pixel text-[11px] text-amber-300 font-bold">
                  {unlockedDeckCount}/{totalDeckCount}
                </div>
              </div>
            </div>

            {confirmReset ? (
              <div className="bg-red-950/50 border border-red-700 rounded-lg p-2.5 space-y-2">
                <div className="font-retro text-[11px] text-red-200 leading-snug">
                  Cancella il record e i mazzi sbloccati. Non si torna indietro.
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-pixel text-[9px] py-2 rounded-lg pixel-box font-bold cursor-pointer"
                  >
                    SÌ, AZZERA
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-[9px] py-2 rounded-lg pixel-box cursor-pointer"
                  >
                    ANNULLA
                  </button>
                </div>
              </div>
            ) : (
              <Row label="Azzera progressi" hint="Record e mazzi sbloccati tornano a zero">
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="font-pixel text-[9px] sm:text-[10px] px-3 py-1.5 rounded-lg pixel-box cursor-pointer min-h-[34px] min-w-[74px] bg-slate-800 hover:bg-red-900 text-red-300 border border-red-900/70 transition-colors"
                >
                  AZZERA
                </button>
              </Row>
            )}
          </Section>

          {/* --- APP --- */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-slate-950/80 p-3 rounded-xl border border-amber-500/40 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="/icon-192.png"
                  alt="Briscolatro"
                  className="w-8 h-8 rounded-lg border border-amber-500/50 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-pixel text-[11px] sm:text-xs text-amber-300 font-bold">
                    INSTALLA COME APP
                  </div>
                  <div className="text-[10px] text-slate-400 font-retro leading-snug">
                    Gioca a schermo intero senza barre del browser
                  </div>
                </div>
              </div>
              {isInstalled ? (
                <span className="font-pixel text-[8px] bg-emerald-900/80 text-emerald-200 border border-emerald-500/60 px-2 py-1 rounded shrink-0">
                  ✓ INSTALLATA
                </span>
              ) : deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel text-[9.5px] px-3 py-1.5 rounded-lg font-bold shadow-lg cursor-pointer shrink-0"
                >
                  📲 INSTALLA
                </button>
              ) : (
                <span className="font-pixel text-[8px] bg-slate-800 text-amber-300/80 border border-slate-700 px-2 py-1 rounded shrink-0">
                  PWA ATTIVA
                </span>
              )}
            </div>

            {!isInstalled && !deferredPrompt && (
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-retro leading-relaxed">
                Su <strong className="text-slate-300">Chrome / Brave Android</strong>: menu{' '}
                <strong className="text-slate-300">⋮</strong> →{' '}
                <strong className="text-slate-300">Installa app</strong>.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-pixel text-xs font-bold px-6 py-2.5 rounded-lg pixel-box cursor-pointer min-h-[40px] transition-colors"
          >
            CHIUDI
          </button>
        </div>
      </motion.div>
    </div>
  );
};
