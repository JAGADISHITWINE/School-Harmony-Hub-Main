import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Field } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AcademicYear { id: string; label: string; is_current?: boolean; }
interface ReportStudent { student_id: string; roll_number: string; full_name: string; email: string; branch: string; class_name: string; section: string; }
interface CompleteReport {
  found?: boolean;
  generated_on?: string;
  student?: Record<string, any>;
  academic_records?: any[];
  teachers?: any[];
  attendance?: any;
  performance?: any;
  fees?: any;
  exams?: any;
  materials?: any[];
  assessments?: any[];
  assignments?: any[];
  documents?: any[];
  overall?: Record<string, any>;
}

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

const dataFrom = <T,>(payload: any): T => (payload?.data?.data || payload?.data || payload) as T;
const fmtMoney = (value?: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const fmtDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : "-";

export function StudentCompleteReportPage() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<ReportStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ReportStudent | null>(null);
  const [report, setReport] = useState<CompleteReport | null>(null);
  const [loading, setLoading] = useState(false);

  const assignmentRate = useMemo(() => {
    const total = Number(report?.overall?.assignments_total || 0);
    const submitted = Number(report?.overall?.assignments_submitted || 0);
    return total ? Math.round((submitted / total) * 100) : 0;
  }, [report]);

  useEffect(() => {
    if (!institutionId) return;
    api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=500`)
      .then((res) => {
        const rows = listFrom<AcademicYear>(res);
        setYears(rows);
        setAcademicYearId((current) => current || rows.find((year) => year.is_current)?.id || rows[0]?.id || "");
      })
      .catch(() => toast.error("Unable to load academic years"));
  }, [institutionId]);

  useEffect(() => {
    if (!academicYearId) return;
    const keyword = search.trim();
    if (keyword.length > 0 && keyword.length < 2) {
      setStudents([]);
      setSelectedStudent(null);
      setReport(null);
      return;
    }
    const timer = window.setTimeout(() => {
      searchStudents({ autoSelect: false }).catch(() => {
        if (keyword.length >= 2) toast.error("Unable to search students");
      });
    }, keyword ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [academicYearId, search]);

  const searchStudents = async ({ autoSelect = true }: { autoSelect?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    if (search.trim()) params.set("search", search.trim());
    const res = await api.get<any>(`/reports/students/search?${params.toString()}`);
    const rows = listFrom<ReportStudent>(res);
    setStudents(rows);
    if (autoSelect && rows[0]) {
      setSelectedStudent(rows[0]);
      await loadReport(rows[0].student_id);
    } else if (autoSelect) {
      setSelectedStudent(null);
      setReport(null);
    }
  };

  const loadReport = async (studentId = selectedStudent?.student_id) => {
    if (!studentId) return toast.error("Select a student first");
    setLoading(true);
    try {
      const qs = academicYearId ? `?academic_year_id=${academicYearId}` : "";
      const res = await api.get<any>(`/reports/students/${studentId}/complete${qs}`);
      const next = dataFrom<CompleteReport>(res);
      setReport(next);
      if (!next?.found) toast.error(next?.message || "Student report not found");
    } catch (err: any) {
      toast.error(err?.message || "Unable to load student complete report");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!selectedStudent) return toast.error("Select a student first");
    const qs = academicYearId ? `?academic_year_id=${academicYearId}` : "";
    api.download(
      `/reports/students/${selectedStudent.student_id}/complete.pdf${qs}`,
      `${selectedStudent.roll_number}_complete_report.pdf`,
    );
  };

  const student = report?.student || {};
  const overall = report?.overall || {};

  return (
    <div>
      <PageHeader
        title="Student Complete Report"
        description="Complete student view from admission through academics, attendance, teachers, assignments, assessments, fees and performance."
        actions={
          <>
            <Button variant="outline" onClick={downloadPdf} disabled={!selectedStudent}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" onClick={() => loadReport()} disabled={loading || !selectedStudent}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          </>
        }
      />

      <Card className="mb-4 border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[240px_1fr_auto]">
          <SelectField label="Academic Year" value={academicYearId} onChange={setAcademicYearId} items={years.map((year) => ({ id: year.id, label: year.label }))} />
          <Field label="Search Student">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchStudents(); }} placeholder="Name, roll number, or email" />
          </Field>
          <div className="flex items-end">
            <Button className="w-full lg:w-auto" onClick={searchStudents}><Search className="mr-2 h-4 w-4" /> Search</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Students">
          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {students.map((row) => (
              <button
                key={row.student_id}
                onClick={() => { setSelectedStudent(row); loadReport(row.student_id); }}
                className={`w-full rounded-md border p-3 text-left text-sm transition hover:border-primary ${selectedStudent?.student_id === row.student_id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="font-medium">{row.full_name}</div>
                <div className="text-muted-foreground">{row.roll_number} - {row.class_name} / {row.section}</div>
                <div className="text-xs text-muted-foreground">{row.branch}</div>
              </button>
            ))}
            {students.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Search and select a student to generate the report.</div>}
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Attendance" value={`${overall.attendance_percentage || 0}%`} icon={CalendarCheck} accent="primary" />
            <StatCard label="CGPA" value={overall.cgpa || 0} icon={GraduationCap} accent="blue" />
            <StatCard label="Assignments" value={`${assignmentRate}%`} icon={ClipboardCheck} accent="amber" />
            <StatCard label="Fee Due" value={fmtMoney(overall.pending_fees)} icon={CreditCard} accent="rose" />
          </div>

          <Panel title={student.full_name ? `${student.full_name} (${student.roll_number})` : "Student Summary"}>
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Admission Date" value={fmtDate(student.admission_date)} />
              <Info label="Course / Branch" value={[student.course, student.branch].filter(Boolean).join(" / ") || "-"} />
              <Info label="Class / Section" value={[student.class_name, student.section].filter(Boolean).join(" / ") || "-"} />
              <Info label="Academic Year" value={student.current_academic_year || "-"} />
              <Info label="Guardian" value={student.guardian_name || "-"} />
              <Info label="Contact" value={student.phone || student.email || "-"} />
            </div>
          </Panel>

          <Tabs defaultValue="academics">
            <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
              <TabsTrigger value="academics">Academics</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="content">Assignments & Assessments</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="academics">
              <Table headers={["Year", "Course", "Branch", "Class", "Section", "Status"]} rows={(report?.academic_records || []).map((row) => [row.academic_year, row.course, row.branch, row.class_name, row.section, row.status])} empty="No academic records found." />
            </TabsContent>

            <TabsContent value="attendance">
              <div className="mb-4 grid gap-4 md:grid-cols-4">
                <StatCard label="Overall" value={`${report?.attendance?.overall || 0}%`} icon={CalendarCheck} />
                <StatCard label="Subjects" value={report?.attendance?.subjects?.length || 0} icon={BookOpen} accent="blue" />
                <StatCard label="Recent Days" value={report?.attendance?.recent?.length || 0} icon={Users} accent="amber" />
                <StatCard label="Low Alert" value={(report?.attendance?.overall || 0) < 75 ? "Yes" : "No"} icon={AlertTriangle} accent="rose" />
              </div>
              <Table headers={["Subject", "Attended", "Total", "%"]} rows={(report?.attendance?.subjects || []).map((row: any) => [row.subject, row.attended, row.total, row.total ? `${Math.round((row.attended / row.total) * 100)}%` : "0%"])} empty="No attendance found." />
            </TabsContent>

            <TabsContent value="teachers">
              <Table headers={["Teacher", "Code", "Designation", "Subject", "Class", "Section"]} rows={(report?.teachers || []).map((row) => [row.teacher_name, row.employee_code, row.designation || "-", `${row.subject_code} - ${row.subject}`, row.class_name, row.section])} empty="No teacher mappings found." />
            </TabsContent>

            <TabsContent value="content">
              <div className="grid gap-4 xl:grid-cols-3">
                <Panel title="Assignments">
                  <Table headers={["Title", "Subject", "Due", "Status"]} rows={(report?.assignments || []).map((row) => [row.title, row.subject, fmtDate(row.due_date), row.submitted ? "Submitted" : "Pending"])} empty="No assignments found." />
                </Panel>
                <Panel title="Assessments">
                  <Table headers={["Title", "Subject", "Marks", "Due"]} rows={(report?.assessments || []).map((row) => [row.title, row.subject, row.total_marks, fmtDate(row.due_date)])} empty="No assessments found." />
                </Panel>
                <Panel title="Materials">
                  <Table headers={["Title", "Subject", "Type", "Teacher"]} rows={(report?.materials || []).map((row) => [row.title, row.subject, row.type, row.teacher])} empty="No materials found." />
                </Panel>
              </div>
            </TabsContent>

            <TabsContent value="fees">
              <Table headers={["Fee", "Amount", "Paid", "Balance"]} rows={(report?.fees?.breakdown || []).map((row: any) => [row.item, fmtMoney(row.amount), fmtMoney(row.paid), fmtMoney(Math.max(Number(row.amount || 0) - Number(row.paid || 0), 0))])} empty="No fee rows found." />
            </TabsContent>

            <TabsContent value="performance">
              <div className="mb-4 grid gap-4 md:grid-cols-4">
                <StatCard label="Average Marks" value={`${overall.average_marks || 0}%`} icon={GraduationCap} />
                <StatCard label="SGPA" value={overall.sgpa || 0} icon={BookOpen} accent="blue" />
                <StatCard label="Assessments" value={overall.assessments_total || 0} icon={ClipboardCheck} accent="amber" />
                <StatCard label="Pending Work" value={overall.assignments_pending || 0} icon={AlertTriangle} accent="rose" />
              </div>
              <Table headers={["Subject", "Marks", "Grade", "Exam"]} rows={(report?.performance?.subjects || []).map((row: any) => [row.subject, `${row.marks}%`, row.grade, row.exam])} empty="No marks uploaded yet." />
            </TabsContent>

            <TabsContent value="documents">
              <Table headers={["Document", "Type", "File", "Status", "Updated"]} rows={(report?.documents || []).map((row) => [row.title, row.type, row.file_name || "-", row.status, fmtDate(row.updated_at)])} empty="No documents uploaded." />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, items }: { label: string; value: string; onChange: (value: string) => void; items: { id: string; label: string }[] }) {
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Table({ headers, rows, empty }: { headers: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>{headers.map((header) => <th key={header} className="py-2 pr-4">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-border/70">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="py-3 pr-4">{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} className="py-8 text-center text-muted-foreground">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
