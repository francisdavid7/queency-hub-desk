"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

interface GsapTransitionProps {
  animationKey: string;
  children: ReactNode;
  className?: string;
  staggerItems?: boolean;
  watchPathname?: boolean;
}

function GsapTransition({
  animationKey,
  children,
  className,
  staggerItems = false,
  watchPathname = false,
}: GsapTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const transitionKey = watchPathname ? `${pathname}:${animationKey}` : animationKey;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        container,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.38, ease: "power2.out" },
      );

      if (staggerItems) {
        const items = container.querySelectorAll("[data-gsap-item]");
        if (items.length > 0) {
          gsap.fromTo(
            items,
            { autoAlpha: 0, y: 12 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.34,
              stagger: 0.06,
              delay: 0.06,
              ease: "power2.out",
            },
          );
        }
      }
    }, container);

    return () => context.revert();
  }, [staggerItems, transitionKey]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export default GsapTransition;
