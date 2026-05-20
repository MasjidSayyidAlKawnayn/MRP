import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import App from "./App";
import { appSchema } from "./crud/data";
import type { EntityKey } from "./crud/entities";
import { dashboardPath, getDefaultEntityKey } from "./routing";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({
      to: dashboardPath({
        courseSlug: "default",
        entity: getDefaultEntityKey(appSchema),
      }),
      replace: true,
    });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/$entity",
});
const cohortDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/cohorts/$cohortTag/dashboard/$entity",
});

const attendanceTakingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/attendanceRecords/take",
});

const manualPointsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseSlug/dashboard/points/manual",
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

const legacyDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$schema/$entity",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: dashboardPath({
        courseSlug: params.schema === "mqs" ? "default" : params.schema,
        entity: params.entity as EntityKey,
      }),
      replace: true,
    });
  },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
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
  beforeLoad: () => {
    throw redirect({
      to: dashboardPath({
        courseSlug: "default",
        entity: getDefaultEntityKey(appSchema),
      }),
      replace: true,
    });
  },
});

export const router = createRouter({
  basepath: import.meta.env.BASE_URL,
  routeTree: rootRoute.addChildren([
    indexRoute,
    dashboardRoute,
    cohortDashboardRoute,
    attendanceTakingRoute,
    manualPointsRoute,
    createRoutePage,
    detailRoute,
    editRoute,
    legacyDashboardRoute,
    profileRoute,
    settingsRoute,
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
