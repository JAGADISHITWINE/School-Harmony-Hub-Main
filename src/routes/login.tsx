import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zResolver } from "@/modules/zodResolver";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";
import { isLikelyAuthenticated } from "@/lib/auth-guards";
import { api } from "@/services";
import { MENUS_ME_ENDPOINT } from "@/services/endpoints";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Scholaris" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && isLikelyAuthenticated()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormValues = z.infer<typeof schema>;
const REMEMBER_EMAIL_KEY = "sms_remember_email";

function LoginPage() {
  const login = useAuth(s => s.login);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const rememberedEmail =
    typeof window !== "undefined" ? localStorage.getItem(REMEMBER_EMAIL_KEY) || "" : "";
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zResolver(schema),
    defaultValues: { email: rememberedEmail, password: "" },
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    try {
      await login(v.email, v.password);
      try {
        await api.get(MENUS_ME_ENDPOINT);
      } catch {}
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, v.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-border">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(800px circle at 20% 20%, oklch(0.74 0.16 162 / 0.25), transparent 50%), radial-gradient(600px circle at 80% 80%, oklch(0.6 0.14 200 / 0.2), transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl grid place-items-center" style={{ background: "var(--gradient-emerald)" }}>
            <GraduationCap className="h-6 w-6 text-[oklch(0.18_0.02_160)]" />
          </div>
          <div>
            <p className="text-lg font-semibold">Scholaris</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">School Admin Suite</p>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight max-w-md">
            Manage your campus with one calm, focused workspace.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm">
            Students, staff, classes, attendance, fees and broadcasts — all behind one role-based dashboard.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">© Scholaris 2025</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8 bg-card border-border">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Use your admin credentials to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} className="bg-background" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember_me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember_me" className="text-sm font-normal cursor-pointer">Remember me</Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Demo accounts (password: admin123)</p>
            <p>admin@school.io — Super Admin</p>
            <p>priya@school.io — Admin</p>
            <p>john@school.io — Teacher</p>
            <p>maria@school.io — Accountant</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
