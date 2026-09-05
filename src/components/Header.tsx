import { Shield, Sparkles, Brain, RotateCcw } from 'lucide-react';
import { DerivedValues, User } from '../types';

interface HeaderProps {
  user: User;
  derived: DerivedValues;
  onOpenCheckin: () => void;
  onOpenMemory: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export const Header = ({
  user,
  derived,
  onOpenCheckin,
  onOpenMemory,
  onResetDemo,
  isResetting,
}: HeaderProps) => {
  const monthsCover = derived.months_of_cover_typical;
  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'SA';

  return (
    <header
      id="app-header"
      className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-30 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-xs shrink-0">
            <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                RAMINE <span className="text-blue-600 font-light">v1</span>
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-semibold border border-slate-200">
                NGN (₦)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Steady Salary Cash Flow & Planning • Kobo Precision
            </p>
          </div>
        </div>

        {/* Quick status, period & action controls */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          {/* Current Period indicator */}
          <div className="hidden lg:block text-right pr-2 border-r border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
              Cycle Status
            </p>
            <p className="text-xs font-bold text-slate-800">
              {derived.has_full_month_history
                ? `${derived.full_months_count} Mo. Verified`
                : 'Baseline Model'}
            </p>
          </div>

          {/* Emergency cover badge */}
          <div
            id="cover-badge"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600"
            title="Savings pool divided by monthly typical fixed cost"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-medium text-slate-500">Buffer Cover:</span>
            <span className="font-bold text-slate-900">
              {monthsCover > 0 ? `${monthsCover} mos` : '0 mos'}
            </span>
          </div>

          {/* Memory Inspector trigger */}
          <button
            id="btn-open-memory"
            onClick={onOpenMemory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs font-medium text-xs transition cursor-pointer"
            title="Inspect stored facts tagged told or inferred"
          >
            <Brain className="w-3.5 h-3.5 text-amber-500" />
            <span>Memory & Origin</span>
          </button>

          {/* Reset demo data */}
          <button
            id="btn-reset-demo"
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 shadow-2xs transition cursor-pointer text-xs"
            title="Reset to realistic Nigerian professional salary demo data"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Reset</span>
          </button>

          {/* Check-in prompt trigger */}
          <button
            id="btn-trigger-checkin"
            onClick={onOpenCheckin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Check-in</span>
          </button>

          {/* User profile avatar badge */}
          <div
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs shadow-2xs ml-1"
            title={user?.email || 'User'}
          >
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
};
