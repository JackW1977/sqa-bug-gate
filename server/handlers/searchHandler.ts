import type { SQABugData, SQADuplicateSearchData, DuplicateOutcome } from '../utils/sqaInstructionModel';
import { performDuplicateSearch } from '../utils/duplicateSearch';
import { getAppConfig } from '../utils/config';
import { recordDuplicatePrevented } from '../utils/metrics';
import { getGateState, saveGateState } from './bugHandler';

export interface SearchDuplicatesPayload {
  bugData: SQABugData;
}

export interface SearchDuplicatesResult {
  success: boolean;
  openResults: SQADuplicateSearchData['results'];
  closedResults: SQADuplicateSearchData['results'];
  openJql: string;
  closedJql: string;
  jiraSiteUrl: string;
  error?: string;
}

export async function searchDuplicates(
  payload: SearchDuplicatesPayload,
): Promise<SearchDuplicatesResult> {
  try {
    const config = await getAppConfig();
    const result = await performDuplicateSearch(payload.bugData, config);
    return {
      success: true,
      openResults: result.openResults,
      closedResults: result.closedResults,
      openJql: result.openJql,
      closedJql: result.closedJql,
      jiraSiteUrl: result.jiraSiteUrl,
    };
  } catch (err) {
    return {
      success: false,
      openResults: [],
      closedResults: [],
      openJql: '',
      closedJql: '',
      jiraSiteUrl: 'https://noahmed.atlassian.net',
      error: String(err),
    };
  }
}

export interface SaveDuplicateOutcomePayload {
  issueKey: string;
  outcome: DuplicateOutcome;
  linkedIssueKeys: string[];
  searchQuery: string;
}

export interface SaveDuplicateOutcomeResult {
  success: boolean;
  error?: string;
}

export async function saveDuplicateOutcome(
  payload: SaveDuplicateOutcomePayload,
): Promise<SaveDuplicateOutcomeResult> {
  const { issueKey, outcome, linkedIssueKeys, searchQuery } = payload;

  const state = await getGateState(issueKey);
  if (!state) {
    return { success: false, error: `No gate state found for ${issueKey}` };
  }

  state.sqaData.duplicateSearch = {
    ...state.sqaData.duplicateSearch,
    searchPerformed: true,
    outcome,
    linkedIssueKeys,
    searchQuery,
    performedAt: new Date().toISOString(),
  };

  if (outcome === 'open_match' && linkedIssueKeys.length > 0) {
    for (const key of linkedIssueKeys) {
      await recordDuplicatePrevented(issueKey, key);
    }
  }

  await saveGateState(state);
  return { success: true };
}
