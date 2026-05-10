import {
  AuthView,
  SignedIn,
  SignedOut,
} from "@neondatabase/neon-js/auth/react/ui";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { CrudDashboard } from "./CrudDashboard";

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
  const {
    email,
    emailVerified,
    expiresAt,
    hasAdminUiAccess,
    image,
    isLoading,
    name,
    sessionId,
    userId,
  } = useAuth();

  if (isLoading) {
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
          {email ? (
            <p className="mt-1 text-sm text-slate-600">{email}</p>
          ) : null}
        </div>
      </div>

      <dl className="mt-6">
        <InfoRow label="Name" value={name} />
        <InfoRow label="Email" value={email} />
        <InfoRow
          label="Admin UI access"
          value={hasAdminUiAccess ? "Yes" : "No"}
        />
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

function AccountControls() {
  const { email, isSigningOut, name, signOut, signOutError } = useAuth();

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="text-left sm:text-right">
        <p className="text-sm font-semibold text-ink">{name || "Account"}</p>
        {email ? <p className="text-xs text-slate-600">{email}</p> : null}
      </div>
      <button
        className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSigningOut}
        onClick={() => void signOut().catch(() => undefined)}
        type="button"
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
      {signOutError ? (
        <p className="max-w-xs text-left text-xs leading-5 text-red-700 sm:text-right">
          {signOutError}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPanel({ appName = "MRP frontend" }: { appName?: string }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const { sessionId } = useAuth();

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
              {appName}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Sign in to MRP.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Use your username and password to access your account.
            </p>
          </div>

          <div className="mt-8 border border-slate-200 bg-white p-5 shadow-sm">
            <AuthView
              pathname={pathname}
              redirectTo={import.meta.env.BASE_URL}
            />
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="space-y-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cedar">
                {appName}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-ink">
                Admin workspace
              </h1>
            </div>
            <AccountControls />
          </header>

          <SignedInWorkspace key={sessionId ?? "signed-in"} />
        </section>
      </SignedIn>
    </>
  );
}

function SignedInWorkspace() {
  const { hasAdminUiAccess, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading your account...</p>
      </div>
    );
  }

  if (!hasAdminUiAccess) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <UserSummary />
        <div className="border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-fig">
            Access denied
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">
            This account is signed in but not on the admin allowlist.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            CRUD pages are hidden unless this public frontend allowlist includes
            your email. Database Row-Level Security controls the real
            permissions for every Data API request.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <UserSummary />
      <CrudDashboard />
    </>
  );
}
