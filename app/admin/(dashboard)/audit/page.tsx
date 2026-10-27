import { formatDateTime, PageHeader, Pagination } from "@/components/admin/widgets";
import { requireAdmin } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuditLog } from "@/lib/admin/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Admin signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "Admin signed out",
  "auth.till_login": "Till sign-in",
  "device.registered": "Till registered",
  "device.revoked": "Till revoked",
  "user.created": "User created",
  "user.updated": "User updated",
  "user.password_reset": "Password reset",
  "receipt.voided": "Receipt voided",
  "receipt.rejected": "Receipt rejected by server",
  "service.updated": "Service changed",
  "settings.updated": "Settings changed",
};

function describe(details: unknown) {
  if (!details || typeof details !== "object") return "";
  return Object.entries(details as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  // Pages can render without their layout, so each checks auth itself.
  await requireAdmin();
  const params = await searchParams;
  const action = one(params.action);
  const page = Number(one(params.page)) || 1;
  const log = await getAuditLog(page, action && action in ACTION_LABELS ? action : undefined);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every sign-in, void, price change and account change, newest first."
        actions={
          <form method="get" className="flex gap-2">
            <select
              name="action"
              defaultValue={action ?? ""}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All events</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              Filter
            </button>
          </form>
        }
      />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.rows.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                <TableCell className={entry.action === "receipt.voided" || entry.action === "auth.login_failed" ? "font-medium text-destructive" : ""}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </TableCell>
                <TableCell>{entry.actor?.name ?? "—"}</TableCell>
                <TableCell className="max-w-md whitespace-normal break-words text-xs text-muted-foreground">
                  {describe(entry.details)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{entry.ipAddress ?? ""}</TableCell>
              </TableRow>
            ))}
            {log.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No events.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <Pagination page={log.page} pageCount={log.pageCount} params={{ action }} />
    </>
  );
}
