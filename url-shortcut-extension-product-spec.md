# Product Spec — Developer URL Shortcuts Extension

## Working title

**JumpKey**

A lightweight Chrome extension for opening parameterized URLs using short commands.

Example:

```text
wf 7f4c2a
→ https://abc.com/workflow/7f4c2a

asset 7f4c2a
→ https://abc.com/workflow/7f4c2a/asset-editor

issue app 6091
→ https://github.com/MandoHQ/app/issues/6091
```

---

# 1. Product Summary

## Problem

Developers and operators frequently receive IDs, slugs, ticket numbers, workflow IDs, request IDs, customer IDs, build IDs, commit hashes, and other identifiers that need to be opened inside internal or external web tools.

The normal workflow is repetitive:

1. Open or focus the browser.
2. Start typing a previously visited URL.
3. Depend on browser autocomplete.
4. Delete or replace a stale identifier.
5. Modify a path segment if a different view is needed.
6. Press Enter.

This gets particularly irritating when several related URLs share the same identifier:

```text
https://abc.com/workflow/{id}
https://abc.com/workflow/{id}/asset-editor
https://abc.com/workflow/{id}/logs
https://admin.abc.com/workflows/{id}
```

Browser autocomplete optimizes for historical URLs, not parameterized commands.

## Solution

A Chrome extension that lets users register parameterized URL templates and invoke them through a single configurable command palette or omnibox entry point.

Users create commands such as:

```text
wf      https://abc.com/workflow/{id}
asset   https://abc.com/workflow/{id}/asset-editor
issue   https://github.com/MandoHQ/{repo}/issues/{number}
logs    https://logs.example.com/{env}/requests/{requestId}
```

Then use:

```text
wf 123
asset 123
issue app 6091
logs prod abc-def-123
```

The product should feel closer to a browser-native command launcher than a bookmark manager.

---

# 2. Product Goals

## Primary goals

1. Make opening parameterized URLs faster than browser autocomplete.
2. Require only one global extension shortcut rather than one Chrome shortcut per URL template.
3. Support arbitrary variables in URL templates.
4. Keep common commands executable with almost no UI friction.
5. Work fully locally without requiring an account or backend.
6. Remain useful for both individual developers and small teams.
7. Keep browser permissions minimal and understandable.

## Secondary goals

1. Provide autocomplete and discoverability for stored commands.
2. Support importing/exporting command sets.
3. Support environment-aware and organization-aware workflows.
4. Make it easy to create shortcuts from the currently open page.
5. Allow team-managed shortcut collections in a future paid version.

## Non-goals

The product is not intended to become:

- a generic bookmark manager;
- a browser automation/RPA tool;
- a macro recorder;
- an enterprise SSO launcher;
- a full Alfred/Raycast replacement;
- a URL shortener;
- a password or secrets manager.

---

# 3. Target Users

## Primary user

### Software developers

Typical identifiers:

- issue numbers;
- pull request numbers;
- workflow IDs;
- request IDs;
- trace IDs;
- commit hashes;
- deployment IDs;
- customer IDs;
- database record IDs;
- feature flag keys.

Typical tools:

- GitHub / GitLab;
- Jira / Linear;
- Sentry;
- Datadog;
- Grafana;
- Stripe Dashboard;
- internal admin panels;
- staging applications;
- CI/CD dashboards;
- observability systems.

## Secondary users

### Support and operations teams

Examples:

```text
customer 23813
order ORD-9918
invoice INV-10291
ticket 75112
```

### QA teams

Examples:

```text
build 2921
run 8111
case PAY-981
```

### Product managers

Examples:

```text
linear ENG-123
figma checkout-redesign
notion onboarding
```

---

# 4. Positioning

## Product category

**Parameterized browser command launcher**

Alternative description:

> A command palette for URLs.

## Core differentiation

Existing products typically fall into one of these categories:

1. custom search engines;
2. omnibox search shortcuts;
3. bookmark managers;
4. Chrome keyboard shortcuts per destination;
5. URL template launchers with limited placeholder support.

This product should distinguish itself by combining:

- one global launcher;
- unlimited internal commands;
- arbitrary variables;
- command autocomplete;
- dynamic URL templates;
- zero-backend local usage;
- developer-focused UX.

The mental model should be:

```text
Command + arguments → destination
```

rather than:

```text
Bookmark → URL
```

---

# 5. Core User Experience

## 5.1 Command palette

User presses a configurable shortcut:

```text
Cmd + Shift + K
```

or on Windows/Linux:

```text
Ctrl + Shift + K
```

A compact launcher appears.

Initial state:

```text
┌─────────────────────────────────────────────┐
│ >                                           │
├─────────────────────────────────────────────┤
│ wf       Workflow                           │
│ asset    Workflow Asset Editor              │
│ issue    GitHub Issue                       │
│ logs     Request Logs                       │
└─────────────────────────────────────────────┘
```

Typing:

```text
> as
```

filters to:

```text
asset    Workflow Asset Editor
```

After selection:

```text
> asset 7f4c2a
```

Preview:

```text
https://abc.com/workflow/7f4c2a/asset-editor
```

Press Enter to navigate.

## 5.2 Direct command input

The launcher should support typing the complete command without first selecting from autocomplete.

```text
issue app 6091
```

The parser identifies:

```text
command = issue
repo = app
number = 6091
```

## 5.3 Invocation modes

Each command can default to one of:

- current tab;
- new foreground tab;
- new background tab;
- new window.

A runtime modifier should override the default where possible.

Suggested behavior:

```text
Enter          default behavior
Cmd/Ctrl+Enter open in new foreground tab
Shift+Enter    open in background tab
```

Exact mappings can be adjusted to avoid browser conflicts.

---

# 6. URL Template Model

## Basic syntax

Variables use braces:

```text
https://abc.com/workflow/{id}
```

Multiple variables:

```text
https://github.com/{org}/{repo}/issues/{number}
```

Variables may appear in:

- pathname;
- query string;
- hash fragment;
- subdomain, where valid;
- multiple locations within the URL.

Example:

```text
https://{env}.example.com/workflows/{id}?tab={tab}
```

## Variable order

Positional arguments map according to first appearance in the template.

Template:

```text
https://github.com/{org}/{repo}/issues/{number}
```

Invocation:

```text
issue MandoHQ app 6091
```

Mapping:

```json
{
  "org": "MandoHQ",
  "repo": "app",
  "number": "6091"
}
```

Repeated variables use the same value.

```text
https://example.com/{id}/compare/{id}
```

requires only one argument.

---

# 7. Argument Syntax

## Positional arguments

Default syntax:

```text
command value1 value2 value3
```

Example:

```text
issue MandoHQ app 6091
```

## Quoted values

Allow spaces using quotes:

```text
search "payment timeout"
```

## Named arguments

Advanced syntax:

```text
issue repo=app number=6091 org=MandoHQ
```

Named arguments can appear in any order.

## Mixed arguments

Avoid supporting mixed positional and named arguments in V1 unless parsing remains deterministic.

Recommended initial rule:

- all positional, or
- all named.

## Optional variables

Full product version may support optional variables:

```text
https://example.com/workflows/{id}?tab={tab?}
```

If omitted, the query parameter should be excluded cleanly instead of generating:

```text
?tab=
```

This requires URL-aware template rendering rather than simple string replacement.

## Default values

Potential syntax:

```text
{env=prod}
```

Example:

```text
https://{env=prod}.example.com/workflows/{id}
```

Invocation:

```text
wf 123
```

becomes:

```text
https://prod.example.com/workflows/123
```

While:

```text
wf staging 123
```

may override the default depending on parser design.

For clarity, default-variable overrides should preferably use named arguments:

```text
wf id=123 env=staging
```

---

# 8. Command Definition

A command contains:

```ts
type Command = {
  id: string;
  keyword: string;
  name: string;
  description?: string;
  template: string;
  aliases?: string[];
  openMode: "current-tab" | "foreground-tab" | "background-tab" | "window";
  enabled: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};
```

Example:

```json
{
  "id": "cmd_workflow",
  "keyword": "wf",
  "name": "Workflow",
  "description": "Open workflow details",
  "template": "https://abc.com/workflow/{id}",
  "aliases": ["workflow"],
  "openMode": "foreground-tab",
  "enabled": true,
  "tags": ["internal", "workflow"]
}
```

---

# 9. Command Management

## Add command

Fields:

```text
Name
Keyword
URL template
Description
Aliases
Default open behavior
Tags
```

While editing the template, automatically display detected variables.

Example:

```text
Template
https://github.com/{org}/{repo}/issues/{number}

Detected arguments
1. org
2. repo
3. number

Usage
issue <org> <repo> <number>
```

## Validation

Prevent:

- duplicate primary keywords;
- malformed URLs;
- empty variable names;
- malformed brace syntax;
- invalid command keywords.

Warn rather than block for:

- duplicate aliases;
- templates with no variables;
- potentially unsafe schemes.

Only allow protocols that make sense for browser navigation.

Initial protocol allowlist:

```text
https://
http://
```

Optional advanced support later:

```text
mailto:
tel:
```

Avoid arbitrary custom schemes by default.

---

# 10. Command Discovery

## Search behavior

Search across:

- keyword;
- aliases;
- command name;
- description;
- tags;
- hostname.

Ranking priority:

1. exact keyword;
2. keyword prefix;
3. alias match;
4. fuzzy keyword;
5. command name;
6. hostname/description.

## Usage-based ranking

Track local usage metadata:

```ts
{
  commandId: string;
  count: number;
  lastUsedAt: number;
}
```

Frequently used commands may rank higher when the input is empty.

This data remains local.

---

# 11. History

Optional history should record only command invocations, not browser history.

Example:

```text
asset 7f4c2a      2 minutes ago
issue app 6091   yesterday
wf e1b811        yesterday
```

History should be:

- optional;
- configurable;
- clearable;
- stored locally;
- disabled by default if privacy concerns outweigh convenience.

A safer compromise is to store only:

```text
commandId
lastUsedAt
usageCount
```

and not argument values.

---

# 12. Clipboard Integration

## Motivation

A major workflow is:

1. receive an ID;
2. copy it;
3. open launcher;
4. select a command;
5. navigate.

Clipboard integration can reduce this to:

```text
Copy ID
Cmd+Shift+K
Type `wf`
Enter
```

## UX

If the selected command requires one variable and clipboard contents look plausible, offer:

```text
Workflow
Use clipboard: 34173cdf-655a-4d39-8ef0-e81c7b2beb8e
```

Do not automatically submit the clipboard value without user interaction.

## Privacy

Clipboard access should be:

- opt-in;
- explained clearly;
- read only when the launcher is explicitly opened;
- never sent anywhere.

If clipboard permissions materially hurt Chrome Web Store approval or user trust, ship this after V1.

---

# 13. Omnibox Integration

The extension may register one browser omnibox keyword such as:

```text
go
```

Users can invoke:

```text
go <Tab> wf 123
```

or:

```text
go <Tab> issue app 6091
```

The omnibox should reuse the exact same parser and command registry as the command palette.

The omnibox is a secondary input mode, not the primary UX.

Reason:

- the extension can register only a single extension-level omnibox keyword;
- requiring `go` adds friction;
- the command palette provides richer autocomplete and previews.

---

# 14. Create Command from Current Page

A high-value convenience feature:

User visits:

```text
https://abc.com/workflow/34173cdf-655a-4d39-8ef0-e81c7b2beb8e/asset-editor
```

Clicks:

```text
Create shortcut from this page
```

The extension displays:

```text
https://abc.com/workflow/34173cdf-655a-4d39-8ef0-e81c7b2beb8e/asset-editor
```

User selects the variable portion and replaces it with:

```text
{id}
```

Result:

```text
https://abc.com/workflow/{id}/asset-editor
```

Future versions may detect UUIDs, numeric IDs, hashes, or known identifiers automatically and suggest placeholders.

---

# 15. Groups and Environments

Full product version should support command organization.

Example groups:

```text
Work
Personal
Mando
Open Source
Infrastructure
```

Environment-aware commands are particularly useful.

Instead of defining:

```text
prod-wf
staging-wf
dev-wf
```

users may define:

```text
wf
https://{env}.abc.com/workflow/{id}
```

with defaults and presets.

Presets:

```text
prod     https://abc.com
staging  https://staging.abc.com
local    http://localhost:3000
```

Potential invocation:

```text
wf 123
wf 123 --staging
wf 123 @staging
```

This syntax should not be introduced until the simpler command grammar is stable.

---

# 16. Collections

A collection is a shareable set of commands.

Example:

```text
Mando Engineering

wf
asset
logs
user
org
billing
sentry
trace
```

Collections enable team usage without requiring team accounts initially.

Export:

```json
{
  "version": 1,
  "name": "Mando Engineering",
  "commands": []
}
```

Users can import a collection from a JSON file.

Later:

```text
https://jumpkey.app/c/mando-engineering
```

could provide hosted collections.

---

# 17. Import and Export

## Export

Allow:

- all commands;
- selected commands;
- a collection.

Format should be human-readable JSON.

Example:

```json
{
  "schemaVersion": 1,
  "commands": [
    {
      "keyword": "wf",
      "name": "Workflow",
      "template": "https://abc.com/workflow/{id}"
    }
  ]
}
```

## Import

Import should detect conflicts:

```text
`wf` already exists.

○ Replace
○ Keep existing
● Import as `wf-2`
```

---

# 18. Sync

## Personal sync

Use `chrome.storage.sync` where practical.

Fallback to `chrome.storage.local` if browser sync limits become restrictive.

The data volume is tiny enough that normal shortcut sets should comfortably fit within extension storage constraints, but implementation should abstract storage so the backend can change later.

## Future account sync

Optional hosted account sync can support:

- Chrome + Firefox sharing;
- backup;
- team collections;
- organization-managed commands;
- web editor.

Account creation should never be required for the core product.

---

# 19. Team Features

Potential paid/team offering:

## Shared command registry

Admins define:

```text
wf
logs
customer
billing
trace
```

Team members automatically receive updates.

## Managed vs personal commands

```text
Team Commands
Personal Commands
```

Users can add their own commands without modifying the shared set.

## Environment settings

A shared template may contain variables resolved from user settings:

```text
https://{workspace}.internal.example.com/workflows/{id}
```

Each team member configures:

```text
workspace = india
```

## Organization policies

Possible enterprise controls:

- restrict allowed hostnames;
- disable clipboard integration;
- enforce HTTPS;
- centrally remove deprecated commands.

These are long-term features, not launch requirements.

---

# 20. Security and Privacy

The product should have a strong local-first security posture.

## Principles

1. No page content collection.
2. No browsing history collection.
3. No URL telemetry by default.
4. No command argument telemetry.
5. No remote code execution.
6. No arbitrary script injection.
7. No broad host permissions unless a specific feature requires them.

## Sensitive values

Users may invoke URLs containing:

- customer IDs;
- internal workflow IDs;
- internal hostnames;
- incident IDs;
- trace IDs.

These should never be sent to analytics.

Analytics, if used, should record only anonymous product-level events such as:

```text
command_created
command_invoked
import_used
omnibox_used
```

Never record:

```text
keyword
arguments
rendered URL
hostname
clipboard contents
```

---

# 21. Chrome Permissions

Keep requested permissions minimal.

Likely permissions:

```json
{
  "permissions": [
    "storage",
    "tabs"
  ]
}
```

Potential additional permissions based on features:

```text
clipboardRead
contextMenus
```

Use `activeTab` if the product adds "Create shortcut from current page" functionality and it can replace broader access.

Avoid:

```text
<all_urls>
webRequest
history
cookies
```

unless a future feature has a very strong reason.

The extension should work without access to page DOM contents.

---

# 22. Technical Architecture

## Stack

Recommended:

```text
WXT
React
TypeScript
Tailwind CSS
Manifest V3
```

Alternative:

```text
Vite + React + CRXJS
```

WXT is preferable if it significantly reduces cross-browser and extension-entrypoint boilerplate.

## Components

```text
extension/
├── entrypoints/
│   ├── background.ts
│   ├── popup/
│   ├── options/
│   └── omnibox.ts
├── components/
│   ├── CommandPalette.tsx
│   ├── CommandEditor.tsx
│   ├── CommandList.tsx
│   └── UrlPreview.tsx
├── core/
│   ├── parser.ts
│   ├── template.ts
│   ├── matcher.ts
│   ├── navigator.ts
│   ├── validation.ts
│   └── variables.ts
├── storage/
│   ├── repository.ts
│   ├── chrome-sync.ts
│   └── migrations.ts
└── types/
```

---

# 23. Core Engine

The product should have a browser-independent core library.

Input:

```text
issue MandoHQ app 6091
```

Command:

```json
{
  "keyword": "issue",
  "template": "https://github.com/{org}/{repo}/issues/{number}"
}
```

Output:

```json
{
  "commandId": "...",
  "arguments": {
    "org": "MandoHQ",
    "repo": "app",
    "number": "6091"
  },
  "url": "https://github.com/MandoHQ/app/issues/6091"
}
```

This core package should not depend on Chrome APIs.

Benefits:

- easy testing;
- future Firefox support;
- future web command launcher;
- easier omnibox reuse.

---

# 24. URL Rendering

Avoid naive global string replacement.

The renderer should:

1. parse template variables;
2. validate required values;
3. URL-encode variable values appropriately;
4. preserve URL structure;
5. handle duplicate variables;
6. prevent accidental malformed destinations.

Test examples:

```text
"hello world"
→ hello%20world

"foo/bar"
→ foo%2Fbar
```

Query string encoding must be correct.

---

# 25. Storage Design

Suggested local schema:

```ts
type Store = {
  schemaVersion: number;
  commands: Command[];
  collections: Collection[];
  preferences: Preferences;
  usage: Record<string, CommandUsage>;
};
```

Preferences:

```ts
type Preferences = {
  defaultOpenMode: OpenMode;
  enableHistory: boolean;
  enableClipboard: boolean;
  omniboxKeywordEnabled: boolean;
};
```

Always implement storage migrations from the first released version.

Example:

```text
v1 → v2
```

should happen automatically.

---

# 26. Error Handling

## Unknown command

```text
> asst 123

No command `asst`.
Did you mean `asset`?
```

## Missing argument

```text
> issue app

Missing <number>
Usage: issue <repo> <number>
```

## Too many arguments

```text
> wf 123 abc

Expected 1 argument, received 2.
```

## Invalid generated URL

```text
Could not generate a valid URL.
Check the command template.
```

Errors should remain inline so the launcher never feels modal or disruptive.

---

# 27. Keyboard UX

The command palette should be entirely keyboard usable.

Minimum controls:

```text
Up / Down       select command
Enter           execute
Esc             close
Tab             autocomplete command
Cmd/Ctrl+Enter  alternate open behavior
```

Potential later shortcuts:

```text
Cmd/Ctrl+E      edit selected command
Cmd/Ctrl+N      new command
```

Do not overload keyboard shortcuts unnecessarily.

---

# 28. Settings UX

Settings page sections:

```text
Commands
Collections
Launcher
Import / Export
Privacy
About
```

Primary Commands view:

```text
Search commands...

wf        Workflow
asset     Asset Editor
issue     GitHub Issue
logs      Request Logs

+ New command
```

The settings page should prioritize editing commands rather than decorative dashboards.

---

# 29. Onboarding

On first install:

```text
Open any URL from a short command.

Example:

Keyword
issue

URL
https://github.com/{org}/{repo}/issues/{number}

Then press Cmd+Shift+K and type:
issue MandoHQ app 6091
```

Provide 2–3 optional sample commands users can delete.

Do not force account creation, tutorials, or a multi-page wizard.

---

# 30. Context Menu

Optional feature:

When text is selected on a webpage:

```text
Open with JumpKey
  Workflow
  Asset Editor
  Customer
```

The selected text becomes the first parameter.

Example selected text:

```text
34173cdf...
```

Context menu:

```text
Open in Workflow
Open in Asset Editor
```

This is especially useful for IDs displayed in Slack web, GitHub, admin panels, email, etc.

It should be optional because context menus can become noisy.

---

# 31. Smart Identifier Recognition

Future version may detect value patterns.

Examples:

```text
UUID
34173cdf-655a-4d39-8ef0-e81c7b2beb8e

GitHub issue
#6091

Linear
ENG-201

SHA
5e2ff470
```

Commands could optionally declare validation rules:

```ts
{
  variable: "id",
  pattern: "uuid"
}
```

This allows the palette to intelligently suggest destinations when clipboard contents match an identifier.

Example:

```text
Clipboard contains UUID

Suggested
Workflow
Asset Editor
Logs
```

This can eventually become one of the product's strongest differentiators.

---

# 32. Command Actions Beyond URLs

Do not include this in the initial product, but design the model so it could evolve.

Potential future action types:

```text
URL
Search
Copy transformed text
```

Avoid scripts/arbitrary JavaScript because that significantly increases security complexity and Chrome Web Store scrutiny.

The product should remain primarily URL-oriented.

---

# 33. Cross-browser Support

After Chrome stability:

1. Edge;
2. Brave;
3. Firefox.

WXT or WebExtension-compatible architecture will make this easier.

Safari support should be considered separately due to packaging and platform requirements.

---

# 34. Web Companion

Not necessary initially.

A future web app could support:

- editing commands;
- team collections;
- public collection links;
- backups;
- account sync.

The extension remains the primary execution environment.

---

# 35. Monetization

## Free individual tier

Keep the core utility free.

Possible free offering:

```text
Unlimited local commands
Command palette
Variables
Autocomplete
Import/export
Omnibox
Local sync
```

Do not cripple command counts simply to manufacture a paid tier.

## Pro tier

Possible features:

```text
Cross-browser cloud sync
Hosted backups
Advanced environment profiles
Cloud collections
Command history sync
```

Potential pricing:

```text
$2–4/month
or
$20–30/year
```

A one-time lifetime license may fit this category better than subscription-only pricing.

## Team tier

This is the stronger monetization path.

Features:

```text
Shared command sets
Centrally managed commands
Team updates
Organization variables
Access control
Managed collections
```

Possible pricing:

```text
$3–6/user/month
```

However, monetization should not drive early development. First validate that users repeatedly rely on the launcher.

---

# 36. Analytics

If analytics are added, measure only product behavior.

Useful events:

```text
extension_installed
command_created
command_invoked
command_edited
command_deleted
import_completed
export_completed
omnibox_invoked
context_menu_invoked
```

Useful aggregate metrics:

```text
DAU / WAU
commands per user
invocations per active user
percentage of users invoking commands after 7 / 30 days
most-used feature categories
```

Never collect rendered URLs or variable values.

---

# 37. Success Metrics

The product has product-market signal if active users repeatedly invoke it.

Primary metric:

> **Weekly command invocations per retained user**

Useful supporting metrics:

```text
D7 retention
D30 retention
commands created per user
time from install to first invocation
users with >10 invocations/week
users with >5 commands
```

A utility like this does not need massive DAU to be successful. High repeated usage among a niche audience is more meaningful than install count.

---

# 38. Release Scope

## V0 — personal prototype

Build only:

```text
Command CRUD
{variable} parser
Command palette
Positional arguments
Current/new tab
chrome.storage
```

Use it personally for at least a week.

## V1 — public launch

Add:

```text
Autocomplete
Aliases
Keyboard navigation
Template preview
Validation
Import/export
Settings page
Onboarding
Omnibox integration
```

## V1.5

Add:

```text
Usage ranking
Context menu
Clipboard suggestions
Create command from current page
Groups/collections
```

## V2

Potentially:

```text
Named arguments
Default values
Optional arguments
Environment presets
Identifier recognition
Shared collections
Firefox
```

## V3 / commercial version

Potentially:

```text
Accounts
Cloud sync
Team-managed commands
Hosted collections
Organization policies
Admin console
```

---

# 39. Product Risks

## Risk: too niche

This is a real possibility.

Mitigation:

- keep development scope extremely small;
- target developers first;
- validate repeat usage rather than install numbers;
- avoid building SaaS infrastructure prematurely.

## Risk: browser UX limitations

Chrome extension popups and command APIs have constraints.

Mitigation:

- prototype the actual launcher interaction first;
- verify focus behavior and keyboard ergonomics before building settings polish.

## Risk: Chrome Web Store permissions

Clipboard or broad page access can create review friction.

Mitigation:

- keep V1 permissions minimal;
- make advanced permissions optional;
- avoid page injection where unnecessary.

## Risk: users can already use browser custom search engines

Mitigation:

The product wins on:

```text
single global launcher
multiple commands
multiple variables
autocomplete
discoverability
command management
team collections
```

not merely URL substitution.

---

# 40. Product Principles

## Fast by default

The optimal interaction should be approximately:

```text
Cmd+Shift+K
wf 123
Enter
```

## Local first

No account or network dependency for the core product.

## Keyboard first

Every frequent action should be usable without the mouse.

## Minimal permissions

Do not request browser access unrelated to navigation.

## Predictable syntax

Commands should be understandable without reading documentation.

## Escape hatch for complexity

Simple commands stay simple, while named variables, collections, and environment presets handle advanced workflows.

---

# 41. Recommended Initial Product Definition

The strongest initial product is:

> A keyboard-first Chrome command palette that turns reusable URL templates into short commands with dynamic parameters.

Example:

```text
wf 123
asset 123
issue app 6091
trace prod fce28ab4
```

The differentiator should not be the ability to substitute `{id}` into a URL. That is easy to replicate.

The differentiation should come from making browser navigation feel like a developer command line:

```text
fast
predictable
discoverable
keyboard-first
local-first
```

---

# 42. Name Ideas

## Strongest candidates

### JumpKey

Short, memorable, and directly implies jumping somewhere via a keyword.

Pros:

- easy to pronounce;
- good browser-extension feel;
- broad enough for future features;
- works for developer and non-developer audiences.

### URLy

A lightweight, playful name around URLs.

Pros:

- short;
- memorable;
- casual developer-tool brand.

Cons:

- less descriptive;
- pronunciation may be ambiguous.

### HopURL

Directly communicates jumping to URLs.

Pros:

- descriptive;
- easy to understand.

Cons:

- slightly utilitarian.

### GoPath

Feels command-oriented:

```text
go path
```

Pros:

- developer-friendly;
- broad enough for internal tooling.

Cons:

- "path" has multiple technical meanings.

### LaunchKey

A keyboard-driven launcher.

Pros:

- clear product mental model;
- fits command palette UX.

Cons:

- potentially crowded naming space.

---

# 43. Developer-oriented Name Ideas

```text
JumpKey
GoPath
PathKey
RouteKey
NavKey
URLCmd
UrlRun
RunURL
GoURL
Goto
Goto.dev
JumpURL
LinkCmd
LinkRun
QuickPath
OpenKey
NavCmd
HopURL
RouteCmd
UrlDash
```

---

# 44. More Brandable Name Ideas

```text
Jumpr
Hoppr
Navio
Naviq
Gotoo
Linksy
Zippath
Pathly
Jumply
Launchr
Routely
WarpKey
Portkey
```

`Portkey` is thematically excellent because it means something that instantly transports you somewhere, but the Harry Potter association makes trademark/brand considerations worth checking before using it commercially.

---

# 45. Recommended Name Shortlist

My shortlist would be:

1. **JumpKey** — strongest overall.
2. **RouteKey** — very descriptive and extension-friendly.
3. **GoPath** — strongest developer-tool feel.
4. **NavKey** — compact and keyboard-oriented.
5. **URLCmd** — least brandable but extremely clear.
6. **WarpKey** — more distinctive and playful.

For a serious open-source/developer utility, **JumpKey** or **GoPath** would be my first choices.

For a product that could eventually expand beyond developers, **JumpKey** is the better brand.

---

# 46. One-line Product Copy

### Option 1

> Open parameterized URLs with short commands.

### Option 2

> A command palette for your browser URLs.

### Option 3

> Turn repetitive URLs into fast keyboard commands.

### Option 4

> Stop editing URLs. Just type the command and ID.

### Option 5

> Developer shortcuts for the web.

Recommended:

> **A command palette for parameterized URLs.**

