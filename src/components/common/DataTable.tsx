import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Trash2 } from "lucide-react";
import type { ListParams, Paginated } from "@/types";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: ReactNode;
  variant?: "default" | "destructive" | "ghost";
  show?: (row: T) => boolean;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: Paginated<T>;
  loading?: boolean;
  params: ListParams;
  onParamsChange: (p: ListParams) => void;
  rowActions?: (row: T) => ReactNode;
  selectable?: boolean;
  onBulkDelete?: (ids: string[]) => void;
  emptyText?: string;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string }>({
  columns, data, loading, params, onParamsChange,
  rowActions, selectable, onBulkDelete,
  emptyText = "No records found",
  searchPlaceholder = "Search…",
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(data.total / (data.pageSize || 10)));

  const allSelected = useMemo(
    () => data.data.length > 0 && data.data.every(r => selected.has(r.id)),
    [data.data, selected]
  );

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) data.data.forEach(r => next.delete(r.id));
    else data.data.forEach(r => next.add(r.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const sortBy = (key: string) => {
    if (params.sortBy === key) {
      onParamsChange({ ...params, sortDir: params.sortDir === "asc" ? "desc" : "asc" });
    } else {
      onParamsChange({ ...params, sortBy: key, sortDir: "asc" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={params.search ?? ""}
            onChange={(e) => onParamsChange({ ...params, search: e.target.value, page: 1 })}
            placeholder={searchPlaceholder}
            className="pl-9 bg-card border-border"
          />
        </div>
        {selectable && selected.size > 0 && onBulkDelete && (
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => { onBulkDelete([...selected]); setSelected(new Set()); }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {selected.size}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
              )}
              {columns.map(col => (
                <TableHead key={col.key} className={col.className}>
                  {col.sortable ? (
                    <button
                      onClick={() => sortBy(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      {params.sortBy === col.key
                        ? (params.sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                    </button>
                  ) : col.header}
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-32 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`s${i}`} className="border-border">
                {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                {columns.map(c => <TableCell key={c.key}><Skeleton className="h-4 w-full max-w-[180px]" /></TableCell>)}
                {rowActions && <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>}
              </TableRow>
            ))}
            {!loading && data.data.length === 0 && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="h-32 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {!loading && data.data.map(row => (
              <TableRow key={row.id} className="border-border">
                {selectable && (
                  <TableCell>
                    <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleOne(row.id)} />
                  </TableCell>
                )}
                {columns.map(col => (
                  <TableCell key={col.key} className={col.className}>{col.cell(row)}</TableCell>
                ))}
                {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {data.data.length === 0 ? 0 : ((data.page - 1) * data.pageSize + 1)}–{(data.page - 1) * data.pageSize + data.data.length} of {data.total}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={data.page <= 1}
            onClick={() => onParamsChange({ ...params, page: 1 })}>« First</Button>
          <Button size="sm" variant="ghost" disabled={data.page <= 1}
            onClick={() => onParamsChange({ ...params, page: data.page - 1 })}>Prev</Button>
          <span className="px-3 text-foreground">Page {data.page} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={data.page >= totalPages}
            onClick={() => onParamsChange({ ...params, page: data.page + 1 })}>Next</Button>
          <Button size="sm" variant="ghost" disabled={data.page >= totalPages}
            onClick={() => onParamsChange({ ...params, page: totalPages })}>Last »</Button>
        </div>
      </div>
    </div>
  );
}