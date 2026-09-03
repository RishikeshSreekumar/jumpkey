import { useRef, useState } from "react";
import { exportCommands, mergeImport, parseImport, type Command, type CommandDraft, type ConflictStrategy } from "../core";

type Props = {
  commands: readonly Command[];
  onImport: (next: Command[]) => Promise<void>;
};

type Pending = { name: string; commands: CommandDraft[]; rejected: string[] };

export function ImportExport({ commands, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<ConflictStrategy>("skip");

  const download = () => {
    const blob = new Blob([exportCommands(commands)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jumpkey-commands-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = async (file: File | undefined) => {
    setError(null);
    setNotice(null);
    setPending(null);
    if (!file) return;
    const parsed = parseImport(await file.text());
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (parsed.commands.length === 0) {
      setError(parsed.rejected.length > 0 ? `No usable commands. ${parsed.rejected.join("; ")}` : "File contains no commands.");
      return;
    }
    setPending({ name: file.name, commands: parsed.commands, rejected: parsed.rejected });
  };

  const confirm = async () => {
    if (!pending) return;
    const r = mergeImport(commands, pending.commands, strategy);
    await onImport(r.commands);
    const parts = [`${r.added} added`];
    if (r.replaced) parts.push(`${r.replaced} replaced`);
    if (r.skipped) parts.push(`${r.skipped} skipped`);
    setNotice(`Imported ${pending.name}: ${parts.join(", ")}.`);
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const conflicts = pending ? pending.commands.filter((d) => commands.some((c) => c.keyword === d.keyword)).length : 0;

  return (
    <section className="card io">
      <div className="io-row">
        <div>
          <h2>Import / export</h2>
          <p className="muted">Plain JSON. Back up your commands or share a set with a teammate.</p>
        </div>
        <div className="io-actions">
          <button onClick={download} disabled={commands.length === 0}>Export {commands.length > 0 ? `${commands.length} ` : ""}to JSON</button>
          <button onClick={() => fileRef.current?.click()}>Import JSON…</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </div>
      </div>

      {error && <p className="err">{error}</p>}
      {notice && <p className="ok">{notice}</p>}

      {pending && (
        <div className="io-confirm">
          <p>
            <strong>{pending.name}</strong>: {pending.commands.length} command{pending.commands.length === 1 ? "" : "s"}
            {conflicts > 0 && <>, {conflicts} with a keyword you already have</>}.
          </p>
          {pending.rejected.length > 0 && (
            <p className="warn">Skipping {pending.rejected.length} invalid: {pending.rejected.join("; ")}</p>
          )}
          {conflicts > 0 && (
            <div className="segmented">
              <button type="button" className={strategy === "skip" ? "on" : undefined} onClick={() => setStrategy("skip")}>Keep mine</button>
              <button type="button" className={strategy === "replace" ? "on" : undefined} onClick={() => setStrategy("replace")}>Replace with imported</button>
            </div>
          )}
          <div className="io-actions">
            <button onClick={() => { setPending(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancel</button>
            <button className="primary" onClick={() => void confirm()}>Import</button>
          </div>
        </div>
      )}
    </section>
  );
}
