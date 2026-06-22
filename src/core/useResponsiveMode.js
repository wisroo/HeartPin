import { useEffect, useState } from "react";

const isMobileNow = () => window.matchMedia("(max-width: 760px)").matches;

export function useResponsiveMode() {
  const [isMobile, setIsMobile] = useState(isMobileNow);

  useEffect(() => {
    const onResize = () => setIsMobile(isMobileNow());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile ? "mobile" : "web";
}
