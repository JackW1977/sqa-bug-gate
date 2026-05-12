import React, { useEffect, useState } from 'react';
import { api } from './api';
import WizardContainer from './components/WizardContainer';
import AdminConfig from './components/AdminConfig';
import type { AppConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [projects, setProjects] = useState<Array<{ key: string; name: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Detect admin via URL path
    setIsAdmin(window.location.pathname === '/admin');

    (async () => {
      try {
        const [configRes, projectsRes] = await Promise.all([
          api<{ success: boolean; config?: AppConfig; error?: string }>('getConfig'),
          api<{ success: boolean; projects?: Array<{ key: string; name: string }>; error?: string }>('listProjects'),
        ]);

        if (configRes.success && configRes.config) {
          setConfig(configRes.config);
        } else {
          setError(configRes.error ?? 'Failed to load config');
        }

        if (projectsRes.success && projectsRes.projects) {
          const governed = configRes.config?.governedProjects ?? [];
          setProjects(
            governed.length > 0
              ? (projectsRes.projects ?? []).filter((p) => governed.includes(p.key))
              : (projectsRes.projects ?? []),
          );
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <span>Loading SQA Bug Gate…</span>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div style={{ padding: '24px', color: '#DE350B' }}>
        <strong>Error loading SQA Bug Gate:</strong> {error}
      </div>
    );
  }

  if (isAdmin) {
    return <AdminConfig config={config} />;
  }

  return <WizardContainer config={config} projects={projects} />;
};

export default App;
