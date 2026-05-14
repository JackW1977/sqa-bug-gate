import { getIssue } from '../utils/jiraClient';
import { getAppConfig, isGoverned, isGatedStatus } from '../utils/config';
import { getGateState } from './bugHandler';
import { runChecklist, assembleSummary, summaryMatchesPattern } from '../utils/validator';
import { recordChecklistResult } from '../utils/metrics';
import type { SoftwareBugData } from '../utils/SoftwareInstructionModel';

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

  // Attempt to load stored Software gate state
  const state = await getGateState(issueKey);

  if (!state) {
    // No Software data at all — check if summary at least matches the pattern
    try {
      const jiraIssue = await getIssue(issueKey);
      const summary = jiraIssue.fields.summary;
      if (!summaryMatchesPattern(summary)) {
        return {
          errors: [
            {
              message:
                `[Software Bug Gate] Cannot transition "${issueKey}" to "${toStatus}": ` +
                'No Software data found and summary does not follow the ' +
                '[Category]-[Sub-Category]: ... pattern. ' +
                'Use the "New Software Bug" wizard to create Software-quality bug reports.',
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
              `[Software Bug Gate] Cannot verify Software compliance for "${issueKey}". ` +
              'Please ensure the bug was created via the Software Bug Gate wizard.',
          },
        ],
      };
    }

    return {
      errors: [
        {
          message:
            `[Software Bug Gate] "${issueKey}" has no Software gate data. ` +
            'Fill in all required Software sections before transitioning to "' +
            toStatus + '".',
        },
      ],
    };
  }

  // Re-run the full checklist against stored data
  const result = runChecklist(state.SoftwareData);
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
            `[Software Bug Gate] Cannot transition "${issueKey}" to "${toStatus}". ` +
            `The following Software checklist items are incomplete:\n${failures}`,
        },
      ],
    };
  }

  // Check duplicate search
  if (!state.SoftwareData.duplicateSearch.searchPerformed) {
    return {
      errors: [
        {
          message:
            `[Software Bug Gate] Cannot transition "${issueKey}" to "${toStatus}": ` +
            'Duplicate search has not been performed. ' +
            'Use the Software Bug Gate panel to run the duplicate search.',
        },
      ],
    };
  }

  if (state.SoftwareData.duplicateSearch.outcome === 'open_match') {
    const linked = state.SoftwareData.duplicateSearch.linkedIssueKeys.join(', ');
    return {
      errors: [
        {
          message:
            `[Software Bug Gate] Cannot transition "${issueKey}" to "${toStatus}": ` +
            `An open duplicate was identified (${linked}). ` +
            'Add evidence to the existing bug instead.',
        },
      ],
    };
  }

  return {};
}
