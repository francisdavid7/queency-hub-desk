"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useLiveQuery } from "dexie-react-hooks";
import { LockKeyhole, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db/db";
import { useCashierSession } from "@/hooks/custom/use-cashier-session";
import { useOnlineStatus } from "@/hooks/custom/use-online-status";
import { signInToTill } from "@/lib/auth/till-auth";
import logo from "../../public/logo-blue.png";

function TillSignIn() {
  const isOnline = useOnlineStatus();
  const isRegistered = useLiveQuery(
    async () => Boolean(await db.meta.get("device")),
    [],
    true,
  );
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signInToTill(userName, password);
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : "Sign-in failed.",
      );
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src={logo} alt="Queency Hub" className="mx-auto w-36" priority />
          <CardTitle className="mt-4 flex items-center justify-center gap-2 text-lg">
            <LockKeyhole className="size-4" />
            Sign in to the till
          </CardTitle>
          {!isRegistered && (
            <p className="text-sm text-muted-foreground">
              First-time setup: an administrator must sign in while online to
              register this till.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <Input
              autoFocus
              autoComplete="username"
              placeholder="Username"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              aria-label="Username"
            />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-label="Password"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !userName.trim() || !password}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
            {!isOnline && (
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <WifiOff className="size-3.5" />
                Offline — only users who signed in here before can unlock.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shows the cashier sign-in screen until someone unlocks the till. */
function TillGate({ children }: { children: ReactNode }) {
  const session = useCashierSession();
  if (!session) return <TillSignIn />;
  return <>{children}</>;
}

export default TillGate;
