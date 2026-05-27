import { useNavigate } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";
import { AuthProvider } from "./auth/AuthContext";
import { AuthPanel } from "./components/AuthPanel";
import { authClient, configStatus, hasAppConfig } from "./auth/client";

const appBasePath = import.meta.env.BASE_URL;
const trimmedBasePath = appBasePath.endsWith("/")
  ? appBasePath.slice(0, -1)
  : appBasePath;
const authBasePath = `${trimmedBasePath}/auth`;

const appName = "\u0645\u0646\u0635\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062C\u062F";

function toRouterPath(href: string) {
  if (appBasePath !== "/" && href.startsWith(appBasePath)) {
    return `/${href.slice(appBasePath.length)}`;
  }

  return href;
}

function AuthLink({
  children,
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
}) {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      !href.startsWith(appBasePath)
    ) {
      return;
    }

    event.preventDefault();
    void navigate({ to: toRouterPath(href) });
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export default function App() {
  const navigate = useNavigate();

  if (!hasAppConfig) {
    return (
      <main dir="rtl" className="min-h-screen bg-paper text-ink">
        <div className="masjid-pattern mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-5 sm:px-6 sm:py-8">
          <div className="relative rounded-3xl border border-white/70 bg-white/85 p-4 shadow-2xl shadow-cedar/10 backdrop-blur sm:p-6 md:p-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-cedar/10 px-3 py-2 text-xs font-bold text-cedar sm:px-4 sm:text-sm">
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">{appName}</span>
                </div>
                <h1 className="mt-5 text-2xl font-bold leading-tight text-ink sm:text-4xl md:text-5xl">
                  {"\u064A\u0644\u0632\u0645 \u0625\u0643\u0645\u0627\u0644 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0642\u0628\u0644 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0645\u0646\u0635\u0629."}
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-700 sm:mt-5 sm:text-base md:text-lg">
                  {"\u062A\u0623\u0643\u062F \u0645\u0646 \u0636\u0628\u0637 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Neon Auth \u0648\u0648\u0627\u062C\u0647\u0629 \u0628\u064A\u0627\u0646\u0627\u062A Neon \u0648\u0642\u0627\u0626\u0645\u0629 \u0645\u062F\u064A\u0631\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u062D\u062A\u0649 \u062A\u0639\u0645\u0644 \u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0628\u0623\u0645\u0627\u0646."}
                </p>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-saffron/15 text-saffron">
                <AlertTriangle className="h-8 w-8" aria-hidden="true" />
              </div>
            </div>

            <ul className="mt-6 grid gap-3 text-sm text-slate-700 sm:mt-8 md:grid-cols-2">
              <ConfigItem
                label={"\u0631\u0627\u0628\u0637 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644"}
                name="VITE_NEON_AUTH_URL"
                ok={configStatus.hasAuthConfig}
              />
              <ConfigItem
                label={"\u0631\u0627\u0628\u0637 \u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A"}
                name="VITE_NEON_DATA_API_URL"
                ok={configStatus.hasDataApiConfig}
              />
            </ul>
          </div>
        </div>
      </main>
    );
  }

  return (
    <NeonAuthUIProvider
      authClient={authClient as never}
      basePath={authBasePath}
      credentials={{
        forgotPassword: true,
        rememberMe: true,
        usernameRequired: false,
      }}
      Link={AuthLink}
      navigate={(href) => void navigate({ to: toRouterPath(href) })}
      redirectTo={appBasePath}
      replace={(href) => void navigate({ to: toRouterPath(href), replace: true })}
    >
      <AuthProvider>
        <main dir="rtl" className="min-h-screen bg-paper text-ink">
          <div className="w-full px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
            <AuthPanel appName={appName} />
          </div>
        </main>
      </AuthProvider>
    </NeonAuthUIProvider>
  );
}

function ConfigItem({
  label,
  name,
  ok,
}: {
  label: string;
  name: string;
  ok: boolean;
}) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
            ok ? "bg-cedar/10 text-cedar" : "bg-amber-50 text-amber-800"
          }`}
        >
          {ok ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <span>
          <span className="block font-bold text-ink">{label}</span>
          <span className="mt-1 block break-all text-xs text-slate-500">
            {name}
          </span>
          <span
            className={`mt-2 block text-xs font-bold ${
              ok ? "text-cedar" : "text-amber-800"
            }`}
          >
            {ok
              ? "\u0645\u0636\u0628\u0648\u0637"
              : "\u0645\u0641\u0642\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"}
          </span>
        </span>
      </div>
    </li>
  );
}
