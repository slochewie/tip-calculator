import sevenShiftsLogoDark from "#/assets/7shifts-logo-dark.webp";
import sevenShiftsLogoLight from "#/assets/7shifts-logo-light.webp";
import { cn } from "#/lib/utils.ts";

export function SevenShiftsLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-5 shrink-0", className)}
    >
      <img
        alt=""
        className="size-full object-contain dark:hidden"
        src={sevenShiftsLogoLight}
      />
      <img
        alt=""
        className="hidden size-full object-contain dark:block"
        src={sevenShiftsLogoDark}
      />
    </span>
  );
}
