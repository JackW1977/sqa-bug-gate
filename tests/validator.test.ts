import {
  validateSummary,
  validateEnvironment,
  validatePreconditions,
  validateStepsToReproduce,
  validateExpectedActual,
  validateImpact,
  validateEvidence,
  validateDuplicateSearch,
  runChecklist,
  assembleSummary,
  summaryMatchesPattern,
} from '../src/utils/validator';
import type { SoftwareBugData } from '../src/utils/SoftwareInstructionModel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBugData(overrides: Partial<SoftwareBugData> = {}): SoftwareBugData {
  return {
    projectKey: 'TEST',
    summary: {
      category: 'R&C', subCategory: 'BC',
      problemStatement: 'Bronchoscope view freezes and turns black',
      conditionClause: 'when connecting via USB on a cold boot',
    },
    environment: {
      softwareVersion: '1.4.0.1-37', branchRelease: '1D.0 dev',
      buildNumber: '1.4.0.1-37', hardwareConfig: 'NovaCyclone Gen2, BC-12',
      mode: 'Live, EN-US', keySettings: 'Fluoroscopy enabled',
      dataProcedureContext: 'Phantom case', unknownReason: '',
    },
    preconditions: {
      preconditions: '1. System at home screen\n2. Scope connected',
      noPreconditions: false, noPreconditionsExplanation: '',
    },
    stepsToReproduce: {
      initialState: 'System at home screen, scope connected',
      steps: ['Navigate to Procedure screen', 'Click Start Procedure', 'Observe scope view'],
      reproducibility: '3/3', intermittentNotes: '',
    },
    expectedActual: {
      expectedBehavior: 'Live scope feed displayed within 3 seconds',
      actualBehavior: 'View remains black with spinner indefinitely',
      notes: '',
    },
    impact: {
      userWorkflowImpact: 'Cannot visualise bronchoscope during navigation phase',
      safetyRelevance: '',
      workaroundDescription: 'Reconnect USB scope',
      workaroundPracticality: 'cumbersome',
      estimatedOccurrence: 'frequent',
    },
    evidence: {
      screenshotReferences: 'black_screen.png',
      videoReferences: '', logDetails: 'TPS log 14:30-14:35 UTC',
      testCaseIds: 'TC-4521',
    },
    traceability: { requirementIds: '', riskItemIds: '', relatedJiraKeys: '' },
    classification: { type: 'Bug', impactCategory: 'Major', prioritySuggestion: 'High', priorityRationale: '' },
    duplicateSearch: {
      searchPerformed: true, searchQuery: 'project = TEST AND issuetype = Bug',
      results: [], outcome: 'none', linkedIssueKeys: [],
    },
    ...overrides,
  };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

describe('validateSummary', () => {
  it('passes a well-formed summary', () => {
    const result = validateSummary(makeBugData().summary);
    expect(result.passed).toBe(true);
  });

  it('fails when category is missing', () => {
    const result = validateSummary({ category: '', subCategory: 'BC', problemStatement: 'scope freezes', conditionClause: 'on cold boot' });
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/category/i);
  });

  it('fails when sub-category is missing', () => {
    const result = validateSummary({ category: 'R&C', subCategory: '', problemStatement: 'scope freezes', conditionClause: 'on cold boot' });
    expect(result.passed).toBe(false);
  });

  it('fails on vague titles', () => {
    for (const vague of ['system issue', 'Bug Found', "Doesn't work", 'issue']) {
      const result = validateSummary({
        category: 'R&C', subCategory: 'BC',
        problemStatement: vague, conditionClause: 'when doing something',
      });
      expect(result.passed).toBe(false);
    }
  });

  it('fails when problem statement is too short', () => {
    const result = validateSummary({ category: 'R&C', subCategory: 'BC', problemStatement: 'bad', conditionClause: 'on cold boot' });
    expect(result.passed).toBe(false);
  });

  it('fails when condition clause is missing', () => {
    const result = validateSummary({ category: 'R&C', subCategory: 'BC', problemStatement: 'Scope view freezes', conditionClause: '' });
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/condition/i);
  });

  it('fails when problem statement contains root-cause language', () => {
    const result = validateSummary({
      category: 'R&C', subCategory: 'BC',
      problemStatement: 'Race condition in USB driver causes freeze',
      conditionClause: 'on cold boot',
    });
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/symptom/i);
  });
});

// ─── assembleSummary ─────────────────────────────────────────────────────────

describe('assembleSummary', () => {
  it('produces [Category]-[SubCategory]: ... format', () => {
    const s = assembleSummary({ category: 'R&C', subCategory: 'BC', problemStatement: 'View freezes', conditionClause: 'on cold boot' });
    expect(s).toBe('[R&C]-[BC]: View freezes on cold boot');
  });
});

// ─── summaryMatchesPattern ───────────────────────────────────────────────────

describe('summaryMatchesPattern', () => {
  it('matches correctly formatted summaries', () => {
    expect(summaryMatchesPattern('[R&C]-[BC]: View freezes on cold boot')).toBe(true);
    expect(summaryMatchesPattern('[UI/UX]-[NA]: Button misaligned when resizing')).toBe(true);
  });

  it('rejects bare summaries without the pattern', () => {
    expect(summaryMatchesPattern('Scope freezes')).toBe(false);
    expect(summaryMatchesPattern('[R&C]: missing sub-cat')).toBe(false);
  });
});

// ─── Environment ─────────────────────────────────────────────────────────────

describe('validateEnvironment', () => {
  it('passes complete environment', () => {
    expect(validateEnvironment(makeBugData().environment).passed).toBe(true);
  });

  it('fails when softwareVersion is empty and no unknownReason', () => {
    const env = { ...makeBugData().environment, softwareVersion: '', unknownReason: '' };
    expect(validateEnvironment(env).passed).toBe(false);
  });

  it('passes when unknownReason is provided even if fields are empty', () => {
    const env = { ...makeBugData().environment, softwareVersion: '', unknownReason: 'Historic re-test — build not recorded' };
    expect(validateEnvironment(env).passed).toBe(true);
  });
});

// ─── Preconditions ───────────────────────────────────────────────────────────

describe('validatePreconditions', () => {
  it('passes with preconditions text', () => {
    expect(validatePreconditions(makeBugData().preconditions).passed).toBe(true);
  });

  it('fails when both preconditions and noPreconditions are empty/false', () => {
    const result = validatePreconditions({ preconditions: '', noPreconditions: false, noPreconditionsExplanation: '' });
    expect(result.passed).toBe(false);
  });

  it('passes when noPreconditions is true with explanation', () => {
    const result = validatePreconditions({ preconditions: '', noPreconditions: true, noPreconditionsExplanation: 'Any session works' });
    expect(result.passed).toBe(true);
  });

  it('fails when noPreconditions is true but no explanation', () => {
    const result = validatePreconditions({ preconditions: '', noPreconditions: true, noPreconditionsExplanation: '' });
    expect(result.passed).toBe(false);
  });
});

// ─── Steps to Reproduce ──────────────────────────────────────────────────────

describe('validateStepsToReproduce', () => {
  it('passes with valid steps', () => {
    expect(validateStepsToReproduce(makeBugData().stepsToReproduce).passed).toBe(true);
  });

  it('fails with fewer than 2 non-empty steps', () => {
    const str = { ...makeBugData().stepsToReproduce, steps: ['Step one'] };
    expect(validateStepsToReproduce(str).passed).toBe(false);
  });

  it('fails without initial state', () => {
    const str = { ...makeBugData().stepsToReproduce, initialState: '' };
    expect(validateStepsToReproduce(str).passed).toBe(false);
  });

  it('fails without reproducibility', () => {
    const str = { ...makeBugData().stepsToReproduce, reproducibility: '' };
    expect(validateStepsToReproduce(str).passed).toBe(false);
  });
});

// ─── Expected vs Actual ──────────────────────────────────────────────────────

describe('validateExpectedActual', () => {
  it('passes with distinct expected and actual', () => {
    expect(validateExpectedActual(makeBugData().expectedActual).passed).toBe(true);
  });

  it('fails when expected equals actual', () => {
    const ea = { expectedBehavior: 'Scope shows live feed', actualBehavior: 'Scope shows live feed', notes: '' };
    expect(validateExpectedActual(ea).passed).toBe(false);
  });

  it('fails when expected is empty', () => {
    const ea = { ...makeBugData().expectedActual, expectedBehavior: '' };
    expect(validateExpectedActual(ea).passed).toBe(false);
  });

  it('fails when expected contains root-cause language', () => {
    const ea = { ...makeBugData().expectedActual, expectedBehavior: 'Race condition should not occur' };
    expect(validateExpectedActual(ea).passed).toBe(false);
  });
});

// ─── Impact ──────────────────────────────────────────────────────────────────

describe('validateImpact', () => {
  it('passes complete impact', () => {
    expect(validateImpact(makeBugData().impact).passed).toBe(true);
  });

  it('fails when userWorkflowImpact is empty', () => {
    const imp = { ...makeBugData().impact, userWorkflowImpact: '' };
    expect(validateImpact(imp).passed).toBe(false);
  });

  it('fails when both workaround and practicality are empty', () => {
    const imp = { ...makeBugData().impact, workaroundDescription: '', workaroundPracticality: '' as const };
    expect(validateImpact(imp).passed).toBe(false);
  });

  it('fails when estimatedOccurrence is missing', () => {
    const imp = { ...makeBugData().impact, estimatedOccurrence: '' as const };
    expect(validateImpact(imp).passed).toBe(false);
  });
});

// ─── Evidence ────────────────────────────────────────────────────────────────

describe('validateEvidence', () => {
  it('passes with any evidence reference', () => {
    expect(validateEvidence(makeBugData().evidence).passed).toBe(true);
  });

  it('fails when all evidence fields are empty', () => {
    const ev = { screenshotReferences: '', videoReferences: '', logDetails: '', testCaseIds: '' };
    expect(validateEvidence(ev).passed).toBe(false);
  });
});

// ─── Duplicate Search ─────────────────────────────────────────────────────────

describe('validateDuplicateSearch', () => {
  it('passes when search performed and outcome is none', () => {
    expect(validateDuplicateSearch(makeBugData().duplicateSearch).passed).toBe(true);
  });

  it('fails when search not performed', () => {
    const dup = { ...makeBugData().duplicateSearch, searchPerformed: false };
    expect(validateDuplicateSearch(dup).passed).toBe(false);
  });

  it('fails when outcome is open_match', () => {
    const dup = { ...makeBugData().duplicateSearch, outcome: 'open_match' as const };
    expect(validateDuplicateSearch(dup).passed).toBe(false);
    expect(validateDuplicateSearch(dup).message).toMatch(/open duplicate/i);
  });

  it('passes when outcome is closed_match', () => {
    const dup = { ...makeBugData().duplicateSearch, outcome: 'closed_match' as const, linkedIssueKeys: ['TEST-100'] };
    expect(validateDuplicateSearch(dup).passed).toBe(true);
  });
});

// ─── Full checklist ───────────────────────────────────────────────────────────

describe('runChecklist', () => {
  it('passes a complete, valid Software bug', () => {
    const result = runChecklist(makeBugData());
    expect(result.passed).toBe(true);
    expect(result.items.every((i) => i.passed)).toBe(true);
  });

  it('fails and reports specific items when data is incomplete', () => {
    const data = makeBugData({
      summary: { category: '', subCategory: '', problemStatement: '', conditionClause: '' },
      evidence: { screenshotReferences: '', videoReferences: '', logDetails: '', testCaseIds: '' },
    });
    const result = runChecklist(data);
    expect(result.passed).toBe(false);
    const failing = result.items.filter((i) => !i.passed).map((i) => i.key);
    expect(failing).toContain('summary');
    expect(failing).toContain('evidence');
  });
});
