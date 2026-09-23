import { useEffect, useState } from "react";
import type { Preferences } from "../core";
import { SYNC_STATUS_KEY, type SyncStatus } from "../storage/sync";
import { TABS_PERMISSION } from "../shared/open";
import { Clipboard, Cloud, MenuIcon, Tabs } from "../shared/icons";

const CLIPBOARD = { permissions: ["clipboardRead" as const] };

function useSyncStatus(): SyncStatus | null {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  useEffect(() => {
    void chrome.storage.local.get(SYNC_STATUS_KEY).then((r) => setStatus((r[SYNC_STATUS_KEY] as SyncStatus | undefined) ?? null));
    const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes[SYNC_STATUS_KEY]) setStatus((changes[SYNC_STATUS_KEY].newValue as SyncStatus | undefined) ?? null);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);
  return status;
}

type Props = {
  prefs: Preferences;
  onChange: (next: Preferences) => void | Promise<void>;
};

export function Settings({ prefs, onChange }: Props) {
  const syncStatus = useSyncStatus();

  useEffect(() => {
    if (prefs.clipboardSuggestions) {
      void chrome.permissions.contains(CLIPBOARD).then((has) => {
        if (!has) void onChange({ ...prefs, clipboardSuggestions: false });
      });
    }
    if (prefs.switchToOpenTab) {
      void chrome.permissions.contains(TABS_PERMISSION).then((has) => {
        if (!has) void onChange({ ...prefs, switchToOpenTab: false });
      });
    }
  }, [prefs, onChange]);

  const toggleSwitchTab = async () => {
    if (prefs.switchToOpenTab) {
      await onChange({ ...prefs, switchToOpenTab: false });
      await chrome.permissions.remove(TABS_PERMISSION);
      return;
    }
    const granted = await chrome.permissions.request(TABS_PERMISSION);
    if (granted) await onChange({ ...prefs, switchToOpenTab: true });
  };

  const toggleClipboard = async () => {
    if (prefs.clipboardSuggestions) {
      await onChange({ ...prefs, clipboardSuggestions: false });
      await chrome.permissions.remove(CLIPBOARD);
      return;
    }
    // has to happen inside the click, chrome wants a user gesture
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
      <Row
        icon={<Tabs size={16} strokeWidth={1.8} />}
        title="Switch to a tab that is already open"
        body="If the page is already open, go to that tab instead of opening it again. Chrome will ask for permission to see your open tabs; JumpKey only compares their addresses when you open a command."
        on={prefs.switchToOpenTab}
        onToggle={() => void toggleSwitchTab()}
      />
      <Row
        icon={<Cloud size={16} strokeWidth={1.8} />}
        title="Sync commands across devices"
        body="Keep your commands the same on every computer signed in to this Chrome profile. Settings and usage history stay on this device."
        on={prefs.sync}
        onToggle={() => void onChange({ ...prefs, sync: !prefs.sync })}
      >
        {prefs.sync && syncStatus && !syncStatus.ok && <p className="setting-err">Last sync failed: {syncStatus.error}</p>}
      </Row>
    </section>
  );
}

type RowProps = { icon: React.ReactNode; title: string; body: string; on: boolean; onToggle: () => void; children?: React.ReactNode };

function Row({ icon, title, body, on, onToggle, children }: RowProps) {
  return (
    <div className="setting">
      <span className="setting-ico">{icon}</span>
      <div className="setting-txt">
        <h3>{title}</h3>
        <p>{body}</p>
        {children}
      </div>
      <button className={`switch${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={title} onClick={onToggle}>
        <span />
      </button>
    </div>
  );
}
