"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import "@/hooks/custom/use-install-prompt";
import { syncNow } from "@/lib/sync/client";

/**
 * Till-side PWA plumbing: registers the service worker, offers updates without
 * interrupting a sale, asks for persistent storage, and adds desktop shortcuts.
 */
function PwaProvider() {
  const router = useRouter();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  // Only reload when the user chose to apply an update. The first install
  // also fires controllerchange (clients.claim) and must not reload the page.
  const restartRequested = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let updateTimer: number | undefined;
    const onControllerChange = () => {
      if (!restartRequested.current) return;
      restartRequested.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            // "installed" with an existing controller means an update is ready.
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(worker);
            }
          });
        });
        // Check for a new version every 30 minutes while the till is open.
        updateTimer = window.setInterval(() => void registration.update(), 30 * 60_000);
      })
      .catch((error) => console.error("Service worker registration failed", error));

    return () => {
      window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    // Without this, the browser may evict IndexedDB under disk pressure.
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        router.push("/receipts/new");
      } else if (event.key === "F8") {
        event.preventDefault();
        void syncNow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg"
    >
      <Download className="size-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm">
        A new version of HubDesk is ready. Finish the current receipt, then restart.
      </p>
      <Button
        size="sm"
        onClick={() => {
          restartRequested.current = true;
          waiting.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        Restart
      </Button>
    </div>
  );
}

export default PwaProvider;
