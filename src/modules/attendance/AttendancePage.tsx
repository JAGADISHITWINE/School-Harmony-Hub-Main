import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { api } from "@/services";
import { db } from "@/lib/mock-db";
import { useAuth } from "@/store/auth";
import type { AttendanceRecord, Student } from "@/types";
import { toast } from "sonner";

type S = "present"|"absent"|"late";

export function AttendancePage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("attendance.manage");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [classId, setClassId] = useState(db.classes[0]?.id ?? "");
  const [records, setRecords] = useState<Record<string, S>>({});
  const [loading, setLoading] = useState(false);

  const students = useMemo<Student[]>(() => db.students.filter(s => s.classId === classId && s.status === "active"), [classId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.post<{data: AttendanceRecord[]}>("/attendance/query", { pageSize: 1000 });
      const map: Record<string, S> = {};
      r.data.filter(a => a.date === date && a.classId === classId).forEach(a => { map[a.studentId] = a.status; });
      setRecords(map);
    } finally { setLoading(false); }
  };
  useEffect(() => { load().catch(()=>{}); }, [date, classId]);

  const set = (sid: string, v: S) => setRecords(r => ({ ...r, [sid]: v }));

  const save = async () => {
    await Promise.all(students.map(s =>
      api.post("/attendance", { studentId: s.id, classId, date, status: records[s.id] ?? "present" })
    ));
    toast.success("Attendance saved");
    load();
  };

  const stats = students.reduce((acc, s) => {
    const v = records[s.id] ?? "present"; acc[v]++; return acc;
  }, { present: 0, absent: 0, late: 0 } as Record<S, number>);

  return (
    <div>
      <PageHeader title="Attendance" description="Mark and review student attendance by date and class."
        actions={canManage && <Button onClick={save}>Save attendance</Button>} />

      <Card className="p-4 bg-card border-border mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Date</label><Input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Class</label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{db.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex items-end gap-2 text-sm">
            <div className="px-3 py-1.5 rounded-md bg-primary/10 text-primary">Present {stats.present}</div>
            <div className="px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-400">Late {stats.late}</div>
            <div className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive">Absent {stats.absent}</div>
          </div>
        </div>
      </Card>

      <Card className="p-0 bg-card border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium">Roll</th><th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium text-right">Mark</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
            {!loading && students.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No students in this class</td></tr>}
            {!loading && students.map(s => {
              const cur: S = records[s.id] ?? "present";
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{s.rollNo}</td>
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5"><StatusBadge value={cur} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      {(["present","late","absent"] as S[]).map(v => (
                        <Button key={v} size="sm" variant={cur===v?"default":"outline"} disabled={!canManage} onClick={()=>set(s.id, v)} className="capitalize">{v}</Button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}