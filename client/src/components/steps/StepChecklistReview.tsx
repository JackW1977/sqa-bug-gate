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

  const pre = data.preconditions;
  const str = data.stepsToReproduce;
  const hw = data.environment.hardwareConfig;
  const preOk = !!hw.trim() &&
    ((pre.noPreconditions && !!pre.noPreconditionsExplanation.trim()) || (!pre.noPreconditions && !!pre.preconditions.trim())) &&
    !!str.initialState.trim() && str.steps.filter(s => s.trim()).length >= 2;
  items.push({
    key: 'preconditions', label: 'Preconditions & steps — hardware, preconditions, initial state, ≥2 steps',
    passed: preOk, message: preOk ? '' : 'Hardware config, preconditions, initial state, and at least 2 steps are required.',
  });

  const ea = data.expectedActual;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const eaOk = !!ea.expectedBehavior.trim() && !!ea.actualBehavior.trim() &&
    norm(ea.expectedBehavior) !== norm(ea.actualBehavior);
  items.push({
    key: 'expectedActual', label: 'Expected vs actual behavior — clearly differentiated',
    passed: eaOk, message: eaOk ? '' : 'Both expected and actual are required and must differ.',
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

  return items;
}

// ── Overview helpers ──────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '160px 1fr', gap: '6px',
  padding: '6px 0', borderBottom: '1px solid #F4F5F7', alignItems: 'start',
};

function OField({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  if (!value?.trim()) return null;
  return (
    <div style={fieldStyle}>
      <span style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', paddingTop: '2px' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', color: '#172B4D', whiteSpace: 'pre-wrap', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </span>
    </div>
  );
}

function OSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2px' }}>
      <div style={{
        background: '#F4F5F7', padding: '5px 14px',
        fontWeight: 700, fontSize: '11px', color: '#344563',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        borderBottom: '1px solid #DFE1E6',
      }}>
        {title}
      </div>
      <div style={{ padding: '2px 14px 6px' }}>{children}</div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const StepChecklistReview: React.FC<Props> = ({ bugData, isSubmitting, onSubmit, onValidate }) => {
  const items = useMemo(() => clientChecklist(bugData), [bugData]);
  const allPass = items.every((i) => i.passed);

  React.useEffect(() => { onValidate(allPass); }, [allPass]);

  const s = bugData.summary;
  const assembled = s.category
    ? `[${s.category}]-[${s.subCategory}]: ${s.problemStatement}${s.conditionClause ? ' ' + s.conditionClause : ''}`.trim()
    : '(summary not yet built)';

  const pre = bugData.preconditions;
  const str = bugData.stepsToReproduce;
  const ea = bugData.expectedActual;
  const ev = bugData.evidence;
  const tr = bugData.traceability;
  const dup = bugData.duplicateSearch;

  const preconditionsText = pre.noPreconditions
    ? `No special preconditions — ${pre.noPreconditionsExplanation}`
    : pre.preconditions;

  const stepsText = str.steps
    .map((step, i) => step.trim() ? `${i + 1}. ${step.trim()}` : null)
    .filter(Boolean)
    .join('\n');

  const dupOutcomeLabel =
    dup.outcome === 'none' ? '✅ No match — proceeding with new bug' :
    dup.outcome === 'closed_match' ? `🔄 Re-occurrence of closed bug${dup.linkedIssueKeys.length ? ` (${dup.linkedIssueKeys.join(', ')})` : ''}` :
    dup.outcome === 'open_match' ? `🚫 Open duplicate — ${dup.linkedIssueKeys.join(', ')}` :
    '—';

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>Review & Submit</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        All checklist items must pass before the bug can be created.
      </p>

      {/* ── Checklist ── */}
      <div style={{ border: '1px solid #DFE1E6', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ background: '#F4F5F7', padding: '10px 16px', fontWeight: 700, fontSize: '14px', borderBottom: '2px solid #DFE1E6' }}>
          SQA Pre-Submit Checklist —{' '}
          {allPass
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

      {/* ── Bug overview ── */}
      <div style={{ border: '1px solid #DFE1E6', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ background: '#0052CC', padding: '10px 16px', fontWeight: 700, fontSize: '13px', color: '#fff' }}>
          Bug Report Overview
        </div>

        <OSection title="Project">
          <OField label="Jira Project" value={bugData.projectKey || '—'} />
        </OSection>

        <OSection title="Summary">
          <OField label="Jira Title" value={assembled} />
          <OField label="Category" value={s.category ? `${s.category} / ${s.subCategory}` : undefined} />
          <OField label="Problem" value={s.problemStatement} />
          <OField label="Condition" value={s.conditionClause} />
        </OSection>

        <OSection title="Preconditions & Steps">
          <OField label="Hardware" value={bugData.environment.hardwareConfig} />
          <OField label="Preconditions" value={preconditionsText} />
          <OField label="Initial State" value={str.initialState} />
          <OField label="Steps" value={stepsText} mono />
        </OSection>

        <OSection title="Expected vs Actual">
          <OField label="Expected" value={ea.expectedBehavior} />
          <OField label="Actual" value={ea.actualBehavior} />
          <OField label="Notes" value={ea.notes} />
        </OSection>

        <OSection title="Evidence">
          <OField label="Screenshots" value={ev.screenshotReferences} />
          <OField label="Videos" value={ev.videoReferences} />
          <OField label="Logs" value={ev.logDetails} />
          <OField label="Test Case IDs" value={ev.testCaseIds} />
        </OSection>

        {(tr.requirementIds || tr.riskItemIds || tr.relatedJiraKeys) && (
          <OSection title="Traceability">
            <OField label="Requirements" value={tr.requirementIds} />
            <OField label="Risk Items" value={tr.riskItemIds} />
            <OField label="Related Issues" value={tr.relatedJiraKeys} />
          </OSection>
        )}

        <OSection title="Duplicate Search">
          <OField label="Outcome" value={dupOutcomeLabel} />
          <OField label="Search Query" value={dup.searchQuery} mono />
        </OSection>
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
