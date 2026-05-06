// ─── Shared types (mirrors backend sqaInstructionModel.ts) ───────────────────

export interface SubCategoryConfig {
  value: string;
  label: string;
}

export interface CategoryConfig {
  value: string;
  label: string;
  subCategories: SubCategoryConfig[];
}

export interface SQASummaryData {
  category: string;
  subCategory: string;
  problemStatement: string;
  conditionClause: string;
}

export interface SQAEnvironmentData {
  softwareVersion: string;
  branchRelease: string;
  buildNumber: string;
  hardwareConfig: string;
  mode: string;
  keySettings: string;
  dataProcedureContext: string;
  unknownReason: string;
}

export interface SQAPreconditionsData {
  preconditions: string;
  noPreconditions: boolean;
  noPreconditionsExplanation: string;
}

export interface SQAStepsToReproduceData {
  initialState: string;
  steps: string[];
  reproducibility: string;
  intermittentNotes: string;
}

export interface SQAExpectedActualData {
  expectedBehavior: string;
  actualBehavior: string;
  notes: string;
}

export type WorkaroundPracticality = 'trivial' | 'acceptable' | 'cumbersome' | 'unrealistic' | '';
export type OccurrenceEstimate = 'remote' | 'occasional' | 'frequent' | '';

export interface SQAImpactData {
  userWorkflowImpact: string;
  safetyRelevance: string;
  workaroundDescription: string;
  workaroundPracticality: WorkaroundPracticality;
  estimatedOccurrence: OccurrenceEstimate;
}

export interface SQAEvidenceData {
  screenshotReferences: string;
  videoReferences: string;
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

export interface SQAJiraFieldsData {
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
  jiraFields: SQAJiraFieldsData;
  duplicateSearch: SQADuplicateSearchData;
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

export interface AppConfig {
  jiraSiteUrl: string;
  governedProjects: string[];
  governedIssueTypes: string[];
  gatedStatuses: string[];
  categories: CategoryConfig[];
  customFieldIds: CustomFieldIds;
  coreTeamOptions: string[];
  complexityOptions: string[];
  whereToHaveCaughtOptions: string[];
}

// ─── Wizard-specific ─────────────────────────────────────────────────────────

export type WizardStep =
  | 'project'
  | 'summary'
  | 'environment'
  | 'preconditions'
  | 'stepsToReproduce'
  | 'expectedActual'
  | 'impact'
  | 'evidence'
  | 'traceability'
  | 'classification'
  | 'jiraFields'
  | 'duplicateSearch'
  | 'review';

export interface WizardStepMeta {
  id: WizardStep;
  label: string;
  optional?: boolean;
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  { id: 'project', label: 'Project' },
  { id: 'summary', label: 'Summary' },
  { id: 'environment', label: 'Environment' },
  { id: 'preconditions', label: 'Preconditions' },
  { id: 'stepsToReproduce', label: 'Steps to Reproduce' },
  { id: 'expectedActual', label: 'Expected vs Actual' },
  { id: 'impact', label: 'Impact' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'traceability', label: 'Traceability', optional: true },
  { id: 'classification', label: 'Classification', optional: true },
  { id: 'jiraFields', label: 'Jira Fields' },
  { id: 'duplicateSearch', label: 'Duplicate Search' },
  { id: 'review', label: 'Review & Submit' },
];

export const INITIAL_BUG_DATA: SQABugData = {
  projectKey: '',
  summary: { category: '', subCategory: '', problemStatement: '', conditionClause: '' },
  environment: {
    softwareVersion: '', branchRelease: '', buildNumber: '',
    hardwareConfig: '', mode: '', keySettings: '', dataProcedureContext: '', unknownReason: '',
  },
  preconditions: { preconditions: '', noPreconditions: false, noPreconditionsExplanation: '' },
  stepsToReproduce: { initialState: '', steps: ['', ''], reproducibility: '', intermittentNotes: '' },
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
