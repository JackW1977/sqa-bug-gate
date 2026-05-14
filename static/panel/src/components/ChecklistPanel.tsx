import React from 'react';
import GateStatus from './GateStatus';
import ChecklistItem from './ChecklistItem';

interface Item {
  key: string;
  label: string;
  passed: boolean;
  message: string;
}

interface ValidationResult {
  passed: boolean;
  items: Item[];
}

interface StatusResult {
  success: boolean;
  issueKey: string;
  validationResult?: ValidationResult;
  lastChecked?: string;
  noData?: boolean;
  error?: string;
}

interface ChecklistPanelProps {
  issueKey: string;
  status: StatusResult | null;
  refreshing: boolean;
  onRefresh: () => void;
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px', background: '#F4F5F7', color: '#344563',
  border: '1px solid #DFE1E6', borderRadius: '4px', fontSize: '12px',
  cursor: 'pointer', fontWeight: 500,
};

const ChecklistPanel: React.FC<ChecklistPanelProps> = ({
  issueKey, status, refreshing, onRefresh,
}) => {
  const fontBase: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '13px', color: '#172B4D',
  };

  if (!status?.success) {
    return (
      <div style={{ ...fontBase, padding: '12px' }}>
        <div style={{ color: '#DE350B', marginBottom: '8px' }}>
          {status?.error ?? 'Failed to load Software gate status.'}
        </div>
        <button style={btnStyle} onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : '↻ Retry'}
        </button>
      </div>
    );
  }

  if (status.noData) {
    return (
      <div style={{ ...fontBase, padding: '12px' }}>
        <div style={{
          background: '#FFFAE6', border: '1px solid #FF8B00', borderRadius: '4px',
          padding: '10px 14px', marginBottom: '12px', color: '#974F0C',
        }}>
          <strong>No Software data found</strong> for <strong>{issueKey}</strong>.
          <br />
          This bug was not created via the Software Bug Gate wizard, or Software data was not saved.
        </div>
        <p style={{ margin: '0 0 8px', color: '#5E6C84', fontSize: '12px' }}>
          To pass the Software gate, bugs should be created using the <strong>New Software Bug</strong> wizard
          (available from the Jira top navigation).
        </p>
        <button style={btnStyle} onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Checking…' : '↻ Re-check'}
        </button>
      </div>
    );
  }

  const { validationResult, lastChecked } = status;
  if (!validationResult) return null;

  const passing = validationResult.items.filter((i) => i.passed).length;
  const total = validationResult.items.length;

  return (
    <div style={{ ...fontBase, padding: '12px' }}>
      <GateStatus passed={validationResult.passed} lastChecked={lastChecked} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: '#5E6C84' }}>
          {passing}/{total} items pass
        </span>
        <button style={btnStyle} onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Failing items first, then passing */}
      <div style={{ border: '1px solid #DFE1E6', borderRadius: '4px', overflow: 'hidden' }}>
        {[...validationResult.items]
          .sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? 1 : -1))
          .map((item) => (
            <ChecklistItem
              key={item.key}
              label={item.label}
              passed={item.passed}
              message={item.message}
            />
          ))}
      </div>

      {!validationResult.passed && (
        <div style={{
          marginTop: '12px', padding: '10px 14px', background: '#DEEBFF',
          border: '1px solid #B3D4FF', borderRadius: '4px', fontSize: '12px', color: '#0747A6',
        }}>
          ℹ️ Fix the failing items above, then use <strong>New Software Bug</strong> (wizard) to update
          or recreate this bug. The workflow validator will block transition to "Ready for Triage"
          until all items pass.
        </div>
      )}
    </div>
  );
};

export default ChecklistPanel;
