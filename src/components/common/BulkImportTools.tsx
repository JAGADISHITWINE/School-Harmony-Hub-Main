import { useRef, useState } from "react";
import { Download, FileDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { Button } from "@/components/ui/button";

type Props = {
  resource: string;
  label?: string;
  onImported?: () => void | Promise<void>;
};

export function BulkImportTools({ resource, label = "Excel", onImported }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () =>
    api.download(`/admin-bulk/templates/${resource}.csv`, `${resource}-template.csv`);

  const exportCurrent = () =>
    api.download(`/admin-bulk/exports/${resource}.csv`, `${resource}-export.csv`);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<any>(`/admin-bulk/imports/${resource}`, form);
      const data = res?.data || {};
      const errors = Array.isArray(data.errors) ? data.errors.length : 0;
      toast.success(
        `${label} import: ${data.created || 0} created, ${data.updated || 0} updated${errors ? `, ${errors} errors` : ""}`
      );
      if (errors) console.table(data.errors);
      await onImported?.();
    } catch (error: any) {
      toast.error(error?.message || "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
        <FileDown className="mr-2 h-4 w-4" /> Format
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={exportCurrent}>
        <Download className="mr-2 h-4 w-4" /> Export
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" /> Import
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".csv,.xlsx"
        onChange={(event) => upload(event.target.files?.[0])}
      />
    </div>
  );
}
