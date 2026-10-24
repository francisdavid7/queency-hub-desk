"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, Cloud, CloudOff, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import { getSyncState, subscribeSyncState, syncNow } from "@/lib/sync/client";

const SYNC_INTERVAL_MS = 60_000;
const CHANGE_DEBOUNCE_MS = 3_000;

const SERVER_STATE = { phase: "idle" as const };

function useSyncState() {
  return useSyncExternalStore(subscribeSyncState, getSyncState, () => SERVER_STATE);
}

/** Counts of local records waiting to sync or rejected by the server. */
function useOutbox() {
  return useLiveQuery(
    async () => {
      const tables = [db.customers, db.services, db.receipts, db.payments] as const;
      const counts = await Promise.all(
        tables.flatMap((table) => [
          table.where("syncStatus").equals("pending").count(),
          table.where("syncStatus").equals("failed").count(),
        ]),
      );
      return {
        pending: counts.filter((_, index) => index % 2 === 0).reduce((a, b) => a + b, 0),
        failed: counts.filter((_, index) => index % 2 === 1).reduce((a, b) => a + b, 0),
      };
    },
    [],
    { pending: 0, failed: 0 },
  );
}

/** Background sync: on start, on an interval, when back online, and after edits. */
export function SyncManager() {
  const { pending } = useOutbox();

  useEffect(() => {
    void syncNow();
    const interval = window.setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
    const onOnline = () => void syncNow();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    if (pending === 0) return;
    const timer = window.setTimeout(() => void syncNow(), CHANGE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return null;
}

function SyncIndicator() {
  const sync = useSyncState();
  const { pending, failed } = useOutbox();

  let label = "All changes synced";
  let Icon = Cloud;
  let tone = "text-success";
  if (sync.phase === "syncing") {
    label = "Syncing...";
    Icon = RefreshCw;
    tone = "text-muted-foreground animate-spin";
  } else if (sync.phase === "offline") {
    label = `Offline — ${pending} change${pending === 1 ? "" : "s"} saved on this till`;
    Icon = CloudOff;
    tone = "text-warning";
  } else if (sync.phase === "error" || sync.phase === "unauthorised" || failed > 0) {
    label =
      failed > 0
        ? `${failed} record${failed === 1 ? "" : "s"} rejected by the server`
        : (sync.error ?? "Sync failed");
    Icon = AlertTriangle;
    tone = "text-destructive";
  } else if (pending > 0) {
    label = `${pending} change${pending === 1 ? "" : "s"} waiting to sync`;
    Icon = RefreshCw;
    tone = "text-warning";
  }

  const lastSync = sync.lastSyncAt
    ? ` · Last synced ${new Intl.DateTimeFormat("en-NG", { timeStyle: "short" }).format(new Date(sync.lastSyncAt))}`
    : "";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={`${label}. Sync now.`}
      title={`${label}${lastSync}\nClick to sync now.`}
      onClick={() => void syncNow()}
      disabled={sync.phase === "syncing"}
    >
      <Icon className={`size-4 ${tone}`} />
    </Button>
  );
}

export default SyncIndicator;
