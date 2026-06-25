"use client";
import { LikesList } from "@/components/likes/LikesList";
import { SwipeVideoFeed } from "@/components/deck/SwipeVideoFeed";
import { GalleryHorizontalEnd, Heart, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/animate-ui/components/animate/tabs";
import { SettingsSidebar } from "@/components/home/SettingsSidebar";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { TabsContents } from "@/components/animate-ui/primitives/animate/tabs";
import { cn } from "@/lib/utils";
import { DynamicBackground } from "@/components/deck/DynamicBackground";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const [tab, setTab] = useState("swipe");
  const router = useRouter();
  const isSwipeTabActive = tab === "swipe";

  useHotkeys("1", () => setTab("swipe"), []);
  useHotkeys("2", () => setTab("likes"), []);

  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      <DynamicBackground show={tab === "swipe"} />

      <div className="absolute inset-x-0 top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top)+2.2rem)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
          <div className="flex w-full items-center justify-between gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-6 size-10 hover:bg-muted/30"
              onClick={() => router.push("/search")}
            >
              <Search className="size-5.5 text-white" />
            </Button>
            <SettingsSidebar />
          </div>
          <div className="flex w-full justify-center -mt-8">
            <Tabs value={tab} onValueChange={setTab} className="w-full max-w-sm">
              <TabsList className="grid mx-auto h-fit grid-cols-2 bg-muted/30 rounded-full z-0">
                <TabsTrigger value="swipe" className="h-11 w-16 group rounded-full z-0">
                  <GalleryHorizontalEnd
                    className="size-5 z-0 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
                  />
                </TabsTrigger>
                <TabsTrigger value="likes" className="h-11 w-16 group rounded-full z-0">
                  <Heart
                    className="size-5 z-0 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
                  />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="absolute inset-0">
        <Tabs value={tab} onValueChange={setTab} className="h-full">
          <TabsContents className="grid h-full">
            <TabsContent value="swipe" className={cn("h-full w-full outline-none transition-opacity duration ease-in-out opacity-100", tab !== "swipe" && "opacity-0")}>
              <div className="w-full h-full">
                <SwipeVideoFeed isActive={isSwipeTabActive} />
              </div>
            </TabsContent>
            <TabsContent value="likes" className={cn("h-full w-full outline-none transition-opacity duration ease-in-out opacity-100", tab !== "likes" && "opacity-0")}>
              <div className="mx-auto h-full w-full max-w-3xl px-4 pt-24 md:pt-28">
                <LikesList />
              </div>
            </TabsContent>
          </TabsContents>
        </Tabs>
      </div>
    </main>
  );
}
