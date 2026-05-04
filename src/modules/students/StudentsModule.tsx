import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCrudModule } from "@/modules/createCrudModule";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { StatusBadge } from "@/components/common/StatusBadge";
import { zResolver } from "@/modules/zodResolver";
import { db } from "@/lib/mock-db";
import type { Student } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  rollNo: z.string().trim().min(1).max(20),
  classId: z.string().min(1, "Pick a class"),
  sectionId: z.string().min(1, "Pick a section"),
  parentName: z.string().trim().min(2).max(80),
  parentPhone: z.string().trim().min(5).max(30),
  status: z.enum(["active","inactive"]),
});
type V = z.infer<typeof schema>;

const classLabel = (id: string) => db.classes.find(c => c.id === id)?.name ?? "—";
const sectionLabel = (id: string) => {
  for (const c of db.classes) { const s = c.sections.find(s => s.id === id); if (s) return s.name; }
  return "—";
};

export const StudentsModule = createCrudModule<Student, V>({
  base: "/students",
  title: "Students",
  description: "Roster of admitted students with parent contact info.",
  singular: "Student",
  selectable: true,
  permissions: { view: "students.view", manage: "students.manage" },
  resolver: zResolver(schema),
  defaultValues: { name: "", email: "", rollNo: "", classId: "", sectionId: "", parentName: "", parentPhone: "", status: "active" },
  toFormValues: (s) => ({ name: s.name, email: s.email, rollNo: s.rollNo, classId: s.classId, sectionId: s.sectionId, parentName: s.parentName, parentPhone: s.parentPhone, status: s.status }),
  columns: [
    { key: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "rollNo", header: "Roll No", sortable: true, cell: (r) => <span className="font-mono text-xs">{r.rollNo}</span> },
    { key: "classId", header: "Class", cell: (r) => `${classLabel(r.classId)} — ${sectionLabel(r.sectionId)}` },
    { key: "parentName", header: "Parent", cell: (r) => <div className="text-sm"><div>{r.parentName}</div><div className="text-xs text-muted-foreground">{r.parentPhone}</div></div> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
  ],
  renderForm: (form) => {
    const { register, watch, setValue, formState: { errors } } = form;
    const cls = db.classes.find(c => c.id === watch("classId"));
    return (
      <FieldGrid>
        <Field label="Full name" error={errors.name?.message as string}><Input {...register("name")} /></Field>
        <Field label="Email" error={errors.email?.message as string}><Input type="email" {...register("email")} /></Field>
        <Field label="Roll No" error={errors.rollNo?.message as string}><Input {...register("rollNo")} /></Field>
        <Field label="Status">
          <Select value={watch("status")} onValueChange={(v)=>setValue("status", v as any, { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Class" error={errors.classId?.message as string}>
          <Select value={watch("classId")} onValueChange={(v)=>{ setValue("classId", v, { shouldValidate: true }); setValue("sectionId", "", { shouldValidate: true }); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{db.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Section" error={errors.sectionId?.message as string}>
          <Select value={watch("sectionId")} onValueChange={(v)=>setValue("sectionId", v, { shouldValidate: true })} disabled={!cls}>
            <SelectTrigger><SelectValue placeholder={cls ? "Select section" : "Pick class first"} /></SelectTrigger>
            <SelectContent>{cls?.sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Parent name" error={errors.parentName?.message as string}><Input {...register("parentName")} /></Field>
        <Field label="Parent phone" error={errors.parentPhone?.message as string}><Input {...register("parentPhone")} /></Field>
      </FieldGrid>
    );
  },
});