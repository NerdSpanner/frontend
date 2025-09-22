import { onRequestGet as __api_counts_ts_onRequestGet } from "/home/user/frontend/building/functions/api/counts.ts"
import { onRequestGet as __api_sidebar_ts_onRequestGet } from "/home/user/frontend/building/functions/api/sidebar.ts"
import { onRequestGet as __api_userinfo_ts_onRequestGet } from "/home/user/frontend/building/functions/api/userinfo.ts"
import { onRequest as ___middleware_ts_onRequest } from "/home/user/frontend/building/functions/_middleware.ts"

export const routes = [
    {
      routePath: "/api/counts",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_counts_ts_onRequestGet],
    },
  {
      routePath: "/api/sidebar",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_sidebar_ts_onRequestGet],
    },
  {
      routePath: "/api/userinfo",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_userinfo_ts_onRequestGet],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_ts_onRequest],
      modules: [],
    },
  ]