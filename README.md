# JumpKey

A command palette for parameterized URLs. Type `wf 7f4c2a`, land on `https://joinmando.com/workflow/7f4c2a`.

See `url-shortcut-extension-product-spec.md` for the full spec, `CONTEXT.md` for vocabulary, `docs/adr/` for decisions.

## Develop

```sh
npm install
npm run dev        # HMR build into dist/
npm test
npm run lint
npm run build      # typecheck + production build into dist/
```

Load `dist/` as an unpacked extension at `chrome://extensions` (enable Developer mode). Dev builds seed three sample commands; production builds start empty.

Open the launcher with **Cmd+Shift+K** (Ctrl+Shift+K on Windows/Linux). Change it at `chrome://extensions/shortcuts`.

Open the manage page with **Cmd+Shift+O** (Ctrl+Shift+O), or **Cmd+,** from inside the launcher.

From the address bar: type `jk`, press Tab (or Space), then an invocation, e.g. `jk wf 7f4c2a`. Suggestions show matching keywords; the default row previews the resolved URL. Shift+Enter opens in a new tab.

In the launcher: Enter opens with the command's default, Cmd/Ctrl+Enter forces a new tab, Shift+Enter opens a background tab, Tab completes the highlighted command. The list matches keyword and alias prefixes and name substrings; with nothing typed it is ordered by most recent use.

Arguments are space-separated and fill template variables in order. Wrap an argument in double quotes to keep spaces inside it: `issue "my repo" 42`. Arguments in the URL path keep `/` unescaped so `repo MandoHQ/app` works; query and hash arguments are fully encoded.

Commands can have aliases (extra keywords). The manage page exports all commands to JSON and imports a JSON file, with a choice to keep or replace commands whose keyword already exists.

Usage is tracked locally as command id → last used time (no arguments), stored under a separate key from the commands.

## Layout

- `src/core/` — browser-independent engine: template parsing/rendering, invocation parsing, matching, validation. No `chrome` imports (enforced by ESLint).
- `src/storage/` — `StoreRepository` over `chrome.storage.local`, schema migrations, dev seed.
- `src/popup/` — the Launcher.
- `src/background/` — service worker; registers the `jk` omnibox keyword and reuses the core engine.
- `src/options/` — command list and editor.
