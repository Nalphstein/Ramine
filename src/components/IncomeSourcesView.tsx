import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Calendar, Check, AlertCircle } from 'lucide-react';
import { IncomeSource } from '../types';
import { formatKobo, nairaToKobo, koboToNaira } from '../utils/calculations';

interface IncomeSourcesViewProps {
  incomeSources: IncomeSource[];
  onAddIncome: (income: {
    label: string;
    expected_amount: number;
    pay_day_of_month: number;
  }) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
}

export const IncomeSourcesView = ({
  incomeSources,
  onAddIncome,
  onToggleActive,
  onDeleteIncome,
}: IncomeSourcesViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [payDay, setPayDay] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amountKobo = nairaToKobo(amountNaira);

    if (amountKobo <= 0) {
      setErrorMsg('Please enter a valid salary amount (greater than ₦0).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddIncome({
        label: label.trim() || 'Steady Salary',
        expected_amount: amountKobo,
        pay_day_of_month: Number(payDay) || 25,
      });
      setLabel('');
      setAmountNaira('');
      setPayDay(25);
      setIsAdding(false);
      setIsSubmitting(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to save income source.');
    }
  };

  const totalExpectedKobo = incomeSources
    .filter((i) => i.active)
    .reduce((sum, i) => sum + i.expected_amount, 0);

  return (
    <div id="income-sources-section" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Salary Streams & Split Instalments
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 text-blue-700">
              Deterministic Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            In Nigeria, salary is frequently paid in split instalments across multiple dates (e.g. base on the 25th, allowances on the 28th). Track each instalment here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 font-bold uppercase text-[10px]">Total Active Expected:</span>
            <div className="text-base font-bold text-slate-900 font-mono">
              {formatKobo(totalExpectedKobo)}/mo
            </div>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Close Form' : 'Add Salary Stream'}</span>
          </button>
        </div>
      </div>

      {/* Add Income Stream Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3"
        >
          <div className="font-bold text-xs text-slate-900">
            Record New Steady Income Source
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-bold text-[11px]">
                Stream Label / Description
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Primary Tech Salary, Transport Allowance"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold text-[11px]">
                Expected Amount (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-medium">₦</span>
                <input
                  type="number"
                  step="any"
                  value={amountNaira}
                  onChange={(e) => setAmountNaira(e.target.value)}
                  placeholder="380000"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 font-bold text-slate-900"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold text-[11px]">
                Expected Payday of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={payDay}
                onChange={(e) => setPayDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Income Source'}
            </button>
          </div>
        </form>
      )}

      {/* Income Stream Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incomeSources.map((inc) => (
          <div
            key={inc.id}
            id={`income-card-${inc.id}`}
            className={`bg-white rounded-xl border p-5 shadow-sm transition flex flex-col justify-between ${inc.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{inc.label}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Expected on the {inc.pay_day_of_month}th of every month</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${inc.origin === 'told' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}
                  title={`Origin tag: ${inc.origin}`}
                >
                  [{inc.origin.toUpperCase()}]
                </span>
              </div>

              <div className="my-3">
                <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  {formatKobo(inc.expected_amount)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {inc.expected_amount.toLocaleString()} kobo minor units
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inc.active}
                  onChange={(e) => onToggleActive(inc.id, e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-600 text-xs font-medium">Active in baseline</span>
              </label>

              <button
                onClick={() => onDeleteIncome(inc.id)}
                className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                title="Delete income stream"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
