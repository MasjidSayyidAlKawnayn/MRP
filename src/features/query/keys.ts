import type { EntityKey, SchemaName } from "../../crud/entities";
import type { CohortId, CourseId } from "../../crud/data";

const none = "none";

export const queryKeys = {
  cohorts: (courseId: CourseId | undefined) => ["cohorts", courseId ?? none] as const,
  courses: () => ["courses"] as const,
  relationOptions: (
    schema: SchemaName,
    entityKey: EntityKey,
    courseId: CourseId | undefined,
    cohortId: CohortId | undefined,
  ) => ["relationOptions", schema, entityKey, courseId ?? none, cohortId ?? none] as const,
  rows: (
    schema: SchemaName,
    entityKey: EntityKey,
    courseId: CourseId | undefined,
    cohortId: CohortId | undefined,
  ) => ["rows", schema, entityKey, courseId ?? none, cohortId ?? none] as const,
  workspaceFacts: (courseId: CourseId | undefined, cohortId: CohortId | undefined) =>
    ["workspaceFacts", courseId ?? none, cohortId ?? none] as const,
};
