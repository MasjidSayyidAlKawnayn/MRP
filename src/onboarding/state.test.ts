import { describe, expect, it } from "vitest";
import {
  ONBOARDING_VERSION,
  buildOnboardingChecklist,
  completeChecklistItem,
  createDefaultOnboardingState,
  dismissTour,
  getCompletedChecklistIds,
  normalizeOnboardingState,
  resolveOnboardingPhase,
  type WorkspaceOnboardingFacts,
} from "./state";

const emptyFacts: WorkspaceOnboardingFacts = {
  attendanceRecordCount: 0,
  courseCount: 0,
  groupCount: 0,
  hasSettingsAccess: true,
  studentCount: 0,
  teacherCount: 0,
};

const dailyFacts: WorkspaceOnboardingFacts = {
  attendanceRecordCount: 4,
  courseCount: 1,
  groupCount: 2,
  hasSettingsAccess: true,
  studentCount: 20,
  teacherCount: 2,
};

describe("onboarding state", () => {
  it("creates default state for a new user", () => {
    const state = createDefaultOnboardingState("user-1", "2026-05-28T00:00:00.000Z");

    expect(state).toMatchObject({
      checklistDismissedPhases: [],
      completedAt: null,
      completedItemIds: [],
      dismissedTourIds: [],
      firstSeenAt: "2026-05-28T00:00:00.000Z",
      userId: "user-1",
      version: ONBOARDING_VERSION,
    });
  });

  it("merges completed checklist items without duplicates", () => {
    const state = createDefaultOnboardingState("user-1");
    const nextState = completeChecklistItem(
      completeChecklistItem(state, "setup-course"),
      "setup-course",
    );

    expect(nextState.completedItemIds).toEqual(["setup-course"]);
  });

  it("persists dismissed tours without duplicates", () => {
    const state = createDefaultOnboardingState("user-1");
    const nextState = dismissTour(dismissTour(state, "setup-tour"), "setup-tour");

    expect(nextState.dismissedTourIds).toEqual(["setup-tour"]);
  });

  it("resets completion when stored version is stale", () => {
    const state = normalizeOnboardingState("user-1", {
      completedItemIds: ["setup-course"],
      dismissedTourIds: ["setup-tour"],
      firstSeenAt: "2026-05-28T00:00:00.000Z",
      userId: "user-1",
      version: ONBOARDING_VERSION + 1,
    });

    expect(state.completedItemIds).toEqual([]);
    expect(state.dismissedTourIds).toEqual([]);
    expect(state.firstSeenAt).toBe("2026-05-28T00:00:00.000Z");
  });

  it("uses setup phase for empty workspaces and daily phase after core data exists", () => {
    expect(resolveOnboardingPhase(emptyFacts)).toBe("setup");
    expect(resolveOnboardingPhase(dailyFacts)).toBe("daily");
  });

  it("marks data-backed checklist items as completed", () => {
    const state = createDefaultOnboardingState("user-1");
    const items = buildOnboardingChecklist("daily", dailyFacts);

    expect(getCompletedChecklistIds(state, items)).toEqual(
      expect.arrayContaining([
        "daily-account",
        "daily-attendance",
        "daily-course",
        "daily-groups",
        "daily-students",
      ]),
    );
  });
});
