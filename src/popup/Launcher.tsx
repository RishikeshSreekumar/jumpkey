import { useEffect, useMemo, useRef, useState } from "react";
import {
  assignArguments,
  filterCommands,
  formatUsageVariable,
  parseInvocation,
  recognize,
  resolveCommand,
  resolveInvocation,
  shortValue,
  specsOf,
  type Command,
  type NavTarget,
  type Resolution,
} from "../core";
import { useStore } from "../storage/useStore";
import { navigate } from "./navigate";
import { addCurrentPage } from "./addPage";
import { readClipboardArgument } from "./clipboard";
import { Logo } from "../shared/Logo";
import { ArrowRight, Clipboard, Gear, OpenModeIcon, Plus } from "../shared/icons";

const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

export function Launcher() {
  const { store, usage, prefs, touch } = useStore();
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = store?.commands ?? [];
  const resolved = useMemo(() => resolveInvocation(input, commands), [input, commands]);
  const invocation = useMemo(() => parseInvocation(input), [input]);
  const hasArgs = /\s/.test(input.trim());
  const recognized = resolved.ok && resolved.recognized ? [resolved.command, ...(resolved.alternatives ?? [])] : null;
  const filtered = useMemo(() => filterCommands(commands, input, usage), [commands, input, usage]);
  const list = recognized ?? filtered;
  const picked = recognized?.[selected];
  const resolution: Resolution =
    picked && resolved.ok && picked.id !== resolved.command.id ? resolveCommand(picked, invocation.tokens, { recognized: true }) : resolved;
  const active = "command" in resolution ? resolution.command : undefined;
  const typedArgs = resolution.ok && resolution.recognized ? invocation.tokens : invocation.args;

  useEffect(() => inputRef.current?.focus(), [store]);
  useEffect(() => setSelected(0), [input]);
  useEffect(() => {
    if (!prefs.clipboardSuggestions) return;
    let cancelled = false;
    void readClipboardArgument().then((v) => { if (!cancelled) setClip(v); });
    return () => { cancelled = true; };
  }, [prefs.clipboardSuggestions]);

  const clipSuggestion =
    clip && !resolution.ok && resolution.kind === "missing-argument" && !invocation.args.includes(clip) ? clip : null;
  const clipCommand = clip && input.trim() === "" ? recognize([clip], commands)[0] : undefined;

  const insertKeyword = (c: Command) => {
    setInput(`${c.keyword} `);
    inputRef.current?.focus();
  };

  const run = async (override?: NavTarget, res: Resolution = resolution) => {
    if (!res.ok) return;
    const target = override ?? res.command.openMode;
    try {
      // record usage first, navigate() closes the popup
      await touch(res.command.id);
      await navigate(res.urls, target);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    }
  };

  const quote = (a: string) => (/\s/.test(a) ? `"${a}"` : a);

  const applyClip = (go: boolean) => {
    if (!clipSuggestion || !active) return;
    const args = [...invocation.args, clipSuggestion];
    const text = [invocation.keyword, ...args.map(quote)].join(" ");
    const next = resolveInvocation(text, commands);
    setInput(next.ok ? text : text + " ");
    inputRef.current?.focus();
    if (go && next.ok) void run(undefined, next);
  };

  const applyClipValue = (go: boolean) => {
    if (!clip || !clipCommand) return;
    setInput(clip);
    inputRef.current?.focus();
    if (go) void run(undefined, resolveInvocation(clip, commands));
  };

  const addPage = async () => {
    const r = await addCurrentPage();
    if (!r.ok) setRunError(r.error);
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
        e.preventDefault();
        if (clipSuggestion) {
          applyClip(false);
          break;
        }
        if (clipCommand) {
          applyClipValue(false);
          break;
        }
        const c = list[selected];
        if (c && !hasArgs) insertKeyword(c);
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (clipSuggestion) {
          applyClip(true);
          break;
        }
        if (clipCommand) {
          applyClipValue(true);
          break;
        }
        const c = list[selected];
        if (!hasArgs && !recognized && c && !(resolution.ok && resolution.command.id === c.id)) {
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
      case "s":
      case "S":
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          void addPage();
        }
        break;
    }
  };

  const openOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  };

  const openStarters = (e: React.MouseEvent) => {
    e.preventDefault();
    void chrome.tabs.create({ url: chrome.runtime.getURL("src/options/index.html?starters=1") }).then(() => window.close());
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
        <button className="addpage" onClick={() => void addPage()} title={`Add this page as a command (${MOD}S)`} tabIndex={-1}>
          <Plus size={13} strokeWidth={2.4} />
          <span>Add page</span>
        </button>
      </div>

      {active && <ArgumentTrail command={active} args={typedArgs} tabs={resolution.ok ? resolution.urls.length : 1} />}
      {clipCommand && clip ? (
        <button type="button" className="status clip" onClick={() => applyClipValue(true)} title={clip} tabIndex={-1}>
          <Clipboard size={13} strokeWidth={1.9} />
          <span>Copied</span>
          <code>{shortValue(clip)}</code>
          <span>→ {clipCommand.name}</span>
          <span className="keys"><kbd>⇥</kbd> fill <kbd>↵</kbd> go</span>
        </button>
      ) : (
        <Status resolution={resolution} runError={runError} hasArgs={hasArgs} onSuggestion={useSuggestion} clip={clipSuggestion} onClip={() => applyClip(true)} />
      )}

      {(!hasArgs || recognized) && (
        <ul className="list" role="listbox">
          {recognized && <li className="group">Recognized as</li>}
          {list.map((c, i) => {
            const specs = specsOf(c);
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
                  {specs.length > 0 ? specs.map(formatUsageVariable).join(" ") : "—"}
                </span>
              </li>
            );
          })}
          {store && list.length === 0 && (
            <li className="empty">
              {commands.length === 0 ? (
                <>
                  No commands yet. <a href="#" onClick={openStarters}>Pick from common tools</a> or{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); void addPage(); }}>add this page</a>
                </>
              ) : (
                <>
                  No matching commands. <a href="#" onClick={openOptions}>Create one</a> or{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); void addPage(); }}>add this page</a>
                </>
              )}
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

function ArgumentTrail({ command, args, tabs }: { command: Command; args: string[]; tabs: number }) {
  const specs = specsOf(command);
  if (specs.length === 0) return null;
  const shown = tabs > 1 ? args.slice(0, 1) : args;
  const { given, missing, extra } = assignArguments(specs, shown);
  return (
    <div className="trail">
      <span className="trail-kw">{command.keyword}</span>
      {specs.map((s, i) => {
        const value = given[i];
        const cls = value !== undefined ? "chip filled" : s === missing ? "chip next" : s.default !== undefined ? "chip default" : "chip";
        const shownValue = value ?? s.default;
        return (
          <span key={s.name} className={cls} title={s.default !== undefined ? `${s.name} (default: ${s.default || "empty"})` : s.name}>
            <span className="chip-label">{s.name}</span>
            {shownValue !== undefined && <span className="chip-value">{shownValue === "" ? "“”" : shownValue}</span>}
          </span>
        );
      })}
      {tabs > 1 && <span className="chip tabs">{tabs} tabs</span>}
      {extra > 0 && tabs <= 1 && <span className="chip extra">+{extra} extra</span>}
    </div>
  );
}

type StatusProps = {
  resolution: Resolution;
  runError: string | null;
  hasArgs: boolean;
  onSuggestion: (keyword: string) => void;
  clip: string | null;
  onClip: () => void;
};

function Status({ resolution, runError, hasArgs, onSuggestion, clip, onClip }: StatusProps) {
  if (runError) return <div className="status error">{runError}</div>;
  if (resolution.ok) {
    const more = resolution.urls.length - 1;
    return (
      <div className="status preview">
        <ArrowRight size={12} />
        <span className="url">{resolution.url}</span>
        {more > 0 && <span className="more">+{more} more</span>}
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
      if (clip) {
        return (
          <button type="button" className="status clip" onClick={onClip} title={clip} tabIndex={-1}>
            <Clipboard size={13} strokeWidth={1.9} />
            <span>{resolution.message} — use clipboard</span>
            <code>{shortValue(clip)}</code>
            <span className="keys"><kbd>⇥</kbd> fill <kbd>↵</kbd> go</span>
          </button>
        );
      }
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
