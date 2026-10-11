// Runs the compiled classic script the way Chrome does: top-level declarations
// in one shared global scope. Needs `npm run build` first (`make test` does it).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const file = fileURLToPath(new URL("../dist/watch-progress.js", import.meta.url));
const context = vm.createContext({});
// Named after the file so test coverage attributes the lines to it.
vm.runInContext(readFileSync(file, "utf8"), context, { filename: file });
const { newProgress, trackProgress, watchedThrough } = vm.runInContext(
  "({ newProgress, trackProgress, watchedThrough })",
  context
);

function play(duration, times) {
  const p = newProgress();
  for (const t of times) trackProgress(p, t, duration);
  return p;
}

test("a Short played from start to end counts as seen", () => {
  assert.equal(watchedThrough(play(30, [0, 1, 2, 3, 10, 20, 27, 29.9])), true);
});

test("leaving within the first 3 seconds does not count", () => {
  const p = play(30, [0, 1, 2.9]);
  assert.equal(p.pastStart, false);
  assert.equal(watchedThrough(p), false);
});

test("leaving before the last 3 seconds does not count", () => {
  const p = play(30, [0, 5, 26.9]);
  assert.equal(p.pastStart, true);
  assert.equal(p.reachedEnd, false);
  assert.equal(watchedThrough(p), false);
});

test("a Short under 6 seconds counts once it reaches its midpoint", () => {
  assert.equal(watchedThrough(play(4, [0, 1.9])), false);
  assert.equal(watchedThrough(play(4, [0, 2])), true);
});

test("an unknown duration records nothing", () => {
  assert.equal(watchedThrough(play(NaN, [0, 5, 60])), false);
  assert.equal(watchedThrough(play(Infinity, [0, 5, 60])), false);
  assert.equal(watchedThrough(play(0, [0, 5])), false);
});
