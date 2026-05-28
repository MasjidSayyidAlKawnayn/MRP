import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getUserOnboardingState,
  saveUserOnboardingState,
} from "./repository";
import {
  createDefaultOnboardingState,
  dismissChecklistPhase,
  dismissTour,
  completeChecklistItem as markChecklistItemComplete,
  type OnboardingChecklistItemId,
  type OnboardingPhase,
  type OnboardingTourId,
  type UserOnboardingState,
} from "./state";
import { GuidedTour } from "./GuidedTour";

type OnboardingContextValue = {
  activeTour: {
    id: OnboardingTourId;
    phase: OnboardingPhase;
  } | null;
  closeTour: (dismiss?: boolean) => void;
  completeItem: (itemId: OnboardingChecklistItemId) => void;
  dismissChecklist: (phase: OnboardingPhase) => void;
  error: string | null;
  isLoading: boolean;
  openTour: (phase: OnboardingPhase) => void;
  resetOnboarding: () => void;
  state: UserOnboardingState;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "تعذر حفظ حالة الشرح.";
}

function getTourId(phase: OnboardingPhase): OnboardingTourId {
  return phase === "setup" ? "setup-tour" : "daily-tour";
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const fallbackUserId = userId ?? "anonymous";
  const [state, setState] = useState(() =>
    createDefaultOnboardingState(fallbackUserId),
  );
  const [activeTour, setActiveTour] =
    useState<OnboardingContextValue["activeTour"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  const persistState = useCallback(async (nextState: UserOnboardingState) => {
    try {
      const savedState = await saveUserOnboardingState(nextState);
      setState(savedState);
      setError(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setState(createDefaultOnboardingState("anonymous"));
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    void getUserOnboardingState(userId)
      .then((loadedState) => {
        if (isMounted) {
          setState(loadedState);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setState(createDefaultOnboardingState(userId));
          setError(getErrorMessage(caughtError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const completeItem = useCallback(
    (itemId: OnboardingChecklistItemId) => {
      setState((current) => {
        const nextState = markChecklistItemComplete(current, itemId);
        void persistState(nextState);
        return nextState;
      });
    },
    [persistState],
  );

  const dismissChecklist = useCallback(
    (phase: OnboardingPhase) => {
      setState((current) => {
        const nextState = dismissChecklistPhase(current, phase);
        void persistState(nextState);
        return nextState;
      });
    },
    [persistState],
  );

  const openTour = useCallback((phase: OnboardingPhase) => {
    setActiveTour({ id: getTourId(phase), phase });
  }, []);

  const closeTour = useCallback(
    (dismiss = false) => {
      setActiveTour((currentTour) => {
        if (dismiss && currentTour) {
          setState((current) => {
            const nextState = dismissTour(current, currentTour.id);
            void persistState(nextState);
            return nextState;
          });
        }

        return null;
      });
    },
    [persistState],
  );

  const resetOnboarding = useCallback(() => {
    const nextState = createDefaultOnboardingState(fallbackUserId);
    setState(nextState);
    void persistState(nextState);
  }, [fallbackUserId, persistState]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      activeTour,
      closeTour,
      completeItem,
      dismissChecklist,
      error,
      isLoading,
      openTour,
      resetOnboarding,
      state,
    }),
    [
      activeTour,
      closeTour,
      completeItem,
      dismissChecklist,
      error,
      isLoading,
      openTour,
      resetOnboarding,
      state,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <GuidedTour />
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);

  if (!value) {
    throw new Error("useOnboarding must be used inside OnboardingProvider.");
  }

  return value;
}
