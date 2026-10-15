"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import Header from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "Use the bright appearance.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use the darker appearance.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance.",
    icon: Monitor,
  },
] as const;

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="space-y-6">
      <Header
        heading="Settings"
        description="Choose how Queency HubDesk looks on this device."
      />

      <Card data-gsap-item className="max-w-3xl">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Select a theme. System mode automatically follows your device
            preference.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {themeOptions.map(({ value, label, description, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={theme === value ? "secondary" : "outline"}
              className="h-auto min-h-28 flex-col items-start justify-start gap-3 p-4 text-left whitespace-normal"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              <span className="flex w-full items-center justify-between">
                <span className="font-semibold">{label}</span>
                <Icon className="size-4 text-muted-foreground" />
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {description}
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

export default SettingsPage;
