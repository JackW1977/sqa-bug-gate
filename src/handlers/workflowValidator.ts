import { getIssue } from '../utils/jiraClient';
import { getAppConfig, isGoverned, isGatedStatus } from '../utils/config';
import { getGateState } from './bugHandler';
import { runChecklist, assembleSummary, summaryMatchesPattern } from '../utils/validator';
import { recordChecklistResult } from '../utils/metrics';
import type { SQABugData } from '../utils/sqaInstructionModel';

interface WorkflowEvent {
  transition: { name: string; toStatus: { name: string } };
  issue: { key: string; fields: { issuetype: { name: string }; project: { key: string } } };
}

interface ValidatorResult {
  errors?: Array<{ message: string }>;
}

export async function handleWorkflowValidation(
  event: WorkflowEvent,
): Promise<ValidatorResult> {
  const { issue, transition } = event;
  const issueKey = issue.key;
  const toStatus = transition.toStatus.name;
  const issueType = issue.fields.issuetype.name;
  const projectKey = issue.fields.project.key;

  const config = await getAppConfig();

  // Only gate governed projects/types
  if (!isGoverned(projectKey, issueType, config)) {
    return {};
  }

  // Only gate configured target statuses
  if (!isGatedStatus(toStatus, config)) {
    return {};
  }

  // Attempt to load stored SQA gate state
  const state = await getGateState(issueKey);

  if (!state) {
    // No SQA data at all — check if summary at least matches the pattern
    try {
      const jiraIssue = await getIssue(issueKey);
      const summary = jiraIssue.fields.summary;
      if (!summaryMatchesPattern(summary)) {
        return {
          errors: [
            {
              message:
                `[SQA Bug Gate] Cannot transition "${issueKey}" to "${toStatus}": ` +
                'No SQA data found and summary does not follow the ' +
                '[Category]-[Sub-Category]: ... pattern. ' +
                'Use the "New SQA Bug" wizard to create SQA-quality bug reports.',
            },
          ],
        };
      }
    } catch {
      // If we can't read the issue, fail safe by blocking
      return {
        errors: [
          {
            message:
              `[SQA Bug Gate] Cannot verify SQA compliance for "${issueKey}". ` +
              'Please ensure the bug was created via the SQA Bug Gate wizard.',
          },
        ],
      };
    }

    return {
      errors: [
        {
          message:
            `[SQA Bug Gate] "${issueKey}" has no SQA gate data. ` +
            'Fill in all required SQA sections before transitioning to "' +
            toStatus + '".',
        },
      ],
    };
  }

  // Re-run the full checklist against stored data
  const result = runChecklist(state.sqaData);
  await recordChecklistResult(issueKey, result);

  if (!result.passed) {
    const failures = result.items
      .filter((i) => !i.passed)
      .map((i) => `• ${i.label}: ${i.message}`)
      .join('\n');

    return {
      errors: [
        {
          message:
            `[SQA Bug Gate] Cannot transition "${issueKey}" to "${toStatus}". ` +
            `The following SQA checklist items are incomplete:\n${failures}`,
        },
      ],
    };
  }

  // Check duplicate search
  if (!state.sqaData.duplicateSearch.searchPerformed) {
    return {
      errors: [
        {
          message:
            `[SQA Bug Gate] Cannot transition "${issueKey}" to "${toStatus}": ` +
            'Duplicate search has not been performed. ' +
            'Use the SQA Bug Gate panel to run the duplicate search.',
        },
      ],
    };
  }

  if (state.sqaData.duplicateSearch.outcome === 'open_match') {
    const linked = state.sqaData.duplicateSearch.linkedIssueKeys.join(', ');
    return {
      errors: [
        {
          message:
            `[SQA Bug Gate] Cannot transition "${issueKey}" to "${toStatus}": ` +
            `An open duplicate was identified (${linked}). ` +
            'Add evidence to the existing bug instead.',
        },
      ],
    };
  }

  return {};
}
