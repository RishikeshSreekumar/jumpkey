import { useEffect, useMemo, useRef, useState } from "react";
import {
  filterCommands,
  parseInvocation,
  resolveInvocation,
  variablesOf,
  type Command,
  type NavTarget,
  type Resolution,
} from "../core";
import { useStore } from "../storage/useStore";
import { navigate } from "./navigate";
import { Logo } from "../shared/Logo";
import { ArrowRight, Gear, OpenModeIcon } from "../shared/icons";

const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

export function Launcher() {
  const { store, usage, touch } = useStore();
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = store?.commands ?? [];
  const list = useMemo(() => filterCommands(commands, input, usage), [commands, input, usage]);
  const resolution = useMemo(() => resolveInvocation(input, commands), [input, commands]);
  const invocation = useMemo(() => parseInvocation(input), [input]);
  const hasArgs = /\s/.test(input.trim());
  const active = "command" in resolution ? resolution.command : undefined;

  useEffect(() => inputRef.current?.focus(), [store]);
  useEffect(() => setSelected(0), [input]);

  const insertKeyword = (c: Command) => {
    setInput(`${c.keyword} `);
    inputRef.current?.focus();
  };

  const run = async (override?: NavTarget) => {
    if (!resolution.ok) return;
    const target = override ?? resolution.command.openMode;
    try {
      // Record usage first: navigate() closes the popup, which would abort a later write.
      await touch(resolution.command.id);
      await navigate(resolution.url, target);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
        break;
      case "Tab": {
        // Focus always stays in the input; Tab only ever completes.
        e.preventDefault();
        const c = list[selected];
        if (c && !hasArgs) insertKeyword(c);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const c = list[selected];
        if (!hasArgs && c && !(resolution.ok && resolution.command.id === c.id)) {
          insertKeyword(c);
        } else if (e.metaKey || e.ctrlKey) {
          void run("foreground-tab");
        } else if (e.shiftKey) {
          void run("background-tab");
        } else {
          void run();
        }
        break;
      }
      case "Escape":
        window.close();
        break;
      case ",":
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        }
        break;
    }
  };

  const openOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  };

  const useSuggestion = (keyword: string) => {
    const rest = invocation.args.map((a) => (/\s/.test(a) ? `"${a}"` : a));
    setInput([keyword, ...rest].join(" ") + (rest.length === 0 ? " " : ""));
    inputRef.current?.focus();
  };

  return (
    <div className="launcher" onKeyDown={onKeyDown}>
      <div className="search">
        <Logo size={22} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command…"
          spellCheck={false}
          autoComplete="off"
        />
        {input ? (
          <button className="clear" onClick={() => { setInput(""); inputRef.current?.focus(); }} aria-label="Clear" tabIndex={-1}>
            ×
          </button>
        ) : (
          <span className="esc">esc</span>
        )}
      </div>

      {active && <ArgumentTrail command={active} args={invocation.args} />}
      <Status resolution={resolution} runError={runError} hasArgs={hasArgs} onSuggestion={useSuggestion} />

      {!hasArgs && (
        <ul className="list" role="listbox">
          {list.map((c, i) => {
            const vars = variablesOf(c);
            return (
              <li
                key={c.id}
                role="option"
                aria-selected={i === selected}
                className={i === selected ? "selected" : undefined}
                onMouseEnter={() => setSelected(i)}
                onClick={() => insertKeyword(c)}
              >
                <span className="kw">{c.keyword}</span>
                <span className="name">{c.name}</span>
                <span className="hint">
                  <OpenModeIcon mode={c.openMode} size={12} />
                  {vars.length > 0 ? vars.map((v) => `<${v}>`).join(" ") : "—"}
                </span>
              </li>
            );
          })}
          {store && list.length === 0 && (
            <li className="empty">
              {commands.length === 0 ? "No commands yet." : "No matching commands."}{" "}
              <a href="#" onClick={openOptions}>Create one</a>
            </li>
          )}
        </ul>
      )}

      <div className="footer">
        <span className="key"><kbd>↵</kbd>open</span>
        <span className="key"><kbd>{MOD}↵</kbd>new tab</span>
        <span className="key"><kbd>⇧↵</kbd>background</span>
        <span className="key"><kbd>⇥</kbd>complete</span>
        <span className="spacer" />
        <a href="#" onClick={openOptions}><Gear size={13} strokeWidth={1.9} />Manage <kbd>{MOD},</kbd></a>
      </div>
    </div>
  );
}

/** Shows each Variable of the active Command with the Argument that fills it. */
function ArgumentTrail({ command, args }: { command: Command; args: string[] }) {
  const vars = variablesOf(command);
  if (vars.length === 0) return null;
  const next = args.length;
  return (
    <div className="trail">
      <span className="trail-kw">{command.keyword}</span>
      {vars.map((v, i) => {
        const filled = i < args.length;
        const cls = filled ? "chip filled" : i === next ? "chip next" : "chip";
        return (
          <span key={v} className={cls} title={v}>
            <span className="chip-label">{v}</span>
            {filled && <span className="chip-value">{args[i] === "" ? "“”" : args[i]}</span>}
          </span>
        );
      })}
      {args.length > vars.length && <span className="chip extra">+{args.length - vars.length} extra</span>}
    </div>
  );
}

type StatusProps = {
  resolution: Resolution;
  runError: string | null;
  hasArgs: boolean;
  onSuggestion: (keyword: string) => void;
};

function Status({ resolution, runError, hasArgs, onSuggestion }: StatusProps) {
  if (runError) return <div className="status error">{runError}</div>;
  if (resolution.ok) {
    return (
      <div className="status preview">
        <ArrowRight size={12} />
        <span className="url">{resolution.url}</span>
      </div>
    );
  }
  switch (resolution.kind) {
    case "empty":
      return null;
    case "unknown-command":
      if (!hasArgs) return null;
      return (
        <div className="status error">
          {resolution.message}
          {resolution.suggestion && (
            <>
              {" "}Did you mean{" "}
              <a href="#" className="suggest" onClick={(e) => { e.preventDefault(); onSuggestion(resolution.suggestion!); }}>
                {resolution.suggestion}
              </a>
              ?
            </>
          )}
        </div>
      );
    case "missing-argument":
      return <div className="status hint">{resolution.message} — press space and type it</div>;
    case "too-many-arguments":
      return <div className="status error">{resolution.message} Wrap spaces in quotes: <code>"a b"</code></div>;
    case "invalid-url":
      return (
        <div className="status error">
          {resolution.message} <span className="detail">{resolution.detail}</span>
        </div>
      );
  }
}
