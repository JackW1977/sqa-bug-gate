// ─── Category / Sub-Category ─────────────────────────────────────────────────

export interface SubCategoryConfig {
  value: string;
  label: string;
}

export interface CategoryConfig {
  value: string;
  label: string;
  subCategories: SubCategoryConfig[];
}

// ─── Core SQA Bug Data ───────────────────────────────────────────────────────

export interface SQASummaryData {
  category: string;
  subCategory: string;
  /** The user-visible symptom description (no root-cause guesses). */
  problemStatement: string;
  /** "when/under what condition" clause. */
  conditionClause: string;
}

export interface SQAEnvironmentData {
  softwareVersion: string;
  branchRelease: string;
  buildNumber: string;
  hardwareConfig: string;
  /** Simulation vs live, feature flags, localization, network type. */
  mode: string;
  keySettings: string;
  dataProcedureContext: string;
  /** Filled when any field is unknown; must include reason. */
  unknownReason: string;
}

export interface SQAPreconditionsData {
  preconditions: string;
  noPreconditions: boolean;
  /** Required when noPreconditions is true. */
  noPreconditionsExplanation: string;
}

export interface SQAStepsToReproduceData {
  initialState: string;
  steps: string[];
  /** e.g. "3/3", "2/10", "Observed once". */
  reproducibility: string;
  intermittentNotes: string;
}

export interface SQAExpectedActualData {
  expectedBehavior: string;
  actualBehavior: string;
  /** Optional — root-cause theories go here, not in expected. */
  notes: string;
}

export type WorkaroundPracticality = 'trivial' | 'acceptable' | 'cumbersome' | 'unrealistic' | '';
export type OccurrenceEstimate = 'remote' | 'occasional' | 'frequent' | '';

export interface SQAImpactData {
  userWorkflowImpact: string;
  /** Optional — describe only when safety is evidently affected. */
  safetyRelevance: string;
  workaroundDescription: string;
  workaroundPracticality: WorkaroundPracticality;
  estimatedOccurrence: OccurrenceEstimate;
}

export interface SQAEvidenceData {
  screenshotReferences: string;
  videoReferences: string;
  /** Tool name, time window, timezone. */
  logDetails: string;
  testCaseIds: string;
}

export interface SQATraceabilityData {
  requirementIds: string;
  riskItemIds: string;
  relatedJiraKeys: string;
}

export type BugType = 'Bug' | 'Improvement' | '';
export type ImpactCategory = 'Minor' | 'Intermediate' | 'Major' | 'Blocker' | '';
export type PrioritySuggestion = 'Highest' | 'High' | 'Medium' | 'Low' | '';

export interface SQAClassificationData {
  type: BugType;
  impactCategory: ImpactCategory;
  prioritySuggestion: PrioritySuggestion;
  priorityRationale: string;
}

export type DuplicateOutcome = 'open_match' | 'closed_match' | 'none' | '';

export interface DuplicateSearchResult {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  description: string;
  assignee?: string;
  created: string;
  url?: string;
}

export interface SQADuplicateSearchData {
  searchPerformed: boolean;
  searchQuery: string;
  results: DuplicateSearchResult[];
  outcome: DuplicateOutcome;
  linkedIssueKeys: string[];
  performedAt?: string;
}

export interface SQABugData {
  projectKey: string;
  summary: SQASummaryData;
  environment: SQAEnvironmentData;
  preconditions: SQAPreconditionsData;
  stepsToReproduce: SQAStepsToReproduceData;
  expectedActual: SQAExpectedActualData;
  impact: SQAImpactData;
  evidence: SQAEvidenceData;
  traceability: SQATraceabilityData;
  classification: SQAClassificationData;
  duplicateSearch: SQADuplicateSearchData;
}

// ─── Validation / Checklist ──────────────────────────────────────────────────

export type ChecklistItemKey =
  | 'summary'
  | 'environment'
  | 'preconditions'
  | 'stepsToReproduce'
  | 'expectedActual'
  | 'impact'
  | 'evidence'
  | 'duplicateSearch'
  | 'classification';

export interface ChecklistItem {
  key: ChecklistItemKey;
  label: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  passed: boolean;
  items: ChecklistItem[];
}

// ─── Forge-storage persisted gate state ──────────────────────────────────────

export interface IssueGateState {
  issueKey: string;
  lastChecked: string;
  sqaData: SQABugData;
  validationResult: ValidationResult;
}

// ─── App Config ──────────────────────────────────────────────────────────────

export interface AppConfig {
  /** Atlassian Cloud site base URL, e.g. https://noahmed.atlassian.net */
  jiraSiteUrl: string;
  /** Jira project keys where the SQA gate is active (empty = all projects). */
  governedProjects: string[];
  /** Issue types the gate applies to. */
  governedIssueTypes: string[];
  /** Workflow status names that trigger the validator gate. */
  gatedStatuses: string[];
  categories: CategoryConfig[];
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export type MetricType = 'checklist_result' | 'duplicate_prevented' | 'missing_info';

export interface MetricRecord {
  issueKey: string;
  timestamp: string;
  type: MetricType;
  data: Record<string, unknown>;
}
