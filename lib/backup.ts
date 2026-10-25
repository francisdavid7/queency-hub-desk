import type { Table } from "dexie";

import { db } from "@/db/db";
import { getMeta } from "@/lib/meta";

/**
 * Download everything recorded on this till as JSON. A last-resort copy for
 * when the till can't reach the server; never includes tokens or passwords.
 */
export async function downloadBackup() {
  const [customers, services, receipts, receiptItems, payments, device] = await Promise.all([
    db.customers.toArray(),
    db.services.toArray(),
    db.receipts.toArray(),
    db.receiptItems.toArray(),
    db.payments.toArray(),
    getMeta("device"),
  ]);
  const backup = {
    format: "hubdesk-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    till: device ? { id: device.id, code: device.code, name: device.name } : null,
    customers,
    services,
    receipts,
    receiptItems,
    payments,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hubdesk-backup-${device?.code ?? "till"}-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return receipts.length;
}

/** Put rejected records back in the outbox (e.g. after a server-side fix). */
export async function retryFailedRecords() {
  const tables = [db.customers, db.services, db.receipts, db.payments] as unknown as Array<
    Table<{ syncStatus: string; syncError?: string }, string>
  >;
  let count = 0;
  for (const table of tables) {
    count += await table
      .where("syncStatus")
      .equals("failed")
      .modify({ syncStatus: "pending", syncError: undefined });
  }
  return count;
}
