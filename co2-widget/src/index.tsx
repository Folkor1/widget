import { calcPage } from "./api";

/* ========================= STYLES ========================= */
const STYLE = `
.co2w-btn{position:fixed;right:16px;bottom:16px;padding:10px 14px;border:none;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.15);background:#0ea5e9;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;z-index:2147483000}
.co2w-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:none;align-items:center;justify-content:center;z-index:2147483001}
.co2w-modal{background:#fff;border-radius:12px;max-width:560px;width:92%;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.2);font:14px system-ui,sans-serif}
.co2w-row{display:flex;gap:12px;margin:8px 0}
.co2w-muted{color:#666;font-size:12px}
.co2w-error{color:#b00020;white-space:pre-wrap;margin-top:8px}
.co2w-result{border:1px solid #eee;border-radius:8px;padding:12px;margin-top:10px;background:#fafafa;opacity:0;transition:opacity .35s ease}
.co2w-result.co2w-show{opacity:1}
.co2w-spinner{display:inline-block;width:16px;height:16px;border:2px solid #ddd;border-top-color:#0ea5e9;border-radius:50%;animation:co2wspin 0.8s linear infinite;margin-right:6px}
@keyframes co2wspin{to{transform:rotate(360deg)}}

/* flash highlight when updated */
.co2w-flash{animation:co2wflash .8s ease}
@keyframes co2wflash{
  0%   {background:#fff7cc}
  60%  {background:#fafafa}
  100% {background:#fafafa}
}

/* skeleton placeholder while calculating */
.co2w-skel{display:grid;gap:8px}
.co2w-skel > div{height:10px;border-radius:6px;background:linear-gradient(90deg,#eee 25%,#f3f3f3 37%,#eee 63%);background-size:400% 100%;animation:co2wshimmer 1.1s infinite ease}
.co2w-skel .w1{width:55%}
.co2w-skel .w2{width:70%}
.co2w-skel .w3{width:40%}
@keyframes co2wshimmer{0%{background-position:100% 0}100%{background-position:0 0}}
`;

/* ====================== INIT OPTIONS ===================== */
export type InitOptions = {
  siteId: string;
  apiBase: string;               // e.g. "http://localhost:5253"
  region?: string;               // default "IE"
  cacheHitRate?: number;         // default 0.3
  bytesEstimator?: () => number; // optional: custom byte estimator
  showBadge?: boolean;           // show small badge (default true)
};

/* =========================== INIT ========================== */
export function init(opts: InitOptions) {
  const siteId = opts.siteId || "demo-site";
  const apiBase = opts.apiBase;
  const region = opts.region ?? "IE";
  const cache = Number.isFinite(opts.cacheHitRate) ? Number(opts.cacheHitRate) : 0.3;
  const showBadge = opts.showBadge ?? true;

  injectStyleOnce();

  // Floating button
  const btn = document.createElement("button");
  btn.className = "co2w-btn";
  btn.type = "button";
  btn.textContent = "CO₂ info";
  document.body.appendChild(btn);

  // Backdrop + modal
  const backdrop = document.createElement("div");
  backdrop.className = "co2w-backdrop";
  backdrop.innerHTML = `
    <div class="co2w-modal" role="dialog" aria-label="CO₂ modal">
      <h2 style="margin:0 0 8px 0">CO₂ — page footprint</h2>
      <div class="co2w-muted">site: ${escapeHtml(siteId)}</div>

      <div id="co2w-runinfo" class="co2w-muted" style="margin-top:8px"></div>
      <div id="co2w-error" class="co2w-error"></div>
      <div id="co2w-result" class="co2w-result" style="display:none"></div>

      <div class="co2w-row" style="justify-content:flex-end;margin-top:12px">
        <button type="button" id="co2w-recalc">Recalculate</button>
        <button type="button" id="co2w-close" style="margin-left:6px">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const runInfo = backdrop.querySelector<HTMLDivElement>("#co2w-runinfo")!;
  const errEl   = backdrop.querySelector<HTMLDivElement>("#co2w-error")!;
  const resEl   = backdrop.querySelector<HTMLDivElement>("#co2w-result")!;
  const recalc  = backdrop.querySelector<HTMLButtonElement>("#co2w-recalc")!;
  const close   = backdrop.querySelector<HTMLButtonElement>("#co2w-close")!;

  // Open modal → auto run
  btn.addEventListener("click", async () => {
    backdrop.style.display = "flex";
    await runAuto();
  });

  // Recalculate / Close buttons
  recalc.addEventListener("click", runAuto);
  close.addEventListener("click", () => (backdrop.style.display = "none"));

  // (optional) small badge bottom-left
  if (showBadge) showBadgeEl("CO₂: …");

/* ---------------------- AUTO MODE ---------------------- */
async function runAuto() {
  const MIN_SPIN_MS = 450; // minimal spinner duration for a smooth feel

  errEl.textContent = "";
  runInfo.innerHTML = `<span class="co2w-spinner"></span>Calculating…`;
  recalc.disabled = true;
  recalc.textContent = "Recalculating…";

  // show skeleton placeholder while calculating (no flicker)
  const skeleton = `
    <div class="co2w-skel">
      <div class="w1"></div>
      <div class="w2"></div>
      <div class="w3"></div>
    </div>
  `;
  resEl.innerHTML = skeleton;
  resEl.style.display = "block";
  resEl.classList.add("co2w-show");
  resEl.style.opacity = "1"; // make sure skeleton is visible immediately

  const t0 = performance.now();

  try {
    // 1) use custom estimator if provided
    let bytes = 0;
    if (typeof opts.bytesEstimator === "function") {
      bytes = Math.max(0, Math.floor(opts.bytesEstimator()));
    }
    // 2) otherwise fallback to Performance API
    if (!bytes) bytes = estimateTransferredBytes();

    // call API
    const res = await calcPage(apiBase, {
      region,
      bytesTransferred: bytes,
      cacheHitRate: cache,
    });

    // keep spinner at least MIN_SPIN_MS in total
    const elapsed = performance.now() - t0;
    if (elapsed < MIN_SPIN_MS) await sleep(MIN_SPIN_MS - elapsed);

    // cross-fade old (skeleton) → new result
    resEl.style.opacity = "0";       // start fade out
    await nextFrame();               // let the style apply
    resEl.innerHTML = renderResult(res); // swap content while hidden
    await nextFrame();               // ensure DOM is ready
    resEl.style.opacity = "1";       // fade in the actual result

    const g = typeof res?.co2e_g === "number" ? res.co2e_g.toFixed(4) : "n/a";
    const now = new Date().toLocaleTimeString();
    runInfo.textContent = `region: ${region}, bytes: ${bytes.toLocaleString()} • result: ${g} g CO₂ • recalculated at ${now}`;

    if (showBadge) showBadgeEl(`CO₂: ${g} g`);
  } catch (e: any) {
    const elapsed = performance.now() - t0;
    if (elapsed < MIN_SPIN_MS) await sleep(MIN_SPIN_MS - elapsed);

    resEl.style.opacity = "0";
    await nextFrame();
    resEl.innerHTML = "";
    errEl.textContent = e?.message ?? String(e);
    runInfo.textContent = "";
    if (showBadge) showBadgeEl("CO₂: n/a");
  } finally {
    recalc.disabled = false;
    recalc.textContent = "Recalculate";
  }
}

/* ======================= UTILITIES ======================= */

function injectStyleOnce() {
  if (!document.getElementById("co2w-style")) {
    const st = document.createElement("style");
    st.id = "co2w-style";
    st.textContent = STYLE;
    document.head.appendChild(st);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]!));
}

/** Approximate total transferred bytes using Performance API */
function estimateTransferredBytes(): number {
  let total = 0;

  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav) total += (nav.transferSize || nav.encodedBodySize || nav.decodedBodySize || 0);

  const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  for (const r of res) total += (r.transferSize || r.encodedBodySize || r.decodedBodySize || 0);

  return Math.max(0, Math.floor(total));
}

function renderResult(x: any) {
  const f = Array.isArray(x?.factors) ? x.factors.map((y: any) => y.id).join(", ") : "";
  const range = x?.range ? `${x.range.min} .. ${x.range.max}` : "";

  return `
    <div><b>co2e_g:</b> ${x?.co2e_g ?? "-"}</div>
    <div><b>range:</b> ${range}</div>
    <div><b>factors:</b> ${f}</div>
    <div><b>methodology:</b> ${x?.methodologyVersion ?? "-"}</div>
  `;
}

/** Small badge bottom-left */
function showBadgeEl(text: string) {
  let el = document.getElementById("co2w-badge") as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = "co2w-badge";
    Object.assign(el.style as CSSStyleDeclaration, {
      position: "fixed", left: "12px", bottom: "12px",
      background: "#111", color: "#fff", padding: "6px 10px",
      borderRadius: "999px", font: "12px system-ui, sans-serif",
      opacity: "0.9", zIndex: "2147483000",
    });
    document.body.appendChild(el);
  }
  el.textContent = text;
}

/** Simple delay helper */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Waits for the next animation frame so CSS changes can apply */
function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}
}

// ---- Global export + auto-init when loaded via <script src="..."> ----
declare global {
  interface Window {
    Co2Widget?: { init: typeof init };
  }
}

(function attachCo2Widget() {
  // expose global for manual usage: window.Co2Widget.init(...)
  window.Co2Widget = { init };

  // auto-init if developer provided data-* attributes on the current <script>
  const s = (document.currentScript as HTMLScriptElement | null);
  if (!s) return;

  const apiBase = s.dataset.apiBase;
  if (!apiBase) return; // no auto-init without API base

  const siteId = s.dataset.siteId ?? "demo-site";
  const region = s.dataset.region; // optional
  const cache = s.dataset.cache ? Number(s.dataset.cache) : undefined;
  const badge =
    s.dataset.badge === undefined
      ? true
      : s.dataset.badge.toLowerCase() !== "false";

  init({
    apiBase,
    siteId,
    region,
    cacheHitRate: cache,
    showBadge: badge,
  });
})();

// auto-init when loaded via <script src="...umd.js" data-*>
(function autoInitFromScriptTag() {
  try {
    const current = document.currentScript as HTMLScriptElement | null;
    if (!current) return;
    const apiBase = current.dataset.apiBase;
    if (!apiBase) return;

    const siteId = current.dataset.siteId || "demo-site";
    const region = current.dataset.region || "IE";
    const cache = Number(current.dataset.cache ?? "0.3");
    const badge = (current.dataset.badge ?? "true") !== "false";

    document.addEventListener("DOMContentLoaded", () => {
      init({
        siteId,
        apiBase,
        region,
        cacheHitRate: cache,
        showBadge: badge,
      });
    });
  } catch {
    /* ignore */
  }
})();