# Software Bug Gate — Jira Forge App

A Jira Cloud Forge app that enforces Noah Medical's **Software Instruction for Improving Software Bug Report Quality** for all Software-created Bug issues.

---

## What it does

| Module | Where | What it enforces |
|--------|-------|-----------------|
| **New Software Bug** wizard | Jira top nav → Apps | Guided 12-step form covering all 9 mandatory Software sections + duplicate search |
| **Software Gate** issue panel | Every Bug issue sidebar | Live checklist status (PASS / FAIL) with per-item breakdown |
| **Workflow Validator** | Jira workflow admin | Blocks transition to "Ready for Triage" if checklist fails or duplicate search not resolved |

### Software Checklist (9 items)

1. Summary — `[Category]-[Sub-Category]: user-visible problem + when/condition`
2. Environment — version, branch, hardware, mode (or "Unknown – reason")
3. Preconditions — documented or explicitly none with explanation
4. Steps to reproduce — numbered, from initial state, with reproducibility rate
5. Expected vs actual behavior — clearly differentiated, no root-cause guesses in Expected
6. Impact — user/workflow effect, workaround practicality, frequency
7. Evidence — at least one of: screenshot, video, log, or test case ID reference
8. Duplicate search — performed + outcome resolved (open match blocks creation)
9. Classification — Blocker impact requires rationale

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/) ≥ 10

```bash
npm install -g @forge/cli
forge login
```

---

## Project structure

```
JiraBugCreator/
├── manifest.yml              # Forge app manifest
├── package.json              # Backend (Forge functions)
├── src/
│   ├── index.ts              # Resolver entry point + workflow validator
│   ├── utils/
│   │   ├── SoftwareInstructionModel.ts   # All TypeScript types
│   │   ├── config.ts                # App configuration (storage-backed)
│   │   ├── jiraClient.ts            # @forge/api Jira REST wrappers
│   │   ├── validator.ts             # Software checklist validation logic
│   │   ├── duplicateSearch.ts       # JQL building + search execution
│   │   └── metrics.ts               # Metrics recording
│   └── handlers/
│       ├── bugHandler.ts            # createBug, getGateState
│       ├── searchHandler.ts         # searchDuplicates, saveDuplicateOutcome
│       ├── checklistHandler.ts      # getChecklistStatus
│       ├── configHandler.ts         # getConfig, updateConfig, listProjects
│       └── workflowValidator.ts     # handleWorkflowValidation
├── static/
│   ├── wizard/               # "New Software Bug" Custom UI React app
│   └── panel/                # Issue panel Custom UI React app
└── tests/
    ├── validator.test.ts
    └── duplicateSearch.test.ts
```

---

## Install & deploy

### 1 — Register the app (first time only)

```bash
cd JiraBugCreator
forge register
```

This sets the `app.id` in `manifest.yml`. Commit the updated manifest.

### 2 — Install backend dependencies

```bash
npm install
```

### 3 — Build the Custom UI apps

```bash
# Wizard
cd static/wizard
npm install
npm run build
cd ../..

# Panel
cd static/panel
npm install
npm run build
cd ../..
```

### 4 — Deploy to Forge

```bash
forge deploy
```

### 5 — Install into your Jira Cloud site

```bash
forge install
```

Select your Jira Cloud site when prompted. Choose **Jira** as the product.

---

## Local development (tunnel mode)

Run both UI apps in watch mode alongside the Forge tunnel:

```bash
# Terminal 1 — Forge tunnel
forge tunnel

# Terminal 2 — Wizard dev server (port 3000)
cd static/wizard && npm start

# Terminal 3 — Panel dev server (port 3001)
cd static/panel && npm start
```

The `tunnel.port` values in `manifest.yml` route traffic to the local dev servers.

---

## Running tests

```bash
npm test
# or with coverage:
npm test -- --coverage
```

---

## Configuration

App configuration is stored in Forge storage and can be updated via the `updateConfig` resolver or directly in `src/utils/config.ts`.

### Governed projects

By default the gate applies to **all projects**. To restrict it:

```ts
// In config.ts → DEFAULT_CONFIG
governedProjects: ['Software', 'NOAM', 'NOVA'],
```

Or call the resolver at runtime:

```ts
invoke('updateConfig', { governedProjects: ['Software', 'NOVA'] });
```

### Governed issue types

```ts
governedIssueTypes: ['Bug'],  // default
```

### Gated workflow statuses

The workflow validator fires on **any** of these status names (case-insensitive):

```ts
gatedStatuses: ['Ready for Triage', 'Ready for Dev', 'Triage'],  // default
```

Update via `updateConfig` or `DEFAULT_CONFIG`.

### Category / Sub-Category list

The full list lives in `DEFAULT_CATEGORIES` in `src/utils/config.ts`:

```ts
{ value: 'R&C',   label: 'R&C – Robotic & Camera', subCategories: [{ value: 'BC', label: 'BC (Bronchoscope)' }] },
{ value: 'RA',    label: 'RA – Robot Arm', ... },
{ value: 'WC',    label: 'WC – Wire Controller', ... },
{ value: 'TPS',   label: 'TPS – Treatment Planning System', ... },
// … etc.
```

To update, edit the array and redeploy, or push updated config via `updateConfig`.

---

## Attaching the Workflow Validator to a transition

1. In Jira, go to **Project Settings → Workflows**.
2. Edit the workflow used by Bug issues.
3. Select the transition that leads to your gated status (e.g. "Ready for Triage").
4. Click **Validators → Add Validator**.
5. Select **Forge Validator** and choose **Software Bug Gate – Software-workflow-validator**.
6. Publish the workflow.

---

## How Software engineers use the app

### Creating a new Software bug

1. In Jira, click **Apps** in the top navigation → **New Software Bug**.
2. Complete all 12 wizard steps (Steps 1–9 are mandatory; Traceability and Classification are optional).
3. On the **Duplicate Search** step, click **Run Duplicate Search** and select an outcome.
4. On the **Review & Submit** step, confirm all checklist items pass, then click **Create Software Bug in Jira**.
5. After creation, attach actual log files, screenshots, and videos to the new Jira issue.

### Checking an existing bug's gate status

Open any Bug issue → look at the **Software Gate Status** panel in the right sidebar.

- **PASSED ✓** — all 9 checklist items pass; the bug can be transitioned to "Ready for Triage".
- **FAILED ✗** — failing items are listed with specific guidance on how to fix them.

Click **↻ Refresh** to recompute after editing the issue.

### Workflow gate behaviour

When an Software engineer or developer tries to transition a Bug to "Ready for Triage":

- If the Software checklist **passes** → transition is allowed.
- If the checklist **fails** → transition is blocked with a message listing every failing item.
- If no Software data exists (bug not created via the wizard) → transition is blocked with instructions.
- If a **duplicate open bug** was found during the duplicate search → transition is blocked; the engineer must add evidence to the existing bug instead.

---

## Metrics

Metrics are currently written to Forge storage and logged to the Forge console. Three event types are recorded:

| Event | When |
|-------|------|
| `checklist_result` | Every time the checklist is evaluated |
| `duplicate_prevented` | When an open duplicate is identified |
| `missing_info` | When checklist fails and fields are incomplete |

Retrieve recent metrics via the resolver:

```ts
const metrics = await invoke('getMetrics', { limit: 100 });
```

---

## Permissions required

| Scope | Why |
|-------|-----|
| `read:jira-work` | Read issues, projects, workflow status |
| `write:jira-work` | Create issues, add issue links |
| `read:jira-user` | Read current user context |
| `storage:app` | Persist Software gate state and config |

---

## Security notes

- All Forge function calls are authenticated by Atlassian; no external server is involved.
- The app uses `api.asApp()` for all Jira REST calls, so it acts with the app's installed permissions.
- Software gate state (bug data + validation result) is stored in Forge storage scoped to this app's installation.
