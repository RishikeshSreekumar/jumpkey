import { clipboardArgument } from "../core";

const PERMISSION = { permissions: ["clipboardRead" as const] };

export async function readClipboardArgument(): Promise<string | null> {
  try {
    if (!(await chrome.permissions.contains(PERMISSION))) return null;
    return clipboardArgument(await navigator.clipboard.readText());
  } catch {
    return null;
  }
}
