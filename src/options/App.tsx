import { useState } from "react";
import { usageLine, variablesOf, type Command, type CommandDraft } from "../core";
import { useStore } from "../storage/useStore";
import { CommandEditor } from "./CommandEditor";
import { ImportExport } from "./ImportExport";
import { Logo } from "../shared/Logo";

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; id: string };

const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

export function App() {
  const { store, save } = useStore();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  if (!store) return <main className="page"><p className="muted">Loading…</p></main>;
  const commands = store.commands;

  const upsert = async (draft: CommandDraft, id?: string) => {
    const now = Date.now();
    const next = id
      ? commands.map((c) => (c.id === id ? { ...c, ...draft, aliases: draft.aliases, updatedAt: now } : c))
      : [...commands, { id: crypto.randomUUID(), ...draft, enabled: true, createdAt: now, updatedAt: now }];
    await save({ ...store, commands: next });
    setMode({ kind: "list" });
  };

  const remove = async (id: string) => {
    await save({ ...store, commands: commands.filter((c) => c.id !== id) });
    setConfirmDelete(null);
  };

  const toggle = async (id: string) => {
    await save({ ...store, commands: commands.map((c) => (c.id === id ? { ...c, enabled: !c.enabled, updatedAt: Date.now() } : c)) });
  };

  if (mode.kind !== "list") {
    const editing = mode.kind === "edit" ? commands.find((c) => c.id === mode.id) : undefined;
    return (
      <main className="page narrow">
        <button className="link back" onClick={() => setMode({ kind: "list" })}>← All commands</button>
        <section className="card">
          <h1>{editing ? "Edit command" : "New command"}</h1>
          <CommandEditor
            initial={editing}
            existing={commands}
            onSave={(d) => upsert(d, editing?.id)}
            onCancel={() => setMode({ kind: "list" })}
          />
        </section>
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? commands.filter((c) => [c.keyword, c.name, c.template, ...(c.aliases ?? [])].some((s) => s.toLowerCase().includes(q)))
    : commands;

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <Logo size={36} />
          <div>
            <h1>JumpKey</h1>
            <p className="muted">{commands.length} command{commands.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <button className="primary" onClick={() => setMode({ kind: "new" })}>+ New command</button>
      </header>

      <section className="tips">
        <div className="tip">
          <span className="tip-title">Shortcuts</span>
          <span>
            <kbd>{MOD}</kbd><kbd>⇧</kbd><kbd>K</kbd> launcher · <kbd>{MOD}</kbd><kbd>⇧</kbd><kbd>O</kbd> this page
          </span>
        </div>
        <div className="tip">
          <span className="tip-title">Address bar</span>
          <span>Type <code>jk</code>, press <kbd>Tab</kbd>, then a command: <code>jk wf 7f4c2a</code></span>
        </div>
        <div className="tip">
          <span className="tip-title">Arguments</span>
          <span>Separate with spaces; quote to keep spaces: <code>issue "my repo" 42</code></span>
        </div>
      </section>

      {commands.length > 0 && (
        <div className="filter">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter commands…" spellCheck={false} />
        </div>
      )}

      {commands.length === 0 && (
        <section className="card empty-state">
          <h2>No commands yet</h2>
          <p className="muted">A command maps a short keyword to a URL template. Variables in braces become arguments.</p>
          <code className="example">wf → https://example.com/workflow/{"{id}"}</code>
          <button className="primary" onClick={() => setMode({ kind: "new" })}>Create your first command</button>
        </section>
      )}

      {commands.length > 0 && visible.length === 0 && <p className="muted center">No commands match “{query}”.</p>}

      <ul className="cmds">
        {visible.map((c: Command) => {
          const vars = variablesOf(c);
          return (
            <li key={c.id} className={`card cmd${c.enabled ? "" : " disabled"}`}>
              <div className="cmd-head">
                <code className="kw">{c.keyword}</code>
                {(c.aliases ?? []).map((a) => <code key={a} className="kw alias">{a}</code>)}
                <span className="cmd-name">{c.name}</span>
                <span className={`badge ${c.openMode}`}>{c.openMode === "current-tab" ? "Current tab" : "New tab"}</span>
                {!c.enabled && <span className="badge off">Disabled</span>}
              </div>
              <code className="tpl">{c.template}</code>
              <div className="cmd-foot">
                <span className="usage">
                  <span className="muted">Usage</span> <code>{usageLine(c)}</code>
                  {vars.length > 0 && <span className="muted"> · {vars.length} argument{vars.length === 1 ? "" : "s"}</span>}
                </span>
                <div className="cmd-actions">
                  {confirmDelete === c.id ? (
                    <>
                      <span className="muted">Delete this command?</span>
                      <button className="danger" onClick={() => remove(c.id)}>Delete</button>
                      <button onClick={() => setConfirmDelete(null)}>Keep</button>
                    </>
                  ) : (
                    <>
                      <button className="ghost" onClick={() => toggle(c.id)}>{c.enabled ? "Disable" : "Enable"}</button>
                      <button onClick={() => setMode({ kind: "edit", id: c.id })}>Edit</button>
                      <button className="ghost danger-text" onClick={() => setConfirmDelete(c.id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ImportExport commands={commands} onImport={(next) => save({ ...store, commands: next })} />
    </main>
  );
}
