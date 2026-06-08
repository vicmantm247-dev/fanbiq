'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';

interface UserDetails {
  userId: string;
  email: string;
}

export default function VerifyPasswordChangeOTPPage() {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  // Fetch user details on mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await apiClient.get('/api/user/details');
        setUserDetails(response.data);
      } catch (error) {
        toast.error('Failed to load user details', {
          description: getErrorMessage(error),
        });
        router.push('/');
      }
    };

    fetchUserDetails();
  }, [router]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userDetails) return;

    if (otp.length !== 6) {
      toast.error('Invalid code', {
        description: 'Code must be 6 digits',
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/verify-password-change-otp', {
        userId: userDetails.userId,
        otp,
      });

      setIsVerified(true);
      toast.success('Code verified!', {
        description: 'Redirecting to password change...',
      });

      // Redirect to actual password change after showing success
      setTimeout(() => {
        router.push('/change-password/set-new-password');
      }, 1500);
    } catch (error) {
      toast.error('Invalid code', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!userDetails) return;

    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/request-password-change-otp', {
        userId: userDetails.userId,
        email: userDetails.email,
      });

      setOtp('');
      toast.success('New code sent', {
        description: 'Check your email for the verification code',
      });
    } catch (error) {
      toast.error('Failed to resend code', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userDetails) {
    return (
      <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans bg-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans bg-background">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 pt-[calc(env(safe-area-inset-top)+12px)] border-b">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
            disabled={isLoading}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold">Verify Code</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 top-20 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          <Card className="p-6 border">
            <div className="space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                {isVerified ? (
                  <CheckCircle2 className="size-12 text-green-500 animate-bounce" />
                ) : (
                  <div className="p-4 rounded-full bg-primary/10">
                    <span className="text-2xl">📧</span>
                  </div>
                )}
              </div>

              {/* Heading */}
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold">
                  {isVerified ? 'Code Verified!' : 'Enter Verification Code'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isVerified
                    ? 'You can now set your new password'
                    : 'We sent a 6-digit code to your email'}
                </p>
              </div>

              {!isVerified && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  {/* OTP Input */}
                  <div>
                    <label className="text-sm font-medium">Verification Code</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(value);
                      }}
                      maxLength={6}
                      disabled={isLoading}
                      className="text-center text-lg tracking-widest font-mono mt-2"
                    />
                  </div>

                  {/* Verify Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>

                  {/* Resend */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Didn't receive the code?
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      Resend Code
                    </Button>
                  </div>
                </form>
              )}

              {/* Cancel Button (shown if not verified) */}
              {!isVerified && (
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Cancel
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
