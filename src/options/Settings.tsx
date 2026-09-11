import { useEffect } from "react";
import type { Preferences } from "../core";
import { Clipboard, MenuIcon } from "../shared/icons";

const CLIPBOARD = { permissions: ["clipboardRead" as const] };

type Props = {
  prefs: Preferences;
  onChange: (next: Preferences) => void | Promise<void>;
};

/** Preferences card. The clipboard toggle doubles as the optional-permission request. */
export function Settings({ prefs, onChange }: Props) {
  // Permission can be revoked outside the extension; keep the switch honest.
  useEffect(() => {
    if (!prefs.clipboardSuggestions) return;
    void chrome.permissions.contains(CLIPBOARD).then((has) => {
      if (!has) void onChange({ ...prefs, clipboardSuggestions: false });
    });
  }, [prefs, onChange]);

  const toggleClipboard = async () => {
    if (prefs.clipboardSuggestions) {
      await onChange({ ...prefs, clipboardSuggestions: false });
      await chrome.permissions.remove(CLIPBOARD);
      return;
    }
    // Must run inside the click handler: Chrome requires a user gesture.
    const granted = await chrome.permissions.request(CLIPBOARD);
    if (granted) await onChange({ ...prefs, clipboardSuggestions: true });
  };

  return (
    <section className="card settings">
      <header className="settings-head"><h2>Settings</h2></header>
      <Row
        icon={<Clipboard size={16} strokeWidth={1.8} />}
        title="Clipboard suggestions"
        body="When the launcher opens, offer what you last copied as the next argument. Read only while the launcher is open, never stored or sent anywhere. Asks for the clipboard permission once."
        on={prefs.clipboardSuggestions}
        onToggle={() => void toggleClipboard()}
      />
      <Row
        icon={<MenuIcon size={16} strokeWidth={1.8} />}
        title="Right-click menu on selected text"
        body="Adds “Open with JumpKey” to the page context menu, listing every command that takes exactly one argument. The selection fills it."
        on={prefs.contextMenu}
        onToggle={() => void onChange({ ...prefs, contextMenu: !prefs.contextMenu })}
      />
    </section>
  );
}

function Row({ icon, title, body, on, onToggle }: { icon: React.ReactNode; title: string; body: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="setting">
      <span className="setting-ico">{icon}</span>
      <div className="setting-txt">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <button className={`switch${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={title} onClick={onToggle}>
        <span />
      </button>
    </div>
  );
}
