import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, GraduationCap, Wallet, CalendarCheck, ArrowUpRight } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { PageHeader } from "@/components/common/PageHeader";
import { api } from "@/services";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Scholaris" }] }),
  component: Dashboard,
});

interface Stats {
  totalStudents: number; activeStudents: number; totalStaff: number;
  feesPaid: number; feesPending: number; presentRate: number;
  enrollment: { day: string; students: number; staff: number }[];
  feeTrend: { month: string; paid: number; pending: number }[];
  recent: { id: string; text: string; time: string }[];
}

function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  // TODO: Re-enable after backend endpoint is finalized.
  // useEffect(() => { api.get<Stats>("/stats/overview").then(setS).catch(()=>{}); }, []);

  return (
    <div>
      <PageHeader title="Overview" description="A quick pulse of campus activity today." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={s?.totalStudents ?? "—"} icon={GraduationCap} trend={`${s?.activeStudents ?? 0} active`} />
        <StatCard label="Total Staff" value={s?.totalStaff ?? "—"} icon={Users} accent="blue" trend="Across all departments" />
        <StatCard label="Fees Collected" value={s ? `$${s.feesPaid.toLocaleString()}` : "—"} icon={Wallet} accent="amber" trend={s ? `$${s.feesPending.toLocaleString()} pending` : ""} />
        <StatCard label="Attendance" value={s ? `${s.presentRate}%` : "—"} icon={CalendarCheck} accent="rose" trend="Past 7 days average" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2 p-5 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium">Enrollment — last 7 days</h3>
              <p className="text-xs text-muted-foreground">New students vs new staff</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s?.enrollment ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.008 270)" />
                <XAxis dataKey="day" stroke="oklch(0.68 0.012 270)" fontSize={12} />
                <YAxis stroke="oklch(0.68 0.012 270)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.215 0.006 270)", border: "1px solid oklch(0.3 0.008 270)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="students" fill="oklch(0.74 0.16 162)" radius={[6,6,0,0]} />
                <Bar dataKey="staff" fill="oklch(0.7 0.15 220)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-medium mb-1">Recent activity</h3>
          <p className="text-xs text-muted-foreground mb-4">Latest events across the school</p>
          <ul className="space-y-3">
            {s?.recent.map(r => (
              <li key={r.id} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-md grid place-items-center bg-primary/10 text-primary shrink-0"><ArrowUpRight className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-sm leading-snug">{r.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5 mt-6 bg-card border-border">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Fee collection trend</h3>
          <p className="text-xs text-muted-foreground">Paid vs pending — last 6 months</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={s?.feeTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.008 270)" />
              <XAxis dataKey="month" stroke="oklch(0.68 0.012 270)" fontSize={12} />
              <YAxis stroke="oklch(0.68 0.012 270)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.215 0.006 270)", border: "1px solid oklch(0.3 0.008 270)", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="paid" stroke="oklch(0.74 0.16 162)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pending" stroke="oklch(0.78 0.16 80)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
