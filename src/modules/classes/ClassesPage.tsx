import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import type { SchoolClass, Section } from "@/types";
import { toast } from "sonner";

export function ClassesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("classes.manage");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [name, setName] = useState(""); const [grade, setGrade] = useState(9);
  const [sections, setSections] = useState<Section[]>([]);

  const load = async () => {
    const r = await api.post<{data: SchoolClass[]}>("/classes/query", { pageSize: 100 });
    setClasses(r.data);
  };
  useEffect(() => { load().catch(()=>{}); }, []);

  const openCreate = () => { setEditing(null); setName(""); setGrade(9); setSections([]); setCreating(true); };
  const openEdit = (c: SchoolClass) => { setEditing(c); setName(c.name); setGrade(c.grade); setSections([...c.sections]); setCreating(true); };

  const save = async () => {
    const body = { name, grade, sections };
    if (editing) await api.put(`/classes/${editing.id}`, body);
    else await api.post("/classes", body);
    toast.success("Saved");
    setCreating(false); load();
  };

  return (
    <div>
      <PageHeader
        title="Classes & Sections"
        description="Define grades and their nested sections."
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Class</Button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(c => (
          <Card key={c.id} className="p-5 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Grade {c.grade}</p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sections</p>
              <div className="flex flex-wrap gap-1.5">
                {c.sections.map(s => (
                  <span key={s.id} className="px-2.5 py-1 rounded-md bg-muted text-xs">{s.name} <span className="text-muted-foreground">· {s.capacity}</span></span>
                ))}
                {c.sections.length === 0 && <span className="text-xs text-muted-foreground">No sections</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <FormModal open={creating} onOpenChange={setCreating} title={editing ? "Edit class" : "New class"} onSubmit={save} submitLabel={editing ? "Save" : "Create"} size="lg">
        <div className="space-y-4">
          <FieldGrid>
            <Field label="Name"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Grade 10" /></Field>
            <Field label="Grade"><Input type="number" value={grade} onChange={e=>setGrade(Number(e.target.value))} /></Field>
          </FieldGrid>
          <Field label="Sections">
            <div className="space-y-2">
              {sections.map((s, i) => (
                <div key={s.id} className="flex gap-2">
                  <Input value={s.name} onChange={e=>setSections(prev => prev.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="A" />
                  <Input type="number" className="w-28" value={s.capacity} onChange={e=>setSections(prev => prev.map((x,j)=>j===i?{...x,capacity:Number(e.target.value)}:x))} />
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={()=>setSections(prev => prev.filter((_,j)=>j!==i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={()=>setSections(prev => [...prev, { id: Math.random().toString(36).slice(2,8), name: "", capacity: 30 }])}>
                <Plus className="h-4 w-4 mr-2" />Add section
              </Button>
            </div>
          </Field>
        </div>
      </FormModal>

      <ConfirmDialog open={!!deleting} onOpenChange={(v)=>!v && setDeleting(null)} title="Delete class?" description="All sections under this class will be removed." destructive confirmLabel="Delete"
        onConfirm={async () => { if (deleting) { await api.delete(`/classes/${deleting.id}`); toast.success("Deleted"); setDeleting(null); load(); } }} />
    </div>
  );
}