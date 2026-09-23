// build, zip dist/ into site/jumpkey.zip, stamp the version into site/index.html
import { execSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const zip = resolve(root, "site/jumpkey.zip");

execSync("npm run build", { cwd: root, stdio: "inherit" });

const tmp = mkdtempSync(join(tmpdir(), "jumpkey-"));
cpSync(resolve(root, "dist"), join(tmp, "jumpkey"), { recursive: true });
rmSync(zip, { force: true });
execSync(`zip -qr -X "${zip}" jumpkey`, { cwd: tmp, stdio: "inherit" });
rmSync(tmp, { recursive: true, force: true });

const page = resolve(root, "site/index.html");
const html = readFileSync(page, "utf8").replace(/(data-version(?:="[^"]*")?>)[^<]*/g, `$1v${version}`);
writeFileSync(page, html);

const kb = Math.round(statSync(zip).size / 1024);
console.log(`site/jumpkey.zip  v${version}  ${kb} KB`);
