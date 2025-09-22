// functions/_middleware.ts
import { createRemoteJWKSet, jwtVerify } from "jose";

// cache JWKS across requests
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export const onRequest: PagesFunction = async (ctx) => {
  const dev = ctx.env.LOCAL_DEV_MODE === "1";

  // DEV: trust x-dev-uid header
  if (dev) {
    const uid = ctx.request.headers.get("x-dev-uid") ?? "dev-user";
    ctx.data = { uid };
    return ctx.next();
  }

  // PROD: require a Bearer token, verify with Auth0
  const auth = ctx.request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    const issuer = `https://${ctx.env.AUTH0_DOMAIN}/`;
    JWKS ||= createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));

    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      audience: ctx.env.AUTH0_AUDIENCE,
    });

    const uid = String(payload.sub || "");
    if (!uid) throw new Error("missing sub");

    ctx.data = { uid };
    return ctx.next();
  } catch (err) {
    // keep logs quiet in prod
    if (ctx.env.LOCAL_DEV_MODE === "1") console.error("JWT verify failed:", err);
    return new Response("Unauthorized", { status: 401 });
  }
};
