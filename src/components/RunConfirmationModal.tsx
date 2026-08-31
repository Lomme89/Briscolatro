export type RunConfirmation = 'new_run' | 'abandon';

interface RunConfirmationModalProps {
  confirmation: RunConfirmation | null;
  onCancel: () => void;
  onConfirm: (confirmation: RunConfirmation) => void;
}

export function RunConfirmationModal({
  confirmation,
  onCancel,
  onConfirm,
}: RunConfirmationModalProps) {
  if (!confirmation) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-sm bg-slate-950 border-3 border-amber-500 rounded-2xl p-5 pixel-box text-center">
        <p className="font-pixel text-xs text-amber-300">
          {confirmation === 'new_run' ? 'INIZIARE UNA NUOVA RUN?' : 'ABBANDONARE LA RUN?'}
        </p>
        <p className="mt-2 font-retro text-[11px] text-slate-300">
          La run salvata verrà eliminata. Record e mazzi sbloccati restano.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-[10px] py-2.5 rounded-xl pixel-box cursor-pointer"
          >
            ANNULLA
          </button>
          <button
            onClick={() => onConfirm(confirmation)}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-slate-950 font-pixel text-[10px] py-2.5 rounded-xl pixel-box cursor-pointer"
          >
            CONFERMA
          </button>
        </div>
      </div>
    </div>
  );
}
