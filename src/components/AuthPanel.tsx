import {
  AuthView,
  SignedIn,
  SignedOut,
} from "@neondatabase/neon-js/auth/react/ui";
import {
  CheckCircle2,
  Clock3,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { CrudDashboard } from "./CrudDashboard";

type WorkspacePage = "dashboard" | "profile";

const text = {
  loadingAccount: "\u062C\u0627\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628...",
  notAvailable: "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
  signedIn: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644",
  account: "\u0627\u0644\u062D\u0633\u0627\u0628",
  name: "\u0627\u0644\u0627\u0633\u0645",
  email: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
  admin: "\u0645\u062F\u064A\u0631",
  verified: "\u062A\u062D\u0642\u0642 \u0627\u0644\u0628\u0631\u064A\u062F",
  userId: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
  sessionId: "\u0645\u0639\u0631\u0641 \u0627\u0644\u062C\u0644\u0633\u0629",
  expires: "\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629",
  yes: "\u0646\u0639\u0645",
  no: "\u0644\u0627",
  signOut: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C",
  signingOut: "\u062C\u0627\u0631 \u0627\u0644\u062E\u0631\u0648\u062C...",
  workspace: "\u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629",
  dashboard: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629",
  profile: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A",
  profileTitle: "\u0645\u0644\u0641 \u0627\u0644\u062D\u0633\u0627\u0628",
  profileBody:
    "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0647\u0648\u064A\u0629 \u0648\u0627\u0644\u062C\u0644\u0633\u0629 \u0648\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644.",
  welcomeTitle: "\u0623\u0647\u0644\u0627 \u0628\u0643 \u0641\u064A \u0645\u0633\u0627\u062D\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062C\u062F.",
  welcomeBody: "\u0633\u062C\u0644 \u062F\u062E\u0648\u0644\u0643 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0648\u0627\u0644\u062D\u0636\u0648\u0631 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062D\u062F.",
  accessDenied: "\u0627\u0644\u0648\u0635\u0648\u0644 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
  deniedTitle: "\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0643\u0646\u0647 \u0644\u064A\u0633 \u0636\u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062F\u064A\u0631\u064A\u0646.",
  deniedBody: "\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u062A\u0638\u0647\u0631 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647\u0627 \u0641\u0642\u0637\u060C \u0648\u062A\u0628\u0642\u0649 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0647\u064A \u0627\u0644\u0645\u0631\u062C\u0639 \u0627\u0644\u0646\u0647\u0627\u0626\u064A.",
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-cedar shadow-sm">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold text-slate-500">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold text-ink">
          {value || text.notAvailable}
        </dd>
      </div>
    </div>
  );
}

function UserSummary() {
  const {
    email,
    emailVerified,
    expiresAt,
    image,
    hasAdminUiAccess,
    isLoading,
    name,
    sessionId,
    userId,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <p className="text-sm text-slate-600">{text.loadingAccount}</p>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl shadow-cedar/5 backdrop-blur">
      <div className="mb-6">
        <p className="text-sm font-bold text-cedar">{text.profile}</p>
        <h2 className="mt-1 text-3xl font-bold text-ink">
          {text.profileTitle}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {text.profileBody}
        </p>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {image ? (
            <img
              alt=""
              className="h-20 w-20 rounded-3xl border border-slate-200 object-cover"
              src={image}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cedar text-2xl font-bold text-white shadow-lg shadow-cedar/25">
              {(name || email || text.account).slice(0, 1).toUpperCase()}
            </div>
          )}

          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-cedar/10 px-3 py-1 text-xs font-bold text-cedar">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {text.signedIn}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-ink">
              {name || email || text.account}
            </h2>
            {email ? <p className="mt-1 text-sm text-slate-600">{email}</p> : null}
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InfoRow icon={<UserRound className="h-4 w-4" />} label={text.name} value={name} />
        <InfoRow icon={<Mail className="h-4 w-4" />} label={text.email} value={email} />
        <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label={text.admin} value={hasAdminUiAccess ? text.yes : text.no} />
        <InfoRow
          icon={emailVerified ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          label={text.verified}
          value={emailVerified === undefined ? undefined : emailVerified ? text.yes : text.no}
        />
        <InfoRow icon={<KeyRound className="h-4 w-4" />} label={text.userId} value={userId} />
        <InfoRow icon={<Clock3 className="h-4 w-4" />} label={text.expires} value={expiresAt} />
        <InfoRow icon={<KeyRound className="h-4 w-4" />} label={text.sessionId} value={sessionId} />
      </dl>
    </section>
  );
}

function AccountControls() {
  const { email, isSigningOut, name, signOut, signOutError } = useAuth();

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="text-right">
        <p className="text-sm font-bold text-ink">{name || text.account}</p>
        {email ? <p className="text-xs text-slate-600">{email}</p> : null}
      </div>
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-cedar/30 hover:bg-cedar/5 disabled:opacity-60"
        disabled={isSigningOut}
        onClick={() => void signOut().catch(() => undefined)}
        type="button"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isSigningOut ? text.signingOut : text.signOut}
      </button>
      {signOutError ? (
        <p className="max-w-xs text-right text-xs leading-5 text-red-700">
          {signOutError}
        </p>
      ) : null}
    </div>
  );
}

function WorkspaceTabs({
  activePage,
  onSelect,
}: {
  activePage: WorkspacePage;
  onSelect: (page: WorkspacePage) => void;
}) {
  const tabs: {
    icon: typeof LayoutDashboard;
    label: string;
    page: WorkspacePage;
  }[] = [
    { icon: LayoutDashboard, label: text.dashboard, page: "dashboard" },
    { icon: UserRound, label: text.profile, page: "profile" },
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm">
      {tabs.map(({ icon: Icon, label, page }) => (
        <button
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
            activePage === page
              ? "bg-cedar text-white shadow-md shadow-cedar/20"
              : "text-slate-600 hover:bg-cedar/5 hover:text-cedar"
          }`}
          key={page}
          onClick={() => onSelect(page)}
          type="button"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function AuthPanel({ appName }: { appName: string }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [workspacePage, setWorkspacePage] =
    useState<WorkspacePage>("dashboard");
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
        <section className="masjid-pattern mx-auto grid min-h-[650px] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.65fr)]">
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-cedar/10 px-4 py-2 text-sm font-bold text-cedar">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {appName}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-6xl">
              {text.welcomeTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              {text.welcomeBody}
            </p>
          </div>

          <div className="relative rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-2xl shadow-cedar/10 backdrop-blur">
            <AuthView pathname={pathname} redirectTo={import.meta.env.BASE_URL} />
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="space-y-6">
          <header className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-cedar/5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-cedar/10 px-3 py-1 text-xs font-bold text-cedar">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  {appName}
                </p>
                <h1 className="mt-3 text-3xl font-bold text-ink">
                  {text.workspace}
                </h1>
              </div>
              <WorkspaceTabs
                activePage={workspacePage}
                onSelect={setWorkspacePage}
              />
              <AccountControls />
            </div>
          </header>

          <SignedInWorkspace
            key={sessionId ?? "signed-in"}
            page={workspacePage}
          />
        </section>
      </SignedIn>
    </>
  );
}

function SignedInWorkspace({ page }: { page: WorkspacePage }) {
  const { hasAdminUiAccess, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <p className="text-sm text-slate-600">{text.loadingAccount}</p>
      </div>
    );
  }

  if (!hasAdminUiAccess) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="rounded-3xl border border-red-100 bg-white/90 p-6 shadow-xl shadow-red-950/5">
          <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {text.accessDenied}
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-9 text-ink">
            {text.deniedTitle}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {text.deniedBody}
          </p>
        </div>
        <UserSummary />
      </div>
    );
  }

  return page === "profile" ? <UserSummary /> : <CrudDashboard />;
}
