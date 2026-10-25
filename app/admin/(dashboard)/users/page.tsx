import { ActionForm, SubmitButton } from "@/components/admin/form-controls";
import { formatDateTime, PageHeader } from "@/components/admin/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createUserAction,
  resetPasswordAction,
  revokeDeviceAction,
  setUserActiveAction,
} from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma/prisma";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const [users, devices] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.device.findMany({
      orderBy: { createdAt: "desc" },
      include: { registeredBy: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Users & tills"
        description="Staff accounts and the tills allowed to sync. Cashiers sign in on the till; admins can also use this dashboard."
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Add a staff member</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={createUserAction} className="grid gap-2 md:grid-cols-[1fr_1fr_140px_1fr_auto]">
            <Input name="name" placeholder="Full name" required />
            <Input name="userName" placeholder="Username" autoComplete="off" required />
            <select name="role" defaultValue="CASHIER" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Input name="password" type="password" placeholder="Temporary password" autoComplete="new-password" required minLength={8} />
            <SubmitButton>Add</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Staff</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {user.name} <span className="text-sm text-muted-foreground">@{user.userName}</span>
                </p>
                <p className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <Badge variant="outline">{user.role.toLowerCase()}</Badge>
                  {!user.isActive && <Badge variant="destructive">inactive</Badge>}
                  <span>Last sign-in: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "never"}</span>
                </p>
              </div>
              <ActionForm action={resetPasswordAction} className="flex gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <Input name="password" type="password" placeholder="New password" autoComplete="new-password" minLength={8} required className="w-40" />
                <SubmitButton variant="outline">Reset</SubmitButton>
              </ActionForm>
              {user.id !== admin.id && (
                <form action={setUserActiveAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="isActive" value={user.isActive ? "false" : "true"} />
                  <Button type="submit" variant={user.isActive ? "ghost" : "secondary"} size="sm">
                    {user.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tills</CardTitle>
          <p className="text-sm text-muted-foreground">
            A till is registered the first time an admin signs in on it. Revoke a lost or replaced
            till to stop it syncing — it locks itself on its next sync.
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {devices.length === 0 && <p className="px-6 pb-6 text-sm text-muted-foreground">No tills registered yet.</p>}
          {devices.map((device) => (
            <div key={device.id} className="flex items-center gap-3 px-6 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {device.name} <span className="text-sm text-muted-foreground">({device.code})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Registered {formatDateTime(device.createdAt)} by {device.registeredBy.name} · Last seen{" "}
                  {device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "never"}
                </p>
              </div>
              {device.revokedAt ? (
                <Badge variant="destructive">Revoked</Badge>
              ) : (
                <form action={revokeDeviceAction}>
                  <input type="hidden" name="deviceId" value={device.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    Revoke
                  </Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
