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
