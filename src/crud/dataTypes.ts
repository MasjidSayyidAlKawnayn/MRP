export type CrudValue = string | number | boolean | null;
export type CrudRow = Record<string, CrudValue>;

export type CourseId = number;
export type CourseSlug = string;
export type CohortId = number;
export type CohortTag = string;

export interface Course {
  id: CourseId;
  slug: CourseSlug;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Cohort {
  id: CohortId;
  courseId: CourseId;
  name: string;
  tag: CohortTag;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  previousCohortId: CohortId | null;
  deletedAt: string | null;
}

export interface CohortEnrollment {
  id: number;
  studentId: number;
  cohortId: CohortId;
  enrollmentType: string;
  outcome: string | null;
}

export interface AdminUser {
  userId: string;
  email: string | null;
  owner: boolean;
  createdAt: string | null;
}

export type CourseInput = {
  description?: string | null;
  isActive?: boolean;
  name: string;
  slug: string;
};

export type CohortInput = {
  courseId: CourseId;
  endsAt?: string | null;
  name: string;
  previousCohortId?: CohortId | null;
  startsAt?: string | null;
  status?: string;
  tag: string;
};

export type AdminUserInput = {
  email?: string | null;
  owner?: boolean;
  userId: string;
};
