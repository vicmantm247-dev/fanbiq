'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';

interface UserDetails {
  userId: string;
  email: string;
  username: string;
}

export default function RequestPasswordChangeOTPPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleRequestOTP = async () => {
    if (!userDetails) return;

    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/request-password-change-otp', {
        userId: userDetails.userId,
        email: userDetails.email,
      });

      toast.success('OTP sent to your email', {
        description: 'Check your inbox for the verification code',
      });

      // Navigate to verify OTP page
      router.push('/change-password/verify-otp');
    } catch (error) {
      toast.error('Failed to send OTP', {
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
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold">Change Password</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 top-20 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          <Card className="p-6 border">
            <div className="space-y-6 text-center">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Lock className="size-8 text-primary" />
                </div>
              </div>

              {/* Heading */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Verify Your Identity</h2>
                <p className="text-sm text-muted-foreground">
                  We'll send a verification code to your email to confirm it's really you.
                </p>
              </div>

              {/* Email display */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Verification code will be sent to</p>
                <p className="font-medium truncate">{userDetails.email}</p>
              </div>

              {/* Info */}
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-muted-foreground">
                  The code will expire in <span className="font-semibold">10 minutes</span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleRequestOTP}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
