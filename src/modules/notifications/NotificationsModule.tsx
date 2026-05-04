import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCrudModule } from "@/modules/createCrudModule";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { StatusBadge } from "@/components/common/StatusBadge";
import { zResolver } from "@/modules/zodResolver";
import type { NotificationRecord } from "@/types";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(1000),
  channel: z.enum(["email","sms","both"]),
  audience: z.string().trim().min(2).max(80),
  status: z.enum(["sent","draft","failed"]),
  sentAt: z.string().min(1),
});
type V = z.infer<typeof schema>;

export const NotificationsModule = createCrudModule<NotificationRecord, V>({
  base: "/notifications",
  title: "Notifications",
  description: "Send broadcasts via email or SMS and view delivery history.",
  singular: "Message",
  selectable: true,
  permissions: { view: "notifications.view", manage: "notifications.manage" },
  resolver: zResolver(schema),
  defaultValues: { title: "", message: "", channel: "email", audience: "All Parents", status: "draft", sentAt: new Date().toISOString().slice(0,10) },
  toFormValues: (n) => ({ title: n.title, message: n.message, channel: n.channel, audience: n.audience, status: n.status, sentAt: n.sentAt }),
  columns: [
    { key: "title", header: "Title", sortable: true, cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: "audience", header: "Audience", sortable: true, cell: (r) => r.audience },
    { key: "channel", header: "Channel", cell: (r) => <span className="capitalize">{r.channel}</span> },
    { key: "sentAt", header: "Date", sortable: true, cell: (r) => <span className="text-muted-foreground">{r.sentAt}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
  ],
  renderForm: (form) => {
    const { register, watch, setValue, formState: { errors } } = form;
    return (
      <div className="space-y-4">
        <Field label="Title" error={errors.title?.message as string}><Input {...register("title")} /></Field>
        <Field label="Message" error={errors.message?.message as string}><Textarea rows={5} {...register("message")} /></Field>
        <FieldGrid>
          <Field label="Audience" error={errors.audience?.message as string}><Input {...register("audience")} /></Field>
          <Field label="Date"><Input type="date" {...register("sentAt")} /></Field>
          <Field label="Channel">
            <Select value={watch("channel")} onValueChange={(v)=>setValue("channel", v as any, { shouldValidate: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="both">Email + SMS</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={watch("status")} onValueChange={(v)=>setValue("status", v as any, { shouldValidate: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>
      </div>
    );
  },
});