import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toast } from "sonner";
import { CalendarCheck, Clock3, Save, School, UserRound } from "lucide-react";

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

function listFrom<T>(payload: any): T[] {
  return (
    (Array.isArray(payload?.data?.items) && payload.data.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    (Array.isArray(payload) && payload) ||
    []
  ) as T[];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const statusOptions: AttendanceStatus[] = ["present", "late", "absent", "excused"];

export function AttendancePage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [slots, setSlots] = useState<AttendanceSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedSlot = useMemo(
    () => slots.find((item) => item.timetable_id === selectedSlotId) || null,
    [slots, selectedSlotId]
  );

  const stats = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        const value = (student.status || "present") as AttendanceStatus;
        acc[value] += 1;
        return acc;
      },
      { present: 0, late: 0, absent: 0, excused: 0 } as Record<AttendanceStatus, number>
    );
  }, [students]);

  const loadTeachers = async () => {
    if (isTeacher) return;
    try {
      const res = await api.get<any>("/teachers?page=1&page_size=100");
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
    setLoadingContext(true);
    try {
      const endpoint = isTeacher
        ? `/attendance/my-context?target_date=${targetDate}`
        : `/attendance/teacher-context?teacher_id=${teacherId}&target_date=${targetDate}`;
      const res = await api.get<any>(endpoint);
      const rows = listFrom<AttendanceSlot>(res);
      setSlots(rows);
      setSelectedSlotId((prev) => (prev && rows.some((item) => item.timetable_id === prev) ? prev : rows[0]?.timetable_id || ""));
    } catch (error: any) {
      setSlots([]);
      setSelectedSlotId("");
      if (teacherId || isTeacher) {
        toast.error(error?.message || "Failed to load attendance context");
      }
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
      const sessionQuery = selectedSlot.session_id ? `&session_id=${selectedSlot.session_id}` : "";
      const [studentRes, historyRes] = await Promise.all([
        api.get<any>(
          `/attendance/section-students?section_id=${selectedSlot.section_id}&academic_year_id=${selectedSlot.academic_year_id}${sessionQuery}`
        ),
        api.get<any>(`/attendance/sessions?section_id=${selectedSlot.section_id}&page=1&page_size=20`),
      ]);
      const nextStudents = listFrom<AttendanceStudent>(studentRes).map((item) => ({
        ...item,
        status: (item.status || "present") as AttendanceStatus,
        remarks: item.remarks || "",
      }));
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

  useEffect(() => {
    loadTeachers().catch(() => {});
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher && !teacherId) {
      setSlots([]);
      setSelectedSlotId("");
      return;
    }
    loadContext().catch(() => {});
  }, [targetDate, teacherId, isTeacher]);

  useEffect(() => {
    loadStudents().catch(() => {});
  }, [selectedSlotId]);

  const ensureSession = async () => {
    if (!selectedSlot) throw new Error("Select a timetable slot first");
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
    if (!selectedSlot) {
      toast.error("Select a timetable slot first");
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
      toast.success("Attendance saved");
      await Promise.all([loadContext(), loadStudents()]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const closeSession = async () => {
    if (!selectedSlot?.session_id) return;
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
    setStudents((prev) =>
      prev.map((student) => (student.student_id === studentId ? { ...student, ...patch } : student))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Take attendance from the teacher timetable so each section stays mapped to the right faculty member."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => selectedSlot && ensureSession().then(() => loadStudents())} disabled={!selectedSlot || !!selectedSlot.session_id || saving}>
              <CalendarCheck className="mr-2 h-4 w-4" />
              Open Session
            </Button>
            <Button variant="outline" onClick={closeSession} disabled={!selectedSlot?.session_id || selectedSlot?.session_status === "closed" || saving}>
              Close Session
            </Button>
            <Button onClick={saveAttendance} disabled={!selectedSlot || selectedSlot?.session_status === "closed" || saving}>
              <Save className="mr-2 h-4 w-4" />
              Save Attendance
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Date">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          {!isTeacher && (
            <Field label="Teacher">
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name} · {teacher.employee_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="md:col-span-2 flex flex-wrap items-end gap-2">
            <StatChip label="Present" value={stats.present} tone="present" />
            <StatChip label="Late" value={stats.late} tone="late" />
            <StatChip label="Absent" value={stats.absent} tone="absent" />
            <StatChip label="Excused" value={stats.excused} tone="excused" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1.85fr]">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Teacher Slots</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose the actual timetable period before taking attendance.
          </p>

          <div className="mt-4 space-y-3">
            {loadingContext && <div className="text-sm text-muted-foreground">Loading timetable…</div>}
            {!loadingContext && slots.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No timetable slot found for this date.
              </div>
            )}
            {!loadingContext &&
              slots.map((slot) => {
                const active = slot.timetable_id === selectedSlotId;
                return (
                  <button
                    key={slot.timetable_id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.timetable_id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {slot.start_time} - {slot.end_time}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {slot.subject_name} · {slot.class_name} / {slot.section_name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {slot.branch_name}
                          {slot.room_no ? ` · Room ${slot.room_no}` : ""}
                          {slot.academic_year_label ? ` · ${slot.academic_year_label}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={slot.session_status === "closed" ? "secondary" : slot.session_id ? "default" : "outline"}>
                          {slot.session_id ? `Session ${slot.session_status}` : "Not opened"}
                        </Badge>
                        {!isTeacher && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserRound className="h-3.5 w-3.5" />
                            {teachers.find((item) => item.id === slot.teacher_id)?.full_name || "Teacher"}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Student Register</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Active students from the selected section load automatically from the academic allocation.
            </p>

            {!selectedSlot && (
              <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Select a timetable slot to load students.
              </div>
            )}

            {selectedSlot && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-4 py-3 font-medium">Roll No</th>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStudents && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          Loading students…
                        </td>
                      </tr>
                    )}
                    {!loadingStudents && students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No active students found in this section.
                        </td>
                      </tr>
                    )}
                    {!loadingStudents &&
                      students.map((student) => (
                        <tr key={student.student_id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-mono text-xs">{student.roll_number}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{student.full_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <StatusBadge value={student.status || "present"} />
                              <div className="flex flex-wrap gap-1">
                                {statusOptions.map((value) => (
                                  <Button
                                    key={value}
                                    size="sm"
                                    variant={student.status === value ? "default" : "outline"}
                                    onClick={() => updateStudent(student.student_id, { status: value })}
                                    disabled={selectedSlot.session_status === "closed"}
                                    className="capitalize"
                                  >
                                    {value}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={student.remarks || ""}
                              onChange={(e) => updateStudent(student.student_id, { remarks: e.target.value })}
                              placeholder="Optional remark"
                              disabled={selectedSlot.session_status === "closed"}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold">Section Session History</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Quick reference for previously opened attendance sessions in this section.
            </p>

            <div className="mt-4 space-y-2">
              {history.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <div className="font-medium">{formatDate(item.session_date)}</div>
                    <div className="text-xs text-muted-foreground">{item.id}</div>
                  </div>
                  <Badge variant={item.status === "closed" ? "secondary" : "default"}>
                    {titleCase(item.status)}
                  </Badge>
                </div>
              ))}
              {history.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No attendance history for this section yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "present" | "late" | "absent" | "excused";
}) {
  const toneClass =
    tone === "present"
      ? "bg-primary/10 text-primary"
      : tone === "late"
        ? "bg-amber-500/10 text-amber-500"
        : tone === "absent"
          ? "bg-destructive/10 text-destructive"
          : "bg-sky-500/10 text-sky-600";

  return (
    <div className={`rounded-md px-3 py-2 text-sm font-medium ${toneClass}`}>
      {label} {value}
    </div>
  );
}
