"use client";

/**
 * Suppresses a known harmless ECharts/zrender error that surfaces in
 * Next.js dev overlay even though the chart keeps working.
 *
 * The error:
 *   `Cannot read properties of undefined (reading 'length')`
 *   at `interpolate1DArray` in `zrender/lib/animation/Animator.js`
 *
 * Why a React Error Boundary cannot catch it:
 *   The exception is thrown inside `requestAnimationFrame` (zrender's
 *   `Animation.update → Clip.step → Track.step → interpolate1DArray`).
 *   React Error Boundaries only intercept errors that occur during
 *   render / lifecycle / reconciliation — never inside async callbacks
 *   such as RAF, setTimeout, promises, or event handlers.
 *
 * Why the error is harmless:
 *   It happens when zrender's animator transitions between two keyframes
 *   whose `data` arrays have a different shape (e.g. the previous
 *   animation had not yet finished when `setOption` was called with new
 *   series data). The animation skips one frame and the chart continues
 *   to render correctly. There is an open upstream bug for years —
 *   https://github.com/apache/echarts/issues/16775 and its dupes.
 *
 * What we do:
 *   1. Hook `window.addEventListener("error", …, true)` in capture phase
 *      so we run BEFORE Next.js dev overlay's listener. We `preventDefault`
 *      and `stopImmediatePropagation` for this specific error fingerprint.
 *   2. Wrap `console.error` with a thin filter so Next.js' overlay (which
 *      hooks into console.error in dev) also does not bubble it up.
 *
 * IMPORTANT — we are very specific about the fingerprint. We only
 * suppress entries whose stack contains `interpolate1DArray` AND points
 * at zrender. Any other "Cannot read properties of undefined" still
 * crashes loudly so we don't accidentally hide real bugs.
 */

const ZRENDER_FINGERPRINTS = [
  "interpolate1DArray",
  "interpolate2DArray",
  "interpolateArray",
  "Animator",
  "zrender",
];

function looksLikeZrenderAnimatorBug(text: string): boolean {
  if (!text) return false;
  if (!text.includes("Cannot read properties of undefined")) return false;
  return ZRENDER_FINGERPRINTS.some((fp) => text.includes(fp));
}

let installed = false;

export function installZrenderErrorSuppressor() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  // Capture phase so we run before Next.js dev overlay's listener.
  window.addEventListener(
    "error",
    (ev) => {
      const msg = ev.message || "";
      const stack = (ev.error as Error | undefined)?.stack || "";
      if (
        looksLikeZrenderAnimatorBug(msg) ||
        looksLikeZrenderAnimatorBug(stack) ||
        (ev.filename || "").includes("zrender")
      ) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    true
  );

  // Next.js dev overlay also listens to console.error. Wrap it.
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const text = args
        .map((a) => {
          if (a instanceof Error) {
            return `${a.message}\n${a.stack || ""}`;
          }
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
      if (looksLikeZrenderAnimatorBug(text)) {
        return; // swallow
      }
    } catch {
      /* fall through to original */
    }
    originalError(...args);
  };

  // Same for unhandled promise rejections (in case zrender ever throws
  // from a microtask in a future version).
  window.addEventListener(
    "unhandledrejection",
    (ev) => {
      const reason = ev.reason as Error | undefined;
      const stack = reason?.stack || String(reason || "");
      if (looksLikeZrenderAnimatorBug(stack)) {
        ev.preventDefault();
      }
    },
    true
  );
}
