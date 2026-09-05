import { useState, type FormEvent } from 'react';
import { Calendar, Trash2, Plus, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Checkin, LeakNote, DerivedValues } from '../types';
import { formatKobo, nairaToKobo } from '../utils/calculations';

interface CheckinsListProps {
  checkins: Checkin[];
  leakNotes: LeakNote[];
  derived: DerivedValues;
  onDeleteCheckin: (id: string) => Promise<void>;
  onAddLeakNote: (note: { period_month: string; amount: number; label: string }) => Promise<void>;
  onDeleteLeakNote: (id: string) => Promise<void>;
  onTriggerCheckin: () => void;
}

export const CheckinsList = ({
  checkins,
  leakNotes,
  derived,
  onDeleteCheckin,
  onAddLeakNote,
  onDeleteLeakNote,
  onTriggerCheckin,
}: CheckinsListProps) => {
  const [leakAmountNaira, setLeakAmountNaira] = useState('');
  const [leakWordLabel, setLeakWordLabel] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(
    checkins[0]?.period_month || new Date().toISOString().slice(0, 7)
  );
  const [isAddingLeak, setIsAddingLeak] = useState(false);

  const handleAddLeak = async (e: FormEvent) => {
    e.preventDefault();
    const amountKobo = nairaToKobo(leakAmountNaira);
    const cleanWord = leakWordLabel.trim().split(/\s+/)[0]; // single word!

    if (amountKobo <= 0 || !cleanWord) return;

    try {
      setIsAddingLeak(true);
      await onAddLeakNote({
        period_month: selectedMonth,
        amount: amountKobo,
        label: cleanWord,
      });
      setLeakAmountNaira('');
      setLeakWordLabel('');
      setIsAddingLeak(false);
    } catch {
      setIsAddingLeak(false);
    }
  };

  const sortedCheckins = [...checkins].sort((a, b) =>
    b.received_on.localeCompare(a.received_on)
  );

  return (
    <div id="checkins-section" className="space-y-6">
      {/* Top Banner / Explainer */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              The Monthly Check-in Loop
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 text-blue-700">
              Core Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Advice without recorded outcomes is worthless. Ramine captures what actually arrived and what was saved, deriving your real monthly leak without daily tracking.
          </p>
        </div>

        <button
          onClick={onTriggerCheckin}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Check-in Entry</span>
        </button>
      </div>

      {/* Checkins Record Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-tight text-slate-400">
          Recorded Month Outcomes ({sortedCheckins.length})
        </h3>

        {sortedCheckins.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            No check-in entries recorded yet. Click "New Check-in Entry" to record your first month!
          </div>
        ) : (
          sortedCheckins.map((chk) => {
            // misc_leak = actual_amount - cost_typical - actual_saving
            const miscLeak = chk.actual_amount - derived.cost_typical - chk.actual_saving;
            const monthNotes = leakNotes.filter((n) => n.period_month === chk.period_month);
            const namedLeak = monthNotes.reduce((sum, n) => sum + n.amount, 0);
            const unaccountedLeak = miscLeak - namedLeak;

            return (
              <div
                key={chk.id}
                id={`checkin-card-${chk.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-sm text-slate-900">
                      {chk.period_month}
                    </span>
                    <span className="text-xs text-slate-400">
                      (Received: {chk.received_on})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${chk.is_full_month ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {chk.is_full_month ? 'Full Month Baseline' : 'Partial Month (Excluded)'}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteCheckin(chk.id)}
                    className="text-slate-400 hover:text-rose-600 transition p-1 self-end sm:self-auto cursor-pointer"
                    title="Delete this check-in"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Actual Income:</span>
                    <div className="font-bold text-slate-900 mt-0.5 text-base font-mono">
                      {formatKobo(chk.actual_amount)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Actual Saved:</span>
                    <div className="font-bold text-emerald-600 mt-0.5 text-base font-mono">
                      {formatKobo(chk.actual_saving)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Typical Fixed Cost:</span>
                    <div className="font-bold text-slate-700 mt-0.5 text-base font-mono">
                      {formatKobo(derived.cost_typical)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Derived Misc Leak:</span>
                    <div
                      className={`font-bold mt-0.5 text-base font-mono ${miscLeak > 0 ? 'text-amber-700' : 'text-slate-700'}`}
                    >
                      {formatKobo(miscLeak)}
                    </div>
                  </div>
                </div>

                {/* Leak explanation badge */}
                <div className="bg-slate-50 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-bold text-slate-800">Leak breakdown:</span>
                    <span>Named: {formatKobo(namedLeak)}</span>
                    <span>•</span>
                    <span
                      className={unaccountedLeak > 0 ? 'text-amber-800 font-bold' : 'text-slate-500'}
                    >
                      Unaccounted: {formatKobo(unaccountedLeak)}
                    </span>
                  </div>

                  {chk.note && (
                    <div className="text-slate-500 italic truncate max-w-sm text-[11px]">
                      "{chk.note}"
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Leak Notes Widget: Single-word unplanned outflows */}
      <div
        id="leak-notes-card"
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Leak Notes (Names on Unplanned Outflows)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Not an expense tracker! One amount and a single word (e.g. "generator", "wedding", "fuel"). Enter only when you feel like it to help identify what is cuttable.
            </p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-bold uppercase">
            Zero Nagging Policy
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddLeak} className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-2 bg-slate-50/50 focus:bg-white focus:outline-blue-600 text-slate-900 font-medium"
          >
            {sortedCheckins.map((c) => (
              <option key={c.period_month} value={c.period_month}>
                {c.period_month}
              </option>
            ))}
            {sortedCheckins.length === 0 && (
              <option value={new Date().toISOString().slice(0, 7)}>
                {new Date().toISOString().slice(0, 7)}
              </option>
            )}
          </select>

          <div className="relative">
            <span className="absolute left-2.5 top-2 text-slate-400 font-medium">₦</span>
            <input
              type="number"
              step="any"
              value={leakAmountNaira}
              onChange={(e) => setLeakAmountNaira(e.target.value)}
              placeholder="Amount (e.g. 15000)"
              className="pl-6 pr-3 py-2 w-36 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-blue-600 text-slate-900"
              required
            />
          </div>

          <input
            type="text"
            value={leakWordLabel}
            onChange={(e) => setLeakWordLabel(e.target.value)}
            placeholder="Single word (e.g. fuel, wedding)"
            className="px-3 py-2 w-48 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-blue-600 text-slate-900"
            required
            maxLength={25}
          />

          <button
            type="submit"
            disabled={isAddingLeak}
            className="px-4 py-2 font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </form>

        {/* Existing Leak Notes Chips */}
        <div className="pt-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-2">
            Active Named Outflow Notes ({leakNotes.length})
          </div>

          {leakNotes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              No leak notes entered. An empty month is fine and the derived leak figure still works without it.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {leakNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs"
                >
                  <span className="font-bold text-slate-800">{note.label}:</span>
                  <span className="font-mono text-slate-600 font-semibold">{formatKobo(note.amount)}</span>
                  <span className="text-[10px] text-slate-400">({note.period_month})</span>
                  <button
                    onClick={() => onDeleteLeakNote(note.id)}
                    className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
