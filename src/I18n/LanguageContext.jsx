// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translateBatch, clearTranslationCache } from './translateService';

// ── Single source of truth: English UI labels ─────────────────────────────────
// Add new keys here in English only — they auto-translate at runtime.
const EN = {
  nav_dashboard: 'Dashboard', nav_tasks: 'Tasks',
  nav_backlog: 'Backlog', nav_scoring: 'AI Scoring',
  nav_compare: 'Compare',
  nav_reports: 'Reports', nav_settings: 'Settings',
  nav_admin: 'Admin Panel', nav_signout: 'Sign out',
  nav_main: 'Main', nav_administration: 'Administration',
  nav_management: 'Management', nav_audit: 'Audit Trail', nav_jira: 'Jira',
  nav_dora: 'DORA', nav_sprint: 'Sprint Board', nav_workload: 'Workload',
  nav_sla: 'SLA & Deadlines', nav_teams: 'Teams', nav_cab: 'CAB Approval',
  auth_welcome: 'Welcome back',
  auth_signin_subtitle: 'Sign in to your PriorIT account',
  auth_email: 'Email address', auth_password: 'Password',
  auth_signin_btn: 'Sign in', auth_signing_in: 'Signing in...',
  auth_no_account: 'No account?',
  auth_request_access: 'Request access',
  auth_access_note: 'Access level is determined by your IT profile.',
  reg_title: 'Create your account',
  reg_subtitle: 'All fields marked * are required',
  reg_name: 'Full name *', reg_email: 'Email address *',
  reg_role: 'Role *', reg_password: 'Password *',
  reg_confirm_password: 'Confirm password *',
  reg_upload_photo: 'Upload photo',
  reg_submit: 'Request access', reg_submitting: 'Submitting...',
  reg_already_account: 'Already have an account?',
  reg_success: 'Registration successful! Please wait for admin approval.',
  reg_select_role: 'Select your role',
  reg_password_weak: 'Weak', reg_password_medium: 'Medium',
  reg_password_strong: 'Strong',
  reg_passwords_no_match: 'Passwords do not match',
  role_developer: 'IT Developer',
  role_product: 'Product / Mobile Team',
  role_manager: 'IT Manager', role_admin: 'Administrator',
  dash_title: 'Dashboard',
  dash_total_tasks: 'Total Tasks', dash_ai_scored: 'AI Scored',
  dash_must_do: 'Must Do', dash_avg_score: 'Avg Score',
  dash_pending: 'Pending Scoring', dash_overridden: 'Overridden',
  dash_moscow_ratio: 'MoSCoW Must Ratio',
  dash_on_target: '✓ On target', dash_off_target: '⚠ Off target',
  dash_moscow_dist: 'MoSCoW Distribution',
  dash_top5: 'Top 5 Tasks by Score',
  dash_top_ranked: 'Top Ranked Tasks',
  dash_no_tasks: 'No scored tasks yet',
  dash_go_submit: 'Go to Tasks and submit your first task',
  dash_refresh: 'Refresh', dash_target: 'Target: 60%',
  task_title: 'Submit New Task',
  task_subtitle: 'Describe your task — AI will handle Kano, MoSCoW, and RICE scoring',
  task_details: 'Task Details', task_type: 'Task Type *',
  task_name: 'Task Title *', task_description: 'Description *',
  task_description_hint: 'The more detail, the more accurate the AI scoring.',
  task_kano_section: 'Kano Signal',
  task_kano_subtitle: 'How would users react if this feature was missing?',
  task_submit: '🤖 Submit for AI Scoring',
  task_submitting: 'Submitting...', task_clear: 'Clear form',
  task_success: 'Task submitted! The AI will score it shortly.',
  task_ai_note: 'AI Scoring Engine',
  task_loading_types: 'Loading task types...',
  kano_complain: 'They would complain',
  kano_complain_desc: 'Users expect this — Basic need',
  kano_appreciate: 'They would appreciate it',
  kano_appreciate_desc: 'Users notice and value it — Performance',
  kano_surprised: 'They would be surprised',
  kano_surprised_desc: "Users don't expect it — Delighter",
  kano_wont_notice: "They wouldn't notice",
  kano_wont_notice_desc: 'Little impact on satisfaction — Indifferent',
  backlog_title: 'Task Backlog',
  backlog_subtitle: 'Ranked by AI-computed RICE score',
  backlog_all: 'All tasks', backlog_override: 'Override',
  backlog_dora: 'DORA', backlog_no_tasks: 'No tasks found',
  backlog_go_submit: 'Submit a task to see it scored here.',
  scoring_title: 'AI Scoring',
  scoring_subtitle: 'Full AI reasoning and RICE breakdown',
  scoring_total: 'Total Scored', scoring_avg: 'Avg Final Score',
  scoring_confidence: 'Avg Confidence',
  scoring_high_conf: 'High Confidence',
  scoring_no_tasks: 'No scored tasks',
  scoring_industry: '🌍 Industry Context',
  scoring_rice: 'RICE Variables', scoring_reasoning: 'AI Reasoning',
  admin_title: 'Admin Panel',
  admin_subtitle: 'Manage user registration requests',
  admin_approve: 'Approve', admin_reject: 'Reject',
  admin_requests: 'Pending Registration Requests',
  admin_all_clear: 'All caught up',
  admin_no_pending: 'No pending registration requests.',
  admin_processing: 'Processing...',
  export_title: 'Export Reports',
  export_subtitle: 'Generate PDF or Excel reports',
  export_excel_btn: 'Export Excel (.xlsx)',
  export_pdf_btn: 'Export PDF Report',
  export_generating: 'Generating...',
  settings_title: 'Settings',
  settings_subtitle: 'Manage your account and preferences',
  settings_profile: 'My Profile',
  settings_permissions: 'Roles & Permissions',
  settings_ai: 'AI Scoring Config',
  settings_notifications: 'Notifications',
  settings_language: 'Language & Localization',
  settings_save: 'Save changes',
  dora_title: 'DORA Metrics Panel',
  dora_subtitle: 'Manually estimated delivery performance indicators',
  dora_lead_time: 'Avg Lead Time', dora_freq: 'Deploy Frequency',
  dora_high_risk: 'High Risk Tasks', dora_tracked: 'Total Tracked',
  dora_no_data: 'No DORA indicators yet.',
  common_loading: 'Loading...', common_refresh: 'Refresh',
  common_cancel: 'Cancel', common_save: 'Save',
  filter_all_kano: 'All', filter_all_moscow: 'All',
  refresh: 'Refresh',
  scoring_loading: 'Loading scores...',
  scoring_empty_title: 'No scored tasks',
  scoring_empty_subtitle: 'Submit a task to see AI scoring here.',
  task_description: 'Description',
  industry_context: 'Industry Context',
  ai_industry_context: 'AI Industry Context',
  rice_variables: 'RICE Variables',
  reach: 'Reach', impact: 'Impact',
  confidence: 'Confidence', effort: 'Effort',
  rice_formula: 'RICE × Multiplier = Final Score',
  ai_reasoning: 'AI Reasoning',
  ai_confidence_level: 'AI Confidence Level',
  final_score: 'Final Score',
  moscow_distribution: 'MoSCoW Distribution',
  moscow_target: 'Target: 60% Must / 20% Should / 20% Could',
  must: 'Must', should: 'Should', could: 'Could', wont: "Won't",
  filter_all_tasks: 'All tasks',
  backlog_loading: 'Loading backlog...',
  backlog_empty_title: 'No tasks found',
  backlog_empty_subtitle: 'Submit a task to see it scored here.',
  rice_breakdown: 'RICE Breakdown',
  rice_score: 'RICE Score',
  multiplier: 'Multiplier',
  kano_reasoning: 'Kano Reasoning',
  moscow_reasoning: 'MoSCoW Reasoning',
  override: 'Override',
  dash_subtitle_greeting: "here's your prioritization overview",
  dash_in_backlog: 'In the backlog',
  dash_pending_subtitle: 'Waiting for AI',
  dash_overridden_subtitle: 'Manager overrides applied',
  dash_charts_moscow: 'MoSCoW Distribution',
  dash_charts_moscow_target: 'Target: 60% Must / 20% Should / 20% Could',
  dash_charts_top5: 'Top 5 Tasks by Score',
  dash_ranked_by_rice: 'Ranked by final RICE score',
  dash_top_ranked_subtitle: 'Highest priority items in the backlog',
  dash_no_scored: 'No scored tasks yet',
  dash_go_scoring: 'Go to Tasks and submit your first task for AI scoring',
  dash_loading: 'Loading dashboard...',
  dora_lead_subtitle: 'Approval to deployment',
  dora_freq_subtitle: 'Most common cadence',
  dora_high_risk_subtitle: 'High or Critical risk',
  dora_tracked_subtitle: 'Tasks with DORA data',
  dora_no_data_hint: 'No DORA indicators yet. Go to Backlog → click DORA on any scored task to add indicators.',
  dora_indicators: 'indicators',
  nav_workplace: 'Workplace',
  nav_task_relations: 'Task Relations',
  workplace_title: 'Workplace',
  workplace_subtitle: 'AI-powered task planning & progress tracking',
  workplace_generate_btn: 'Generate Workplace',
  workplace_empty_title: 'No workplaces yet',
  workplace_empty_subtitle: 'Generate an AI-powered workplace for any of your tasks — get subtasks, tips, banking benchmarks and DORA estimates.',
  workplace_no_tasks: 'No tasks available',
  workplace_no_tasks_hint: 'Submit a task first to generate a workplace',
  workplace_pick_task: 'Select a task',
  workplace_pick_subtitle: 'AI will generate a full implementation plan with subtasks, tips and banking benchmarks',
  workplace_search_tasks: 'Search tasks...',
  workplace_generating: 'Generating AI plan...',
  workplace_open: 'Open',
  workplace_regenerate: 'Regenerate',
  workplace_back: 'Workplaces',
  workplace_overall_plan: 'Implementation Plan',
  workplace_tips: 'Tips & Best Practices',
  workplace_benchmarks: 'Banking Benchmarks',
  workplace_dora: 'DORA Estimates',
  workplace_progress: 'Progress',
  workplace_est_hours: 'Est. Hours',
  workplace_subtasks: 'subtasks',
  workplace_total: 'Total Workplaces',
  workplace_active: 'Active',
  workplace_completed: 'Completed',
  workplace_loading: 'Loading workplaces...',
  workplace_cancel: 'Cancel',
  workplace_status_active: 'Active',
  workplace_status_completed: 'Completed',
  workplace_status_archived: 'Archived',
  subtask_todo: 'To Do',
  subtask_in_progress: 'In Progress',
  subtask_done: 'Done',
  subtask_low: 'Low',
  subtask_medium: 'Medium',
  subtask_high: 'High',
  subtask_tips: 'tips',
  subtask_hide_tips: 'Hide tips',
  subtask_actual: 'actual',
  benchmark_source: 'Source',
  dora_change_risk: 'Change Failure Risk',
  dora_recovery_plan: 'Recovery Plan',
  compare_title: 'Comparative Analysis',
  compare_subtitle: 'Score and rank banking features or existing tasks side by side',
  compare_mode_features: 'Banking Features',
  compare_mode_features_desc: 'Compare features or concepts — virement, paiement mobile, biometric login…',
  compare_mode_tasks: 'Existing Tasks',
  compare_mode_tasks_desc: 'Pick from your scored backlog and compare them head-to-head',
  compare_max_reached: 'Maximum reached',
  compare_add_feature: 'Add Feature',
  compare_feature: 'Feature',
  compare_category: 'Category',
  compare_optional: '(optional)',
  compare_feature_name: 'Feature name *',
  compare_description: 'Description *',
  compare_remove: 'Remove',
  compare_clear_all: 'Clear All',
  compare_context_label: 'Additional Context',
  compare_context_hint: 'Constraints, deadlines, or strategic context that should influence the ranking.',
  compare_ai_title: 'AI Comparative Engine',
  compare_ai_note_tasks: 'tasks will be re-evaluated simultaneously — Kano, MoSCoW and RICE in one pass — then ranked head-to-head. Scores may differ from individual backlog scores.',
  compare_ai_note_features_pre: 'All',
  compare_ai_note_features: 'features are scored simultaneously — Kano, MoSCoW and RICE in one pass — then ranked with 15+ years of MENA banking expertise.',
  compare_loading_tasks_msg: 'Loading tasks from backlog…',
  compare_no_tasks_title: 'No scored tasks found',
  compare_no_tasks_hint: 'Submit and score tasks in the Tasks page first, then come back to compare them.',
  compare_selected: 'selected',
  compare_select_min: 'Select at least',
  compare_select_max_text: 'Select up to',
  compare_more: 'more',
  compare_spots: 'spots left',
  compare_clear_selection: 'Clear selection',
  compare_clear: 'Clear',
  compare_analyzing_subtitle: 'AI is analyzing your items…',
  compare_analyzing: 'Analyzing',
  compare_items: 'items',
  compare_applying: 'Applying Kano · MoSCoW · RICE simultaneously…',
  compare_recommendation: 'Recommendation',
  compare_overall_analysis: 'Overall Analysis',
  compare_rice_breakdown: 'RICE Breakdown',
  compare_new_comparison: 'New Comparison',
  compare_start_new: 'Start a New Comparison',
  compare_task_pill: 'Task',
  compare_feature_pill: 'Feature',
  compare_why_rank: 'Why this rank',
  compare_outranks: 'Outranks #',
  compare_btn: 'Compare',
  compare_features_word: 'Features',
  compare_tasks_word: 'Tasks',
  compare_score_label: 'Score',
  compare_final_label: 'Final',
  compare_ranked: 'ranked',
  compare_rank_label: 'Rank #',
  btn_workspace: 'Workspace',
  btn_compare: 'Compare',
  btn_compare_selected: 'Selected',
  btn_add_to_compare: 'Add to compare',
  btn_remove_from_compare: 'Remove from compare',
  compare_now: 'Compare Now',
  compare_tasks_selected: 'tasks selected',
  btn_delete: 'Delete',
  common_clear: 'Clear',
  freq_multiple: 'Multiple per Day',
  freq_daily: 'Daily',
  freq_weekly: 'Weekly',
  freq_monthly: 'Monthly',
  freq_less_monthly: 'Less than Monthly',
};

// ── Cache helpers ─────────────────────────────────────────────────────────────
function loadCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function saveCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ── Context ───────────────────────────────────────────────────────────────────
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLangState]       = useState(() => localStorage.getItem('priorit_lang') || 'en');
  const [txUI, setTxUI]                = useState({});
  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = useCallback((lang) => {
    // Clear all cached translations so stale MyMemory entries get re-fetched
    clearTranslationCache();
    Object.keys(localStorage)
      .filter(k => k.startsWith('priorit_ui_') || k.startsWith('priorit_autot_') || k.startsWith('priorit_dyn_'))
      .forEach(k => localStorage.removeItem(k));
    setLangState(lang);
    localStorage.setItem('priorit_lang', lang);
  }, []);

  // Auto-translate all EN labels whenever language changes
  useEffect(() => {
    if (language === 'en') { setTxUI({}); return; }

    const cacheKey = `priorit_ui_${language}`;
    const cached   = loadCache(cacheKey);

    // Show cached immediately
    setTxUI(cached);

    // Find keys with missing or previously-failed translations
    const allKeys = Object.keys(EN);
    const needed  = allKeys.filter(k => !cached[k] || cached[k] === EN[k]);
    if (!needed.length) return;

    setIsTranslating(true);
    translateBatch(needed.map(k => EN[k]), language).then(results => {
      const updated = { ...cached };
      needed.forEach((k, i) => { if (results[i] && results[i] !== EN[k]) updated[k] = results[i]; });
      saveCache(cacheKey, updated);
      setTxUI({ ...updated });
    }).finally(() => setIsTranslating(false));
  }, [language]);

  // RTL + lang attribute
  useEffect(() => {
    document.documentElement.dir  = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // t(key) — returns translated UI label or English fallback
  const t = useCallback((key) => {
    if (language === 'en') return EN[key] || key;
    return txUI[key] || EN[key] || key;
  }, [language, txUI]);

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// ── useAutoT ──────────────────────────────────────────────────────────────────
// Pass a MODULE-LEVEL const {key: 'English text'} object.
// Returns auto-translated copy, cached per language in localStorage.
// Cache key = the English text itself (first 100 chars).

function ckAutoT(text) { return text?.slice(0, 100) ?? ''; }

export function useAutoT(strings) {
  const { language } = useLanguage();
  const [tx, setTx]  = useState(strings);

  useEffect(() => {
    if (language === 'en') { setTx(strings); return; }

    const cacheKey = `priorit_autot_${language}`;
    const cache    = loadCache(cacheKey);
    const keys     = Object.keys(strings);

    // Serve cached immediately
    const instant = {};
    keys.forEach(k => { instant[k] = cache[ckAutoT(strings[k])] || strings[k]; });
    setTx(instant);

    // Retry missing or previously-failed
    const needed = keys.filter(k => {
      const cv = cache[ckAutoT(strings[k])];
      return strings[k] && (!cv || cv === strings[k]);
    });
    if (!needed.length) return;

    translateBatch(needed.map(k => strings[k]), language).then(results => {
      const updated = { ...cache };
      needed.forEach((k, i) => { if (results[i] && results[i] !== strings[k]) updated[ckAutoT(strings[k])] = results[i]; });
      saveCache(cacheKey, updated);
      setTx(prev => {
        const final = { ...prev };
        keys.forEach(k => { final[k] = updated[ckAutoT(strings[k])] || strings[k]; });
        return final;
      });
    });
  }, [language]); // strings is module-level — stable reference

  return tx;
}

// ── useDynamicTranslation ─────────────────────────────────────────────────────
// Translates backend data strings (task titles, descriptions, etc.).
// extractFn MUST be defined at module level in the calling component.
// Returns {originalString: translatedString} map.
export function useDynamicTranslation(data, extractFn, cacheKeyPrefix) {
  const { language } = useLanguage();
  const [txMap, setTxMap] = useState({});

  useEffect(() => {
    if (!data || language === 'en') { setTxMap({}); return; }
    const strings = extractFn(data);
    if (!strings.length) return;

    const key    = `priorit_dyn_${cacheKeyPrefix}_${language}`;
    const cached = loadCache(key);

    // Retry missing or previously-failed
    const needed = strings.filter(s => s && (!cached[s] || cached[s] === s));
    if (!needed.length) { setTxMap(cached); return; }
    setTxMap(cached);

    translateBatch(needed, language).then(results => {
      const updated = { ...cached };
      needed.forEach((s, i) => { if (results[i] && results[i] !== s) updated[s] = results[i]; });
      saveCache(key, updated);
      setTxMap({ ...updated });
    });
  }, [data, language]);

  return txMap;
}

// ── useTranslatedTask ─────────────────────────────────────────────────────────
// Auto-translates AI-generated text fields in a task object when card is expanded.
const TASK_FIELDS = ['description', 'kanoReasoning', 'moscowReasoning', 'industryContext'];

export function useTranslatedTask(task, active = true) {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState(task);

  useEffect(() => {
    if (!task || language === 'en' || !active) { setTranslated(task); return; }
    translateBatch(TASK_FIELDS.map(f => task[f] || ''), language).then(results => {
      setTranslated({
        ...task,
        ...Object.fromEntries(TASK_FIELDS.map((f, i) => [f, results[i] || task[f]])),
      });
    });
  }, [task?.id, language, active]);

  return translated;
}

// ── useTranslatedWorkplace ────────────────────────────────────────────────────
// Auto-translates all AI-generated content in a workplace (subtasks, tips, benchmarks, plans).
export function useTranslatedWorkplace(workplace) {
  const { language } = useLanguage();
  const [txMap, setTxMap] = useState(null);

  useEffect(() => {
    if (!workplace || language === 'en') { setTxMap(null); return; }

    const texts = [], paths = [];
    const push = (text, path) => { if (text) { texts.push(text); paths.push(path); } };

    push(workplace.overallPlan,  'overallPlan');
    push(workplace.recoveryPlan, 'recoveryPlan');
    (workplace.tips || []).forEach((tip, i) => push(tip, `tip:${i}`));
    (workplace.bankingBenchmarks || []).forEach((bm, b) => {
      push(bm.feature, `bm:${b}:feature`);
      push(bm.outcome, `bm:${b}:outcome`);
    });
    (workplace.subtasks || []).forEach((st, s) => {
      push(st.title,       `st:${s}:title`);
      push(st.description, `st:${s}:description`);
      (st.tips || []).forEach((tip, ti) => push(tip, `st:${s}:tip:${ti}`));
    });

    if (!texts.length) return;

    translateBatch(texts, language).then(results => {
      const map = {};
      paths.forEach((p, i) => { if (results[i] && results[i] !== texts[i]) map[p] = results[i]; });
      setTxMap(map);
    });
  }, [workplace?.id, language]);

  if (!workplace || language === 'en' || !txMap) return workplace;

  const get = (p, fb) => txMap[p] || fb;
  return {
    ...workplace,
    overallPlan:  get('overallPlan',  workplace.overallPlan),
    recoveryPlan: get('recoveryPlan', workplace.recoveryPlan),
    tips: (workplace.tips || []).map((tip, i) => get(`tip:${i}`, tip)),
    bankingBenchmarks: (workplace.bankingBenchmarks || []).map((bm, b) => ({
      ...bm,
      feature: get(`bm:${b}:feature`, bm.feature),
      outcome: get(`bm:${b}:outcome`, bm.outcome),
    })),
    subtasks: (workplace.subtasks || []).map((st, s) => ({
      ...st,
      title:       get(`st:${s}:title`,       st.title),
      description: get(`st:${s}:description`, st.description),
      tips: (st.tips || []).forEach ? (st.tips || []).map((tip, ti) => get(`st:${s}:tip:${ti}`, tip)) : [],
    })),
  };
}

// ── useTranslatedCompareResults ───────────────────────────────────────────────
export function useTranslatedCompareResults(results) {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState(results);

  useEffect(() => {
    if (!results || language === 'en') { setTranslated(results); return; }

    const texts = [], paths = [];
    const push = (text, path) => { if (text) { texts.push(text); paths.push(path); } };

    push(results.recommendation,  'recommendation');
    push(results.overallAnalysis, 'overallAnalysis');
    (results.rankedItems || []).forEach((item, i) => {
      push(item.kanoReasoning,   `item:${i}:kanoReasoning`);
      push(item.moscowReasoning, `item:${i}:moscowReasoning`);
      push(item.reasoning,       `item:${i}:reasoning`);
      push(item.versusNext,      `item:${i}:versusNext`);
      push(item.title,           `item:${i}:title`);
    });

    if (!texts.length) return;

    translateBatch(texts, language).then(txResults => {
      const map = {};
      paths.forEach((p, i) => { if (txResults[i] && txResults[i] !== texts[i]) map[p] = txResults[i]; });
      setTranslated({
        ...results,
        recommendation:  map['recommendation']  || results.recommendation,
        overallAnalysis: map['overallAnalysis'] || results.overallAnalysis,
        rankedItems: (results.rankedItems || []).map((item, i) => ({
          ...item,
          kanoReasoning:   map[`item:${i}:kanoReasoning`]   || item.kanoReasoning,
          moscowReasoning: map[`item:${i}:moscowReasoning`] || item.moscowReasoning,
          reasoning:       map[`item:${i}:reasoning`]       || item.reasoning,
          versusNext:      map[`item:${i}:versusNext`]      || item.versusNext,
          title:           map[`item:${i}:title`]           || item.title,
        })),
      });
    });
  }, [results, language]);

  return translated;
}
