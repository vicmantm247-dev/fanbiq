'use client';

import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/hooks/api";

export function ChangePasswordSettings() {
    const { data: sessionStatus } = useSession();
    
    // Only show for native auth users (not guest or external auth)
    if (!sessionStatus || sessionStatus.isGuest) {
        return null;
    }

    return (
        <SettingsSection title="Security">
            <Link href="/change-password/request-otp">
                <Button
                    variant="outline"
                    className="w-full justify-between font-normal h-12 px-3 py-7"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md text-primary">
                            <Lock className="size-4" />
                        </div>
                        <span>Change Password</span>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                </Button>
            </Link>
        </SettingsSection>
    );
}
