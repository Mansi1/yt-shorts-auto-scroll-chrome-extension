/**
 * End-to-end check of the built extension (dist/) in a real Chromium.
 *
 * The extension is loaded unpacked, the way a user installs it. youtube.com is
 * answered by a stand-in Shorts page (served via request routing, so the
 * content scripts inject exactly as on the real site): one reused <video> and
 * a "next" chevron that swaps Shorts in place with pushState, as YouTube's
 * single-page app does. Media is a silent WAV, which a <video> element plays
 * with real timing and "ended" events.
 *
 * VERIFIED (probed on youtube.com/shorts, 2026-10-12): the player carries no
 * is-active attribute; a swap starts the next Short playing about 80 ms before
 * the URL names it; and a Short paused before it reaches "playing" is left
 * paused above the viewport. The stand-in page does the same, so an extension
 * that pauses a Short mid-load gets stuck here as it does on YouTube.
 *
 * VERIFIED: the "left within its first 3 seconds" check fails against a build
 * that records every Short left (probed by forcing watchedThrough to true).
 *
 * Writes output/e2e-report.json; exits non-zero on any failed check, console
 * error or page error.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = resolve(root, "dist");
const outDir = join(root, "output");

/** Chrome derives an unpacked extension's id from its absolute path. */
function extensionId(path) {
  const hex = createHash("sha256").update(path).digest("hex").slice(0, 32);
  return [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
}

/** A mono 8-bit silent WAV of `seconds` length. */
function silentWav(seconds) {
  const rate = 8000;
  const samples = Math.round(rate * seconds);
  const buf = Buffer.alloc(44 + samples, 0x80);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples, 40);
  return buf;
}

// The feed: id -> length in seconds.
const FEED = { shortAAAAAA: 6, shortBBBBBB: 20, shortCCCCCC: 20, shortDDDDDD: 20, shortEEEEEE: 6 };
const ORDER = Object.keys(FEED);

const shortsPage = `<!doctype html>
<html><head><meta charset="utf-8"><title>Shorts</title></head>
<body style="margin:0">
  <ytd-shorts>
    <ytd-reel-video-renderer>
      <video muted playsinline style="display:block;width:360px;height:640px"></video>
    </ytd-reel-video-renderer>
    <div id="navigation-button-down"><button>next</button></div>
  </ytd-shorts>
  <script>
    const order = ${JSON.stringify(ORDER)};
    const lengths = ${JSON.stringify(FEED)};
    const video = document.querySelector("video");
    let started = false; // the loaded Short reached "playing"
    window.advances = []; // { from, paused } at each chevron click
    video.addEventListener("playing", () => { started = true; });
    const load = (id) => {
      started = false;
      video.style.marginTop = "0";
      video.src = "/media/" + id + "-" + lengths[id] + ".wav";
      video.play().catch(() => {});
    };
    load(location.pathname.split("/")[2]);
    document.querySelector("#navigation-button-down button").addEventListener("click", () => {
      const from = location.pathname.split("/")[2];
      window.advances.push({ from, paused: video.paused });
      const next = order[order.indexOf(from) + 1];
      if (!next) return;
      load(next);
      setTimeout(() => {
        // Paused while still loading: parked above the viewport, as on YouTube.
        if (video.paused && !started) video.style.marginTop = "-700px";
        history.pushState({}, "", "/shorts/" + next);
        document.dispatchEvent(new Event("yt-navigate-finish"));
      }, 80);
    });
  </script>
</body></html>`;

const checks = [];
const problems = [];

async function check(name, fn) {
  const started = Date.now();
  try {
    await fn();
    checks.push({ name, ok: true, ms: Date.now() - started });
  } catch (err) {
    checks.push({ name, ok: false, ms: Date.now() - started, error: String(err?.message ?? err) });
  }
}

function watchConsole(page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console error on ${page.url()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`page error on ${page.url()}: ${err.message}`));
}

async function waitFor(predicate, what, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timed out waiting for ${what}`);
}

const profile = mkdtempSync(join(tmpdir(), "ytss-e2e-"));
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium", // the full browser: the headless shell cannot load extensions
  headless: true,
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    "--autoplay-policy=no-user-gesture-required"
  ]
});

try {
  await context.route("https://www.youtube.com/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const media = path.match(/^\/media\/\w+-(\d+)\.wav$/);
    if (media) {
      return route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav(Number(media[1])) });
    }
    if (path.startsWith("/shorts/")) {
      return route.fulfill({ status: 200, contentType: "text/html", body: shortsPage });
    }
    return route.fulfill({ status: 404, body: "" });
  });

  const popup = await context.newPage();
  watchConsole(popup);
  const popupUrl = `chrome-extension://${extensionId(dist)}/popup/popup.html`;
  const storage = (area, key) =>
    popup.evaluate(([a, k]) => chrome.storage[a].get(k), [area, key]);

  await check("popup renders every setting", async () => {
    await popup.goto(popupUrl);
    for (const id of ["enabled", "playCount", "delayMs", "playbackRate", "skipSeen", "pauseInBackground", "language"]) {
      await popup.locator(`#${id}`).waitFor({ state: "attached", timeout: 5000 });
    }
    const status = await popup.locator("#status").textContent();
    if (!status?.trim()) throw new Error("status line is empty");
  });

  await check("popup saves changed settings to sync storage", async () => {
    await popup.selectOption("#playbackRate", "2");
    await popup.check("#skipSeen");
    await waitFor(async () => {
      const s = await storage("sync", ["playbackRate", "skipSeen"]);
      return s.playbackRate === 2 && s.skipSeen === true;
    }, "playbackRate=2 and skipSeen=true in sync storage", 5000);
  });

  const shorts = await context.newPage();
  watchConsole(shorts);
  const playing = () =>
    shorts.evaluate(() => {
      const v = document.querySelector("video");
      return !v.paused && v.currentTime > 0.2;
    });
  const seen = async () => (await storage("local", "seenShorts")).seenShorts ?? [];
  const currentId = () => new URL(shorts.url()).pathname.split("/")[2];

  await check("a Short played to the end advances and is recorded as seen", async () => {
    await shorts.goto("https://www.youtube.com/shorts/shortAAAAAA");
    await waitFor(async () => currentId() === "shortBBBBBB", "advance to shortBBBBBB");
    await waitFor(async () => (await seen()).includes("shortAAAAAA"), "shortAAAAAA in the seen history");
  });

  await check("the next Short plays after an advance off a finished one", async () => {
    await waitFor(playing, "shortBBBBBB playing after the advance", 5000);
  });

  await check("the playback rate setting reaches the player", async () => {
    await waitFor(
      () => shorts.evaluate(() => document.querySelector("video").playbackRate === 2),
      "playbackRate 2 on the video",
      5000
    );
  });

  await check("a Short left within its first 3 seconds is not recorded as seen", async () => {
    // At 2x, one wall-clock second is two seconds of the Short.
    await waitFor(
      () => shorts.evaluate(() => document.querySelector("video").currentTime > 0.2),
      "shortBBBBBB playing",
      5000
    );
    if (await shorts.evaluate(() => document.querySelector("video").currentTime >= 3)) {
      throw new Error("shortBBBBBB already past 3 s before the scroll; the check would prove nothing");
    }
    await shorts.click("#navigation-button-down button");
    await waitFor(async () => currentId() === "shortCCCCCC", "manual scroll to shortCCCCCC", 5000);
    await new Promise((r) => setTimeout(r, 1500)); // several content-script polls after leaving
    const ids = await seen();
    if (ids.includes("shortBBBBBB")) throw new Error(`shortBBBBBB recorded as seen: ${JSON.stringify(ids)}`);
  });

  await check("scrolling onto a seen Short skips it and the next one plays", async () => {
    const ids = await seen();
    await popup.evaluate((next) => chrome.storage.local.set({ seenShorts: next }), [...ids, "shortDDDDDD"]);
    await shorts.click("#navigation-button-down button");
    await waitFor(async () => currentId() === "shortEEEEEE", "skip past the seen shortDDDDDD", 5000);
    await waitFor(playing, "shortEEEEEE playing after the skip", 5000);
    const advances = await shorts.evaluate(() => window.advances);
    const off = advances.find((a) => a.from === "shortDDDDDD");
    if (!off?.paused) throw new Error(`shortDDDDDD still playing when skipped: ${JSON.stringify(advances)}`);
  });

  await check("the last Short in the feed plays on after its advance finds nothing", async () => {
    // shortEEEEEE is 6 s long, so at 2x it ends within about 3 s; the fixture's
    // media cannot be seeked.
    await waitFor(
      () => shorts.evaluate(() => window.advances.filter((a) => a.from === "shortEEEEEE").length > 0),
      "an advance off shortEEEEEE",
      10000
    );
    await waitFor(playing, "shortEEEEEE playing again", 5000);
    if (currentId() !== "shortEEEEEE") throw new Error(`left the last Short for ${currentId()}`);
  });

  await check("opening a seen Short skips it and the next one plays", async () => {
    await shorts.goto("https://www.youtube.com/shorts/shortAAAAAA");
    await waitFor(async () => currentId() === "shortBBBBBB", "skip past the seen shortAAAAAA", 5000);
    await waitFor(playing, "shortBBBBBB playing after the skip", 5000);
  });
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
}

const ok = checks.every((c) => c.ok) && problems.length === 0;
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "e2e-report.json"),
  JSON.stringify({ finishedAt: new Date().toISOString(), ok, checks, problems }, null, 2) + "\n"
);
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.error ? ` - ${c.error}` : ""}`);
for (const p of problems) console.log(`FAIL ${p}`);
process.exit(ok ? 0 : 1);
