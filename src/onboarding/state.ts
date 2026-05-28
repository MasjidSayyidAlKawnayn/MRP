export const ONBOARDING_VERSION = 1;

export type OnboardingPhase = "setup" | "daily";

export type OnboardingTourId =
  | "daily-tour"
  | "setup-tour";

export type OnboardingChecklistItemId =
  | "setup-attendance"
  | "setup-course"
  | "setup-groups"
  | "setup-students"
  | "setup-teachers"
  | "daily-account"
  | "daily-attendance"
  | "daily-charts"
  | "daily-course"
  | "daily-dashboard"
  | "daily-groups"
  | "daily-students";

export type UserOnboardingState = {
  checklistDismissedPhases: OnboardingPhase[];
  completedAt: string | null;
  completedItemIds: OnboardingChecklistItemId[];
  dismissedTourIds: OnboardingTourId[];
  firstSeenAt: string;
  updatedAt: string;
  userId: string;
  version: number;
};

export type WorkspaceOnboardingFacts = {
  attendanceRecordCount: number;
  courseCount: number;
  groupCount: number;
  hasSettingsAccess: boolean;
  studentCount: number;
  teacherCount: number;
};

export type OnboardingChecklistItem = {
  id: OnboardingChecklistItemId;
  autoCompleted: boolean;
  description: string;
  title: string;
};

const checklistItemIds: OnboardingChecklistItemId[] = [
  "setup-attendance",
  "setup-course",
  "setup-groups",
  "setup-students",
  "setup-teachers",
  "daily-account",
  "daily-attendance",
  "daily-charts",
  "daily-course",
  "daily-dashboard",
  "daily-groups",
  "daily-students",
];

const tourIds: OnboardingTourId[] = ["daily-tour", "setup-tour"];
const phaseIds: OnboardingPhase[] = ["daily", "setup"];

function uniqueKnownValues<T extends string>(values: unknown, knownValues: readonly T[]) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values)].filter((value): value is T =>
    typeof value === "string" && knownValues.includes(value as T),
  );
}

function nowIso() {
  return new Date().toISOString();
}

export function createDefaultOnboardingState(
  userId: string,
  firstSeenAt = nowIso(),
): UserOnboardingState {
  return {
    checklistDismissedPhases: [],
    completedAt: null,
    completedItemIds: [],
    dismissedTourIds: [],
    firstSeenAt,
    updatedAt: firstSeenAt,
    userId,
    version: ONBOARDING_VERSION,
  };
}

export function normalizeOnboardingState(
  userId: string,
  row: Partial<UserOnboardingState> | null | undefined,
): UserOnboardingState {
  if (!row || row.version !== ONBOARDING_VERSION) {
    return createDefaultOnboardingState(userId, row?.firstSeenAt);
  }

  return {
    checklistDismissedPhases: uniqueKnownValues(
      row.checklistDismissedPhases,
      phaseIds,
    ),
    completedAt: typeof row.completedAt === "string" ? row.completedAt : null,
    completedItemIds: uniqueKnownValues(row.completedItemIds, checklistItemIds),
    dismissedTourIds: uniqueKnownValues(row.dismissedTourIds, tourIds),
    firstSeenAt:
      typeof row.firstSeenAt === "string" ? row.firstSeenAt : nowIso(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : nowIso(),
    userId,
    version: ONBOARDING_VERSION,
  };
}

export function resolveOnboardingPhase(
  facts: WorkspaceOnboardingFacts,
): OnboardingPhase {
  return facts.courseCount === 0 ||
    facts.groupCount === 0 ||
    facts.studentCount === 0 ||
    facts.attendanceRecordCount === 0
    ? "setup"
    : "daily";
}

export function getTourIdForPhase(phase: OnboardingPhase): OnboardingTourId {
  return phase === "setup" ? "setup-tour" : "daily-tour";
}

export function buildOnboardingChecklist(
  phase: OnboardingPhase,
  facts: WorkspaceOnboardingFacts,
): OnboardingChecklistItem[] {
  if (phase === "setup") {
    return [
      {
        id: "setup-course",
        autoCompleted: facts.courseCount > 0,
        title: "إنشاء أو اختيار دورة",
        description: "ابدأ بتحديد الدورة التي سيعمل عليها فريق الإدارة.",
      },
      {
        id: "setup-groups",
        autoCompleted: facts.groupCount > 0,
        title: "إضافة المجموعات",
        description: "قسّم الطلاب إلى مجموعات واضحة قبل إدخال الحضور.",
      },
      {
        id: "setup-students",
        autoCompleted: facts.studentCount > 0,
        title: "إضافة الطلاب أو استيرادهم",
        description: "أدخل الطلاب يدويًا أو استخدم زر الاستيراد عند توفر ملف.",
      },
      {
        id: "setup-teachers",
        autoCompleted: facts.teacherCount > 0,
        title: "إضافة المعلمين",
        description: "اربط المعلمين بالمجموعات حتى تكون البيانات مفهومة.",
      },
      {
        id: "setup-attendance",
        autoCompleted: facts.attendanceRecordCount > 0,
        title: "تسجيل أول حضور",
        description: "جرّب صفحة أخذ الحضور لتأكيد أن سير العمل جاهز.",
      },
    ];
  }

  return [
    {
      id: "daily-course",
      autoCompleted: facts.courseCount > 0,
      title: "اختيار الدورة",
      description: "اختر الدورة من الصفحة الرئيسية قبل الانتقال السريع.",
    },
    {
      id: "daily-dashboard",
      autoCompleted: false,
      title: "فتح لوحة الإدارة",
      description: "استخدم لوحة الإدارة للتنقل بين أقسام المنصة.",
    },
    {
      id: "daily-students",
      autoCompleted: facts.studentCount > 0,
      title: "مراجعة الطلاب",
      description: "ابحث عن طالب أو افتح تفاصيله من جدول الطلاب.",
    },
    {
      id: "daily-groups",
      autoCompleted: facts.groupCount > 0,
      title: "مراجعة المجموعات",
      description: "تابع توزيع الطلاب وألوان المجموعات.",
    },
    {
      id: "daily-attendance",
      autoCompleted: facts.attendanceRecordCount > 0,
      title: "أخذ الحضور",
      description: "استخدم صفحة الحضور السريع للجلسة اليومية.",
    },
    {
      id: "daily-charts",
      autoCompleted: false,
      title: "فتح مخططات الحضور",
      description: "راجع نسب الحضور والتأخر بعد تسجيل الجلسات.",
    },
    {
      id: "daily-account",
      autoCompleted: facts.hasSettingsAccess,
      title: "معرفة القائمة الشخصية",
      description: "منها تصل إلى الحساب والإعدادات وإعادة فتح الشرح.",
    },
  ];
}

export function getCompletedChecklistIds(
  state: UserOnboardingState,
  items: OnboardingChecklistItem[],
) {
  const automaticIds = items
    .filter((item) => item.autoCompleted)
    .map((item) => item.id);

  return [...new Set([...state.completedItemIds, ...automaticIds])];
}

export function completeChecklistItem(
  state: UserOnboardingState,
  itemId: OnboardingChecklistItemId,
): UserOnboardingState {
  const completedItemIds = [...new Set([...state.completedItemIds, itemId])];
  const updatedAt = nowIso();

  return {
    ...state,
    completedAt: completedItemIds.length === checklistItemIds.length
      ? (state.completedAt ?? updatedAt)
      : state.completedAt,
    completedItemIds,
    updatedAt,
  };
}

export function dismissTour(
  state: UserOnboardingState,
  tourId: OnboardingTourId,
): UserOnboardingState {
  return {
    ...state,
    dismissedTourIds: [...new Set([...state.dismissedTourIds, tourId])],
    updatedAt: nowIso(),
  };
}

export function dismissChecklistPhase(
  state: UserOnboardingState,
  phase: OnboardingPhase,
): UserOnboardingState {
  return {
    ...state,
    checklistDismissedPhases: [
      ...new Set([...state.checklistDismissedPhases, phase]),
    ],
    updatedAt: nowIso(),
  };
}
