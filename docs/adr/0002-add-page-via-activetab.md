---
status: accepted
---

# "Add page" reads the tab URL with `activeTab`, and the picker derives templates by alignment

Creating a Command from the current page needs the tab's URL. `activeTab` is granted for the duration of a user gesture on the action (click or `_execute_action`), so the popup reads `tab.url` and hands it to the manage page as `?from=&title=` query params. No `tabs` permission, no host permissions.

The template field stays the source of truth. The variable picker is a pure projection: the source URL is split into Slots, the current template is split the same way and aligned Slot-for-Slot (`alignTemplate`). If the user edits the template by hand so it no longer aligns, the picker simply disappears instead of fighting the text. Any variable-free URL typed into the field becomes the new source, so the picker is not limited to the "Add page" flow.

ID-like Slots (UUIDs, digits, hex, opaque tokens with ≥2 digits) are pre-selected only when seeding from a page; for pasted URLs they are highlighted but left to the user.

## Considered Options

- `tabs` permission: works from the manage page directly, rejected for the broad "read browsing activity" warning.
- Passing the URL through `chrome.storage.session`: stateless query params are simpler and survive an already-open manage tab.
- A separate picker state synced to the template: rejected; two sources of truth drift.
