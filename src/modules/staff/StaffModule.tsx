import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCrudModule } from "@/modules/createCrudModule";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { StatusBadge } from "@/components/common/StatusBadge";
import { zResolver } from "@/modules/zodResolver";
import type { Staff, Role } from "@/types";

const ROLES: Role[] = ["admin","teacher","accountant"];

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(5).max(30),
  role: z.enum(ROLES),
  department: z.string().trim().min(2).max(60),
  status: z.enum(["active","inactive"]),
});
type V = z.infer<typeof schema>;

export const StaffModule = createCrudModule<Staff, V>({
  base: "/staff",
  title: "Staff",
  description: "Teaching and administrative staff directory.",
  singular: "Staff",
  selectable: true,
  permissions: { view: "staff.view", manage: "staff.manage" },
  resolver: zResolver(schema),
  defaultValues: { name: "", email: "", phone: "", role: "teacher", department: "", status: "active" },
  toFormValues: (s) => ({ name: s.name, email: s.email, phone: s.phone, role: s.role as any, department: s.department, status: s.status }),
  columns: [
    { key: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", sortable: true, cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
    { key: "role", header: "Role", cell: (r) => <span className="capitalize">{r.role}</span> },
    { key: "department", header: "Department", sortable: true, cell: (r) => r.department },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
  ],
  renderForm: (form) => {
    const { register, watch, setValue, formState: { errors } } = form;
    return (
      <FieldGrid>
        <Field label="Name" error={errors.name?.message as string}><Input {...register("name")} /></Field>
        <Field label="Email" error={errors.email?.message as string}><Input type="email" {...register("email")} /></Field>
        <Field label="Phone" error={errors.phone?.message as string}><Input {...register("phone")} /></Field>
        <Field label="Department" error={errors.department?.message as string}><Input {...register("department")} /></Field>
        <Field label="Role">
          <Select value={watch("role")} onValueChange={(v)=>setValue("role", v as any, { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={watch("status")} onValueChange={(v)=>setValue("status", v as any, { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </Field>
      </FieldGrid>
    );
  },
});