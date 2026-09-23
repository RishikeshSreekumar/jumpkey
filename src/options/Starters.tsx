import { useState } from "react";
import { PRESETS, missingSetup, presetDraft, validateDraft, type Command, type CommandDraft, type Preset } from "../core";
import { Check, Plus } from "../shared/icons";

type Props = {
  existing: readonly Command[];
  onAdd: (draft: CommandDraft) => Promise<void>;
  onEdit: (draft: CommandDraft) => void;
};

const groups = [...new Set(PRESETS.map((p) => p.group))];

export function Starters({ existing, onAdd, onEdit }: Props) {
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());
  const [missing, setMissing] = useState<string | null>(null);

  const isAdded = (p: Preset) => added.has(p.id) || existing.some((c) => c.keyword === p.keyword && c.name === p.name);

  const add = async (p: Preset) => {
    const v = values[p.id] ?? {};
    if (missingSetup(p, v).length > 0) {
      setMissing(p.id);
      return;
    }
    setMissing(null);
    const draft = presetDraft(p, v);
    const { errors } = validateDraft(draft, existing);
    if (Object.keys(errors).length > 0) {
      onEdit(draft);
      return;
    }
    await onAdd(draft);
    setAdded((s) => new Set(s).add(p.id));
  };

  const setValue = (id: string, key: string, value: string) =>
    setValues((all) => ({ ...all, [id]: { ...all[id], [key]: value } }));

  return (
    <div className="starters">
      {groups.map((g) => (
        <section key={g} className="starter-group">
          <h3>{g}</h3>
          <ul>
            {PRESETS.filter((p) => p.group === g).map((p) => (
              <li key={p.id} className={isAdded(p) ? "starter done" : "starter"}>
                <div className="starter-txt">
                  <span className="starter-name">{p.name}</span>
                  <code className="starter-ex">
                    <b>{p.keyword}</b> {p.example}
                  </code>
                </div>
                {p.setup && !isAdded(p) && (
                  <div className="starter-setup">
                    {p.setup.map((f) => (
                      <input
                        key={f.key}
                        className={missing === p.id && !(values[p.id]?.[f.key] ?? "").trim() ? "mono invalid" : "mono"}
                        value={values[p.id]?.[f.key] ?? ""}
                        onChange={(e) => setValue(p.id, f.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void add(p);
                          }
                        }}
                        placeholder={f.placeholder}
                        aria-label={f.label}
                        title={f.label}
                        spellCheck={false}
                      />
                    ))}
                  </div>
                )}
                {isAdded(p) ? (
                  <span className="starter-added">
                    <Check size={13} strokeWidth={2.4} />
                    Added
                  </span>
                ) : (
                  <button type="button" className="btn sm" onClick={() => void add(p)}>
                    <Plus size={12} strokeWidth={2.4} />
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
