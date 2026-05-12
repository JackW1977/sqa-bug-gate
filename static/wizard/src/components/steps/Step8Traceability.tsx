import React, { useEffect } from 'react';
import type { SQABugData, AppConfig, SQATraceabilityData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

// Traceability is fully optional — always valid
const Step8Traceability: React.FC<Props> = ({ bugData, onChange, onValidate }) => {
  const d = bugData.traceability;

  useEffect(() => { onValidate(true); }, []);

  function update(patch: Partial<SQATraceabilityData>) {
    onChange({ traceability: { ...d, ...patch } });
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>7 — Traceability Links</h3>
      <p style={{ margin: '0 0 8px', color: '#5E6C84', fontSize: '13px' }}>
        Optional — link to requirements, risk items, or related Jira issues when known. Do not guess.
      </p>

      <ValidationMessage appearance="info">
        All fields on this step are optional. Leave blank if the links are unknown.
      </ValidationMessage>

      <FormField label="Requirement ID(s)" hint="e.g. REQ-1042, REQ-1053">
        <input type="text" value={d.requirementIds}
          placeholder="REQ-1042, REQ-1053"
          onChange={(e) => update({ requirementIds: e.target.value })} style={inp} />
      </FormField>

      <FormField label="Risk Item ID(s)" hint="e.g. RISK-214, RISK-287">
        <input type="text" value={d.riskItemIds}
          placeholder="RISK-214"
          onChange={(e) => update({ riskItemIds: e.target.value })} style={inp} />
      </FormField>

      <FormField label="Related Jira Keys" hint="Duplicates (closed), similar bugs, linked improvements.">
        <input type="text" value={d.relatedJiraKeys}
          placeholder="PROJ-1234, PROJ-1256"
          onChange={(e) => update({ relatedJiraKeys: e.target.value })} style={inp} />
      </FormField>
    </div>
  );
};

export default Step8Traceability;
