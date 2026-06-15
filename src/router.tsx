import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import App from "./App";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/$entity",
});
const cohortDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity",
});
const cohortCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity/new",
});
const cohortDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity/$rowId",
});
const cohortEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity/$rowId/edit",
});

const studentPhonesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/students/phones",
});
const cohortStudentPhonesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/students/phones",
});

const attendanceTakingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/attendanceRecords/take",
});
const attendanceChartsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/attendanceRecords/charts",
});
const attendanceWizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/attendanceRecords/wizard",
});
const cohortAttendanceTakingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/attendanceRecords/take",
});
const cohortAttendanceChartsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/attendanceRecords/charts",
});
const cohortAttendanceWizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/attendanceRecords/wizard",
});

const cohortPointAdditionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/points/additions",
});
const cohortPointDeductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/points/deductions",
});

const manualPointsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/points/manual",
});
const pointAdditionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/points/additions",
});
const pointDeductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/points/deductions",
});

const createRoutePage = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/$entity/new",
});

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/$entity/$rowId",
});

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/$entity/$rowId/edit",
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
});

const logoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logout",
});

const coursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses",
});

const courseCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/new",
});

const courseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug",
});

const courseEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/edit",
});

const courseDeleteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/delete",
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/$",
});

const fallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
});

export const router = createRouter({
  basepath: import.meta.env.BASE_URL,
  routeTree: rootRoute.addChildren([
    indexRoute,
    homeRoute,
    dashboardRoute,
    cohortDashboardRoute,
    cohortCreateRoute,
    cohortDetailRoute,
    cohortEditRoute,
    studentPhonesRoute,
    cohortStudentPhonesRoute,
    attendanceTakingRoute,
    attendanceChartsRoute,
    attendanceWizardRoute,
    cohortAttendanceTakingRoute,
    cohortAttendanceChartsRoute,
    cohortAttendanceWizardRoute,
    cohortPointAdditionsRoute,
    cohortPointDeductionsRoute,
    manualPointsRoute,
    pointAdditionsRoute,
    pointDeductionsRoute,
    createRoutePage,
    detailRoute,
    editRoute,
    profileRoute,
    settingsRoute,
    logoutRoute,
    coursesRoute,
    courseCreateRoute,
    courseDetailRoute,
    courseEditRoute,
    courseDeleteRoute,
    authRoute,
    fallbackRoute,
  ]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
