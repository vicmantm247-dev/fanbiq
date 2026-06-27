"use client";

import { Sun, Moon, Bookmark, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "next-themes";
import { useSettings } from "@/lib/settings";
import { SettingsSection } from "./SettingsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/api";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { ProviderType } from "@/lib/providers/types";

export function GeneralSettings() {
    const { setTheme, resolvedTheme: theme } = useTheme();
    const { settings, updateSettings } = useSettings();
    const { data: sessionStatus, isLoading } = useSession();
    const runtimeConfig = useRuntimeConfig();

    const provider = sessionStatus?.provider || runtimeConfig.provider;
    const showCollectionToggle = provider === ProviderType.JELLYFIN && runtimeConfig.useWatchlist;

    return (
        <SettingsSection title="General">
            <div className="grid grid-flow-col items-center justify-between gap-2">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <div className="text-sm font-medium">Theme</div>
                    </div>
                    <div className="text-xs text-muted-foreground text-pretty">Switch between light and dark mode</div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-26"
                >
                    {theme === "light" ? (
                        <><Sun className="size-4" /> Light</>
                    ) : (
                        <><Moon className="size-4" /> Dark</>
                    )}
                </Button>
            </div>

            {isLoading ? (
                <>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-flow-col items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-9 w-26 rounded-md" />
                        </div>
                    ))}
                </>
            ) : (
                <>
                    {showCollectionToggle && (
                        <div className="grid grid-flow-col items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <div className="text-sm font-medium">Collection Type</div>
                                <div className="text-xs text-muted-foreground text-pretty">Toggle between Watchlist and Favorites</div>
                            </div>
                            <Toggle
                                pressed={settings.useWatchlist}
                                onPressedChange={(pressed) => updateSettings({ useWatchlist: pressed })}
                                variant="outline"
                                size="sm"
                                className="w-26"
                            >
                                {settings.useWatchlist ? <Bookmark className="size-4" /> : <Star className="size-4" />}
                                {settings.useWatchlist ? "Watchlist" : "Favorites"}
                            </Toggle>
                        </div>
                    )}
                </>
            )}
        </SettingsSection>
    );
}
