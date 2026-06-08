"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, RefreshCw } from "lucide-react";
import { useRuntimeConfig } from "@/lib/runtime-config";

// ── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email"),
  username: z
    .string()
    .min(3, "Min 3 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only"),
  password: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

// ── OTP Step ─────────────────────────────────────────────────────────────────

interface OtpStepProps {
  userId: string;
  email: string;
}

function OtpStep({ userId, email }: OtpStepProps) {
  const { basePath } = useRuntimeConfig();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const redirect = () => {
    const callbackUrl = searchParams.get("callbackUrl") || `${basePath}/`;
    window.location.href = callbackUrl;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);

    toast.promise(
      apiClient.post("/api/auth/verify", { userId, otp }).then((r) => r.data),
      {
        loading: "Verifying...",
        success: () => {
          redirect();
          return "Email verified — welcome!";
        },
        error: (err) => {
          setLoading(false);
          return { message: "Verification failed", description: getErrorMessage(err) };
        },
        position: "top-right",
      }
    );
  };

  const handleResend = async () => {
    setResending(true);
    toast.promise(
      apiClient.post("/api/auth/resend-verification", { userId }).then((r) => r.data),
      {
        loading: "Sending new code...",
        success: () => {
          setResending(false);
          return "New code sent to your email";
        },
        error: (err) => {
          setResending(false);
          return { message: "Could not resend code", description: getErrorMessage(err) };
        },
        position: "top-right",
      }
    );
  };

  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-muted p-3">
          <Mail className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-xs text-muted-foreground">
          We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          onComplete={handleVerify}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button
        className="w-full font-semibold"
        onClick={handleVerify}
        disabled={loading || otp.length !== 6}
      >
        {loading ? "Verifying..." : "Verify"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground text-xs gap-1.5"
        onClick={handleResend}
        disabled={resending}
      >
        <RefreshCw className={`size-3 ${resending ? "animate-spin" : ""}`} />
        Resend code
      </Button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NativeView() {
  const { basePath } = useRuntimeConfig();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("login");
  const [pendingVerification, setPendingVerification] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  const redirect = () => {
    const callbackUrl = searchParams.get("callbackUrl") || `${basePath}/`;
    window.location.href = callbackUrl;
  };

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrUsername: "", password: "" },
  });

  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
  });

  const handleLogin = loginForm.handleSubmit((data) => {
    toast.promise(
      apiClient
        .post("/api/auth/login", {
          username: data.emailOrUsername,
          password: data.password,
          provider: "native",
        })
        .then((r) => r.data),
      {
        loading: "Logging in...",
        success: (res) => {
          if (res.needsVerification) {
            setPendingVerification({ userId: res.userId, email: data.emailOrUsername });
            return "Please verify your email first";
          }
          redirect();
          return "Logged in!";
        },
        error: (err) => {
          const errData = err?.response?.data;
          if (errData?.needsVerification && errData?.userId) {
            setPendingVerification({ userId: errData.userId, email: data.emailOrUsername });
          }
          return { message: "Login failed", description: getErrorMessage(err) };
        },
        position: "top-right",
      }
    );
  });

  const handleSignup = signupForm.handleSubmit((data) => {
    toast.promise(
      apiClient
        .post("/api/auth/register", {
          email: data.email,
          username: data.username,
          password: data.password,
        })
        .then((r) => r.data),
      {
        loading: "Creating account...",
        success: (res) => {
          setPendingVerification({ userId: res.userId, email: res.email });
          return "Account created — check your email for the verification code";
        },
        error: (err) => ({
          message: "Sign up failed",
          description: getErrorMessage(err),
        }),
        position: "top-right",
      }
    );
  });

  // ── OTP step takes over when pending ────────────────────────────────────
  if (pendingVerification) {
    return (
      <OtpStep
        userId={pendingVerification.userId}
        email={pendingVerification.email}
      />
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="login">Log in</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>

      {/* ── Login Tab ── */}
      <TabsContent value="login" className="space-y-4">
        <form onSubmit={handleLogin} className="space-y-3">
          <CardDescription>Enter your email or username to continue</CardDescription>

          <div className="space-y-1">
            <Input
              placeholder="Email or username"
              autoComplete="email"
              {...loginForm.register("emailOrUsername")}
              className="bg-muted border-input"
            />
            {loginForm.formState.errors.emailOrUsername && (
              <p className="text-xs text-destructive">{loginForm.formState.errors.emailOrUsername.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <PasswordInput
              placeholder="Password"
              autoComplete="current-password"
              {...loginForm.register("password")}
            />
            {loginForm.formState.errors.password && (
              <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-semibold"
            disabled={loginForm.formState.isSubmitting}
          >
            {loginForm.formState.isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </TabsContent>

      {/* ── Signup Tab ── */}
      <TabsContent value="signup" className="space-y-4">
        <form onSubmit={handleSignup} className="space-y-3">
          <CardDescription>Create an account to start swiping</CardDescription>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              placeholder="you@example.com"
              autoComplete="email"
              type="email"
              {...signupForm.register("email")}
              className="bg-muted border-input"
            />
            {signupForm.formState.errors.email && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Username</Label>
            <Input
              placeholder="cooluser42"
              autoComplete="username"
              {...signupForm.register("username")}
              className="bg-muted border-input"
            />
            {signupForm.formState.errors.username && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Password</Label>
            <PasswordInput
              placeholder="Min 8 characters"
              autoComplete="new-password"
              {...signupForm.register("password")}
            />
            {signupForm.formState.errors.password && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Confirm password</Label>
            <PasswordInput
              placeholder="Repeat password"
              autoComplete="new-password"
              {...signupForm.register("confirmPassword")}
            />
            {signupForm.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-semibold"
            disabled={signupForm.formState.isSubmitting}
          >
            {signupForm.formState.isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}