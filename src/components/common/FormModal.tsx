import type { ReactNode } from "react";
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
  onSubmit?: () => void; busy?: boolean; submitLabel?: string;
  size?: "md" | "lg" | "xl";
}) {
  const w = size === "xl" ? "sm:max-w-3xl" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={w}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">{children}</div>
        {onSubmit && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={onSubmit} disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}