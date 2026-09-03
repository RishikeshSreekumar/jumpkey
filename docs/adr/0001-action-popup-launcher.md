---
status: accepted
---

# Launcher is the extension action popup, not an in-page overlay

Most command launchers inject an overlay into the current page, but that requires `<all_urls>` host permission, which conflicts with the minimal-permissions principle and adds Web Store review friction. We open the Launcher via the `_execute_action` keyboard command so it renders as the action popup, needing only the `storage` permission. Accepted costs: the popup is size-capped, closes on focus loss, and cannot visually blend with the page.

## Considered Options

- Content-script overlay: best UX, rejected for `<all_urls>`.
- Side panel: persistent, wrong shape for fire-and-forget commands.
- Omnibox only: no custom UI, kept as a secondary surface for V1.
