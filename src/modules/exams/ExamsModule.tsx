import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpenCheck, ClipboardCheck, Lock, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { BulkImportTools } from "@/components/common/BulkImportTools";
import { StatCard } from "@/components/common/StatCard";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Exam {
  id: string;
  academic_year_id: string;
  name: string;
  exam_type: string;
  workflow_status: "draft" | "submitted" | "locked";
}

interface ExamSubject {
  id: string;
  exam_id: string;
  subject_id: string;
  max_marks: number;
  pass_marks: number;
  exam_date?: string | null;
}

interface Mark {
  student_id: string;
  marks_obtained?: number | null;
  is_absent: boolean;
}

interface AcademicYear { id: string; label: string; is_current?: boolean; }
interface Course { id: string; name: string; }
interface Branch { id: string; name: string; }
interface ClassRow { id: string; name: string; }
interface Subject { id: string; name: string; code: string; }
interface Student { id: string; full_name: string; roll_number: string; }

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

const today = () => new Date().toISOString().slice(0, 10);

export function ExamsModule() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedExamSubjectId, setSelectedExamSubjectId] = useState("");
  const [marks, setMarks] = useState<Record<string, { marks: string; absent: boolean }>>({});

  const [examForm, setExamForm] = useState({ academic_year_id: "", name: "", exam_type: "midterm" });
  const [scope, setScope] = useState({ course_id: "", branch_id: "", class_id: "" });
  const [subjectForm, setSubjectForm] = useState({ subject_id: "", max_marks: "100", pass_marks: "35", exam_date: today() });

  const selectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const yearById = useMemo(() => new Map(years.map((y) => [y.id, y.label])), [years]);
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, `${s.code} - ${s.name}`])), [subjects]);

  const load = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [examsRes, yearsRes, coursesRes, studentsRes] = await Promise.all([
        api.get<any>("/exams?page=1&page_size=100"),
        api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=100`),
        api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=100`),
        api.get<any>("/students?page=1&page_size=100"),
      ]);
      const nextExams = listFrom<Exam>(examsRes);
      const nextYears = listFrom<AcademicYear>(yearsRes);
      setExams(nextExams);
      setYears(nextYears);
      setCourses(listFrom<Course>(coursesRes));
      setStudents(listFrom<Student>(studentsRes));
      setExamForm((prev) => ({ ...prev, academic_year_id: prev.academic_year_id || nextYears.find((y) => y.is_current)?.id || nextYears[0]?.id || "" }));
      if (!selectedExamId && nextExams[0]) setSelectedExamId(nextExams[0].id);
    } catch (err: any) {
      toast.error(err?.message || "Unable to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [institutionId]);

  useEffect(() => {
    if (!scope.course_id) { setBranches([]); return; }
    api.get<any>(`/branches?course_id=${scope.course_id}&page=1&page_size=100`)
      .then((res) => setBranches(listFrom<Branch>(res)))
      .catch(() => setBranches([]));
  }, [scope.course_id]);

  useEffect(() => {
    if (!scope.branch_id) { setClasses([]); return; }
    api.get<any>(`/classes?branch_id=${scope.branch_id}&page=1&page_size=100`)
      .then((res) => setClasses(listFrom<ClassRow>(res)))
      .catch(() => setClasses([]));
  }, [scope.branch_id]);

  useEffect(() => {
    if (!scope.class_id) { setSubjects([]); return; }
    api.get<any>(`/subjects?class_id=${scope.class_id}&page=1&page_size=100`)
      .then((res) => setSubjects(listFrom<Subject>(res)))
      .catch(() => setSubjects([]));
  }, [scope.class_id]);

  const loadExamSubjects = async (examId: string) => {
    if (!examId) return;
    const res = await api.get<any>(`/exams/${examId}/subjects`);
    const rows = listFrom<ExamSubject>(res);
    setExamSubjects(rows);
    setSelectedExamSubjectId((current) => current || rows[0]?.id || "");
  };

  useEffect(() => { if (selectedExamId) loadExamSubjects(selectedExamId).catch(() => setExamSubjects([])); }, [selectedExamId]);

  useEffect(() => {
    if (!selectedExamSubjectId) return;
    api.get<any>(`/exams/marks/${selectedExamSubjectId}`)
      .then((res) => {
        const existing = new Map(listFrom<Mark>(res).map((m) => [m.student_id, m]));
        const next: Record<string, { marks: string; absent: boolean }> = {};
        students.forEach((student) => {
          const mark = existing.get(student.id);
          next[student.id] = { marks: mark?.marks_obtained == null ? "" : String(mark.marks_obtained), absent: !!mark?.is_absent };
        });
        setMarks(next);
      })
      .catch(() => setMarks({}));
  }, [selectedExamSubjectId, students.length]);

  const createExam = async () => {
    if (!examForm.academic_year_id || !examForm.name.trim()) return toast.error("Enter exam name and academic year");
    await api.post("/exams", { institution_id: institutionId, ...examForm, name: examForm.name.trim() });
    toast.success("Exam created");
    setExamForm((prev) => ({ ...prev, name: "" }));
    await load();
  };

  const addSubject = async () => {
    if (!selectedExam?.id || !subjectForm.subject_id) return toast.error("Select exam and subject");
    await api.post(`/exams/${selectedExam.id}/subjects`, {
      subject_id: subjectForm.subject_id,
      max_marks: Number(subjectForm.max_marks || 0),
      pass_marks: Number(subjectForm.pass_marks || 0),
      exam_date: subjectForm.exam_date || null,
    });
    toast.success("Subject added to exam");
    setSubjectForm((prev) => ({ ...prev, subject_id: "" }));
    await loadExamSubjects(selectedExam.id);
  };

  const workflow = async (action: "submit" | "lock") => {
    if (!selectedExam?.id) return;
    await api.patch(`/exams/${selectedExam.id}/workflow/${action}`, {});
    toast.success(action === "submit" ? "Exam submitted" : "Exam locked");
    await load();
  };

  const uploadMarks = async () => {
    if (!selectedExamSubjectId) return toast.error("Select exam subject");
    const entries = students.map((student) => ({
      student_id: student.id,
      is_absent: !!marks[student.id]?.absent,
      marks_obtained: marks[student.id]?.absent || marks[student.id]?.marks === "" ? null : Number(marks[student.id]?.marks || 0),
    }));
    await api.post("/exams/marks", { exam_subject_id: selectedExamSubjectId, entries });
    toast.success("Marks uploaded");
  };

  return (
    <div>
      <PageHeader
        title="Exams & Marks"
        description="Create exams, map subjects, upload marks and lock results."
        actions={
          <>
            <BulkImportTools resource="exams" label="Exams" onImported={load} />
            <BulkImportTools resource="exam-subjects" label="Exam Subjects" onImported={load} />
            <BulkImportTools resource="marks" label="Marks" onImported={load} />
            <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Exams" value={exams.length} icon={BookOpenCheck} accent="primary" />
        <StatCard label="Mapped Subjects" value={examSubjects.length} icon={ClipboardCheck} accent="blue" />
        <StatCard label="Locked Exams" value={exams.filter((e) => e.workflow_status === "locked").length} icon={Lock} accent="amber" />
      </div>

      <Tabs defaultValue="marks">
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="marks">Marks Upload</TabsTrigger>
          <TabsTrigger value="subjects">Exam Subjects</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
        </TabsList>

        <TabsContent value="marks">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <SelectField label="Exam" value={selectedExam?.id || ""} onChange={setSelectedExamId} items={exams.map((e) => ({ id: e.id, label: `${e.name} - ${yearById.get(e.academic_year_id) || "Year"} (${e.workflow_status})` }))} />
            <SelectField label="Subject" value={selectedExamSubjectId} onChange={setSelectedExamSubjectId} items={examSubjects.map((es) => ({ id: es.id, label: `${subjectById.get(es.subject_id) || es.subject_id} - ${es.max_marks} marks` }))} />
          </div>
          <Panel title="Marks Entry">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Roll</th><th>Student</th><th className="w-40">Marks</th><th className="w-28">Absent</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-border/70">
                      <td className="py-2 font-mono text-xs">{student.roll_number}</td>
                      <td className="font-medium">{student.full_name}</td>
                      <td><Input type="number" value={marks[student.id]?.marks || ""} disabled={marks[student.id]?.absent} onChange={(e) => setMarks((prev) => ({ ...prev, [student.id]: { marks: e.target.value, absent: !!prev[student.id]?.absent } }))} /></td>
                      <td><input type="checkbox" checked={!!marks[student.id]?.absent} onChange={(e) => setMarks((prev) => ({ ...prev, [student.id]: { marks: e.target.checked ? "" : prev[student.id]?.marks || "", absent: e.target.checked } }))} /></td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No students available.</td></tr>}
                </tbody>
              </table>
            </div>
            <Button className="mt-4" onClick={uploadMarks} disabled={selectedExam?.workflow_status === "locked"}><ClipboardCheck className="mr-2 h-4 w-4" /> Upload Marks</Button>
          </Panel>
        </TabsContent>

        <TabsContent value="subjects">
          <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <Panel title="Map Subject To Exam">
              <FieldGrid>
                <SelectField label="Exam" value={selectedExam?.id || ""} onChange={setSelectedExamId} items={exams.map((e) => ({ id: e.id, label: e.name }))} />
                <SelectField label="Course" value={scope.course_id} onChange={(v) => setScope({ course_id: v, branch_id: "", class_id: "" })} items={courses.map((c) => ({ id: c.id, label: c.name }))} />
                <SelectField label="Branch" value={scope.branch_id} onChange={(v) => setScope((p) => ({ ...p, branch_id: v, class_id: "" }))} items={branches.map((b) => ({ id: b.id, label: b.name }))} />
                <SelectField label="Class" value={scope.class_id} onChange={(v) => setScope((p) => ({ ...p, class_id: v }))} items={classes.map((c) => ({ id: c.id, label: c.name }))} />
                <SelectField label="Subject" value={subjectForm.subject_id} onChange={(v) => setSubjectForm((p) => ({ ...p, subject_id: v }))} items={subjects.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }))} />
                <Field label="Max Marks"><Input type="number" value={subjectForm.max_marks} onChange={(e) => setSubjectForm((p) => ({ ...p, max_marks: e.target.value }))} /></Field>
                <Field label="Pass Marks"><Input type="number" value={subjectForm.pass_marks} onChange={(e) => setSubjectForm((p) => ({ ...p, pass_marks: e.target.value }))} /></Field>
                <Field label="Exam Date"><Input type="date" value={subjectForm.exam_date} onChange={(e) => setSubjectForm((p) => ({ ...p, exam_date: e.target.value }))} /></Field>
              </FieldGrid>
              <Button className="mt-4" onClick={addSubject}><Plus className="mr-2 h-4 w-4" /> Add Subject</Button>
            </Panel>
            <ExamSubjectsTable rows={examSubjects} subjectById={subjectById} />
          </div>
        </TabsContent>

        <TabsContent value="exams">
          <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <Panel title="Create Exam">
              <FieldGrid>
                <SelectField label="Academic Year" value={examForm.academic_year_id} onChange={(v) => setExamForm((p) => ({ ...p, academic_year_id: v }))} items={years.map((y) => ({ id: y.id, label: y.label }))} />
                <Field label="Exam Name"><Input value={examForm.name} onChange={(e) => setExamForm((p) => ({ ...p, name: e.target.value }))} placeholder="Mid Semester Examination" /></Field>
                <SelectField label="Exam Type" value={examForm.exam_type} onChange={(v) => setExamForm((p) => ({ ...p, exam_type: v }))} items={[
                  { id: "unit_test", label: "Unit Test" }, { id: "midterm", label: "Midterm" }, { id: "final", label: "Final" },
                ]} />
              </FieldGrid>
              <Button className="mt-4" onClick={createExam}><Plus className="mr-2 h-4 w-4" /> Create Exam</Button>
            </Panel>
            <Panel title="Exam Workflow">
              <div className="space-y-2">
                {exams.map((exam) => (
                  <div key={exam.id} className="flex flex-col gap-3 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{exam.name}</div>
                      <div className="text-sm text-muted-foreground">{yearById.get(exam.academic_year_id) || "Academic year"} - {exam.exam_type}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{exam.workflow_status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedExamId(exam.id); workflow("submit"); }} disabled={exam.workflow_status !== "draft"}><Send className="mr-2 h-4 w-4" /> Submit</Button>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedExamId(exam.id); workflow("lock"); }} disabled={exam.workflow_status !== "submitted"}><Lock className="mr-2 h-4 w-4" /> Lock</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function SelectField({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: { id: string; label: string }[] }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent className="max-h-72">
          {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ExamSubjectsTable({ rows, subjectById }: { rows: ExamSubject[]; subjectById: Map<string, string> }) {
  return (
    <Panel title="Exam Subjects">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="py-2">Subject</th><th>Max</th><th>Pass</th><th>Date</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/70">
                <td className="py-3 font-medium">{subjectById.get(row.subject_id) || row.subject_id}</td>
                <td>{row.max_marks}</td>
                <td>{row.pass_marks}</td>
                <td>{row.exam_date || "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No subjects mapped yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
