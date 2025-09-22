export const onRequestGet: PagesFunction<{ DB: D1Database }> = async (ctx) => {
  const tables = ["Companies","Locations","Fleets","Assets","Variables","Oracles"];
  const out: Record<string, number> = {};
  for (const t of tables) {
    const r = await ctx.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first();
    out[t] = Number(r?.n ?? 0);
  }
  return Response.json({ uid: ctx.data?.uid ?? null, counts: out });
};
