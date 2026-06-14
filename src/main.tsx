import React from "react";
import ReactDOM from "react-dom/client";
import "@neondatabase/neon-js/ui/css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "./styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { registerSW } from "virtual:pwa-register";
import { router } from "./router";

registerSW({ immediate: true });

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
