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

// ─── Core Software Bug Data ───────────────────────────────────────────────────────

export interface SoftwareSummaryData {
  category: string;
  subCategory: string;
  /** The user-visible symptom description (no root-cause guesses). */
  problemStatement: string;
  /** "when/under what condition" clause. */
  conditionClause: string;
}

export interface SoftwareEnvironmentData {
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

export interface SoftwarePreconditionsData {
  preconditions: string;
  noPreconditions: boolean;
  /** Required when noPreconditions is true. */
  noPreconditionsExplanation: string;
}

export interface SoftwareStepsToReproduceData {
  initialState: string;
  steps: string[];
  /** e.g. "3/3", "2/10", "Observed once". */
  reproducibility: string;
  intermittentNotes: string;
}

export interface SoftwareExpectedActualData {
  expectedBehavior: string;
  actualBehavior: string;
  /** Optional — root-cause theories go here, not in expected. */
  notes: string;
}

export type WorkaroundPracticality = 'trivial' | 'acceptable' | 'cumbersome' | 'unrealistic' | '';
export type OccurrenceEstimate = 'remote' | 'occasional' | 'frequent' | '';

export interface SoftwareImpactData {
  userWorkflowImpact: string;
  /** Optional — describe only when safety is evidently affected. */
  safetyRelevance: string;
  workaroundDescription: string;
  workaroundPracticality: WorkaroundPracticality;
  estimatedOccurrence: OccurrenceEstimate;
}

export interface SoftwareEvidenceData {
  screenshotReferences: string;
  videoReferences: string;
  /** Tool name, time window, timezone. */
  logDetails: string;
  testCaseIds: string;
}

export interface SoftwareTraceabilityData {
  requirementIds: string;
  riskItemIds: string;
  relatedJiraKeys: string;
}

export type BugType = 'Bug' | 'Improvement' | '';
export type ImpactCategory = 'Minor' | 'Intermediate' | 'Major' | 'Blocker' | '';
export type PrioritySuggestion = 'Highest' | 'High' | 'Medium' | 'Low' | '';

export interface SoftwareClassificationData {
  type: BugType;
  impactCategory: ImpactCategory;
  prioritySuggestion: PrioritySuggestion;
  priorityRationale: string;
}

export interface SoftwareJiraFieldsData {
  affectsVersions: string[];
  fixVersions: string[];
  components: string[];
  sprint: string;       // sprint ID (string)
  coreTeam: string;
  numberOfIncidents: string;
  relatedSoWItem: string;
  incidents: string;
  whereToHaveCaught: string;
  complexity: string;
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

export interface SoftwareDuplicateSearchData {
  searchPerformed: boolean;
  searchQuery: string;
  results: DuplicateSearchResult[];
  outcome: DuplicateOutcome;
  linkedIssueKeys: string[];
  performedAt?: string;
}

export interface SoftwareBugData {
  projectKey: string;
  summary: SoftwareSummaryData;
  environment: SoftwareEnvironmentData;
  preconditions: SoftwarePreconditionsData;
  stepsToReproduce: SoftwareStepsToReproduceData;
  expectedActual: SoftwareExpectedActualData;
  impact: SoftwareImpactData;
  evidence: SoftwareEvidenceData;
  traceability: SoftwareTraceabilityData;
  classification: SoftwareClassificationData;
  jiraFields: SoftwareJiraFieldsData;
  duplicateSearch: SoftwareDuplicateSearchData;
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
  SoftwareData: SoftwareBugData;
  validationResult: ValidationResult;
}

// ─── App Config ──────────────────────────────────────────────────────────────

export interface CustomFieldIds {
  sprint?: string;          // default: 'customfield_10020'
  coreTeam?: string;
  complexity?: string;
  whereToHaveCaught?: string;
  numberOfIncidents?: string;
  relatedSoWItem?: string;
  incidents?: string;
}

export interface AppConfig {
  /** Atlassian Cloud site base URL, e.g. https://noahmed.atlassian.net */
  jiraSiteUrl: string;
  /** Jira project keys where the Software gate is active (empty = all projects). */
  governedProjects: string[];
  /** Issue types the gate applies to. */
  governedIssueTypes: string[];
  /** Workflow status names that trigger the validator gate. */
  gatedStatuses: string[];
  categories: CategoryConfig[];
  customFieldIds: CustomFieldIds;
  coreTeamOptions: string[];
  complexityOptions: string[];
  whereToHaveCaughtOptions: string[];
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export type MetricType = 'checklist_result' | 'duplicate_prevented' | 'missing_info';

export interface MetricRecord {
  issueKey: string;
  timestamp: string;
  type: MetricType;
  data: Record<string, unknown>;
}
