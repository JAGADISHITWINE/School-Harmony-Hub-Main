import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCrudModule } from "@/modules/createCrudModule";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { StatusBadge } from "@/components/common/StatusBadge";
import { zResolver } from "@/modules/zodResolver";
import { db } from "@/lib/mock-db";
import type { FeeRecord } from "@/types";

const schema = z.object({
  studentId: z.string().min(1, "Pick a student"),
  amount: z.number().min(0),
  dueDate: z.string().min(1),
  paidDate: z.string().optional(),
  status: z.enum(["paid","pending","overdue"]),
  category: z.string().min(1),
});
type V = z.infer<typeof schema>;

const studentName = (id: string) => db.students.find(s => s.id === id)?.name ?? "—";

export const FeesModule = createCrudModule<FeeRecord, V>({
  base: "/fees",
  title: "Fees",
  description: "Fee structure, payment tracking and outstanding dues.",
  singular: "Fee record",
  selectable: true,
  permissions: { view: "fees.view", manage: "fees.manage" },
  resolver: zResolver(schema),
  defaultValues: { studentId: "", amount: 500, dueDate: new Date().toISOString().slice(0,10), paidDate: "", status: "pending", category: "Tuition" },
  toFormValues: (f) => ({ studentId: f.studentId, amount: f.amount, dueDate: f.dueDate, paidDate: f.paidDate ?? "", status: f.status, category: f.category }),
  columns: [
    { key: "studentId", header: "Student", cell: (r) => <span className="font-medium">{studentName(r.studentId)}</span> },
    { key: "category", header: "Category", sortable: true, cell: (r) => r.category },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="font-mono">${r.amount.toLocaleString()}</span> },
    { key: "dueDate", header: "Due", sortable: true, cell: (r) => <span className="text-muted-foreground">{r.dueDate}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
  ],
  renderForm: (form) => {
    const { register, watch, setValue, formState: { errors } } = form;
    return (
      <FieldGrid>
        <Field label="Student" error={errors.studentId?.message as string}>
          <Select value={watch("studentId")} onValueChange={(v)=>setValue("studentId", v, { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent className="max-h-72">{db.students.slice(0,80).map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.rollNo}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Category" error={errors.category?.message as string}><Input {...register("category")} /></Field>
        <Field label="Amount (USD)" error={errors.amount?.message as string}><Input type="number" {...register("amount", { valueAsNumber: true })} /></Field>
        <Field label="Status">
          <Select value={watch("status")} onValueChange={(v)=>setValue("status", v as any, { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Due date"><Input type="date" {...register("dueDate")} /></Field>
        <Field label="Paid date"><Input type="date" {...register("paidDate")} /></Field>
      </FieldGrid>
    );
  },
});