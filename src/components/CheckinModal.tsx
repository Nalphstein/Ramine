import { useState, type FormEvent } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { IncomeSource, Commitment } from '../types';
import { formatKobo, nairaToKobo, koboToNaira } from '../utils/calculations';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomeSources: IncomeSource[];
  commitments: Commitment[];
  onSubmitCheckin: (checkinData: {
    income_source_id: string;
    period_month: string;
    expected_amount: number;
    actual_amount: number;
    received_on: string;
    is_full_month: boolean;
    planned_saving: number;
    actual_saving: number;
    note?: string;
  }) => Promise<void>;
}

export const CheckinModal = ({
  isOpen,
  onClose,
  incomeSources,
  commitments,
  onSubmitCheckin,
}: CheckinModalProps) => {
  if (!isOpen) return null;

  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  const defaultIncome = incomeSources[0];
  const [incomeSourceId, setIncomeSourceId] = useState(defaultIncome?.id || '');
  const [periodMonth, setPeriodMonth] = useState(currentYearMonth);
  const [receivedOn, setReceivedOn] = useState(todayStr);

  const selectedIncome =
    incomeSources.find((i) => i.id === incomeSourceId) || defaultIncome;

  // Planned saving defaults to sum of active saving commitments
  const defaultPlannedSavingKobo = commitments
    .filter((c) => c.active && c.kind === 'saving')
    .reduce((sum, c) => sum + c.amount, 0);

  const [actualAmountNaira, setActualAmountNaira] = useState(
    selectedIncome ? koboToNaira(selectedIncome.expected_amount).toString() : '0'
  );
  const [actualSavingNaira, setActualSavingNaira] = useState(
    defaultPlannedSavingKobo > 0 ? koboToNaira(defaultPlannedSavingKobo).toString() : '0'
  );
  const [isFullMonth, setIsFullMonth] = useState(true);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleIncomeSelect = (id: string) => {
    setIncomeSourceId(id);
    const inc = incomeSources.find((i) => i.id === id);
    if (inc) {
      setActualAmountNaira(koboToNaira(inc.expected_amount).toString());
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const actualKobo = nairaToKobo(actualAmountNaira);
    const savingKobo = nairaToKobo(actualSavingNaira);

    if (actualKobo <= 0) {
      setErrorMsg('Please enter the actual salary amount received (greater than 0).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmitCheckin({
        income_source_id: incomeSourceId || selectedIncome?.id || 'inc_1',
        period_month: periodMonth,
        expected_amount: selectedIncome?.expected_amount || actualKobo,
        actual_amount: actualKobo,
        received_on: receivedOn,
        is_full_month: isFullMonth,
        planned_saving: defaultPlannedSavingKobo,
        actual_saving: savingKobo,
        note: note.trim(),
      });
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to submit check-in.');
    }
  };

  return (
    <div
      id="checkin-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="checkin-modal-content"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Monthly Check-in
              </h2>
              <p className="text-xs text-slate-500">
                Three questions to record real outcomes and measure leakage
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

        {errorMsg && (
          <div className="my-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Income Source & Period selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Income Source
              </label>
              <select
                value={incomeSourceId}
                onChange={(e) => handleIncomeSelect(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-2 bg-slate-50 focus:bg-white focus:outline-blue-600 text-slate-900 font-medium"
              >
                {incomeSources.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.label} ({formatKobo(inc.expected_amount)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Month Period
              </label>
              <input
                type="month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-2 bg-slate-50 focus:bg-white focus:outline-blue-600 text-slate-900"
                required
              />
            </div>
          </div>

          {/* Question 1: When did it arrive? */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              1. Date salary landed in your account:
            </label>
            <input
              type="date"
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-blue-600 text-slate-900"
              required
            />
          </div>

          {/* Question 2: How much actually arrived? */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-bold text-slate-800">
                2. How much actually arrived (Net Take-home in ₦):
              </label>
              {selectedIncome && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Expected: {formatKobo(selectedIncome.expected_amount)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">₦</span>
              <input
                type="number"
                step="any"
                value={actualAmountNaira}
                onChange={(e) => setActualAmountNaira(e.target.value)}
                placeholder="e.g. 380000"
                className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono rounded-lg border border-slate-200 focus:outline-blue-600 text-slate-900"
                required
              />
            </div>
          </div>

          {/* Question 3: Did planned saving happen? */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-bold text-slate-800">
                3. Did the planned saving happen? (Actual Saved in ₦):
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Planned: {formatKobo(defaultPlannedSavingKobo)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">₦</span>
              <input
                type="number"
                step="any"
                value={actualSavingNaira}
                onChange={(e) => setActualSavingNaira(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono rounded-lg border border-slate-200 focus:outline-blue-600 text-slate-900"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Any positive actual saving entered here will automatically top up your central Savings Pool.
            </p>
          </div>

          {/* Full month toggle with strict prompt justification */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isFullMonth}
                onChange={(e) => setIsFullMonth(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  This was a full standard working month
                </span>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Partial months (e.g. starting a new job midway, prorated salary, unpaid leave) will be excluded from your realised income baseline so your long-term average is not silently skewed.
                </p>
              </div>
            </label>
          </div>

          {/* Optional 1-sentence note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note (Optional context)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Salary paid on time; fuel price hike increased transport"
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-blue-600 text-slate-900"
              maxLength={120}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Record Check-in'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
