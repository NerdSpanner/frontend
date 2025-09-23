// functions/api/list.ts
type Env = { DB: D1Database };

function num(v: unknown, d = 0) { return Number.isFinite(Number(v)) ? Number(v) : d; }

const VALID_KINDS = new Set(["companies", "locations", "fleets", "assets"]);
const VALID_SCOPES = new Set(["your", "public"]);

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const uid = ctx.data?.uid as string | undefined;
  if (!uid) return new Response("Unauthorized", { status: 401 });

  const url = new URL(ctx.request.url);
  const kind = url.searchParams.get("kind")?.toLowerCase() || "";
  const scope = url.searchParams.get("scope")?.toLowerCase() || "your";
  const limit = Math.max(1, Math.min(50, num(url.searchParams.get("limit"), 5)));
  const offset = Math.max(0, num(url.searchParams.get("offset"), 0));

  if (!VALID_KINDS.has(kind) || !VALID_SCOPES.has(scope)) {
    return Response.json({ error: "invalid params" }, { status: 400 });
  }

  // Build the visibility CTEs (same idea as /api/sidebar)
  const SQL = `
WITH
  -- ===== direct grants =====
  g_c AS (SELECT TargetID AS CID FROM Permissions WHERE UID=? AND TargetType='CID'),
  g_l AS (SELECT TargetID AS LID FROM Permissions WHERE UID=? AND TargetType='LID'),
  g_f AS (SELECT TargetID AS FID FROM Permissions WHERE UID=? AND TargetType='FID'),
  g_a AS (SELECT TargetID AS AID FROM Permissions WHERE UID=? AND TargetType='AID'),

  -- ===== "your" visibility, parent-dominant =====
  c_from_l AS (SELECT DISTINCT L.CID FROM Locations  L JOIN g_l ON g_l.LID=L.LID),
  c_from_f AS (SELECT DISTINCT F.CID FROM Fleets     F JOIN g_f ON g_f.FID=F.FID),
  c_from_a AS (SELECT DISTINCT A.CID FROM Assets     A JOIN g_a ON g_a.AID=A.AID),

  your_companies AS (
    SELECT DISTINCT CID FROM g_c
    UNION SELECT CID FROM c_from_l
    UNION SELECT CID FROM c_from_f
    UNION SELECT CID FROM c_from_a
  ),

  l_from_c AS (SELECT DISTINCT L.LID FROM Locations L JOIN your_companies C ON C.CID=L.CID),
  l_from_f AS (SELECT DISTINCT L.LID FROM Fleets F JOIN Locations L ON L.LID=F.LID JOIN g_f ON g_f.FID=F.FID),
  l_from_a AS (SELECT DISTINCT L.LID FROM Assets  A JOIN Locations L ON L.LID=A.LID JOIN g_a ON g_a.AID=A.AID),

  your_locations AS (
    SELECT DISTINCT LID FROM g_l
    UNION SELECT LID FROM l_from_c
    UNION SELECT LID FROM l_from_f
    UNION SELECT LID FROM l_from_a
  ),

  f_from_c AS (SELECT DISTINCT F.FID FROM Fleets  F JOIN your_companies C ON C.CID=F.CID),
  f_from_l AS (SELECT DISTINCT F.FID FROM Fleets  F JOIN your_locations L ON L.LID=F.LID),
  f_from_a AS (SELECT DISTINCT F.FID FROM Assets  A JOIN Fleets     F ON F.FID=A.FID JOIN g_a ON g_a.AID=A.AID),

  your_fleets AS (
    SELECT DISTINCT FID FROM g_f
    UNION SELECT FID FROM f_from_c
    UNION SELECT FID FROM f_from_l
    UNION SELECT FID FROM f_from_a
  ),

  a_from_c AS (SELECT DISTINCT A.AID FROM Assets A JOIN your_companies C ON C.CID=A.CID),
  a_from_l AS (SELECT DISTINCT A.AID FROM Assets A JOIN your_locations L ON L.LID=A.LID),
  a_from_f AS (SELECT DISTINCT A.AID FROM Assets A JOIN your_fleets    F ON F.FID=A.FID),

  your_assets AS (
    SELECT DISTINCT AID FROM g_a
    UNION SELECT AID FROM a_from_c
    UNION SELECT AID FROM a_from_l
    UNION SELECT AID FROM a_from_f
  ),

  -- ===== public visibility with inheritance (companies & locations recursive) =====
  -- Seed public companies
  pub_companies_seed AS (SELECT CID FROM Companies WHERE Privacy=0),
  -- Recursively include child companies via CIDparent
  public_companies (CID) AS (
    SELECT CID FROM pub_companies_seed
    UNION ALL
    SELECT c.CID FROM Companies c JOIN public_companies pc ON c.CIDparent = pc.CID
  ),

  -- Locations: explicit public OR belong to any public company (including descendants),
  -- then recursively include child locations via LIDparent
  public_locations_seed AS (
    SELECT L.LID FROM Locations L WHERE L.Privacy=0
    UNION
    SELECT L.LID FROM Locations L JOIN public_companies pc ON L.CID = pc.CID
  ),

  public_locations (LID) AS (
    SELECT LID FROM public_locations_seed
    UNION ALL
    SELECT child.LID FROM Locations child JOIN public_locations pl ON child.LIDparent = pl.LID
  ),

  -- Fleets public if explicitly public OR in a public company OR in a public location
  public_fleets AS (
    SELECT FID FROM Fleets WHERE Privacy=0
    UNION
    SELECT F.FID FROM Fleets F JOIN public_companies pc ON pc.CID = F.CID
    UNION
    SELECT F.FID FROM Fleets F JOIN public_locations pl ON pl.LID = F.LID
  ),

  -- Assets public if explicitly public OR in a public company OR location OR fleet
  public_assets AS (
    SELECT AID FROM Assets WHERE Privacy=0
    UNION SELECT A.AID FROM Assets A JOIN public_companies pc ON pc.CID = A.CID
    UNION SELECT A.AID FROM Assets A JOIN public_locations pl  ON pl.LID = A.LID
    UNION SELECT A.AID FROM Assets A JOIN public_fleets pf     ON pf.FID = A.FID
  )

-- SELECT list depends on requested kind + scope
`;

  // Map kind/scope to SELECT + ORDER/LIMIT
  const selects: Record<string, { your: string; public: string }> = {
    companies: {
      your:  `
        SELECT c.CID AS id, c.Name AS name
        FROM Companies c
        JOIN your_companies yc ON yc.CID = c.CID
        ORDER BY c.Name ASC
        LIMIT ? OFFSET ?`,
      public: `
        SELECT c.CID AS id, c.Name AS name
        FROM Companies c
        JOIN public_companies pc ON pc.CID = c.CID
        ORDER BY c.Name ASC
        LIMIT ? OFFSET ?`,
    },
    locations: {
      your:  `
        SELECT l.LID AS id, l.Name AS name
        FROM Locations l
        JOIN your_locations yl ON yl.LID = l.LID
        ORDER BY l.Name ASC
        LIMIT ? OFFSET ?`,
      public: `
        SELECT l.LID AS id, l.Name AS name
        FROM Locations l
        JOIN public_locations pl ON pl.LID = l.LID
        ORDER BY l.Name ASC
        LIMIT ? OFFSET ?`,
    },
    fleets: {
      your:  `
        SELECT f.FID AS id, f.Name AS name
        FROM Fleets f
        JOIN your_fleets yf ON yf.FID = f.FID
        ORDER BY f.Name ASC
        LIMIT ? OFFSET ?`,
      public: `
        SELECT f.FID AS id, f.Name AS name
        FROM Fleets f
        JOIN public_fleets pf ON pf.FID = f.FID
        ORDER BY f.Name ASC
        LIMIT ? OFFSET ?`,
    },
    assets: {
      your:  `
        SELECT a.AID AS id, a.Name AS name
        FROM Assets a
        JOIN your_assets ya ON ya.AID = a.AID
        ORDER BY a.Name ASC
        LIMIT ? OFFSET ?`,
      public: `
        SELECT a.AID AS id, a.Name AS name
        FROM Assets a
        JOIN public_assets pa ON pa.AID = a.AID
        ORDER BY a.Name ASC
        LIMIT ? OFFSET ?`,
    },
  };

  const counters: Record<string, { your: string; public: string }> = {
    companies: {
      your:   `SELECT COUNT(*) AS n FROM your_companies`,
      public: `SELECT COUNT(*) AS n FROM public_companies`,
    },
    locations: {
      your:   `SELECT COUNT(*) AS n FROM your_locations`,
      public: `SELECT COUNT(*) AS n FROM public_locations`,
    },
    fleets: {
      your:   `SELECT COUNT(*) AS n FROM your_fleets`,
      public: `SELECT COUNT(*) AS n FROM public_fleets`,
    },
    assets: {
      your:   `SELECT COUNT(*) AS n FROM your_assets`,
      public: `SELECT COUNT(*) AS n FROM public_assets`,
    },
  };

  const sel = selects[kind][scope];
  const cnt = counters[kind][scope];

  const totalRow = await ctx.env.DB.prepare(SQL + cnt).bind(uid, uid, uid, uid).first();
  const total = Number(totalRow?.n ?? 0);

  const stmt = ctx.env.DB.prepare(SQL + sel).bind(uid, uid, uid, uid, limit, offset);
  const rows: Array<{ id: string | number; name: string }> = await stmt.all().then(r => (r.results as any) || []);

  return Response.json({ total, items: rows });
};
