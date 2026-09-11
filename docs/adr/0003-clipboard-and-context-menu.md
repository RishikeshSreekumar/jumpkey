---
status: accepted
---

# Clipboard suggestion is opt-in behind an optional permission; context menu lists one-Variable Commands only

Two V1.5 conveniences, both kept off the critical path so the base install still asks for nothing beyond `storage`, `activeTab` and `contextMenus` (which carries no install warning).

**Clipboard.** `clipboardRead` is declared as an *optional* permission and requested from the Settings switch, inside the click, so users who never turn it on never see the "read data you copy and paste" prompt. The Launcher reads the clipboard once per opening, only when the Preference is on, and only keeps it in component state. The value is offered as the next unfilled Variable of the active Command; Tab fills it, Enter fills and navigates when that completes the Invocation. The clipboard is never submitted without the suggestion being visible and a key or click on it. Whole URLs and multi-word text are not offered (`clipboardArgument`).

**Context menu.** A single top-level "Open with JumpKey" entry on text selections, with one child per enabled Command that has exactly one Variable. Commands with more Variables are omitted rather than opening a half-filled Launcher, since `action.openPopup` is not reliable across Chrome versions. The menu is rebuilt from the service worker on install, startup, and whenever Commands or Preferences change, and removed entirely when the Preference is off.

**Preferences** live under their own storage key (`prefs`), like usage, so toggling never rewrites the Commands blob.

## Considered Options

- Auto-submit clipboard on Enter at the keyword: rejected, spec forbids submitting without an explicit interaction on a visible suggestion.
- Required `clipboardRead` permission: rejected, install-time warning for a feature most users have not opted into.
- Context menu items for multi-Variable Commands that open the Launcher prefilled: deferred until `action.openPopup` is stable.
- Reading the clipboard from the service worker: not possible; only a focused document can read it.
