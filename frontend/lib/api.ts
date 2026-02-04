const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err: any = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export type ModelRow = {
  modelCode: string;
  stockTotal: number;
  disponibles: number;
  arrendadas: number;
  suggestedIdentifier: string | null;
};

export type UnitRow = {
  identifier: string;
  modelCode: string;
  series: string;
  status: "DISPONIBLE" | "ARRENDADA";
  weeklyOutCount?: number;
  outCountTotal?: number;
  lastOutAt?: string | null;
  lastInAt?: string | null;
};

export type ModelUnitsResponse = {
  modelCode: string;
  suggested: { identifier: string; series: string } | null;
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
