import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import App from "./App";
import { getConfiguredSchemas } from "./components/CrudDashboard";
import { dashboardPath, getDefaultEntityKey, getDefaultSchema } from "./routing";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const schemas = getConfiguredSchemas();
    const schema = getDefaultSchema(schemas);
    throw redirect({
      to: dashboardPath({
        schema,
        entity: getDefaultEntityKey(schema),
      }),
      replace: true,
    });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$schema/$entity",
});

const attendanceTakingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$schema/attendanceRecords/take",
});

const createRoutePage = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$schema/$entity/new",
});

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$schema/$entity/$rowId",
});

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$schema/$entity/$rowId/edit",
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/$",
});

const fallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  beforeLoad: () => {
    const schemas = getConfiguredSchemas();
    const schema = getDefaultSchema(schemas);
    throw redirect({
      to: dashboardPath({
        schema,
        entity: getDefaultEntityKey(schema),
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
    attendanceTakingRoute,
    createRoutePage,
    detailRoute,
    editRoute,
    profileRoute,
    settingsRoute,
    authRoute,
    fallbackRoute,
  ]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
