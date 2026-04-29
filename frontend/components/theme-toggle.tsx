"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={toggleTheme}
      className={className}
      suppressHydrationWarning
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="flex items-center gap-2">
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"} mode</span>
      </span>
    </Button>
  );
}