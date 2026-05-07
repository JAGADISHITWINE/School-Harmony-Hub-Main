import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services";
import { toast } from "sonner";

type Slot = { id: string; class_name: string; section_name: string; subject_name: string; day_of_week: string; start_time: string; end_time: string; version_no?: number; is_active?: boolean };
type Teacher = { id: string; full_name: string; employee_code: string };
type ReportRow = { student_id: string; roll_number: string; full_name: string; present: number; absent: number; late: number; excused: number; percentage: number };
type HeatRow = { date: string; score: number; total: number };
type WorkRow = { teacher_id: string; teacher_name: string; timetable_slots: number; sessions_taken: number };

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const listFrom = <T,>(payload: any): T[] => ((Array.isArray(payload?.data?.items) && payload.data.items) || (Array.isArray(payload?.data) && payload.data) || []) as T[];

export function TimetableModule() {
  const [tab, setTab] = useState("dashboard");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [heatmap, setHeatmap] = useState<HeatRow[]>([]);
  const [workload, setWorkload] = useState<WorkRow[]>([]);
  const [reportFilters, setReportFilters] = useState({ section_id: "", academic_year_id: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });

  const [form, setForm] = useState({ class_id: "", section_id: "", subject_id: "", academic_year_id: "", day_of_week: "monday", start_time: "09:00", end_time: "10:00", room_no: "", version_no: 1, is_active: true });
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => { (async () => { try { const res = await api.get<any>("/teachers?page=1&page_size=200"); const rows = listFrom<any>(res).map((x) => ({ id: x.id, full_name: x.full_name, employee_code: x.employee_code })); setTeachers(rows); setTeacherId(rows[0]?.id || ""); } catch (e: any) { toast.error(e?.message || "Failed to load teachers"); } })(); }, []);
  useEffect(() => { if (!teacherId) return; (async () => { try { const res = await api.get<any>(`/teachers/${teacherId}/timetable`); setSlots(listFrom<Slot>(res)); } catch (e: any) { toast.error(e?.message || "Failed to load timetable"); } })(); }, [teacherId]);

  const byDay = useMemo(() => { const m: Record<string, Slot[]> = {}; days.forEach((d) => (m[d] = [])); slots.forEach((s) => (m[s.day_of_week] = [...(m[s.day_of_week] || []), s])); return m; }, [slots]);

  const save = async () => {
    if (!teacherId || !form.class_id || !form.section_id || !form.subject_id || !form.academic_year_id) return toast.error("Fill required fields");
    try { await api.post(`/teachers/${teacherId}/timetable`, form); toast.success("Saved"); const res = await api.get<any>(`/teachers/${teacherId}/timetable`); setSlots(listFrom<Slot>(res)); } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  const loadReports = async () => {
    const { section_id, academic_year_id, month, year } = reportFilters;
    if (!section_id || !academic_year_id) return toast.error("Enter section and academic year");
    try {
      const [reportRes, heatRes, workRes] = await Promise.all([
        api.get<any>(`/attendance/report?section_id=${section_id}&academic_year_id=${academic_year_id}`),
        api.get<any>(`/attendance/analytics/heatmap?section_id=${section_id}&academic_year_id=${academic_year_id}&month=${month}&year=${year}`),
        api.get<any>(`/attendance/analytics/teacher-workload?academic_year_id=${academic_year_id}`),
      ]);
      setReport(listFrom<ReportRow>(reportRes));
      setHeatmap(listFrom<HeatRow>(heatRes));
      setWorkload(listFrom<WorkRow>(workRes));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reports");
    }
  };

  const exportCsv = async () => {
    const { section_id, academic_year_id } = reportFilters;
    if (!section_id || !academic_year_id) return;
    const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/attendance/report/export?section_id=${section_id}&academic_year_id=${academic_year_id}`, { credentials: "include" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTimetable = async () => {
    if (!teacherId || !importFile) return toast.error("Select teacher and file");
    const base = ((import.meta as any).env?.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
    const formData = new FormData();
    formData.append("file", importFile);
    const res = await fetch(`${base}/teachers/${teacherId}/timetable/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionStorage.getItem("sms_token") || ""}` },
      body: formData,
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.message || "Import failed");
    toast.success(payload?.message || "Import done");
    const list = await api.get<any>(`/teachers/${teacherId}/timetable`);
    setSlots(listFrom<Slot>(list));
  };

  return <div className="space-y-6"><PageHeader title="Timetable Management" description="Master timetable + attendance flow" /><Card className="p-4 grid gap-3 md:grid-cols-3"><Select value={teacherId} onValueChange={setTeacherId}><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger><SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name} ({t.employee_code})</SelectItem>)}</SelectContent></Select><div className="rounded border p-2 text-sm">Total Slots: <b>{slots.length}</b></div><div className="rounded border p-2 text-sm">Active: <b>{slots.filter((s) => s.is_active !== false).length}</b></div></Card><Tabs value={tab} onValueChange={setTab}><TabsList className="flex flex-wrap gap-1"><TabsTrigger value="dashboard">Timetable Dashboard</TabsTrigger><TabsTrigger value="create">Create Timetable</TabsTrigger><TabsTrigger value="weekly">Weekly Grid</TabsTrigger><TabsTrigger value="teacher">Teacher View</TabsTrigger><TabsTrigger value="student">Student View</TabsTrigger><TabsTrigger value="reports">Attendance Reports</TabsTrigger></TabsList><TabsContent value="dashboard"><Card className="p-4 text-sm">Teacher automatically sees assigned classes from timetable. Attendance page reads today's timetable and loads students by section.</Card></TabsContent><TabsContent value="create"><Card className="p-4 grid gap-3 md:grid-cols-4"><Input placeholder="Academic Year ID" value={form.academic_year_id} onChange={(e) => setForm((p) => ({ ...p, academic_year_id: e.target.value }))} /><Input placeholder="Class ID" value={form.class_id} onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))} /><Input placeholder="Section ID" value={form.section_id} onChange={(e) => setForm((p) => ({ ...p, section_id: e.target.value }))} /><Input placeholder="Subject ID" value={form.subject_id} onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))} /><Select value={form.day_of_week} onValueChange={(v) => setForm((p) => ({ ...p, day_of_week: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><Input type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} /><Input type="time" value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} /><Input placeholder="Room" value={form.room_no} onChange={(e) => setForm((p) => ({ ...p, room_no: e.target.value }))} /><Button onClick={save}>Save Timetable Slot</Button><Input type="file" accept=".csv,.xlsx" onChange={(e) => setImportFile(e.target.files?.[0] || null)} /><Button variant="outline" onClick={importTimetable}>Upload Excel/CSV</Button></Card></TabsContent><TabsContent value="weekly"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{days.map((day) => <Card key={day} className="p-3"><div className="mb-2 font-medium capitalize">{day}</div>{(byDay[day] || []).map((s) => <div key={s.id} className="mb-2 rounded border p-2 text-xs"><div className="font-medium">{s.subject_name}</div><div>{s.class_name} / {s.section_name}</div><div>{s.start_time} - {s.end_time}</div><Badge variant="outline">v{s.version_no || 1}</Badge></div>)}</Card>)}</div></TabsContent><TabsContent value="teacher"><Card className="p-4 text-sm">API: <code>/teachers/self/my-timetable</code> and <code>/teachers/self/today-classes</code>.</Card></TabsContent><TabsContent value="student"><Card className="p-4 text-sm">Student timetable is derived by section + active timetable entries.</Card></TabsContent><TabsContent value="reports"><Card className="p-4 space-y-3"><div className="grid gap-2 md:grid-cols-5"><Input placeholder="Section ID" value={reportFilters.section_id} onChange={(e) => setReportFilters((p) => ({ ...p, section_id: e.target.value }))} /><Input placeholder="Academic Year ID" value={reportFilters.academic_year_id} onChange={(e) => setReportFilters((p) => ({ ...p, academic_year_id: e.target.value }))} /><Input placeholder="Month" value={reportFilters.month} onChange={(e) => setReportFilters((p) => ({ ...p, month: e.target.value }))} /><Input placeholder="Year" value={reportFilters.year} onChange={(e) => setReportFilters((p) => ({ ...p, year: e.target.value }))} /><div className="flex gap-2"><Button onClick={loadReports}>Load</Button><Button variant="outline" onClick={exportCsv}>Export</Button></div></div><div className="rounded border p-3"><div className="font-medium mb-2">Monthly Attendance Report</div><div className="space-y-1 text-sm">{report.map((r) => <div key={r.student_id} className="flex justify-between"><span>{r.roll_number} - {r.full_name}</span><span>{r.percentage}%</span></div>)}</div></div><div className="rounded border p-3"><div className="font-medium mb-2">Heatmap (Date Score)</div><div className="flex flex-wrap gap-2">{heatmap.map((h) => <Badge key={h.date} variant="outline">{h.date}: {h.score}%</Badge>)}</div></div><div className="rounded border p-3"><div className="font-medium mb-2">Teacher Workload</div><div className="space-y-1 text-sm">{workload.map((w) => <div key={w.teacher_id} className="flex justify-between"><span>{w.teacher_name}</span><span>Slots {w.timetable_slots} | Sessions {w.sessions_taken}</span></div>)}</div></div></Card></TabsContent></Tabs></div>;
}
