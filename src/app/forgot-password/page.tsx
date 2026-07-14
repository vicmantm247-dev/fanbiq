"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().email("Invalid email"),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const handleRequestOtp = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post("/api/auth/request-password-change-otp", {
        email: data.email,
      });

      setUserId(response.data.userId);
      setEmail(data.email);
      setStep("verify");

      toast.success("Verification code sent", {
        description: "Check your inbox for the 6-digit code.",
      });
    } catch (error) {
      toast.error("Unable to send code", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!userId || otp.length !== 6) return;
    setIsLoading(true);

    try {
      await apiClient.post("/api/auth/verify-password-change-otp", {
        userId,
        otp,
      });

      setStep("reset");
      toast.success("Code verified", {
        description: "Now set your new password.",
      });
    } catch (error) {
      toast.error("Verification failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId || !email) return;
    setIsLoading(true);

    try {
      await apiClient.post("/api/auth/request-password-change-otp", {
        userId,
        email,
      });

      toast.success("Code resent", {
        description: "Check your inbox for the new code.",
      });
    } catch (error) {
      toast.error("Unable to resend code", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (data: PasswordFormData) => {
    if (!userId || otp.length !== 6) return;
    setIsLoading(true);

    try {
      await apiClient.post("/api/auth/reset-password", {
        userId,
        otp,
        newPassword: data.newPassword,
      });

      toast.success("Password reset", {
        description: "You can now log in with your new password.",
      });
      router.push("/login");
    } catch (error) {
      toast.error("Reset failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans bg-background">
      <div className="absolute inset-0 top-20 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          <Card className="p-6 border">
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">Forgot Password</h1>
                <p className="text-sm text-muted-foreground">
                  {step === "request" && "Enter your email and we’ll send a verification code."}
                  {step === "verify" && "Enter the 6-digit code sent to your email."}
                  {step === "reset" && "Create a new password for your account."}
                </p>
              </div>

              {step === "request" && (
                <form onSubmit={emailForm.handleSubmit(handleRequestOtp)} className="space-y-5">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...emailForm.register("email")}
                      className="bg-muted border-input"
                    />
                    {emailForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full font-semibold" disabled={emailForm.formState.isSubmitting || isLoading}>
                    {emailForm.formState.isSubmitting || isLoading ? "Sending..." : "Send reset code"}
                  </Button>
                </form>
              )}

              {step === "verify" && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input value={email} readOnly className="bg-muted border-input" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Verification code</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="bg-muted border-input text-center tracking-[0.3em]"
                    />
                  </div>

                  <Button onClick={handleVerify} className="w-full font-semibold" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? "Verifying..." : "Verify code"}
                  </Button>

                  <Button variant="outline" onClick={handleResend} className="w-full" disabled={isLoading}>
                    Resend code
                  </Button>
                </div>
              )}

              {step === "reset" && (
                <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-5">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">New password</Label>
                    <PasswordInput
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      {...passwordForm.register("newPassword")}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Confirm password</Label>
                    <PasswordInput
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      {...passwordForm.register("confirmPassword")}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full font-semibold" disabled={passwordForm.formState.isSubmitting || isLoading}>
                    {passwordForm.formState.isSubmitting || isLoading ? "Resetting..." : "Reset password"}
                  </Button>
                </form>
              )}

              <CardDescription>
                {step === "request" && "We’ll email you a code so you can reset your password."}
                {step === "verify" && "If you didn’t receive the code, try resending it."}
                {step === "reset" && "Use a strong new password to keep your account secure."}
              </CardDescription>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
