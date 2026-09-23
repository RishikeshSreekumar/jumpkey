import { filterCommands, resolveInvocation, usageLine, type Command, type NavTarget, type Resolution } from "../core";
import { ChromeLocalRepository } from "../storage/chrome-local";
import { openUrls } from "../shared/open";

const repo = new ChromeLocalRepository();

const xml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function commands(): Promise<Command[]> {
  return (await repo.load()).commands;
}

function describe(r: Resolution, input: string): string {
  if (r.ok) {
    const head = r.recognized ? `${xml(r.command.name)}` : xml(usageLine(r.command));
    const more = r.urls.length > 1 ? ` <dim>+ ${r.urls.length - 1} more tab${r.urls.length === 2 ? "" : "s"}</dim>` : "";
    return `<match>${head}</match> <dim>→</dim> <url>${xml(r.url)}</url>${more}`;
  }
  switch (r.kind) {
    case "empty":
      return "<dim>Type a keyword and a value, e.g.</dim> <match>jira ENG-482</match>";
    case "unknown-command":
      return r.suggestion
        ? `<dim>No command</dim> <match>${xml(r.keyword)}</match><dim>. Did you mean</dim> <match>${xml(r.suggestion)}</match><dim>?</dim>`
        : `<dim>No command</dim> <match>${xml(r.keyword)}</match>`;
    case "missing-argument":
      return `<match>${xml(r.usage)}</match> <dim>· ${xml(r.message)}</dim>`;
    case "too-many-arguments":
    case "invalid-url":
      return `<match>${xml(input.trim())}</match> <dim>· ${xml(r.message)}</dim>`;
  }
}

function suggestions(list: Command[], input: string): chrome.omnibox.SuggestResult[] {
  const typed = input.trim();
  return list.slice(0, 6).map((c) => ({
    content: `${c.keyword} `,
    description: `<match>${xml(usageLine(c))}</match> <dim>· ${xml(c.name)}</dim>`,
    deletable: false,
  })).filter((s) => s.content.trim() !== typed);
}

function targetFor(disposition: `${chrome.omnibox.OnInputEnteredDisposition}`, fallback: NavTarget): NavTarget {
  switch (disposition) {
    case "newForegroundTab":
      return "foreground-tab";
    case "newBackgroundTab":
      return "background-tab";
    default:
      return fallback;
  }
}

export function registerOmnibox() {
  chrome.omnibox.onInputStarted.addListener(() => {
    chrome.omnibox.setDefaultSuggestion({ description: describe({ ok: false, kind: "empty" }, "") });
  });

  chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    const [all, usage] = await Promise.all([commands(), repo.loadUsage()]);
    const r = resolveInvocation(text, all);
    chrome.omnibox.setDefaultSuggestion({ description: describe(r, text) });
    const hasArgs = text.trim().split(/\s+/).length > 1;
    suggest(hasArgs ? [] : suggestions(filterCommands(all, text, usage), text));
  });

  chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
    const r = resolveInvocation(text, await commands());
    if (!r.ok) {
      return;
    }
    await Promise.all([openUrls(r.urls, targetFor(disposition, r.command.openMode)), repo.touchUsage(r.command.id)]);
  });
}
