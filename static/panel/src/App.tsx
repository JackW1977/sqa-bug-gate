import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import ChecklistPanel from './components/ChecklistPanel';

interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  message: string;
}

interface ValidationResult {
  passed: boolean;
  items: ChecklistItem[];
}

interface ChecklistStatusResult {
  success: boolean;
  issueKey: string;
  validationResult?: ValidationResult;
  lastChecked?: string;
  noData?: boolean;
  error?: string;
}

const App: React.FC = () => {
  const [issueKey, setIssueKey] = useState<string | null>(null);
  const [status, setStatus] = useState<ChecklistStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStatus(key: string) {
    const result = await invoke<ChecklistStatusResult>('getChecklistStatus', { issueKey: key });
    setStatus(result);
  }

  useEffect(() => {
    (async () => {
      try {
        const ctx = await view.getContext();
        const key: string = ctx.extension?.issue?.key ?? '';
        setIssueKey(key);
        if (key) await loadStatus(key);
      } catch (e) {
        setStatus({ success: false, issueKey: '', error: String(e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleRefresh() {
    if (!issueKey) return;
    setRefreshing(true);
    await loadStatus(issueKey);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', color: '#5E6C84', fontSize: '13px' }}>
        Loading SQA gate status…
      </div>
    );
  }

  return (
    <ChecklistPanel
      issueKey={issueKey ?? ''}
      status={status}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );
};

export default App;
