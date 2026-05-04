import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zResolver } from "@/modules/zodResolver";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/services";
import { MENUS_ME_ENDPOINT } from "@/services/endpoints";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ListParams, Paginated } from "@/types";

interface MenuNode {
  id: string;
  parent_id: string | null;
  label: string;
  route: string | null;
  icon: string | null;
  order_no: number;
  is_active?: boolean;
  children: MenuNode[];
}

interface MenuRow extends Omit<MenuNode, "children"> {
  level: number;
}

const schema = z.object({
  parent_id: z.string().uuid().optional().or(z.literal("")),
  label: z.string().trim().min(2, "Required").max(120),
  route: z.string().trim().optional().or(z.literal("")),
  icon: z.string().trim().optional().or(z.literal("")),
  order_no: z.coerce.number().int().min(0).max(9999),
  is_active: z.enum(["true", "false"]),
});

type V = z.infer<typeof schema>;
const ROOT_PARENT = "__root__";

function flatten(nodes: MenuNode[], level = 0): MenuRow[] {
  const sorted = [...nodes].sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0));
  const out: MenuRow[] = [];
  for (const n of sorted) {
    out.push({ ...n, level });
    if (n.children?.length) out.push(...flatten(n.children, level + 1));
  }
  return out;
}

function toPaginated<T>(rows: T[], params: ListParams): Paginated<T> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
}

export const MenusModule = () => {
  const [tree, setTree] = useState<MenuNode[]>([]);
  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 10, search: "" });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<MenuRow | null>(null);
  const [deleting, setDeleting] = useState<MenuRow | null>(null);

  const form = useForm<V>({
    resolver: zResolver(schema),
    defaultValues: { parent_id: "", label: "", route: "", icon: "", order_no: 0, is_active: "true" },
  });

  const loadMenus = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(MENUS_ME_ENDPOINT);
      const rows = (Array.isArray(res?.data) && res.data) || [];
      setTree(rows as MenuNode[]);
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMenus(); }, []);

  const allRows = useMemo(() => flatten(tree), [tree]);
  const filteredRows = useMemo(() => {
    const q = String(params.search || "").trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      [r.label, r.route || "", r.icon || ""].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [allRows, params.search]);
  const data = useMemo(() => toPaginated(filteredRows, params), [filteredRows, params]);

  const parentOptions = useMemo(
    () => allRows.map((r) => ({ id: r.id, label: `${"-- ".repeat(r.level)}${r.label}` })),
    [allRows]
  );

  const openCreate = () => {
    setActive(null);
    setMode("create");
    form.reset({ parent_id: "", label: "", route: "", icon: "", order_no: 0, is_active: "true" });
  };

  const openEdit = (row: MenuRow) => {
    setActive(row);
    setMode("edit");
    form.reset({
      parent_id: row.parent_id || "",
      label: row.label,
      route: row.route || "",
      icon: row.icon || "",
      order_no: row.order_no,
      is_active: row.is_active === false ? "false" : "true",
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const payload = {
        parent_id: values.parent_id || null,
        label: values.label,
        route: values.route || null,
        icon: values.icon || null,
        order_no: values.order_no,
        is_active: values.is_active === "true",
      };

      if (mode === "create") {
        await api.post("/menus", payload);
      } else if (mode === "edit" && active) {
        await api.patch(`/menus/${active.id}`, payload);
      }

      setMode(null);
      await loadMenus();
    } finally {
      setBusy(false);
    }
  });

  return (
    <div>
      <PageHeader
        title="Menu Management"
        description="Create and manage menu tree for sidebar."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Menu
          </Button>
        }
      />

      <DataTable<MenuRow>
        columns={[
          { key: "label", header: "Label", sortable: true, cell: (r) => <span className="font-medium">{`${"-- ".repeat(r.level)}${r.label}`}</span> },
          { key: "route", header: "Route", sortable: true, cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.route || "-"}</span> },
          { key: "icon", header: "Icon", sortable: true, cell: (r) => <span className="text-xs">{r.icon || "-"}</span> },
          { key: "order_no", header: "Order", sortable: true, cell: (r) => <span>{r.order_no}</span> },
          { key: "is_active", header: "Status", sortable: true, cell: (r) => <span>{r.is_active === false ? "Inactive" : "Active"}</span> },
        ]}
        data={data}
        loading={loading}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder="Search menus..."
        rowActions={(row) => (
          <div className="inline-flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => { setActive(row); setMode("view"); }}><Eye className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <FormModal
        open={mode === "create" || mode === "edit"}
        onOpenChange={(v) => !v && setMode(null)}
        title={mode === "edit" ? "Edit Menu" : "New Menu"}
        submitLabel={mode === "edit" ? "Save changes" : "Create"}
        busy={busy}
        size="lg"
        onSubmit={handleSubmit}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGrid>
            <Field label="Parent">
              <Select value={form.watch("parent_id") || ROOT_PARENT} onValueChange={(v) => form.setValue("parent_id", v === ROOT_PARENT ? "" : v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="No parent (root menu)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT_PARENT}>No parent (root)</SelectItem>
                  {parentOptions.filter((o) => o.id !== active?.id).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Label" error={form.formState.errors.label?.message as string}><Input {...form.register("label")} /></Field>
            <Field label="Route" error={form.formState.errors.route?.message as string}><Input placeholder="/settings/users" {...form.register("route")} /></Field>
            <Field label="Icon" error={form.formState.errors.icon?.message as string}><Input placeholder="LayoutDashboard" {...form.register("icon")} /></Field>
            <Field label="Order" error={form.formState.errors.order_no?.message as string}><Input type="number" {...form.register("order_no")} /></Field>
            <Field label="Status">
              <Select value={form.watch("is_active")} onValueChange={(v) => form.setValue("is_active", v as "true" | "false", { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>
        </form>
      </FormModal>

      <FormModal
        open={mode === "view"}
        onOpenChange={(v) => !v && setMode(null)}
        title="Menu details"
        size="lg"
      >
        {active && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div><dt className="text-xs uppercase text-muted-foreground">Label</dt><dd className="text-sm mt-1">{active.label}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Route</dt><dd className="text-sm mt-1">{active.route || "-"}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Icon</dt><dd className="text-sm mt-1">{active.icon || "-"}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Order</dt><dd className="text-sm mt-1">{active.order_no}</dd></div>
          </dl>
        )}
      </FormModal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Disable menu?"
        description="Backend has no delete endpoint, so this sets is_active=false."
        confirmLabel="Disable"
        destructive
        busy={busy}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await api.patch(`/menus/${deleting.id}`, { is_active: false });
            setDeleting(null);
            await loadMenus();
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
};
