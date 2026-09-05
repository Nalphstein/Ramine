/**
 * Ramine Cash Flow & Planning Mathematical Engine
 *
 * CRITICAL RULE: All arithmetic happens in application code, never in an LLM.
 * Every monetary value is an integer in minor units (kobo). Never a float.
 * 100 kobo = 1 Naira (NGN ₦).
 */

import {
  IncomeSource,
  FixedCost,
  Goal,
  SavingsPool,
  Commitment,
  Checkin,
  LeakNote,
  DerivedValues,
  Frequency,
} from '../types';

/**
 * Normalises a natural frequency cost to a monthly integer amount in kobo.
 * Rules:
 * daily: x30
 * weekly: x4.33 -> Math.round((amount * 433) / 100)
 * monthly: x1
 * yearly: /12 -> Math.round(amount / 12)
 */
export function normaliseToMonthly(amountKobo: number, frequency: Frequency): number {
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) return 0;

  switch (frequency) {
    case 'daily':
      return Math.round(amountKobo * 30);
    case 'weekly':
      return Math.round((amountKobo * 433) / 100);
    case 'monthly':
      return Math.round(amountKobo);
    case 'yearly':
      return Math.round(amountKobo / 12);
    default:
      return Math.round(amountKobo);
  }
}

/**
 * Formats integer kobo into a display string (e.g. ₦450,000 or -₦12,500).
 */
export function formatKobo(kobo: number, showDecimalsIfZero = false): string {
  if (!Number.isFinite(kobo)) return '₦0';
  const isNegative = kobo < 0;
  const absKobo = Math.abs(kobo);
  const naira = Math.floor(absKobo / 100);
  const remainderKobo = absKobo % 100;

  const formattedNaira = naira.toLocaleString('en-NG');

  let result = '';
  if (remainderKobo > 0 || showDecimalsIfZero) {
    result = `₦${formattedNaira}.${remainderKobo.toString().padStart(2, '0')}`;
  } else {
    result = `₦${formattedNaira}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Converts user-typed Naira input (e.g., 5000 or "5000.50") to integer kobo.
 */
export function nairaToKobo(naira: number | string): number {
  if (typeof naira === 'string') {
    const cleaned = naira.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(naira)) return 0;
  return Math.round(naira * 100);
}

/**
 * Converts integer kobo to Naira number for inputs.
 */
export function koboToNaira(kobo: number): number {
  return (kobo || 0) / 100;
}

/**
 * Calculates months remaining between today and a target date.
 */
export function getMonthsRemaining(targetDateStr: string): number {
  try {
    const target = new Date(targetDateStr);
    const today = new Date();
    const diffMonths =
      (target.getFullYear() - today.getFullYear()) * 12 +
      (target.getMonth() - today.getMonth());
    return Math.max(1, diffMonths);
  } catch {
    return 1;
  }
}

/**
 * Core mathematical derivation function.
 * Implements all business and financial logic strictly in code.
 */
export function computeDerivedValues(
  incomeSources: IncomeSource[],
  fixedCosts: FixedCost[],
  goals: Goal[],
  savingsPool: SavingsPool,
  commitments: Commitment[],
  checkins: Checkin[],
  leakNotes: LeakNote[]
): DerivedValues {
  const activeIncomes = incomeSources.filter((i) => i.active);
  const activeCosts = fixedCosts.filter((c) => c.active);
  const activeCommitments = commitments.filter((c) => c.active);

  // 1. Fixed Cost totals (both ceiling and typical, strictly normalised)
  let cost_ceiling = 0;
  let cost_typical = 0;

  for (const cost of activeCosts) {
    const ceilingMonthly = normaliseToMonthly(cost.amount_ceiling, cost.frequency);
    const typicalNatural =
      cost.amount_typical !== undefined && cost.amount_typical > 0
        ? cost.amount_typical
        : cost.amount_ceiling;
    const typicalMonthly = normaliseToMonthly(typicalNatural, cost.frequency);

    cost_ceiling += ceilingMonthly;
    cost_typical += typicalMonthly;
  }

  // 2. Realised Income (average across full months only from checkins)
  const fullMonthCheckins = checkins.filter((c) => c.is_full_month && c.actual_amount > 0);
  let realised_income = 0;
  let has_full_month_history = false;

  if (fullMonthCheckins.length > 0) {
    const totalActual = fullMonthCheckins.reduce((sum, c) => sum + c.actual_amount, 0);
    realised_income = Math.round(totalActual / fullMonthCheckins.length);
    has_full_month_history = true;
  } else {
    // Baseline fallback: sum of expected amounts from active income sources
    realised_income = activeIncomes.reduce((sum, i) => sum + i.expected_amount, 0);
  }

  const no_income = realised_income <= 0 && activeIncomes.length === 0;

  // 3. Surplus (Ceiling vs Typical)
  // Ceiling judged for safe commitments; typical for measuring what really happened
  const surplus_ceiling = no_income ? 0 : realised_income - cost_ceiling;
  const surplus_typical = no_income ? 0 : realised_income - cost_typical;

  // 4. Commitments Breakdown
  let active_commitments_total = 0;
  let locked_commitments_total = 0;
  let flexible_commitments_total = 0;

  for (const comm of activeCommitments) {
    active_commitments_total += comm.amount;
    if (comm.is_locked) {
      locked_commitments_total += comm.amount;
    } else {
      flexible_commitments_total += comm.amount;
    }
  }

  const commitment_headroom = surplus_ceiling - active_commitments_total;
  const required_cut_if_tight =
    commitment_headroom < 0 ? Math.abs(commitment_headroom) : 0;

  // 5. Savings Pool & Goal Allocations
  const savings_pool_total = savingsPool?.total_amount || 0;
  const total_goal_allocations = goals.reduce((sum, g) => sum + (g.allocated_amount || 0), 0);
  const unallocated_pool = savings_pool_total - total_goal_allocations;

  // Months of Cover = savings_pool / normalised_monthly_cost
  const months_of_cover_typical =
    cost_typical > 0 ? Number((savings_pool_total / cost_typical).toFixed(1)) : 0;
  const months_of_cover_ceiling =
    cost_ceiling > 0 ? Number((savings_pool_total / cost_ceiling).toFixed(1)) : 0;

  // 6. Aggregate Feasibility of dated goals
  // Judge dated goals TOGETHER, never in isolation
  let aggregate_dated_monthly_req = 0;
  const datedGoals = goals.filter((g) => g.type === 'dated' && g.status === 'active');
  const dated_goals_over_18_months: {
    id: string;
    label: string;
    target_date: string;
    months_away: number;
  }[] = [];

  for (const goal of datedGoals) {
    const unallocated = Math.max(0, goal.target_amount - goal.allocated_amount);
    if (goal.target_date) {
      const months = getMonthsRemaining(goal.target_date);
      if (months > 18) {
        dated_goals_over_18_months.push({
          id: goal.id,
          label: goal.label,
          target_date: goal.target_date,
          months_away: months,
        });
      }
      const monthlyReq = Math.ceil(unallocated / months);
      aggregate_dated_monthly_req += monthlyReq;
    }
  }

  const is_aggregate_goals_feasible =
    !no_income && aggregate_dated_monthly_req <= Math.max(0, commitment_headroom);

  // 7. Guard rails
  const fixed_costs_ratio_percent =
    realised_income > 0 ? Math.round((cost_ceiling / realised_income) * 100) : 0;
  const fixed_costs_exceed_80_percent =
    realised_income > 0 && cost_ceiling > (realised_income * 8) / 10;
  const goal_allocations_exceed_pool = total_goal_allocations > savings_pool_total;
  const pool_deficit = goal_allocations_exceed_pool
    ? total_goal_allocations - savings_pool_total
    : 0;
  const locked_exceeds_flexible =
    locked_commitments_total > flexible_commitments_total && locked_commitments_total > 0;

  // 8. Latest checkin leak analysis
  let latest_checkin: DerivedValues['latest_checkin'] = undefined;
  if (checkins.length > 0) {
    const sorted = [...checkins].sort((a, b) => b.received_on.localeCompare(a.received_on));
    const recent = sorted[0];

    // misc_leak = actual_amount - cost_typical - actual_saving
    const misc_leak = recent.actual_amount - cost_typical - recent.actual_saving;

    const monthNotes = leakNotes.filter((n) => n.period_month === recent.period_month);
    const named_leak_total = monthNotes.reduce((sum, n) => sum + n.amount, 0);
    const unaccounted_leak = Math.max(0, misc_leak - named_leak_total);

    latest_checkin = {
      period_month: recent.period_month,
      actual_amount: recent.actual_amount,
      cost_typical,
      actual_saving: recent.actual_saving,
      misc_leak,
      named_leak_total,
      unaccounted_leak,
    };
  }

  return {
    cost_ceiling,
    cost_typical,
    realised_income,
    has_full_month_history,
    full_months_count: fullMonthCheckins.length,
    surplus_ceiling,
    surplus_typical,
    active_commitments_total,
    locked_commitments_total,
    flexible_commitments_total,
    commitment_headroom,
    required_cut_if_tight,
    savings_pool_total,
    total_goal_allocations,
    unallocated_pool,
    months_of_cover_typical,
    months_of_cover_ceiling,
    aggregate_dated_monthly_req,
    is_aggregate_goals_feasible,
    guard_rails: {
      no_income,
      fixed_costs_exceed_80_percent,
      fixed_costs_ratio_percent,
      goal_allocations_exceed_pool,
      pool_deficit,
      dated_goals_over_18_months,
      locked_exceeds_flexible,
    },
    latest_checkin,
  };
}
