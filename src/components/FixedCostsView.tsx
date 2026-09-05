import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Tag, Calendar, AlertCircle } from 'lucide-react';
import { FixedCost, Frequency } from '../types';
import { formatKobo, normaliseToMonthly, nairaToKobo, koboToNaira } from '../utils/calculations';

interface FixedCostsViewProps {
  fixedCosts: FixedCost[];
  onAddCost: (cost: {
    label: string;
    category: string;
    amount_ceiling: number;
    amount_typical: number;
    frequency: Frequency;
    is_variable: boolean;
    notes?: string;
    promo?: {
      promo_amount: number;
      promo_ends_on: string;
    };
  }) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDeleteCost: (id: string) => Promise<void>;
}

export const FixedCostsView = ({
  fixedCosts,
  onAddCost,
  onToggleActive,
  onDeleteCost,
}: FixedCostsViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('Housing');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [ceilingNaira, setCeilingNaira] = useState('');
  const [typicalNaira, setTypicalNaira] = useState('');
  const [isVariable, setIsVariable] = useState(false);
  const [notes, setNotes] = useState('');

  // Promo fields
  const [hasPromo, setHasPromo] = useState(false);
  const [promoAmountNaira, setPromoAmountNaira] = useState('');
  const [promoEndsOn, setPromoEndsOn] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const ceilingKobo = nairaToKobo(ceilingNaira);
    const typicalKobo = typicalNaira ? nairaToKobo(typicalNaira) : ceilingKobo;

    if (ceilingKobo <= 0) {
      setErrorMsg('Please enter a valid ceiling cost amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddCost({
        label: label.trim() || 'Fixed Cost',
        category: category.trim() || 'General',
        amount_ceiling: ceilingKobo,
        amount_typical: typicalKobo,
        frequency,
        is_variable: isVariable,
        notes: notes.trim(),
        promo: hasPromo
          ? {
              promo_amount: nairaToKobo(promoAmountNaira),
              promo_ends_on: promoEndsOn,
            }
          : undefined,
      });

      // Reset form
      setLabel('');
      setCeilingNaira('');
      setTypicalNaira('');
      setIsVariable(false);
      setNotes('');
      setHasPromo(false);
      setPromoAmountNaira('');
      setPromoEndsOn('');
      setIsAdding(false);
      setIsSubmitting(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to save fixed cost.');
    }
  };

  const categories = ['Housing', 'Utilities', 'Transport', 'Food', 'Internet', 'Family & Dependents', 'Debt Service', 'Other'];

  return (
    <div id="fixed-costs-section" className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Fixed Costs & Natural Frequencies
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 text-blue-700">
              Ceiling & Typical Ranges
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Store amounts at their natural frequency (daily commute, weekly groceries, monthly power, yearly rent). Ramine normalises them in application code without storing pre-normalised figures.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Close Form' : 'Add Cost Item'}</span>
        </button>
      </div>

      {/* Add Cost Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm"
        >
          <div className="font-bold text-xs text-slate-900">
            Record Fixed Cost at Natural Frequency
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-bold text-[11px]">Cost Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Daily Danfo & Uber, Weekly Market"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold text-[11px]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900 font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold text-[11px]">
                Natural Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 font-bold text-slate-900"
              >
                <option value="daily">Daily (normalises x30/mo)</option>
                <option value="weekly">Weekly (normalises x4.33/mo)</option>
                <option value="monthly">Monthly (normalises x1/mo)</option>
                <option value="yearly">Yearly (normalises /12/mo)</option>
              </select>
            </div>
          </div>

          {/* Range Inputs: Ceiling vs Typical */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-slate-800 font-bold mb-1 text-[11px]">
                Amount Ceiling (Worst-Case at {frequency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-medium">₦</span>
                <input
                  type="number"
                  step="any"
                  value={ceilingNaira}
                  onChange={(e) => setCeilingNaira(e.target.value)}
                  placeholder="e.g. 2500 for daily, or 55000 for monthly"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-blue-600 font-bold text-slate-900"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Used to judge whether ongoing commitments are truly safe.
              </p>
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1 text-[11px]">
                Amount Typical (Normal standard at {frequency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-medium">₦</span>
                <input
                  type="number"
                  step="any"
                  value={typicalNaira}
                  onChange={(e) => setTypicalNaira(e.target.value)}
                  placeholder="Leave empty to match ceiling"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-blue-600 font-bold text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Used to measure actual monthly leakage without hiding leaks behind inflated estimates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isVariable}
                onChange={(e) => setIsVariable(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Cost varies month-to-month (variable cost)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPromo}
                onChange={(e) => setHasPromo(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium text-blue-800">
                Has temporary promotional price
              </span>
            </label>
          </div>

          {/* Promo Section */}
          {hasPromo && (
            <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-blue-950 font-bold mb-1 text-[11px]">
                  Promo Amount (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-blue-700 font-medium">₦</span>
                  <input
                    type="number"
                    step="any"
                    value={promoAmountNaira}
                    onChange={(e) => setPromoAmountNaira(e.target.value)}
                    placeholder="e.g. 18000"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-blue-200 bg-white focus:outline-blue-600 font-bold text-slate-900"
                    required={hasPromo}
                  />
                </div>
              </div>
              <div>
                <label className="block text-blue-950 font-bold mb-1 text-[11px]">
                  Promo Expiry Date
                </label>
                <input
                  type="date"
                  value={promoEndsOn}
                  onChange={(e) => setPromoEndsOn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white focus:outline-blue-600 text-slate-900"
                  required={hasPromo}
                />
              </div>
              <div className="sm:col-span-2 text-[10px] text-blue-900 leading-tight">
                * Note: Ramine models your plan at the regular rate with the promo marked as temporary. A budget built on an introductory price breaks the day it expires.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 text-[11px]">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Payable annually in November"
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-blue-600 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
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
              {isSubmitting ? 'Saving...' : 'Save Fixed Cost'}
            </button>
          </div>
        </form>
      )}

      {/* Fixed Costs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fixedCosts.map((cost) => {
          const monthlyCeiling = normaliseToMonthly(cost.amount_ceiling, cost.frequency);
          const monthlyTypical = normaliseToMonthly(
            cost.amount_typical || cost.amount_ceiling,
            cost.frequency
          );

          return (
            <div
              key={cost.id}
              id={`fixed-cost-card-${cost.id}`}
              className={`bg-white rounded-xl border p-5 shadow-sm transition flex flex-col justify-between ${cost.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-tight text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {cost.category}
                      </span>
                      {cost.is_variable && (
                        <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Variable
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{cost.label}</h3>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${cost.origin === 'told' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}
                  >
                    [{cost.origin.toUpperCase()}]
                  </span>
                </div>

                {/* Natural Frequency & Monthly Normalised Numbers */}
                <div className="bg-slate-50 rounded-lg p-3 my-3 text-xs border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Natural amount:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {formatKobo(cost.amount_typical)} to {formatKobo(cost.amount_ceiling)} / {cost.frequency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Normalised monthly:</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {formatKobo(monthlyTypical)}/mo
                      </span>
                      {monthlyCeiling !== monthlyTypical && (
                        <span className="text-slate-400 text-[10px] block font-mono">
                          ceiling: {formatKobo(monthlyCeiling)}/mo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Promotional badge if exists */}
                {cost.promo && (
                  <div className="mb-3 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-[11px] text-blue-950 flex items-start gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Intro promo: {formatKobo(cost.promo.promo_amount)}</span>{' '}
                      expires on {cost.promo.promo_ends_on}. Reverts to {formatKobo(cost.promo.regular_amount)} regular rate.
                    </div>
                  </div>
                )}

                {cost.notes && (
                  <p className="text-[11px] text-slate-400 italic mb-2">
                    {cost.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cost.active}
                    onChange={(e) => onToggleActive(cost.id, e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-600 text-xs font-medium">Active in budget</span>
                </label>

                <button
                  onClick={() => onDeleteCost(cost.id)}
                  className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                  title="Delete fixed cost"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
