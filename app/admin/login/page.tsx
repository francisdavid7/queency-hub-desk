import Image from "next/image";
import { redirect } from "next/navigation";

import { ActionForm, SubmitButton } from "@/components/admin/form-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/lib/admin/actions";
import { getSessionUser } from "@/lib/auth/session";
import logo from "@/public/logo-blue.png";

export const metadata = { title: "Admin sign in · HubDesk" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  const { error } = await searchParams;
  if (user?.role === "ADMIN") redirect("/admin");

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src={logo} alt="Queency Hub" className="mx-auto w-36" priority />
          <CardTitle className="mt-4 text-lg">Admin dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to view sales, cashier activity and reports.
          </p>
        </CardHeader>
        <CardContent>
          <ActionForm action={loginAction} className="space-y-3" resetOnSuccess={false}>
            <Input name="userName" autoComplete="username" placeholder="Username" required autoFocus />
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              required
            />
            {error === "forbidden" && (
              <p className="text-sm text-destructive">That account isn&apos;t an administrator.</p>
            )}
            <SubmitButton className="w-full" pendingLabel="Signing in...">
              Sign in
            </SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
