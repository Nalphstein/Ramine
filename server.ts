import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  initialUser,
  initialIncomeSources,
  initialFixedCosts,
  initialGoals,
  initialSavingsPool,
  initialCommitments,
  initialCheckins,
  initialLeakNotes,
  initialMemoryFacts,
} from './src/data/initialData';
import { computeDerivedValues, formatKobo } from './src/utils/calculations';
import { AppState, MemoryFact } from './src/types';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ramine-db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory / persistent database structure
interface DatabaseStore {
  user: typeof initialUser;
  income_sources: typeof initialIncomeSources;
  fixed_costs: typeof initialFixedCosts;
  goals: typeof initialGoals;
  savings_pool: typeof initialSavingsPool;
  commitments: typeof initialCommitments;
  checkins: typeof initialCheckins;
  leak_notes: typeof initialLeakNotes;
  memory_facts: typeof initialMemoryFacts;
}

function loadDatabase(): DatabaseStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read db file, using seed data:', err);
  }

  const initialStore: DatabaseStore = {
    user: initialUser,
    income_sources: initialIncomeSources,
    fixed_costs: initialFixedCosts,
    goals: initialGoals,
    savings_pool: initialSavingsPool,
    commitments: initialCommitments,
    checkins: initialCheckins,
    leak_notes: initialLeakNotes,
    memory_facts: initialMemoryFacts,
  };
  saveDatabase(initialStore);
  return initialStore;
}

function saveDatabase(store: DatabaseStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save db file:', err);
  }
}

let db = loadDatabase();

// Lazy or shared Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getFullState(): AppState {
  const derived = computeDerivedValues(
    db.income_sources,
    db.fixed_costs,
    db.goals,
    db.savings_pool,
    db.commitments,
    db.checkins,
    db.leak_notes
  );

  return {
    user: db.user,
    income_sources: db.income_sources,
    fixed_costs: db.fixed_costs,
    goals: db.goals,
    savings_pool: db.savings_pool,
    commitments: db.commitments,
    checkins: db.checkins,
    leak_notes: db.leak_notes,
    memory_facts: db.memory_facts,
    derived,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Ramine v1' });
  });

  // GET State
  app.get('/api/state', (req, res) => {
    res.json(getFullState());
  });

  // Reset Demo Data
  app.post('/api/reset-demo', (req, res) => {
    db = {
      user: JSON.parse(JSON.stringify(initialUser)),
      income_sources: JSON.parse(JSON.stringify(initialIncomeSources)),
      fixed_costs: JSON.parse(JSON.stringify(initialFixedCosts)),
      goals: JSON.parse(JSON.stringify(initialGoals)),
      savings_pool: JSON.parse(JSON.stringify(initialSavingsPool)),
      commitments: JSON.parse(JSON.stringify(initialCommitments)),
      checkins: JSON.parse(JSON.stringify(initialCheckins)),
      leak_notes: JSON.parse(JSON.stringify(initialLeakNotes)),
      memory_facts: JSON.parse(JSON.stringify(initialMemoryFacts)),
    };
    saveDatabase(db);
    res.json(getFullState());
  });

  // Income Sources CRUD
  app.post('/api/income', (req, res) => {
    const { label, expected_amount, pay_day_of_month, origin = 'told' } = req.body;
    const newInc = {
      id: `inc_${Date.now()}`,
      user_id: db.user.id,
      label: label || 'Salary',
      expected_amount: Math.round(Number(expected_amount) || 0),
      pay_day_of_month: Math.min(31, Math.max(1, Number(pay_day_of_month) || 25)),
      active: true,
      origin: origin as 'told' | 'inferred',
    };
    db.income_sources.push(newInc);

    db.memory_facts.push({
      id: `mem_${Date.now()}`,
      entity_type: 'income',
      entity_id: newInc.id,
      label: newInc.label,
      summary: `${formatKobo(newInc.expected_amount)} on day ${newInc.pay_day_of_month}`,
      origin: newInc.origin,
      explanation: `You entered this income stream of ${formatKobo(newInc.expected_amount)}.`,
      created_at: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json(getFullState());
  });

  app.put('/api/income/:id', (req, res) => {
    const { id } = req.params;
    const index = db.income_sources.findIndex((i) => i.id === id);
    if (index === -1) return res.status(404).json({ error: 'Income source not found' });

    db.income_sources[index] = {
      ...db.income_sources[index],
      ...req.body,
      id,
    };
    saveDatabase(db);
    res.json(getFullState());
  });

  app.delete('/api/income/:id', (req, res) => {
    const { id } = req.params;
    db.income_sources = db.income_sources.filter((i) => i.id !== id);
    db.memory_facts = db.memory_facts.filter((m) => m.entity_id !== id);
    saveDatabase(db);
    res.json(getFullState());
  });

  // Fixed Costs CRUD
  app.post('/api/fixed-costs', (req, res) => {
    const {
      label,
      category,
      amount_ceiling,
      amount_typical,
      frequency,
      is_variable,
      notes,
      origin = 'told',
      promo,
    } = req.body;

    const ceiling = Math.round(Number(amount_ceiling) || 0);
    const typical =
      amount_typical !== undefined && Number(amount_typical) > 0
        ? Math.round(Number(amount_typical))
        : ceiling;

    const newCost = {
      id: `fc_${Date.now()}`,
      user_id: db.user.id,
      label: label || 'Fixed Cost',
      category: category || 'General',
      amount_ceiling: ceiling,
      amount_typical: typical,
      frequency: frequency || 'monthly',
      is_variable: Boolean(is_variable),
      notes: notes || '',
      active: true,
      origin: origin as 'told' | 'inferred',
      promo: promo
        ? {
            id: `promo_${Date.now()}`,
            fixed_cost_id: `fc_${Date.now()}`,
            promo_amount: Math.round(Number(promo.promo_amount) || 0),
            promo_ends_on: promo.promo_ends_on || '',
            regular_amount: ceiling,
          }
        : undefined,
    };
    db.fixed_costs.push(newCost);

    db.memory_facts.push({
      id: `mem_${Date.now()}`,
      entity_type: 'fixed_cost',
      entity_id: newCost.id,
      label: newCost.label,
      summary: `${formatKobo(newCost.amount_ceiling)} (${newCost.frequency})`,
      origin: newCost.origin,
      explanation: `You entered this fixed cost under ${newCost.category}.`,
      created_at: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json(getFullState());
  });

  app.put('/api/fixed-costs/:id', (req, res) => {
    const { id } = req.params;
    const index = db.fixed_costs.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Fixed cost not found' });

    db.fixed_costs[index] = {
      ...db.fixed_costs[index],
      ...req.body,
      id,
    };
    saveDatabase(db);
    res.json(getFullState());
  });

  app.delete('/api/fixed-costs/:id', (req, res) => {
    const { id } = req.params;
    db.fixed_costs = db.fixed_costs.filter((c) => c.id !== id);
    db.memory_facts = db.memory_facts.filter((m) => m.entity_id !== id);
    saveDatabase(db);
    res.json(getFullState());
  });

  // Goals CRUD
  app.post('/api/goals', (req, res) => {
    const { label, type, target_amount, target_date, allocated_amount, origin = 'told' } = req.body;
    const newGoal = {
      id: `goal_${Date.now()}`,
      user_id: db.user.id,
      label: label || 'Financial Goal',
      type: type || 'dated',
      target_amount: Math.round(Number(target_amount) || 0),
      target_date: target_date || undefined,
      allocated_amount: Math.round(Number(allocated_amount) || 0),
      status: 'active' as const,
      origin: origin as 'told' | 'inferred',
    };
    db.goals.push(newGoal);

    db.memory_facts.push({
      id: `mem_${Date.now()}`,
      entity_type: 'goal',
      entity_id: newGoal.id,
      label: newGoal.label,
      summary: `${newGoal.type.toUpperCase()} target ${formatKobo(newGoal.target_amount)}`,
      origin: newGoal.origin,
      explanation:
        newGoal.type === 'buffer'
          ? 'Ramine or you established this emergency buffer target based on living expenses.'
          : `You set this financial target with deadline ${newGoal.target_date || 'open'}.`,
      created_at: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json(getFullState());
  });

  app.put('/api/goals/:id', (req, res) => {
    const { id } = req.params;
    const index = db.goals.findIndex((g) => g.id === id);
    if (index === -1) return res.status(404).json({ error: 'Goal not found' });

    db.goals[index] = {
      ...db.goals[index],
      ...req.body,
      id,
    };
    saveDatabase(db);
    res.json(getFullState());
  });

  app.delete('/api/goals/:id', (req, res) => {
    const { id } = req.params;
    db.goals = db.goals.filter((g) => g.id !== id);
    db.memory_facts = db.memory_facts.filter((m) => m.entity_id !== id);
    saveDatabase(db);
    res.json(getFullState());
  });

  // Savings Pool Update
  app.post('/api/savings-pool', (req, res) => {
    const { total_amount } = req.body;
    db.savings_pool.total_amount = Math.max(0, Math.round(Number(total_amount) || 0));
    db.savings_pool.updated_at = new Date().toISOString();
    saveDatabase(db);
    res.json(getFullState());
  });

  // Commitments CRUD
  app.post('/api/commitments', (req, res) => {
    const {
      label,
      amount,
      kind,
      is_locked,
      started_on,
      review_on,
      origin = 'told',
    } = req.body;

    const newComm = {
      id: `comm_${Date.now()}`,
      user_id: db.user.id,
      label: label || 'Commitment',
      amount: Math.round(Number(amount) || 0),
      kind: kind || 'saving',
      is_locked: Boolean(is_locked),
      started_on: started_on || new Date().toISOString().slice(0, 10),
      review_on: review_on || undefined,
      active: true,
      origin: origin as 'told' | 'inferred',
    };
    db.commitments.push(newComm);

    db.memory_facts.push({
      id: `mem_${Date.now()}`,
      entity_type: 'commitment',
      entity_id: newComm.id,
      label: newComm.label,
      summary: `${formatKobo(newComm.amount)}/mo (${newComm.is_locked ? 'Locked' : 'Flexible'})`,
      origin: newComm.origin,
      explanation: `You created this ${newComm.kind} commitment.${newComm.is_locked ? ' Flagged as locked (withdrawal penalty applies).' : ''}`,
      created_at: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json(getFullState());
  });

  app.put('/api/commitments/:id', (req, res) => {
    const { id } = req.params;
    const index = db.commitments.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Commitment not found' });

    db.commitments[index] = {
      ...db.commitments[index],
      ...req.body,
      id,
    };
    saveDatabase(db);
    res.json(getFullState());
  });

  app.delete('/api/commitments/:id', (req, res) => {
    const { id } = req.params;
    db.commitments = db.commitments.filter((c) => c.id !== id);
    db.memory_facts = db.memory_facts.filter((m) => m.entity_id !== id);
    saveDatabase(db);
    res.json(getFullState());
  });

  // Checkins CRUD (The 3-question loop writes here)
  app.post('/api/checkins', (req, res) => {
    const {
      income_source_id,
      period_month,
      expected_amount,
      actual_amount,
      received_on,
      is_full_month,
      planned_saving,
      actual_saving,
      note,
      origin = 'told',
    } = req.body;

    const newChk = {
      id: `chk_${Date.now()}`,
      user_id: db.user.id,
      income_source_id: income_source_id || db.income_sources[0]?.id || 'inc_1',
      period_month: period_month || new Date().toISOString().slice(0, 7),
      expected_amount: Math.round(Number(expected_amount) || 0),
      actual_amount: Math.round(Number(actual_amount) || 0),
      received_on: received_on || new Date().toISOString().slice(0, 10),
      is_full_month: is_full_month !== undefined ? Boolean(is_full_month) : true,
      planned_saving: Math.round(Number(planned_saving) || 0),
      actual_saving: Math.round(Number(actual_saving) || 0),
      note: note || '',
      origin: origin as 'told' | 'inferred',
    };

    // If actual saving was performed, update the savings pool accordingly!
    if (newChk.actual_saving > 0) {
      db.savings_pool.total_amount += newChk.actual_saving;
      db.savings_pool.updated_at = new Date().toISOString();
    }

    db.checkins.push(newChk);

    db.memory_facts.push({
      id: `mem_${Date.now()}`,
      entity_type: 'checkin',
      entity_id: newChk.id,
      label: `Check-in for ${newChk.period_month}`,
      summary: `Received ${formatKobo(newChk.actual_amount)}, Saved ${formatKobo(newChk.actual_saving)}`,
      origin: newChk.origin,
      explanation: `You answered the monthly check-in on ${newChk.received_on}.`,
      created_at: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json(getFullState());
  });

  app.delete('/api/checkins/:id', (req, res) => {
    const { id } = req.params;
    db.checkins = db.checkins.filter((c) => c.id !== id);
    db.memory_facts = db.memory_facts.filter((m) => m.entity_id !== id);
    saveDatabase(db);
    res.json(getFullState());
  });

  // Leak Notes (Amount and single word, not an expense tracker)
  app.post('/api/leak-notes', (req, res) => {
    const { period_month, amount, label, origin = 'told' } = req.body;
    const cleanLabel = (label || 'Unplanned').trim().split(/\s+/)[0]; // single word
    const newNote = {
      id: `leak_${Date.now()}`,
      user_id: db.user.id,
      period_month: period_month || new Date().toISOString().slice(0, 7),
      amount: Math.round(Number(amount) || 0),
      label: cleanLabel,
      origin: origin as 'told' | 'inferred',
    };
    db.leak_notes.push(newNote);

    saveDatabase(db);
    res.json(getFullState());
  });

  app.delete('/api/leak-notes/:id', (req, res) => {
    const { id } = req.params;
    db.leak_notes = db.leak_notes.filter((l) => l.id !== id);
    saveDatabase(db);
    res.json(getFullState());
  });

  // Memory Rules: "Forget that" endpoint that actually deletes rows!
  app.post('/api/memory/forget', (req, res) => {
    const { fact_id, entity_id, entity_type } = req.body;

    if (fact_id) {
      const fact = db.memory_facts.find((m) => m.id === fact_id);
      if (fact) {
        db.memory_facts = db.memory_facts.filter((m) => m.id !== fact_id);
        // Cascade delete entity
        if (fact.entity_type === 'income') {
          db.income_sources = db.income_sources.filter((i) => i.id !== fact.entity_id);
        } else if (fact.entity_type === 'fixed_cost') {
          db.fixed_costs = db.fixed_costs.filter((c) => c.id !== fact.entity_id);
        } else if (fact.entity_type === 'goal') {
          db.goals = db.goals.filter((g) => g.id !== fact.entity_id);
        } else if (fact.entity_type === 'commitment') {
          db.commitments = db.commitments.filter((c) => c.id !== fact.entity_id);
        } else if (fact.entity_type === 'checkin') {
          db.checkins = db.checkins.filter((c) => c.id !== fact.entity_id);
        }
      }
    } else if (entity_id) {
      db.memory_facts = db.memory_facts.filter((m) => m.entity_id !== entity_id);
      if (entity_type === 'income') db.income_sources = db.income_sources.filter((i) => i.id !== entity_id);
      if (entity_type === 'fixed_cost') db.fixed_costs = db.fixed_costs.filter((c) => c.id !== entity_id);
      if (entity_type === 'goal') db.goals = db.goals.filter((g) => g.id !== entity_id);
      if (entity_type === 'commitment') db.commitments = db.commitments.filter((c) => c.id !== entity_id);
      if (entity_type === 'checkin') db.checkins = db.checkins.filter((c) => c.id !== entity_id);
    }

    saveDatabase(db);
    res.json(getFullState());
  });

  // Conversation Layer (AI Assistant)
  // CRITICAL: Strict adherence to prompt constraints:
  // 1. All arithmetic in application code, never in LLM! (Exact numbers pre-calculated and injected).
  // 2. Refusal examples for investment questions with clear category redirection.
  // 3. Escalation instructions for debt spiral/gambling/crisis.
  // 4. Memory rules (told vs inferred, "why do you think that?", "forget that").
  app.post('/api/chat', async (req, res) => {
    const rawPrompt = req.body.prompt || req.body.message || '';
    if (!rawPrompt || typeof rawPrompt !== 'string') {
      return res.status(400).json({ error: 'Prompt or message is required' });
    }
    const prompt = rawPrompt.trim();

    // Check if user is saying "Forget that" or "Forget [item]"
    const lower = prompt.toLowerCase().trim();
    if (lower === 'forget that' || lower.startsWith('forget ')) {
      // Find what to forget or return memory facts options
      const targetQuery = lower.replace('forget', '').trim();
      let forgottenItem = '';

      if (targetQuery) {
        const found = db.memory_facts.find(
          (m) =>
            m.label.toLowerCase().includes(targetQuery) ||
            m.summary.toLowerCase().includes(targetQuery)
        );
        if (found) {
          forgottenItem = found.label;
          db.memory_facts = db.memory_facts.filter((m) => m.id !== found.id);
          if (found.entity_type === 'income') {
            db.income_sources = db.income_sources.filter((i) => i.id !== found.entity_id);
          } else if (found.entity_type === 'fixed_cost') {
            db.fixed_costs = db.fixed_costs.filter((c) => c.id !== found.entity_id);
          } else if (found.entity_type === 'goal') {
            db.goals = db.goals.filter((g) => g.id !== found.entity_id);
          } else if (found.entity_type === 'commitment') {
            db.commitments = db.commitments.filter((c) => c.id !== found.entity_id);
          }
          saveDatabase(db);
          return res.json({
            reply: `I have forgotten "${forgottenItem}" and completely removed its record from your financial plan.`,
            state: getFullState(),
            action_taken: 'forgotten',
          });
        }
      }

      // If just "forget that", pick the most recent memory fact
      if (db.memory_facts.length > 0) {
        const last = db.memory_facts[db.memory_facts.length - 1];
        forgottenItem = last.label;
        db.memory_facts.pop();
        if (last.entity_type === 'income') {
          db.income_sources = db.income_sources.filter((i) => i.id !== last.entity_id);
        } else if (last.entity_type === 'fixed_cost') {
          db.fixed_costs = db.fixed_costs.filter((c) => c.id !== last.entity_id);
        } else if (last.entity_type === 'goal') {
          db.goals = db.goals.filter((g) => g.id !== last.entity_id);
        } else if (last.entity_type === 'commitment') {
          db.commitments = db.commitments.filter((c) => c.id !== last.entity_id);
        }
        saveDatabase(db);
        return res.json({
          reply: `I have forgotten the last recorded fact: "${forgottenItem}". It has been erased from your budget.`,
          state: getFullState(),
          action_taken: 'forgotten',
        });
      }
    }

    // Check for crisis / escalation triggers directly
    const crisisKeywords = [
      'loan shark',
      'loan sharks',
      'threatened',
      'gambling',
      'bet9ja',
      'sportybet',
      'can’t take this anymore',
      'kill myself',
      'suicide',
      'drowning in debt',
      'hopeless',
      'end it all',
    ];
    const isCrisis = crisisKeywords.some((kw) => lower.includes(kw));

    if (isCrisis) {
      const escalationReply =
        "It sounds like you are carrying immense pressure right now, and when finances become overwhelming or unsafe, budgeting tools are not the right solution. Please protect yourself first.\n\n" +
        "• If you are feeling unsafe or in distress, please talk to someone right now:\n" +
        "  - Nigeria Suicide Prevention / Mentally Aware Nigeria (MANI): 0806 010 1100 / 0809 111 6264\n" +
        "  - Lagos State Lifeline: 0800 000 0624\n" +
        "• If aggressive digital lenders or loan sharks are harassing you, report them to the FCCPC (Federal Competition and Consumer Protection Commission) at lenderstaskforce@fccpc.gov.ng and seek confidential legal aid.\n\n" +
        "Ramine will hold your numbers safely until you are ready, but your immediate well-being and safety come first.";

      return res.json({
        reply: escalationReply,
        state: getFullState(),
        is_escalation: true,
      });
    }

    const currentState = getFullState();
    const d = currentState.derived;

    // Direct check for Investment Advice queries
    const investmentKeywords = [
      'treasury bill',
      'treasury bills',
      'mutual fund',
      'mutual funds',
      'crypto',
      'bitcoin',
      'shares',
      'stocks',
      'etf',
      'where to invest',
      'where should i put',
      'which instrument',
      'should i buy',
    ];
    const asksInvestment = investmentKeywords.some((kw) => lower.includes(kw));
    if (asksInvestment && !process.env.GEMINI_API_KEY) {
      return res.json({
        reply: `I can help you decide how much you can safely set aside without strangling your cash flow or risking your monthly commitments. However, deciding which specific financial instrument to put it in—such as treasury bills, mutual funds, foreign equities, or real estate—requires a licensed investment advisor.\n\nLooking at your verified plan, your ceiling surplus is ${formatKobo(d.surplus_ceiling)}/mo and your commitment headroom is ${formatKobo(d.commitment_headroom)}/mo. Would you like to review how allocating toward your goals affects your emergency buffer?`,
        state: currentState,
      });
    }

    // Direct check for "Why do you think that?" or "Why do you think my buffer..."
    if (lower.includes('why do you think') && !process.env.GEMINI_API_KEY) {
      const bufferFact = currentState.memory_facts.find((m) => m.label.toLowerCase().includes('buffer'));
      return res.json({
        reply: `Ramine tags every financial fact as [TOLD] (provided directly by you) or [INFERRED] (derived from code).\n\n• For your emergency buffer (${bufferFact ? bufferFact.summary : formatKobo(d.cost_typical * 3)}): Tagged as [${bufferFact ? bufferFact.origin.toUpperCase() : 'INFERRED'}] — ${bufferFact ? bufferFact.explanation : 'Derived as 3 months of your normalised typical fixed living costs'}.\n\nYou can inspect all origins anytime in the Memory & Origin inspector!`,
        state: currentState,
      });
    }

    // Structured prompt with mathematical data precomputed
    const structuredContext = `
USER FINANCIAL STATE (Calculated by deterministic application code in kobo):
- Currency: NGN (₦)
- Realised Monthly Income (baseline): ${formatKobo(d.realised_income)} ${d.has_full_month_history ? '(average of full months)' : '(baseline from active income sources)'}
- Monthly Normalised Cost Ceiling: ${formatKobo(d.cost_ceiling)}
- Monthly Normalised Typical Cost: ${formatKobo(d.cost_typical)}
- Monthly Surplus (Ceiling): ${formatKobo(d.surplus_ceiling)}
- Monthly Surplus (Typical): ${formatKobo(d.surplus_typical)}
- Active Commitments Total: ${formatKobo(d.active_commitments_total)} (${formatKobo(d.locked_commitments_total)} locked, ${formatKobo(d.flexible_commitments_total)} flexible)
- Commitment Headroom: ${formatKobo(d.commitment_headroom)}
${d.commitment_headroom < 0 ? `- ALERT: Commitments exceed ceiling surplus by ${formatKobo(d.required_cut_if_tight)}! Required cut in unplanned spending is ${formatKobo(d.required_cut_if_tight)}/month.` : ''}
- Savings Pool Total: ${formatKobo(d.savings_pool_total)}
- Total Goal Allocations: ${formatKobo(d.total_goal_allocations)}
- Unallocated Pool: ${formatKobo(d.unallocated_pool)}
- Months of Emergency Cover: ${d.months_of_cover_typical} months (typical) / ${d.months_of_cover_ceiling} months (ceiling)
- Aggregate Dated Goals Monthly Requirement: ${formatKobo(d.aggregate_dated_monthly_req)}
- Goals Aggregate Feasibility: ${d.is_aggregate_goals_feasible ? 'FEASIBLE' : 'INFEASIBLE or TIGHT'}
- Guard Rails:
  * No Income: ${d.guard_rails.no_income}
  * Fixed costs ratio: ${d.guard_rails.fixed_costs_ratio_percent}% (${d.guard_rails.fixed_costs_exceed_80_percent ? 'WARNING: exceeds 80%!' : 'Normal'})
  * Goal allocations exceed pool: ${d.guard_rails.goal_allocations_exceed_pool} (deficit: ${formatKobo(d.guard_rails.pool_deficit)})
  * Locked commitments exceed flexible: ${d.guard_rails.locked_exceeds_flexible}
  * Dated goals > 18 months away (future price guesses): ${d.guard_rails.dated_goals_over_18_months.map((g) => `${g.label} (${g.months_away} mos)`).join(', ') || 'None'}

INCOME SOURCES:
${currentState.income_sources.map((i) => `- [${i.origin}] ${i.label}: ${formatKobo(i.expected_amount)} on day ${i.pay_day_of_month} (Active: ${i.active})`).join('\n')}

FIXED COSTS:
${currentState.fixed_costs.map((c) => `- [${c.origin}] ${c.label} (${c.category}): Ceiling ${formatKobo(c.amount_ceiling)}, Typical ${formatKobo(c.amount_typical)} per ${c.frequency} (Normalised to ~${formatKobo(c.amount_typical)}/mo). Promo: ${c.promo ? `intro ${formatKobo(c.promo.promo_amount)} expires ${c.promo.promo_ends_on}` : 'None'}`).join('\n')}

ACTIVE COMMITMENTS:
${currentState.commitments.map((c) => `- [${c.origin}] ${c.label}: ${formatKobo(c.amount)}/mo (${c.kind}, Locked: ${c.is_locked})`).join('\n')}

GOALS:
${currentState.goals.map((g) => `- [${g.origin}] ${g.label} (${g.type}): Target ${formatKobo(g.target_amount)}, Allocated ${formatKobo(g.allocated_amount)}, Date: ${g.target_date || 'None'}`).join('\n')}

LATEST CHECKIN:
${d.latest_checkin ? `- Month: ${d.latest_checkin.period_month}, Actual: ${formatKobo(d.latest_checkin.actual_amount)}, Actual Saved: ${formatKobo(d.latest_checkin.actual_saving)}, Derived Misc Leak: ${formatKobo(d.latest_checkin.misc_leak)} (Named: ${formatKobo(d.latest_checkin.named_leak_total)}, Unaccounted: ${formatKobo(d.latest_checkin.unaccounted_leak)})` : 'No check-in yet'}

MEMORY FACTS & TAGS:
${currentState.memory_facts.map((m) => `- [${m.origin.toUpperCase()}] ${m.label}: ${m.summary}. (Why: ${m.explanation})`).join('\n')}
`;

    const systemInstruction = `You are Ramine, an intelligent cash flow companion for steady salary earners.
Your personality is objective, calm, encouraging, and financially grounded.

STRICT CONSTRAINTS (MANDATORY):
1. ALL ARITHMETIC HAPPENS IN APPLICATION CODE, NEVER IN THE MODEL.
   - You MUST ONLY use the numbers explicitly precalculated and given to you in the context above.
   - NEVER calculate your own surplus, total, or feasibility. If you need a number, read it directly from the context.
   - If a figure is not provided or uncertain, explicitly state uncertainty rather than inventing a number.

2. NO INVESTMENT ADVICE — LITERAL REFUSALS ONLY:
   - The app must NEVER recommend a specific security, fund, crypto asset, or financial product.
   - You may help the user decide *how much* to set aside. You must NOT suggest *where to put it*.
   - When asked for investment advice, explain the category respectfully using this approach:
     * User: "Should I buy treasury bills, index funds, or Bitcoin with my ₦50,000?"
     * Ramine: "I can help you decide how much of that ₦50,000 you can safely set aside without strangling your cash flow or risking your monthly commitments. However, deciding which specific financial instrument to put it in—such as treasury bills, mutual funds, or foreign equities—requires a licensed investment advisor. Looking at your plan, you currently have ${formatKobo(d.commitment_headroom)} in headroom after your fixed commitments. Would you like to check how that impacts your emergency buffer?"

3. ESCALATION PROTOCOL:
   - If a user mentions loan sharks, gambling, severe desperation, or suicidal ideation, immediately halt financial optimization and provide compassionate escalation to human assistance and regulator contacts (FCCPC / MANI).

4. MEMORY & WHY DO YOU THINK THAT:
   - Every fact is tagged 'told' (the user provided it) or 'inferred' (the system derived it).
   - If the user asks "Why do you think that?", look at the MEMORY FACTS list and explain clearly whether they told you or Ramine inferred it.
   - If the user asks to "Forget that", inform them that you have an active delete mechanism.

Keep your answers concise, direct, and focused on cash flow reality. Use Naira (₦) formatting.`;

    try {
      const ai = getGeminiClient();
      if (!ai) {
        // Fallback response if GEMINI_API_KEY is not configured yet
        return res.json({
          reply: `Here is your current cash flow summary from the Ramine engine:\n\n• **Realised Income**: ${formatKobo(d.realised_income)} / month\n• **Fixed Costs**: ${formatKobo(d.cost_typical)} typical (${formatKobo(d.cost_ceiling)} ceiling)\n• **Surplus**: ${formatKobo(d.surplus_typical)} typical (${formatKobo(d.surplus_ceiling)} ceiling)\n• **Commitment Headroom**: ${formatKobo(d.commitment_headroom)}\n• **Emergency Cover**: ${d.months_of_cover_typical} months of typical living expenses\n\n${d.commitment_headroom < 0 ? `⚠️ Commitments exceed ceiling surplus. You would need to reduce unplanned leaks by ${formatKobo(d.required_cut_if_tight)} per month.` : 'Your commitments fit comfortably within your ceiling surplus.'}\n\n*(Note: Attach your GEMINI_API_KEY in the Settings panel to enable full conversational dialogue.)*`,
          state: currentState,
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${structuredContext}\n\nUser Question: ${prompt}`,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const replyText = response.text || 'I have reviewed your financial plan.';

      return res.json({
        reply: replyText,
        state: getFullState(),
      });
    } catch (err: any) {
      console.error('Gemini call error:', err);
      // Fallback with pure application arithmetic
      return res.json({
        reply: `Based on your application figures, your realised income is ${formatKobo(d.realised_income)}, your typical normalised costs are ${formatKobo(d.cost_typical)} (${formatKobo(d.cost_ceiling)} ceiling), and your commitment headroom is ${formatKobo(d.commitment_headroom)}.`,
        state: currentState,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ramine server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Ramine server:', err);
});
