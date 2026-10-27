import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export function useBreakpoint(): {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
} {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 1200;
  });

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const isDesktop = width >= 1100;

  const breakpoint: Breakpoint = isMobile
    ? "mobile"
    : isTablet
    ? "tablet"
    : "desktop";

  return { breakpoint, isMobile, isTablet, isDesktop, width };
}
