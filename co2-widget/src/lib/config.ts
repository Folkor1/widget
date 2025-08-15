export type WidgetInitOpts = { siteId: string; apiBase?: string };
export function resolveApiBase(opts?: WidgetInitOpts): string {
  if (opts?.apiBase) return opts.apiBase;
  const w = globalThis as any;
  if (w.CO2WIDGET?.apiBase) return w.CO2WIDGET.apiBase as string;
  return "http://localhost:5253";
}
