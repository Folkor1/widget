import { useState } from "react";
import { calculatePage } from "./lib/api";

export default function App() {
  const [region, setRegion] = useState("IE");
  const [bytes, setBytes] = useState(250_000_000);
  const [hit, setHit] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function run() {
    setLoading(true);
    setResult("");
    try {
      const r = await calculatePage({
        region,
        bytesTransferred: bytes,
        cacheHitRate: hit,
      });
      setResult(
        `≈ ${r.co2e_g.toFixed(3)} g CO₂e (min..max: ${r.range.min.toFixed(3)}..${r.range.max.toFixed(3)})`
      );
    } catch (e: any) {
      setResult(`Ошибка: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
      <h1>CO₂ Admin</h1>
      <p style={{ color: "#555" }}>Тестовый расчёт страницы через API</p>

      <div style={{ display: "grid", gap: 12 }}>
        <label>
          Регион:
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="IE">IE</option>
            <option value="EU">EU</option>
            <option value="US">US</option>
          </select>
        </label>

        <label>
          Bytes transferred:
          <input
            type="number"
            value={bytes}
            onChange={(e) => setBytes(Number(e.target.value))}
            style={{ marginLeft: 8, width: 220 }}
          />
        </label>

        <label>
          Cache hit rate (0..1):
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={hit}
            onChange={(e) => setHit(Number(e.target.value))}
            style={{ marginLeft: 8, width: 120 }}
          />
        </label>

        <button onClick={run} disabled={loading} style={{ width: 220, padding: "10px 12px" }}>
          {loading ? "Считаем..." : "Рассчитать CO₂"}
        </button>
      </div>

      {result && (
        <pre style={{ background: "#f6f8fa", padding: 12, marginTop: 16, borderRadius: 8 }}>{result}</pre>
      )}
    </div>
  );
}
