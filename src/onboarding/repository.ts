import { getSchemaClient } from "../data/neon";
import { throwIfDataError } from "../crud/dataErrors";
import {
  ONBOARDING_VERSION,
  createDefaultOnboardingState,
  normalizeOnboardingState,
  type OnboardingChecklistItemId,
  type OnboardingPhase,
  type OnboardingTourId,
  type UserOnboardingState,
} from "./state";

const onboardingColumns =
  "user_id,version,completed_item_ids,dismissed_tour_ids,dismissed_checklist_phases,first_seen_at,completed_at,updated_at";

function toOnboardingState(
  userId: string,
  row: Record<string, unknown>,
): UserOnboardingState {
  return normalizeOnboardingState(userId, {
    checklistDismissedPhases: row.dismissed_checklist_phases as OnboardingPhase[],
    completedAt:
      typeof row.completed_at === "string" ? row.completed_at : null,
    completedItemIds: row.completed_item_ids as OnboardingChecklistItemId[],
    dismissedTourIds: row.dismissed_tour_ids as OnboardingTourId[],
    firstSeenAt:
      typeof row.first_seen_at === "string" ? row.first_seen_at : undefined,
    updatedAt:
      typeof row.updated_at === "string" ? row.updated_at : undefined,
    userId,
    version: typeof row.version === "number" ? row.version : undefined,
  });
}

function toOnboardingPayload(state: UserOnboardingState) {
  return {
    completed_at: state.completedAt,
    completed_item_ids: state.completedItemIds,
    dismissed_checklist_phases: state.checklistDismissedPhases,
    dismissed_tour_ids: state.dismissedTourIds,
    first_seen_at: state.firstSeenAt,
    updated_at: state.updatedAt,
    user_id: state.userId,
    version: ONBOARDING_VERSION,
  };
}

export async function getUserOnboardingState(userId: string) {
  const client = getSchemaClient("public");
  const response = await client
    .from("user_onboarding_state")
    .select(onboardingColumns)
    .eq("user_id", userId);

  throwIfDataError(response.error);

  const row = (response.data ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) {
    return createDefaultOnboardingState(userId);
  }

  return toOnboardingState(userId, row);
}

export async function saveUserOnboardingState(state: UserOnboardingState) {
  const client = getSchemaClient("public");
  const response = await client
    .from("user_onboarding_state")
    .upsert(toOnboardingPayload(state), { onConflict: "user_id" })
    .select(onboardingColumns)
    .single();

  throwIfDataError(response.error);

  return response.data
    ? toOnboardingState(state.userId, response.data as Record<string, unknown>)
    : state;
}
