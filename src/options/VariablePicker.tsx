import { useEffect, useState } from "react";
import { displaySlot, looksLikeId, suggestName, suggestVariables, type Selection, type UrlToken } from "../core";
import { Braces, Close } from "../shared/icons";

type Props = {
  tokens: readonly UrlToken[];
  selection: Selection;
  onChange: (next: Selection) => void;
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * The source URL rendered as chips. Click a Slot to make it a Variable, edit the
 * name in place, × to turn it back into a literal.
 */
export function VariablePicker({ tokens, selection, onChange }: Props) {
  const taken = new Set(selection.values());
  const idLike = tokens.filter((t, i) => t.kind === "slot" && t.role !== "host" && looksLikeId(t.text) && !selection.has(i)).length;

  const select = (i: number) => {
    const next = new Map(selection);
    next.set(i, suggestName(tokens, i, taken));
    onChange(next);
  };
  const unselect = (i: number) => {
    const next = new Map(selection);
    next.delete(i);
    onChange(next);
  };
  const rename = (i: number, name: string) => {
    const next = new Map(selection);
    next.set(i, name);
    onChange(next);
  };
  const detect = () => {
    const suggested = suggestVariables(tokens);
    const next = new Map(selection);
    const used = new Set(taken);
    for (const [i] of suggested) {
      if (next.has(i)) continue;
      const name = suggestName(tokens, i, used);
      used.add(name);
      next.set(i, name);
    }
    onChange(next);
  };

  return (
    <div className="picker">
      <div className="picker-head">
        <Braces size={13} strokeWidth={2.2} />
        <span>Click a part of the URL to turn it into a variable.</span>
        <span className="spacer" />
        {idLike > 0 && (
          <button type="button" className="linkbtn" onClick={detect}>
            Detect {idLike} ID{idLike === 1 ? "" : "s"}
          </button>
        )}
        {selection.size > 0 && (
          <button type="button" className="linkbtn" onClick={() => onChange(new Map())}>
            Reset
          </button>
        )}
      </div>
      <div className="picker-url" role="group" aria-label="URL parts">
        {tokens.map((t, i) => {
          if (t.kind === "sep") return <span key={i} className="psep">{t.text}</span>;
          const name = selection.get(i);
          if (name !== undefined) {
            return (
              <span key={i} className="pslot on" title={`Was: ${displaySlot(t.text)}`}>
                <span className="brace">{"{"}</span>
                <NameInput value={name} onCommit={(n) => rename(i, n)} />
                <span className="brace">{"}"}</span>
                <button type="button" className="unset" title="Back to literal" onClick={() => unselect(i)}>
                  <Close size={10} strokeWidth={2.4} />
                </button>
              </span>
            );
          }
          const hint = looksLikeId(t.text) && t.role !== "host";
          return (
            <button
              key={i}
              type="button"
              className={`pslot${hint ? " idlike" : ""}`}
              title={hint ? "Looks like an ID — click to make it a variable" : "Make this a variable"}
              onClick={() => select(i)}
            >
              {displaySlot(t.text)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Inline name editor: commits on blur/Enter, reverts on Escape or invalid input. */
function NameInput({ value, onCommit }: { value: string; onCommit: (name: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const commit = () => {
    const n = text.trim();
    if (n && IDENT.test(n) && n !== value) onCommit(n);
    else setText(value);
  };

  return (
    <input
      className="pname"
      value={text}
      size={Math.max(1, text.length)}
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          setText(value);
          e.currentTarget.blur();
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
