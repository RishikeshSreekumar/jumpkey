import { useState } from "react";
import { variablesOf, type Command, type CommandDraft } from "../core";
import { useStore } from "../storage/useStore";
import { CommandEditor } from "./CommandEditor";
import { ImportExport } from "./ImportExport";
import { Logo } from "../shared/Logo";
import {
  AddressBar,
  Braces,
  Brackets,
  Copy,
  Keyboard,
  Link,
  OPEN_MODE_LABELS,
  OpenModeIcon,
  Pencil,
  Plus,
  Search,
  Trash,
} from "../shared/icons";

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; id: string };

const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

/** Template without its scheme, for the Destination column. */
const displayUrl = (template: string) => template.replace(/^https?:\/\//, "");

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
    if (mode.kind === "edit" && mode.id === id) setMode({ kind: "list" });
  };

  const toggle = async (id: string) => {
    await save({ ...store, commands: commands.map((c) => (c.id === id ? { ...c, enabled: !c.enabled, updatedAt: Date.now() } : c)) });
  };

  const copyTemplate = (c: Command) => void navigator.clipboard.writeText(c.template);

  const q = query.trim().toLowerCase();
  const visible = q
    ? commands.filter((c) => [c.keyword, c.name, c.template, ...(c.aliases ?? [])].some((s) => s.toLowerCase().includes(q)))
    : commands;
  const activeCount = commands.filter((c) => c.enabled).length;
  const editing = mode.kind === "edit" ? commands.find((c) => c.id === mode.id) : undefined;

  return (
    <main className="page">
      <div className="main">
        <div className="card">
          <header className="topbar">
            <Logo size={26} />
            <div className="brand">
              <h1>JumpKey</h1>
              <span className="count">{activeCount}/{commands.length} active</span>
            </div>
            <span className="spacer" />
            {commands.length > 0 && (
              <div className="filter">
                <Search size={14} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter commands" spellCheck={false} />
              </div>
            )}
            <button className="btn primary lg" onClick={() => setMode({ kind: "new" })}>
              <Plus size={14} strokeWidth={2.2} />
              New command
            </button>
          </header>

          <section className="tips">
            <div className="tip">
              <Keyboard size={16} strokeWidth={1.8} />
              <span>Launcher <kbd>{MOD}</kbd><kbd>⇧</kbd><kbd>K</kbd></span>
            </div>
            <div className="tip">
              <AddressBar size={16} strokeWidth={1.8} />
              <span>Address bar <kbd>jk</kbd> + <kbd>⇥</kbd></span>
            </div>
            <div className="tip">
              <Brackets size={16} strokeWidth={1.8} />
              <span>Arguments split on spaces — quote to keep them: <kbd>"my repo"</kbd></span>
            </div>
          </section>

          {commands.length === 0 ? (
            <section className="empty-state">
              <h2>No commands yet</h2>
              <p className="muted">A command maps a short keyword to a URL template. Variables in braces become arguments.</p>
              <code className="example">wf → https://example.com/workflow/{"{id}"}</code>
              <button className="btn primary" onClick={() => setMode({ kind: "new" })}>Create your first command</button>
            </section>
          ) : (
            <>
              <div className="thead">
                <span>Keyword</span>
                <span>Name</span>
                <span>Destination</span>
                <span>Opens in</span>
                <span />
              </div>
              {visible.length === 0 && <p className="nomatch">No commands match “{query}”.</p>}
              <ul className="rows">
                {visible.map((c) => {
                  const vars = variablesOf(c);
                  return (
                    <li key={c.id} className={`row${c.enabled ? "" : " off"}`}>
                      <span className="kw" title={(c.aliases ?? []).length ? `Aliases: ${c.aliases!.join(", ")}` : undefined}>{c.keyword}</span>

                      <span className="cell">
                        <span className="cname">{c.name}</span>
                        {vars.length > 0 && (
                          <span className="argc" title={`Takes ${vars.length} argument${vars.length === 1 ? "" : "s"}: ${vars.join(", ")}`}>
                            <Braces size={10} strokeWidth={2.4} />
                            {vars.length}
                          </span>
                        )}
                      </span>

                      <span className="cell dest">
                        <Link size={13} />
                        <span className="url" title={c.template}>{displayUrl(c.template)}</span>
                      </span>

                      <span className="cell opens">
                        <OpenModeIcon mode={c.openMode} size={13} />
                        {OPEN_MODE_LABELS[c.openMode]}
                      </span>

                      <span className="actions">
                        {confirmDelete === c.id ? (
                          <>
                            <span className="confirm">Delete?</span>
                            <button className="btn danger sm" onClick={() => remove(c.id)}>Delete</button>
                            <button className="btn sm" onClick={() => setConfirmDelete(null)}>Keep</button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`switch${c.enabled ? " on" : ""}`}
                              role="switch"
                              aria-checked={c.enabled}
                              title={c.enabled ? "Disable" : "Enable"}
                              onClick={() => toggle(c.id)}
                            >
                              <span />
                            </button>
                            <button className="ibtn" title="Edit" onClick={() => setMode({ kind: "edit", id: c.id })}>
                              <Pencil size={14} strokeWidth={1.9} />
                            </button>
                            <button className="ibtn" title="Copy URL template" onClick={() => copyTemplate(c)}>
                              <Copy size={14} strokeWidth={1.9} />
                            </button>
                            <button className="ibtn danger" title="Delete" onClick={() => setConfirmDelete(c.id)}>
                              <Trash size={14} strokeWidth={1.9} />
                            </button>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <ImportExport commands={commands} onImport={(next) => save({ ...store, commands: next })} />
        </div>
      </div>

      {mode.kind !== "list" && (
        <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setMode({ kind: "list" }); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={editing ? "Edit command" : "New command"}>
            <CommandEditor
              key={editing?.id ?? "new"}
              initial={editing}
              existing={commands}
              onSave={(d) => upsert(d, editing?.id)}
              onCancel={() => setMode({ kind: "list" })}
            />
          </div>
        </div>
      )}
    </main>
  );
}
