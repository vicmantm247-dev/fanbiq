"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RouteVideoPauseHandler() {
  const pathname = usePathname();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (pathname === "/") return;

    const videos = document.querySelectorAll<HTMLVideoElement>("video");
    videos.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
  }, [pathname]);

  return null;
}
