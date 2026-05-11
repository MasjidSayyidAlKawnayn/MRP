import React from "react";
import ReactDOM from "react-dom/client";
import "@neondatabase/neon-js/ui/css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "./styles.css";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
