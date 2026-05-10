import { useEffect, useMemo, useState } from "react";
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
  const { hasPermission, user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const canManage = hasPermission("classes.manage");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [name, setName] = useState(""); const [grade, setGrade] = useState(9);
  const [sections, setSections] = useState<Section[]>([]);
  const [teacherSlots, setTeacherSlots] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [sectionStudents, setSectionStudents] = useState<any[]>([]);
  const [sectionSessions, setSectionSessions] = useState<any[]>([]);
  const [loadingTeacherScope, setLoadingTeacherScope] = useState(false);

  const load = async () => {
    if (isTeacher) {
      setLoadingTeacherScope(true);
      try {
        const res = await api.get<any>("/teachers/self/my-timetable");
        const slots =
          (Array.isArray(res?.data?.items) && res.data.items) ||
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res) && res) ||
          [];
        setTeacherSlots(slots);
        const first = slots[0];
        setSelectedSectionId((prev) => prev || first?.section_id || "");
        setSelectedAcademicYearId((prev) => prev || first?.academic_year_id || "");
      } catch (error: any) {
        toast.error(error?.message || "Failed to load your mapped classes");
        setTeacherSlots([]);
        setSelectedSectionId("");
        setSelectedAcademicYearId("");
      } finally {
        setLoadingTeacherScope(false);
      }
      return;
    }
    const r = await api.post<{data: SchoolClass[]}>("/classes/query", { pageSize: 100 });
    setClasses(r.data);
  };
  useEffect(() => { load().catch(()=>{}); }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher || !selectedSectionId || !selectedAcademicYearId) {
      setSectionStudents([]);
      setSectionSessions([]);
      return;
    }
    (async () => {
      setLoadingTeacherScope(true);
      const [studentsRes, sessionsRes] = await Promise.allSettled([
        api.get<any>(`/attendance/section-students?section_id=${selectedSectionId}&academic_year_id=${selectedAcademicYearId}`),
        api.get<any>(`/attendance/sessions?section_id=${selectedSectionId}&page=1&page_size=20`),
      ]);
      if (studentsRes.status === "fulfilled") {
        const payload = studentsRes.value;
        const students =
          (Array.isArray(payload?.data?.items) && payload.data.items) ||
          (Array.isArray(payload?.data) && payload.data) ||
          (Array.isArray(payload) && payload) ||
          [];
        setSectionStudents(students);
      } else {
        toast.error(studentsRes.reason?.message || "Failed to load section students");
        setSectionStudents([]);
      }

      if (sessionsRes.status === "fulfilled") {
        const payload = sessionsRes.value;
        const sessions =
          (Array.isArray(payload?.data?.items) && payload.data.items) ||
          (Array.isArray(payload?.data) && payload.data) ||
          (Array.isArray(payload) && payload) ||
          [];
        setSectionSessions(sessions);
      } else {
        setSectionSessions([]);
      }
    })().catch(() => {
      setSectionStudents([]);
      setSectionSessions([]);
    }).finally(() => {
      setLoadingTeacherScope(false);
    });
  }, [isTeacher, selectedSectionId, selectedAcademicYearId]);

  const handledSections = useMemo(() => {
    const seen = new Set<string>();
    return teacherSlots.filter((slot) => {
      const key = `${slot.class_id}|${slot.section_id}|${slot.academic_year_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [teacherSlots]);

  if (isTeacher) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="My Classes"
          description="Sections handled by you, with student and attendance list."
          actions={<Button variant="outline" onClick={() => load().catch(() => {})}>Refresh</Button>}
        />
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Handled Sections</p>
          <div className="flex flex-wrap gap-2">
            {handledSections.map((slot) => (
              <Button
                key={`${slot.class_id}-${slot.section_id}-${slot.academic_year_id}`}
                variant={selectedSectionId === slot.section_id ? "default" : "outline"}
                onClick={() => {
                  setSelectedSectionId(slot.section_id);
                  setSelectedAcademicYearId(slot.academic_year_id);
                }}
              >
                {slot.class_name} / {slot.section_name}
              </Button>
            ))}
            {handledSections.length === 0 && (
              <span className="text-sm text-muted-foreground">
                {loadingTeacherScope ? "Loading mapped classes..." : "No mapped classes found."}
              </span>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Student List</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {sectionStudents.map((s) => (
                <div key={s.student_id} className="rounded-md border p-2">
                  <div className="font-medium">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">Roll: {s.roll_number}</div>
                </div>
              ))}
              {sectionStudents.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  {loadingTeacherScope ? "Loading students..." : "No students in this section."}
                </div>
              )}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Attendance Sessions</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {sectionSessions.map((session) => (
                <div key={session.id} className="rounded-md border p-2">
                  <div className="font-medium">{new Date(session.session_date).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground capitalize">Status: {session.status || "-"}</div>
                </div>
              ))}
              {sectionSessions.length === 0 && <div className="text-sm text-muted-foreground">No attendance sessions yet.</div>}
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
