import { useMemo, useState } from "react";
import {
  normalizeDraft,
  parseAliases,
  parseTemplate,
  renderTemplate,
  validateDraft,
  OPEN_MODES,
  type Command,
  type CommandDraft,
  type OpenMode,
} from "../core";

type Props = {
  initial?: Command;
  existing: readonly Command[];
  onSave: (draft: CommandDraft) => void | Promise<void>;
  onCancel: () => void;
};

const LABELS: Record<OpenMode, string> = { "current-tab": "Current tab", "foreground-tab": "New tab" };

/** Editor state: like CommandDraft but aliases stay a raw string while typing. */
type Fields = Omit<CommandDraft, "aliases"> & { aliases: string };

export function CommandEditor({ initial, existing, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Fields>({
    keyword: initial?.keyword ?? "",
    name: initial?.name ?? "",
    template: initial?.template ?? "",
    openMode: initial?.openMode ?? "foreground-tab",
    aliases: (initial?.aliases ?? []).join(", "),
  });
  const [touched, setTouched] = useState(false);
  const [sample, setSample] = useState<Record<string, string>>({});

  const normalized = useMemo(() => normalizeDraft({ ...draft, aliases: parseAliases(draft.aliases) }), [draft]);
  const validation = useMemo(() => validateDraft(normalized, existing, initial?.id), [normalized, existing, initial?.id]);
  const parsed = useMemo(() => parseTemplate(normalized.template), [normalized.template]);
  const variables = parsed.ok ? parsed.variables : [];
  const hasErrors = Object.keys(validation.errors).length > 0;
  const show = (field: keyof CommandDraft) => (touched ? validation.errors[field] : undefined);

  const preview = useMemo(() => {
    if (!parsed.ok || normalized.template === "") return null;
    const values = Object.fromEntries(variables.map((v) => [v, sample[v]?.trim() || v.toUpperCase()]));
    const r = renderTemplate(normalized.template, values);
    return r.ok ? r.url : null;
  }, [parsed.ok, normalized.template, variables, sample]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    void onSave(normalized);
  };

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <form className="editor" onSubmit={submit}>
      <div className="grid-2">
        <label>
          <span>Keyword</span>
          <input value={draft.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="wf" autoFocus spellCheck={false} className="mono" />
          <small className="muted">Lowercase, no spaces. What you type first.</small>
          {show("keyword") && <em className="err">{show("keyword")}</em>}
        </label>

        <label>
          <span>Name</span>
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Workflow" />
          <small className="muted">Shown in the launcher list. Searchable too.</small>
          {show("name") && <em className="err">{show("name")}</em>}
        </label>
      </div>

      <label>
        <span>URL template</span>
        <input
          value={draft.template}
          onChange={(e) => set("template", e.target.value)}
          placeholder="https://example.com/workflow/{id}"
          spellCheck={false}
          className="mono"
        />
        <small className="muted">
          Wrap variables in braces: <code>{"{id}"}</code>. Each becomes a positional argument, in order. Path arguments may contain <code>/</code>.
        </small>
        {show("template") && <em className="err">{show("template")}</em>}
        {!show("template") && validation.warnings.map((w) => <em key={w} className="warn">{w}</em>)}
      </label>

      <section className="panel">
        <div className="panel-head">
          <span>Arguments</span>
          {normalized.keyword && (
            <code className="usage-line">{[normalized.keyword, ...variables.map((v) => `<${v}>`)].join(" ")}</code>
          )}
        </div>
        {variables.length === 0 ? (
          <p className="muted">No variables detected. Add <code>{"{name}"}</code> to the template to accept arguments.</p>
        ) : (
          <ol className="args">
            {variables.map((v, i) => (
              <li key={v}>
                <span className="arg-index">{i + 1}</span>
                <code className="arg-name">{v}</code>
                <input
                  value={sample[v] ?? ""}
                  onChange={(e) => setSample((s) => ({ ...s, [v]: e.target.value }))}
                  placeholder="sample value"
                  className="mono small-input"
                  spellCheck={false}
                />
              </li>
            ))}
          </ol>
        )}
        {preview && (
          <div className="preview">
            <span className="muted">Preview</span>
            <code>{preview}</code>
          </div>
        )}
      </section>

      <div className="grid-2">
        <label>
          <span>Aliases <span className="muted optional">optional</span></span>
          <input value={draft.aliases} onChange={(e) => set("aliases", e.target.value)} placeholder="workflow, flow" spellCheck={false} className="mono" />
          <small className="muted">Other keywords that run this command. Comma-separated.</small>
          {show("aliases") && <em className="err">{show("aliases")}</em>}
        </label>

        <label>
          <span>Open in</span>
          <div className="segmented">
            {OPEN_MODES.map((m) => (
              <button
                type="button"
                key={m}
                className={draft.openMode === m ? "on" : undefined}
                onClick={() => set("openMode", m)}
              >
                {LABELS[m]}
              </button>
            ))}
          </div>
          <small className="muted">In the launcher, ⌘/Ctrl+Enter forces a new tab, Shift+Enter a background tab.</small>
        </label>
      </div>

      <div className="actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary" disabled={touched && hasErrors}>
          {initial ? "Save changes" : "Create command"}
        </button>
      </div>
    </form>
  );
}
