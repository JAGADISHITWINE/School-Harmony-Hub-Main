import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Banknote, CreditCard, IndianRupee, Plus, ReceiptText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { BulkImportTools } from "@/components/common/BulkImportTools";
import { StatCard } from "@/components/common/StatCard";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FeeTab = "types" | "structures" | "assign" | "collect";

interface FeeType {
  id: string;
  name: string;
  description?: string | null;
}

interface FeeStructure {
  id: string;
  fee_type_id: string;
  course_id: string;
  academic_year_id: string;
  amount: number;
  frequency: string;
}

interface Student {
  id: string;
  full_name: string;
  roll_number: string;
}

interface StudentFee {
  id: string;
  student_id: string;
  fee_structure_id: string;
  amount_due: number;
  amount_paid: number;
  status: "unpaid" | "partial" | "paid" | "waived";
  due_date?: string | null;
  student_name?: string | null;
  roll_number?: string | null;
  fee_type_name?: string | null;
  course_name?: string | null;
  academic_year_label?: string | null;
  frequency?: string | null;
}

interface Course { id: string; name: string; }
interface AcademicYear { id: string; label: string; is_current?: boolean; }

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Number(value || 0));

const today = () => new Date().toISOString().slice(0, 10);

export function FeesModule({ initialTab = "collect" }: { initialTab?: FeeTab }) {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const [tab, setTab] = useState<FeeTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);

  const [typeForm, setTypeForm] = useState({ name: "", description: "" });
  const [structureForm, setStructureForm] = useState({
    fee_type_id: "",
    course_id: "",
    academic_year_id: "",
    amount: "",
    frequency: "annual",
  });
  const [assignForm, setAssignForm] = useState({
    student_id: "",
    fee_structure_id: "",
    amount_due: "",
    due_date: today(),
  });
  const [paymentForm, setPaymentForm] = useState({
    student_fee_id: "",
    amount: "",
    payment_mode: "cash",
    transaction_ref: "",
  });

  const structureById = useMemo(() => new Map(structures.map((s) => [s.id, s])), [structures]);
  const feeTypeById = useMemo(() => new Map(feeTypes.map((f) => [f.id, f.name])), [feeTypes]);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);
  const yearById = useMemo(() => new Map(years.map((y) => [y.id, y.label])), [years]);
  const unpaidFees = studentFees.filter((f) => f.status !== "paid" && f.status !== "waived");
  const totalDue = studentFees.reduce((sum, f) => sum + Number(f.amount_due || 0), 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);

  const load = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [typesRes, coursesRes, yearsRes, studentsRes, feesRes] = await Promise.all([
        api.get<any>(`/fees/types?institution_id=${institutionId}&page=1&page_size=500`),
        api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=500`),
        api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=500`),
        api.get<any>("/students?page=1&page_size=500"),
        api.get<any>("/fees/student-fees?page=1&page_size=500"),
      ]);
      const nextTypes = listFrom<FeeType>(typesRes);
      setFeeTypes(nextTypes);
      setCourses(listFrom<Course>(coursesRes));
      setYears(listFrom<AcademicYear>(yearsRes));
      setStudents(listFrom<Student>(studentsRes));
      setStudentFees(listFrom<StudentFee>(feesRes));

      const structureResponses = await Promise.all(
        nextTypes.map((feeType) =>
          api.get<any>(`/fees/structures?fee_type_id=${feeType.id}&page=1&page_size=500`)
            .catch(() => ({ data: { items: [] } }))
        )
      );
      const nextStructures = structureResponses.flatMap((res) => listFrom<FeeStructure>(res));
      setStructures(nextStructures);
      setStructureForm((prev) => ({
        ...prev,
        fee_type_id: prev.fee_type_id || nextTypes[0]?.id || "",
      }));
    } catch (err: any) {
      toast.error(err?.message || "Unable to load fee data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [institutionId]);

  const createType = async () => {
    if (!typeForm.name.trim()) return toast.error("Enter fee type name");
    await api.post("/fees/types", {
      institution_id: institutionId,
      name: typeForm.name.trim(),
      description: typeForm.description.trim() || null,
    });
    toast.success("Fee type created");
    setTypeForm({ name: "", description: "" });
    await load();
  };

  const createStructure = async () => {
    if (!structureForm.fee_type_id || !structureForm.course_id || !structureForm.academic_year_id) {
      return toast.error("Select fee type, course and academic year");
    }
    await api.post("/fees/structures", {
      fee_type_id: structureForm.fee_type_id,
      course_id: structureForm.course_id,
      academic_year_id: structureForm.academic_year_id,
      amount: Number(structureForm.amount || 0),
      frequency: structureForm.frequency,
    });
    toast.success("Fee structure created");
    setStructureForm((prev) => ({ ...prev, amount: "" }));
    await load();
  };

  const assignFee = async () => {
    const selected = structureById.get(assignForm.fee_structure_id);
    if (!assignForm.student_id || !selected) return toast.error("Select student and fee structure");
    await api.post("/fees/student-fees", {
      student_id: assignForm.student_id,
      fee_structure_id: assignForm.fee_structure_id,
      amount_due: Number(assignForm.amount_due || selected.amount || 0),
      due_date: assignForm.due_date || null,
    });
    toast.success("Fee assigned to student");
    setAssignForm((prev) => ({ ...prev, student_id: "", amount_due: "" }));
    await load();
  };

  const collectPayment = async () => {
    if (!paymentForm.student_fee_id || !Number(paymentForm.amount)) {
      return toast.error("Select due record and enter amount");
    }
    await api.post("/fees/payments", {
      student_fee_id: paymentForm.student_fee_id,
      amount: Number(paymentForm.amount),
      payment_mode: paymentForm.payment_mode,
      transaction_ref: paymentForm.transaction_ref.trim() || null,
    });
    toast.success("Payment recorded");
    setPaymentForm({ student_fee_id: "", amount: "", payment_mode: "cash", transaction_ref: "" });
    await load();
  };

  const structureLabel = (id: string) => {
    const s = structureById.get(id);
    if (!s) return "Fee structure";
    return `${feeTypeById.get(s.fee_type_id) || "Fee"} - ${courseById.get(s.course_id) || "Course"} - ${yearById.get(s.academic_year_id) || "Year"} (${money(s.amount)})`;
  };

  const selectPaymentTarget = (id: string) => {
    const fee = studentFees.find((f) => f.id === id);
    setPaymentForm((prev) => ({
      ...prev,
      student_fee_id: id,
      amount: fee ? String(Number(fee.amount_due || 0) - Number(fee.amount_paid || 0)) : "",
    }));
  };

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Configure fee heads, assign dues and collect payments."
        actions={
          <>
            <BulkImportTools resource={tab === "types" ? "fee-types" : tab === "structures" ? "fee-structures" : "student-fees"} label="Fees" onImported={load} />
            <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Total Demand" value={money(totalDue)} icon={IndianRupee} accent="primary" />
        <StatCard label="Collected" value={money(totalPaid)} icon={ReceiptText} accent="blue" />
        <StatCard label="Outstanding" value={money(totalDue - totalPaid)} icon={Banknote} accent="amber" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FeeTab)}>
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="collect">Collect Fee</TabsTrigger>
          <TabsTrigger value="assign">Assign Student Fee</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="types">Fee Types</TabsTrigger>
        </TabsList>

        <TabsContent value="collect">
          <TwoColumn
            left={
              <Panel title="Record Payment">
                <FieldGrid>
                  <SelectField label="Due Record" value={paymentForm.student_fee_id} onChange={selectPaymentTarget} items={unpaidFees.map((f) => ({ id: f.id, label: `${f.roll_number || ""} ${f.student_name || "Student"} - ${f.fee_type_name || "Fee"} - Balance ${money(Number(f.amount_due) - Number(f.amount_paid))}` }))} />
                  <Field label="Amount"><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
                  <SelectField label="Payment Mode" value={paymentForm.payment_mode} onChange={(v) => setPaymentForm((p) => ({ ...p, payment_mode: v }))} items={[
                    { id: "cash", label: "Cash" }, { id: "upi", label: "UPI" }, { id: "card", label: "Card" }, { id: "neft", label: "NEFT" },
                  ]} />
                  <Field label="Transaction Ref"><Input value={paymentForm.transaction_ref} onChange={(e) => setPaymentForm((p) => ({ ...p, transaction_ref: e.target.value }))} /></Field>
                </FieldGrid>
                <Button className="mt-4" onClick={collectPayment}><CreditCard className="mr-2 h-4 w-4" /> Collect</Button>
              </Panel>
            }
            right={<DuesTable fees={studentFees} />}
          />
        </TabsContent>

        <TabsContent value="assign">
          <TwoColumn
            left={
              <Panel title="Assign Fee To Student">
                <FieldGrid>
                  <SelectField label="Student" value={assignForm.student_id} onChange={(v) => setAssignForm((p) => ({ ...p, student_id: v }))} items={students.map((s) => ({ id: s.id, label: `${s.roll_number} - ${s.full_name}` }))} />
                  <SelectField label="Fee Structure" value={assignForm.fee_structure_id} onChange={(v) => {
                    const s = structureById.get(v);
                    setAssignForm((p) => ({ ...p, fee_structure_id: v, amount_due: s ? String(s.amount) : p.amount_due }));
                  }} items={structures.map((s) => ({ id: s.id, label: structureLabel(s.id) }))} />
                  <Field label="Amount Due"><Input type="number" value={assignForm.amount_due} onChange={(e) => setAssignForm((p) => ({ ...p, amount_due: e.target.value }))} /></Field>
                  <Field label="Due Date"><Input type="date" value={assignForm.due_date} onChange={(e) => setAssignForm((p) => ({ ...p, due_date: e.target.value }))} /></Field>
                </FieldGrid>
                <Button className="mt-4" onClick={assignFee}><Plus className="mr-2 h-4 w-4" /> Assign Fee</Button>
              </Panel>
            }
            right={<DuesTable fees={studentFees} />}
          />
        </TabsContent>

        <TabsContent value="structures">
          <TwoColumn
            left={
              <Panel title="Create Fee Structure">
                <FieldGrid>
                  <SelectField label="Fee Type" value={structureForm.fee_type_id} onChange={(v) => setStructureForm((p) => ({ ...p, fee_type_id: v }))} items={feeTypes.map((f) => ({ id: f.id, label: f.name }))} />
                  <SelectField label="Course" value={structureForm.course_id} onChange={(v) => setStructureForm((p) => ({ ...p, course_id: v }))} items={courses.map((c) => ({ id: c.id, label: c.name }))} />
                  <SelectField label="Academic Year" value={structureForm.academic_year_id} onChange={(v) => setStructureForm((p) => ({ ...p, academic_year_id: v }))} items={years.map((y) => ({ id: y.id, label: y.label }))} />
                  <Field label="Amount"><Input type="number" value={structureForm.amount} onChange={(e) => setStructureForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
                  <SelectField label="Frequency" value={structureForm.frequency} onChange={(v) => setStructureForm((p) => ({ ...p, frequency: v }))} items={[
                    { id: "annual", label: "Annual" }, { id: "semester", label: "Semester" }, { id: "monthly", label: "Monthly" },
                  ]} />
                </FieldGrid>
                <Button className="mt-4" onClick={createStructure}><Plus className="mr-2 h-4 w-4" /> Create Structure</Button>
              </Panel>
            }
            right={<StructuresTable structures={structures} feeTypeById={feeTypeById} courseById={courseById} yearById={yearById} />}
          />
        </TabsContent>

        <TabsContent value="types">
          <TwoColumn
            left={
              <Panel title="Create Fee Type">
                <FieldGrid>
                  <Field label="Name"><Input value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} placeholder="Tuition Fee" /></Field>
                  <Field label="Description"><Input value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" /></Field>
                </FieldGrid>
                <Button className="mt-4" onClick={createType}><Plus className="mr-2 h-4 w-4" /> Create Type</Button>
              </Panel>
            }
            right={
              <Panel title="Fee Types">
                <div className="space-y-2">
                  {feeTypes.map((f) => (
                    <div key={f.id} className="rounded-md border border-border p-3">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-sm text-muted-foreground">{f.description || "No description"}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TwoColumn({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="grid gap-4 xl:grid-cols-[420px_1fr]">{left}{right}</div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function SelectField({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: { id: string; label: string }[] }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent className="max-h-72">
          {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

function Status({ value }: { value: StudentFee["status"] }) {
  const tone = value === "paid" ? "default" : value === "partial" ? "secondary" : value === "waived" ? "outline" : "destructive";
  return <Badge variant={tone as any}>{value}</Badge>;
}

function DuesTable({ fees }: { fees: StudentFee[] }) {
  return (
    <Panel title="Student Fee Ledger">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="py-2">Student</th><th>Fee</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="border-b border-border/70">
                <td className="py-3"><div className="font-medium">{fee.student_name || fee.student_id}</div><div className="text-xs text-muted-foreground">{fee.roll_number || "-"}</div></td>
                <td>{fee.fee_type_name || "Fee"}<div className="text-xs text-muted-foreground">{fee.course_name || "-"} {fee.academic_year_label || ""}</div></td>
                <td>{money(fee.amount_due)}</td>
                <td>{money(fee.amount_paid)}</td>
                <td>{money(Number(fee.amount_due || 0) - Number(fee.amount_paid || 0))}</td>
                <td><Status value={fee.status} /></td>
              </tr>
            ))}
            {fees.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No fee records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StructuresTable({ structures, feeTypeById, courseById, yearById }: { structures: FeeStructure[]; feeTypeById: Map<string, string>; courseById: Map<string, string>; yearById: Map<string, string> }) {
  return (
    <Panel title="Configured Structures">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="py-2">Fee Type</th><th>Course</th><th>Year</th><th>Frequency</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {structures.map((s) => (
              <tr key={s.id} className="border-b border-border/70">
                <td className="py-3 font-medium">{feeTypeById.get(s.fee_type_id) || "-"}</td>
                <td>{courseById.get(s.course_id) || "-"}</td>
                <td>{yearById.get(s.academic_year_id) || "-"}</td>
                <td className="capitalize">{s.frequency}</td>
                <td>{money(s.amount)}</td>
              </tr>
            ))}
            {structures.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No fee structures yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
