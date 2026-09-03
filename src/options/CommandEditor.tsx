import { useMemo, useState } from "react";
import {
  normalizeDraft,
  parseAliases,
  parseTemplate,
  validateDraft,
  OPEN_MODES,
  type Command,
  type CommandDraft,
} from "../core";
import { Check, Close, Info, OPEN_MODE_LABELS, OpenModeIcon, Pencil, Plus } from "../shared/icons";

type Props = {
  initial?: Command;
  existing: readonly Command[];
  onSave: (draft: CommandDraft) => void | Promise<void>;
  onCancel: () => void;
};

const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

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

  const normalized = useMemo(() => normalizeDraft({ ...draft, aliases: parseAliases(draft.aliases) }), [draft]);
  const validation = useMemo(() => validateDraft(normalized, existing, initial?.id), [normalized, existing, initial?.id]);
  const parsed = useMemo(() => parseTemplate(normalized.template), [normalized.template]);
  const variables = parsed.ok ? parsed.variables : [];
  const hasErrors = Object.keys(validation.errors).length > 0;
  const show = (field: keyof CommandDraft) => (touched ? validation.errors[field] : undefined);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    void onSave(normalized);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const usage = [normalized.keyword || "keyword", ...variables.map((v) => `<${v}>`)].join(" ");

  return (
    <form className="card editor" onSubmit={submit} onKeyDown={onKeyDown}>
      <div className="editor-head">
        {initial ? <Pencil size={15} /> : <Plus size={15} />}
        <h2>{initial ? "Edit command" : "New command"}</h2>
        <span className="spacer" />
        <button type="button" className="ibtn" title="Close" onClick={onCancel}>
          <Close size={14} />
        </button>
      </div>

      <div className="editor-body">
        <div className="grid-kw">
          <div className="field">
            <label htmlFor="ed-keyword">Keyword</label>
            <input id="ed-keyword" className="keyword" value={draft.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="wf" autoFocus spellCheck={false} />
            {show("keyword") && <em className="err">{show("keyword")}</em>}
          </div>
          <div className="field">
            <label htmlFor="ed-name">Name</label>
            <input id="ed-name" className="name" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Workflow" />
            {show("name") && <em className="err">{show("name")}</em>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="ed-template">URL template</label>
          <input
            id="ed-template"
            className="mono"
            value={draft.template}
            onChange={(e) => set("template", e.target.value)}
            placeholder="https://example.com/workflow/{id}"
            spellCheck={false}
          />
          <span className="help">
            <Info size={13} strokeWidth={1.9} />
            Wrap each variable in braces — they become positional arguments.
          </span>
          {show("template") && <em className="err">{show("template")}</em>}
          {!show("template") && validation.warnings.map((w) => <em key={w} className="warn">{w}</em>)}
        </div>

        {variables.length > 0 ? (
          <div className="argbox">
            <Check size={14} strokeWidth={2.2} />
            <span>{variables.length} argument{variables.length === 1 ? "" : "s"} detected:</span>
            {variables.map((v) => <span key={v} className="var">{v}</span>)}
            <span className="usage">{usage}</span>
          </div>
        ) : (
          <div className="argbox none">
            <Info size={14} strokeWidth={1.9} />
            <span>No arguments. Add <code>{"{name}"}</code> to the template to accept one.</span>
          </div>
        )}

        <div className="grid-2">
          <div className="field">
            <label htmlFor="ed-aliases">Aliases <span className="optional">optional</span></label>
            <input id="ed-aliases" className="mono" value={draft.aliases} onChange={(e) => set("aliases", e.target.value)} placeholder="workflow, flow" spellCheck={false} />
            {show("aliases") && <em className="err">{show("aliases")}</em>}
          </div>
          <div className="field">
            <label>Opens in</label>
            <div className="segmented" role="radiogroup">
              {OPEN_MODES.map((m) => (
                <button
                  type="button"
                  key={m}
                  role="radio"
                  aria-checked={draft.openMode === m}
                  className={draft.openMode === m ? "on" : undefined}
                  onClick={() => set("openMode", m)}
                >
                  <OpenModeIcon mode={m} size={13} />
                  {OPEN_MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="editor-foot">
        <span className="save-hint">{MOD}↵ to save</span>
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={touched && hasErrors}>
          <Check size={13} strokeWidth={2.2} />
          Save command
        </button>
      </div>
    </form>
  );
}
