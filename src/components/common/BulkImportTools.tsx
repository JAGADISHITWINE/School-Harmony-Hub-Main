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
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<any[]>([]);

  const downloadTemplate = () =>
    api.download(`/admin-bulk/templates/${resource}.csv`, `${resource}-template.csv`);

  const exportCurrent = () =>
    api.download(`/admin-bulk/exports/${resource}.csv`, `${resource}-export.csv`);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setErrors([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<any>(`/admin-bulk/imports/${resource}`, form, setProgress);
      const data = res?.data || {};
      const errors = Array.isArray(data.errors) ? data.errors.length : 0;
      setErrors(data.errors || []);
      setProgress(100);
      if (errors) {
        toast.error("Upload completed with errors. Please review the error report.");
      } else {
        toast.success("Bulk upload completed successfully.");
      }
      await onImported?.();
    } catch (error: any) {
      toast.error(error?.message || "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const downloadErrors = () => {
    const headers = ["Row Number", "Field Name", "Error Message", "Provided Value"];
    const lines = [
      headers.join(","),
      ...errors.map((e) =>
        [e.row, e.field, e.message, e.provided_value]
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resource}-import-errors.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} disabled={busy}>
          <FileDown className="mr-2 h-4 w-4" /> Format
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportCurrent} disabled={busy}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> {busy ? `Uploading... ${progress}%` : "Import"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx"
          onChange={(event) => upload(event.target.files?.[0])}
        />
      </div>
      {(busy || progress > 0) && (
        <div className="h-2 w-full max-w-md overflow-hidden rounded bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {errors.length > 0 && (
        <div className="max-w-3xl rounded-md border bg-background p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Import Errors ({errors.length})</p>
            <Button type="button" size="sm" variant="outline" onClick={downloadErrors}>Download Error Report</Button>
          </div>
          <div className="max-h-56 overflow-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-2 text-left">Row Number</th>
                  <th className="border p-2 text-left">Field Name</th>
                  <th className="border p-2 text-left">Error Message</th>
                  <th className="border p-2 text-left">Provided Value</th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 20).map((error, index) => (
                  <tr key={`${error.row}-${index}`}>
                    <td className="border p-2">{error.row}</td>
                    <td className="border p-2">{error.field || "row"}</td>
                    <td className="border p-2">{error.message || error.error}</td>
                    <td className="border p-2">{error.provided_value || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
