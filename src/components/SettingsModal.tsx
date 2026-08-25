import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CardStyle, GameSettings, PlayingCard } from '../types/game';
import { sound } from '../services/soundEngine';
import { CARD_STYLES } from '../data/cardStyles';
import { PixelCard } from './PixelCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

// Sample preview cards to demonstrate the visual assets in real-time
const PREVIEW_ASSO: PlayingCard = {
  id: 'preview_asso',
  suit: 'denari',
  rank: 1,
  points: 11,
  power: 10,
  edition: 'standard',
  seal: 'none',
  enhancement: 'none',
};

const PREVIEW_RE: PlayingCard = {
  id: 'preview_re',
  suit: 'coppe',
  rank: 10,
  points: 4,
  power: 8,
  edition: 'standard',
  seal: 'none',
  enhancement: 'none',
};

const PREVIEW_BACK: PlayingCard = {
  id: 'preview_back',
  suit: 'spade',
  rank: 7,
  points: 0,
  power: 5,
  edition: 'standard',
  seal: 'none',
  enhancement: 'none',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);

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

  if (!isOpen) return null;

  const currentCardStyle: CardStyle = settings.cardStyle || 'classic';

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

  const handleSelectCardStyle = (styleId: CardStyle) => {
    sound.playCardFlick();
    onUpdateSettings({ cardStyle: styleId });
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
                IMPOSTAZIONI GIOCO
              </h2>
              <p className="text-[10px] text-slate-400 font-retro">Personalizza audio, grafica e stile delle carte</p>
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
          {/* --- 1. PIXEL ART CARD STYLES SECTION (KEY FEATURE) --- */}
          <div className="bg-slate-950/80 p-3 sm:p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-pixel text-[11px] sm:text-xs text-amber-400 font-bold flex items-center gap-1.5">
                  <span>🃏</span>
                  <span>STILE GRAFICO CARTE</span>
                </div>
                <div className="text-[10px] text-slate-400 font-retro">
                  Cambia le texture, la palette dei semi e l'aspetto delle carte
                </div>
              </div>
              <span className="font-pixel text-[8px] sm:text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                3 TEMI
              </span>
            </div>

            {/* Style Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CARD_STYLES.map((styleOption) => {
                const isSelected = currentCardStyle === styleOption.id;
                return (
                  <button
                    type="button"
                    key={styleOption.id}
                    onClick={() => handleSelectCardStyle(styleOption.id)}
                    className={`relative text-left p-2.5 rounded-xl pixel-box border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base sm:text-lg">{styleOption.icon}</span>
                        <span className={`font-pixel text-[10px] sm:text-[11px] font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {styleOption.name}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="font-pixel text-[7.5px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-bold">
                          ATTIVO
                        </span>
                      )}
                    </div>

                    <p className="text-[9.5px] leading-tight text-slate-400 font-retro">
                      {styleOption.subtitle}
                    </p>

                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="font-pixel text-[7.5px] text-slate-500 uppercase tracking-wide">
                        {styleOption.tag}
                      </span>
                      <div
                        className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Interactive Card Preview Display */}
            <div className="bg-slate-900/90 rounded-xl p-2.5 sm:p-3 border border-slate-800/90 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[9px] sm:text-[10px] text-slate-300 flex items-center gap-1">
                  <span>👁️</span> Anteprima dal Vivo ({CARD_STYLES.find(s => s.id === currentCardStyle)?.name})
                </span>
                <span className="text-[9px] text-slate-500 font-retro">Semi, figure e retro aggiornati</span>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                {/* 1. Asso di Denari */}
                <div className="flex flex-col items-center">
                  <PixelCard
                    card={PREVIEW_ASSO}
                    size="sm"
                    style={currentCardStyle}
                    showPoints
                  />
                  <span className="font-pixel text-[7.5px] text-slate-400 mt-1">Asso (11pt)</span>
                </div>

                {/* 2. Re di Coppe (Figura) */}
                <div className="flex flex-col items-center">
                  <PixelCard
                    card={PREVIEW_RE}
                    size="sm"
                    style={currentCardStyle}
                    showPoints
                  />
                  <span className="font-pixel text-[7.5px] text-slate-400 mt-1">Re (4pt)</span>
                </div>

                {/* 3. Retro Carta */}
                <div className="flex flex-col items-center">
                  <PixelCard
                    card={PREVIEW_BACK}
                    size="sm"
                    faceDown
                    style={currentCardStyle}
                  />
                  <span className="font-pixel text-[7.5px] text-slate-400 mt-1">Retro</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- 2. AUDIO SECTION --- */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-3">
            <div className="font-pixel text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5">
              <span>🔊</span>
              <span>AUDIO & SFX</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] sm:text-[11px] text-slate-300">Effetti Sonori (SFX)</span>
              <button
                type="button"
                onClick={() => {
                  const next = !settings.soundEnabled;
                  onUpdateSettings({ soundEnabled: next });
                  sound.setMuted(!next);
                }}
                className={`font-pixel text-[9px] sm:text-[10px] px-3 py-1.5 rounded-lg pixel-box font-bold cursor-pointer transition-colors min-h-[34px] ${
                  settings.soundEnabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-950 border border-red-800 text-red-300'
                }`}
              >
                {settings.soundEnabled ? 'ATTIVI' : 'DISATTIVATI'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] sm:text-[11px] text-slate-300">Musica Chiptune 8-Bit</span>
              <button
                type="button"
                onClick={() => {
                  const next = !settings.musicEnabled;
                  onUpdateSettings({ musicEnabled: next });
                  sound.toggleMusic(next);
                }}
                className={`font-pixel text-[9px] sm:text-[10px] px-3 py-1.5 rounded-lg pixel-box font-bold cursor-pointer transition-colors min-h-[34px] ${
                  settings.musicEnabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-950 border border-red-800 text-red-300'
                }`}
              >
                {settings.musicEnabled ? 'ATTIVA' : 'DISATTIVATA'}
              </button>
            </div>
          </div>

          {/* --- 3. VISUALS & FEEDBACK SECTION --- */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-3">
            <div className="font-pixel text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5">
              <span>📺</span>
              <span>EFFETTI RETRO</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-pixel text-[10px] sm:text-[11px] text-slate-300">Effetto Monitor CRT</div>
                <div className="text-[10px] text-slate-400 font-retro">Filtro retro arcade stile cabinato</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ crtScanlines: !settings.crtScanlines })}
                className={`font-pixel text-[9px] sm:text-[10px] px-3 py-1.5 rounded-lg pixel-box font-bold cursor-pointer transition-colors min-h-[34px] ${
                  settings.crtScanlines ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.crtScanlines ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-pixel text-[10px] sm:text-[11px] text-slate-300">Scuotimento Schermo (Shake)</div>
                <div className="text-[10px] text-slate-400 font-retro">Feedback cinetico su carichi e prese forti</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ screenShake: !settings.screenShake })}
                className={`font-pixel text-[9px] sm:text-[10px] px-3 py-1.5 rounded-lg pixel-box font-bold cursor-pointer transition-colors min-h-[34px] ${
                  settings.screenShake ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.screenShake ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* --- 4. PWA APP INSTALLATION SECTION --- */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-slate-950/80 p-3 sm:p-3.5 rounded-xl border border-amber-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/icon-192.png" alt="Briscolatro Icon" className="w-8 h-8 rounded-lg border border-amber-500/50 shadow-md shrink-0" />
                <div>
                  <div className="font-pixel text-[11px] sm:text-xs text-amber-300 font-bold">
                    INSTALLA COME APP
                  </div>
                  <div className="text-[10px] text-slate-400 font-retro">
                    Gioca a schermo intero senza barre del browser
                  </div>
                </div>
              </div>
              {isInstalled ? (
                <span className="font-pixel text-[8px] bg-emerald-900/80 text-emerald-200 border border-emerald-500/60 px-2 py-1 rounded">
                  ✓ INSTALLATA
                </span>
              ) : deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-pixel text-[9.5px] px-3 py-1.5 rounded-lg font-bold shadow-lg animate-bounce cursor-pointer"
                >
                  📲 INSTALLA
                </button>
              ) : (
                <span className="font-pixel text-[8px] bg-slate-800 text-amber-300/80 border border-slate-700 px-2 py-1 rounded">
                  PWA ATTIVA
                </span>
              )}
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[10.5px] text-slate-300 space-y-1">
              <div className="font-semibold text-amber-200">Come installare dal browser del telefono:</div>
              <div className="text-slate-400 text-[10px] leading-relaxed">
                Su <strong>Chrome / Brave Android</strong>: tocca il menu <strong>⋮ (3 puntini in alto a destra)</strong> e seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong>.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-pixel text-xs font-bold px-6 py-2.5 rounded-lg pixel-box cursor-pointer min-h-[40px] transition-colors"
          >
            SALVA & CHIUDI
          </button>
        </div>
      </motion.div>
    </div>
  );
};
