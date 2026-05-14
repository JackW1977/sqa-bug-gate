import type { SoftwareBugData, DuplicateSearchResult, AppConfig } from './SoftwareInstructionModel';
import { searchIssues } from './jiraClient';
import { browseUrl } from './config';

// ─── JQL builders ────────────────────────────────────────────────────────────

/**
 * Extract up to 5 meaningful keywords from the problem statement and
 * condition clause for the duplicate JQL search.
 */
export function extractKeywords(text: string): string[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'of', 'and',
    'or', 'with', 'when', 'after', 'before', 'during', 'while', 'from',
    'not', 'no', 'for', 'this', 'that', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  ]);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, 5);
}

export function buildOpenDuplicateJQL(data: SoftwareBugData): string {
  const { category, subCategory, problemStatement, conditionClause } = data.summary;
  const projectClause = data.projectKey ? `project = "${data.projectKey}" AND ` : '';
  const categoryLabel = `[${category}]-[${subCategory}]`;

  const keywords = extractKeywords(`${problemStatement} ${conditionClause}`);
  const summaryTerms = keywords
    .map((k) => `summary ~ "${k}"`)
    .join(' AND ');

  const base = `${projectClause}issuetype = Bug AND statusCategory != Done`;
  const categoryFilter = `summary ~ "${categoryLabel}"`;
  const keywordFilter = summaryTerms ? ` AND (${summaryTerms})` : '';

  return `${base} AND (${categoryFilter}${keywordFilter}) ORDER BY created DESC`;
}

export function buildClosedDuplicateJQL(data: SoftwareBugData): string {
  const { category, subCategory, problemStatement, conditionClause } = data.summary;
  const projectClause = data.projectKey ? `project = "${data.projectKey}" AND ` : '';
  const categoryLabel = `[${category}]-[${subCategory}]`;

  const keywords = extractKeywords(`${problemStatement} ${conditionClause}`);
  const summaryTerms = keywords
    .map((k) => `summary ~ "${k}"`)
    .join(' AND ');

  const base = `${projectClause}issuetype = Bug AND statusCategory = Done`;
  const categoryFilter = `summary ~ "${categoryLabel}"`;
  const keywordFilter = summaryTerms ? ` AND (${summaryTerms})` : '';

  return `${base} AND (${categoryFilter}${keywordFilter}) ORDER BY updated DESC`;
}

// ─── Search execution ────────────────────────────────────────────────────────

export interface DuplicateSearchResponse {
  openResults: DuplicateSearchResult[];
  closedResults: DuplicateSearchResult[];
  openJql: string;
  closedJql: string;
  jiraSiteUrl: string;
}

function extractDescriptionText(description: unknown): string {
  if (!description) return '';
  if (typeof description === 'string') return description.slice(0, 300);
  // ADF format
  try {
    const adf = description as { content?: Array<{ content?: Array<{ text?: string }> }> };
    const texts: string[] = [];
    for (const block of adf.content ?? []) {
      for (const inline of block.content ?? []) {
        if (inline.text) texts.push(inline.text);
      }
    }
    return texts.join(' ').slice(0, 300);
  } catch {
    return '';
  }
}

function mapIssue(
  issue: {
    key: string;
    fields: {
      summary: string;
      status: { name: string; statusCategory: { key: string } };
      description?: unknown;
      assignee?: { displayName: string } | null;
      created: string;
    };
  },
  config: AppConfig,
): DuplicateSearchResult {
  return {
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    statusCategory: issue.fields.status.statusCategory.key,
    description: extractDescriptionText(issue.fields.description),
    assignee: issue.fields.assignee?.displayName,
    created: issue.fields.created,
    url: browseUrl(issue.key, config),
  };
}

export async function performDuplicateSearch(
  data: SoftwareBugData,
  config: AppConfig,
): Promise<DuplicateSearchResponse> {
  const openJql = buildOpenDuplicateJQL(data);
  const closedJql = buildClosedDuplicateJQL(data);

  const [openSearch, closedSearch] = await Promise.all([
    searchIssues(openJql, ['summary', 'status', 'description', 'assignee', 'created'], 10),
    searchIssues(closedJql, ['summary', 'status', 'description', 'assignee', 'created'], 5),
  ]);

  return {
    openResults: openSearch.issues.map((i) => mapIssue(i, config)),
    closedResults: closedSearch.issues.map((i) => mapIssue(i, config)),
    openJql,
    closedJql,
    jiraSiteUrl: config.jiraSiteUrl,
  };
}
