# Contributing to JumpKey

Thanks for your interest in JumpKey. Bug reports, ideas, new Starters, docs fixes and code are all welcome.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug.** Open an issue with the bug report form. Include your Chrome version, the Command's Template, what you typed, and what happened versus what you expected.
- **Suggest a feature.** Open an issue with the feature request form and describe the problem first, then your idea for solving it. For anything larger than a small change, please wait for a maintainer to respond before writing code, so your time isn't spent on something that doesn't fit.
- **Add a Starter.** Starters are ready-made Commands for common tools (see [Adding a Starter](#adding-a-starter)). They are a good first contribution.
- **Improve the docs.** The README should always match how the extension behaves.
- **Pick up an issue.** Issues labeled `good first issue` or `help wanted` are open for anyone. Comment on the issue before you start so work isn't duplicated.

Found a security problem? Don't open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

You need Node.js 22 (see `.nvmrc`) and Chrome or another Chromium-based browser.

```sh
git clone https://github.com/RishikeshSreekumar/jumpkey.git
cd jumpkey
npm install
npm run dev        # HMR build into dist/
```

Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `dist/` folder. Dev builds seed three sample Commands; production builds start empty.

Before you push:

```sh
npm run lint
npm test
npm run build      # typecheck + production build
```

CI runs all three on every pull request.

## How the code is organized

The [README](README.md#development) has the directory map. A few rules keep the codebase in shape:

- **`src/core/` stays browser-independent.** Template parsing, invocation parsing, matching and validation live there, with no `chrome`, `window`, `document` or React. ESLint enforces this. Logic that can go in `core` should, because it's where the tests are.
- **Explain permission changes.** If a change adds a permission or changes the storage format, say why in the pull request description.
- **Stay local-first.** JumpKey has no backend, no analytics and no network calls of its own. New permissions should be *optional*, requested from a Settings switch when the user turns the feature on. Pull requests that add telemetry or required host permissions won't be accepted.
- **Migrate stored data.** A change to the shape of stored data needs a migration in `src/storage/schema.ts` and a test, so existing users keep their Commands.

## Tests

Tests use [Vitest](https://vitest.dev) and sit next to the code they test (`parser.ts` → `parser.test.ts`). `npm run test:watch` reruns them as you edit.

- Bug fixes should come with a test that fails without the fix.
- New behavior in `src/core/` or `src/storage/` needs tests.
- UI changes in `src/popup/` and `src/options/` aren't unit tested. Describe how you checked them by hand in the pull request, and add a screenshot or short recording if the change is visible.

## Adding a Starter

Starters live in `src/core/presets.ts`, and `presets.test.ts` checks that each one is valid. To add one:

1. Add an entry next to similar tools. Use the tool's real, public URL format.
2. If the URL depends on the user's account (a company subdomain, an org name), ask for it as a setup value instead of hardcoding one.
3. If the tool's IDs have a distinctive shape (`ENG-482`, `cus_…`), add a Pattern so a copied ID is recognized without a Keyword. Keep it tight enough not to match unrelated values.
4. Run `npm test`, then try the Starter in the extension: add it from the manage page and open a real ID.

## Commits and pull requests

1. Fork the repository and create a branch from `main` (`fix/omnibox-empty-args`, `starter/sentry`).
2. Keep each pull request to one change. Small pull requests get reviewed faster.
3. Write commit messages in the imperative mood, the way the history does: "Add Sentry starter", "Fix rest variable with trailing space".
4. Update the README if your change affects what it describes.
5. Open the pull request and fill in the template. Link the issue it closes.

A maintainer will review it, possibly ask for changes, and merge it when it's ready. Please be patient; this is a side project.

**Please don't** bump the version or change `site/jumpkey.zip` in your pull request. The maintainer does both when cutting a release (`npm run package`, described in the README).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
