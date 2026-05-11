import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function FormModal({
  open, onOpenChange, title, description, children, onSubmit, busy, submitLabel = "Save", size = "md",
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: string; description?: string;
  children: ReactNode;
  onSubmit?: () => void | Promise<void>; busy?: boolean; submitLabel?: string;
  size?: "md" | "lg" | "xl";
}) {
  const [locked, setLocked] = useState(false);
  const w = size === "xl" ? "sm:max-w-3xl" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";
  const isBusy = Boolean(busy || locked);

  useEffect(() => {
    if (!open) setLocked(false);
  }, [open]);

  const submitOnce = async () => {
    if (!onSubmit || isBusy) return;
    setLocked(true);
    try {
      await onSubmit();
    } finally {
      setLocked(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${w} max-h-[90vh] overflow-hidden p-0`}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[calc(90vh-9rem)] overflow-y-auto px-6 py-2">{children}</div>
        {onSubmit && (
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>Cancel</Button>
            <Button onClick={submitOnce} disabled={isBusy}>{isBusy ? "Saving..." : submitLabel}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
