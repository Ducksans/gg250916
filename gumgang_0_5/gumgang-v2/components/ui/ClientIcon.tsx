"use client";

import { useEffect, useState } from "react";

interface ClientIconProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Client-side only icon wrapper to prevent Dark Reader hydration issues
 * This component ensures icons are only rendered on the client side,
 * avoiding conflicts with Dark Reader's injected attributes
 */
export function ClientIcon({ children, className }: ClientIconProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a placeholder with the same dimensions during SSR
  if (!mounted) {
    return <div className={className} aria-hidden="true" />;
  }

  // Render the actual icon only on the client
  return <>{children}</>;
}

/**
 * SVG icon wrapper that's safe from Dark Reader interference
 */
export function SafeSvgIcon({
  className,
  viewBox = "0 0 24 24",
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 2,
  strokeLinecap = "round" as const,
  strokeLinejoin = "round" as const,
  children,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} aria-hidden="true" />;
  }

  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * Hook to check if component is mounted (client-side)
 */
export function useIsMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
