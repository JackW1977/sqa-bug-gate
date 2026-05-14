import { extractKeywords, buildOpenDuplicateJQL, buildClosedDuplicateJQL } from '../src/utils/duplicateSearch';
import type { SoftwareBugData } from '../src/utils/SoftwareInstructionModel';

function makeData(overrides: Partial<SoftwareBugData['summary']> = {}): SoftwareBugData {
  return {
    projectKey: 'PROJ',
    summary: {
      category: 'R&C',
      subCategory: 'BC',
      problemStatement: 'Bronchoscope view freezes and turns black',
      conditionClause: 'when connecting via USB on cold boot',
      ...overrides,
    },
    environment: {
      softwareVersion: '1.4.0.1-37', branchRelease: '1D.0 dev', buildNumber: '37',
      hardwareConfig: '', mode: '', keySettings: '', dataProcedureContext: '', unknownReason: '',
    },
    preconditions: { preconditions: '', noPreconditions: false, noPreconditionsExplanation: '' },
    stepsToReproduce: { initialState: '', steps: [], reproducibility: '', intermittentNotes: '' },
    expectedActual: { expectedBehavior: '', actualBehavior: '', notes: '' },
    impact: { userWorkflowImpact: '', safetyRelevance: '', workaroundDescription: '', workaroundPracticality: '', estimatedOccurrence: '' },
    evidence: { screenshotReferences: '', videoReferences: '', logDetails: '', testCaseIds: '' },
    traceability: { requirementIds: '', riskItemIds: '', relatedJiraKeys: '' },
    classification: { type: '', impactCategory: '', prioritySuggestion: '', priorityRationale: '' },
    duplicateSearch: { searchPerformed: false, searchQuery: '', results: [], outcome: '', linkedIssueKeys: [] },
  };
}

// ─── extractKeywords ─────────────────────────────────────────────────────────

describe('extractKeywords', () => {
  it('extracts meaningful words, ignoring stop words', () => {
    const kw = extractKeywords('The scope view freezes and turns black on cold boot');
    expect(kw).toContain('scope');
    expect(kw).toContain('freezes');
    expect(kw).toContain('turns');
    expect(kw).not.toContain('the');
    expect(kw).not.toContain('and');
    expect(kw).not.toContain('on');
  });

  it('filters out words with 3 or fewer characters', () => {
    const kw = extractKeywords('USB log off at end');
    expect(kw).not.toContain('usb');
    expect(kw).not.toContain('log');
    expect(kw).not.toContain('off');
  });

  it('limits output to 5 keywords', () => {
    const kw = extractKeywords('bronchoscope camera navigation freezes blackout disconnects during procedure selection startup');
    expect(kw.length).toBeLessThanOrEqual(5);
  });

  it('returns empty array for empty input', () => {
    expect(extractKeywords('')).toEqual([]);
  });
});

// ─── buildOpenDuplicateJQL ───────────────────────────────────────────────────

describe('buildOpenDuplicateJQL', () => {
  it('includes project key, issuetype Bug, and open status filter', () => {
    const jql = buildOpenDuplicateJQL(makeData());
    expect(jql).toContain('project = "PROJ"');
    expect(jql).toContain('issuetype = Bug');
    expect(jql).toContain('statusCategory != Done');
  });

  it('includes the [Category]-[SubCategory] pattern in the summary clause', () => {
    const jql = buildOpenDuplicateJQL(makeData());
    expect(jql).toContain('[R&C]-[BC]');
  });

  it('includes extracted keywords', () => {
    const jql = buildOpenDuplicateJQL(makeData());
    // At least one keyword from "Bronchoscope view freezes" should appear
    expect(jql).toMatch(/bronchoscope|freezes|turns|black|connecting/i);
  });

  it('omits project clause when projectKey is empty', () => {
    const data = makeData();
    data.projectKey = '';
    const jql = buildOpenDuplicateJQL(data);
    expect(jql).not.toContain('project =');
  });

  it('orders by created DESC', () => {
    const jql = buildOpenDuplicateJQL(makeData());
    expect(jql).toContain('ORDER BY created DESC');
  });
});

// ─── buildClosedDuplicateJQL ─────────────────────────────────────────────────

describe('buildClosedDuplicateJQL', () => {
  it('filters for Done status category', () => {
    const jql = buildClosedDuplicateJQL(makeData());
    expect(jql).toContain('statusCategory = Done');
  });

  it('orders by updated DESC', () => {
    const jql = buildClosedDuplicateJQL(makeData());
    expect(jql).toContain('ORDER BY updated DESC');
  });

  it('still includes the category label', () => {
    const jql = buildClosedDuplicateJQL(makeData());
    expect(jql).toContain('[R&C]-[BC]');
  });
});
