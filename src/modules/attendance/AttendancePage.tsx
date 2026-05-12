import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  Clock3,
  Save,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface TeacherOption {
  id: string;
  full_name: string;
  employee_code: string;
}

interface AttendanceSlot {
  timetable_id: string;
  teacher_id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  academic_year_id: string;
  academic_year_label?: string | null;
  branch_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_no?: string | null;
  session_id?: string | null;
  session_status?: string | null;
  session_date?: string | null;
}

interface AttendanceStudent {
  student_id: string;
  roll_number: string;
  full_name: string;
  photo_url?: string | null;
  status?: AttendanceStatus | null;
  remarks?: string | null;
}

interface SessionHistoryItem {
  id: string;
  session_date: string;
  status: string;
  teacher_id: string;
  subject_id: string;
}

interface CalendarDay {
  date: string;
  status: "present" | "absent" | "leave" | "holiday";
  percentage: number;
  total: number;
}

interface StudentDetail {
  student: {
    id: string;
    roll_number: string;
    full_name: string;
    email?: string;
    photo_url?: string | null;
  };
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    percentage: number;
    low_attendance: boolean;
  };
  subjects: Array<{ subject_name: string; percentage: number; present: number; absent: number; late: number; leave: number; total: number }>;
  monthly: Array<{ year: number; month: number; percentage: number; total: number }>;
  history: Array<{ session_date: string; status: AttendanceStatus; subject_name: string; remarks?: string | null }>;
}

const STORAGE_KEY = "attendance_last_scope";
const statusOptions: Array<{ value: AttendanceStatus; label: string; className: string }> = [
  { value: "present", label: "Present", className: "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600" },
  { value: "absent", label: "Absent", className: "border-red-500 bg-red-500 text-white hover:bg-red-600" },
  { value: "excused", label: "Leave", className: "border-amber-500 bg-amber-500 text-white hover:bg-amber-600" },
  { value: "late", label: "Late", className: "border-sky-500 bg-sky-500 text-white hover:bg-sky-600" },
];

function listFrom<T>(payload: any): T[] {
  return (
    (Array.isArray(payload?.data?.items) && payload.data.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    (Array.isArray(payload) && payload) ||
    []
  ) as T[];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST";
}

function readStorage(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function AttendancePage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [targetDate, setTargetDate] = useState(() => readStorage(`${STORAGE_KEY}:date`) || today());
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teacherId, setTeacherId] = useState(() => readStorage(`${STORAGE_KEY}:teacher`));
  const [slots, setSlots] = useState<AttendanceSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState(() => readStorage(`${STORAGE_KEY}:slot`));
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedSlot = useMemo(
    () => slots.find((item) => item.timetable_id === selectedSlotId) || null,
    [slots, selectedSlotId]
  );

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (branchFilter !== "all" && slot.branch_name !== branchFilter) return false;
      if (classFilter !== "all" && slot.class_id !== classFilter) return false;
      if (sectionFilter !== "all" && slot.section_id !== sectionFilter) return false;
      if (subjectFilter !== "all" && slot.subject_id !== subjectFilter) return false;
      return true;
    });
  }, [slots, branchFilter, classFilter, sectionFilter, subjectFilter]);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (student) =>
        student.full_name.toLowerCase().includes(term) ||
        student.roll_number.toLowerCase().includes(term)
    );
  }, [students, search]);

  const stats = useMemo(() => {
    const base = students.reduce(
      (acc, student) => {
        const value = (student.status || "present") as AttendanceStatus;
        acc[value] += 1;
        return acc;
      },
      { present: 0, late: 0, absent: 0, excused: 0 } as Record<AttendanceStatus, number>
    );
    const total = students.length;
    const attended = base.present + base.late;
    return {
      total,
      present: base.present,
      absent: base.absent,
      leave: base.excused,
      late: base.late,
      percentage: total ? Math.round((attended * 10000) / total) / 100 : 0,
    };
  }, [students]);

  const isClosed = selectedSlot?.session_status === "closed" || selectedSlot?.session_status === "locked";
  const isFuture = targetDate > today();

  const unique = (mapper: (slot: AttendanceSlot) => { id: string; label: string }) => {
    const seen = new Map<string, string>();
    slots.forEach((slot) => {
      const item = mapper(slot);
      if (item.id) seen.set(item.id, item.label);
    });
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  };

  const branchOptions = useMemo(() => unique((slot) => ({ id: slot.branch_name, label: slot.branch_name })), [slots]);
  const classOptions = useMemo(() => unique((slot) => ({ id: slot.class_id, label: slot.class_name })), [slots]);
  const sectionOptions = useMemo(() => unique((slot) => ({ id: slot.section_id, label: slot.section_name })), [slots]);
  const subjectOptions = useMemo(() => unique((slot) => ({ id: slot.subject_id, label: slot.subject_name })), [slots]);

  const loadTeachers = async () => {
    if (isTeacher) return;
    try {
      const res = await api.get<any>("/teachers?page=1&page_size=500");
      const rows = listFrom<any>(res).map((item) => ({
        id: item.id,
        full_name: item.full_name,
        employee_code: item.employee_code,
      })) as TeacherOption[];
      setTeachers(rows);
      setTeacherId((prev) => prev || rows[0]?.id || "");
    } catch (error: any) {
      toast.error(error?.message || "Failed to load teachers");
      setTeachers([]);
    }
  };

  const loadContext = async () => {
    if (isFuture) {
      setSlots([]);
      setSelectedSlotId("");
      toast.error("Future-date attendance is not allowed");
      return;
    }
    setLoadingContext(true);
    try {
      const endpoint = isTeacher
        ? `/attendance/my-context?target_date=${targetDate}`
        : `/attendance/teacher-context?teacher_id=${teacherId}&target_date=${targetDate}`;
      const res = await api.get<any>(endpoint);
      const rows = listFrom<AttendanceSlot>(res);
      setSlots(rows);
      setSelectedSlotId((prev) => {
        const remembered = readStorage(`${STORAGE_KEY}:slot`) || prev;
        return rows.some((item) => item.timetable_id === remembered) ? remembered : rows[0]?.timetable_id || "";
      });
    } catch (error: any) {
      setSlots([]);
      setSelectedSlotId("");
      if (teacherId || isTeacher) toast.error(error?.message || "Failed to load attendance context");
    } finally {
      setLoadingContext(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedSlot) {
      setStudents([]);
      setHistory([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const draftKey = draftStorageKey(selectedSlot.timetable_id, targetDate);
      const draft = readStorage(draftKey);
      const sessionQuery = selectedSlot.session_id ? `&session_id=${selectedSlot.session_id}` : "";
      const [studentRes, historyRes] = await Promise.all([
        api.get<any>(
          `/attendance/section-students?section_id=${selectedSlot.section_id}&academic_year_id=${selectedSlot.academic_year_id}${sessionQuery}`
        ),
        api.get<any>(`/attendance/sessions?section_id=${selectedSlot.section_id}&page=1&page_size=20`),
      ]);
      let nextStudents = listFrom<AttendanceStudent>(studentRes).map((item) => ({
        ...item,
        status: (item.status || "present") as AttendanceStatus,
        remarks: item.remarks || "",
      }));
      if (draft && !selectedSlot.session_id) {
        try {
          const draftRows = JSON.parse(draft) as AttendanceStudent[];
          nextStudents = nextStudents.map((student) => draftRows.find((row) => row.student_id === student.student_id) || student);
          setDirty(true);
        } catch {
          removeStorage(draftKey);
        }
      } else {
        setDirty(false);
      }
      setStudents(nextStudents);
      setHistory(listFrom<SessionHistoryItem>(historyRes));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load students");
      setStudents([]);
      setHistory([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadCalendar = async () => {
    if (!selectedSlot) {
      setCalendarDays([]);
      return;
    }
    const dateObj = new Date(`${targetDate}T00:00:00`);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    try {
      const res = await api.get<any>(
        `/attendance/analytics/monthly?section_id=${selectedSlot.section_id}&academic_year_id=${selectedSlot.academic_year_id}&subject_id=${selectedSlot.subject_id}&month=${month}&year=${year}`
      );
      setCalendarDays(res?.data?.days || []);
    } catch {
      setCalendarDays([]);
    }
  };

  useEffect(() => {
    loadTeachers().catch(() => {});
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher && !teacherId) return;
    writeStorage(`${STORAGE_KEY}:date`, targetDate);
    if (teacherId) writeStorage(`${STORAGE_KEY}:teacher`, teacherId);
    loadContext().catch(() => {});
  }, [targetDate, teacherId, isTeacher]);

  useEffect(() => {
    if (selectedSlotId) writeStorage(`${STORAGE_KEY}:slot`, selectedSlotId);
    loadStudents().catch(() => {});
  }, [selectedSlotId]);

  useEffect(() => {
    loadCalendar().catch(() => {});
  }, [selectedSlotId, targetDate]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!selectedSlot || !dirty || selectedSlot.session_id) return;
    writeStorage(draftStorageKey(selectedSlot.timetable_id, targetDate), JSON.stringify(students));
  }, [students, dirty, selectedSlot?.timetable_id, targetDate]);

  const ensureSession = async () => {
    if (!selectedSlot) throw new Error("Select a period first");
    if (isFuture) throw new Error("Future-date attendance is not allowed");
    if (selectedSlot.session_id) return selectedSlot.session_id;
    const payload: Record<string, any> = {
      timetable_id: selectedSlot.timetable_id,
      session_date: targetDate,
    };
    if (!isTeacher) payload.teacher_id = selectedSlot.teacher_id;
    const res = await api.post<any>("/attendance/sessions", payload);
    const sessionId = res?.data?.id;
    await loadContext();
    return sessionId as string;
  };

  const saveAttendance = async () => {
    if (saving) return;
    if (!selectedSlot) {
      toast.error("Select a period first");
      return;
    }
    if (isClosed) {
      toast.error("This attendance session is closed");
      return;
    }
    setSaving(true);
    try {
      const sessionId = await ensureSession();
      await api.post("/attendance/mark", {
        session_id: sessionId,
        records: students.map((student) => ({
          student_id: student.student_id,
          status: student.status || "present",
          remarks: student.remarks || null,
        })),
      });
      removeStorage(draftStorageKey(selectedSlot.timetable_id, targetDate));
      setDirty(false);
      toast.success("Attendance saved");
      await Promise.all([loadContext(), loadStudents(), loadCalendar()]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const closeSession = async () => {
    if (!selectedSlot?.session_id || saving) return;
    setSaving(true);
    try {
      await api.patch(`/attendance/sessions/${selectedSlot.session_id}/close`);
      toast.success("Attendance session closed");
      await Promise.all([loadContext(), loadStudents()]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to close session");
    } finally {
      setSaving(false);
    }
  };

  const updateStudent = (studentId: string, patch: Partial<AttendanceStudent>) => {
    if (isClosed) return;
    setStudents((prev) => prev.map((student) => (student.student_id === studentId ? { ...student, ...patch } : student)));
    setDirty(true);
  };

  const bulkMark = (status: AttendanceStatus, onlyVisible = false) => {
    if (isClosed) return;
    const targets = new Set((onlyVisible ? visibleStudents : students).map((student) => student.student_id));
    setStudents((prev) => prev.map((student) => (targets.has(student.student_id) ? { ...student, status } : student)));
    setDirty(true);
  };

  const loadStudentDetail = async (studentId: string) => {
    if (!selectedSlot) return;
    setSelectedStudentId(studentId);
    setStudentDetail(null);
    try {
      const res = await api.get<any>(`/attendance/reports/student/${studentId}?academic_year_id=${selectedSlot.academic_year_id}`);
      setStudentDetail(res?.data || null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load student attendance");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        description="Mark subject-wise attendance quickly from assigned timetable periods, with live summaries and monthly analytics."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => bulkMark("present")} disabled={!selectedSlot || isClosed || students.length === 0}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Present
            </Button>
            <Button variant="outline" onClick={closeSession} disabled={!selectedSlot?.session_id || isClosed || saving}>
              Close Session
            </Button>
            <Button onClick={saveAttendance} disabled={!selectedSlot || isClosed || saving || students.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : dirty ? "Save Changes" : "Save Attendance"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total Students" value={stats.total} icon={<UsersRound className="h-4 w-4" />} />
        <SummaryCard label="Present" value={stats.present} tone="present" />
        <SummaryCard label="Absent" value={stats.absent} tone="absent" />
        <SummaryCard label="Leave" value={stats.leave} tone="leave" />
        <SummaryCard label="Late" value={stats.late} tone="late" />
        <SummaryCard label="Attendance" value={`${stats.percentage}%`} tone={stats.percentage < 75 ? "absent" : "present"} />
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <Field label="Date">
            <Input type="date" max={today()} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          </Field>
          {!isTeacher && (
            <Field label="Teacher">
              <SearchableSelect
                value={teacherId}
                onValueChange={setTeacherId}
                options={teachers.map((teacher) => ({
                  value: teacher.id,
                  label: `${teacher.full_name} - ${teacher.employee_code}`,
                  search: `${teacher.full_name} ${teacher.employee_code}`,
                }))}
                placeholder="Teacher"
                searchPlaceholder="Search teacher..."
              />
            </Field>
          )}
          <Field label="Branch"><FilterSelect value={branchFilter} options={branchOptions} onChange={setBranchFilter} /></Field>
          <Field label="Class"><FilterSelect value={classFilter} options={classOptions} onChange={setClassFilter} /></Field>
          <Field label="Section"><FilterSelect value={sectionFilter} options={sectionOptions} onChange={setSectionFilter} /></Field>
          <Field label="Subject"><FilterSelect value={subjectFilter} options={subjectOptions} onChange={setSubjectFilter} /></Field>
          <Field label="Search">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or roll no" />
            </div>
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Subject Periods</h2>
              </div>
              {dirty && <Badge variant="outline" className="border-amber-500 text-amber-600">Draft saved</Badge>}
            </div>
            <div className="mt-4 space-y-2">
              {loadingContext && <SkeletonRows />}
              {!loadingContext && filteredSlots.length === 0 && (
                <EmptyState text="No assigned period found for the selected date or filters." />
              )}
              {!loadingContext && filteredSlots.map((slot) => {
                const active = slot.timetable_id === selectedSlotId;
                return (
                  <button
                    key={slot.timetable_id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.timetable_id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{slot.start_time} - {slot.end_time}</div>
                        <div className="mt-1 truncate text-sm text-muted-foreground">{slot.subject_name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {slot.class_name} / {slot.section_name} · {slot.branch_name}
                        </div>
                      </div>
                      <Badge variant={slot.session_status === "closed" ? "secondary" : slot.session_id ? "default" : "outline"}>
                        {slot.session_id ? titleCase(slot.session_status || "open") : "New"}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <CalendarPanel days={calendarDays} dateValue={targetDate} percentage={stats.percentage} />

          <Card className="p-4">
            <h2 className="text-sm font-semibold">Session History</h2>
            <div className="mt-3 space-y-2">
              {history.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <span>{new Date(item.session_date).toLocaleDateString()}</span>
                  <Badge variant={item.status === "closed" ? "secondary" : "default"}>{titleCase(item.status)}</Badge>
                </div>
              ))}
              {history.length === 0 && <EmptyState text="No previous sessions for this section." />}
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="sticky top-0 z-10 border-b border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Attendance Register</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedSlot ? `${selectedSlot.class_name} / ${selectedSlot.section_name} · ${selectedSlot.subject_name} · ${selectedSlot.start_time}-${selectedSlot.end_time}` : "Select a subject period to begin."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => bulkMark("present", true)} disabled={!visibleStudents.length || isClosed}>Visible Present</Button>
                <Button size="sm" variant="outline" onClick={() => bulkMark("absent", true)} disabled={!visibleStudents.length || isClosed}>Visible Absent</Button>
              </div>
            </div>
          </div>

          {!selectedSlot && <div className="p-6"><EmptyState text="Select a period to load students." /></div>}
          {selectedSlot && (
            <div className="max-h-[720px] overflow-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Roll No</th>
                    <th className="px-4 py-3 font-medium">Attendance</th>
                    <th className="px-4 py-3 font-medium">Remarks</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents && (
                    <tr><td colSpan={5} className="px-4 py-8"><SkeletonRows /></td></tr>
                  )}
                  {!loadingStudents && visibleStudents.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8"><EmptyState text="No students match this search." /></td></tr>
                  )}
                  {!loadingStudents && visibleStudents.map((student) => (
                    <tr key={student.student_id} className="border-b border-border last:border-0 hover:bg-muted/25">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar student={student} />
                          <div>
                            <div className="font-medium">{student.full_name}</div>
                            {student.status === "absent" && <div className="text-xs text-red-500">Absent alert candidate</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{student.roll_number}</td>
                      <td className="px-4 py-3">
                        <div className="grid grid-cols-4 gap-1">
                          {statusOptions.map((status) => {
                            const active = (student.status || "present") === status.value;
                            return (
                              <button
                                key={status.value}
                                type="button"
                                disabled={isClosed}
                                onClick={() => updateStudent(student.student_id, { status: status.value })}
                                className={`h-10 rounded-md border px-2 text-xs font-medium transition disabled:opacity-50 ${active ? status.className : "border-border bg-background hover:bg-muted"}`}
                              >
                                {status.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={student.remarks || ""}
                          onChange={(event) => updateStudent(student.student_id, { remarks: event.target.value })}
                          disabled={isClosed}
                          placeholder="Optional note"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => loadStudentDetail(student.student_id)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {selectedStudentId && (
        <StudentDetailPanel
          detail={studentDetail}
          onClose={() => {
            setSelectedStudentId("");
            setStudentDetail(null);
          }}
        />
      )}
    </div>
  );
}

function draftStorageKey(slotId: string, dateValue: string) {
  return `attendance_draft:${slotId}:${dateValue}`;
}

function SummaryCard({ label, value, tone, icon }: { label: string; value: ReactNode; tone?: "present" | "absent" | "leave" | "late"; icon?: ReactNode }) {
  const toneClass =
    tone === "present"
      ? "text-emerald-600 bg-emerald-500/10"
      : tone === "absent"
        ? "text-red-600 bg-red-500/10"
        : tone === "leave"
          ? "text-amber-600 bg-amber-500/10"
          : tone === "late"
            ? "text-sky-600 bg-sky-500/10"
            : "text-primary bg-primary/10";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneClass}`}>{icon || <UsersRound className="h-4 w-4" />}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function FilterSelect({ value, options, onChange }: { value: string; options: Array<{ id: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={[
        { value: "all", label: "All" },
        ...options.map((item) => ({ value: item.id, label: item.label })),
      ]}
      placeholder="All"
      searchPlaceholder="Search options..."
    />
  );
}

function Avatar({ student }: { student: AttendanceStudent }) {
  if (student.photo_url) {
    return <img src={student.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initials(student.full_name)}
    </div>
  );
}

function CalendarPanel({ days, dateValue, percentage }: { days: CalendarDay[]; dateValue: string; percentage: number }) {
  const dateObj = new Date(`${dateValue}T00:00:00`);
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = new Map(days.map((day) => [day.date.slice(0, 10), day]));
  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { day, item: byDate.get(iso) };
  });
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Monthly Calendar</h2>
        </div>
        <Badge variant={percentage < 75 ? "destructive" : "default"}>{percentage}%</Badge>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <div key={`${day}-${index}`} className="py-1 text-muted-foreground">{day}</div>)}
        {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, index) => <div key={`blank-${index}`} />)}
        {cells.map(({ day, item }) => (
          <div
            key={day}
            title={item ? `${item.percentage}%` : "No session"}
            className={`grid h-8 place-items-center rounded-md border text-xs ${
              item?.status === "present"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700"
                : item?.status === "absent"
                  ? "border-red-500/40 bg-red-500/15 text-red-700"
                  : item?.status === "leave"
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-700"
                    : item?.status === "holiday"
                      ? "border-sky-500/40 bg-sky-500/15 text-sky-700"
                      : "border-border bg-muted/20 text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Legend color="bg-emerald-500" label="Present" />
        <Legend color="bg-red-500" label="Absent" />
        <Legend color="bg-amber-500" label="Leave" />
        <Legend color="bg-sky-500" label="Holiday" />
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}

function StudentDetailPanel({ detail, onClose }: { detail: StudentDetail | null; onClose: () => void }) {
  return (
    <Card className="fixed bottom-4 right-4 z-40 max-h-[85vh] w-[min(560px,calc(100vw-2rem))] overflow-auto border-primary/30 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Student Attendance Details</h2>
          <p className="text-sm text-muted-foreground">{detail ? `${detail.student.full_name} · ${detail.student.roll_number}` : "Loading student attendance..."}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      {!detail && <div className="mt-4"><SkeletonRows /></div>}
      {detail && (
        <div className="mt-4 space-y-4">
          {detail.summary.low_attendance && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Low attendance alert: below 75%.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniMetric label="Overall" value={`${detail.summary.percentage}%`} />
            <MiniMetric label="Present" value={detail.summary.present} />
            <MiniMetric label="Absent" value={detail.summary.absent} />
            <MiniMetric label="Leave" value={detail.summary.leave} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Subject-wise Attendance</h3>
            <div className="mt-2 space-y-2">
              {detail.subjects.map((subject) => (
                <div key={subject.subject_name} className="rounded-md border border-border p-3">
                  <div className="flex justify-between text-sm">
                    <span>{subject.subject_name}</span>
                    <span className={subject.percentage < 75 ? "text-red-600" : "text-emerald-600"}>{subject.percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(subject.percentage, 100)}%` }} />
                  </div>
                </div>
              ))}
              {detail.subjects.length === 0 && <EmptyState text="No subject-wise data yet." />}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Attendance Trend</h3>
            <div className="mt-2 flex h-28 items-end gap-2 rounded-md border border-border p-3">
              {detail.monthly.map((month) => (
                <div key={`${month.year}-${month.month}`} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(month.percentage, 4)}%` }} />
                  <span className="text-[10px] text-muted-foreground">{month.month}</span>
                </div>
              ))}
              {detail.monthly.length === 0 && <div className="self-center text-sm text-muted-foreground">No trend data yet.</div>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Date-wise History</h3>
            <div className="mt-2 max-h-48 space-y-2 overflow-auto">
              {detail.history.slice(0, 20).map((item) => (
                <div key={`${item.session_date}-${item.subject_name}`} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span>{new Date(item.session_date).toLocaleDateString()} · {item.subject_name}</span>
                  <Badge variant={item.status === "absent" ? "destructive" : item.status === "excused" ? "secondary" : "default"}>
                    {item.status === "excused" ? "Leave" : titleCase(item.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{text}</div>;
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-md bg-muted" />)}
    </div>
  );
}

