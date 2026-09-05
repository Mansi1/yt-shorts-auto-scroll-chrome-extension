/**
 * Builds the loadable extension into dist/:
 *   src/*.ts   -> dist/*.js   (tsc)
 *   public/*   -> dist/*      (verbatim copy: manifest, popup, icons)
 *
 * Pass --watch to keep recompiling; static assets are copied once up front.
 */
import { spawn } from "node:child_process";
import { cpSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");

const tsc = join(root, "node_modules", ".bin", "tsc");
if (!existsSync(tsc)) {
  console.error("TypeScript not installed - run `npm install` first.");
  process.exit(1);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    child.on("error", reject);
  });
}

function copyAssets() {
  cpSync(join(root, "public"), dist, { recursive: true });
}

if (watch) {
  copyAssets();
  await run(tsc, ["--watch"]);
} else {
  rmSync(dist, { recursive: true, force: true });
  await run(tsc).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
  copyAssets();
  console.log("Built dist/ - load it with chrome://extensions -> Load unpacked.");
}
