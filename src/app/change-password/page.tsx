'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to the OTP request page
export default function ChangePasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/change-password/request-otp');
  }, [router]);

  return null;
}
