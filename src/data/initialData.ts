import {
  User,
  IncomeSource,
  FixedCost,
  Goal,
  SavingsPool,
  Commitment,
  Checkin,
  LeakNote,
  MemoryFact,
} from '../types';

export const initialUser: User = {
  id: 'usr_default',
  email: 'samuel.adeyemi@example.com',
  currency: 'NGN',
  created_at: '2026-06-01T08:00:00Z',
};

// ₦450,000/month steady salary, split into base salary (₦380,000 on 25th) and monthly transport allowance (₦70,000 on 28th)
export const initialIncomeSources: IncomeSource[] = [
  {
    id: 'inc_1',
    user_id: 'usr_default',
    label: 'Primary Tech Salary',
    expected_amount: 38000000, // ₦380,000.00
    pay_day_of_month: 25,
    active: true,
    origin: 'told',
  },
  {
    id: 'inc_2',
    user_id: 'usr_default',
    label: 'Monthly Transport & Remote Stipend',
    expected_amount: 7000000, // ₦70,000.00
    pay_day_of_month: 28,
    active: true,
    origin: 'told',
  },
];

// Fixed costs in their natural frequency with ceiling and typical ranges
export const initialFixedCosts: FixedCost[] = [
  {
    id: 'fc_1',
    user_id: 'usr_default',
    label: 'Apartment Rent & Estate Service Charge',
    category: 'Housing',
    amount_ceiling: 150000000, // ₦1,500,000 yearly
    amount_typical: 150000000,
    frequency: 'yearly', // normalises to ₦125,000 / month
    is_variable: false,
    notes: 'Payable annually in November. Normalised to ₦125,000/mo.',
    active: true,
    origin: 'told',
  },
  {
    id: 'fc_2',
    user_id: 'usr_default',
    label: 'Electricity & Generator Fuel',
    category: 'Utilities',
    amount_ceiling: 5500000, // ₦55,000/month ceiling (bad grid month)
    amount_typical: 3800000, // ₦38,000/month typical (good grid month)
    frequency: 'monthly',
    is_variable: true,
    notes: 'Varies with grid supply and national tariff bands.',
    active: true,
    origin: 'told',
  },
  {
    id: 'fc_3',
    user_id: 'usr_default',
    label: 'Daily Commute / Ride-Hailing',
    category: 'Transport',
    amount_ceiling: 250000, // ₦2,500/day ceiling (peak surge)
    amount_typical: 180000, // ₦1,800/day typical
    frequency: 'daily', // normalises to ₦54,000 typical, ₦75,000 ceiling
    is_variable: true,
    notes: 'Daily office commute 3 days a week plus weekend runs.',
    active: true,
    origin: 'told',
  },
  {
    id: 'fc_4',
    user_id: 'usr_default',
    label: 'Weekly Foodstuff & Groceries',
    category: 'Food',
    amount_ceiling: 2200000, // ₦22,000/week ceiling
    amount_typical: 1700000, // ₦17,000/week typical
    frequency: 'weekly', // normalises to ~₦73,610 typical, ₦95,260 ceiling
    is_variable: true,
    notes: 'Local market shopping every Saturday.',
    active: true,
    origin: 'told',
  },
  {
    id: 'fc_5',
    user_id: 'usr_default',
    label: 'Home Fibre Internet',
    category: 'Internet',
    amount_ceiling: 2500000, // ₦25,000/month
    amount_typical: 2500000,
    frequency: 'monthly',
    is_variable: false,
    notes: 'Introductory promotional plan expires next month.',
    active: true,
    origin: 'told',
    promo: {
      id: 'promo_1',
      fixed_cost_id: 'fc_5',
      promo_amount: 1800000, // ₦18,000 intro promo
      promo_ends_on: '2026-10-31',
      regular_amount: 2500000, // ₦25,000 regular rate
    },
  },
];

// Savings pool: ₦950,000 saved total in high-yield vault
export const initialSavingsPool: SavingsPool = {
  id: 'pool_1',
  user_id: 'usr_default',
  total_amount: 95000000, // ₦950,000.00
  updated_at: '2026-08-30T10:00:00Z',
  origin: 'told',
};

// Goals: Buffer (emergency cover), Dated (laptop refresh), Someday (trip)
export const initialGoals: Goal[] = [
  {
    id: 'goal_1',
    user_id: 'usr_default',
    label: '3-Month Living Emergency Buffer',
    type: 'buffer',
    target_amount: 90000000, // ₦900,000 (derived from ~3x monthly normalised fixed costs)
    allocated_amount: 65000000, // ₦650,000 allocated from pool
    status: 'active',
    origin: 'inferred',
  },
  {
    id: 'goal_2',
    user_id: 'usr_default',
    label: 'Work Laptop Replacement',
    type: 'dated',
    target_amount: 75000000, // ₦750,000
    target_date: '2027-02-28', // ~6 months out
    allocated_amount: 20000000, // ₦200,000 allocated from pool
    status: 'active',
    origin: 'told',
  },
  {
    id: 'goal_3',
    user_id: 'usr_default',
    label: 'Family Holiday in Obudu',
    type: 'someday',
    target_amount: 50000000, // ₦500,000
    allocated_amount: 5000000, // ₦50,000
    status: 'active',
    origin: 'told',
  },
];

// Commitments (active recurring transfers): one flexible saving, one locked target savings
export const initialCommitments: Commitment[] = [
  {
    id: 'comm_1',
    user_id: 'usr_default',
    label: 'Monthly Vault Savings (Flexible)',
    amount: 5000000, // ₦50,000/mo
    kind: 'saving',
    is_locked: false,
    started_on: '2026-01-01',
    review_on: '2026-12-31',
    active: true,
    origin: 'told',
  },
  {
    id: 'comm_2',
    user_id: 'usr_default',
    label: 'Fixed Deposit Lock (Car insurance & repair reserve)',
    amount: 2500000, // ₦25,000/mo
    kind: 'saving',
    is_locked: true,
    started_on: '2026-03-01',
    review_on: '2026-09-30',
    active: true,
    origin: 'told',
  },
];

// Previous checkins: shows steady salary records
export const initialCheckins: Checkin[] = [
  {
    id: 'chk_1',
    user_id: 'usr_default',
    income_source_id: 'inc_1',
    period_month: '2026-07',
    expected_amount: 45000000,
    actual_amount: 45000000,
    received_on: '2026-07-25',
    is_full_month: true,
    planned_saving: 7500000,
    actual_saving: 7500000,
    note: 'Salary received in full on Friday afternoon. Automated transfer saved.',
    origin: 'told',
  },
  {
    id: 'chk_2',
    user_id: 'usr_default',
    income_source_id: 'inc_1',
    period_month: '2026-08',
    expected_amount: 45000000,
    actual_amount: 45000000,
    received_on: '2026-08-25',
    is_full_month: true,
    planned_saving: 7500000,
    actual_saving: 6000000,
    note: 'Saved ₦60k instead of ₦75k due to urgent medical bill.',
    origin: 'told',
  },
];

// Leak notes for August 2026: naming parts of the derived leak
export const initialLeakNotes: LeakNote[] = [
  {
    id: 'leak_1',
    user_id: 'usr_default',
    period_month: '2026-08',
    amount: 1500000, // ₦15,000
    label: 'Generator repair',
    origin: 'told',
  },
  {
    id: 'leak_2',
    user_id: 'usr_default',
    period_month: '2026-08',
    amount: 2000000, // ₦20,000
    label: 'Family contribution',
    origin: 'told',
  },
];

// Memory Facts: Explain why Ramine knows or inferred every item
export const initialMemoryFacts: MemoryFact[] = [
  {
    id: 'mem_1',
    entity_type: 'income',
    entity_id: 'inc_1',
    label: 'Tech Salary (₦380,000)',
    summary: 'Expected on the 25th of every month',
    origin: 'told',
    explanation: 'You told Ramine during onboarding that your primary employment contract pays on the 25th.',
    created_at: '2026-06-01T08:00:00Z',
  },
  {
    id: 'mem_2',
    entity_type: 'fixed_cost',
    entity_id: 'fc_1',
    label: 'Rent & Service Charge (₦1.5m / yr)',
    summary: 'Normalised to ₦125,000 monthly',
    origin: 'told',
    explanation: 'You recorded your annual apartment lease payment due in November.',
    created_at: '2026-06-01T08:15:00Z',
  },
  {
    id: 'mem_3',
    entity_type: 'goal',
    entity_id: 'goal_1',
    label: '3-Month Emergency Buffer (₦900,000)',
    summary: 'Derived as ~3 months of typical normalised living costs',
    origin: 'inferred',
    explanation: 'Ramine inferred this ₦900k target by multiplying your monthly normalised fixed costs (~₦290k) by 3 months to safeguard against job disruptions.',
    created_at: '2026-06-01T08:20:00Z',
  },
  {
    id: 'mem_4',
    entity_type: 'commitment',
    entity_id: 'comm_2',
    label: 'Fixed Deposit Lock (₦25,000)',
    summary: 'Locked commitment carrying early withdrawal penalty',
    origin: 'told',
    explanation: 'You marked this commitment as locked with your banking provider.',
    created_at: '2026-06-01T08:30:00Z',
  },
  {
    id: 'mem_5',
    entity_type: 'fixed_cost',
    entity_id: 'fc_5',
    label: 'Home Internet Promo',
    summary: 'Promo ends on 2026-10-31, reverts to ₦25,000 regular rate',
    origin: 'told',
    explanation: 'You noted that your ₦18k introductory internet pricing expires on October 31.',
    created_at: '2026-06-01T08:35:00Z',
  },
];
