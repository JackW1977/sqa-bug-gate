import React, { useEffect } from 'react';
import type { SoftwareBugData, AppConfig } from '../../types';
import FormField from '../common/FormField';

interface Props {
  projects: Array<{ key: string; name: string }>;
  bugData: SoftwareBugData;
  onChange: (patch: Partial<SoftwareBugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

const StepProject: React.FC<Props> = ({ projects, bugData, onChange, onValidate, config }) => {
  const governed = config.governedProjects.length > 0
    ? projects.filter((p) => config.governedProjects.includes(p.key))
    : projects;

  useEffect(() => {
    onValidate(!!bugData.projectKey);
  }, [bugData.projectKey]);

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', color: '#172B4D' }}>Select Project</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Choose the Jira project where this Software bug will be created.
      </p>

      <FormField label="Jira Project" required>
        <select
          value={bugData.projectKey}
          onChange={(e) => onChange({ projectKey: e.target.value })}
          style={{ width: '100%', padding: '8px', border: '2px solid #DFE1E6', borderRadius: '4px', fontSize: '14px' }}
        >
          <option value="">— Select a project —</option>
          {governed.map((p) => (
            <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
          ))}
        </select>
      </FormField>
    </div>
  );
};

export default StepProject;
