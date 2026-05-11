import { useEffect, useState } from "react";
import { z } from "zod";
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
import { StatusBadge } from "@/components/common/StatusBadge";
import { zResolver } from "@/modules/zodResolver";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { Eye, EyeOff } from "lucide-react";

interface BackendUser {
  id: string;
  institution_id: string;
  role_id?: string | null;
  role_name?: string | null;
  email: string;
  username: string;
  full_name: string;
  phone?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

/* =========================
   SESSION HELPER
========================= */
const getOrgIdFromSession = () => {
  try {
    const raw = sessionStorage.getItem("sms_auth");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.organization_id || null;
  } catch (e) {
    console.error("Session parse error", e);
    return null;
  }
};

/* =========================
   USERNAME GENERATOR
========================= */
const generateUsername = (fullName: string) => {
  if (!fullName) return "";
  const firstName = fullName.trim().split(" ")[0].toLowerCase();
  const clean = firstName.replace(/[^a-z]/g, "");
  return clean || "user";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

/* =========================
   SCHEMA
========================= */
const schema = z.object({
  full_name: z.string().trim().min(2, "Required").max(80),
  email: z.string().trim().email("Invalid email").max(120),
  phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),

  // ✅ ADDED
  username: z.string().min(1, "Username required"),

  password: z
    .string()
    .min(8, "Min 8 characters")
    .optional()
    .or(z.literal("")),

  role_id: z.string().min(1, "Role required"),
  institution_id: z.string().min(1, "Institution required"),
  status: z.enum(["active", "inactive"]),
});

type V = z.infer<typeof schema>;

/* =========================
   MODULE
========================= */
export const UsersModule = createCrudModule<BackendUser, V>({
  base: "/users",
  title: "Users",
  description: "Manage platform users and assign roles.",
  singular: "User",
  searchPlaceholder: "Search by name, email or role…",
  selectable: true,
  permissions: { view: "users.view", manage: "users.manage" },

  resolver: zResolver(schema),

  defaultValues: {
    full_name: "",
    phone: "",
    email: "",
    username: "", // ✅ ADDED
    password: "",
    role_id: "",
    institution_id: "",
    status: "active",
  },

  toFormValues: (u) => ({
    full_name: u.full_name,
    phone: u.phone || "",
    email: u.email,
    username: u.username || "", // ✅ ADDED
    password: "",
    role_id: u.role_id || "",
    institution_id: u.institution_id || "",
    status: u.is_active ? "active" : "inactive",
  }),

  transform: (values, mode) => {
    const payload: any = {
      full_name: values.full_name,
      phone: values.phone,
      role_id: values.role_id,
      institution_id: values.institution_id,
      is_active: values.status === "active",
    };

    if (mode === "create") {
      payload.email = values.email;
      payload.username = values.username;
      payload.password = values.password || undefined;
    } else if (values.password) {
      payload.password = values.password;
    }

    return payload;
  },

  /* =========================
     TABLE
  ========================= */
  columns: [
    {
      key: "full_name",
      header: "Name",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.full_name}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      cell: (r) => (
        <span className="text-muted-foreground">{r.email}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      cell: (r) => (
        <span className="capitalize">
          {(r as any).role_name || "-"}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      sortable: true,
      cell: (r) => <StatusBadge value={r.is_active ? "active" : "inactive"} />,
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      cell: (r) => (
        <span className="text-muted-foreground">
          {formatDateTime(r.created_at)}
        </span>
      ),
    },
  ],

  /* =========================
     FORM
  ========================= */
  renderForm: (form, mode) => {
    const {
      register,
      watch,
      setValue,
      formState: { errors },
    } = form;

    const { user } = useAuth();

    const [roles, setRoles] = useState<any[]>([]);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loadingInstitutions, setLoadingInstitutions] =
      useState(false);

    const [showPassword, setShowPassword] = useState(false);

    /* LOAD DATA */
    useEffect(() => {
      const load = async () => {
        try {
          setLoadingRoles(true);
          const r = await api.get<any>("/roles");
          setRoles(r.data?.items || r.data || []);
        } catch {
          setRoles([]);
        } finally {
          setLoadingRoles(false);
        }

        try {
          setLoadingInstitutions(true);
          const orgId =
            user?.organization_id || getOrgIdFromSession();
          if (!orgId) return;

          const res = await api.get<any>(
            `/institutions?org_id=${orgId}`
          );
          setInstitutions(res.data?.items || res.data || []);
        } catch {
          setInstitutions([]);
        } finally {
          setLoadingInstitutions(false);
        }
      };

      load();
    }, []);

    /* 🔥 AUTO USERNAME */
    useEffect(() => {
      const name = watch("full_name");
      if (name) {
        setValue("username", generateUsername(name));
      }
    }, [watch("full_name")]);

    return (
      <FieldGrid>
        {/* NAME */}
        <Field label="Name" error={errors.full_name?.message as string}>
          <Input {...register("full_name")} />
        </Field>

        {/* PHONE */}
        <Field label="Phone" error={errors.phone?.message as string}>
          <Input
            {...register("phone")}
            maxLength={10}
            inputMode="numeric"
          />
        </Field>

        {/* EMAIL */}
        <Field label="Email" error={errors.email?.message as string}>
          <Input type="email" {...register("email")} />
        </Field>

        {/* 🔥 HIDDEN USERNAME */}
        <input type="hidden" {...register("username")} />

        {/* PASSWORD */}
        <Field label="Password" error={errors.password?.message as string}>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              className="pr-10"
              placeholder={mode === "create" ? "Leave blank to auto-generate and email credentials" : "Optional"}
            />
            <button
              type="button"
              onClick={() =>
                setShowPassword((prev) => !prev)
              }
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
          {mode === "create" && (
            <p className="text-xs text-muted-foreground mt-1">
              If empty, username and temporary password will be sent to user email.
            </p>
          )}
        </Field>

        {/* ROLE */}
        <Field label="Role" error={errors.role_id?.message as string}>
          <SearchableSelect
            value={watch("role_id") || ""}
            onValueChange={(v) => setValue("role_id", v, { shouldValidate: true })}
            disabled={loadingRoles}
            placeholder="Select role"
            searchPlaceholder="Search role..."
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Field>

        {/* INSTITUTION */}
        <Field
          label="Institution"
          error={errors.institution_id?.message as string}
        >
          <SearchableSelect
            value={watch("institution_id") || ""}
            onValueChange={(v) => setValue("institution_id", v, { shouldValidate: true })}
            disabled={loadingInstitutions}
            placeholder="Select institution"
            searchPlaceholder="Search institution..."
            options={institutions.map((i) => ({ value: i.id, label: i.name }))}
          />
        </Field>

        {/* STATUS */}
        <Field label="Status" error={errors.status?.message as string}>
          <Select
            value={watch("status")}
            onValueChange={(v) =>
              setValue("status", v as "active" | "inactive", {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGrid>
    );
  },
});
