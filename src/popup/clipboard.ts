import { clipboardArgument } from "../core";

const PERMISSION = { permissions: ["clipboardRead" as const] };

/**
 * Read the clipboard once, as an Argument candidate. Returns null unless the
 * optional `clipboardRead` permission is granted and the text looks like a value.
 * The caller only asks when the preference is on; never reads otherwise.
 */
export async function readClipboardArgument(): Promise<string | null> {
  try {
    if (!(await chrome.permissions.contains(PERMISSION))) return null;
    return clipboardArgument(await navigator.clipboard.readText());
  } catch {
    return null;
  }
}
