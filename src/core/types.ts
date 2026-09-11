export type OpenMode = "current-tab" | "foreground-tab";

export const OPEN_MODES: readonly OpenMode[] = ["current-tab", "foreground-tab"];

/** Where a rendered URL is loaded. Superset of OpenMode: background tabs are a runtime override only. */
export type NavTarget = OpenMode | "background-tab";

export type Command = {
  id: string;
  keyword: string;
  name: string;
  template: string;
  aliases?: string[];
  openMode: OpenMode;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

/** Fields a user edits. Everything else is derived on save. */
export type CommandDraft = Pick<Command, "keyword" | "name" | "template" | "openMode" | "aliases">;

/** Local-only usage metadata: Command id → last invocation time. Never holds argument values. */
export type Usage = Record<string, number>;

/** User-facing toggles. Stored under their own key, separate from Commands. */
export type Preferences = {
  /** Offer the clipboard's contents as the next Argument in the Launcher. Needs the optional `clipboardRead` permission. */
  clipboardSuggestions: boolean;
  /** "Open with JumpKey" submenu on selected text, for Commands with exactly one Variable. */
  contextMenu: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = { clipboardSuggestions: false, contextMenu: true };
