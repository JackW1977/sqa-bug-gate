import React, { useEffect, useState } from 'react';
import type { SoftwareBugData, AppConfig, SoftwareEvidenceData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';
import GleanButton from '../common/GleanButton';

interface Props {
  bugData: SoftwareBugData;
  onChange: (patch: Partial<SoftwareBugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

function validate(d: SoftwareEvidenceData): string | null {
  const has = d.screenshotReferences.trim() || d.videoReferences.trim() ||
    d.logDetails.trim() || d.testCaseIds.trim();
  if (!has) return 'At least one evidence reference is required.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical',
};

const Step7Evidence: React.FC<Props> = ({ bugData, onChange, onValidate, config }) => {
  const d = bugData.evidence;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SoftwareEvidenceData>) {
    onChange({ evidence: { ...d, ...patch } });
    setTouched(true);
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>4 — Evidence & Attachments</h3>
      <p style={{ margin: '0 0 8px', color: '#5E6C84', fontSize: '13px' }}>
        Reference all supporting evidence below. Actual files must be attached directly to the Jira issue via its Attachments panel.
      </p>

      <div style={{
        background: '#DEEBFF', border: '1px solid #B3D4FF', borderRadius: '4px',
        padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#0747A6',
      }}>
        ℹ️ <strong>Attach files in Jira:</strong> After the bug is created, drag screenshots, videos, and log files onto the Jira issue page. Reference their names/locations in the fields below.
      </div>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <FormField label="Screenshot / Photo References" hint="File names or descriptions of screenshots captured.">
        <textarea rows={2} value={d.screenshotReferences}
          placeholder="e.g. scope_black_screen_2024-01-15.png, ui_state_after_freeze.png"
          onChange={(e) => update({ screenshotReferences: e.target.value })} style={inp} />
        <GleanButton value={d.screenshotReferences} onAccept={(v) => update({ screenshotReferences: v })} fieldContext="screenshot and photo references for a medical device software bug report" config={config} />
      </FormField>

      <FormField label="Video References" hint="Especially useful for timing-sensitive or intermittent issues.">
        <textarea rows={2} value={d.videoReferences}
          placeholder="e.g. repro_video_2024-01-15_14-32.mp4 (scope disconnect sequence)"
          onChange={(e) => update({ videoReferences: e.target.value })} style={inp} />
        <GleanButton value={d.videoReferences} onAccept={(v) => update({ videoReferences: v })} fieldContext="video recording references describing the timing-sensitive reproduction sequence" config={config} />
      </FormField>

      <FormField label="Log Collection Details" required={!d.screenshotReferences && !d.videoReferences && !d.testCaseIds}
        hint="Tool name, time window, timezone. Critical for intermittent issues.">
        <textarea rows={3} value={d.logDetails}
          placeholder="e.g. TPS system log, 2024-01-15 14:30–14:35 UTC-8, collected via Log Collector v2.1. Scope driver log same window."
          onChange={(e) => update({ logDetails: e.target.value })} style={inp} />
        <GleanButton value={d.logDetails} onAccept={(v) => update({ logDetails: v })} fieldContext="log collection details including tool name, time window, and timezone for a medical device bug" config={config} />
      </FormField>

      <FormField label="Test Case IDs / Run IDs / Plan Links"
        hint="Link to the failing test cases, test runs, or test plan cycles.">
        <textarea rows={2} value={d.testCaseIds}
          placeholder="e.g. TC-4521, TC-4522; Run ID: TR-1892; Plan: TP-Nav-1D.0"
          onChange={(e) => update({ testCaseIds: e.target.value })} style={inp} />
      </FormField>
    </div>
  );
};

export default Step7Evidence;
