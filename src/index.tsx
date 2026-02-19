/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import { routeTree } from "./routeTree.gen";
import { createRouter, RouterProvider } from "@tanstack/solid-router";

const router = createRouter({ routeTree });

declare module "@tanstack/solid-router" {
  interface Register {
    // This infers the type of our router and registers it across your entire project
    router: typeof router;
  }
}

render(() => <RouterProvider router={router} />, document.getElementById("root") as HTMLElement);
