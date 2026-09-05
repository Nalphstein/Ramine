import { X, Brain, Trash2, ShieldCheck, Tag } from 'lucide-react';
import { MemoryFact } from '../types';
import { formatKobo } from '../utils/calculations';

interface MemoryInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  facts: MemoryFact[];
  onForgetFact: (entityType: string, id: string) => Promise<void>;
}

export const MemoryInspector = ({
  isOpen,
  onClose,
  facts,
  onForgetFact,
}: MemoryInspectorProps) => {
  if (!isOpen) return null;

  return (
    <div
      id="memory-inspector-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="memory-inspector-content"
        className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Memory Inspector & Provenance
              </h2>
              <p className="text-xs text-slate-500">
                Every stored fact is tagged <span className="text-blue-700 font-bold">[TOLD]</span> or{' '}
                <span className="text-slate-700 font-bold">[INFERRED]</span>. You can inspect origins or command "Forget that".
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational banner */}
        <div className="my-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-900">Full Provenance & Delete Path:</strong> Ramine never locks you into hidden assumptions. If you ask <em>"Why do you think that?"</em>, Ramine references these explicit records. Clicking <strong>Forget That</strong> deletes the fact directly.
          </div>
        </div>

        {/* Fact list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2">
          {facts.map((f) => (
            <div
              key={`${f.entity_type}-${f.id}`}
              id={`memory-fact-${f.id}`}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                      f.origin === 'told'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    [{f.origin.toUpperCase()}]
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-medium">
                    {f.entity_type.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-slate-900 text-xs">{f.label}</span>
                </div>

                <div className="text-slate-700">
                  <span className="font-bold text-slate-900 font-mono">
                    {formatKobo(f.amount)}
                  </span>
                  <span className="text-slate-500 ml-1.5 text-xs">{f.details}</span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-start gap-1">
                  <span className="font-bold text-slate-700">Why Ramine thinks this:</span>
                  <span className="italic text-slate-600">{f.why_we_think_that}</span>
                </div>
              </div>

              {/* Action: Forget that */}
              <button
                onClick={() => onForgetFact(f.entity_type, f.id)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs transition flex items-center gap-1.5 self-end sm:self-auto cursor-pointer shrink-0"
                title="Permanently remove this stored fact"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Forget That</span>
              </button>
            </div>
          ))}

          {facts.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No facts currently stored in memory.
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
