import {
  TrendingUp,
  Receipt,
  Scale,
  ShieldCheck,
  Target,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { DerivedValues, Goal } from '../types';
import { formatKobo } from '../utils/calculations';

interface CashFlowDashboardProps {
  derived: DerivedValues;
  goals: Goal[];
  onOpenCheckin: () => void;
}

export const CashFlowDashboard = ({ derived, goals, onOpenCheckin }: CashFlowDashboardProps) => {
  const isTight = derived.commitment_headroom < 0;

  if (derived.guard_rails.no_income) {
    return (
      <div
        id="dashboard-empty-income"
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          No Income Stream Recorded
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          Ramine calculates cash flow and surplus strictly from your verified salary data. Add your
          regular salary stream to activate the planning engine.
        </p>
      </div>
    );
  }

  return (
    <div id="cash-flow-dashboard" className="space-y-6">
      {/* Top row: 4 Metric Cards in Professional Polish Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Realised Income */}
        <div
          id="card-realised-income"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Realised Income</p>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatKobo(derived.realised_income)}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {derived.has_full_month_history
              ? `Avg of ${derived.full_months_count} verified month(s)`
              : 'Baseline from active salary streams'}
          </p>
        </div>

        {/* Card 2: Surplus (Typical & Ceiling) */}
        <div
          id="card-monthly-surplus"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Surplus (Typical)</p>
              <Scale className="w-4 h-4 text-emerald-600" />
            </div>
            <p
              className={`text-2xl font-bold tracking-tight ${derived.surplus_typical >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {formatKobo(derived.surplus_typical)}
            </p>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 font-medium">
            <span>Ceiling surplus:</span>
            <span
              className={`font-bold ${derived.surplus_ceiling >= 0 ? 'text-slate-800' : 'text-rose-600'}`}
            >
              {formatKobo(derived.surplus_ceiling)}/mo
            </span>
          </div>
        </div>

        {/* Card 3: Savings Pool */}
        <div
          id="card-savings-pool"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Savings Pool</p>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600 tracking-tight">
              {formatKobo(derived.savings_pool_total)}
            </p>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 font-medium">
            <span>Allocated to goals:</span>
            <span className="font-bold text-slate-800">
              {formatKobo(derived.total_goal_allocations)}
            </span>
          </div>
        </div>

        {/* Card 4: Months of Cover */}
        <div
          id="card-months-cover"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Months of Cover</p>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded uppercase">
                {derived.months_of_cover_typical >= 3 ? 'Healthy Flow' : 'Building'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">
              {derived.months_of_cover_typical}{' '}
              <span className="text-sm font-medium text-slate-400 uppercase">Months</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Normalised living cost: {formatKobo(derived.cost_typical)}/mo
          </p>
        </div>
      </div>

      {/* Dual Explanation Banner: Why Ceiling vs Typical Both Matter */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-900">Why Ramine displays dual surplus figures: </span>
          Use the <strong className="text-slate-900 font-bold">ceiling surplus</strong> ({formatKobo(derived.surplus_ceiling)}) to judge whether adding a recurring commitment is safe.
          Use the <strong className="text-slate-900 font-bold">typical surplus</strong> ({formatKobo(derived.surplus_typical)}) to measure performance in a standard month. Showing only one hides leakage or paralyzes planning.
        </div>
      </div>

      {/* Second row: Commitment Headroom & Goal Aggregate Feasibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commitment Headroom */}
        <div
          id="card-headroom"
          className={`rounded-xl border p-6 shadow-sm flex flex-col justify-between transition ${isTight ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Commitment Headroom
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Surplus Ceiling minus Active Commitments
                </p>
              </div>
              <span
                className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase ${isTight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {isTight ? 'Plan is Tight' : 'Headroom Available'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span
                className={`text-3xl font-bold tracking-tight ${isTight ? 'text-amber-900' : 'text-blue-600'}`}
              >
                {formatKobo(derived.commitment_headroom)}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ month free</span>
            </div>

            {/* Detailed mini breakdown boxes */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Ceiling Surplus</p>
                <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                  {formatKobo(derived.surplus_ceiling)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Maximum safety margin</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Active Commitments</p>
                <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                  -{formatKobo(derived.active_commitments_total)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {derived.locked_commitments_total > 0 ? 'Includes locked commitments' : 'Recurring outflows'}
                </p>
              </div>
            </div>
          </div>

          {/* Tight Plan Alert per Prompt Rules */}
          {isTight && (
            <div className="mt-2 p-3.5 rounded-lg bg-amber-100/90 border border-amber-300/80 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Plan requires cutting {formatKobo(derived.required_cut_if_tight)}/mo in unplanned spending
                  </div>
                  <p className="mt-1 text-amber-900 leading-relaxed text-[11px]">
                    Your active commitments exceed your ceiling surplus. Adults are allowed to attempt a tight plan; Ramine will not block you, but without cutting daily leakage by {formatKobo(derived.required_cut_if_tight)}, this plan will fail when fixed costs reach their ceiling.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aggregate Goal Feasibility */}
        <div
          id="card-aggregate-feasibility"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Goal Feasibility
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All Dated Financial Goals Judged Collectively
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${derived.is_aggregate_goals_feasible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
              >
                {derived.is_aggregate_goals_feasible ? 'Feasible under Ceiling' : 'At Risk'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {formatKobo(derived.aggregate_dated_monthly_req)}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ mo total required</span>
            </div>

            {/* Collective Feasibility Progress Bar / Group */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-600">HEADROOM UTILISATION</span>
                <span className="text-slate-900">
                  {derived.commitment_headroom > 0
                    ? `${Math.min(100, Math.round((derived.aggregate_dated_monthly_req / derived.commitment_headroom) * 100))}%`
                    : '100%+'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${derived.is_aggregate_goals_feasible ? 'bg-blue-600' : 'bg-amber-500'}`}
                  style={{
                    width: `${Math.min(100, derived.commitment_headroom > 0 ? (derived.aggregate_dated_monthly_req / derived.commitment_headroom) * 100 : 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* System Note Box */}
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs leading-relaxed text-slate-600">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">System Engine Rule</p>
              <p className="text-[11px] leading-relaxed">
                Ramine judges all dated goals <strong className="text-slate-800">collectively</strong>. Available ceiling headroom is{' '}
                <strong className="text-slate-800 font-mono">{formatKobo(Math.max(0, derived.commitment_headroom))}</strong>. Three individually affordable goals can be collectively impossible.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Third row: Fixed Cost & Normalisation Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Monthly Allocation & Fixed Living Costs
              </h3>
              <p className="text-xs text-slate-400">
                Ceiling vs. Typical normalised baseline outflows
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Fixed Cost Ceiling</div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatKobo(derived.cost_ceiling)}<span className="text-xs text-slate-400 font-normal">/mo</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Typical Fixed Living Outflow:</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
              {formatKobo(derived.cost_typical)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Normalised from active recurring items</p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Rigidity Ratio:</span>
            <div className={`text-lg font-bold mt-0.5 ${derived.guard_rails.fixed_costs_exceed_80_percent ? 'text-rose-600' : 'text-slate-900'}`}>
              {derived.guard_rails.fixed_costs_ratio_percent}%
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Limit is 80% of net realised income</p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Unallocated in Savings Pool:</span>
            <div
              className={`text-lg font-bold mt-0.5 ${derived.unallocated_pool < 0 ? 'text-rose-600' : 'text-blue-600'}`}
            >
              {formatKobo(derived.unallocated_pool)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Liquid buffer without specific goal claim</p>
          </div>
        </div>
      </div>
    </div>
  );
};
