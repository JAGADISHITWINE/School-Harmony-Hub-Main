import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createCrudModule } from "@/modules/createCrudModule";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { StatusBadge } from "@/components/common/StatusBadge";
import { zResolver } from "@/modules/zodResolver";
import type { User, Role } from "@/types";

const ROLES: Role[] = ["super_admin","admin","teacher","accountant","student"];

const schema = z.object({
  name: z.string().trim().min(2, "Required").max(80),
  email: z.string().trim().email("Invalid email").max(120),
  role: z.enum(ROLES),
  status: z.enum(["active","inactive"]),
});
type V = z.infer<typeof schema>;

export const UsersModule = createCrudModule<User, V>({
  base: "/users",
  title: "Users",
  description: "Manage platform users and assign roles.",
  singular: "User",
  searchPlaceholder: "Search by name, email or role…",
  selectable: true,
  permissions: { view: "users.view", manage: "users.manage" },
  resolver: zResolver(schema),
  defaultValues: { name: "", email: "", role: "teacher", status: "active" },
  toFormValues: (u) => ({ name: u.name, email: u.email, role: u.role, status: u.status }),
  columns: [
    { key: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", sortable: true, cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
    { key: "role", header: "Role", sortable: true, cell: (r) => <span className="capitalize">{String((r as any).role || "").replace("_"," ") || "-"}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <StatusBadge value={r.status} /> },
    { key: "createdAt", header: "Created", sortable: true, cell: (r) => <span className="text-muted-foreground">{r.createdAt}</span> },
  ],
  renderForm: (form) => {
    const { register, watch, setValue, formState: { errors } } = form;
    return (
      <FieldGrid>
        <Field label="Name" error={errors.name?.message as string}><Input {...register("name")} /></Field>
        <Field label="Email" error={errors.email?.message as string}><Input type="email" {...register("email")} /></Field>
        <Field label="Role" error={errors.role?.message as string}>
          <Select value={watch("role")} onValueChange={(v) => setValue("role", v as Role, { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace("_"," ")}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status" error={errors.status?.message as string}>
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "active"|"inactive", { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGrid>
    );
  },
});