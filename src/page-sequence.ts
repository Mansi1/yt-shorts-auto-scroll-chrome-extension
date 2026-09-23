/**
 * YT Shorts Autoscroll - page-world helper.
 *
 * YouTube keeps the upcoming Shorts on the <ytd-shorts> element as a plain JS
 * property, which content.ts cannot see from its isolated world. This runs in
 * the page's world and, whenever content.ts fires `ytss-read-sequence` on the
 * document, copies those video ids into `data-ytss-sequence` on <html> as a
 * JSON array. Event dispatch is synchronous, so the attribute is there as soon
 * as dispatchEvent returns.
 */
(() => {
  "use strict";

  interface SequenceData {
    shortsSequence?: Array<{ videoId?: unknown }>;
    reelWatchSequenceResponse?: {
      entries?: Array<{ command?: { reelWatchEndpoint?: { videoId?: unknown } } }>;
    };
  }

  function readSequence(): string[] {
    const shorts = document.querySelector("ytd-shorts") as (Element & { __data?: SequenceData }) | null;
    const data = shorts?.__data;
    const ids: unknown[] = data?.shortsSequence?.length
      ? data.shortsSequence.map((e) => e?.videoId)
      : (data?.reelWatchSequenceResponse?.entries ?? []).map(
          (e) => e?.command?.reelWatchEndpoint?.videoId
        );
    return ids.filter((id): id is string => typeof id === "string");
  }

  document.addEventListener("ytss-read-sequence", () => {
    let ids: string[] = [];
    try {
      ids = readSequence();
    } catch {
      // YouTube reshaped its data - content.ts falls back to a fresh feed.
    }
    document.documentElement.dataset.ytssSequence = JSON.stringify(ids);
  });
})();
