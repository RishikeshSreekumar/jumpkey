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

## Layout

- `src/core/` — browser-independent engine: template parsing/rendering, invocation parsing, matching, validation, deriving a template from a URL. No `chrome` imports (enforced by ESLint).
- `src/storage/` — `StoreRepository` over `chrome.storage.local`, schema migrations, dev seed.
- `src/popup/` — the Launcher.
- `src/background/` — service worker; registers the `jk` omnibox keyword and reuses the core engine.
- `src/options/` — command list and editor.
