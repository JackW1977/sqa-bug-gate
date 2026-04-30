import React, { useMemo } from 'react';
import type { SQABugData, AppConfig, ChecklistItem } from '../../types';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
  isSubmitting: boolean;
  onSubmit: () => void;
}

// ── Client-side checklist mirrors backend validator.ts ──────────────────────

function clientChecklist(data: SQABugData): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  const s = data.summary;
  const sumOk = !!s.category && !!s.subCategory && s.problemStatement.trim().length >= 10 && !!s.conditionClause.trim();
  items.push({
    key: 'summary', label: 'Summary — category, sub-category, user-visible problem',
    passed: sumOk,
    message: sumOk ? '' : 'Category, sub-category, problem statement (≥10 chars), and condition clause are required.',
  });

  const env = data.environment;
  const envOk = !!(env.softwareVersion || env.unknownReason) && !!(env.branchRelease || env.unknownReason) &&
    !!(env.hardwareConfig || env.unknownReason) && !!(env.mode || env.unknownReason);
  items.push({
    key: 'environment', label: 'Environment — version, branch, hardware, mode',
    passed: envOk, message: envOk ? '' : 'Fill all environment fields or provide an "Unknown – reason".',
  });

  const pre = data.preconditions;
  const preOk = (pre.noPreconditions && !!pre.noPreconditionsExplanation.trim()) ||
    (!pre.noPreconditions && !!pre.preconditions.trim());
  items.push({
    key: 'preconditions', label: 'Preconditions — documented or explicitly none',
    passed: preOk, message: preOk ? '' : 'Preconditions required, or check "No special preconditions" with explanation.',
  });

  const str = data.stepsToReproduce;
  const strOk = !!str.initialState.trim() && str.steps.filter(s => s.trim()).length >= 2 && !!str.reproducibility.trim();
  items.push({
    key: 'stepsToReproduce', label: 'Steps to reproduce — numbered, concrete, from initial state',
    passed: strOk, message: strOk ? '' : 'Initial state, at least 2 steps, and reproducibility rate are required.',
  });

  const ea = data.expectedActual;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const eaOk = !!ea.expectedBehavior.trim() && !!ea.actualBehavior.trim() &&
    norm(ea.expectedBehavior) !== norm(ea.actualBehavior);
  items.push({
    key: 'expectedActual', label: 'Expected vs actual behavior — clearly differentiated',
    passed: eaOk, message: eaOk ? '' : 'Both expected and actual are required and must differ.',
  });

  const imp = data.impact;
  const impOk = !!imp.userWorkflowImpact.trim() && !!imp.estimatedOccurrence &&
    (!!(imp.workaroundPracticality) || !!imp.workaroundDescription.trim());
  items.push({
    key: 'impact', label: 'Impact — user/workflow effect, workaround, frequency',
    passed: impOk, message: impOk ? '' : 'User impact, workaround, and occurrence frequency are required.',
  });

  const ev = data.evidence;
  const evOk = !!(ev.screenshotReferences || ev.videoReferences || ev.logDetails || ev.testCaseIds);
  items.push({
    key: 'evidence', label: 'Evidence — logs, screenshots, test IDs referenced',
    passed: evOk, message: evOk ? '' : 'At least one evidence reference is required.',
  });

  const dup = data.duplicateSearch;
  const dupOk = dup.searchPerformed && !!dup.outcome && dup.outcome !== 'open_match';
  items.push({
    key: 'duplicateSearch', label: 'Duplicate search — performed and outcome resolved',
    passed: dupOk,
    message: !dup.searchPerformed ? 'Duplicate search not performed.' :
      !dup.outcome ? 'Select a duplicate search outcome.' :
      dup.outcome === 'open_match' ? 'Open duplicate found — add evidence to the existing bug.' : '',
  });

  const cl = data.classification;
  const clOk = !(cl.impactCategory === 'Blocker' && !cl.priorityRationale.trim());
  items.push({
    key: 'classification', label: 'Classification — Blocker requires rationale',
    passed: clOk, message: clOk ? '' : 'Blocker impact category requires a priority rationale.',
  });

  return items;
}

const StepChecklistReview: React.FC<Props> = ({ bugData, isSubmitting, onSubmit, onValidate }) => {
  const items = useMemo(() => clientChecklist(bugData), [bugData]);
  const allPass = items.every((i) => i.passed);

  React.useEffect(() => { onValidate(allPass); }, [allPass]);

  const assembled = bugData.summary.category
    ? `[${bugData.summary.category}]-[${bugData.summary.subCategory}]: ${bugData.summary.problemStatement} ${bugData.summary.conditionClause}`.trim()
    : '(summary not yet built)';

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>Review & Submit</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        All checklist items must pass before the bug can be created.
      </p>

      {/* Checklist */}
      <div style={{ border: '1px solid #DFE1E6', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ background: '#F4F5F7', padding: '10px 16px', fontWeight: 700, fontSize: '14px', borderBottom: '2px solid #DFE1E6' }}>
          SQA Pre-Submit Checklist — {allPass
            ? <span style={{ color: '#006644' }}>PASSED ✓</span>
            : <span style={{ color: '#DE350B' }}>FAILED ✗ ({items.filter(i => !i.passed).length} items)</span>
          }
        </div>
        {items.map((item) => (
          <div key={item.key} style={{
            padding: '10px 16px', borderBottom: '1px solid #DFE1E6',
            background: item.passed ? '#fff' : '#FFF0ED',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.passed ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontWeight: 500, fontSize: '13px', color: item.passed ? '#172B4D' : '#BF2600' }}>
                {item.label}
              </div>
              {!item.passed && item.message && (
                <div style={{ fontSize: '12px', color: '#DE350B', marginTop: '2px' }}>{item.message}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary preview */}
      <div style={{ background: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: '4px', padding: '12px 16px', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '13px', color: '#5E6C84' }}>JIRA SUMMARY PREVIEW</p>
        <p style={{ margin: 0, fontSize: '14px', color: '#172B4D', fontWeight: 500 }}>{assembled}</p>
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#5E6C84' }}>Project: <strong>{bugData.projectKey || '—'}</strong></p>
      </div>

      {!allPass && (
        <ValidationMessage appearance="warning" title="Checklist incomplete">
          Go back to the failing steps and complete the required information. Use the Back button to navigate.
        </ValidationMessage>
      )}

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onSubmit}
          disabled={!allPass || isSubmitting}
          style={{
            padding: '12px 32px', fontSize: '15px', fontWeight: 700,
            background: allPass ? '#00875A' : '#B3BAC5', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: allPass ? 'pointer' : 'not-allowed',
          }}
        >
          {isSubmitting ? '⏳ Creating Bug…' : '✓ Create SQA Bug in Jira'}
        </button>
      </div>
    </div>
  );
};

export default StepChecklistReview;
