"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface JoinPromptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinPromptSheet({ open, onOpenChange }: JoinPromptSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl p-6">
        <h3 className="text-lg font-semibold mb-2">Enjoyed the flick?</h3>
        <p className="text-sm text-muted-foreground mb-4">Join fanbIQ to like, comment, and save flicks — it only takes a moment.</p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </Button>
          <Button
            onClick={() => {
              setLoading(true);
              // redirect to login with callback to current path
              const cb = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
              router.push(`/login?callbackUrl=${encodeURIComponent(cb)}`);
            }}
            disabled={loading}
          >
            Join now
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
