import { useEffect, useMemo, useState } from "react";
import { ArrowRight, GraduationCap, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { StudentModuleNav } from "./StudentModuleNav";

type Option = { id: string; name?: string; label?: string; code?: string };

interface PromotionStudent {
  student_id: string;
  roll_number: string;
  full_name: string;
  email: string;
  current_status: string;
  from_branch_name: string;
  from_class_name: string;
  from_section_name: string;
  from_academic_year_label: string;
  to_branch_name: string;
  to_class_name: string;
  to_section_name: string;
  to_academic_year_label: string;
  can_promote: boolean;
  warning?: string | null;
}

interface PromotionPreview {
  total: number;
  from: { academic_year: string; branch: string; class: string; section: string };
  to: { academic_year: string; branch: string; class: string; section: string };
  students: PromotionStudent[];
}

const actions = [
  { id: "promote", label: "Promote" },
  { id: "detain", label: "Detain" },
  { id: "drop", label: "Drop" },
  { id: "transfer", label: "Transfer out" },
  { id: "graduate", label: "Graduate" },
] as const;

const listFrom = <T,>(payload: any): T[] => {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export function StudentPromotionsPage() {
  const { user } = useAuth();
  const [years, setYears] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [fromBranches, setFromBranches] = useState<Option[]>([]);
  const [fromClasses, setFromClasses] = useState<Option[]>([]);
  const [fromSections, setFromSections] = useState<Option[]>([]);
  const [toBranches, setToBranches] = useState<Option[]>([]);
  const [toClasses, setToClasses] = useState<Option[]>([]);
  const [toSections, setToSections] = useState<Option[]>([]);
  const [form, setForm] = useState({
    from_academic_year_id: "",
    from_course_id: "",
    from_branch_id: "",
    from_class_id: "",
    from_section_id: "",
    to_academic_year_id: "",
    to_course_id: "",
    to_branch_id: "",
    to_class_id: "",
    to_section_id: "",
  });
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
  };

  useEffect(() => {
    if (!user?.institution_id) return;
    let cancelled = false;
    Promise.all([
      api.get<any>(`/academic-years?institution_id=${user.institution_id}&page=1&page_size=500`),
      api.get<any>(`/courses?institution_id=${user.institution_id}&page=1&page_size=500`),
    ])
      .then(([yearsRes, coursesRes]) => {
        if (cancelled) return;
        const nextYears = listFrom<Option>(yearsRes);
        const nextCourses = listFrom<Option>(coursesRes);
        setYears(nextYears);
        setCourses(nextCourses);
        setForm((current) => ({
          ...current,
          from_academic_year_id: current.from_academic_year_id || nextYears[0]?.id || "",
          to_academic_year_id: current.to_academic_year_id || nextYears[0]?.id || "",
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setYears([]);
          setCourses([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.institution_id]);

  useEffect(() => {
    if (!form.from_course_id) {
      setFromBranches([]);
      return;
    }
    api.get<any>(`/branches?course_id=${form.from_course_id}&page=1&page_size=500`)
      .then((res) => setFromBranches(listFrom<Option>(res)))
      .catch(() => setFromBranches([]));
  }, [form.from_course_id]);

  useEffect(() => {
    if (!form.to_course_id) {
      setToBranches([]);
      return;
    }
    api.get<any>(`/branches?course_id=${form.to_course_id}&page=1&page_size=500`)
      .then((res) => setToBranches(listFrom<Option>(res)))
      .catch(() => setToBranches([]));
  }, [form.to_course_id]);

  useEffect(() => {
    if (!form.from_branch_id) {
      setFromClasses([]);
      return;
    }
    api.get<any>(`/classes?branch_id=${form.from_branch_id}&page=1&page_size=500`)
      .then((res) => setFromClasses(listFrom<Option>(res)))
      .catch(() => setFromClasses([]));
  }, [form.from_branch_id]);

  useEffect(() => {
    if (!form.to_branch_id) {
      setToClasses([]);
      return;
    }
    api.get<any>(`/classes?branch_id=${form.to_branch_id}&page=1&page_size=500`)
      .then((res) => setToClasses(listFrom<Option>(res)))
      .catch(() => setToClasses([]));
  }, [form.to_branch_id]);

  useEffect(() => {
    if (!form.from_class_id) {
      setFromSections([]);
      return;
    }
    api.get<any>(`/sections?class_id=${form.from_class_id}&page=1&page_size=500`)
      .then((res) => setFromSections(listFrom<Option>(res)))
      .catch(() => setFromSections([]));
  }, [form.from_class_id]);

  useEffect(() => {
    if (!form.to_class_id) {
      setToSections([]);
      return;
    }
    api.get<any>(`/sections?class_id=${form.to_class_id}&page=1&page_size=500`)
      .then((res) => setToSections(listFrom<Option>(res)))
      .catch(() => setToSections([]));
  }, [form.to_class_id]);

  const canPreview = useMemo(
    () => Boolean(form.from_academic_year_id && form.from_section_id && form.to_academic_year_id && form.to_section_id),
    [form.from_academic_year_id, form.from_section_id, form.to_academic_year_id, form.to_section_id],
  );

  const loadPreview = async () => {
    if (!canPreview) {
      toast.error("Select source and target academic year, class and section");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<any>("/students/promotions/preview", {
        from_academic_year_id: form.from_academic_year_id,
        from_section_id: form.from_section_id,
        to_academic_year_id: form.to_academic_year_id,
        to_section_id: form.to_section_id,
      });
      const nextPreview = res?.data as PromotionPreview;
      setPreview(nextPreview);
      setDecisions(Object.fromEntries((nextPreview?.students || []).map((student) => [student.student_id, student.can_promote ? "promote" : "detain"])));
    } finally {
      setBusy(false);
    }
  };

  const executePromotion = async () => {
    if (!preview || preview.students.length === 0) return;
    setBusy(true);
    try {
      const res = await api.post<any>("/students/promotions/execute", {
        from_academic_year_id: form.from_academic_year_id,
        from_section_id: form.from_section_id,
        to_academic_year_id: form.to_academic_year_id,
        to_section_id: form.to_section_id,
        decisions: preview.students.map((student) => ({
          student_id: student.student_id,
          action: decisions[student.student_id] || "promote",
        })),
      });
      const result = res?.data || {};
      toast.success(`Promotion done: ${result.promoted || 0} promoted, ${result.detained || 0} detained`);
      await loadPreview();
    } finally {
      setBusy(false);
    }
  };

  const OptionSelect = ({
    label,
    value,
    onChange,
    items,
    placeholder,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    items: Option[];
    placeholder: string;
    disabled?: boolean;
  }) => (
    <Field label={label}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label || item.name || item.code || item.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <div>
      <PageHeader
        title="Student Promotions"
        description="Move students from one semester, class or academic year to the next with a preview, detention and exit controls."
      />
      <StudentModuleNav />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Preview Students" value={preview?.total || 0} icon={Users} trend="Active source records only" />
        <StatCard label="Promote Ready" value={preview?.students.filter((student) => decisions[student.student_id] === "promote").length || 0} icon={ArrowRight} accent="blue" trend="Will create next active record" />
        <StatCard label="Held or Exited" value={preview?.students.filter((student) => decisions[student.student_id] !== "promote").length || 0} icon={GraduationCap} accent="amber" trend="Detain, graduate, drop or transfer" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">From</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGrid>
              <OptionSelect label="Academic Year" value={form.from_academic_year_id} onChange={(v) => setField("from_academic_year_id", v)} items={years} placeholder="Source year" />
              <OptionSelect label="Course" value={form.from_course_id} onChange={(v) => setField("from_course_id", v)} items={courses} placeholder="Source course" />
              <OptionSelect label="Branch" value={form.from_branch_id} onChange={(v) => setField("from_branch_id", v)} items={fromBranches} placeholder="Source branch" disabled={!form.from_course_id} />
              <OptionSelect label="Class / Semester" value={form.from_class_id} onChange={(v) => setField("from_class_id", v)} items={fromClasses} placeholder="Source class" disabled={!form.from_branch_id} />
              <OptionSelect label="Section" value={form.from_section_id} onChange={(v) => setField("from_section_id", v)} items={fromSections} placeholder="Source section" disabled={!form.from_class_id} />
            </FieldGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">To</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGrid>
              <OptionSelect label="Academic Year" value={form.to_academic_year_id} onChange={(v) => setField("to_academic_year_id", v)} items={years} placeholder="Target year" />
              <OptionSelect label="Course" value={form.to_course_id} onChange={(v) => setField("to_course_id", v)} items={courses} placeholder="Target course" />
              <OptionSelect label="Branch" value={form.to_branch_id} onChange={(v) => setField("to_branch_id", v)} items={toBranches} placeholder="Target branch" disabled={!form.to_course_id} />
              <OptionSelect label="Class / Semester" value={form.to_class_id} onChange={(v) => setField("to_class_id", v)} items={toClasses} placeholder="Target class" disabled={!form.to_branch_id} />
              <OptionSelect label="Section" value={form.to_section_id} onChange={(v) => setField("to_section_id", v)} items={toSections} placeholder="Target section" disabled={!form.to_class_id} />
            </FieldGrid>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={loadPreview} disabled={busy || !canPreview}>
          <Search className="mr-2 h-4 w-4" />
          Preview Students
        </Button>
        <Button variant="outline" onClick={executePromotion} disabled={busy || !preview || preview.students.length === 0}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Execute Promotion
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Promotion Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {!preview && <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Select source and target, then preview students.</div>}
          {preview && preview.students.length === 0 && <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No active students found in this source section.</div>}
          {preview && preview.students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-4">Student</th>
                    <th className="py-3 pr-4">Current</th>
                    <th className="py-3 pr-4">Target</th>
                    <th className="py-3 pr-4">Action</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.students.map((student) => (
                    <tr key={student.student_id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-xs text-muted-foreground">{student.roll_number} - {student.email}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{student.from_class_name} - {student.from_section_name}</div>
                        <div className="text-xs text-muted-foreground">{student.from_branch_name} - {student.from_academic_year_label}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{student.to_class_name} - {student.to_section_name}</div>
                        <div className="text-xs text-muted-foreground">{student.to_branch_name} - {student.to_academic_year_label}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Select value={decisions[student.student_id] || "promote"} onValueChange={(value) => setDecisions((current) => ({ ...current, [student.student_id]: value }))}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {actions.map((action) => (
                              <SelectItem key={action.id} value={action.id}>
                                {action.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{student.current_status}</span>
                        {student.warning && <div className="mt-1 text-xs text-amber-600">{student.warning}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
