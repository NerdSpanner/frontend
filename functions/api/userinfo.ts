// functions/api/userinfo.ts
export const onRequestGet: PagesFunction = async (ctx) => {
  const uid = ctx.data?.uid as string | undefined;
  if (!uid) return new Response("Unauthorized", { status: 401 });

  // TODO: pull real dashboards for uid
  return Response.json({
    user: { sub: uid, email: `${uid}@example.dev` },
    dashboards: [],
  });
};

