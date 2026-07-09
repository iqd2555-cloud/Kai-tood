"use client";

import { BRAND_NAME } from "@/lib/brand";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  variant?: "default" | "red";
};

export function BrandLogo({ size = 56, className = "", priority = false }: BrandLogoProps) {
  const src = "/kaitoodlogo.jpeg";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Uses the logo file uploaded separately to public/kaitoodlogo.jpeg.
    <img
      src={src}
      alt={`${BRAND_NAME} logo`}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={(event) => {
        if (event.currentTarget.src.endsWith("/brand-logo.svg")) return;
        event.currentTarget.src = "/brand-logo.svg";
      }}
      className={`shrink-0 rounded-2xl bg-white object-contain ${className}`}
    />
  );
}
