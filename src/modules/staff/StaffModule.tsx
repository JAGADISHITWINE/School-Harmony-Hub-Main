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

import {
  Field,
  FieldGrid,
} from "@/components/common/FormFields";

import { StatusBadge } from "@/components/common/StatusBadge";

import { zResolver } from "@/modules/zodResolver";

import type { Staff } from "@/types";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

const getAuthData = () => {
  try {
    const raw = sessionStorage.getItem("sms_auth");

    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                                   SCHEMA                                   */
/* -------------------------------------------------------------------------- */

const schema = z.object({
  institute: z.string().min(1, "Institute is required"),

  name: z.string().trim().min(2).max(80),

  email: z.string().trim().email().max(120),

  phone: z.string().trim().min(5).max(30),

  role: z.string().min(1, "Role is required"),

  status: z.enum(["active", "inactive"]),
});

type V = z.infer<typeof schema>;

/* -------------------------------------------------------------------------- */
/*                              DYNAMIC FORM UI                               */
/* -------------------------------------------------------------------------- */

function StaffForm({ form }: any) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [institutions, setInstitutions] = useState<any[]>(
    []
  );

  const [roles, setRoles] = useState<any[]>([]);


  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------------ */
  /*                                LOAD DATA                                 */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setLoading(true);

        const auth = getAuthData();

        const orgId =
          auth?.state?.user?.organization_id;

        if (!orgId) return;

        /* --------------------------- institutions -------------------------- */

        const institutionRes = await api.get(
          `/institutions?org_id=${orgId}`
        );

        setInstitutions(
          institutionRes?.data?.items ||
            institutionRes?.data ||
            []
        );

        /* ------------------------------- roles ----------------------------- */

        const roleRes = await api.get(
          `/roles?org_id=${orgId}`
        );

        setRoles(
          roleRes?.data?.items ||
            roleRes?.data ||
            []
        );

      } catch (err) {
        console.error("Dropdown load failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadDropdowns();
  }, []);

  return (
    <FieldGrid>
      {/* Institute */}

      <Field
        label="Institute"
        error={errors.institute?.message as string}
      >
        <Select
          value={watch("institute")}
          onValueChange={(v) =>
            setValue("institute", v, {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                loading
                  ? "Loading..."
                  : "Select Institute"
              }
            />
          </SelectTrigger>

          <SelectContent>
            {institutions.map((inst: any) => (
              <SelectItem
                key={inst.id}
                value={inst.id}
              >
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Name */}

      <Field
        label="Name"
        error={errors.name?.message as string}
      >
        <Input {...register("name")} />
      </Field>

      {/* Email */}

      <Field
        label="Email"
        error={errors.email?.message as string}
      >
        <Input
          type="email"
          {...register("email")}
        />
      </Field>

      {/* Phone */}

      <Field
        label="Phone"
        error={errors.phone?.message as string}
      >
        <Input {...register("phone")} />
      </Field>


      {/* Role */}

      <Field
        label="Role"
        error={errors.role?.message as string}
      >
        <Select
          value={watch("role")}
          onValueChange={(v) =>
            setValue("role", v, {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>

          <SelectContent>
            {roles.map((role: any) => (
              <SelectItem
                key={role.id}
                value={role.name}
              >
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Status */}

      <Field label="Status">
        <Select
          value={watch("status")}
          onValueChange={(v) =>
            setValue("status", v as any, {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="active">
              Active
            </SelectItem>

            <SelectItem value="inactive">
              Inactive
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </FieldGrid>
  );
}

/* -------------------------------------------------------------------------- */
/*                                CRUD MODULE                                 */
/* -------------------------------------------------------------------------- */

export const StaffModule = createCrudModule<
  Staff,
  V
>({
  base: "/staff",

  title: "Staff",

  description:
    "Teaching and administrative staff directory.",

  singular: "Staff",

  selectable: true,

  permissions: {
    view: "staff.view",
    manage: "staff.manage",
  },

  resolver: zResolver(schema),

  defaultValues: {
    institute: "",
    name: "",
    email: "",
    phone: "",
    role: "",
    status: "active",
  },

  toFormValues: (s: any) => ({
    institute: s.institute || "",
    name: s.name || "",
    email: s.email || "",
    phone: s.phone || "",
    role: s.role || "",
    status: s.status || "active",
  }),

  columns: [
    {
      key: "name",
      header: "Name",

      sortable: true,

      cell: (r) => (
        <span className="font-medium">
          {r.name}
        </span>
      ),
    },

    {
      key: "institute_name",

      header: "Institute",

      sortable: true,

      cell: (r: any) =>
        r.institute_name || "-",
    },

    {
      key: "email",

      header: "Email",

      sortable: true,

      cell: (r) => (
        <span className="text-muted-foreground">
          {r.email}
        </span>
      ),
    },

    {
      key: "role",

      header: "Role",

      sortable: true,

      cell: (r: any) => (
        <span className="capitalize">
          {r.role}
        </span>
      ),
    },

    {
      key: "status",

      header: "Status",

      cell: (r) => (
        <StatusBadge value={r.status} />
      ),
    },
  ],

  renderForm: (form) => (
    <StaffForm form={form} />
  ),
});