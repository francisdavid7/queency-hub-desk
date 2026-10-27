"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DatabaseBackup,
  HardDriveDownload,
  Keyboard,
  Monitor,
  Moon,
  Printer,
  RefreshCw,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import Header from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/db";
import { useInstallPrompt } from "@/hooks/custom/use-install-prompt";
import { downloadBackup, retryFailedRecords } from "@/lib/backup";
import { getMeta, setMeta } from "@/lib/meta";
import { syncNow } from "@/lib/sync/client";
import type { PaperWidth } from "@/types/meta";

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

const paperOptions: Array<{ value: PaperWidth; label: string; description: string }> = [
  { value: "80mm", label: "80mm roll", description: "Standard thermal receipt printer." },
  { value: "58mm", label: "58mm roll", description: "Compact thermal printer." },
  { value: "A4", label: "A4 page", description: "Office printer, full-page receipt." },
];

const shortcuts = [
  ["F2", "New receipt"],
  ["Ctrl + K", "Search customers, receipts, services"],
  ["F8", "Sync now"],
  ["Ctrl + P", "Print (on a receipt)"],
];

const formatWhen = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Never";

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { canInstall, install } = useInstallPrompt();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const till = useLiveQuery(async () => {
    const counts = await Promise.all(
      [db.customers, db.services, db.receipts, db.payments].flatMap((table) => [
        table.where("syncStatus").equals("pending").count(),
        table.where("syncStatus").equals("failed").count(),
      ]),
    );
    return {
      paperWidth: (await getMeta("paperWidth")) ?? "80mm",
      device: await getMeta("device"),
      lastSyncAt: await getMeta("lastSyncAt"),
      pending: counts.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0),
      failed: counts.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0),
    };
  }, []);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const handleBackup = async () => {
    const count = await downloadBackup();
    toast.success("Backup downloaded", { description: `${count} receipts exported.` });
  };

  const handleRetry = async () => {
    const count = await retryFailedRecords();
    toast.info(`Retrying ${count} record${count === 1 ? "" : "s"}…`);
    await syncNow();
  };

  return (
    <section className="space-y-6">
      <Header
        heading="Settings"
        description="Printer, sync, backups and appearance for this till."
      />

      <Card data-gsap-item className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="size-4" /> Receipt printer
          </CardTitle>
          <CardDescription>
            Paper size used when you print. In the print dialog choose your receipt
            printer and set margins to “None”. To print without the dialog, see
            “One-click printing” in the README.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {paperOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={till?.paperWidth === option.value ? "secondary" : "outline"}
              className="h-auto min-h-20 flex-col items-start justify-start gap-1 p-4 text-left whitespace-normal"
              aria-pressed={till?.paperWidth === option.value}
              onClick={() => void setMeta("paperWidth", option.value)}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card data-gsap-item className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="size-4" /> Till & sync
          </CardTitle>
          <CardDescription>
            Receipts are saved on this computer first and copied to the cloud
            whenever there is internet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Till</dt><dd className="font-medium">{till?.device ? `${till.device.name} (${till.device.code})` : "Not registered"}</dd></div>
            <div><dt className="text-muted-foreground">Last synced</dt><dd className="font-medium">{formatWhen(till?.lastSyncAt)}</dd></div>
            <div><dt className="text-muted-foreground">Waiting to sync</dt><dd className="font-medium">{till?.pending ?? 0}</dd></div>
            <div>
              <dt className="text-muted-foreground">Rejected by server</dt>
              <dd className={`font-medium ${till?.failed ? "text-destructive" : ""}`}>{till?.failed ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Storage protection</dt>
              <dd className={`font-medium ${persisted === false ? "text-warning" : ""}`}>
                {persisted === null ? "Unknown" : persisted ? "On — data won't be cleared automatically" : "Off — install the app to enable"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void syncNow()}>
              <RefreshCw className="size-4" /> Sync now
            </Button>
            {Boolean(till?.failed) && (
              <Button type="button" variant="outline" onClick={() => void handleRetry()}>
                Retry rejected records
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => void handleBackup()}>
              <DatabaseBackup className="size-4" /> Download backup
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-gsap-item className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDriveDownload className="size-4" /> Install on this computer
          </CardTitle>
          <CardDescription>
            Installing gives HubDesk its own window, taskbar icon and Start menu
            entry, and lets it open without internet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canInstall ? (
            <Button type="button" onClick={() => void install()}>
              Install HubDesk
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Already installed, or use the install icon in the Edge/Chrome address bar
              (⋯ menu → Apps → Install HubDesk).
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-gsap-item className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="size-4" /> Keyboard shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          {shortcuts.map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <span>{action}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">{keys}</kbd>
            </div>
          ))}
        </CardContent>
      </Card>

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
