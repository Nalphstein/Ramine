import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Wallet,
  Receipt,
  Target,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  AppState,
  DerivedValues,
  MemoryFact,
  IncomeSource,
  FixedCost,
  Goal,
  Commitment,
  Checkin,
  LeakNote,
} from './types';
import { Header } from './components/Header';
import { GuardRailsBanner } from './components/GuardRailsBanner';
import { CashFlowDashboard } from './components/CashFlowDashboard';
import { CheckinModal } from './components/CheckinModal';
import { CheckinsList } from './components/CheckinsList';
import { IncomeSourcesView } from './components/IncomeSourcesView';
import { FixedCostsView } from './components/FixedCostsView';
import { CommitmentsAndGoalsView } from './components/CommitmentsAndGoalsView';
import { ConversationLayer } from './components/ConversationLayer';
import { MemoryInspector } from './components/MemoryInspector';

type ActiveTab = 'overview' | 'checkins' | 'income' | 'costs' | 'goals' | 'chat';

export default function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Fetch full state from backend
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AppState = await res.json();
      setAppState(data);
      setErrorNotice(null);
    } catch (err: any) {
      console.error('Failed to fetch state:', err);
      setErrorNotice('Could not connect to Ramine server. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Handler: Reset demo data
  const handleResetDemo = async () => {
    if (!confirm('Reset all cash flow data back to standard demo state?')) return;
    try {
      setIsResetting(true);
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      await fetchState();
    } catch (err: any) {
      alert('Failed to reset demo: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Handler: Checkin
  const handleSubmitCheckin = async (checkinData: {
    income_source_id: string;
    period_month: string;
    expected_amount: number;
    actual_amount: number;
    received_on: string;
    is_full_month: boolean;
    planned_saving: number;
    actual_saving: number;
    note?: string;
  }) => {
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkinData),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to record check-in');
    }
    await fetchState();
  };

  const handleDeleteCheckin = async (id: string) => {
    if (!confirm('Delete this check-in entry?')) return;
    await fetch(`/api/checkins/${id}`, { method: 'DELETE' });
    await fetchState();
  };

  // Handler: Leak note
  const handleAddLeakNote = async (note: { period_month: string; amount: number; label: string }) => {
    const res = await fetch('/api/leak-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to save leak note');
    await fetchState();
  };

  const handleDeleteLeakNote = async (id: string) => {
    await fetch(`/api/leak-notes/${id}`, { method: 'DELETE' });
    await fetchState();
  };

  // Handler: Income Sources
  const handleAddIncome = async (income: {
    label: string;
    expected_amount: number;
    pay_day_of_month: number;
  }) => {
    const res = await fetch('/api/income-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(income),
    });
    if (!res.ok) throw new Error('Failed to save income source');
    await fetchState();
  };

  const handleToggleIncomeActive = async (id: string, active: boolean) => {
    await fetch(`/api/income-sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    await fetchState();
  };

  const handleDeleteIncome = async (id: string) => {
    if (!confirm('Delete this salary stream?')) return;
    await fetch(`/api/income-sources/${id}`, { method: 'DELETE' });
    await fetchState();
  };

  // Handler: Fixed Costs
  const handleAddCost = async (cost: any) => {
    const res = await fetch('/api/fixed-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cost),
    });
    if (!res.ok) throw new Error('Failed to save cost');
    await fetchState();
  };

  const handleToggleCostActive = async (id: string, active: boolean) => {
    await fetch(`/api/fixed-costs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    await fetchState();
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm('Delete this fixed cost?')) return;
    await fetch(`/api/fixed-costs/${id}`, { method: 'DELETE' });
    await fetchState();
  };

  // Handler: Goals
  const handleAddGoal = async (goal: any) => {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Failed to save goal');
    await fetchState();
  };

  const handleUpdateGoalAllocation = async (goalId: string, allocatedAmount: number) => {
    await fetch(`/api/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allocated_amount: allocatedAmount }),
    });
    await fetchState();
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    await fetchState();
  };

  // Handler: Commitments
  const handleAddCommitment = async (comm: any) => {
    const res = await fetch('/api/commitments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comm),
    });
    if (!res.ok) throw new Error('Failed to save commitment');
    await fetchState();
  };

  const handleEndCommitment = async (id: string, endReason: string) => {
    await fetch(`/api/commitments/${id}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_reason: endReason }),
    });
    await fetchState();
  };

  // Handler: Savings Pool
  const handleUpdateSavingsPool = async (totalAmount: number) => {
    await fetch('/api/savings-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_amount: totalAmount }),
    });
    await fetchState();
  };

  // Handler: Chat
  const handleSendMessage = async (text: string) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    // If the message resulted in an action or deletion (e.g. "Forget that"), re-sync state
    await fetchState();
    return data;
  };

  // Handler: Forget Fact
  const handleForgetFact = async (entityType: string, id: string) => {
    if (entityType === 'income_source' || entityType === 'income') {
      await handleDeleteIncome(id);
    } else if (entityType === 'fixed_cost') {
      await handleDeleteCost(id);
    } else if (entityType === 'goal') {
      await handleDeleteGoal(id);
    } else if (entityType === 'commitment') {
      await fetch(`/api/commitments/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ end_reason: 'Forgotten via memory inspector command' }),
      });
      await fetchState();
    }
  };

  // Compile Memory Facts from current state
  const memoryFacts: MemoryFact[] = [];
  if (appState) {
    appState.income_sources.forEach((i) => {
      memoryFacts.push({
        id: i.id,
        entity_id: i.id,
        entity_type: 'income',
        label: i.label,
        origin: i.origin,
        summary: `${i.label} (${i.expected_amount / 100} NGN)`,
        explanation:
          i.origin === 'told'
            ? 'You entered this steady income source directly.'
            : 'Inferred from recorded salary transaction.',
        created_at: new Date().toISOString(),
        amount: i.expected_amount,
        details: `Payday: ${i.pay_day_of_month}th of month, active: ${i.active ? 'yes' : 'no'}`,
        why_we_think_that:
          i.origin === 'told'
            ? 'You entered this steady income source directly.'
            : 'Inferred from recorded salary transaction.',
      });
    });

    appState.fixed_costs.forEach((c) => {
      memoryFacts.push({
        id: c.id,
        entity_id: c.id,
        entity_type: 'fixed_cost',
        label: c.label,
        origin: c.origin,
        summary: `${c.label} (${c.amount_ceiling / 100} NGN ceiling)`,
        explanation:
          c.origin === 'told'
            ? 'Explicitly reported during budget setup.'
            : 'Calculated from recurring outflow pattern.',
        created_at: new Date().toISOString(),
        amount: c.amount_ceiling,
        details: `${c.frequency} (typical: ${c.amount_typical ? c.amount_typical / 100 : c.amount_ceiling / 100} NGN)`,
        why_we_think_that:
          c.origin === 'told'
            ? 'Explicitly reported during budget setup.'
            : 'Calculated from recurring outflow pattern.',
      });
    });

    appState.commitments.forEach((cm) => {
      memoryFacts.push({
        id: cm.id,
        entity_id: cm.id,
        entity_type: 'commitment',
        label: cm.label,
        origin: cm.origin,
        summary: `${cm.label} (${cm.amount / 100} NGN/mo)`,
        explanation:
          cm.origin === 'told'
            ? 'Stated recurring commitment towards future savings/investments.'
            : 'Inferred commitment from check-in patterns.',
        created_at: new Date().toISOString(),
        amount: cm.amount,
        details: `${cm.kind}, locked: ${cm.is_locked ? 'yes (early penalty)' : 'no (flexible)'}, active: ${cm.active ? 'yes' : 'ended'}`,
        why_we_think_that:
          cm.origin === 'told'
            ? 'Stated recurring commitment towards future savings/investments.'
            : 'Inferred commitment from check-in patterns.',
      });
    });

    appState.goals.forEach((g) => {
      memoryFacts.push({
        id: g.id,
        entity_id: g.id,
        entity_type: 'goal',
        label: g.label,
        origin: g.origin,
        summary: `${g.label} (${g.target_amount / 100} NGN)`,
        explanation:
          g.type === 'buffer'
            ? 'Derived as target 3 months of normalised fixed costs.'
            : 'User stated financial objective.',
        created_at: new Date().toISOString(),
        amount: g.target_amount,
        details: `Type: ${g.type}, target date: ${g.target_date || 'None'}, allocated: ${g.allocated_amount / 100} NGN`,
        why_we_think_that:
          g.type === 'buffer'
            ? 'Derived as target 3 months of normalised fixed costs.'
            : 'User stated financial objective.',
      });
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <div className="text-sm font-bold text-slate-900 tracking-tight">Booting Ramine v1...</div>
        <div className="text-xs text-slate-500 mt-1">Initializing integer financial engine</div>
      </div>
    );
  }

  if (!appState) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-8 h-8 text-rose-600 mb-3" />
        <div className="text-sm font-bold text-slate-900">Connection Error</div>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          {errorNotice || 'Unable to retrieve cash flow records.'}
        </p>
        <button
          onClick={fetchState}
          className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { user, derived, income_sources, fixed_costs, goals, commitments, checkins, leak_notes, savings_pool } = appState;

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'checkins', label: 'Monthly Check-ins', icon: CalendarCheck, badge: checkins.length },
    { id: 'income', label: 'Salary Streams', icon: Wallet, badge: income_sources.filter((i) => i.active).length },
    { id: 'costs', label: 'Fixed Costs', icon: Receipt, badge: fixed_costs.filter((c) => c.active).length },
    { id: 'goals', label: 'Goal Tracker', icon: Target, badge: goals.length },
    { id: 'chat', label: 'Ramine Assistant', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Top App Header */}
      <Header
        user={user}
        derived={derived}
        onOpenCheckin={() => setIsCheckinOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Guard Rails Banner */}
        <GuardRailsBanner
          derived={derived}
          onNavigateToIncome={() => setActiveTab('income')}
        />

        {/* Primary Tab Navigation */}
        <nav
          id="main-navigation"
          aria-label="Main tabs"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none"
        >
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 text-blue-600 font-bold border border-slate-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <IconComp className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Views */}
        <section id="tab-content-container" className="pt-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <CashFlowDashboard
                derived={derived}
                goals={goals}
                onOpenCheckin={() => setIsCheckinOpen(true)}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <CheckinsList
                  checkins={checkins.slice(0, 3)}
                  leakNotes={leak_notes}
                  derived={derived}
                  onDeleteCheckin={handleDeleteCheckin}
                  onAddLeakNote={handleAddLeakNote}
                  onDeleteLeakNote={handleDeleteLeakNote}
                  onTriggerCheckin={() => setIsCheckinOpen(true)}
                />
                <ConversationLayer
                  derived={derived}
                  onSendMessage={handleSendMessage}
                  onOpenMemory={() => setIsMemoryOpen(true)}
                />
              </div>
            </div>
          )}

          {activeTab === 'checkins' && (
            <CheckinsList
              checkins={checkins}
              leakNotes={leak_notes}
              derived={derived}
              onDeleteCheckin={handleDeleteCheckin}
              onAddLeakNote={handleAddLeakNote}
              onDeleteLeakNote={handleDeleteLeakNote}
              onTriggerCheckin={() => setIsCheckinOpen(true)}
            />
          )}

          {activeTab === 'income' && (
            <IncomeSourcesView
              incomeSources={income_sources}
              onAddIncome={handleAddIncome}
              onToggleActive={handleToggleIncomeActive}
              onDeleteIncome={handleDeleteIncome}
            />
          )}

          {activeTab === 'costs' && (
            <FixedCostsView
              fixedCosts={fixed_costs}
              onAddCost={handleAddCost}
              onToggleActive={handleToggleCostActive}
              onDeleteCost={handleDeleteCost}
            />
          )}

          {activeTab === 'goals' && (
            <CommitmentsAndGoalsView
              goals={goals}
              commitments={commitments}
              savingsPool={savings_pool}
              derived={derived}
              onAddGoal={handleAddGoal}
              onUpdateGoalAllocation={handleUpdateGoalAllocation}
              onDeleteGoal={handleDeleteGoal}
              onAddCommitment={handleAddCommitment}
              onEndCommitment={handleEndCommitment}
              onUpdateSavingsPool={handleUpdateSavingsPool}
            />
          )}

          {activeTab === 'chat' && (
            <div className="max-w-3xl mx-auto">
              <ConversationLayer
                derived={derived}
                onSendMessage={handleSendMessage}
                onOpenMemory={() => setIsMemoryOpen(true)}
              />
            </div>
          )}
        </section>
      </main>

      {/* Footer with Legal & Non-Negotiable Hard Constraints */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-800">RAMINE v1</span> • Steady Salary Cash Flow & Planning
          </div>
          <div className="text-[11px] text-slate-400 max-w-xl">
            Hard constraints strictly enforced: Never touches or moves money. No investment advice. Zero storage of BVN, NIN, or bank credentials. All arithmetic computed in deterministic code.
          </div>
        </div>
      </footer>

      {/* Check-in Modal */}
      <CheckinModal
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        incomeSources={income_sources.filter((i) => i.active)}
        commitments={commitments}
        onSubmitCheckin={handleSubmitCheckin}
      />

      {/* Memory Inspector Drawer/Modal */}
      <MemoryInspector
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        facts={memoryFacts}
        onForgetFact={handleForgetFact}
      />
    </div>
  );
}
