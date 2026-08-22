import * as React from "react";

import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "h-9 w-full min-w-0 rounded-lg border border-input bg-white px-3 py-2",
        "text-sm text-foreground outline-none",
        "transition-[border-color,box-shadow,background-color] duration-200",

        // Placeholder
        "placeholder:text-muted-foreground/80",

        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent",
        "file:text-sm file:font-medium file:text-foreground",

        // Hover
        "hover:border-foreground/15",

        // Focus
        "focus-visible:border-primary/50",
        "focus-visible:ring-3",
        "focus-visible:ring-primary/10",

        // Disabled
        "disabled:pointer-events-none",
        "disabled:cursor-not-allowed",
        "disabled:bg-muted/60",
        "disabled:text-muted-foreground",
        "disabled:opacity-70",

        // Invalid / Error
        "aria-invalid:border-destructive",
        "aria-invalid:ring-3",
        "aria-invalid:ring-destructive/10",

        // Dark mode
        "dark:bg-input/20",
        "dark:hover:border-foreground/20",
        "dark:disabled:bg-input/30",
        "dark:aria-invalid:border-destructive/60",
        "dark:aria-invalid:ring-destructive/15",

        className,
      )}
      {...props}
    />
  );
}

export { Input };
