import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zResolver } from "@/modules/zodResolver";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/services";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ListParams, Paginated } from "@/types";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface Institution {
  id: string;
  org_id: string;
  name: string;
  code: string;
  address?: string | null;
  is_active: boolean;
  created_at: string;
}

const schema = z.object({
  org_id: z.string().uuid("Select organization"),
  name: z.string().trim().min(2, "Required").max(200),
  code: z.string().trim().min(1, "Required").max(50),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  is_active: z.enum(["true", "false"]),
});

type V = z.infer<typeof schema>;

function normalizePaginated<T>(res: any): Paginated<T> {
  const rows = (Array.isArray(res?.data?.items) && res.data.items) || [];
  return {
    data: rows as T[],
    total: Number(res?.data?.total ?? rows.length),
    page: Number(res?.data?.page ?? 1),
    pageSize: Number(res?.data?.page_size ?? 10),
  };
}

export function InstitutionsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 10, search: "" });
  const [data, setData] = useState<Paginated<Institution>>({ data: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<"create" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<Institution | null>(null);
  const [deleting, setDeleting] = useState<Institution | null>(null);

  const form = useForm<V>({
    resolver: zResolver(schema),
    defaultValues: { org_id: "", name: "", code: "", address: "", is_active: "true" },
  });

  const selectedOrgName = useMemo(
    () => orgs.find((o) => o.id === selectedOrgId)?.name || "",
    [orgs, selectedOrgId]
  );

  const loadOrgs = async () => {
    try {
      const res = await api.get<any>("/organizations?page=1&page_size=500");
      const rows = (Array.isArray(res?.data?.items) && res.data.items) || [];
      setOrgs(rows as Organization[]);
      if (!selectedOrgId && rows.length > 0) setSelectedOrgId(rows[0].id);
    } catch {
      setOrgs([]);
    }
  };

  const loadInstitutions = async () => {
    if (!selectedOrgId) {
      setData({ data: [], total: 0, page: 1, pageSize: 10 });
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("org_id", selectedOrgId);
      q.set("page", String(params.page ?? 1));
      q.set("page_size", String(params.pageSize ?? 10));
      if (params.search) q.set("search", String(params.search));
      const res = await api.get<any>(`/institutions?${q.toString()}`);
      setData(normalizePaginated<Institution>(res));
    } catch {
      setData({ data: [], total: 0, page: 1, pageSize: 10 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { loadInstitutions(); }, [selectedOrgId, params.page, params.pageSize, params.search]);

  const openCreate = () => {
    setActive(null);
    setMode("create");
    form.reset({ org_id: "", name: "", code: "", address: "", is_active: "true" });
  };

  const openEdit = (row: Institution) => {
    setActive(row);
    setMode("edit");
    form.reset({
      org_id: row.org_id,
      name: row.name,
      code: row.code,
      address: row.address || "",
      is_active: row.is_active ? "true" : "false",
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      if (mode === "create") {
        await api.post("/institutions", {
          org_id: values.org_id,
          name: values.name,
          code: values.code,
          address: values.address || null,
        });
      } else if (mode === "edit" && active) {
        await api.patch(`/institutions/${active.id}`, {
          name: values.name,
          code: values.code,
          address: values.address || null,
          is_active: values.is_active === "true",
        });
      }
      setMode(null);
      await loadInstitutions();
    } finally {
      setBusy(false);
    }
  });

  return (
    <div>
      <PageHeader
        title="Institutions"
        description="Create and manage institutions under an organization."
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedOrgId} onValueChange={(v) => { setSelectedOrgId(v); setParams((p) => ({ ...p, page: 1 })); }}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select organization" /></SelectTrigger>
              <SelectContent>
                {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} disabled={!selectedOrgId}>
              <Plus className="h-4 w-4 mr-2" /> New Institution
            </Button>
          </div>
        }
      />

      <DataTable<Institution>
        columns={[
          { key: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "code", header: "Code", sortable: true, cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "address", header: "Address", cell: (r) => <span className="text-muted-foreground">{r.address || "-"}</span> },
          { key: "is_active", header: "Status", sortable: true, cell: (r) => <span>{r.is_active ? "Active" : "Inactive"}</span> },
          { key: "created_at", header: "Created", sortable: true, cell: (r) => <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span> },
        ]}
        data={data}
        loading={loading}
        params={params}
        onParamsChange={(p) => setParams((prev) => ({ ...prev, ...p }))}
        searchPlaceholder="Search institutions by name, code, address..."
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
        title={mode === "edit" ? "Edit Institution" : "New Institution"}
        submitLabel={mode === "edit" ? "Save changes" : "Create"}
        busy={busy}
        size="lg"
        onSubmit={handleSubmit}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGrid>
            <Field label="Organization" error={form.formState.errors.org_id?.message as string}>
              <Select value={form.watch("org_id")} onValueChange={(v) => form.setValue("org_id", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Name" error={form.formState.errors.name?.message as string}><Input {...form.register("name")} /></Field>
            <Field label="Code" error={form.formState.errors.code?.message as string}><Input {...form.register("code")} /></Field>
            <Field label="Address" error={form.formState.errors.address?.message as string}><Input {...form.register("address")} /></Field>
            <Field label="Status" error={form.formState.errors.is_active?.message as string}>
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
        title="Institution details"
        size="lg"
      >
        {active && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div><dt className="text-xs uppercase text-muted-foreground">Organization</dt><dd className="text-sm mt-1">{selectedOrgName || active.org_id}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Name</dt><dd className="text-sm mt-1">{active.name}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Code</dt><dd className="text-sm mt-1">{active.code}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Status</dt><dd className="text-sm mt-1">{active.is_active ? "Active" : "Inactive"}</dd></div>
          </dl>
        )}
      </FormModal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Disable institution?"
        description="Hard delete is not supported by backend, so this will set is_active=false."
        confirmLabel="Disable"
        destructive
        busy={busy}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await api.patch(`/institutions/${deleting.id}`, { is_active: false });
            setDeleting(null);
            await loadInstitutions();
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
