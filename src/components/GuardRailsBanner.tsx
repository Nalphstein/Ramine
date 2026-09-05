import { AlertTriangle, AlertCircle, Info, Lock } from 'lucide-react';
import { DerivedValues } from '../types';
import { formatKobo } from '../utils/calculations';

interface GuardRailsBannerProps {
  derived: DerivedValues;
  onNavigateToIncome: () => void;
}

export const GuardRailsBanner = ({ derived, onNavigateToIncome }: GuardRailsBannerProps) => {
  const g = derived.guard_rails;

  // 1. Missing income guard rail (blocking notice)
  if (g.no_income) {
    return (
      <div
        id="guard-rail-no-income"
        className="mb-6 rounded-xl bg-amber-50/90 border border-amber-300 p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-950">Enter your income first</h3>
            <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
              Ramine refuses to display surplus or feasibility until you log at least one steady
              salary stream, rather than computing against zero.
            </p>
          </div>
        </div>
        <button
          id="btn-guard-add-income"
          onClick={onNavigateToIncome}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-800 hover:bg-amber-900 text-white shadow-xs transition shrink-0 cursor-pointer"
        >
          Add Income Stream
        </button>
      </div>
    );
  }

  const warnings = [];

  // 2. Fixed costs exceed 80% of income
  if (g.fixed_costs_exceed_80_percent) {
    warnings.push({
      id: 'warn-fixed-costs',
      icon: AlertTriangle,
      color: 'bg-rose-50/90 border-rose-200 text-rose-950',
      iconColor: 'text-rose-600',
      title: `High Rigidity: Fixed costs consume ${g.fixed_costs_ratio_percent}% of income`,
      desc: `Your normalised fixed cost ceiling (${formatKobo(derived.cost_ceiling)}/mo) exceeds 80% of realised income (${formatKobo(derived.realised_income)}/mo). This leaves dangerous little buffer for unexpected expenses or price shocks.`,
    });
  }

  // 3. Goal allocations exceed savings pool
  if (g.goal_allocations_exceed_pool) {
    warnings.push({
      id: 'warn-pool-deficit',
      icon: AlertCircle,
      color: 'bg-amber-50/90 border-amber-200 text-amber-950',
      iconColor: 'text-amber-600',
      title: `Goal Allocations Exceed Savings Pool by ${formatKobo(g.pool_deficit)}`,
      desc: `Total allocated to goals is ${formatKobo(derived.total_goal_allocations)}, but your total savings pool holds ${formatKobo(derived.savings_pool_total)}. Goals are double-counting savings.`,
    });
  }

  // 4. Dated goals over 18 months away (guess about future prices)
  if (g.dated_goals_over_18_months.length > 0) {
    warnings.push({
      id: 'warn-18-months',
      icon: Info,
      color: 'bg-blue-50/90 border-blue-200 text-blue-950',
      iconColor: 'text-blue-600',
      title: 'Long-horizon Price Uncertainty',
      desc: `${g.dated_goals_over_18_months.map((item) => `"${item.label}" (${item.months_away} mos out)`).join(', ')} is more than 18 months away. In Nigeria's inflation climate, this target amount is a guess about future prices, not a fact.`,
    });
  }

  // 5. Locked commitments exceed flexible commitments
  if (g.locked_exceeds_flexible) {
    warnings.push({
      id: 'warn-locked-commitments',
      icon: Lock,
      color: 'bg-indigo-50/90 border-indigo-200 text-indigo-950',
      iconColor: 'text-indigo-600',
      title: `Locked Commitments (${formatKobo(derived.locked_commitments_total)}/mo) Exceed Flexible (${formatKobo(derived.flexible_commitments_total)}/mo)`,
      desc: 'Locked commitments carry early withdrawal penalties and cannot be reversed quickly. Keep the flexible portion larger than the locked portion to maintain cash flow agility.',
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div id="guard-rails-container" className="mb-6 space-y-2.5">
      {warnings.map((w) => {
        const IconComponent = w.icon;
        return (
          <div
            key={w.id}
            id={w.id}
            className={`rounded-xl border p-4 flex items-start gap-3 shadow-xs ${w.color}`}
          >
            <IconComponent className={`w-4 h-4 mt-0.5 shrink-0 ${w.iconColor}`} />
            <div className="text-xs">
              <div className="font-bold text-slate-900 tracking-tight">{w.title}</div>
              <p className="mt-1 leading-relaxed opacity-90">{w.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
