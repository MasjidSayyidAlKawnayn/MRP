import {
  AuthView,
  SignedIn,
  SignedOut,
} from "@neondatabase/neon-js/auth/react/ui";
import type { AuthLocalization } from "@neondatabase/neon-js/auth/react/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  HelpCircle,
  Home,
  KeyRound,
  LayoutDashboard,
  Layers3,
  LogOut,
  Mail,
  RotateCcw,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  CourseCreatePage,
  CourseDeletePage,
  CourseDetailPage,
  CourseEditPage,
  CourseListPage,
  CourseSettingsPage,
  CrudDashboard,
} from "./CrudDashboard";
import {
  appSchema,
  listCohorts,
  listCourses,
  listRows,
} from "../crud/data";
import { findEntityDefinition, getEntityDefinitions } from "../crud/entities";
import {
  dashboardPath,
  getDefaultEntityKey,
} from "../routing";
import { OnboardingProvider, useOnboarding } from "../onboarding/OnboardingProvider";
import { OnboardingChecklist } from "../onboarding/OnboardingChecklist";
import {
  resolveOnboardingPhase,
  type OnboardingPhase,
  type WorkspaceOnboardingFacts,
} from "../onboarding/state";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogTitle,
  RoutedViewDialogContent,
} from "./ui/dialog";
import { queryKeys } from "../features/query/keys";
import {
  useWorkspaceRouteState,
  type WorkspaceRouteState,
} from "../features/routing/useWorkspaceRouteState";

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
  courses: "\u0627\u0644\u062F\u0648\u0631\u0627\u062A",
  profile: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A",
  settings: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
  tutorial: "\u0627\u0644\u0634\u0631\u062D",
  resetTutorial: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0634\u0631\u062D",
  logoutTitle: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0645\u0646 \u0627\u0644\u0645\u0646\u0635\u0629",
  logoutBody:
    "\u0646\u064F\u0646\u0647\u064A \u062C\u0644\u0633\u062A\u0643 \u0627\u0644\u0622\u0646 \u0648\u0646\u0639\u064A\u062F\u0643 \u0625\u0644\u0649 \u0635\u0641\u062D\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644.",
  logoutSignedOut:
    "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0628\u0646\u062C\u0627\u062D. \u064A\u0645\u0643\u0646\u0643 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0641\u064A \u0623\u064A \u0648\u0642\u062A.",
  logoutRetry: "\u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062E\u0631\u0648\u062C \u0645\u062C\u062F\u062F\u0627\u064B",
  backToHome: "\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
  profileTitle: "\u0645\u0644\u0641 \u0627\u0644\u062D\u0633\u0627\u0628",
  profileBody:
    "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0647\u0648\u064A\u0629 \u0648\u0627\u0644\u062C\u0644\u0633\u0629 \u0648\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644.",
  welcomeTitle: "\u0623\u0647\u0644\u0627 \u0628\u0643 \u0641\u064A \u0645\u0633\u0627\u062D\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062C\u062F.",
  welcomeBody: "\u0633\u062C\u0644 \u062F\u062E\u0648\u0644\u0643 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0648\u0627\u0644\u062D\u0636\u0648\u0631 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062D\u062F.",
  accessDenied: "\u0627\u0644\u0648\u0635\u0648\u0644 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
  deniedTitle: "\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0643\u0646\u0647 \u0644\u064A\u0633 \u0636\u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062F\u064A\u0631\u064A\u0646.",
  deniedBody: "\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u062A\u0638\u0647\u0631 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647\u0627 \u0641\u0642\u0637\u060C \u0648\u062A\u0628\u0642\u0649 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0647\u064A \u0627\u0644\u0645\u0631\u062C\u0639 \u0627\u0644\u0646\u0647\u0627\u0626\u064A.",
  setupCourseTitle:
    "\u0623\u0646\u0634\u0626 \u062F\u0648\u0631\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0642\u0628\u0644 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629.",
  missingCoursesTable:
    "\u062C\u062F\u0648\u0644 \u0627\u0644\u062F\u0648\u0631\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0641\u064A \u0645\u062E\u0637\u0637 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A. \u0634\u063A\u0644 sql/course_isolation.sql \u062B\u0645 \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0645\u062E\u0637\u0637 PostgREST.",
  home: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
};

type HomeAction = {
  description: string;
  requiresCourse?: boolean;
  icon: ReactNode;
  id: string;
  title: string;
  to: (courseSlug: string, cohortTag?: string) => string;
};

function createWorkspaceFacts(
  overrides: Partial<WorkspaceOnboardingFacts> = {},
): WorkspaceOnboardingFacts {
  return {
    attendanceRecordCount: 0,
    courseCount: 0,
    groupCount: 0,
    hasSettingsAccess: true,
    studentCount: 0,
    teacherCount: 0,
    ...overrides,
  };
}

const authViewLocalization = {
  SIGN_IN: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644",
  SIGN_IN_ACTION: "\u062F\u062E\u0648\u0644",
  SIGN_IN_DESCRIPTION:
    "\u0623\u062F\u062E\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628 \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.",
  SIGN_UP: "\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628",
  SIGN_UP_ACTION: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628",
  SIGN_UP_DESCRIPTION:
    "\u0623\u062F\u062E\u0644 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0644\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u062C\u062F\u064A\u062F.",
  EMAIL: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
  EMAIL_PLACEHOLDER: "name@example.com",
  EMAIL_REQUIRED:
    "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628",
  IS_INVALID: "\u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
  IS_REQUIRED: "\u0645\u0637\u0644\u0648\u0628",
  PASSWORD: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
  PASSWORD_PLACEHOLDER: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
  PASSWORD_REQUIRED:
    "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629",
  REMEMBER_ME: "\u062A\u0630\u0643\u0631\u0646\u064A",
  FORGOT_PASSWORD: "\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
  FORGOT_PASSWORD_ACTION:
    "\u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629",
  FORGOT_PASSWORD_DESCRIPTION:
    "\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F\u0643 \u0644\u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629.",
  FORGOT_PASSWORD_LINK:
    "\u0646\u0633\u064A\u062A \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061F",
  FORGOT_PASSWORD_EMAIL:
    "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0628\u0631\u064A\u062F\u0643 \u0644\u0631\u0627\u0628\u0637 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646.",
  NAME: "\u0627\u0644\u0627\u0633\u0645",
  NAME_PLACEHOLDER: "\u0627\u0644\u0627\u0633\u0645",
  GO_BACK: "\u0631\u062C\u0648\u0639",
  DONT_HAVE_AN_ACCOUNT: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628\u061F",
  ALREADY_HAVE_AN_ACCOUNT: "\u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628\u061F",
  REQUEST_FAILED: "\u062A\u0639\u0630\u0631 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0637\u0644\u0628",
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

function getCourseLoadErrorMessage(caughtError: unknown) {
  const message =
    caughtError instanceof Error ? caughtError.message : text.notAvailable;

  if (
    /schema cache/i.test(message) &&
    /(?:^|[."])courses(?:[".]|$)/i.test(message)
  ) {
    return text.missingCoursesTable;
  }

  return message;
}

function LogoutPage() {
  const {
    isAuthenticated,
    isSigningOut,
    signOut,
    signOutError,
  } = useAuth();
  const hasRequestedSignOut = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || isSigningOut || hasRequestedSignOut.current) {
      return;
    }

    hasRequestedSignOut.current = true;
    void signOut().catch(() => {
      hasRequestedSignOut.current = false;
    });
  }, [isAuthenticated, isSigningOut, signOut]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
      <div className="w-full rounded-[1.75rem] border border-white/80 bg-white/92 p-6 text-right shadow-2xl shadow-cedar/10 backdrop-blur sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-cedar/10 px-3 py-2 text-xs font-bold text-cedar">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>{text.signOut}</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">
          {text.logoutTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          {isAuthenticated ? text.logoutBody : text.logoutSignedOut}
        </p>

        {signOutError ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {signOutError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {isAuthenticated ? (
            <Button
              disabled={isSigningOut}
              onClick={() => void signOut().catch(() => undefined)}
              type="button"
            >
              {isSigningOut ? text.signingOut : text.logoutRetry}
            </Button>
          ) : null}
          <Button
            onClick={() => {
              window.location.assign(import.meta.env.BASE_URL);
            }}
            type="button"
            variant={isAuthenticated ? "outline" : "default"}
          >
            {text.backToHome}
          </Button>
        </div>
      </div>
    </section>
  );
}

function LogoutButton({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "default" | "outline";
}) {
  const { isSigningOut, signOut, signOutError } = useAuth();

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        className={className}
        disabled={isSigningOut}
        onClick={() => void signOut().catch(() => undefined)}
        type="button"
        variant={variant}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>{isSigningOut ? text.signingOut : text.signOut}</span>
      </Button>
      {signOutError ? (
        <p className="text-right text-xs leading-5 text-amber-800">
          {signOutError}
        </p>
      ) : null}
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

function AccountControls({
  courseSlug,
  tutorialPhase,
}: {
  courseSlug: string;
  tutorialPhase: OnboardingPhase;
}) {
  const { email, image, name, signOutError } = useAuth();
  const { openTour, resetOnboarding } = useOnboarding();
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
        data-onboarding="account-menu"
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
              void navigate({ to: "/home" });
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.home}</span>
            <Home className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar"
            onClick={() => {
              setIsOpen(false);
              void navigate({
                to: dashboardPath({
                  courseSlug,
                  entity: getDefaultEntityKey(appSchema),
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
              void navigate({ to: "/courses" });
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.courses}</span>
            <Layers3 className="h-4 w-4" aria-hidden="true" />
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
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar"
            onClick={() => {
              setIsOpen(false);
              openTour(tutorialPhase);
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.tutorial}</span>
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar"
            onClick={() => {
              setIsOpen(false);
              resetOnboarding();
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.resetTutorial}</span>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-cedar/5 hover:text-cedar disabled:opacity-60"
            onClick={() => {
              setIsOpen(false);
              void navigate({ to: "/logout" });
            }}
            role="menuitem"
            type="button"
          >
            <span>{text.signOut}</span>
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
  const { sessionId } = useAuth();
  const routeState = useWorkspaceRouteState();

  if (routeState.page === "logout") {
    return <LogoutPage />;
  }

  return (
    <>
      <SignedOut>
        <section className="masjid-pattern -mx-4 min-h-[calc(100vh-2rem)] overflow-hidden px-4 py-4 sm:-mx-6 sm:px-6 sm:py-8 lg:-mx-8 lg:min-h-[calc(100vh-6rem)] lg:px-8">
          <div className="relative mx-auto grid min-h-[inherit] max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,430px)] lg:gap-14">
            <div className="relative order-1 max-w-3xl lg:order-1">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cedar/15 bg-white/70 px-3 py-2 text-xs font-bold text-cedar shadow-sm shadow-cedar/5 backdrop-blur sm:px-4 sm:text-sm">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{appName}</span>
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-ink sm:mt-6 sm:text-5xl lg:text-6xl">
                {text.welcomeTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700 sm:mt-5 sm:text-lg">
                {text.welcomeBody}
              </p>
              <div className="mt-8 grid max-w-2xl gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 shadow-sm shadow-cedar/5 backdrop-blur">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cedar/10 text-cedar">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>{"\u0627\u0644\u0637\u0644\u0627\u0628"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 shadow-sm shadow-cedar/5 backdrop-blur">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saffron/15 text-saffron">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>{"\u0627\u0644\u062D\u0636\u0648\u0631"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 shadow-sm shadow-cedar/5 backdrop-blur">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fig/10 text-fig">
                    <UsersRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>{"\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A"}</span>
                </div>
              </div>
            </div>

            <div className="relative order-2 lg:order-2">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cedar/15 via-white/55 to-saffron/15 blur-2xl" />
              <div className="login-auth-shell relative rounded-[1.75rem] border border-white/80 bg-white/88 p-4 shadow-2xl shadow-cedar/12 backdrop-blur-xl sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-cedar px-4 py-3 text-white shadow-lg shadow-cedar/20">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{appName}</p>
                    <p className="mt-1 text-xs text-white/75">
                      {"\u0645\u0633\u0627\u062D\u0629 \u0625\u062F\u0627\u0631\u064A\u0629 \u0622\u0645\u0646\u0629"}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <AuthView
                  className="max-w-none border-0 bg-transparent p-0 shadow-none"
                  classNames={{
                    content: "gap-5 px-0",
                    description: "text-right text-sm leading-6 text-slate-600",
                    footer:
                      "flex-nowrap justify-center px-0 pt-1 text-center text-sm text-slate-500 whitespace-nowrap",
                    footerLink: "whitespace-nowrap font-bold text-cedar underline-offset-4 hover:text-palm",
                    form: {
                      base: "gap-5",
                      button:
                        "h-12 rounded-xl bg-cedar text-base font-bold text-white shadow-lg shadow-cedar/20 transition hover:bg-palm",
                      checkbox: "border-slate-300 data-[state=checked]:border-cedar data-[state=checked]:bg-cedar",
                      error: "text-right text-xs text-rose-700",
                      forgotPasswordLink:
                        "text-sm font-bold text-cedar underline-offset-4 hover:text-palm",
                      input:
                        "h-12 rounded-xl border-slate-200 bg-white px-4 text-right text-base shadow-sm transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cedar/25",
                      label: "text-sm font-bold text-ink",
                    },
                    header: "px-0 text-right",
                    title: "text-2xl font-bold text-ink md:text-3xl",
                  }}
                  localization={authViewLocalization as AuthLocalization}
                  pathname={location.pathname}
                  redirectTo={import.meta.env.BASE_URL}
                />
              </div>
            </div>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          <OnboardingProvider>
            <SignedInWorkspace
              key={sessionId ?? "signed-in"}
              routeState={routeState}
            />
          </OnboardingProvider>
        </section>
      </SignedIn>
    </>
  );
}

function SignedInWorkspace({
  routeState,
}: {
  routeState: WorkspaceRouteState;
}) {
  const { hasAdminUiAccess, isLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({
    enabled: !isLoading && hasAdminUiAccess,
    queryKey: queryKeys.courses(),
    queryFn: () => listCourses({ includeInactive: true }),
  });
  const courses = coursesQuery.data ?? [];
  const selectedCourse =
    courses.find((course) => course.slug === routeState.courseSlug) ?? null;
  const isFocusedCoursePage = [
    "courseDelete",
    "courseDetail",
    "courseEdit",
  ].includes(routeState.page);
  const activeCourse =
    isFocusedCoursePage ? selectedCourse : (selectedCourse ?? courses[0] ?? null);
  const cohortsQuery = useQuery({
    enabled: Boolean(activeCourse),
    queryKey: queryKeys.cohorts(activeCourse?.id),
    queryFn: () => listCohorts(activeCourse!.id),
  });
  const cohorts = cohortsQuery.data ?? [];
  const activeCohort =
    cohorts.find((cohort) => cohort.tag === routeState.cohortTag) ?? cohorts[0] ?? null;
  const [homeCourseSlug, setHomeCourseSlug] = useState(activeCourse?.slug ?? "default");
  const homeCourse =
    courses.find((course) => course.slug === homeCourseSlug) ??
    activeCourse ??
    courses[0] ??
    null;
  const defaultEntity = getDefaultEntityKey(appSchema);
  const entityDefinitions = getEntityDefinitions(appSchema);
  const workspaceFactsQuery = useQuery({
    enabled: Boolean(activeCourse),
    queryKey: queryKeys.workspaceFacts(activeCourse?.id, activeCohort?.id),
    queryFn: async () => {
      if (!activeCourse) {
        return createWorkspaceFacts({ courseCount: courses.length });
      }

      const studentsEntity = findEntityDefinition(
        `${appSchema}.students`,
        entityDefinitions,
      );
      const groupsEntity = findEntityDefinition(
        `${appSchema}.groups`,
        entityDefinitions,
      );
      const teachersEntity = findEntityDefinition(
        `${appSchema}.teachers`,
        entityDefinitions,
      );
      const attendanceEntity = findEntityDefinition(
        `${appSchema}.attendanceRecords`,
        entityDefinitions,
      );

      if (!studentsEntity || !groupsEntity || !teachersEntity || !attendanceEntity) {
        return createWorkspaceFacts({ courseCount: courses.length });
      }

      try {
        const [students, groups, teachers, attendanceRecords] = await Promise.all([
          listRows(studentsEntity, activeCourse, activeCohort ?? undefined),
          listRows(groupsEntity, activeCourse, activeCohort ?? undefined),
          listRows(teachersEntity, activeCourse, activeCohort ?? undefined),
          listRows(attendanceEntity, activeCourse, activeCohort ?? undefined),
        ]);

        return createWorkspaceFacts({
          attendanceRecordCount: attendanceRecords.length,
          courseCount: courses.length,
          groupCount: groups.length,
          studentCount: students.length,
          teacherCount: teachers.length,
        });
      } catch {
        return createWorkspaceFacts({ courseCount: courses.length });
      }
    },
  });
  const workspaceFacts =
    workspaceFactsQuery.data ?? createWorkspaceFacts({ courseCount: courses.length });
  const tutorialPhase = resolveOnboardingPhase(workspaceFacts);
  const topAccessory = (
    <AccountControls
      courseSlug={activeCourse?.slug ?? routeState.courseSlug}
      tutorialPhase={tutorialPhase}
    />
  );

  async function refreshCourses() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.courses() });
  }

  const coursesError = coursesQuery.error
    ? getCourseLoadErrorMessage(coursesQuery.error)
    : null;

  useEffect(() => {
    if (activeCourse?.slug) {
      setHomeCourseSlug((current) =>
        current === "default" || !courses.some((course) => course.slug === current)
          ? activeCourse.slug
          : current,
      );
      return;
    }

    if (!courses.length) {
      setHomeCourseSlug("default");
      return;
    }

    setHomeCourseSlug((current) =>
      courses.some((course) => course.slug === current) ? current : courses[0].slug,
    );
  }, [activeCourse?.slug, courses]);

  useEffect(() => {
    if (
      routeState.page === "dashboard" &&
      activeCourse &&
      routeState.courseSlug !== activeCourse.slug
    ) {
      void navigate({
        to: dashboardPath({
          cohortTag: activeCohort?.tag,
          courseSlug: activeCourse.slug,
          entity: routeState.entity,
          mode: routeState.mode,
          rowId: routeState.rowId,
          subpage: routeState.attendanceTaking
            ? "take"
            : routeState.attendanceCharts
              ? "charts"
            : routeState.manualPoints
              ? "manual"
              : undefined,
        }),
        replace: true,
        search: routeState.search,
      });
    }
  }, [activeCourse, navigate, routeState]);

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
          <div className="mt-6 flex justify-end">
            <LogoutButton />
          </div>
        </div>
        <UserSummary />
      </div>
    );
  }

  if (coursesQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <p className="text-sm text-slate-600">{text.loadingAccount}</p>
      </div>
    );
  }

  if (
    !activeCourse &&
    routeState.page === "dashboard"
  ) {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <div className="rounded-3xl border border-amber-100 bg-white/90 p-6 shadow-xl shadow-amber-950/5">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {text.notAvailable}
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-9 text-ink">
            {text.setupCourseTitle}
          </h2>
          {coursesError ? (
            <p className="mt-4 text-sm leading-7 text-amber-800">{coursesError}</p>
          ) : null}
        </div>
      </>
    );
  }

  if (routeState.page === "profile") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <div className="space-y-4">
          <UserSummary />
          <div className="flex justify-end">
            <LogoutButton />
          </div>
        </div>
      </>
    );
  }

  if (routeState.page === "settings") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <CourseSettingsPage
          activeCourse={activeCourse}
          activeSchema={appSchema}
          courses={courses}
          onCoursesChanged={refreshCourses}
          onSelect={(course) =>
            void navigate({
              to: dashboardPath({
                courseSlug: course.slug,
                entity: getDefaultEntityKey(appSchema),
              }),
            })
          }
        />
      </>
    );
  }

  if (routeState.page === "home") {
    const homeActions: HomeAction[] = [
      {
        description: "\u0628\u062F\u0621 \u0627\u0644\u0639\u0645\u0644 \u0628\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629.",
        icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" />,
        id: "dashboard-main",
        title: text.dashboard,
        requiresCourse: true,
        to: (courseSlug, cohortTag) =>
          dashboardPath({
            courseSlug,
            cohortTag,
            entity: defaultEntity,
          }),
      },
      {
        description: "\u0636\u0628\u0637 \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0648\u0631\u0627\u062A \u0648\u062D\u0627\u0644\u062A\u0647\u0627.",
        icon: <Layers3 className="h-5 w-5" aria-hidden="true" />,
        id: "courses",
        title: text.courses,
        to: () => "/courses",
      },
      {
        description: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0644\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0628\u0633\u0631\u0639\u0629.",
        icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
        id: "attendance-take",
        title: "\u0623\u062E\u0630 \u0627\u0644\u062D\u0636\u0648\u0631",
        requiresCourse: true,
        to: (courseSlug, cohortTag) =>
          dashboardPath({
            courseSlug,
            cohortTag,
            entity: "attendanceRecords",
            subpage: "take",
          }),
      },
      {
        description: "\u0645\u0624\u0634\u0631\u0627\u062A \u0648\u0645\u0646\u062D\u0646\u064A\u0627\u062A \u0644\u0644\u062D\u0636\u0648\u0631.",
        icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
        id: "attendance-charts",
        title: "\u0645\u062E\u0637\u0637\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631",
        requiresCourse: true,
        to: (courseSlug, cohortTag) =>
          dashboardPath({
            courseSlug,
            cohortTag,
            entity: "attendanceRecords",
            subpage: "charts",
          }),
      },
      {
        description: "\u0645\u0644\u0641 \u0627\u0644\u062D\u0633\u0627\u0628 \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062C\u0644\u0633\u0629.",
        icon: <UserRound className="h-5 w-5" aria-hidden="true" />,
        id: "profile",
        title: text.profile,
        to: () => "/profile",
      },
      {
        description: "\u0625\u062F\u0627\u0631\u0629 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629.",
        icon: <Settings2 className="h-5 w-5" aria-hidden="true" />,
        id: "settings",
        title: text.settings,
        to: () => "/settings",
      },
    ];

    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <OnboardingChecklist facts={workspaceFacts} />
        <section className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-cedar/5 sm:p-6">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            {"\u0648\u062C\u0647\u062A\u0643 \u0627\u0644\u0630\u0643\u064A\u0629"}
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {"\u0627\u062E\u062A\u0631 \u0627\u0644\u062F\u0648\u0631\u0629 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0627\u0646\u062A\u0642\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0625\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629."}
          </p>
          <div
            className="mt-4 flex flex-wrap items-center gap-2"
            data-onboarding="home-course-selector"
          >
            {courses.map((course) => (
              <Button
                className="rounded-full"
                key={course.id}
                onClick={() => setHomeCourseSlug(course.slug)}
                variant={homeCourse?.slug === course.slug ? "default" : "outline"}
              >
                {course.name}
              </Button>
            ))}
          </div>
          <div
            className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            data-onboarding="home-actions"
          >
            {homeActions.map((action) => (
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-cedar/30 hover:bg-cedar/5 disabled:cursor-not-allowed disabled:opacity-60"
                data-onboarding={
                  action.id === "dashboard-main"
                    ? "home-dashboard-action"
                    : action.id === "attendance-take"
                      ? "home-attendance-action"
                      : action.id === "attendance-charts"
                        ? "home-charts-action"
                        : undefined
                }
                disabled={action.requiresCourse && !homeCourse}
                key={action.id}
                onClick={() => {
                  if (action.requiresCourse && !homeCourse) {
                    return;
                  }
                  void navigate({
                    to: action.to(homeCourse?.slug ?? "default", activeCohort?.tag),
                  });
                }}
                type="button"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cedar/10 text-cedar">
                  {action.icon}
                </span>
                <h2 className="mt-3 text-base font-bold text-ink">{action.title}</h2>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-5">
            <Button
              data-onboarding="home-dashboard-action"
              onClick={() => {
                void navigate({
                  to: dashboardPath({
                    courseSlug: activeCourse?.slug ?? "default",
                    cohortTag: activeCohort?.tag,
                    entity: defaultEntity,
                  }),
                });
              }}
              type="button"
            >
              {text.dashboard}
            </Button>
          </div>
        </section>
      </>
    );
  }

  if (routeState.page === "courses") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <CourseListPage courses={courses} />
      </>
    );
  }

  if (routeState.page === "courseCreate") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <CourseCreatePage onCoursesChanged={refreshCourses} />
      </>
    );
  }

  if (routeState.page === "courseDetail") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              void navigate({ to: "/courses" });
            }
          }}
          open
        >
          <RoutedViewDialogContent dir="rtl">
            <DialogTitle className="sr-only">
              {selectedCourse?.name ?? text.courses}
            </DialogTitle>
            <CourseDetailPage course={selectedCourse} />
          </RoutedViewDialogContent>
        </Dialog>
      </>
    );
  }

  if (routeState.page === "courseEdit") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <CourseEditPage
          course={selectedCourse}
          onCoursesChanged={refreshCourses}
        />
      </>
    );
  }

  if (routeState.page === "courseDelete") {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <CourseDeletePage
          course={selectedCourse}
          onCoursesChanged={refreshCourses}
        />
      </>
    );
  }

  if (!activeCourse) {
    return (
      <>
        <div className="relative z-50 flex justify-end">{topAccessory}</div>
        <div className="rounded-3xl border border-amber-100 bg-white/90 p-6 shadow-xl shadow-amber-950/5">
          <p className="text-sm leading-7 text-amber-800">
            {coursesError ?? text.setupCourseTitle}
          </p>
        </div>
      </>
    );
  }

  return (
    <CrudDashboard
      activeCohort={activeCohort}
      activeEntityKey={routeState.entity}
      activeCourse={activeCourse}
      activeSchema={appSchema}
      mode={routeState.mode}
      rowId={routeState.rowId}
      routeSearch={routeState.search}
      attendanceCharts={routeState.attendanceCharts}
      attendanceTaking={routeState.attendanceTaking}
      manualPoints={routeState.manualPoints}
      studentPhones={routeState.studentPhones}
      topAccessory={topAccessory}
    />
  );
}
