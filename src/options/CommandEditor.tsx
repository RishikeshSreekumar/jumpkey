import { useEffect, useMemo, useState } from "react";
import {
  alignTemplate,
  buildTemplate,
  compilePattern,
  formatUsageVariable,
  nameFromTitle,
  normalizeDraft,
  parseAliases,
  parseTemplate,
  setVariableSpec,
  splitUrl,
  suggestVariables,
  validateDraft,
  validateUrl,
  OPEN_MODES,
  type Command,
  type CommandDraft,
  type Selection,
  type VariableSpec,
} from "../core";
import { Check, Close, Info, OPEN_MODE_LABELS, OpenModeIcon, Pencil, Plus } from "../shared/icons";
import { VariablePicker } from "./VariablePicker";

export type PageSeed = { url: string; title?: string };

type Props = {
  initial?: Command;
  fromPage?: PageSeed;
  seed?: CommandDraft;
  existing: readonly Command[];
  onSave: (draft: CommandDraft) => void | Promise<void>;
  onCancel: () => void;
};

function pickerSource(template: string): string | undefined {
  if (template.includes("{")) return undefined;
  const v = validateUrl(template);
  if (!v.ok) return undefined;
  return new URL(v.url).hostname.includes(".") ? template : undefined;
}

function seededTemplate(seed: PageSeed | undefined): string {
  if (!seed) return "";
  const tokens = splitUrl(seed.url);
  return tokens ? buildTemplate(tokens, suggestVariables(tokens)) : seed.url;
}

const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

type Fields = Omit<CommandDraft, "aliases" | "pattern"> & { aliases: string; pattern: string };

export function CommandEditor({ initial, fromPage, seed, existing, onSave, onCancel }: Props) {
  const start = initial ?? seed;
  const [draft, setDraft] = useState<Fields>({
    keyword: start?.keyword ?? "",
    name: start?.name ?? nameFromTitle(fromPage?.title),
    template: start?.template ?? seededTemplate(fromPage),
    openMode: start?.openMode ?? "foreground-tab",
    aliases: (start?.aliases ?? []).join(", "),
    pattern: start?.pattern ?? "",
  });
  const [touched, setTouched] = useState(!!seed);
  const [sample, setSample] = useState("");
  const [source, setSource] = useState<string | undefined>(() => fromPage?.url ?? pickerSource(initial?.template ?? ""));

  const normalized = useMemo(() => normalizeDraft({ ...draft, aliases: parseAliases(draft.aliases), pattern: draft.pattern }), [draft]);
  const validation = useMemo(() => validateDraft(normalized, existing, initial?.id), [normalized, existing, initial?.id]);
  const parsed = useMemo(() => parseTemplate(normalized.template), [normalized.template]);
  const variables = parsed.ok ? parsed.variables : [];
  const specs = parsed.ok ? parsed.specs : [];

  useEffect(() => {
    const next = pickerSource(normalized.template);
    if (next && next !== source) setSource(next);
  }, [normalized.template, source]);

  const tokens = useMemo(() => (source ? splitUrl(source) : null), [source]);
  const selection = useMemo(() => (tokens ? alignTemplate(tokens, normalized.template) : null), [tokens, normalized.template]);
  const pick = (next: Selection) => {
    if (!tokens) return;
    const rebuilt = specs.filter((sp) => sp.default !== undefined || sp.rest).reduce((t, sp) => setVariableSpec(t, sp), buildTemplate(tokens, next));
    set("template", rebuilt);
  };
  const setSpec = (spec: VariableSpec) => set("template", setVariableSpec(draft.template, spec));
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

  const usage = [normalized.keyword || "keyword", ...specs.map(formatUsageVariable)].join(" ");
  const oneValue = specs.filter((sp) => sp.default === undefined).length === 1 && !specs.some((sp) => sp.rest);
  const patternRe = normalized.pattern ? compilePattern(normalized.pattern) : null;

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

        {tokens && selection && <VariablePicker tokens={tokens} selection={selection} onChange={pick} />}

        {variables.length > 0 ? (
          <div className="argbox vars">
            <div className="argbox-head">
              <Check size={14} strokeWidth={2.2} />
              <span>{variables.length} argument{variables.length === 1 ? "" : "s"}</span>
              <span className="usage">{usage}</span>
            </div>
            {specs.map((sp, i) => (
              <VariableRow key={sp.name} spec={sp} last={i === specs.length - 1} onChange={setSpec} />
            ))}
          </div>
        ) : (
          <div className="argbox none">
            <Info size={14} strokeWidth={1.9} />
            <span>No arguments. Add <code>{"{name}"}</code> to the template to accept one.</span>
          </div>
        )}

        {(oneValue || draft.pattern) && (
          <div className="field">
            <label htmlFor="ed-pattern">Recognize values without the keyword <span className="optional">optional</span></label>
            <div className="pattern-row">
              <input
                id="ed-pattern"
                className="mono"
                value={draft.pattern}
                onChange={(e) => set("pattern", e.target.value)}
                placeholder="[A-Z]+-\d+"
                spellCheck={false}
              />
              <input
                className="mono sample"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                placeholder="Try a value"
                spellCheck={false}
                aria-label="Try a value against the pattern"
              />
              {patternRe && sample.trim() && (
                <span className={patternRe.test(sample.trim()) ? "match yes" : "match no"}>
                  {patternRe.test(sample.trim()) ? "matches" : "no match"}
                </span>
              )}
            </div>
            <span className="help">
              <Info size={13} strokeWidth={1.9} />
              <span>A regular expression. When a typed or copied value matches it, like <code>ENG-482</code>, JumpKey opens this command without the keyword.</span>
            </span>
            {show("pattern") && <em className="err">{show("pattern")}</em>}
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

type Mode = "required" | "optional" | "rest";

function VariableRow({ spec, last, onChange }: { spec: VariableSpec; last: boolean; onChange: (spec: VariableSpec) => void }) {
  const mode: Mode = spec.rest ? "rest" : spec.default !== undefined ? "optional" : "required";
  const setMode = (m: Mode) => {
    if (m === "required") onChange({ name: spec.name });
    else if (m === "optional") onChange({ name: spec.name, default: spec.default ?? "" });
    else onChange({ name: spec.name, rest: true });
  };
  const modes: { m: Mode; label: string; title: string }[] = [
    { m: "required", label: "Required", title: "Must be typed" },
    { m: "optional", label: "Optional", title: "Uses the default when not typed" },
    ...(last || spec.rest ? [{ m: "rest" as const, label: "Rest of line", title: "Takes every remaining word, for searches" }] : []),
  ];
  return (
    <div className="var-row">
      <span className="var">{spec.name}</span>
      <div className="segmented sm" role="radiogroup" aria-label={`${spec.name} is`}>
        {modes.map(({ m, label, title }) => (
          <button type="button" key={m} role="radio" aria-checked={mode === m} className={mode === m ? "on" : undefined} title={title} onClick={() => setMode(m)}>
            {label}
          </button>
        ))}
      </div>
      {mode === "optional" && (
        <input
          className="mono default"
          value={spec.default ?? ""}
          onChange={(e) => onChange({ name: spec.name, default: e.target.value.replace(/[{}]/g, "") })}
          placeholder="Default (empty is fine)"
          spellCheck={false}
          aria-label={`Default for ${spec.name}`}
        />
      )}
    </div>
  );
}
