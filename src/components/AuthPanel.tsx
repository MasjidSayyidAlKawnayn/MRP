import {
  AuthView,
  SignedIn,
  SignedOut,
} from "@neondatabase/neon-js/auth/react/ui";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings2,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  CrudDashboard,
  SchemaSettingsPage,
  getConfiguredSchemas,
} from "./CrudDashboard";
import type { EntityKey, SchemaName } from "../crud/entities";
import {
  dashboardPath,
  getDefaultEntityKey,
  getDefaultSchema,
  validateEntityKey,
  validateSchema,
  type RouteSearch,
  type ViewMode,
  type WorkspacePage,
} from "../routing";

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
  settings: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
  profileTitle: "\u0645\u0644\u0641 \u0627\u0644\u062D\u0633\u0627\u0628",
  profileBody:
    "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0647\u0648\u064A\u0629 \u0648\u0627\u0644\u062C\u0644\u0633\u0629 \u0648\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644.",
  welcomeTitle: "\u0623\u0647\u0644\u0627 \u0628\u0643 \u0641\u064A \u0645\u0633\u0627\u062D\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062C\u062F.",
  welcomeBody: "\u0633\u062C\u0644 \u062F\u062E\u0648\u0644\u0643 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0648\u0627\u0644\u062D\u0636\u0648\u0631 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062D\u062F.",
  accessDenied: "\u0627\u0644\u0648\u0635\u0648\u0644 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
  deniedTitle: "\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0643\u0646\u0647 \u0644\u064A\u0633 \u0636\u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062F\u064A\u0631\u064A\u0646.",
  deniedBody: "\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u062A\u0638\u0647\u0631 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647\u0627 \u0641\u0642\u0637\u060C \u0648\u062A\u0628\u0642\u0649 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0647\u064A \u0627\u0644\u0645\u0631\u062C\u0639 \u0627\u0644\u0646\u0647\u0627\u0626\u064A.",
};
type WorkspaceRouteState = {
  attendanceTaking?: boolean;
  canonicalPath?: string;
  entity: EntityKey;
  mode: ViewMode;
  page: WorkspacePage;
  rowId?: string;
  schema: SchemaName;
  search: RouteSearch;
};

function getWorkspaceRouteState(
  pathname: string,
  search: RouteSearch,
  schemas: SchemaName[],
): WorkspaceRouteState {
  const parts = pathname.split("/").filter(Boolean);
  const page = parts[0];
  const defaultSchema = getDefaultSchema(schemas);

  if (page === "profile") {
    return {
      entity: getDefaultEntityKey(defaultSchema),
      mode: "list",
      page: "profile",
      schema: defaultSchema,
      search,
    };
  }

  if (page === "settings") {
    return {
      entity: getDefaultEntityKey(defaultSchema),
      mode: "list",
      page: "settings",
      schema: defaultSchema,
      search,
    };
  }

  const schema = validateSchema(parts[1], schemas);
  const entity = validateEntityKey(schema, parts[2]);
  const attendanceTaking = entity === "attendanceRecords" && parts[3] === "take";
  const rowId =
    parts[3] && parts[3] !== "new" && !attendanceTaking
      ? decodeURIComponent(parts[3])
      : undefined;
  const mode: ViewMode =
    parts[3] === "new" ? "create" : parts[4] === "edit" ? "edit" : rowId ? "detail" : "list";

  return {
    canonicalPath: dashboardPath({
      schema,
      entity,
      mode,
      rowId,
      subpage: attendanceTaking ? "take" : undefined,
    }),
    attendanceTaking,
    entity,
    mode,
    page: "dashboard",
    rowId,
    schema,
    search,
  };
}

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
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-cedar/5 backdrop-blur sm:p-5">
      <div className="mb-6">
        <p className="text-sm font-bold text-cedar">{text.profile}</p>
        <h2 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          {text.profileTitle}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {text.profileBody}
        </p>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {image ? (
            <img
              alt=""
              className="h-16 w-16 rounded-2xl border border-slate-200 object-cover sm:h-20 sm:w-20 sm:rounded-3xl"
              src={image}
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cedar text-xl font-bold text-white shadow-lg shadow-cedar/25 sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">
              {(name || email || text.account).slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-cedar/10 px-3 py-1 text-xs font-bold text-cedar">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{text.signedIn}</span>
            </p>
            <h2 className="mt-3 truncate text-xl font-bold text-ink sm:text-2xl">
              {name || email || text.account}
            </h2>
            {email ? <p className="mt-1 break-all text-sm text-slate-600">{email}</p> : null}
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

function AccountControls({ dashboardSchema }: { dashboardSchema: SchemaName }) {
  const { email, image, isSigningOut, name, signOut, signOutError } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const initials = (name || email || text.account).slice(0, 1).toUpperCase();

  return (
    <div className="relative self-end" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition hover:border-cedar/30 hover:bg-cedar/5"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {image ? (
          <img
            alt=""
            className="h-10 w-10 rounded-xl object-cover"
            src={image}
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cedar text-base font-bold text-white">
            {initials}
          </span>
        )}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 z-[100] mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-right shadow-2xl shadow-slate-900/10"
          role="menu"
        >
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="truncate text-sm font-bold text-ink">
              {name || text.account}
            </p>
            {email ? (
              <p className="mt-1 break-all text-xs text-slate-600">{email}</p>
            ) : null}
          </div>
          <button
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar"
            onClick={() => {
              setIsOpen(false);
              void navigate({
                to: dashboardPath({
                  schema: dashboardSchema,
                  entity: getDefaultEntityKey(dashboardSchema),
                }),
              });
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.dashboard}</span>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar"
            onClick={() => {
              setIsOpen(false);
              void navigate({ to: "/profile" });
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.profile}</span>
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar"
            onClick={() => {
              setIsOpen(false);
              void navigate({ to: "/settings" });
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.settings}</span>
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar disabled:opacity-60"
            disabled={isSigningOut}
            onClick={() => void signOut().catch(() => undefined)}
            role="menuitem"
            type="button"
          >
            <span>{isSigningOut ? text.signingOut : text.signOut}</span>
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {signOutError ? (
        <p className="absolute left-0 mt-2 w-64 text-right text-xs leading-5 text-amber-800">
          {signOutError}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPanel({ appName }: { appName: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const schemas = useMemo(() => getConfiguredSchemas(), []);
  const routeState = getWorkspaceRouteState(
    location.pathname,
    location.search as RouteSearch,
    schemas,
  );

  useEffect(() => {
    if (
      location.pathname.startsWith("/dashboard") &&
      routeState.canonicalPath &&
      location.pathname !== routeState.canonicalPath
    ) {
      void navigate({
        to: routeState.canonicalPath,
        replace: true,
        search: location.search as RouteSearch,
      });
    }
  }, [location.pathname, location.search, navigate, routeState.canonicalPath]);

  return (
    <>
      <SignedOut>
        <section className="masjid-pattern mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-5 py-3 sm:gap-8 sm:py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.65fr)]">
          <div className="relative order-2 lg:order-1">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-cedar/10 px-3 py-2 text-xs font-bold text-cedar sm:px-4 sm:text-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{appName}</span>
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-ink sm:mt-5 sm:text-5xl lg:text-6xl">
              {text.welcomeTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700 sm:mt-5 sm:text-lg">
              {text.welcomeBody}
            </p>
          </div>

          <div className="relative order-1 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl shadow-cedar/10 backdrop-blur sm:p-5 lg:order-2">
            <AuthView pathname={location.pathname} redirectTo={import.meta.env.BASE_URL} />
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="space-y-4 sm:space-y-6">
          <SignedInWorkspace
            key={sessionId ?? "signed-in"}
            routeState={routeState}
            schemas={schemas}
          />
        </section>
      </SignedIn>
    </>
  );
}

function SignedInWorkspace({
  routeState,
  schemas,
}: {
  routeState: WorkspaceRouteState;
  schemas: SchemaName[];
}) {
  const { hasAdminUiAccess, isLoading } = useAuth();
  const navigate = useNavigate();
  const topAccessory = <AccountControls dashboardSchema={routeState.schema} />;

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
        <div className="rounded-3xl border border-amber-100 bg-white/90 p-6 shadow-xl shadow-amber-950/5">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
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

  if (routeState.page === "profile") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <UserSummary />
      </>
    );
  }

  if (routeState.page === "settings") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <SchemaSettingsPage
          activeSchema={routeState.schema}
          onSelect={(schema) =>
            void navigate({
              to: dashboardPath({
                schema,
                entity: getDefaultEntityKey(schema),
              }),
            })
          }
          schemas={schemas}
        />
      </>
    );
  }

  return (
    <CrudDashboard
      activeEntityKey={routeState.entity}
      activeSchema={routeState.schema}
      mode={routeState.mode}
      rowId={routeState.rowId}
      routeSearch={routeState.search}
      attendanceTaking={routeState.attendanceTaking}
      topAccessory={topAccessory}
    />
  );
}
