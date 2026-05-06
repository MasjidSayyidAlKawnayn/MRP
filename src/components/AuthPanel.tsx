import { AuthView, SignedIn, SignedOut, UserButton } from "@neondatabase/neon-js/auth/react/ui";
import { useEffect, useState } from "react";
import { authClient } from "../auth/client";

function getStringField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field : undefined;
}

function getBooleanField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "boolean" ? field : undefined;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="border-b border-slate-200 py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base text-ink">
        {value || "Not available"}
      </dd>
    </div>
  );
}

function UserSummary() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const session = data?.session;
  const name = getStringField(user, "name");
  const email = getStringField(user, "email");
  const image = getStringField(user, "image");
  const userId = getStringField(user, "id");
  const emailVerified = getBooleanField(user, "emailVerified");
  const sessionId = getStringField(session, "id");
  const expiresAt = getStringField(session, "expiresAt");

  if (isPending) {
    return (
      <div className="border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading your account...</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {image ? (
          <img
            alt=""
            className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            src={image}
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cedar text-2xl font-semibold text-white">
            {(name || email || "G").slice(0, 1).toUpperCase()}
          </div>
        )}

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cedar">
            Signed in
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            {name || email || "Account"}
          </h2>
          {email ? <p className="mt-1 text-sm text-slate-600">{email}</p> : null}
        </div>
      </div>

      <dl className="mt-6">
        <InfoRow label="Name" value={name} />
        <InfoRow label="Email" value={email} />
        <InfoRow
          label="Email verified"
          value={
            emailVerified === undefined
              ? undefined
              : emailVerified
                ? "Yes"
                : "No"
          }
        />
        <InfoRow label="User ID" value={userId} />
        <InfoRow label="Session ID" value={sessionId} />
        <InfoRow label="Session expires" value={expiresAt} />
      </dl>
    </div>
  );
}

export function AuthPanel() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    function syncPathname() {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", syncPathname);
    return () => window.removeEventListener("popstate", syncPathname);
  }, []);

  return (
    <>
      <SignedOut>
        <section className="mx-auto flex min-h-[520px] max-w-xl flex-col justify-center">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-cedar">
              MRP frontend
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Sign in to MRP.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Use your username and password to access your account.
            </p>
          </div>

          <div className="mt-8 border border-slate-200 bg-white p-5 shadow-sm">
            <AuthView pathname={pathname} redirectTo={import.meta.env.BASE_URL} />
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="space-y-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cedar">
                MRP frontend
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-ink">
                Your account
              </h1>
            </div>
            <UserButton />
          </header>

          <UserSummary />
        </section>
      </SignedIn>
    </>
  );
}
