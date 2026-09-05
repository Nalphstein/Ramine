import { useState, type FormEvent } from 'react';
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  Shield,
  Target,
  Calendar,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { Goal, Commitment, SavingsPool, DerivedValues, GoalType, CommitmentKind } from '../types';
import { formatKobo, nairaToKobo, koboToNaira, getMonthsRemaining } from '../utils/calculations';

interface CommitmentsAndGoalsViewProps {
  goals: Goal[];
  commitments: Commitment[];
  savingsPool: SavingsPool;
  derived: DerivedValues;
  onAddGoal: (goal: {
    label: string;
    type: GoalType;
    target_amount: number;
    target_date?: string;
    allocated_amount: number;
  }) => Promise<void>;
  onUpdateGoalAllocation: (goalId: string, allocatedAmount: number) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onAddCommitment: (comm: {
    label: string;
    amount: number;
    kind: CommitmentKind;
    is_locked: boolean;
    started_on: string;
    review_on?: string;
  }) => Promise<void>;
  onEndCommitment: (id: string, endReason: string) => Promise<void>;
  onUpdateSavingsPool: (totalAmount: number) => Promise<void>;
}

export const CommitmentsAndGoalsView = ({
  goals,
  commitments,
  savingsPool,
  derived,
  onAddGoal,
  onUpdateGoalAllocation,
  onDeleteGoal,
  onAddCommitment,
  onEndCommitment,
  onUpdateSavingsPool,
}: CommitmentsAndGoalsViewProps) => {
  // Savings pool edit state
  const [isEditingPool, setIsEditingPool] = useState(false);
  const [poolAmountNaira, setPoolAmountNaira] = useState(
    koboToNaira(savingsPool.total_amount).toString()
  );

  // Add goal state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalLabel, setGoalLabel] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('dated');
  const [goalTargetNaira, setGoalTargetNaira] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalAllocatedNaira, setGoalAllocatedNaira] = useState('0');

  // Add commitment state
  const [isAddingComm, setIsAddingComm] = useState(false);
  const [commLabel, setCommLabel] = useState('');
  const [commAmountNaira, setCommAmountNaira] = useState('');
  const [commKind, setCommKind] = useState<CommitmentKind>('saving');
  const [commIsLocked, setCommIsLocked] = useState(false);
  const [commReviewDate, setCommReviewDate] = useState('');

  // End commitment modal state
  const [endingCommId, setEndingCommId] = useState<string | null>(null);
  const [endReason, setEndReason] = useState('');

  // Quick allocation editing
  const [editingAllocGoalId, setEditingAllocGoalId] = useState<string | null>(null);
  const [tempAllocNaira, setTempAllocNaira] = useState('');

  const handleSavePool = async (e: FormEvent) => {
    e.preventDefault();
    const kobo = nairaToKobo(poolAmountNaira);
    await onUpdateSavingsPool(kobo);
    setIsEditingPool(false);
  };

  const handleSaveGoal = async (e: FormEvent) => {
    e.preventDefault();
    const targetKobo = nairaToKobo(goalTargetNaira);
    const allocKobo = nairaToKobo(goalAllocatedNaira);

    await onAddGoal({
      label: goalLabel.trim() || 'Goal',
      type: goalType,
      target_amount: targetKobo,
      target_date: goalType === 'dated' ? goalDate : undefined,
      allocated_amount: allocKobo,
    });

    setGoalLabel('');
    setGoalTargetNaira('');
    setGoalDate('');
    setGoalAllocatedNaira('0');
    setIsAddingGoal(false);
  };

  const handleSaveCommitment = async (e: FormEvent) => {
    e.preventDefault();
    const amountKobo = nairaToKobo(commAmountNaira);

    await onAddCommitment({
      label: commLabel.trim() || 'Commitment',
      amount: amountKobo,
      kind: commKind,
      is_locked: commIsLocked,
      started_on: new Date().toISOString().slice(0, 10),
      review_on: commReviewDate || undefined,
    });

    setCommLabel('');
    setCommAmountNaira('');
    setCommIsLocked(false);
    setCommReviewDate('');
    setIsAddingComm(false);
  };

  const handleConfirmEndComm = async () => {
    if (!endingCommId) return;
    await onEndCommitment(endingCommId, endReason.trim() || 'Paused plan');
    setEndingCommId(null);
    setEndReason('');
  };

  const activeCommitments = commitments.filter((c) => c.active);
  const inactiveCommitments = commitments.filter((c) => !c.active);

  return (
    <div id="commitments-goals-section" className="space-y-8">
      {/* 1. CENTRAL SAVINGS POOL */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Master Savings Pool (One Pool Per User)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              Goals allocate <strong className="text-slate-700">from</strong> this single pool. We never store a separate per-goal savings balance because that double-counts real money.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Pool in Vault</span>
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {formatKobo(savingsPool.total_amount)}
              </span>
            </div>

            <button
              onClick={() => {
                setPoolAmountNaira(koboToNaira(savingsPool.total_amount).toString());
                setIsEditingPool(!isEditingPool);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              {isEditingPool ? 'Cancel' : 'Update Balance'}
            </button>
          </div>
        </div>

        {isEditingPool && (
          <form onSubmit={handleSavePool} className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-2 text-slate-400 font-medium">₦</span>
              <input
                type="number"
                step="any"
                value={poolAmountNaira}
                onChange={(e) => setPoolAmountNaira(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-blue-600 font-bold text-slate-900"
                placeholder="Total verified savings in bank"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
            >
              Save Pool Total
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Allocated to Goals:</span>
            <div className="font-bold text-slate-800 mt-0.5 text-base font-mono">
              {formatKobo(derived.total_goal_allocations)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Unallocated Vault Surplus:</span>
            <div className={`font-bold mt-0.5 text-base font-mono ${derived.unallocated_pool < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatKobo(derived.unallocated_pool)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Months of Living Cover:</span>
            <div className="font-bold text-slate-800 mt-0.5 text-base font-mono">
              {derived.months_of_cover_typical} months (typical)
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECURRING COMMITMENTS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Recurring Commitments
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 text-blue-700">
                Adjustable Outflows
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl leading-relaxed">
              Discretionary recurring transfers to savings or investments. Distinct from fixed costs because you can pause or reverse them.
            </p>
          </div>

          <button
            onClick={() => setIsAddingComm(!isAddingComm)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingComm ? 'Close Form' : 'New Commitment'}</span>
          </button>
        </div>

        {/* Add commitment form */}
        {isAddingComm && (
          <form
            onSubmit={handleSaveCommitment}
            className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 text-xs shadow-sm"
          >
            <div className="font-bold text-slate-900 text-xs">Add Recurring Commitment</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">Label</label>
                <input
                  type="text"
                  value={commLabel}
                  onChange={(e) => setCommLabel(e.target.value)}
                  placeholder="e.g. Mutual Fund Lock, High-yield Vault"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">Monthly Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-medium">₦</span>
                  <input
                    type="number"
                    step="any"
                    value={commAmountNaira}
                    onChange={(e) => setCommAmountNaira(e.target.value)}
                    placeholder="50000"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">Kind</label>
                <select
                  value={commKind}
                  onChange={(e) => setCommKind(e.target.value as CommitmentKind)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900 font-medium"
                >
                  <option value="saving">Saving</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-2 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={commIsLocked}
                  onChange={(e) => setCommIsLocked(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    Locked Commitment (Carries Early Withdrawal Penalty)
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    Locked commitments cannot be reversed without monetary penalties. Ramine warns if locked commitments exceed flexible ones.
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">
                  Scheduled Review Date (Optional)
                </label>
                <input
                  type="date"
                  value={commReviewDate}
                  onChange={(e) => setCommReviewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddingComm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              >
                Save Commitment
              </button>
            </div>
          </form>
        )}

        {/* Commitments list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeCommitments.map((comm) => (
            <div
              key={comm.id}
              id={`comm-card-${comm.id}`}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {comm.kind}
                      </span>
                      {comm.is_locked ? (
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Unlock className="w-3 h-3" /> Flexible
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{comm.label}</h3>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-slate-100 text-slate-700">
                    [{comm.origin.toUpperCase()}]
                  </span>
                </div>

                <div className="text-xl font-bold tracking-tight text-slate-900 my-2 font-mono">
                  {formatKobo(comm.amount)} <span className="text-xs font-normal text-slate-500 font-sans">/ month</span>
                </div>

                {comm.review_on && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Review scheduled: {comm.review_on}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">Started on: {comm.started_on}</span>
                <button
                  onClick={() => setEndingCommId(comm.id)}
                  className="text-slate-500 hover:text-amber-700 text-xs font-bold cursor-pointer"
                >
                  Cancel / Pause
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cancelled commitments historical memory */}
        {inactiveCommitments.length > 0 && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-700">
              Cancelled Commitments Learning Log ({inactiveCommitments.length})
            </div>
            <p className="text-[10px] text-slate-400">
              A commitment that got cancelled tells you why the plan was wrong.
            </p>
            <div className="space-y-1.5">
              {inactiveCommitments.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-slate-800 font-bold">{c.label}</strong> ({formatKobo(c.amount)}/mo)
                    <span className="text-slate-500 ml-2 italic text-[11px]">"{c.end_reason || 'No reason specified'}"</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">Ended {c.ended_on}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* End Commitment Reason Modal */}
      {endingCommId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Why was this commitment cancelled or paused?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Free text explanation. This is the single most valuable field in Ramine — it tells us why the plan was wrong so future cash flow advice stays realistic.
            </p>
            <textarea
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              placeholder="e.g. Fuel prices spiked; medical emergency drained my buffer; rent increased"
              className="w-full text-xs rounded-lg border border-slate-200 p-3 mt-3 focus:outline-blue-600 text-slate-900"
              rows={3}
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEndingCommId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleConfirmEndComm}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. GOALS ENGINE (dated, someday, buffer) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Goals & Target Allocations
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 text-blue-700">
                Aggregate Feasibility
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl leading-relaxed">
              Goals draw from your single savings pool. Dated goals calculate their monthly requirement together against ceiling headroom.
            </p>
          </div>

          <button
            onClick={() => setIsAddingGoal(!isAddingGoal)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingGoal ? 'Close Form' : 'New Goal'}</span>
          </button>
        </div>

        {/* Add goal form */}
        {isAddingGoal && (
          <form
            onSubmit={handleSaveGoal}
            className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 text-xs shadow-sm"
          >
            <div className="font-bold text-slate-900 text-xs">Create Financial Goal</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">Goal Label</label>
                <input
                  type="text"
                  value={goalLabel}
                  onChange={(e) => setGoalLabel(e.target.value)}
                  placeholder="e.g. Work Laptop, 3-Month Buffer"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">Goal Type</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as GoalType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 font-bold text-slate-900"
                >
                  <option value="dated">Dated (Deadline; counts in monthly maths)</option>
                  <option value="someday">Someday (No deadline; excluded from monthly maths)</option>
                  <option value="buffer">Buffer (Emergency fund; funded first)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">Target Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-medium">₦</span>
                  <input
                    type="number"
                    step="any"
                    value={goalTargetNaira}
                    onChange={(e) => setGoalTargetNaira(e.target.value)}
                    placeholder="750000"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 font-bold text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goalType === 'dated' && (
                <div>
                  <label className="block text-slate-700 mb-1 font-bold text-[11px]">
                    Target Deadline Date
                  </label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900"
                    required={goalType === 'dated'}
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 mb-1 font-bold text-[11px]">
                  Initial Allocated Amount From Savings Pool (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-medium">₦</span>
                  <input
                    type="number"
                    step="any"
                    value={goalAllocatedNaira}
                    onChange={(e) => setGoalAllocatedNaira(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-blue-600 text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
              >
                Save Goal
              </button>
            </div>
          </form>
        )}

        {/* Goals List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const monthsRemaining = goal.target_date ? getMonthsRemaining(goal.target_date) : 0;
            const remainingToFund = Math.max(0, goal.target_amount - goal.allocated_amount);
            const monthlyReq =
              goal.type === 'dated' && monthsRemaining > 0
                ? Math.ceil(remainingToFund / monthsRemaining)
                : 0;

            const is18MonthsPlus = monthsRemaining > 18;

            return (
              <div
                key={goal.id}
                id={`goal-card-${goal.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded ${
                        goal.type === 'buffer'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : goal.type === 'dated'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {goal.type}
                    </span>

                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="text-slate-300 hover:text-rose-600 transition cursor-pointer"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{goal.label}</h3>

                  <div className="my-2.5">
                    <div className="text-xl font-bold text-slate-900 font-mono">
                      {formatKobo(goal.target_amount)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Allocated from pool: <strong className="text-slate-800 font-bold font-mono">{formatKobo(goal.allocated_amount)}</strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 my-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${goal.type === 'buffer' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                      style={{
                        width: `${Math.min(100, Math.round((goal.allocated_amount / (goal.target_amount || 1)) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Dated specific metrics */}
                  {goal.type === 'dated' && (
                    <div className="bg-slate-50 rounded-lg p-2.5 my-2 text-xs space-y-1 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Target Date:</span>
                        <span className="font-bold text-slate-800">{goal.target_date} ({monthsRemaining} mos)</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200/60 pt-1">
                        <span className="text-slate-500 font-medium">Monthly Requirement:</span>
                        <span className="font-bold text-slate-900 font-mono">{formatKobo(monthlyReq)}/mo</span>
                      </div>
                    </div>
                  )}

                  {/* Inflation Warning for >18 months */}
                  {is18MonthsPlus && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-900 flex items-start gap-1.5 my-1">
                      <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                      <span>More than 18 months out: target amount is a guess about future prices, not a fact.</span>
                    </div>
                  )}

                  {goal.type === 'someday' && (
                    <p className="text-[10px] text-slate-400 italic">
                      Excluded from monthly maths. Allocations can be assigned when surplus permits.
                    </p>
                  )}
                </div>

                {/* Edit allocation button */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {Math.round((goal.allocated_amount / (goal.target_amount || 1)) * 100)}% funded
                  </span>

                  {editingAllocGoalId === goal.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={tempAllocNaira}
                        onChange={(e) => setTempAllocNaira(e.target.value)}
                        className="w-20 px-1.5 py-0.5 rounded border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                        placeholder="Naira"
                      />
                      <button
                        onClick={async () => {
                          await onUpdateGoalAllocation(goal.id, nairaToKobo(tempAllocNaira));
                          setEditingAllocGoalId(null);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingAllocGoalId(goal.id);
                        setTempAllocNaira(koboToNaira(goal.allocated_amount).toString());
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                    >
                      Adjust Allocation
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
