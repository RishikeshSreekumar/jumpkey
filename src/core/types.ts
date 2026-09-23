export type OpenMode = "current-tab" | "foreground-tab";

export const OPEN_MODES: readonly OpenMode[] = ["current-tab", "foreground-tab"];

export type NavTarget = OpenMode | "background-tab";

export type Command = {
  id: string;
  keyword: string;
  name: string;
  template: string;
  aliases?: string[];
  pattern?: string;
  openMode: OpenMode;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CommandDraft = Pick<Command, "keyword" | "name" | "template" | "openMode" | "aliases" | "pattern">;

export type Usage = Record<string, number>;

export type Preferences = {
  clipboardSuggestions: boolean;
  contextMenu: boolean;
  switchToOpenTab: boolean;
  sync: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = { clipboardSuggestions: false, contextMenu: true, switchToOpenTab: false, sync: false };
