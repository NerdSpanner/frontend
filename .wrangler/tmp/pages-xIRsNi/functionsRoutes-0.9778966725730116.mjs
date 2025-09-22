import { onRequestGet as __api_counts_ts_onRequestGet } from "/home/user/frontend/building/functions/api/counts.ts"
import { onRequestGet as __api_sidebar_ts_onRequestGet } from "/home/user/frontend/building/functions/api/sidebar.ts"
import { onRequestGet as __api_userinfo_ts_onRequestGet } from "/home/user/frontend/building/functions/api/userinfo.ts"

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
  ]