"use client";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  variant?: "default" | "red" | "light" | (string & {});
};

export function BrandLogo({ size = 56, className = "", priority = false }: BrandLogoProps) {
  const src = "/kaitoodlogo.jpeg";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Uses the logo file uploaded separately to public/kaitoodlogo.jpeg.
    <img
      src={src}
      alt="เหนียวไก่เยอะโคตร logo"
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={`shrink-0 rounded-2xl bg-white object-contain ${className}`}
    />
  );
}
