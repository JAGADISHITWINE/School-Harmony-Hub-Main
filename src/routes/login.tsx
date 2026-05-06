import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zResolver } from "@/modules/zodResolver";
import { Eye, EyeOff, GraduationCap, Loader2, BookOpen, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";
import { api } from "@/services";
import { MENUS_ME_ENDPOINT } from "@/services/endpoints";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Scholaris" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type FormValues = z.infer<typeof schema>;

const REMEMBER_EMAIL_KEY = "sms_remember_email";
const REMEMBER_PASSWORD_KEY = "sms_remember_password";
const REMEMBER_ME_KEY = "sms_remember_me";

function LoginPage() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const rememberedEmail =
    typeof window !== "undefined" ? localStorage.getItem(REMEMBER_EMAIL_KEY) || "" : "";
  const rememberedPassword =
    typeof window !== "undefined" ? localStorage.getItem(REMEMBER_PASSWORD_KEY) || "" : "";
  const rememberedMe =
    typeof window !== "undefined" ? localStorage.getItem(REMEMBER_ME_KEY) === "true" : false;

  const [rememberMe, setRememberMe] = useState(rememberedMe);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zResolver(schema),
    defaultValues: { email: rememberedEmail, password: rememberedPassword },
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    try {
      await login(v.email, v.password);
      try { await api.get(MENUS_ME_ENDPOINT); } catch {}

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, v.email);
        localStorage.setItem(REMEMBER_PASSWORD_KEY, v.password);
        localStorage.setItem(REMEMBER_ME_KEY, "true");
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_PASSWORD_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* ═══════════════════════════════════════
          LEFT PANEL — dark navy brand side
      ═══════════════════════════════════════ */}
      <div className="login-left hidden lg:flex flex-col justify-between p-12">

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="login-logo-mark h-11 w-11 rounded-xl grid place-items-center">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="login-brand-name text-lg">Scholaris</p>
            <p className="login-brand-sub">School Admin Suite</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-5">
          <h2 className="login-heading">
            Manage your campus with one{" "}
            <em className="gold">calm, focused</em>{" "}
            workspace.
          </h2>
          <p className="login-subtext">
            Students, staff, classes, attendance, fees and broadcasts —
            all behind one role-based dashboard.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="login-feature-pill">
              <span className="pill-dot" />
              <Users size={13} />
              Role-based access
            </span>
            <span className="login-feature-pill">
              <span className="pill-dot" />
              <BookOpen size={13} />
              Class management
            </span>
            <span className="login-feature-pill">
              <span className="pill-dot" />
              <BarChart3 size={13} />
              Live analytics
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="login-copyright relative z-10">© Scholaris 2025</p>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT PANEL — clean light form side
      ═══════════════════════════════════════ */}
      <div className="login-right p-6 sm:p-12">
        <Card className="login-card w-full max-w-md p-8">

          {/* Mobile logo (shown only when left panel is hidden) */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div
              className="h-8 w-8 rounded-lg grid place-items-center"
              style={{ background: "var(--gradient-gold)" }}
            >
              <GraduationCap className="h-4 w-4 text-[oklch(0.12_0.03_260)]" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Scholaris</span>
          </div>

          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm mt-1">
            Use your admin credentials to continue.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="you@school.edu" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(c) => setRememberMe(c === true)}
              />
              <Label className="text-sm font-normal cursor-pointer">Remember me</Label>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
