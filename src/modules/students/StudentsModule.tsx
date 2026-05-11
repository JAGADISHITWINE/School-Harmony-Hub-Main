import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCrudModule } from "@/modules/createCrudModule";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { zResolver } from "@/modules/zodResolver";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

interface BackendStudent {
  id: string;
  user_id: string;
  institution_id?: string | null;
  roll_number: string;
  date_of_birth?: string | null;
  gender?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  role_slug?: string | null;
  current_course_id?: string | null;
  current_branch_id?: string | null;
  current_branch_name?: string | null;
  current_class_id?: string | null;
  current_class_name?: string | null;
  current_section_id?: string | null;
  current_section_name?: string | null;
  current_academic_year_id?: string | null;
  current_academic_year_label?: string | null;
  current_status?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface StudentFullProfile {
  profile?: BackendStudent & { phone?: string | null };
  academic_records?: any[];
  attendance?: any;
  performance?: any;
  fees?: any;
  exams?: any;
  timetable?: Record<string, any[]>;
  behavior?: any;
  notifications?: any[];
  documents?: any[];
}

interface InstitutionOption {
  id: string;
  name: string;
}

interface AcademicYearOption {
  id: string;
  label: string;
}

interface CourseOption {
  id: string;
  name: string;
}

interface BranchOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
}

const schema = z.object({
  institution_id: z.string().min(1, "Institution required"),
  academic_year_id: z.string().min(1, "Academic year required"),
  course_id: z.string().min(1, "Course required"),
  branch_id: z.string().min(1, "Branch required"),
  class_id: z.string().min(1, "Class required"),
  section_id: z.string().min(1, "Section required"),
  full_name: z.string().trim().min(2, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(120),
  username: z.string().trim().max(60).optional().or(z.literal("")),
  password: z.string().min(8, "Min 8 characters").optional().or(z.literal("")),
  roll_number: z.string().trim().min(1, "Required").max(30),
  phone: z.string().trim().regex(/^$|^[0-9+\-\s()]{10,20}$/, "Invalid phone number").optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  guardian_name: z.string().trim().max(120).optional().or(z.literal("")),
  guardian_phone: z.string().trim().regex(/^$|^[0-9+\-\s()]{10,20}$/, "Invalid phone number").optional().or(z.literal("")),
  guardian_email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});

type V = z.infer<typeof schema>;

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const makeUsername = (name: string) => {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return base || "student";
};

const getPayload = <T,>(res: any): T => (res?.data?.data ?? res?.data ?? res) as T;

function DetailItem({ label, value }: { label: string; value?: unknown }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value ? String(value) : "-"}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function EmptyLine() {
  return <p className="text-sm text-muted-foreground">No records found.</p>;
}

function StudentFullDetails({ studentId, fallback }: { studentId: string; fallback: BackendStudent }) {
  const [profile, setProfile] = useState<StudentFullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<any>(`/students/${studentId}/full-profile`)
      .then((res) => {
        if (!cancelled) setProfile(getPayload<StudentFullProfile>(res));
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const data = profile || { profile: fallback };
  const p = data.profile || fallback;
  const academicRecords = data.academic_records || [];
  const subjects = data.performance?.subjects || [];
  const feeBreakdown = data.fees?.breakdown || [];
  const feeHistory = data.fees?.history || [];
  const upcomingExams = data.exams?.upcoming || [];
  const examResults = data.exams?.results || [];
  const documents = data.documents || [];
  const notifications = data.notifications || [];
  const remarks = data.behavior?.remarks || [];
  const timetableDays = Object.entries(data.timetable || {}).filter(([, slots]) => slots.length > 0);

  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      {loading && <p className="text-sm text-muted-foreground">Loading complete student profile...</p>}

      <DetailSection title="Profile">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem label="Name" value={p.full_name} />
          <DetailItem label="Email" value={p.email} />
          <DetailItem label="Phone" value={(p as any).phone} />
          <DetailItem label="Roll Number" value={p.roll_number} />
          <DetailItem label="Gender" value={p.gender} />
          <DetailItem label="Date of Birth" value={formatDate(p.date_of_birth)} />
          <DetailItem label="Guardian" value={p.guardian_name} />
          <DetailItem label="Guardian Phone" value={p.guardian_phone} />
          <DetailItem label="Guardian Email" value={p.guardian_email} />
          <DetailItem label="Branch" value={p.current_branch_name} />
          <DetailItem label="Class" value={p.current_class_name} />
          <DetailItem label="Section" value={p.current_section_name} />
          <DetailItem label="Academic Year" value={p.current_academic_year_label} />
          <DetailItem label="Academic Status" value={p.current_status} />
          <DetailItem label="Created" value={formatDate(p.created_at)} />
          <DetailItem label="Updated" value={formatDate(p.updated_at)} />
        </dl>
      </DetailSection>

      <DetailSection title="Academic Records">
        {academicRecords.length ? (
          <div className="space-y-2">
            {academicRecords.map((record) => (
              <div key={record.id} className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium">
                  {[record.branch_name, record.class_name, record.section_name].filter(Boolean).join(" / ") || "-"}
                </div>
                <div className="text-muted-foreground">
                  {record.academic_year_label || "-"} | {record.status || "-"} | {formatDate(record.enrolled_at)}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyLine />}
      </DetailSection>

      <DetailSection title="Attendance And Performance">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DetailItem label="Attendance" value={`${data.attendance?.overall ?? 0}%`} />
          <DetailItem label="CGPA" value={data.performance?.cgpa ?? 0} />
          <DetailItem label="SGPA" value={data.performance?.sgpa ?? 0} />
        </div>
        {subjects.length ? (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {subjects.map((item: any, index: number) => (
              <div key={`${item.subject}-${index}`} className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium">{item.subject}</div>
                <div className="text-muted-foreground">{item.exam || "Exam"} | {item.marks ?? "-"}% | Grade {item.grade || "-"}</div>
              </div>
            ))}
          </div>
        ) : null}
      </DetailSection>

      <DetailSection title="Fees">
        <div className="mb-3">
          <DetailItem label="Total Due" value={data.fees?.totalDue ?? 0} />
        </div>
        {feeBreakdown.length || feeHistory.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {feeBreakdown.map((item: any, index: number) => (
              <div key={`${item.item}-${index}`} className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium">{item.item}</div>
                <div className="text-muted-foreground">Amount {item.amount ?? 0} | Paid {item.paid ?? 0}</div>
              </div>
            ))}
            {feeHistory.map((item: any) => (
              <div key={item.id} className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium">{item.id}</div>
                <div className="text-muted-foreground">{item.date || "-"} | {item.amount ?? 0} | {item.mode || "-"}</div>
              </div>
            ))}
          </div>
        ) : <EmptyLine />}
      </DetailSection>

      <DetailSection title="Exams">
        {upcomingExams.length || examResults.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcomingExams.map((item: any) => (
              <div key={item.id} className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium">{item.name}</div>
                <div className="text-muted-foreground">{item.date || "-"} | {item.time || "-"} | {item.venue || "-"}</div>
              </div>
            ))}
            {examResults.map((item: any, index: number) => (
              <div key={`${item.subject}-${index}`} className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium">{item.subject}</div>
                <div className="text-muted-foreground">{item.obtained ?? "-"} / {item.max ?? "-"} | Grade {item.grade || "-"}</div>
              </div>
            ))}
          </div>
        ) : <EmptyLine />}
      </DetailSection>

      <DetailSection title="Timetable">
        {timetableDays.length ? (
          <div className="space-y-3">
            {timetableDays.map(([day, slots]) => (
              <div key={day}>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{day}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {slots.map((slot: any) => (
                    <div key={slot.id} className="rounded-md bg-muted/40 p-3 text-sm">
                      <div className="font-medium">{slot.subject}</div>
                      <div className="text-muted-foreground">{slot.start} - {slot.end} | {slot.faculty} | {slot.room}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyLine />}
      </DetailSection>

      <DetailSection title="Behavior, Documents And Notifications">
        <div className="grid grid-cols-1 gap-3">
          <DetailItem label="Behavior Score" value={data.behavior?.score ?? 0} />
          {[...remarks, ...documents, ...notifications].length ? (
            [...remarks, ...documents, ...notifications].map((item: any, index: number) => (
              <div key={item.id || index} className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium">{item.title || item.document_type || item.type || "Record"}</div>
                <div className="text-muted-foreground">{item.body || item.remarks || item.status || item.time || item.file_name || "-"}</div>
              </div>
            ))
          ) : <EmptyLine />}
        </div>
      </DetailSection>
    </div>
  );
}

export const StudentsModule = createCrudModule<BackendStudent, V>({
  base: "/students",
  title: "Student Registry",
  description: "Manage student master records and map each student to academic allocation.",
  singular: "Student",
  searchPlaceholder: "Search by name, email or roll number...",
  selectable: false,
  bulkResource: "students",
  permissions: { view: "students.view", manage: "students.manage" },
  resolver: zResolver(schema),
  defaultValues: {
    institution_id: "",
    academic_year_id: "",
    course_id: "",
    branch_id: "",
    class_id: "",
    section_id: "",
    full_name: "",
    email: "",
    username: "",
    password: "",
    roll_number: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
  },
  toFormValues: (row) => ({
    institution_id: row.institution_id || "",
    academic_year_id: row.current_academic_year_id || "",
    course_id: row.current_course_id || "",
    branch_id: row.current_branch_id || "",
    class_id: row.current_class_id || "",
    section_id: row.current_section_id || "",
    full_name: row.full_name || "",
    email: row.email || "",
    username: row.email?.split("@")[0] || makeUsername(row.full_name || ""),
    password: "",
    roll_number: row.roll_number || "",
    phone: row.phone || "",
    date_of_birth: row.date_of_birth || "",
    gender: row.gender || "",
    guardian_name: row.guardian_name || "",
    guardian_phone: row.guardian_phone || "",
    guardian_email: row.guardian_email || "",
  }),
  transform: (values, mode) => {
    if (mode === "edit") {
      return {
        academic_year_id: values.academic_year_id,
        branch_id: values.branch_id,
        section_id: values.section_id,
        full_name: values.full_name,
        phone: values.phone || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        guardian_name: values.guardian_name || null,
        guardian_phone: values.guardian_phone || null,
        guardian_email: values.guardian_email || null,
      };
    }

    return {
      institution_id: values.institution_id,
      academic_year_id: values.academic_year_id,
      branch_id: values.branch_id,
      section_id: values.section_id,
      email: values.email,
      username: values.username || makeUsername(values.full_name),
      password: values.password,
      full_name: values.full_name,
      phone: values.phone || null,
      roll_number: values.roll_number,
      date_of_birth: values.date_of_birth || null,
      gender: values.gender || null,
      guardian_name: values.guardian_name || null,
      guardian_phone: values.guardian_phone || null,
      guardian_email: values.guardian_email || null,
    };
  },
  columns: [
    {
      key: "full_name",
      header: "Name",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.full_name}</span>,
    },
    {
      key: "roll_number",
      header: "Roll No",
      sortable: true,
      cell: (r) => <span className="font-mono text-xs">{r.roll_number}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      cell: (r) => <span className="text-muted-foreground">{r.email}</span>,
    },
    {
      key: "guardian_name",
      header: "Guardian",
      cell: (r) => (
        <div className="text-sm">
          <div>{r.guardian_name || "-"}</div>
          <div className="text-xs text-muted-foreground">{r.guardian_phone || "-"}</div>
          <div className="text-xs text-muted-foreground">{r.guardian_email || "-"}</div>
        </div>
      ),
    },
    {
      key: "current_branch_name",
      header: "Academic",
      cell: (r) => (
        <div className="text-sm">
          <div>{r.current_branch_name || "-"}</div>
          <div className="text-xs text-muted-foreground">
            {[r.current_class_name, r.current_section_name, r.current_academic_year_label]
              .filter(Boolean)
              .join(" · ") || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "role_slug",
      header: "User Type",
      sortable: true,
      cell: (r) => <span className="capitalize">{r.role_slug || "student"}</span>,
    },
    {
      key: "gender",
      header: "Gender",
      sortable: true,
      cell: (r) => r.gender || "-",
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      cell: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
    },
  ],
  renderForm: (form, mode) => {
    const {
      register,
      watch,
      setValue,
      formState: { errors },
    } = form;
    const { user } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
    const [years, setYears] = useState<AcademicYearOption[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [sections, setSections] = useState<SectionOption[]>([]);

    const institutionId = watch("institution_id");
    const courseId = watch("course_id");
    const branchId = watch("branch_id");
    const classId = watch("class_id");
    const fullName = watch("full_name");

    useEffect(() => {
      if (!fullName || mode === "edit") return;
      setValue("username", makeUsername(fullName), { shouldValidate: true });
    }, [fullName, mode, setValue]);

    useEffect(() => {
      const loadInstitutions = async () => {
        const orgId = user?.organization_id;
        if (!orgId) {
          setInstitutions(user?.institution_id ? [{ id: user.institution_id, name: "Current Institution" }] : []);
          if (user?.institution_id && !watch("institution_id")) {
            setValue("institution_id", user.institution_id, { shouldValidate: true });
          }
          return;
        }

        try {
          const res = await api.get<any>(`/institutions?org_id=${orgId}&page=1&page_size=500`);
          const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as InstitutionOption[];
          setInstitutions(rows);
          if (rows.length > 0 && !watch("institution_id")) {
            setValue("institution_id", user?.institution_id || rows[0].id, { shouldValidate: true });
          }
        } catch {
          setInstitutions([]);
        }
      };

      loadInstitutions();
    }, []);

    useEffect(() => {
      if (!institutionId) return;
      const loadForInstitution = async () => {
        try {
          const [yearsRes, coursesRes] = await Promise.all([
            api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=500`),
            api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=500`),
          ]);
          const nextYears = ((Array.isArray(yearsRes?.data?.items) && yearsRes.data.items) || []) as AcademicYearOption[];
          const nextCourses = ((Array.isArray(coursesRes?.data?.items) && coursesRes.data.items) || []) as CourseOption[];
          setYears(nextYears);
          setCourses(nextCourses);
          setBranches([]);
          setClasses([]);
          setSections([]);
          const currentYear = watch("academic_year_id");
          const currentCourse = watch("course_id");
          setValue("academic_year_id", nextYears.some((item) => item.id === currentYear) ? currentYear : nextYears[0]?.id || "", { shouldValidate: true });
          setValue("course_id", nextCourses.some((item) => item.id === currentCourse) ? currentCourse : "", { shouldValidate: true });
          if (!nextCourses.some((item) => item.id === currentCourse)) {
            setValue("branch_id", "", { shouldValidate: true });
            setValue("class_id", "", { shouldValidate: true });
            setValue("section_id", "", { shouldValidate: true });
          }
        } catch {
          setYears([]);
          setCourses([]);
          setBranches([]);
          setClasses([]);
          setSections([]);
        }
      };

      loadForInstitution();
    }, [institutionId, setValue]);

    useEffect(() => {
      if (!courseId) return;
      const loadBranches = async () => {
        try {
          const res = await api.get<any>(`/branches?course_id=${courseId}&page=1&page_size=500`);
          const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as BranchOption[];
          setBranches(rows);
          setClasses([]);
          setSections([]);
          const currentBranch = watch("branch_id");
          if (!rows.some((item) => item.id === currentBranch)) {
            setValue("branch_id", "", { shouldValidate: true });
            setValue("class_id", "", { shouldValidate: true });
            setValue("section_id", "", { shouldValidate: true });
          }
        } catch {
          setBranches([]);
          setClasses([]);
          setSections([]);
        }
      };
      loadBranches();
    }, [courseId, setValue]);

    useEffect(() => {
      if (!branchId) return;
      const loadClasses = async () => {
        try {
          const res = await api.get<any>(`/classes?branch_id=${branchId}&page=1&page_size=500`);
          const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as ClassOption[];
          setClasses(rows);
          setSections([]);
          const currentClass = watch("class_id");
          if (!rows.some((item) => item.id === currentClass)) {
            setValue("class_id", "", { shouldValidate: true });
            setValue("section_id", "", { shouldValidate: true });
          }
        } catch {
          setClasses([]);
          setSections([]);
        }
      };
      loadClasses();
    }, [branchId, setValue]);

    useEffect(() => {
      if (!classId) return;
      const loadSections = async () => {
        try {
          const res = await api.get<any>(`/sections?class_id=${classId}&page=1&page_size=500`);
          const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as SectionOption[];
          setSections(rows);
          const currentSection = watch("section_id");
          if (!rows.some((item) => item.id === currentSection)) {
            setValue("section_id", "", { shouldValidate: true });
          }
        } catch {
          setSections([]);
        }
      };
      loadSections();
    }, [classId, setValue]);

    return (
      <FieldGrid>
        <>
            <Field label="Institution" error={errors.institution_id?.message as string}>
              <SearchableSelect
                value={watch("institution_id") || ""}
                onValueChange={(v) => setValue("institution_id", v, { shouldValidate: true })}
                placeholder="Select institution"
                searchPlaceholder="Search institution..."
                options={institutions.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Field>
            <Field label="Academic Year" error={errors.academic_year_id?.message as string}>
              <SearchableSelect
                value={watch("academic_year_id") || ""}
                onValueChange={(v) => setValue("academic_year_id", v, { shouldValidate: true })}
                placeholder="Select academic year"
                searchPlaceholder="Search academic year..."
                options={years.map((item) => ({ value: item.id, label: item.label }))}
              />
            </Field>
            <Field label="Course" error={errors.course_id?.message as string}>
              <SearchableSelect
                value={watch("course_id") || ""}
                onValueChange={(v) => setValue("course_id", v, { shouldValidate: true })}
                placeholder="Select course"
                searchPlaceholder="Search course..."
                options={courses.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Field>
            <Field label="Branch" error={errors.branch_id?.message as string}>
              <SearchableSelect
                value={watch("branch_id") || ""}
                onValueChange={(v) => setValue("branch_id", v, { shouldValidate: true })}
                disabled={!courseId}
                placeholder="Select branch"
                searchPlaceholder="Search branch..."
                options={branches.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Field>
            <Field label="Class" error={errors.class_id?.message as string}>
              <SearchableSelect
                value={watch("class_id") || ""}
                onValueChange={(v) => setValue("class_id", v, { shouldValidate: true })}
                disabled={!branchId}
                placeholder="Select class"
                searchPlaceholder="Search class..."
                options={classes.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Field>
            <Field label="Section" error={errors.section_id?.message as string}>
              <SearchableSelect
                value={watch("section_id") || ""}
                onValueChange={(v) => setValue("section_id", v, { shouldValidate: true })}
                disabled={!classId}
                placeholder="Select section"
                searchPlaceholder="Search section..."
                options={sections.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Field>
        </>

        <Field label="Full Name" error={errors.full_name?.message as string}>
          <Input {...register("full_name")} />
        </Field>
        <Field label="Email" error={errors.email?.message as string}>
          <Input type="email" {...register("email")} disabled={mode === "edit"} />
        </Field>
        {mode === "create" && <input type="hidden" {...register("username")} />}
        {mode === "create" && (
          <Field label="Password" error={errors.password?.message as string}>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} {...register("password")} className="pr-10" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
        )}
        <Field label="Roll Number" error={errors.roll_number?.message as string}>
          <Input {...register("roll_number")} disabled={mode === "edit"} />
        </Field>
        <Field label="Phone" error={errors.phone?.message as string}>
          <Input {...register("phone")} />
        </Field>
        <Field label="Date of Birth" error={errors.date_of_birth?.message as string}>
          <Input type="date" {...register("date_of_birth")} />
        </Field>
        <Field label="Gender" error={errors.gender?.message as string}>
          <Select value={watch("gender") || ""} onValueChange={(v) => setValue("gender", v, { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Guardian Name" error={errors.guardian_name?.message as string}>
          <Input {...register("guardian_name")} />
        </Field>
        <Field label="Guardian Phone" error={errors.guardian_phone?.message as string}>
          <Input {...register("guardian_phone")} />
        </Field>
        <Field label="Guardian Email" error={errors.guardian_email?.message as string}>
          <Input type="email" {...register("guardian_email")} />
        </Field>
      </FieldGrid>
    );
  },
  renderDetails: (row) => <StudentFullDetails studentId={row.id} fallback={row} />,
});
