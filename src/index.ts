import Resolver from '@forge/resolver';
import { createBug, getGateState } from './handlers/bugHandler';
import { searchDuplicates, saveDuplicateOutcome } from './handlers/searchHandler';
import { getChecklistStatus, validateChecklist } from './handlers/checklistHandler';
import { getConfig, updateConfig, listProjects, getIssueUrl } from './handlers/configHandler';
import { getMetrics } from './utils/metrics';
import { handleWorkflowValidation } from './handlers/workflowValidator';

// ─── Main resolver (used by wizard + panel Custom UI) ────────────────────────

const resolver = new Resolver();

// Bug creation
resolver.define('createBug', async ({ payload }) => {
  return createBug(payload as Parameters<typeof createBug>[0]);
});

// Duplicate search
resolver.define('searchDuplicates', async ({ payload }) => {
  return searchDuplicates(payload as Parameters<typeof searchDuplicates>[0]);
});

resolver.define('saveDuplicateOutcome', async ({ payload }) => {
  return saveDuplicateOutcome(payload as Parameters<typeof saveDuplicateOutcome>[0]);
});

// Checklist / panel
resolver.define('getChecklistStatus', async ({ payload }) => {
  return getChecklistStatus(payload as Parameters<typeof getChecklistStatus>[0]);
});

resolver.define('validateChecklist', async ({ payload }) => {
  return validateChecklist(payload as Parameters<typeof validateChecklist>[0]);
});

// Gate state read (for panel edit deep-link data)
resolver.define('getGateState', async ({ payload }) => {
  const { issueKey } = payload as { issueKey: string };
  return getGateState(issueKey);
});

// Config
resolver.define('getConfig', async () => {
  return getConfig();
});

resolver.define('updateConfig', async ({ payload }) => {
  return updateConfig(payload as Parameters<typeof updateConfig>[0]);
});

resolver.define('listProjects', async () => {
  return listProjects();
});

resolver.define('getIssueUrl', async ({ payload }) => {
  const { issueKey } = payload as { issueKey: string };
  return getIssueUrl(issueKey);
});

// Metrics
resolver.define('getMetrics', async ({ payload }) => {
  const { limit } = (payload ?? {}) as { limit?: number };
  return getMetrics(limit);
});

export const handler = resolver.getDefinitions();

// ─── Workflow validator ───────────────────────────────────────────────────────

export async function workflowValidatorHandler(
  event: unknown,
  _context: unknown,
): Promise<{ errors?: Array<{ message: string }> }> {
  try {
    return await handleWorkflowValidation(
      event as Parameters<typeof handleWorkflowValidation>[0],
    );
  } catch (err) {
    console.error('[SQA WorkflowValidator] Unexpected error:', err);
    // Fail open to avoid blocking non-SQA transitions due to app errors
    return {};
  }
}
