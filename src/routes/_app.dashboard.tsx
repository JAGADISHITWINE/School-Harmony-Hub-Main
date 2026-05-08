import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { PageHeader } from "@/components/common/PageHeader";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { BadgeDollarSign, CalendarCheck, GraduationCap, School2, Users, UserSquare2, Wallet } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Scholaris" }] }),
  component: Dashboard,
});

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

const totalFrom = (payload: any): number =>
  Number(
    payload?.data?.total ??
    payload?.total ??
    (Array.isArray(payload?.data?.items) ? payload.data.items.length : 0)
  );

function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || "admin";

  const [usersCount, setUsersCount] = useState(0);
  const [institutionsCount, setInstitutionsCount] = useState(0);
  const [organizationsCount, setOrganizationsCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [teachersCount, setTeachersCount] = useState(0);
  const [feesTotal, setFeesTotal] = useState(0);
  const [feesPaid, setFeesPaid] = useState(0);
  const [teacherTodayClasses, setTeacherTodayClasses] = useState<any[]>([]);
  const [teacherAttendanceSlots, setTeacherAttendanceSlots] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (role === "super_admin" || role === "admin" || role === "principal") {
          const [orgRes, uRes, sRes, tRes] = await Promise.allSettled([
            api.get<any>("/organizations?page=1&page_size=200"),
            api.get<any>("/users?page=1&page_size=200"),
            api.get<any>("/students?page=1&page_size=200"),
            api.get<any>("/teachers?page=1&page_size=200"),
          ]);
          if (orgRes.status === "fulfilled") {
            const orgs = listFrom<any>(orgRes.value);
            setOrganizationsCount(totalFrom(orgRes.value));
            const institutionCalls = await Promise.allSettled(
              orgs.map((org) => api.get<any>(`/institutions?org_id=${org.id}&page=1&page_size=200`))
            );
            setInstitutionsCount(
              institutionCalls.reduce((acc, res) => (
                res.status === "fulfilled" ? acc + totalFrom(res.value) : acc
              ), 0)
            );
          }
          if (uRes.status === "fulfilled") setUsersCount(totalFrom(uRes.value));
          if (sRes.status === "fulfilled") setStudentsCount(totalFrom(sRes.value));
          if (tRes.status === "fulfilled") setTeachersCount(totalFrom(tRes.value));
        }

        if (role === "accountant" || role === "admin" || role === "super_admin" || role === "principal") {
          const fRes = await api.get<any>("/fees?page=1&page_size=500");
          const fees = listFrom<any>(fRes);
          const total = fees.reduce((sum, row) => sum + Number(row.amount || 0), 0);
          const paid = fees
            .filter((row) => String(row.status || "").toLowerCase() === "paid")
            .reduce((sum, row) => sum + Number(row.amount || 0), 0);
          setFeesTotal(total);
          setFeesPaid(paid);
        }

        if (role === "teacher") {
          const [todayRes, attendanceRes] = await Promise.allSettled([
            api.get<any>("/teachers/self/today-classes"),
            api.get<any>(`/attendance/my-context?target_date=${new Date().toISOString().slice(0, 10)}`),
          ]);
          if (todayRes.status === "fulfilled") setTeacherTodayClasses(listFrom<any>(todayRes.value));
          if (attendanceRes.status === "fulfilled") {
            const rows = listFrom<any>(attendanceRes.value?.data || attendanceRes.value);
            setTeacherAttendanceSlots(rows);
          }
        }
      } catch {
        // keep dashboard resilient for partial API availability
      }
    })();
  }, [role]);

  const teacherPendingAttendance = useMemo(
    () => teacherAttendanceSlots.filter((slot) => String(slot.session_status || "").toLowerCase() !== "closed").length,
    [teacherAttendanceSlots]
  );

  if (role === "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher Dashboard" description="Your classes, timetable load and attendance actions for today." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's Classes" value={teacherTodayClasses.length} icon={School2} trend="From your timetable" />
          <StatCard label="Attendance Slots" value={teacherAttendanceSlots.length} icon={CalendarCheck} accent="blue" trend="Mapped for today" />
          <StatCard label="Pending Attendance" value={teacherPendingAttendance} icon={UserSquare2} accent="amber" trend="Not yet closed" />
          <StatCard label="Students Scope" value={studentsCount || "—"} icon={GraduationCap} accent="rose" trend="Section-wise via classes" />
        </div>
        <Card className="p-5">
          <h3 className="text-sm font-medium">Today’s Teaching Slots</h3>
          <div className="mt-3 space-y-2">
            {teacherTodayClasses.map((slot) => (
              <div key={slot.id} className="rounded-md border p-3">
                <div className="font-medium">{slot.subject_name}</div>
                <div className="text-xs text-muted-foreground">
                  {slot.class_name} / {slot.section_name} • {slot.start_time} - {slot.end_time}
                </div>
              </div>
            ))}
            {teacherTodayClasses.length === 0 && <div className="text-sm text-muted-foreground">No classes for today.</div>}
          </div>
        </Card>
      </div>
    );
  }

  if (role === "accountant") {
    return (
      <div className="space-y-6">
        <PageHeader title="Accounts Dashboard" description="Fee collection view focused on receivables and collected amount." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Fees" value={`₹${feesTotal.toLocaleString()}`} icon={Wallet} />
          <StatCard label="Collected" value={`₹${feesPaid.toLocaleString()}`} icon={BadgeDollarSign} accent="blue" trend="Paid fee records" />
          <StatCard label="Pending" value={`₹${Math.max(feesTotal - feesPaid, 0).toLocaleString()}`} icon={Wallet} accent="amber" trend="Outstanding amount" />
          <StatCard label="Collection Rate" value={feesTotal ? `${Math.round((feesPaid / feesTotal) * 100)}%` : "0%"} icon={CalendarCheck} accent="rose" trend="Paid/total" />
        </div>
      </div>
    );
  }

  if (role === "super_admin") {
    return (
      <div className="space-y-6">
        <PageHeader title="Super Admin Dashboard" description="Cross-institution platform health and core user growth." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Organizations" value={organizationsCount} icon={School2} />
          <StatCard label="Platform Users" value={usersCount} icon={Users} accent="blue" />
          <StatCard label="Students" value={studentsCount} icon={GraduationCap} accent="amber" />
          <StatCard label="Teachers" value={teachersCount} icon={UserSquare2} accent="rose" />
        </div>
        <Card className="p-5">
          <h3 className="text-sm font-medium">Platform Snapshot</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Institutions mapped across organizations: <span className="font-medium text-foreground">{institutionsCount}</span>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Institution-level academics, staff and fee overview." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Users" value={usersCount} icon={Users} />
        <StatCard label="Students" value={studentsCount} icon={GraduationCap} accent="blue" />
        <StatCard label="Teachers" value={teachersCount} icon={UserSquare2} accent="amber" />
        <StatCard label="Fees Collected" value={`₹${feesPaid.toLocaleString()}`} icon={Wallet} accent="rose" trend={`₹${Math.max(feesTotal - feesPaid, 0).toLocaleString()} pending`} />
      </div>
    </div>
  );
}
