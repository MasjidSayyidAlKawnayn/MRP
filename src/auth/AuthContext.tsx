import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "./client";
import { getSchemaClient } from "../data/neon";
import { resolveAdminAccess } from "./adminAccess";

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
  hasAdminUiAccess: boolean;
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
  const navigate = useNavigate();
  const { data, error, isPending } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [adminCheck, setAdminCheck] = useState<{
    isAdmin: boolean;
    isLoading: boolean;
    userId?: string;
  }>({
    isAdmin: false,
    isLoading: false,
  });
  const userId = getStringField(data?.user, "id");

  useEffect(() => {
    let isCurrent = true;

    if (isPending || !userId) {
      setAdminCheck({
        isAdmin: false,
        isLoading: false,
        userId,
      });
      return () => {
        isCurrent = false;
      };
    }

    setAdminCheck({
      isAdmin: false,
      isLoading: true,
      userId,
    });

    async function checkAdminAccess() {
      const isAdmin = await resolveAdminAccess(
        () => getSchemaClient("public").rpc("is_app_admin"),
        { isCancelled: () => !isCurrent },
      );

      if (isCurrent) {
        setAdminCheck({
          isAdmin,
          isLoading: false,
          userId,
        });
      }
    }

    void checkAdminAccess();

    return () => {
      isCurrent = false;
    };
  }, [isPending, userId]);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await authClient.signOut();
      await navigate({ to: "/", replace: true });
    } catch (caughtError) {
      setSignOutError(getErrorMessage(caughtError));
      throw caughtError;
    } finally {
      setIsSigningOut(false);
    }
  }, [navigate]);

  const value = useMemo<AuthContextValue>(() => {
    const user = data?.user;
    const session = data?.session;
    const email = getStringField(user, "email");

    return {
      user,
      session,
      isAuthenticated: Boolean(user),
      hasAdminUiAccess: Boolean(user) && adminCheck.isAdmin,
      isLoading:
        isPending ||
        (Boolean(user) &&
          (adminCheck.isLoading || adminCheck.userId !== userId)),
      isSigningOut,
      error,
      signOutError,
      signOut,
      userId,
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
    adminCheck.isAdmin,
    adminCheck.isLoading,
    adminCheck.userId,
    error,
    isPending,
    isSigningOut,
    signOut,
    signOutError,
    userId,
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
