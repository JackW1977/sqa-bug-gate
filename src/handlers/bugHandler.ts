import { storage } from '@forge/api';
import type { SQABugData, IssueGateState } from '../utils/sqaInstructionModel';
import {
  createJiraIssue,
  addIssueLink,
  formatDescription,
} from '../utils/jiraClient';
import { assembleSummary } from '../utils/validator';
import { runChecklist } from '../utils/validator';
import { recordChecklistResult } from '../utils/metrics';
import { getAppConfig, browseUrl } from '../utils/config';

const GATE_STATE_PREFIX = 'sqa:gate:';

export function gateStateKey(issueKey: string): string {
  return `${GATE_STATE_PREFIX}${issueKey}`;
}

// ─── Assemble Jira description ────────────────────────────────────────────────

function buildDescription(data: SQABugData): string {
  const env = data.environment;
  const envText = [
    env.softwareVersion && `- Software Version: ${env.softwareVersion}`,
    env.branchRelease && `- Branch/Release: ${env.branchRelease}`,
    env.buildNumber && `- Build Number: ${env.buildNumber}`,
    env.hardwareConfig && `- Hardware Config: ${env.hardwareConfig}`,
    env.mode && `- Mode: ${env.mode}`,
    env.keySettings && `- Key Settings: ${env.keySettings}`,
    env.dataProcedureContext && `- Data/Procedure Context: ${env.dataProcedureContext}`,
    env.unknownReason && `- Unknown Reason: ${env.unknownReason}`,
  ]
    .filter(Boolean)
    .join('\n');

  const pre = data.preconditions;
  const preText = pre.noPreconditions
    ? `No special preconditions. ${pre.noPreconditionsExplanation}`
    : pre.preconditions;

  const str = data.stepsToReproduce;
  const stepsText = [
    `Initial State: ${str.initialState}`,
    ...str.steps
      .filter((s) => s.trim())
      .map((s, i) => `${i + 1}. ${s}`),
    `Reproducibility: ${str.reproducibility}`,
    str.intermittentNotes && `Intermittent Notes: ${str.intermittentNotes}`,
  ]
    .filter(Boolean)
    .join('\n');

  const imp = data.impact;
  const impText = [
    `User/Workflow Impact: ${imp.userWorkflowImpact}`,
    imp.safetyRelevance && `Safety Relevance: ${imp.safetyRelevance}`,
    `Workaround: ${imp.workaroundDescription || 'None described'} (${imp.workaroundPracticality || 'N/A'})`,
    `Estimated Occurrence: ${imp.estimatedOccurrence}`,
  ]
    .filter(Boolean)
    .join('\n');

  const ev = data.evidence;
  const evText = [
    ev.screenshotReferences && `Screenshots: ${ev.screenshotReferences}`,
    ev.videoReferences && `Videos: ${ev.videoReferences}`,
    ev.logDetails && `Logs: ${ev.logDetails}`,
    ev.testCaseIds && `Test Case IDs: ${ev.testCaseIds}`,
    '⚠ Attach actual files to this issue via the Jira attachments panel.',
  ]
    .filter(Boolean)
    .join('\n');

  const tr = data.traceability;
  const trText = [
    tr.requirementIds && `Requirement IDs: ${tr.requirementIds}`,
    tr.riskItemIds && `Risk Item IDs: ${tr.riskItemIds}`,
    tr.relatedJiraKeys && `Related Jira Keys: ${tr.relatedJiraKeys}`,
  ]
    .filter(Boolean)
    .join('\n');

  const cl = data.classification;
  const clText = [
    cl.type && `Type suggestion: ${cl.type}`,
    cl.impactCategory && `Impact category: ${cl.impactCategory}`,
    cl.prioritySuggestion &&
      `Priority suggestion: ${cl.prioritySuggestion}${cl.priorityRationale ? ` — ${cl.priorityRationale}` : ''}`,
    '⚠ SQA suggestion only; final severity/priority set by triage/product/engineering.',
  ]
    .filter(Boolean)
    .join('\n');

  const sections: Record<string, string> = {
    'Environment': envText,
    'Preconditions': preText,
    'Steps to Reproduce': stepsText,
    'Expected Behavior': data.expectedActual.expectedBehavior,
    'Actual Behavior': data.expectedActual.actualBehavior,
  };
  if (data.expectedActual.notes) sections['Notes / Suspected Cause'] = data.expectedActual.notes;
  sections['Impact (SQA View)'] = impText;
  sections['Evidence & Attachments'] = evText;
  if (trText) sections['Traceability'] = trText;
  if (clText) sections['Classification Suggestion (SQA)'] = clText;

  return formatDescription(sections);
}

// ─── Create Bug ───────────────────────────────────────────────────────────────

export interface CreateBugPayload {
  bugData: SQABugData;
}

export interface CreateBugResult {
  success: boolean;
  issueKey?: string;
  issueUrl?: string;
  error?: string;
  validationFailed?: boolean;
  failingItems?: string[];
}

export async function createBug(payload: CreateBugPayload): Promise<CreateBugResult> {
  const { bugData } = payload;

  // Final gate check before creating
  const validation = runChecklist(bugData);
  await recordChecklistResult('pending', validation);

  if (!validation.passed) {
    return {
      success: false,
      validationFailed: true,
      failingItems: validation.items.filter((i) => !i.passed).map((i) => i.message),
      error: 'SQA checklist has failing items. Fix them before submitting.',
    };
  }

  const summary = assembleSummary(bugData.summary);
  const description = buildDescription(bugData);

  const priorityMap: Record<string, string> = {
    Highest: 'Highest',
    High: 'High',
    Medium: 'Medium',
    Low: 'Low',
  };
  const priority = bugData.classification.prioritySuggestion
    ? priorityMap[bugData.classification.prioritySuggestion]
    : undefined;

  let created;
  try {
    created = await createJiraIssue({
      projectKey: bugData.projectKey,
      summary,
      description,
      issueType: 'Bug',
      priority,
    });
  } catch (err) {
    return { success: false, error: String(err) };
  }

  // Persist gate state
  const gateState: IssueGateState = {
    issueKey: created.key,
    lastChecked: new Date().toISOString(),
    sqaData: bugData,
    validationResult: validation,
  };
  await storage.set(gateStateKey(created.key), gateState);
  await recordChecklistResult(created.key, validation);

  // Link to closed duplicate if applicable
  if (
    bugData.duplicateSearch.outcome === 'closed_match' &&
    bugData.duplicateSearch.linkedIssueKeys.length > 0
  ) {
    for (const linkedKey of bugData.duplicateSearch.linkedIssueKeys) {
      try {
        await addIssueLink(created.key, linkedKey, 'Relates');
      } catch {
        // Non-fatal: log and continue
        console.warn(`[SQA] Could not create link from ${created.key} to ${linkedKey}`);
      }
    }
  }

  const config = await getAppConfig();
  return {
    success: true,
    issueKey: created.key,
    issueUrl: browseUrl(created.key, config),
  };
}

// ─── Fetch stored gate state ──────────────────────────────────────────────────

export async function getGateState(issueKey: string): Promise<IssueGateState | null> {
  return (await storage.get(gateStateKey(issueKey)) as IssueGateState | undefined) ?? null;
}

export async function saveGateState(state: IssueGateState): Promise<void> {
  await storage.set(gateStateKey(state.issueKey), state);
}
