import Image from "next/image";

import { cn } from "@/lib/utils";

export const DEFAULT_BRAND_LOGO = "/brand/tg-lab-logo-horizontal.png";

export function BrandLogo({
  className,
  name,
}: {
  className?: string;
  name: string;
}) {
  return (
    <span className={cn("block shrink-0", className)}>
      <Image
        src={DEFAULT_BRAND_LOGO}
        alt={`Logo de ${name}`}
        width={741}
        height={312}
        quality={100}
        sizes="(max-width: 640px) 104px, 152px"
        className="h-full w-auto object-contain"
      />
    </span>
  );
}
