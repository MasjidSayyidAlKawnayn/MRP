import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { AuthProvider } from "./auth/AuthContext";
import { AuthPanel } from "./components/AuthPanel";
import { authClient, configStatus, hasAppConfig } from "./auth/client";

const appBasePath = import.meta.env.BASE_URL;
const trimmedBasePath = appBasePath.endsWith("/")
  ? appBasePath.slice(0, -1)
  : appBasePath;
const authBasePath = `${trimmedBasePath}/auth`;

function updateUrl(href: string, mode: "push" | "replace") {
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    window.location.href = href;
    return;
  }

  if (mode === "replace") {
    window.history.replaceState(null, "", href);
  } else {
    window.history.pushState(null, "", href);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
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
    updateUrl(href, "push");
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export default function App() {
  if (!hasAppConfig) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-8 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-cedar">
            MRP frontend
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            MRP frontend is not configured.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Set the required Neon Auth, Neon Data API, and admin allowlist
            environment variables before starting or deploying this app.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            <li>
              <strong>VITE_NEON_AUTH_URL:</strong>{" "}
              {configStatus.hasAuthConfig ? "configured" : "missing or invalid"}
            </li>
            <li>
              <strong>VITE_NEON_DATA_API_URL:</strong>{" "}
              {configStatus.hasDataApiConfig
                ? "configured"
                : "missing or invalid"}
            </li>
            <li>
              <strong>VITE_ADMIN_EMAILS:</strong>{" "}
              {configStatus.hasAdminEmails ? "configured" : "missing"}
            </li>
          </ul>
        </div>
      </main>
    );
  }

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      basePath={authBasePath}
      credentials={{
        forgotPassword: true,
        rememberMe: true,
        usernameRequired: false,
      }}
      Link={AuthLink}
      navigate={(href) => updateUrl(href, "push")}
      redirectTo={appBasePath}
      replace={(href) => updateUrl(href, "replace")}
    >
      <AuthProvider>
        <main className="min-h-screen bg-paper text-ink">
          <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
            <AuthPanel />
          </div>
        </main>
      </AuthProvider>
    </NeonAuthUIProvider>
  );
}
