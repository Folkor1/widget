export type PageCalcRequest = {
  region: string;
  bytesTransferred: number;
  cacheHitRate: number;
};
export type PageCalcResponse = {
  runId: string;
  co2e_g: number;
  range: { min: number; max: number };
  factors: { id: string }[];
  methodologyVersion: string;
};

const API_BASE = import.meta.env.VITE_API_BASE as string;

export async function calculatePage(req: PageCalcRequest): Promise<PageCalcResponse> {
  const res = await fetch(`${API_BASE}/v1/calculations/page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}
