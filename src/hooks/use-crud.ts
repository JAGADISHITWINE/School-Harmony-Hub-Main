import { useCallback, useEffect, useState } from "react";
import { api, MAX_PAGE_SIZE } from "@/services";
import type { ListParams, Paginated } from "@/types";
import { toast } from "sonner";

const IS_BACKEND_MODE = Boolean((import.meta.env.VITE_API_BASE_URL || "").trim());

function toQueryString(params: ListParams) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (k === "pageSize") q.set("page_size", String(Math.min(Number(v), MAX_PAGE_SIZE)));
    else q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

function normalizePaginated<T>(res: any, params: ListParams): Paginated<T> {
  if (Array.isArray(res)) {
    const pageSize = params.pageSize ?? res.length ?? 10;
    return {
      data: res as T[],
      total: res.length,
      page: params.page ?? 1,
      pageSize,
    };
  }

  const rows =
    (Array.isArray(res?.data?.items) && res.data.items) ||
    (Array.isArray(res?.data?.data) && res.data.data) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res?.items) && res.items) ||
    (Array.isArray(res?.rows) && res.rows) ||
    (Array.isArray(res?.results) && res.results) ||
    [];

  const total = Number(
    res?.data?.total ??
    res?.total ??
    res?.count ??
    res?.totalCount ??
    rows.length
  );

  const pageSize = res?.data?.page_size ?? res?.data?.pageSize ?? res?.page_size ?? res?.pageSize ?? params.pageSize ?? rows.length ?? 10;
  return {
    data: rows as T[],
    total: Number.isFinite(total) ? total : rows.length,
    page: Number(res?.data?.page ?? res?.page ?? params.page ?? 1),
    pageSize: Number(pageSize),
  };
}

export function useList<T>(base: string, initial: ListParams = { page: 1, pageSize: 10 }) {
  const [params, setParams] = useState<ListParams>(initial);
  const [data, setData] = useState<Paginated<T>>({ data: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const req = IS_BACKEND_MODE
      ? api.get<any>(`${base}${toQueryString(params)}`)
      : api.post<any>(`${base}/query`, params);

    req
      .then(res => { if (!cancelled) setData(normalizePaginated<T>(res, params)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [base, params, version]);

  return { params, setParams, data, loading, refresh };
}

export function useMutate(base: string, onDone?: () => void) {
  const [busy, setBusy] = useState(false);

  const create = async (body: any) => {
    setBusy(true);
    try { const r = await api.post(base, body); toast.success("Created"); onDone?.(); return r; }
    finally { setBusy(false); }
  };
  const update = async (id: string, body: any) => {
    setBusy(true);
    try {
      const r = IS_BACKEND_MODE
        ? await api.patch(`${base}/${id}`, body)
        : await api.put(`${base}/${id}`, body);
      toast.success("Updated");
      onDone?.();
      return r;
    }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try { const r = await api.delete(`${base}/${id}`); toast.success("Deleted"); onDone?.(); return r; }
    finally { setBusy(false); }
  };
  const bulkRemove = async (ids: string[]) => {
    setBusy(true);
    try { const r = await api.post(`${base}/bulk-delete`, { ids }); toast.success(`Deleted ${ids.length}`); onDone?.(); return r; }
    finally { setBusy(false); }
  };

  return { busy, create, update, remove, bulkRemove };
}
