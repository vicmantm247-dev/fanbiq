"use client";
import { CardDeck } from "@/components/deck/CardDeck";
import { SessionManager } from "@/components/session/SessionManager";
import { LikesList } from "@/components/likes/LikesList";
import { FlicksFeed } from "@/components/flicks/Flicksfeed";
import { SearchTab } from "@/components/search/SearchTab";
import { GalleryHorizontalEnd, Heart, Clapperboard, Plus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/animate-ui/components/animate/tabs";
import { SettingsSidebar } from "@/components/home/SettingsSidebar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DynamicBackground } from "@/components/deck/DynamicBackground";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState("flicks");

  useHotkeys("1", () => setTab("swipe"), []);
  useHotkeys("2", () => setTab("likes"), []);
  useHotkeys("3", () => setTab("upload"), []);
  useHotkeys("4", () => setTab("search"), []);
  useHotkeys("5", () => setTab("flicks"), []);

  return (
    <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans pb-28">
      <DynamicBackground show={tab === "swipe"} />

      {/* ── Full-screen tab panels ── */}

      {/* Flicks — true fullscreen */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-200",
        tab === "flicks" ? "opacity-100 pointer-events-auto z-20" : "opacity-0 pointer-events-none z-10"
      )}>
        <FlicksFeed active={tab === "flicks"} />
      </div>

      {/* Likes */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-200",
        tab === "likes" ? "opacity-100 pointer-events-auto z-20" : "opacity-0 pointer-events-none z-10"
      )}>
        <div className="h-full w-full max-w-md mx-auto px-6 pt-20 pb-2">
          <LikesList />
        </div>
      </div>

      {/* Swipe */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-200",
        tab === "swipe" ? "opacity-100 pointer-events-auto z-20" : "opacity-0 pointer-events-none z-10"
      )}>
        {/* top padding clears the overlay header (~pt-24) + bottom padding clears controls */}
        <div className="h-full w-full max-w-md mx-auto px-6 pt-12 pb-2 flex flex-col">
          <CardDeck />
        </div>
      </div>

      {/* Search */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-200",
        tab === "search" ? "opacity-100 pointer-events-auto z-20" : "opacity-0 pointer-events-none z-10"
      )}>
        <SearchTab />
      </div>

      {/* Upload is a separate route — handled via tab bar navigation */}

      {/* ── Overlay header */}
      <div className="absolute top-0 inset-x-0 z-20 pt-[calc(env(safe-area-inset-top)+12px)] pointer-events-none flex flex-col items-center">
        <div className="w-full max-w-md pointer-events-auto">
          <SessionManager />
          <SettingsSidebar />
        </div>
      </div>

      {/* ── Bottom-centered tab bar */}
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <Tabs value={tab} onValueChange={(value) => {
          setTab(value);
          if (value === 'upload') {
            router.push('/flicks/upload');
          }
        }}>
          <TabsList className={cn(
            "grid h-14 grid-cols-5 gap-2 rounded-full px-2 transition-colors duration-300",
            "bg-muted/80 backdrop-blur-xl border border-white/10 shadow-xl"
          )}>
            <TabsTrigger value="flicks" className="rounded-full">
              <Clapperboard className={cn(
                "size-5 transition-all",
                tab === "flicks" ? "text-foreground" : "text-muted-foreground"
              )} />
            </TabsTrigger>
            <TabsTrigger value="likes" className="rounded-full">
              <Heart className={cn(
                "size-5 transition-all",
                tab === "likes" ? "text-foreground" : "text-muted-foreground"
              )} />
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Plus className="size-5" />
            </TabsTrigger>
            <TabsTrigger value="search" className="rounded-full">
              <Search className={cn(
                "size-5 transition-all",
                tab === "search" ? "text-foreground" : "text-muted-foreground"
              )} />
            </TabsTrigger>
            <TabsTrigger value="swipe" className="rounded-full">
              <GalleryHorizontalEnd className={cn(
                "size-5 transition-all",
                tab === "swipe" ? "text-foreground" : "text-muted-foreground"
              )} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </main>
  );
}