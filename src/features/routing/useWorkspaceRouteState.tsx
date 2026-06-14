import { useLocation, useMatchRoute } from "@tanstack/react-router";
import { appSchema } from "../../crud/data";
import type { EntityKey } from "../../crud/entities";
import {
  dashboardPath,
  getDefaultEntityKey,
  validateEntityKey,
  type RouteSearch,
  type ViewMode,
  type WorkspacePage,
} from "../../routing";

export type WorkspaceRouteState = {
  attendanceCharts?: boolean;
  attendanceTaking?: boolean;
  attendanceWizard?: boolean;
  canonicalPath?: string;
  cohortTag?: string;
  deductions?: boolean;
  entity: EntityKey;
  manualPoints?: boolean;
  mode: ViewMode;
  page: WorkspacePage;
  rowId?: string;
  studentPhones?: boolean;
  courseSlug: string;
  search: RouteSearch;
};

const DEFAULT_COURSE_SLUG = "default";

function resolveDashboardMode(rowId: string | undefined, isEdit: boolean, isCreate: boolean): ViewMode {
  if (isCreate) {
    return "create";
  }

  if (isEdit) {
    return "edit";
  }

  if (rowId) {
    return "detail";
  }

  return "list";
}

export function useWorkspaceRouteState(): WorkspaceRouteState {
  const location = useLocation();
  const matchRoute = useMatchRoute();
  const search = (location.search as RouteSearch) ?? {};

  if (matchRoute({ to: "/home", fuzzy: false })) {
    return {
      courseSlug: DEFAULT_COURSE_SLUG,
      entity: getDefaultEntityKey(appSchema),
      mode: "list",
      page: "home",
      search,
    };
  }

  if (matchRoute({ to: "/profile", fuzzy: false })) {
    return {
      courseSlug: DEFAULT_COURSE_SLUG,
      entity: getDefaultEntityKey(appSchema),
      mode: "list",
      page: "profile",
      search,
    };
  }

  if (matchRoute({ to: "/settings", fuzzy: false })) {
    return {
      courseSlug: DEFAULT_COURSE_SLUG,
      entity: getDefaultEntityKey(appSchema),
      mode: "list",
      page: "settings",
      search,
    };
  }

  if (matchRoute({ to: "/logout", fuzzy: false })) {
    return {
      courseSlug: DEFAULT_COURSE_SLUG,
      entity: getDefaultEntityKey(appSchema),
      mode: "list",
      page: "logout",
      search,
    };
  }

  if (matchRoute({ to: "/courses", fuzzy: false })) {
    return {
      courseSlug: DEFAULT_COURSE_SLUG,
      entity: getDefaultEntityKey(appSchema),
      mode: "list",
      page: "courses",
      search,
    };
  }

  if (matchRoute({ to: "/courses/new", fuzzy: false })) {
    return {
      courseSlug: DEFAULT_COURSE_SLUG,
      entity: getDefaultEntityKey(appSchema),
      mode: "create",
      page: "courseCreate",
      search,
    };
  }

  const courseEdit = matchRoute({ to: "/courses/$courseSlug/edit", fuzzy: false });
  if (courseEdit) {
    return {
      courseSlug: courseEdit.courseSlug,
      entity: getDefaultEntityKey(appSchema),
      mode: "edit",
      page: "courseEdit",
      search,
    };
  }

  const courseDelete = matchRoute({ to: "/courses/$courseSlug/delete", fuzzy: false });
  if (courseDelete) {
    return {
      courseSlug: courseDelete.courseSlug,
      entity: getDefaultEntityKey(appSchema),
      mode: "detail",
      page: "courseDelete",
      search,
    };
  }

  const courseDetail = matchRoute({ to: "/courses/$courseSlug", fuzzy: false });
  if (courseDetail) {
    return {
      courseSlug: courseDetail.courseSlug,
      entity: getDefaultEntityKey(appSchema),
      mode: "detail",
      page: "courseDetail",
      search,
    };
  }

  const cohortTake = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/attendanceRecords/take",
    fuzzy: false,
  });
  if (cohortTake) {
    return {
      attendanceTaking: true,
      canonicalPath: dashboardPath({
        cohortTag: cohortTake.cohortTag,
        courseSlug: cohortTake.courseSlug,
        entity: "attendanceRecords",
        subpage: "take",
      }),
      cohortTag: cohortTake.cohortTag,
      courseSlug: cohortTake.courseSlug,
      entity: "attendanceRecords",
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const cohortCharts = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/attendanceRecords/charts",
    fuzzy: false,
  });
  if (cohortCharts) {
    return {
      attendanceCharts: true,
      canonicalPath: dashboardPath({
        cohortTag: cohortCharts.cohortTag,
        courseSlug: cohortCharts.courseSlug,
        entity: "attendanceRecords",
        subpage: "charts",
      }),
      cohortTag: cohortCharts.cohortTag,
      courseSlug: cohortCharts.courseSlug,
      entity: "attendanceRecords",
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const cohortDashboardEdit = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity/$rowId/edit",
    fuzzy: false,
  });
  if (cohortDashboardEdit) {
    const entity = validateEntityKey(appSchema, cohortDashboardEdit.entity);
    return {
      canonicalPath: dashboardPath({
        cohortTag: cohortDashboardEdit.cohortTag,
        courseSlug: cohortDashboardEdit.courseSlug,
        entity,
        mode: "edit",
        rowId: cohortDashboardEdit.rowId,
      }),
      cohortTag: cohortDashboardEdit.cohortTag,
      courseSlug: cohortDashboardEdit.courseSlug,
      entity,
      mode: "edit",
      page: "dashboard",
      rowId: decodeURIComponent(cohortDashboardEdit.rowId),
      search,
    };
  }

  const cohortDashboardCreate = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity/new",
    fuzzy: false,
  });
  if (cohortDashboardCreate) {
    const entity = validateEntityKey(appSchema, cohortDashboardCreate.entity);
    return {
      canonicalPath: dashboardPath({
        cohortTag: cohortDashboardCreate.cohortTag,
        courseSlug: cohortDashboardCreate.courseSlug,
        entity,
        mode: "create",
      }),
      cohortTag: cohortDashboardCreate.cohortTag,
      courseSlug: cohortDashboardCreate.courseSlug,
      entity,
      mode: "create",
      page: "dashboard",
      search,
    };
  }

  const cohortWizard = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/attendanceRecords/wizard",
    fuzzy: false,
  });
  if (cohortWizard) {
    return {
      attendanceWizard: true,
      canonicalPath: dashboardPath({
        cohortTag: cohortWizard.cohortTag,
        courseSlug: cohortWizard.courseSlug,
        entity: "attendanceRecords",
        subpage: "wizard",
      }),
      cohortTag: cohortWizard.cohortTag,
      courseSlug: cohortWizard.courseSlug,
      entity: "attendanceRecords",
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const cohortStudentPhones = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/students/phones",
    fuzzy: false,
  });
  if (cohortStudentPhones) {
    return {
      canonicalPath: dashboardPath({
        cohortTag: cohortStudentPhones.cohortTag,
        courseSlug: cohortStudentPhones.courseSlug,
        entity: "students",
        subpage: "phones",
      }),
      cohortTag: cohortStudentPhones.cohortTag,
      courseSlug: cohortStudentPhones.courseSlug,
      entity: "students",
      mode: "list",
      page: "dashboard",
      search,
      studentPhones: true,
    };
  }

  const cohortDashboardDetail = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity/$rowId",
    fuzzy: false,
  });
  if (cohortDashboardDetail) {
    const entity = validateEntityKey(appSchema, cohortDashboardDetail.entity);
    return {
      canonicalPath: dashboardPath({
        cohortTag: cohortDashboardDetail.cohortTag,
        courseSlug: cohortDashboardDetail.courseSlug,
        entity,
        mode: "detail",
        rowId: cohortDashboardDetail.rowId,
      }),
      cohortTag: cohortDashboardDetail.cohortTag,
      courseSlug: cohortDashboardDetail.courseSlug,
      entity,
      mode: "detail",
      page: "dashboard",
      rowId: decodeURIComponent(cohortDashboardDetail.rowId),
      search,
    };
  }

  const cohortDashboardList = matchRoute({
    to: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity",
    fuzzy: false,
  });
  if (cohortDashboardList) {
    const entity = validateEntityKey(appSchema, cohortDashboardList.entity);
    return {
      canonicalPath: dashboardPath({
        cohortTag: cohortDashboardList.cohortTag,
        courseSlug: cohortDashboardList.courseSlug,
        entity,
      }),
      cohortTag: cohortDashboardList.cohortTag,
      courseSlug: cohortDashboardList.courseSlug,
      entity,
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const manualPoints = matchRoute({
    to: "/courses/$courseSlug/dashboard/points/manual",
    fuzzy: false,
  });
  if (manualPoints) {
    return {
      canonicalPath: dashboardPath({
        courseSlug: manualPoints.courseSlug,
        entity: "points",
        subpage: "manual",
      }),
      courseSlug: manualPoints.courseSlug,
      entity: "points",
      manualPoints: true,
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const deductions = matchRoute({
    to: "/courses/$courseSlug/dashboard/points/deductions",
    fuzzy: false,
  });
  if (deductions) {
    return {
      canonicalPath: dashboardPath({
        courseSlug: deductions.courseSlug,
        entity: "points",
        subpage: "deductions",
      }),
      courseSlug: deductions.courseSlug,
      deductions: true,
      entity: "points",
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const take = matchRoute({
    to: "/courses/$courseSlug/dashboard/attendanceRecords/take",
    fuzzy: false,
  });
  if (take) {
    return {
      attendanceTaking: true,
      canonicalPath: dashboardPath({
        courseSlug: take.courseSlug,
        entity: "attendanceRecords",
        subpage: "take",
      }),
      courseSlug: take.courseSlug,
      entity: "attendanceRecords",
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const charts = matchRoute({
    to: "/courses/$courseSlug/dashboard/attendanceRecords/charts",
    fuzzy: false,
  });
  if (charts) {
    return {
      attendanceCharts: true,
      canonicalPath: dashboardPath({
        courseSlug: charts.courseSlug,
        entity: "attendanceRecords",
        subpage: "charts",
      }),
      courseSlug: charts.courseSlug,
      entity: "attendanceRecords",
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const dashboardEdit = matchRoute({
    to: "/courses/$courseSlug/dashboard/$entity/$rowId/edit",
    fuzzy: false,
  });
  if (dashboardEdit) {
    const entity = validateEntityKey(appSchema, dashboardEdit.entity);
    return {
      canonicalPath: dashboardPath({
        courseSlug: dashboardEdit.courseSlug,
        entity,
        mode: "edit",
        rowId: dashboardEdit.rowId,
      }),
      courseSlug: dashboardEdit.courseSlug,
      entity,
      mode: resolveDashboardMode(dashboardEdit.rowId, true, false),
      page: "dashboard",
      rowId: decodeURIComponent(dashboardEdit.rowId),
      search,
    };
  }

  const dashboardCreate = matchRoute({
    to: "/courses/$courseSlug/dashboard/$entity/new",
    fuzzy: false,
  });
  if (dashboardCreate) {
    const entity = validateEntityKey(appSchema, dashboardCreate.entity);
    return {
      canonicalPath: dashboardPath({
        courseSlug: dashboardCreate.courseSlug,
        entity,
        mode: "create",
      }),
      courseSlug: dashboardCreate.courseSlug,
      entity,
      mode: resolveDashboardMode(undefined, false, true),
      page: "dashboard",
      search,
    };
  }

  const wizard = matchRoute({
    to: "/courses/$courseSlug/dashboard/attendanceRecords/wizard",
    fuzzy: false,
  });
  if (wizard) {
    return {
      attendanceWizard: true,
      canonicalPath: dashboardPath({
        courseSlug: wizard.courseSlug,
        entity: "attendanceRecords",
        subpage: "wizard",
      }),
      courseSlug: wizard.courseSlug,
      entity: "attendanceRecords",
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  const studentPhones = matchRoute({
    to: "/courses/$courseSlug/dashboard/students/phones",
    fuzzy: false,
  });
  if (studentPhones) {
    return {
      canonicalPath: dashboardPath({
        courseSlug: studentPhones.courseSlug,
        entity: "students",
        subpage: "phones",
      }),
      courseSlug: studentPhones.courseSlug,
      entity: "students",
      mode: "list",
      page: "dashboard",
      search,
      studentPhones: true,
    };
  }

  const dashboardDetail = matchRoute({
    to: "/courses/$courseSlug/dashboard/$entity/$rowId",
    fuzzy: false,
  });
  if (dashboardDetail) {
    const entity = validateEntityKey(appSchema, dashboardDetail.entity);
    return {
      canonicalPath: dashboardPath({
        courseSlug: dashboardDetail.courseSlug,
        entity,
        mode: "detail",
        rowId: dashboardDetail.rowId,
      }),
      courseSlug: dashboardDetail.courseSlug,
      entity,
      mode: resolveDashboardMode(dashboardDetail.rowId, false, false),
      page: "dashboard",
      rowId: decodeURIComponent(dashboardDetail.rowId),
      search,
    };
  }

  const dashboardList = matchRoute({
    to: "/courses/$courseSlug/dashboard/$entity",
    fuzzy: false,
  });
  if (dashboardList) {
    const entity = validateEntityKey(appSchema, dashboardList.entity);
    return {
      canonicalPath: dashboardPath({
        courseSlug: dashboardList.courseSlug,
        entity,
      }),
      courseSlug: dashboardList.courseSlug,
      entity,
      mode: "list",
      page: "dashboard",
      search,
    };
  }

  return {
    courseSlug: DEFAULT_COURSE_SLUG,
    entity: getDefaultEntityKey(appSchema),
    mode: "list",
    page: "dashboard",
    search,
  };
}
