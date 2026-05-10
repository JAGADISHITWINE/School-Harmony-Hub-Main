import { useEffect, useState } from "react";
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
import { zResolver } from "@/modules/zodResolver";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

interface BackendStudent {
  id: string;
  user_id: string;
  roll_number: string;
  date_of_birth?: string | null;
  gender?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  full_name: string;
  email: string;
  role_slug?: string | null;
  current_branch_name?: string | null;
  current_class_name?: string | null;
  current_section_name?: string | null;
  current_academic_year_label?: string | null;
  current_status?: string | null;
  created_at: string;
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
  username: z.string().trim().min(1, "Username required").max(60),
  password: z.string().min(8, "Min 8 characters").optional().or(z.literal("")),
  roll_number: z.string().trim().min(1, "Required").max(30),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  guardian_name: z.string().trim().max(120).optional().or(z.literal("")),
  guardian_phone: z.string().trim().max(20).optional().or(z.literal("")),
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

export const StudentsModule = createCrudModule<BackendStudent, V>({
  base: "/students",
  title: "Student Registry",
  description: "Manage student master records and map each student to academic allocation.",
  singular: "Student",
  searchPlaceholder: "Search by name, email or roll number…",
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
    institution_id: "",
    academic_year_id: "",
    course_id: "",
    branch_id: "",
    class_id: "",
    section_id: "",
    full_name: row.full_name || "",
    email: row.email || "",
    username: "",
    password: "",
    roll_number: row.roll_number || "",
    phone: "",
    date_of_birth: row.date_of_birth || "",
    gender: row.gender || "",
    guardian_name: row.guardian_name || "",
    guardian_phone: row.guardian_phone || "",
    guardian_email: row.guardian_email || "",
  }),
  transform: (values, mode) => {
    if (mode === "edit") {
      return {
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
      username: values.username,
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
          const res = await api.get<any>(`/institutions?org_id=${orgId}&page=1&page_size=100`);
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
      if (!institutionId || mode === "edit") return;
      const loadForInstitution = async () => {
        try {
          const [yearsRes, coursesRes] = await Promise.all([
            api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=100`),
            api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=100`),
          ]);
          const nextYears = ((Array.isArray(yearsRes?.data?.items) && yearsRes.data.items) || []) as AcademicYearOption[];
          const nextCourses = ((Array.isArray(coursesRes?.data?.items) && coursesRes.data.items) || []) as CourseOption[];
          setYears(nextYears);
          setCourses(nextCourses);
          setBranches([]);
          setClasses([]);
          setSections([]);
          setValue("academic_year_id", nextYears[0]?.id || "", { shouldValidate: true });
          setValue("course_id", "", { shouldValidate: true });
          setValue("branch_id", "", { shouldValidate: true });
          setValue("class_id", "", { shouldValidate: true });
          setValue("section_id", "", { shouldValidate: true });
        } catch {
          setYears([]);
          setCourses([]);
          setBranches([]);
          setClasses([]);
          setSections([]);
        }
      };

      loadForInstitution();
    }, [institutionId, mode, setValue]);

    useEffect(() => {
      if (!courseId || mode === "edit") return;
      const loadBranches = async () => {
        try {
          const res = await api.get<any>(`/branches?course_id=${courseId}&page=1&page_size=100`);
          const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as BranchOption[];
          setBranches(rows);
          setClasses([]);
          setSections([]);
          setValue("branch_id", "", { shouldValidate: true });
          setValue("class_id", "", { shouldValidate: true });
          setValue("section_id", "", { shouldValidate: true });
        } catch {
          setBranches([]);
          setClasses([]);
          setSections([]);
        }
      };
      loadBranches();
    }, [courseId, mode, setValue]);

    useEffect(() => {
      if (!branchId || mode === "edit") return;
      const loadClasses = async () => {
        try {
          const res = await api.get<any>(`/classes?branch_id=${branchId}&page=1&page_size=100`);
          const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as ClassOption[];
          setClasses(rows);
          setSections([]);
          setValue("class_id", "", { shouldValidate: true });
          setValue("section_id", "", { shouldValidate: true });
        } catch {
          setClasses([]);
          setSections([]);
        }
      };
      loadClasses();
    }, [branchId, mode, setValue]);

    useEffect(() => {
      if (!classId || mode === "edit") return;
      const loadSections = async () => {
        try {
          const res = await api.get<any>(`/sections?class_id=${classId}&page=1&page_size=100`);
          const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as SectionOption[];
          setSections(rows);
          setValue("section_id", "", { shouldValidate: true });
        } catch {
          setSections([]);
        }
      };
      loadSections();
    }, [classId, mode, setValue]);

    return (
      <FieldGrid>
        {mode === "create" && (
          <>
            <Field label="Institution" error={errors.institution_id?.message as string}>
              <Select value={watch("institution_id") || ""} onValueChange={(v) => setValue("institution_id", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                <SelectContent>
                  {institutions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Academic Year" error={errors.academic_year_id?.message as string}>
              <Select value={watch("academic_year_id") || ""} onValueChange={(v) => setValue("academic_year_id", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                <SelectContent>
                  {years.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Course" error={errors.course_id?.message as string}>
              <Select value={watch("course_id") || ""} onValueChange={(v) => setValue("course_id", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch" error={errors.branch_id?.message as string}>
              <Select value={watch("branch_id") || ""} onValueChange={(v) => setValue("branch_id", v, { shouldValidate: true })} disabled={!courseId}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Class" error={errors.class_id?.message as string}>
              <Select value={watch("class_id") || ""} onValueChange={(v) => setValue("class_id", v, { shouldValidate: true })} disabled={!branchId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Section" error={errors.section_id?.message as string}>
              <Select value={watch("section_id") || ""} onValueChange={(v) => setValue("section_id", v, { shouldValidate: true })} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  {sections.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

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
  renderDetails: (row) => (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      <div><dt className="text-xs uppercase text-muted-foreground">Name</dt><dd className="text-sm mt-1">{row.full_name}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Email</dt><dd className="text-sm mt-1">{row.email}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Roll Number</dt><dd className="text-sm mt-1">{row.roll_number}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Gender</dt><dd className="text-sm mt-1">{row.gender || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Guardian</dt><dd className="text-sm mt-1">{row.guardian_name || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Guardian Phone</dt><dd className="text-sm mt-1">{row.guardian_phone || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Guardian Email</dt><dd className="text-sm mt-1">{row.guardian_email || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">User Type</dt><dd className="text-sm mt-1 capitalize">{row.role_slug || "student"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Branch</dt><dd className="text-sm mt-1">{row.current_branch_name || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Class</dt><dd className="text-sm mt-1">{row.current_class_name || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Section</dt><dd className="text-sm mt-1">{row.current_section_name || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Academic Year</dt><dd className="text-sm mt-1">{row.current_academic_year_label || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Academic Status</dt><dd className="text-sm mt-1 capitalize">{row.current_status || "-"}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Date of Birth</dt><dd className="text-sm mt-1">{formatDate(row.date_of_birth)}</dd></div>
      <div><dt className="text-xs uppercase text-muted-foreground">Created</dt><dd className="text-sm mt-1">{formatDate(row.created_at)}</dd></div>
    </dl>
  ),
});
