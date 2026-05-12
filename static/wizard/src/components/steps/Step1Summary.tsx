import React, { useEffect, useState } from 'react';
import type { SQABugData, AppConfig, CategoryConfig, SQASummaryData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';
import GleanButton from '../common/GleanButton';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

function validate(d: SQASummaryData): string | null {
  if (!d.category) return 'Select a category.';
  if (!d.subCategory) return 'Select a sub-category.';
  if (!d.problemStatement.trim() || d.problemStatement.trim().length < 10)
    return 'Problem statement must be at least 10 characters.';
  const vague = new Set(['system issue', 'bug found', "doesn't work", 'not working', 'issue', 'error', 'problem', 'bug']);
  if (vague.has(d.problemStatement.trim().toLowerCase()))
    return 'Title is too vague — describe the specific symptom.';
  if (!d.conditionClause.trim())
    return 'Add a "when/under what condition" clause.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

const Step1Summary: React.FC<Props> = ({ bugData, onChange, onValidate, config }) => {
  const d = bugData.summary;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SQASummaryData>) {
    onChange({ summary: { ...d, ...patch } });
    setTouched(true);
  }

  const selectedCategory = config.categories.find((c) => c.value === d.category);
  const subCategories = selectedCategory?.subCategories ?? [];
  const assembled = d.category && d.subCategory && d.problemStatement
    ? `[${d.category}]-[${d.subCategory}]: ${d.problemStatement}${d.conditionClause ? ' ' + d.conditionClause : ''}`
    : '';

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>1 — Summary</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Write a precise, user-visible problem statement. Pattern:{' '}
        <code style={{ background: '#F4F5F7', padding: '1px 4px', borderRadius: '3px' }}>
          [Category]-[Sub-Category]: Observed problem when &lt;condition&gt;
        </code>
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Category" required>
          <select
            value={d.category}
            onChange={(e) => update({ category: e.target.value, subCategory: '' })}
            style={inp}
          >
            <option value="">— Select category —</option>
            {config.categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Sub-Category" required>
          <select
            value={d.subCategory}
            onChange={(e) => update({ subCategory: e.target.value })}
            style={inp}
            disabled={!d.category}
          >
            <option value="">— Select sub-category —</option>
            {subCategories.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        label="Problem Statement (user-visible symptom)"
        required
        hint="Describe what the user observes. No root-cause guesses here."
      >
        <input
          type="text"
          value={d.problemStatement}
          placeholder="e.g. Bronchoscope view freezes and turns black"
          onChange={(e) => update({ problemStatement: e.target.value })}
          style={inp}
        />
        <GleanButton value={d.problemStatement} onAccept={(v) => update({ problemStatement: v })} fieldContext="user-visible problem statement for a medical device SQA bug report" config={config} />
      </FormField>

      <FormField
        label="When / Under What Condition"
        required
        hint="e.g. when connecting via USB on a cold system boot"
      >
        <input
          type="text"
          value={d.conditionClause}
          placeholder="e.g. when starting a new procedure after TPS restart"
          onChange={(e) => update({ conditionClause: e.target.value })}
          style={inp}
        />
        <GleanButton value={d.conditionClause} onAccept={(v) => update({ conditionClause: v })} fieldContext="condition clause describing when/under what condition the bug occurs" config={config} />
      </FormField>

      {assembled && (
        <div style={{ background: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: '4px', padding: '12px 16px', marginTop: '8px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>ASSEMBLED SUMMARY PREVIEW</p>
          <p style={{ margin: 0, fontSize: '14px', color: '#172B4D', fontWeight: 500 }}>{assembled}</p>
        </div>
      )}
    </div>
  );
};

export default Step1Summary;
