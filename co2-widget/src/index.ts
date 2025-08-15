import { calculatePage } from "./lib/api";
import type { WidgetInitOpts } from "./lib/config";

export async function init(opts: WidgetInitOpts) {
  const btn = document.createElement("button");
  btn.innerText = "CO₂";
  Object.assign(btn.style, {
    position: "fixed", bottom: "16px", right: "16px", zIndex: "99999",
    padding: "10px 12px", borderRadius: "10px", border: "1px solid #ddd",
    background: "#fff", cursor: "pointer", fontFamily: "system-ui, sans-serif",
  });

  btn.onclick = async () => {
    try {
      const r = await calculatePage({ region: "IE", bytesTransferred: 250_000_000, cacheHitRate: 0.3 }, opts);
      alert(`≈ ${r.co2e_g.toFixed(3)} g CO₂e\nmin..max: ${r.range.min.toFixed(3)}..${r.range.max.toFixed(3)}\n${r.methodologyVersion}`);
    } catch (e: any) { alert(`CO₂ error: ${e?.message || e}`); }
  };

  document.body.appendChild(btn);
}
