import { resolveApiBase, type WidgetInitOpts } from "./config";

export type PageCalcRequest = { region: string; bytesTransferred: number; cacheHitRate: number };
export type PageCalcResponse = {
  runId: string; co2e_g: number;
  range: { min: number; max: number };
  factors: { id: string }[];
  methodologyVersion: string;
};

export async function calculatePage(req: PageCalcRequest, opts?: WidgetInitOpts): Promise<PageCalcResponse> {
  const base = resolveApiBase(opts);
  const res = await fetch(`${base}/v1/calculations/page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(()=> '') || res.statusText}`);
  return res.json();
}
