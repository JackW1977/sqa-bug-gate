import api, { route } from '@forge/api';

export interface JiraIssuePayload {
  projectKey: string;
  summary: string;
  description: string;
  issueType?: string;
  priority?: string;
  labels?: string[];
  linkedIssueKeys?: Array<{ key: string; type: string }>;
}

export interface JiraIssueCreated {
  id: string;
  key: string;
  self: string;
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: { name: string; statusCategory: { key: string } };
    description?: unknown;
    assignee?: { displayName: string } | null;
    created: string;
    issuetype: { name: string };
    priority?: { name: string };
  };
}

// ─── Issue CRUD ──────────────────────────────────────────────────────────────

export async function createJiraIssue(payload: JiraIssuePayload): Promise<JiraIssueCreated> {
  const body = {
    fields: {
      project: { key: payload.projectKey },
      summary: payload.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: payload.description }],
          },
        ],
      },
      issuetype: { name: payload.issueType ?? 'Bug' },
      ...(payload.priority ? { priority: { name: payload.priority } } : {}),
      ...(payload.labels?.length ? { labels: payload.labels } : {}),
    },
  };

  const response = await api.asApp().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create Jira issue: ${response.status} – ${err}`);
  }

  return response.json() as Promise<JiraIssueCreated>;
}

export async function addIssueLink(
  inwardIssueKey: string,
  outwardIssueKey: string,
  linkTypeName: string,
): Promise<void> {
  const body = {
    type: { name: linkTypeName },
    inwardIssue: { key: inwardIssueKey },
    outwardIssue: { key: outwardIssueKey },
  };

  const response = await api.asApp().requestJira(route`/rest/api/3/issueLink`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create issue link: ${response.status} – ${err}`);
  }
}

export async function getIssue(issueKey: string): Promise<JiraIssue> {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=summary,status,description,assignee,created,issuetype,priority`,
    { headers: { 'Accept': 'application/json' } },
  );

  if (!response.ok) {
    throw new Error(`Failed to get issue ${issueKey}: ${response.status}`);
  }

  return response.json() as Promise<JiraIssue>;
}

// ─── JQL Search ──────────────────────────────────────────────────────────────

export async function searchIssues(
  jql: string,
  fields: string[] = ['summary', 'status', 'description', 'assignee', 'created', 'issuetype'],
  maxResults = 20,
): Promise<JiraSearchResult> {
  const body = { jql, fields, maxResults };

  const response = await api.asApp().requestJira(route`/rest/api/3/search`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`JQL search failed: ${response.status} – ${err}`);
  }

  return response.json() as Promise<JiraSearchResult>;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Array<{ key: string; name: string }>> {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/project/search?maxResults=50&orderBy=name`,
    { headers: { 'Accept': 'application/json' } },
  );

  if (!response.ok) {
    throw new Error(`Failed to list projects: ${response.status}`);
  }

  const data = await response.json() as { values: Array<{ key: string; name: string }> };
  return data.values.map(({ key, name }) => ({ key, name }));
}

// ─── Description formatting ──────────────────────────────────────────────────

/**
 * Build a structured plain-text description from all SQA sections.
 * Used as the Jira issue description body.
 */
export function formatDescription(sections: Record<string, string>): string {
  return Object.entries(sections)
    .filter(([, v]) => v.trim())
    .map(([heading, value]) => `**${heading}**\n${value}`)
    .join('\n\n---\n\n');
}
