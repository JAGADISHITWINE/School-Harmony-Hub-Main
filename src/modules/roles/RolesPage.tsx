import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zResolver } from "@/modules/zodResolver";
import { Eye, Pencil, Plus, Trash } from "lucide-react";
import { api } from "@/services";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ListParams, Paginated } from "@/types";
import { useAuth } from "@/store/auth";

interface RoleRow {
  id: string;
  institution_id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_system: boolean;
  created_at: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Required").max(100),
  slug: z.string().trim().min(2, "Required").max(100),
  description: z.string().trim().max(300).optional().or(z.literal("")),
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

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function RolesPage() {
  const { user } = useAuth();

  const [params, setParams] = useState<ListParams>({
    page: 1,
    pageSize: 10,
    search: "",
  });

  const [data, setData] = useState<Paginated<RoleRow>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<RoleRow | null>(null);

  // track slug manual edit
  const [isSlugDirty, setIsSlugDirty] = useState(false);

  const form = useForm<V>({
    resolver: zResolver(schema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  const loadRoles = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("page", String(params.page ?? 1));
      q.set("page_size", String(params.pageSize ?? 10));

      const res = await api.get<any>(`/roles?${q.toString()}`);
      const normalized = normalizePaginated<RoleRow>(res);

      const term = String(params.search || "").trim().toLowerCase();

      const filtered = !term
        ? normalized
        : {
            ...normalized,
            data: normalized.data.filter((r) =>
              [r.name, r.slug, r.description || ""].some((v) =>
                String(v).toLowerCase().includes(term)
              )
            ),
          };

      setData(filtered);
    } catch {
      setData({ data: [], total: 0, page: 1, pageSize: 10 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [params.page, params.pageSize, params.search]);

  const openCreate = () => {
    setActive(null);
    setMode("create");
    setIsSlugDirty(false);
    form.reset({ name: "", slug: "", description: "" });
  };

  const openEdit = (row: RoleRow) => {
    setActive(row);
    setMode("edit");
    setIsSlugDirty(true); // prevent overwrite
    form.reset({
      name: row.name,
      slug: row.slug,
      description: row.description || "",
    });
  };

  const onNameChange = (value: string) => {
    form.setValue("name", value, { shouldValidate: true });

    if (!isSlugDirty) {
      form.setValue("slug", slugify(value), { shouldValidate: true });
    }
  };


  const handleSubmit = form.handleSubmit(async (values) => {
    if (!user?.institution_id && mode === "create") return;

    setBusy(true);
    try {
      if (mode === "create") {
        await api.post("/roles", {
          institution_id: user!.institution_id,
          name: values.name,
          slug: values.slug,
          description: values.description || null,
        });
      } else if (mode === "edit" && active) {
        await api.patch(`/roles/${active.id}`, {
          name: values.name,
          slug: values.slug,
          description: values.description || null,
        });
      }

      setMode(null);
      await loadRoles();
    } finally {
      setBusy(false);
    }
  });

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Create and manage roles."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Role
          </Button>
        }
      />

      <DataTable<RoleRow>
        columns={[
          {
            key: "name",
            header: "Name",
            sortable: true,
            cell: (r) => <span className="font-medium">{r.name}</span>,
          },
          {
            key: "slug",
            header: "Slug",
            sortable: true,
            cell: (r) => (
              <span className="font-mono text-xs">{r.slug}</span>
            ),
          },
          {
            key: "description",
            header: "Description",
            cell: (r) => (
              <span className="text-muted-foreground">
                {r.description || "-"}
              </span>
            ),
          },
          {
            key: "is_system",
            header: "Type",
            sortable: true,
            cell: (r) => <span>{r.is_system ? "System" : "Custom"}</span>,
          },
        ]}
        data={data}
        loading={loading}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder="Search roles by name/slug..."
        rowActions={(row) => (
          <div className="inline-flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setActive(row);
                setMode("view");
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

          </div>
        )}
      />

      {/* CREATE / EDIT MODAL */}
      <FormModal
        open={mode === "create" || mode === "edit"}
        onOpenChange={(v) => !v && setMode(null)}
        title={mode === "edit" ? "Edit Role" : "New Role"}
        submitLabel={mode === "edit" ? "Save changes" : "Create"}
        busy={busy}
        size="lg"
        onSubmit={handleSubmit}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGrid>
            <Field label="Name" error={form.formState.errors.name?.message as string}>
              <Input
                value={form.watch("name") || ""}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </Field>

            <Field label="Slug" error={form.formState.errors.slug?.message as string}>
              <Input
                value={form.watch("slug") || ""}
                onChange={(e) => {
                  setIsSlugDirty(true);
                  form.setValue("slug", e.target.value, {
                    shouldValidate: true,
                  });
                }}
              />
            </Field>

            <Field label="Description" error={form.formState.errors.description?.message as string}>
              <Input
                value={form.watch("description") || ""}
                onChange={(e) =>
                  form.setValue("description", e.target.value, {
                    shouldValidate: true,
                  })
                }
              />
            </Field>
          </FieldGrid>
        </form>
      </FormModal>

      {/* VIEW MODAL */}
      <FormModal
        open={mode === "view"}
        onOpenChange={(v) => !v && setMode(null)}
        title="Role details"
        size="lg"
      >
        {active && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Name</dt>
              <dd className="text-sm mt-1">{active.name}</dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-muted-foreground">Slug</dt>
              <dd className="text-sm mt-1">{active.slug}</dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-muted-foreground">Type</dt>
              <dd className="text-sm mt-1">
                {active.is_system ? "System" : "Custom"}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-muted-foreground">Description</dt>
              <dd className="text-sm mt-1">{active.description || "-"}</dd>
            </div>
          </dl>
        )}
      </FormModal>
    </div>
  );
}