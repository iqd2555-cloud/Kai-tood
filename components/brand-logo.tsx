import Image from "next/image";
import { BRAND_NAME } from "@/lib/brand";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = 56, className = "", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand-logo.svg"
      alt={`${BRAND_NAME} logo`}
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 rounded-2xl ${className}`}
    />
  );
}
