import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zResolver } from "@/modules/zodResolver";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/services";
import { useList, useMutate } from "@/hooks/use-crud";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Required").max(200),
  slug: z.string().trim().min(2, "Required").max(100),
  logo_url: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
  is_active: z.enum(["true", "false"]),
});

type V = z.infer<typeof schema>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function OrganizationsPage() {
  const { params, setParams, data, loading, refresh } = useList<Organization>("/organizations", { page: 1, pageSize: 10 });
  const { busy, create, update } = useMutate("/organizations", refresh);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const [mode, setMode] = useState<"create" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState<Organization | null>(null);

  const form = useForm<V>({
    resolver: zResolver(schema),
    defaultValues: { name: "", slug: "", logo_url: "", is_active: "true" },
  });

  const openCreate = () => {
    setActive(null);
    setMode("create");
    form.reset({ name: "", slug: "", logo_url: "", is_active: "true" });
  };

  const openEdit = (row: Organization) => {
    setActive(row);
    setMode("edit");
    form.reset({
      name: row.name,
      slug: row.slug,
      logo_url: row.logo_url || "",
      is_active: row.is_active ? "true" : "false",
    });
  };

  const nameValue = form.watch("name");
  const slugValue = form.watch("slug");

  const handleNameChange = (value: string) => {
    form.setValue("name", value, { shouldValidate: true });
    if (mode === "create" || mode === "edit") {
      const nextSlug = slugify(value);
      form.setValue("slug", nextSlug, { shouldValidate: true });
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (mode === "create") {
      await create({
        name: values.name,
        slug: values.slug,
        logo_url: values.logo_url || null,
      });
    } else if (mode === "edit" && active) {
      await update(active.id, {
        name: values.name,
        slug: values.slug,
        logo_url: values.logo_url || null,
        is_active: values.is_active === "true",
      });
    }
    setMode(null);
  });

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Create and manage organizations."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Organization
          </Button>
        }
      />

      <DataTable<Organization>
        columns={[
          { key: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "slug", header: "Slug", sortable: true, cell: (r) => <span className="font-mono text-xs">{r.slug}</span> },
          { key: "is_active", header: "Status", sortable: true, cell: (r) => <span>{r.is_active ? "Active" : "Inactive"}</span> },
          { key: "created_at", header: "Created", sortable: true, cell: (r) => <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span> },
        ]}
        data={data}
        loading={loading}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder="Search organizations..."
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
        title={mode === "edit" ? "Edit Organization" : "New Organization"}
        submitLabel={mode === "edit" ? "Save changes" : "Create"}
        busy={busy}
        size="lg"
        onSubmit={handleSubmit}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGrid>
            <Field label="Name" error={form.formState.errors.name?.message as string}>
              <Input value={nameValue ?? ""} onChange={(e) => handleNameChange(e.target.value)} />
            </Field>
            <Field label="Slug" error={form.formState.errors.slug?.message as string}>
              <Input value={slugValue ?? ""} disabled />
            </Field>
            <Field label="Logo URL" error={form.formState.errors.logo_url?.message as string}><Input {...form.register("logo_url")} /></Field>
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
        title="Organization details"
        size="lg"
      >
        {active && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div><dt className="text-xs uppercase text-muted-foreground">Name</dt><dd className="text-sm mt-1">{active.name}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Slug</dt><dd className="text-sm mt-1">{active.slug}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Status</dt><dd className="text-sm mt-1">{active.is_active ? "Active" : "Inactive"}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Created</dt><dd className="text-sm mt-1">{new Date(active.created_at).toLocaleString()}</dd></div>
          </dl>
        )}
      </FormModal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Disable organization?"
        description="Hard delete is not supported by backend, so this will set is_active=false."
        confirmLabel="Disable"
        destructive
        busy={busy || deletingBusy}
        onConfirm={async () => {
          if (!deleting) return;
          setDeletingBusy(true);
          try {
            await api.patch(`/organizations/${deleting.id}`, { is_active: false });
            setDeleting(null);
            refresh();
          } finally {
            setDeletingBusy(false);
          }
        }}
      />
    </div>
  );
}
