/**
 * Builds the release artifacts for a version chosen by semantic-release:
 *   1. stamps the version into public/manifest.json
 *   2. rebuilds dist/
 *   3. zips dist/ into yt-shorts-autoscroll-<version>.zip for the GitHub release
 *
 * Called from .releaserc.json as `node scripts/prepare-release.mjs <version>`.
 * package.json is versioned by @semantic-release/npm, not here.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = process.argv[2];

if (!version) {
  console.error("usage: node scripts/prepare-release.mjs <version>");
  process.exit(1);
}

/**
 * Chrome accepts one to four dot-separated integers and nothing else, so a
 * prerelease like 1.2.0-beta.1 has to reach the manifest as 1.2.0.
 */
const manifestVersion = version.split("-")[0];
if (!/^\d+(\.\d+){0,3}$/.test(manifestVersion)) {
  console.error(`cannot turn "${version}" into a Chrome manifest version`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: "inherit", ...opts });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    );
    child.on("error", reject);
  });
}

// Rewrite just the version line: re-serialising the JSON would reflow the
// whole file and bury the one real change in every release commit.
const manifestPath = join(root, "public", "manifest.json");
const manifest = readFileSync(manifestPath, "utf8");
const stamped = manifest.replace(
  /^(\s*"version"\s*:\s*)"[^"]*"/m,
  `$1"${manifestVersion}"`
);
if (stamped === manifest && !manifest.includes(`"version": "${manifestVersion}"`)) {
  console.error("no version field found in public/manifest.json");
  process.exit(1);
}
writeFileSync(manifestPath, stamped);
console.log(`manifest.json -> ${manifestVersion}`);

await run(process.execPath, [join(root, "scripts", "build.mjs")]);

// -X drops the macOS resource forks that would otherwise ride along.
const zipName = `yt-shorts-autoscroll-${version}.zip`;
await run("zip", ["-r", "-X", join(root, zipName), "."], { cwd: join(root, "dist") }).catch(
  (err) => {
    console.error(`${err.message} - is the \`zip\` command available?`);
    process.exit(1);
  }
);
console.log(`packaged ${zipName}`);
