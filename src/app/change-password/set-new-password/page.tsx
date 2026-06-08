'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const setNewPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  currentPassword: z.string().min(1, 'Current password is required'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetNewPasswordForm = z.infer<typeof setNewPasswordSchema>;

interface UserDetails {
  userId: string;
}

export default function SetNewPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  const form = useForm<SetNewPasswordForm>({
    resolver: zodResolver(setNewPasswordSchema),
    defaultValues: {
      newPassword: '',
      currentPassword: '',
      confirmPassword: '',
    },
  });

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

  const onSubmit = async (data: SetNewPasswordForm) => {
    if (!userDetails) return;

    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/change-password', {
        userId: userDetails.userId,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast.success('Password changed successfully', {
        description: 'Your password has been updated.',
      });

      form.reset();
      setTimeout(() => router.push('/'), 1500);
    } catch (error) {
      toast.error('Failed to change password', {
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
          <h1 className="text-xl font-bold">Set New Password</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 top-20 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          <Card className="p-6 border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Info box */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    Your password must contain:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4">
                    <li>• At least 8 characters</li>
                    <li>• At least one uppercase letter</li>
                    <li>• At least one lowercase letter</li>
                    <li>• At least one number</li>
                  </ul>
                </div>

                {/* Current Password */}
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder="Enter your current password"
                            disabled={isLoading}
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="size-4 text-muted-foreground" />
                            ) : (
                              <Eye className="size-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* New Password */}
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Enter your new password"
                            disabled={isLoading}
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="size-4 text-muted-foreground" />
                            ) : (
                              <Eye className="size-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your new password"
                            disabled={isLoading}
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="size-4 text-muted-foreground" />
                            ) : (
                              <Eye className="size-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Changing Password...' : 'Change Password'}
                </Button>

                {/* Cancel Button */}
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
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </main>
  );
}
