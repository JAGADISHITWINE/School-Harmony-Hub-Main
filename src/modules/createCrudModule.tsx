import type { ReactNode } from "react";
import { useState } from "react";
import { useForm, type UseFormReturn, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { BulkImportTools } from "@/components/common/BulkImportTools";
import { useList, useMutate } from "@/hooks/use-crud";
import { useAuth } from "@/store/auth";
import type { Permission } from "@/types";

interface ModuleConfig<T extends { id: string }, V extends FieldValues> {
  base: string;
  title: string;
  description?: string;
  singular: string;
  searchPlaceholder?: string;
  columns: Column<T>[];
  resolver: Resolver<V>;
  defaultValues: DefaultValues<V>;
  renderForm: (form: UseFormReturn<V>, mode: "create" | "edit", row: T | null) => ReactNode;
  renderDetails?: (row: T) => ReactNode;
  toFormValues?: (row: T) => DefaultValues<V>;
  transform?: (values: V, mode: "create" | "edit", row: T | null) => any;
  permissions?: { view?: Permission; manage?: Permission };
  selectable?: boolean;
  bulkResource?: string;
}

export function createCrudModule<T extends { id: string }, V extends FieldValues>(cfg: ModuleConfig<T, V>) {
  return function CrudPage() {
    const { hasPermission } = useAuth();
    const canManage = !cfg.permissions?.manage || hasPermission(cfg.permissions.manage);

    const { params, setParams, data, loading, refresh } = useList<T>(cfg.base, { page: 1, pageSize: 10 });
    const { busy, create, update, remove, bulkRemove } = useMutate(cfg.base, refresh);

    const [mode, setMode] = useState<"create" | "edit" | "view" | null>(null);
    const [active, setActive] = useState<T | null>(null);
    const [deleting, setDeleting] = useState<T | null>(null);

    const form = useForm<V>({ resolver: cfg.resolver, defaultValues: cfg.defaultValues });

    const openCreate = () => {
      setActive(null); setMode("create");
      form.reset(cfg.defaultValues);
    };
    const openEdit = (row: T) => {
      setActive(row); setMode("edit");
      form.reset(cfg.toFormValues ? cfg.toFormValues(row) : (row as unknown as DefaultValues<V>));
    };
    const openView = (row: T) => { setActive(row); setMode("view"); };

    const handleSubmit = form.handleSubmit(async (values) => {
      if (busy) return;
      const payload = cfg.transform ? cfg.transform(values, mode === "edit" ? "edit" : "create", active) : values;
      if (mode === "create") await create(payload);
      else if (mode === "edit" && active) await update(active.id, payload);
      form.reset(cfg.defaultValues);
      setActive(null);
      setMode(null);
    });

    return (
      <div>
        <PageHeader
          title={cfg.title}
          description={cfg.description}
          actions={canManage && (
            <>
              {cfg.bulkResource && <BulkImportTools resource={cfg.bulkResource} label={cfg.singular} onImported={refresh} />}
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> New {cfg.singular}
              </Button>
            </>
          )}
        />

        <DataTable<T>
          columns={cfg.columns}
          data={data}
          loading={loading}
          params={params}
          onParamsChange={setParams}
          searchPlaceholder={cfg.searchPlaceholder ?? `Search ${cfg.title.toLowerCase()}…`}
          selectable={cfg.selectable && canManage}
          onBulkDelete={canManage ? (ids) => bulkRemove(ids) : undefined}
          rowActions={(row) => (
            <div className="inline-flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openView(row)}><Eye className="h-4 w-4" /></Button>
              {canManage && <>
                <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" /></Button>
              </>}
            </div>
          )}
        />

        <FormModal
          open={mode === "create" || mode === "edit"}
          onOpenChange={(v) => !v && setMode(null)}
          title={mode === "edit" ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}
          submitLabel={mode === "edit" ? "Save changes" : "Create"}
          busy={busy}
          size="lg"
          onSubmit={handleSubmit}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {cfg.renderForm(form, mode === "edit" ? "edit" : "create", active)}
          </form>
        </FormModal>

        <FormModal
          open={mode === "view"}
          onOpenChange={(v) => !v && setMode(null)}
          title={`${cfg.singular} details`}
          size="lg"
        >
          {active && (cfg.renderDetails ? cfg.renderDetails(active) : <DefaultDetails row={active} />)}
        </FormModal>

        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(v) => !v && setDeleting(null)}
          title={`Delete ${cfg.singular.toLowerCase()}?`}
          description="This action cannot be undone."
          confirmLabel="Delete"
          destructive
          busy={busy}
          onConfirm={async () => { if (deleting) { await remove(deleting.id); setDeleting(null); } }}
        />
      </div>
    );
  };
}

function DefaultDetails({ row }: { row: any }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {Object.entries(row).map(([k, v]) => (
        <div key={k} className="border-b border-border pb-2">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
          <dd className="text-sm text-foreground mt-1 break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
