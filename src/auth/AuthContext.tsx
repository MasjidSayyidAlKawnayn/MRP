import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminEmails, authClient } from "./client";

const appBasePath = import.meta.env.BASE_URL;

function replaceUrl(href: string) {
  window.history.replaceState(null, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not sign out.";
}

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

export interface AuthContextValue {
  user: unknown;
  session: unknown;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isSigningOut: boolean;
  error: unknown;
  signOutError: string | null;
  signOut: () => Promise<void>;
  userId?: string;
  name?: string;
  email?: string;
  image?: string;
  emailVerified?: boolean;
  sessionId?: string;
  expiresAt?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, error, isPending } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await authClient.signOut();
      replaceUrl(appBasePath);
    } catch (caughtError) {
      setSignOutError(getErrorMessage(caughtError));
      throw caughtError;
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = data?.user;
    const session = data?.session;
    const email = getStringField(user, "email");
    const normalizedEmail = email?.toLowerCase();

    return {
      user,
      session,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(
        normalizedEmail && adminEmails.includes(normalizedEmail),
      ),
      isLoading: isPending,
      isSigningOut,
      error,
      signOutError,
      signOut,
      userId: getStringField(user, "id"),
      name: getStringField(user, "name"),
      email,
      image: getStringField(user, "image"),
      emailVerified: getBooleanField(user, "emailVerified"),
      sessionId: getStringField(session, "id"),
      expiresAt: getStringField(session, "expiresAt"),
    };
  }, [
    data?.session,
    data?.user,
    error,
    isPending,
    isSigningOut,
    signOut,
    signOutError,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
