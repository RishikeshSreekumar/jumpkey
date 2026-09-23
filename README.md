# JumpKey

[![CI](https://github.com/RishikeshSreekumar/jumpkey/actions/workflows/ci.yml/badge.svg)](https://github.com/RishikeshSreekumar/jumpkey/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Chrome extension for pages you open by ID. Type `jira ENG-482`, land on `https://yourcompany.atlassian.net/browse/ENG-482`.

## Usage

- **Cmd+Shift+K** (Ctrl+Shift+K) opens the launcher. Type a keyword and its arguments, press Enter.
- **Cmd+Shift+O** (Ctrl+Shift+O) opens the manage page, where you add commands or pick from starters (Jira, Linear, GitHub, Stripe, …).
- In the address bar, type `jk`, press Tab, then a command: `jk jira ENG-482`.
- Select text on a page, right-click, **Open with JumpKey**.
- **Cmd+S** in the launcher turns the current page into a command, with ID-like parts of the URL already made into variables.

Templates use `{name}` for a required value, `{name=default}` for an optional one and `{name*}` for the rest of the line:

```
https://github.com/{repo=acme/web}/pull/{number}   pr 1297
https://www.google.com/search?q={query*}           g how to fold a map
```

A command with one variable opens a tab per value (`jira ENG-1 ENG-2`). Give it a pattern and a bare `ENG-482` works without the keyword.

Optional, off by default: clipboard suggestions, switching to an already-open tab, and syncing commands across your Chrome profile. Everything stays in your browser.

## Development

Requires Node.js 22.

```sh
npm install
npm run dev      # build into dist/ with HMR
npm test
npm run lint
npm run build
```

Load `dist/` as an unpacked extension at `chrome://extensions` with Developer mode on.

- `src/core/` parsing, matching and rendering, no browser APIs
- `src/storage/` storage, migrations, sync
- `src/popup/` launcher
- `src/options/` manage page
- `src/background/` service worker: omnibox, context menu, sync

JumpKey isn't on the Chrome Web Store. `site/` is the homepage with a downloadable zip; `npm run package` rebuilds the zip after a version bump in `package.json` and `manifest.config.ts`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
