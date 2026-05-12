import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  History,
  Library,
  RefreshCw,
  Download,
  FileText,
  ReceiptText,
  School,
  ShieldCheck,
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
interface Course { id: string; name: string; }
interface Branch { id: string; name: string; }
interface ClassRow { id: string; name: string; }
interface Section { id: string; name: string; }
interface ReportStudent {
  student_id: string;
  roll_number: string;
  full_name: string;
  email: string;
  academic_year: string;
  branch: string;
  class_name: string;
  section: string;
}

interface AttendanceReportRow {
  student_id: string;
  roll_number: string;
  full_name: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

interface WorkloadRow {
  teacher_id: string;
  teacher_name: string;
  timetable_slots: number;
  sessions_taken: number;
}

interface HodAnalytics {
  totals: {
    students: number;
    attendance_percentage: number;
    absent_today: number;
    marks_uploaded: number;
  };
  branches: Array<{
    hod_link_id: string;
    course_name: string;
    branch_name: string;
    student_count: number;
    class_count: number;
    section_count: number;
    teachers_count: number;
    timetable_slots: number;
    attendance_percentage: number;
    absent_today: number;
    marks_uploaded: number;
  }>;
}

interface Overview {
  academic_year_label?: string | null;
  generated_on: string;
  academics: Record<string, number>;
  students: Record<string, number>;
  teachers: Record<string, number>;
  attendance: Record<string, number>;
  fees: Record<string, number>;
  exams: Record<string, number>;
  library: Record<string, number>;
  notifications: Record<string, number>;
  audit: Record<string, number>;
  recent_events: Array<{ module: string; action: string; message?: string | null; created_at: string }>;
  coverage: Array<{ module: string; status: string; details: string }>;
}

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

const fmtMoney = (value?: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const fmtDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

export function ReportsModule() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [filters, setFilters] = useState({ academic_year_id: "", course_id: "", branch_id: "", class_id: "", section_id: "" });
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<ReportStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ReportStudent | null>(null);
  const [paymentId, setPaymentId] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [attendance, setAttendance] = useState<AttendanceReportRow[]>([]);
  const [workload, setWorkload] = useState<WorkloadRow[]>([]);
  const [hodAnalytics, setHodAnalytics] = useState<HodAnalytics | null>(null);
  const isHod = user?.role === "hod";

  const avgAttendance = useMemo(() => {
    if (!attendance.length) return 0;
    return Math.round(attendance.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / attendance.length);
  }, [attendance]);

  const loadBase = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [yearsRes, coursesRes] = await Promise.all([
        api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=500`),
        api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=500`),
      ]);
      const nextYears = listFrom<AcademicYear>(yearsRes);
      setYears(nextYears);
      setCourses(listFrom<Course>(coursesRes));
      setFilters((prev) => ({ ...prev, academic_year_id: prev.academic_year_id || nextYears.find((y) => y.is_current)?.id || nextYears[0]?.id || "" }));
    } catch (err: any) {
      toast.error(err?.message || "Unable to load report filters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBase(); }, [institutionId]);

  useEffect(() => {
    if (!filters.academic_year_id) return;
    loadOverview().catch(() => toast.error("Unable to load overview report"));
  }, [filters.academic_year_id]);

  useEffect(() => {
    if (!filters.course_id) { setBranches([]); return; }
    api.get<any>(`/branches?course_id=${filters.course_id}&page=1&page_size=500`).then((res) => setBranches(listFrom<Branch>(res))).catch(() => setBranches([]));
  }, [filters.course_id]);

  useEffect(() => {
    if (!filters.branch_id) { setClasses([]); return; }
    api.get<any>(`/classes?branch_id=${filters.branch_id}&page=1&page_size=500`).then((res) => setClasses(listFrom<ClassRow>(res))).catch(() => setClasses([]));
  }, [filters.branch_id]);

  useEffect(() => {
    if (!filters.class_id) { setSections([]); return; }
    api.get<any>(`/sections?class_id=${filters.class_id}&page=1&page_size=500`).then((res) => setSections(listFrom<Section>(res))).catch(() => setSections([]));
  }, [filters.class_id]);

  const loadOverview = async () => {
    if (!filters.academic_year_id) return;
    const res = await api.get<any>(`/reports/overview?academic_year_id=${filters.academic_year_id}`);
    setOverview(res?.data || res);
  };

  const loadAttendance = async () => {
    if (!filters.section_id || !filters.academic_year_id) return toast.error("Select academic year and section");
    const params = new URLSearchParams({ section_id: filters.section_id, academic_year_id: filters.academic_year_id });
    const res = await api.get<any>(`/attendance/report?${params.toString()}`);
    setAttendance(listFrom<AttendanceReportRow>(res));
  };

  const loadWorkload = async () => {
    if (!filters.academic_year_id) return toast.error("Select academic year");
    const res = await api.get<any>(`/attendance/analytics/teacher-workload?academic_year_id=${filters.academic_year_id}`);
    setWorkload(listFrom<WorkloadRow>(res));
  };

  const loadHodAnalytics = async () => {
    if (!filters.academic_year_id) return toast.error("Select academic year");
    const res = await api.get<any>(`/teachers/self/hod-analytics?academic_year_id=${filters.academic_year_id}`);
    setHodAnalytics(res?.data || res);
  };

  const queryString = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const searchReportStudents = async () => {
    const qs = queryString({ search: studentSearch });
    const res = await api.get<any>(`/reports/students/search?${qs}`);
    const rows = listFrom<ReportStudent>(res);
    setStudents(rows);
    setSelectedStudent(rows[0] || null);
  };

  const downloadStudentReport = (kind: "report-card" | "attendance-certificate") => {
    if (!selectedStudent) return toast.error("Select a student first");
    const qs = filters.academic_year_id ? `?academic_year_id=${filters.academic_year_id}` : "";
    const filename = `${selectedStudent.roll_number}_${kind}.pdf`;
    api.download(`/reports/students/${selectedStudent.student_id}/${kind}.pdf${qs}`, filename);
  };

  const downloadBranchReport = (format: "csv" | "pdf") => {
    const qs = queryString();
    const url = format === "csv" ? `/reports/branch-report/export.csv?${qs}` : `/reports/branch-report.pdf?${qs}`;
    api.download(url, `branch_report.${format}`);
  };

  const downloadFeeReceipt = () => {
    if (!paymentId.trim()) return toast.error("Enter payment receipt/payment ID");
    api.download(`/reports/fees/payments/${paymentId.trim()}/receipt.pdf`, "fee_receipt.pdf");
  };

  const refreshAll = async () => {
    await Promise.all([
      filters.academic_year_id ? loadOverview() : Promise.resolve(),
      filters.section_id ? loadAttendance() : Promise.resolve(),
      filters.academic_year_id ? loadWorkload() : Promise.resolve(),
      isHod && filters.academic_year_id ? loadHodAnalytics() : Promise.resolve(),
    ]);
  };

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "course_id") Object.assign(next, { branch_id: "", class_id: "", section_id: "" });
      if (key === "branch_id") Object.assign(next, { class_id: "", section_id: "" });
      if (key === "class_id") Object.assign(next, { section_id: "" });
      return next;
    });
  };

  const o = overview;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Complete college reporting across academics, students, teachers, attendance, fees, exams, library, notifications and audit events."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => api.download(`/reports/overview/export.csv${filters.academic_year_id ? `?academic_year_id=${filters.academic_year_id}` : ""}`, "reports_overview.csv")}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={refreshAll} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          </>
        }
      />

      <Card className="mb-4 border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <SelectField label="Academic Year" value={filters.academic_year_id} onChange={(v) => setFilter("academic_year_id", v)} items={years.map((y) => ({ id: y.id, label: y.label }))} />
          <SelectField label="Course" value={filters.course_id} onChange={(v) => setFilter("course_id", v)} items={courses.map((c) => ({ id: c.id, label: c.name }))} />
          <SelectField label="Branch" value={filters.branch_id} onChange={(v) => setFilter("branch_id", v)} items={branches.map((b) => ({ id: b.id, label: b.name }))} />
          <SelectField label="Class" value={filters.class_id} onChange={(v) => setFilter("class_id", v)} items={classes.map((c) => ({ id: c.id, label: c.name }))} />
          <SelectField label="Section" value={filters.section_id} onChange={(v) => setFilter("section_id", v)} items={sections.map((s) => ({ id: s.id, label: s.name }))} />
        </div>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Students" value={o?.students.total || 0} icon={Users} accent="primary" />
        <StatCard label="Attendance" value={`${o?.attendance.percentage || 0}%`} icon={CalendarCheck} accent="blue" />
        <StatCard label="Fee Balance" value={fmtMoney(o?.fees.balance)} icon={CreditCard} accent="amber" />
        <StatCard label="Open Events" value={(o?.notifications.failed || 0) + (o?.students.documents_pending || 0) + (o?.attendance.open_sessions || 0)} icon={AlertTriangle} accent="rose" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="printables">Printables</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          {isHod && <TabsTrigger value="hod">HOD</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 xl:grid-cols-3">
            <MetricPanel title="Report Coverage" rows={o?.coverage.map((row) => [row.module, row.details]) || []} />
            <MetricPanel title="Teacher Backbone" rows={[
              ["Teachers", o?.teachers.total],
              ["Class Links", o?.teachers.class_links],
              ["Subject Links", o?.teachers.subject_links],
              ["HOD Links", o?.teachers.hod_links],
              ["Timetable Slots", o?.teachers.timetable_slots],
            ]} />
            <MetricPanel title="Audit Health" rows={[
              ["Activity Logs", o?.audit.activity_logs],
              ["Attendance Audit", o?.audit.attendance_audit_logs],
              ["Notification Logs", o?.audit.notification_logs],
              ["Generated On", o?.generated_on],
              ["Academic Year", o?.academic_year_label || "-"],
            ]} />
          </div>
        </TabsContent>

        <TabsContent value="academics">
          <MetricGrid items={[
            ["Academic Years", o?.academics.academic_years, BookOpen],
            ["Courses", o?.academics.courses, School],
            ["Branches", o?.academics.branches, BarChart3],
            ["Classes", o?.academics.classes, Users],
            ["Sections", o?.academics.sections, ClipboardList],
            ["Subjects", o?.academics.subjects, BookOpenCheck],
          ]} />
        </TabsContent>

        <TabsContent value="students">
          <MetricGrid items={[
            ["Total Students", o?.students.total, Users],
            ["Active", o?.students.active, UserCheck],
            ["Transferred", o?.students.transferred, History],
            ["Graduated", o?.students.graduated, ShieldCheck],
            ["Documents", o?.students.documents, FileCheck2],
            ["Pending Docs", o?.students.documents_pending, AlertTriangle],
            ["Missing Phone", o?.students.guardian_phone_missing, Bell],
            ["Missing Email", o?.students.guardian_email_missing, Bell],
          ]} />
        </TabsContent>

        <TabsContent value="printables">
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Student Search"
              action={<Button size="sm" onClick={searchReportStudents}>Search</Button>}
            >
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by student name, roll number, or email"
                  onKeyDown={(e) => { if (e.key === "Enter") searchReportStudents(); }}
                />
                <Button variant="outline" onClick={searchReportStudents}>Apply Filters</Button>
              </div>
              <SimpleTable
                headers={["Roll", "Student", "Branch", "Class", "Section"]}
                rows={students.map((student) => [
                  <button className="font-medium text-primary" onClick={() => setSelectedStudent(student)}>{student.roll_number}</button>,
                  student.full_name,
                  student.branch,
                  student.class_name,
                  student.section,
                ])}
                empty="Search students using filters above."
              />
            </Panel>

            <Panel title="Printable Student Reports">
              <div className="space-y-3">
                <div className="rounded-md border border-border p-3 text-sm">
                  <div className="font-medium">{selectedStudent ? `${selectedStudent.full_name} (${selectedStudent.roll_number})` : "No student selected"}</div>
                  <div className="text-muted-foreground">{selectedStudent ? `${selectedStudent.branch} - ${selectedStudent.class_name} / ${selectedStudent.section}` : "Select a student from search results."}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => downloadStudentReport("report-card")} disabled={!selectedStudent}>
                    <FileText className="mr-2 h-4 w-4" /> Report Card PDF
                  </Button>
                  <Button variant="outline" onClick={() => downloadStudentReport("attendance-certificate")} disabled={!selectedStudent}>
                    <FileCheck2 className="mr-2 h-4 w-4" /> Attendance Certificate
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel title="Fee Receipt">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="Paste payment ID / receipt ID" />
                <Button onClick={downloadFeeReceipt}><ReceiptText className="mr-2 h-4 w-4" /> Receipt PDF</Button>
              </div>
            </Panel>

            <Panel title="Branch / HOD Downloads">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => downloadBranchReport("csv")}><Download className="mr-2 h-4 w-4" /> Branch CSV</Button>
                <Button onClick={() => downloadBranchReport("pdf")}><FileText className="mr-2 h-4 w-4" /> Branch PDF</Button>
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Sessions" value={o?.attendance.sessions || 0} icon={CalendarCheck} />
            <StatCard label="Records" value={o?.attendance.records || 0} icon={ClipboardList} accent="blue" />
            <StatCard label="Absent Today" value={o?.attendance.absent_today || 0} icon={AlertTriangle} accent="rose" />
            <StatCard label="Average" value={`${o?.attendance.percentage || 0}%`} icon={UserCheck} accent="amber" />
          </div>
          <Panel title="Section Attendance Detail" action={<Button size="sm" onClick={loadAttendance}>Run Section Report</Button>}>
            <SimpleTable headers={["Roll", "Student", "Present", "Absent", "Late", "Excused", "%"]} rows={attendance.map((r) => [r.roll_number, r.full_name, r.present, r.absent, r.late, r.excused, `${r.percentage}%`])} empty="Select a section and run report." />
          </Panel>
        </TabsContent>

        <TabsContent value="fees">
          <MetricGrid items={[
            ["Fee Types", o?.fees.fee_types, CreditCard],
            ["Structures", o?.fees.fee_structures, ClipboardList],
            ["Student Fee Rows", o?.fees.student_fee_rows, Users],
            ["Amount Due", fmtMoney(o?.fees.amount_due), CreditCard],
            ["Amount Paid", fmtMoney(o?.fees.amount_paid), ShieldCheck],
            ["Balance", fmtMoney(o?.fees.balance), AlertTriangle],
            ["Paid Rows", o?.fees.paid_rows, UserCheck],
            ["Partial/Unpaid", (o?.fees.partial_rows || 0) + (o?.fees.unpaid_rows || 0), AlertTriangle],
          ]} />
        </TabsContent>

        <TabsContent value="exams">
          <MetricGrid items={[
            ["Exams", o?.exams.exams, ClipboardList],
            ["Draft", o?.exams.draft, History],
            ["Submitted", o?.exams.submitted, BookOpenCheck],
            ["Locked", o?.exams.locked, ShieldCheck],
            ["Exam Subjects", o?.exams.exam_subjects, BookOpen],
            ["Marks Uploaded", o?.exams.marks_uploaded, Users],
            ["Absent Marks", o?.exams.absent_marks, AlertTriangle],
            ["Locked Marks", o?.exams.locked_marks, ShieldCheck],
          ]} />
        </TabsContent>

        <TabsContent value="library">
          <MetricGrid items={[
            ["Books", o?.library.books, Library],
            ["Copies", o?.library.copies, BookOpen],
            ["Available", o?.library.available_copies, BookOpenCheck],
            ["Issues", o?.library.issues, ClipboardList],
            ["Issued", o?.library.issued, Users],
            ["Returned", o?.library.returned, ShieldCheck],
            ["Overdue", o?.library.overdue, AlertTriangle],
            ["Fines", fmtMoney(o?.library.fines), CreditCard],
          ]} />
        </TabsContent>

        <TabsContent value="communications">
          <MetricGrid items={[
            ["Notification Logs", o?.notifications.total, Bell],
            ["Sent", o?.notifications.sent, ShieldCheck],
            ["Failed", o?.notifications.failed, AlertTriangle],
            ["Skipped", o?.notifications.skipped, History],
          ]} />
        </TabsContent>

        <TabsContent value="events">
          <Panel title="Recent Events">
            <SimpleTable
              headers={["Time", "Module", "Action", "Message"]}
              rows={(o?.recent_events || []).map((row) => [fmtDateTime(row.created_at), row.module, row.action, row.message || "-"])}
              empty="No events found."
            />
          </Panel>
        </TabsContent>

        <TabsContent value="workload">
          <Panel title="Teacher Workload" action={<Button size="sm" onClick={loadWorkload}>Run Workload</Button>}>
            <SimpleTable headers={["Teacher", "Timetable Slots", "Sessions Taken"]} rows={workload.map((r) => [r.teacher_name, r.timetable_slots, r.sessions_taken])} empty="Run workload report to see rows." />
          </Panel>
        </TabsContent>

        {isHod && (
          <TabsContent value="hod">
            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <StatCard label="Branch Students" value={hodAnalytics?.totals.students || 0} icon={Users} />
              <StatCard label="Attendance" value={`${hodAnalytics?.totals.attendance_percentage || 0}%`} icon={UserCheck} accent="blue" />
              <StatCard label="Absent Today" value={hodAnalytics?.totals.absent_today || 0} icon={AlertTriangle} accent="rose" />
              <StatCard label="Marks Uploaded" value={hodAnalytics?.totals.marks_uploaded || 0} icon={BookOpenCheck} accent="amber" />
            </div>
            <Panel title="HOD Branch Analytics" action={<Button size="sm" onClick={loadHodAnalytics}>Run Analytics</Button>}>
              <SimpleTable
                headers={["Branch", "Students", "Classes", "Sections", "Teachers", "Slots", "Attendance", "Absent Today", "Marks"]}
                rows={(hodAnalytics?.branches || []).map((r) => [r.branch_name, r.student_count, r.class_count, r.section_count, r.teachers_count, r.timetable_slots, `${r.attendance_percentage}%`, r.absent_today, r.marks_uploaded])}
                empty="Run analytics to see HOD branch data."
              />
            </Panel>
          </TabsContent>
        )}
      </Tabs>
    </div>
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

function MetricGrid({ items }: { items: [string, ReactNode, any][] }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{items.map(([label, value, icon], index) => <StatCard key={`${label}-${index}`} label={label} value={(value ?? 0) as any} icon={icon} accent={index % 4 === 1 ? "blue" : index % 4 === 2 ? "amber" : index % 4 === 3 ? "rose" : "primary"} />)}</div>;
}

function MetricPanel({ title, rows }: { title: string; rows: [ReactNode, ReactNode][] }) {
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {rows.map(([label, value], index) => (
          <div key={index} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-[60%] text-right font-medium">{value ?? 0}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>{headers.map((h) => <th key={h} className="py-2 pr-4">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => <tr key={idx} className="border-b border-border/70">{row.map((cell, i) => <td key={i} className="py-3 pr-4">{cell}</td>)}</tr>)}
          {rows.length === 0 && <tr><td colSpan={headers.length} className="py-8 text-center text-muted-foreground">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}
