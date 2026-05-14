import { runChecklist } from '../utils/validator';
import { getGateState, saveGateState } from './bugHandler';
import { recordChecklistResult, recordMissingInfo } from '../utils/metrics';
import type { ValidationResult, IssueGateState } from '../utils/SoftwareInstructionModel';

export interface GetChecklistStatusPayload {
  issueKey: string;
}

export interface GetChecklistStatusResult {
  success: boolean;
  issueKey: string;
  validationResult?: ValidationResult;
  lastChecked?: string;
  error?: string;
  noData?: boolean;
}

export async function getChecklistStatus(
  payload: GetChecklistStatusPayload,
): Promise<GetChecklistStatusResult> {
  const { issueKey } = payload;

  const state = await getGateState(issueKey);
  if (!state) {
    return { success: true, issueKey, noData: true };
  }

  // Re-run checklist to get fresh result from current stored data
  const freshResult = runChecklist(state.SoftwareData);
  const changed =
    freshResult.passed !== state.validationResult.passed ||
    freshResult.items.some(
      (item, idx) => item.passed !== state.validationResult.items[idx]?.passed,
    );

  if (changed) {
    state.validationResult = freshResult;
    state.lastChecked = new Date().toISOString();
    await saveGateState(state);
    await recordChecklistResult(issueKey, freshResult);
  }

  return {
    success: true,
    issueKey,
    validationResult: state.validationResult,
    lastChecked: state.lastChecked,
  };
}

export interface ValidateChecklistPayload {
  issueKey: string;
}

export async function validateChecklist(
  payload: ValidateChecklistPayload,
): Promise<GetChecklistStatusResult> {
  const result = await getChecklistStatus(payload);

  if (result.validationResult && !result.validationResult.passed) {
    const failures = result.validationResult.items
      .filter((i) => !i.passed)
      .map((i) => i.key);
    await recordMissingInfo(payload.issueKey, failures);
  }

  return result;
}
