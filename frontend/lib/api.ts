const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const TIMEOUT_MS = 8000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const err: any = new Error(data?.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data as T;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Timeout: no se pudo conectar al backend");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export type ModelRow = {
  modelCode: string;
  toolName?: string;
  stockTotal: number;
  disponibles: number;
  arrendadas: number;
  suggestedIdentifier: string | null;
  suggestedSeries?: number | null;
};

export type UnitRow = {
  identifier: string;
  modelCode: string;
  series: number;
  status: "DISPONIBLE" | "ARRENDADA";
  weeklyOutCount?: number;
  dailyOutCount?: number;
  dayKey?: string;
  usedToday?: boolean;
  outCountTotal?: number;
  lastOutAt?: string | null;
  lastInAt?: string | null;
};

export type ModelUnitsResponse = {
  modelCode: string;
  toolName?: string;
  suggested: { identifier: string; series: number } | null;
  units: UnitRow[];
};

export const api = {
  getModels: () => request<ModelRow[]>("/models"),
  getUnitsByModel: (modelCode: string) =>
    request<ModelUnitsResponse>(`/models/${encodeURIComponent(modelCode)}/units`),
  outUnit: (payload: { identifier: string; user?: string; note?: string }) =>
    request<{ ok: true }>("/units/out", { method: "POST", body: JSON.stringify(payload) }),
  inUnit: (payload: { identifier: string; user?: string; note?: string }) =>
    request<{ ok: true }>("/units/in", { method: "POST", body: JSON.stringify(payload) }),
};
