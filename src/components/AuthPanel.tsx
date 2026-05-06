import { AuthView, SignedIn, SignedOut, UserButton } from "@neondatabase/neon-js/auth/react/ui";
import { authClient } from "../auth/client";

function UserSummary() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user;

  if (isPending) {
    return <p className="text-sm text-slate-600">Loading session...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-cedar">
          Signed in
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">
          {user?.name || user?.email || "MRP user"}
        </h2>
        {user?.email ? (
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-l-4 border-cedar bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Students</p>
          <p className="mt-1 text-2xl font-semibold text-ink">Ready</p>
        </div>
        <div className="border-l-4 border-fig bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Attendance</p>
          <p className="mt-1 text-2xl font-semibold text-ink">Ready</p>
        </div>
        <div className="border-l-4 border-saffron bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">RLS Data</p>
          <p className="mt-1 text-2xl font-semibold text-ink">Next</p>
        </div>
      </div>
    </div>
  );
}

export function AuthPanel() {
  return (
    <>
      <SignedOut>
        <section className="grid min-h-[520px] gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)]">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-cedar">
              MRP frontend
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              A static dashboard shell connected to Neon Auth.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              This app is built for GitHub Pages and keeps authentication close
              to the Neon database, ready for protected React screens and
              Row-Level Security backed data access.
            </p>
          </div>

          <div className="self-center border border-slate-200 bg-white p-5 shadow-sm">
            <AuthView />
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="space-y-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cedar">
                MRP dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-ink">
                Protected workspace
              </h1>
            </div>
            <UserButton />
          </header>

          <UserSummary />

          <div className="bg-ink p-6 text-white">
            <h2 className="text-xl font-semibold">Next data surface</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
              Add Neon Data API calls here once the database schema and RLS
              policies are ready. The current scaffold keeps auth, static
              hosting, and protected UI boundaries in place first.
            </p>
          </div>
        </section>
      </SignedIn>
    </>
  );
}
