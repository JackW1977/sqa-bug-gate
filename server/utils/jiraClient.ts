const JIRA_HOST = process.env.JIRA_HOST ?? '';
const JIRA_EMAIL = process.env.JIRA_EMAIL ?? '';
const JIRA_TOKEN = process.env.JIRA_TOKEN ?? '';

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

function jiraUrl(path: string): string {
  return `https://${JIRA_HOST}${path}`;
}

async function jiraFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Authorization': authHeader(),
    ...(options.headers as Record<string, string> ?? {}),
  };
  return fetch(jiraUrl(path), { ...options, headers });
}

export interface JiraIssuePayload {
  projectKey: string;
  summary: string;
  description: string;
  issueType?: string;
  priority?: string;
  labels?: string[];
  linkedIssueKeys?: Array<{ key: string; type: string }>;
  affectsVersions?: string[];
  fixVersions?: string[];
  components?: string[];
  sprintId?: string;
  customFields?: Record<string, unknown>;
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
      ...(payload.affectsVersions?.length
        ? { versions: payload.affectsVersions.map((n) => ({ name: n })) }
        : {}),
      ...(payload.fixVersions?.length
        ? { fixVersions: payload.fixVersions.map((n) => ({ name: n })) }
        : {}),
      ...(payload.components?.length
        ? { components: payload.components.map((n) => ({ name: n })) }
        : {}),
      ...(payload.sprintId
        ? { customfield_10020: { id: Number(payload.sprintId) } }
        : {}),
      ...(payload.customFields ?? {}),
    },
  };

  const response = await jiraFetch('/rest/api/3/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const response = await jiraFetch('/rest/api/3/issueLink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create issue link: ${response.status} – ${err}`);
  }
}

export async function getIssue(issueKey: string): Promise<JiraIssue> {
  const response = await jiraFetch(
    `/rest/api/3/issue/${issueKey}?fields=summary,status,description,assignee,created,issuetype,priority`,
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

  const response = await jiraFetch('/rest/api/3/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await jiraFetch('/rest/api/3/project/search?maxResults=50&orderBy=name');

  if (!response.ok) {
    throw new Error(`Failed to list projects: ${response.status}`);
  }

  const data = await response.json() as { values: Array<{ key: string; name: string }> };
  return data.values.map(({ key, name }) => ({ key, name }));
}

// ─── Description formatting ──────────────────────────────────────────────────

export function formatDescription(sections: Record<string, string>): string {
  return Object.entries(sections)
    .filter(([, v]) => v.trim())
    .map(([heading, value]) => `**${heading}**\n${value}`)
    .join('\n\n---\n\n');
}

// ─── Project versions ─────────────────────────────────────────────────────────

export async function listProjectVersions(
  projectKey: string,
): Promise<Array<{ id: string; name: string; released: boolean; archived: boolean }>> {
  const response = await jiraFetch(`/rest/api/3/project/${projectKey}/versions`);
  if (!response.ok) return [];
  const data = await response.json() as Array<{ id: string; name: string; released: boolean; archived: boolean }>;
  return (data ?? []).filter((v) => !v.archived).sort((a, b) => {
    if (a.released === b.released) return 0;
    return a.released ? 1 : -1;
  });
}

// ─── Project components ───────────────────────────────────────────────────────

export async function listProjectComponents(
  projectKey: string,
): Promise<Array<{ id: string; name: string }>> {
  const response = await jiraFetch(`/rest/api/3/project/${projectKey}/components`);
  if (!response.ok) return [];
  const data = await response.json() as Array<{ id: string; name: string }>;
  return (data ?? []).map(({ id, name }) => ({ id, name }));
}

// ─── Project sprints (via Agile API) ─────────────────────────────────────────

export async function listProjectSprints(
  projectKey: string,
): Promise<Array<{ id: string; name: string; state: string }>> {
  const boardRes = await jiraFetch(
    `/rest/agile/1.0/board?projectKeyOrId=${projectKey}&maxResults=5`,
  );
  if (!boardRes.ok) return [];
  const boardData = await boardRes.json() as { values?: Array<{ id: number }> };
  const boards = boardData.values ?? [];
  if (boards.length === 0) return [];

  const boardId = boards[0].id;
  const sprintRes = await jiraFetch(
    `/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=20`,
  );
  if (!sprintRes.ok) return [];
  const sprintData = await sprintRes.json() as { values?: Array<{ id: number; name: string; state: string }> };
  return (sprintData.values ?? []).map((s) => ({
    id: String(s.id),
    name: s.name,
    state: s.state,
  }));
}
