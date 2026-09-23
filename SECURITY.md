# Security Policy

## Supported versions

Only the latest release (the zip on the homepage and the `main` branch) gets security fixes.

## Reporting a vulnerability

Please don't open a public issue for security problems.

Report them privately through GitHub: go to the repository's **Security** tab and click **Report a vulnerability** ([direct link](https://github.com/RishikeshSreekumar/jumpkey/security/advisories/new)). Include:

- what the problem is and what an attacker could do with it,
- steps to reproduce, or a proof of concept,
- the JumpKey version and browser you tested with.

You should get a first response within a week. Once a fix is released, the advisory will be published, crediting you unless you'd rather stay anonymous.

## Scope

JumpKey runs entirely in the browser with no backend. Issues of particular interest:

- a crafted Template, Argument, imported JSON file or synced data that leads to script execution or navigation to an unexpected scheme (`javascript:`, `data:`),
- reading data (tab URLs, clipboard) beyond what a granted permission is documented to allow,
- any way for a web page to trigger or read JumpKey's Commands.
