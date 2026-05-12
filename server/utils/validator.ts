import type {
  SQABugData,
  SQASummaryData,
  SQAEnvironmentData,
  SQAPreconditionsData,
  SQAStepsToReproduceData,
  SQAExpectedActualData,
  SQAImpactData,
  SQAEvidenceData,
  SQADuplicateSearchData,
  ChecklistItem,
  ChecklistItemKey,
  ValidationResult,
} from './sqaInstructionModel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function item(
  key: ChecklistItemKey,
  label: string,
  passed: boolean,
  message = '',
): ChecklistItem {
  return { key, label, passed, message };
}

const VAGUE_TITLES = new Set([
  'system issue',
  'bug found',
  "doesn't work",
  'not working',
  "it doesn't work",
  'issue found',
  'issue',
  'error',
  'problem',
  'bug',
  'defect',
  'fix needed',
  'something wrong',
]);

const ROOT_CAUSE_PATTERNS =
  /\b(race condition|memory leak|null pointer|null ref|db issue|database error|server error|api error|timeout issue|crash in|exception in|stack overflow|segfault)\b/i;

// ─── Section validators ───────────────────────────────────────────────────────

export function validateSummary(data: SQASummaryData): ChecklistItem {
  const label = 'Summary — category, sub-category, and user-visible problem';

  if (!data.category) {
    return item('summary', label, false, 'Category must be selected.');
  }
  if (!data.subCategory) {
    return item('summary', label, false, 'Sub-category must be selected.');
  }

  const stmt = data.problemStatement.trim();
  if (!stmt) {
    return item('summary', label, false, 'Problem statement is required.');
  }
  if (VAGUE_TITLES.has(stmt.toLowerCase().replace(/[.!?]+$/, ''))) {
    return item(
      'summary',
      label,
      false,
      `"${stmt}" is too vague — describe the specific user-visible symptom.`,
    );
  }
  if (ROOT_CAUSE_PATTERNS.test(stmt)) {
    return item(
      'summary',
      label,
      false,
      'Summary should describe the user-visible symptom, not a root cause.',
    );
  }
  if (stmt.length < 10) {
    return item('summary', label, false, 'Problem statement is too short — be specific.');
  }

  if (!data.conditionClause.trim()) {
    return item(
      'summary',
      label,
      false,
      'Add a "when / under what condition" clause (e.g., "when connecting via USB on cold boot").',
    );
  }

  return item('summary', label, true);
}

export function validateEnvironment(data: SQAEnvironmentData): ChecklistItem {
  const label = 'Environment — version, branch, hardware, mode';

  const requiredFields: Array<[keyof SQAEnvironmentData, string]> = [
    ['softwareVersion', 'Software version / build ID'],
    ['branchRelease', 'Branch / release line'],
    ['hardwareConfig', 'Hardware configuration'],
    ['mode', 'Mode / key settings'],
  ];

  for (const [field, fieldLabel] of requiredFields) {
    const val = (data[field] as string).trim();
    if (!val) {
      // If unknownReason is provided, the field may intentionally be unknown
      if (!data.unknownReason.trim()) {
        return item(
          'environment',
          label,
          false,
          `"${fieldLabel}" is empty. Fill in the value or provide an "Unknown – reason" explanation.`,
        );
      }
    }
  }

  return item('environment', label, true);
}

export function validatePreconditions(data: SQAPreconditionsData): ChecklistItem {
  const label = 'Preconditions — documented or explicitly none';

  if (!data.noPreconditions && !data.preconditions.trim()) {
    return item(
      'preconditions',
      label,
      false,
      'Describe preconditions, or check "No special preconditions" with an explanation.',
    );
  }
  if (data.noPreconditions && !data.noPreconditionsExplanation.trim()) {
    return item(
      'preconditions',
      label,
      false,
      'Provide a brief explanation when "No special preconditions" is checked.',
    );
  }

  return item('preconditions', label, true);
}

export function validateStepsToReproduce(data: SQAStepsToReproduceData): ChecklistItem {
  const label = 'Steps to reproduce — numbered, concrete, from initial state';

  if (!data.initialState.trim()) {
    return item('stepsToReproduce', label, false, 'Describe the initial state before step 1.');
  }

  const nonEmptySteps = data.steps.filter((s) => s.trim());
  if (nonEmptySteps.length < 2) {
    return item(
      'stepsToReproduce',
      label,
      false,
      'Provide at least 2 numbered steps to reproduce.',
    );
  }

  if (!data.reproducibility.trim()) {
    return item('stepsToReproduce', label, false, 'Reproducibility rate is required (e.g., "3/3", "Observed once").');
  }

  return item('stepsToReproduce', label, true);
}

export function validateExpectedActual(data: SQAExpectedActualData): ChecklistItem {
  const label = 'Expected vs actual behavior — clearly differentiated';

  if (!data.expectedBehavior.trim()) {
    return item('expectedActual', label, false, 'Expected behavior is required.');
  }
  if (!data.actualBehavior.trim()) {
    return item('expectedActual', label, false, 'Actual behavior is required.');
  }

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  if (norm(data.expectedBehavior) === norm(data.actualBehavior)) {
    return item(
      'expectedActual',
      label,
      false,
      'Expected and actual behavior appear identical — they must be different.',
    );
  }

  // Warn if expected contains root-cause language
  if (ROOT_CAUSE_PATTERNS.test(data.expectedBehavior)) {
    return item(
      'expectedActual',
      label,
      false,
      'Expected behavior should describe user-facing outcome, not a root cause. Move theories to Notes.',
    );
  }

  return item('expectedActual', label, true);
}

export function validateImpact(data: SQAImpactData): ChecklistItem {
  const label = 'Impact — user/workflow effect, workaround, frequency';

  if (!data.userWorkflowImpact.trim()) {
    return item(
      'impact',
      label,
      false,
      'Describe at least one concrete user or workflow effect.',
    );
  }
  if (!data.workaroundPracticality && !data.workaroundDescription.trim()) {
    return item('impact', label, false, 'Workaround information is required (describe or indicate none).');
  }
  if (!data.estimatedOccurrence) {
    return item('impact', label, false, 'Estimated occurrence frequency is required.');
  }

  return item('impact', label, true);
}

export function validateEvidence(data: SQAEvidenceData): ChecklistItem {
  const label = 'Evidence — logs, screenshots, test IDs referenced';

  const hasEvidence =
    data.screenshotReferences.trim() ||
    data.videoReferences.trim() ||
    data.logDetails.trim() ||
    data.testCaseIds.trim();

  if (!hasEvidence) {
    return item(
      'evidence',
      label,
      false,
      'At least one evidence reference is required (screenshot, video, log, or test ID).',
    );
  }

  return item('evidence', label, true);
}

export function validateDuplicateSearch(data: SQADuplicateSearchData): ChecklistItem {
  const label = 'Duplicate search — performed and outcome resolved';

  if (!data.searchPerformed) {
    return item('duplicateSearch', label, false, 'Duplicate search has not been performed.');
  }
  if (!data.outcome) {
    return item(
      'duplicateSearch',
      label,
      false,
      'Select a duplicate search outcome (open match, closed match, or no match).',
    );
  }
  if (data.outcome === 'open_match') {
    return item(
      'duplicateSearch',
      label,
      false,
      'An open duplicate was found. Add evidence to the existing bug instead of creating a new one.',
    );
  }

  return item('duplicateSearch', label, true);
}

export function validateClassification(
  data: SQABugData['classification'],
): ChecklistItem {
  const label = 'Classification — impact and priority suggestion consistent with description';
  // Classification is optional but if impact is Blocker, rationale should exist
  if (
    data.impactCategory === 'Blocker' &&
    !data.priorityRationale.trim()
  ) {
    return item(
      'classification',
      label,
      false,
      'A Blocker impact category requires a brief priority rationale.',
    );
  }
  return item('classification', label, true);
}

// ─── Full checklist ───────────────────────────────────────────────────────────

export function runChecklist(data: SQABugData): ValidationResult {
  const items: ChecklistItem[] = [
    validateSummary(data.summary),
    validateEnvironment(data.environment),
    validatePreconditions(data.preconditions),
    validateStepsToReproduce(data.stepsToReproduce),
    validateExpectedActual(data.expectedActual),
    validateImpact(data.impact),
    validateEvidence(data.evidence),
    validateDuplicateSearch(data.duplicateSearch),
    validateClassification(data.classification),
  ];

  const passed = items.every((i) => i.passed);
  return { passed, items };
}

// ─── Assembled summary string ─────────────────────────────────────────────────

export function assembleSummary(data: SQASummaryData): string {
  return `[${data.category}]-[${data.subCategory}]: ${data.problemStatement} ${data.conditionClause}`.trim();
}

// ─── Regex gate (used by the workflow validator) ──────────────────────────────

const SUMMARY_PATTERN = /^\[.+\]-\[.+\]:.+/;

export function summaryMatchesPattern(summary: string): boolean {
  return SUMMARY_PATTERN.test(summary.trim());
}
