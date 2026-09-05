/**
 * Types for Ramine v1 — Steady Salary Cash Flow Planner
 * All monetary amounts are integers in minor units (kobo: 1 NGN = 100 kobo).
 */

export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type GoalType = 'dated' | 'someday' | 'buffer';

export type CommitmentKind = 'saving' | 'investment';

export type MemoryOrigin = 'told' | 'inferred';

export interface User {
  id: string;
  email: string;
  currency: Currency;
  created_at: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  label: string;
  expected_amount: number; // in kobo
  pay_day_of_month: number; // 1 - 31
  active: boolean;
  origin: MemoryOrigin;
}

export interface CostPromo {
  id: string;
  fixed_cost_id: string;
  promo_amount: number; // in kobo
  promo_ends_on: string; // YYYY-MM-DD
  regular_amount: number; // in kobo
}

export interface FixedCost {
  id: string;
  user_id: string;
  label: string;
  category: string;
  amount_ceiling: number; // in kobo at natural frequency
  amount_typical: number; // in kobo at natural frequency (falls back to ceiling)
  frequency: Frequency;
  is_variable: boolean;
  notes?: string;
  active: boolean;
  origin: MemoryOrigin;
  promo?: CostPromo;
}

export interface Goal {
  id: string;
  user_id: string;
  label: string;
  type: GoalType;
  target_amount: number; // in kobo
  target_date?: string; // YYYY-MM-DD (required for 'dated')
  allocated_amount: number; // in kobo (drawn from savings_pool)
  status: 'active' | 'achieved' | 'paused';
  origin: MemoryOrigin;
}

export interface SavingsPool {
  id: string;
  user_id: string;
  total_amount: number; // in kobo
  updated_at: string;
  origin: MemoryOrigin;
}

export interface Commitment {
  id: string;
  user_id: string;
  label: string;
  amount: number; // in kobo (monthly recurring)
  kind: CommitmentKind;
  is_locked: boolean; // carries withdrawal penalty
  started_on: string; // YYYY-MM-DD
  review_on?: string; // YYYY-MM-DD
  ended_on?: string; // YYYY-MM-DD
  end_reason?: string; // free text explaining why plan was wrong
  active: boolean;
  origin: MemoryOrigin;
}

export interface Checkin {
  id: string;
  user_id: string;
  income_source_id: string;
  period_month: string; // YYYY-MM
  expected_amount: number; // in kobo
  actual_amount: number; // in kobo
  received_on: string; // YYYY-MM-DD
  is_full_month: boolean; // if false, excluded from baseline average
  planned_saving: number; // in kobo
  actual_saving: number; // in kobo
  note?: string;
  origin: MemoryOrigin;
}

export interface LeakNote {
  id: string;
  user_id: string;
  period_month: string; // YYYY-MM
  amount: number; // in kobo
  label: string; // single word description e.g. "generator", "wedding", "fuel"
  origin: MemoryOrigin;
}

export interface MemoryFact {
  id: string;
  entity_type: 'income' | 'fixed_cost' | 'goal' | 'commitment' | 'savings_pool' | 'checkin' | 'leak_note';
  entity_id: string;
  label: string;
  summary: string;
  origin: MemoryOrigin;
  explanation: string;
  created_at: string;
  amount?: number;
  details?: string;
  why_we_think_that?: string;
}

export interface DerivedValues {
  // Monthly normalised fixed cost totals
  cost_ceiling: number; // in kobo
  cost_typical: number; // in kobo

  // Baseline realised income (avg of full months, or active expected)
  realised_income: number; // in kobo
  has_full_month_history: boolean;
  full_months_count: number;

  // Monthly surplus figures
  surplus_ceiling: number; // in kobo (realised_income - cost_ceiling)
  surplus_typical: number; // in kobo (realised_income - cost_typical)

  // Commitments analysis
  active_commitments_total: number; // in kobo
  locked_commitments_total: number; // in kobo
  flexible_commitments_total: number; // in kobo
  commitment_headroom: number; // in kobo (surplus_ceiling - sum(active commitments))
  required_cut_if_tight: number; // in kobo if commitments > surplus_ceiling

  // Savings pool & emergency cover
  savings_pool_total: number; // in kobo
  total_goal_allocations: number; // in kobo
  unallocated_pool: number; // in kobo
  months_of_cover_typical: number; // floating number of months
  months_of_cover_ceiling: number;

  // Goals aggregate feasibility
  aggregate_dated_monthly_req: number; // in kobo
  is_aggregate_goals_feasible: boolean;

  // Guard rails
  guard_rails: {
    no_income: boolean;
    fixed_costs_exceed_80_percent: boolean;
    fixed_costs_ratio_percent: number;
    goal_allocations_exceed_pool: boolean;
    pool_deficit: number; // in kobo
    dated_goals_over_18_months: {
      id: string;
      label: string;
      target_date: string;
      months_away: number;
    }[];
    locked_exceeds_flexible: boolean;
  };

  // Recent month leak analysis (from latest full check-in)
  latest_checkin?: {
    period_month: string;
    actual_amount: number;
    cost_typical: number;
    actual_saving: number;
    misc_leak: number; // in kobo: actual_amount - cost_typical - actual_saving
    named_leak_total: number;
    unaccounted_leak: number;
  };
}

export interface AppState {
  user: User;
  income_sources: IncomeSource[];
  fixed_costs: FixedCost[];
  goals: Goal[];
  savings_pool: SavingsPool;
  commitments: Commitment[];
  checkins: Checkin[];
  leak_notes: LeakNote[];
  memory_facts: MemoryFact[];
  derived: DerivedValues;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  is_escalation?: boolean;
}
