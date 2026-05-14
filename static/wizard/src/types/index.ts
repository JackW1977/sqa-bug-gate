// ─── Shared types (mirrors backend SoftwareInstructionModel.ts) ───────────────────

export interface SubCategoryConfig {
  value: string;
  label: string;
}

export interface CategoryConfig {
  value: string;
  label: string;
  subCategories: SubCategoryConfig[];
}

export interface SoftwareSummaryData {
  category: string;
  subCategory: string;
  problemStatement: string;
  conditionClause: string;
}

export interface SoftwareEnvironmentData {
  softwareVersion: string;
  branchRelease: string;
  buildNumber: string;
  hardwareConfig: string;
  mode: string;
  keySettings: string;
  dataProcedureContext: string;
  unknownReason: string;
}

export interface SoftwarePreconditionsData {
  preconditions: string;
  noPreconditions: boolean;
  noPreconditionsExplanation: string;
}

export interface SoftwareStepsToReproduceData {
  initialState: string;
  steps: string[];
}

export interface SoftwareExpectedActualData {
  expectedBehavior: string;
  actualBehavior: string;
  notes: string;
}

export type WorkaroundPracticality = 'trivial' | 'acceptable' | 'cumbersome' | 'unrealistic' | '';
export type OccurrenceEstimate = 'remote' | 'occasional' | 'frequent' | '';

export interface SoftwareImpactData {
  userWorkflowImpact: string;
  safetyRelevance: string;
  workaroundDescription: string;
  workaroundPracticality: WorkaroundPracticality;
  estimatedOccurrence: OccurrenceEstimate;
}

export interface SoftwareEvidenceData {
  screenshotReferences: string;
  videoReferences: string;
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
  sprint: string;
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

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  passed: boolean;
  items: ChecklistItem[];
}

export interface CustomFieldIds {
  sprint?: string;
  coreTeam?: string;
  complexity?: string;
  whereToHaveCaught?: string;
  numberOfIncidents?: string;
  relatedSoWItem?: string;
  incidents?: string;
}

export interface GleanConfig {
  enabled: boolean;
  baseUrl: string; // e.g. "https://company-be.glean.com"
}

export interface AppConfig {
  jiraSiteUrl: string;
  governedProjects: string[];
  defaultProject?: string;
  governedIssueTypes: string[];
  gatedStatuses: string[];
  categories: CategoryConfig[];
  customFieldIds: CustomFieldIds;
  coreTeamOptions: string[];
  complexityOptions: string[];
  whereToHaveCaughtOptions: string[];
  glean?: GleanConfig;
}

// ─── Wizard-specific ─────────────────────────────────────────────────────────

export type WizardStep =
  | 'summary'
  | 'preconditions'
  | 'expectedActual'
  | 'evidence'
  | 'traceability'
  | 'duplicateSearch'
  | 'review';

export interface WizardStepMeta {
  id: WizardStep;
  label: string;
  optional?: boolean;
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'preconditions', label: 'Preconditions & Steps' },
  { id: 'expectedActual', label: 'Expected vs Actual' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'traceability', label: 'Traceability', optional: true },
  { id: 'duplicateSearch', label: 'Duplicate Search' },
  { id: 'review', label: 'Review & Submit' },
];

export const INITIAL_BUG_DATA: SoftwareBugData = {
  projectKey: '',
  summary: { category: '', subCategory: '', problemStatement: '', conditionClause: '' },
  environment: {
    softwareVersion: '', branchRelease: '', buildNumber: '',
    hardwareConfig: '', mode: '', keySettings: '', dataProcedureContext: '', unknownReason: '',
  },
  preconditions: { preconditions: '', noPreconditions: false, noPreconditionsExplanation: '' },
  stepsToReproduce: { initialState: '', steps: ['', ''] },
  expectedActual: { expectedBehavior: '', actualBehavior: '', notes: '' },
  impact: {
    userWorkflowImpact: '', safetyRelevance: '',
    workaroundDescription: '', workaroundPracticality: '', estimatedOccurrence: '',
  },
  evidence: { screenshotReferences: '', videoReferences: '', logDetails: '', testCaseIds: '' },
  traceability: { requirementIds: '', riskItemIds: '', relatedJiraKeys: '' },
  classification: { type: '', impactCategory: '', prioritySuggestion: '', priorityRationale: '' },
  jiraFields: {
    affectsVersions: [], fixVersions: [], components: [],
    sprint: '', coreTeam: '', numberOfIncidents: '',
    relatedSoWItem: '', incidents: '', whereToHaveCaught: '', complexity: '',
  },
  duplicateSearch: {
    searchPerformed: false, searchQuery: '', results: [],
    outcome: '', linkedIssueKeys: [],
  },
};
