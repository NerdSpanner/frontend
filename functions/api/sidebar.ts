// functions/api/sidebar.ts
type Env = { DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const uid = ctx.data?.uid as string | undefined;
  if (!uid) return new Response("Unauthorized", { status: 401 });

  const SQL = `
WITH
  -- ===== direct grants =====
  g_c AS (SELECT TargetID AS CID FROM Permissions WHERE UID=? AND TargetType='CID'),
  g_l AS (SELECT TargetID AS LID FROM Permissions WHERE UID=? AND TargetType='LID'),
  g_f AS (SELECT TargetID AS FID FROM Permissions WHERE UID=? AND TargetType='FID'),
  g_a AS (SELECT TargetID AS AID FROM Permissions WHERE UID=? AND TargetType='AID'),
  g_v AS (SELECT TargetID AS VID FROM Permissions WHERE UID=? AND TargetType='VID'),
  g_o AS (SELECT TargetID AS OID FROM Permissions WHERE UID=? AND TargetType='OID'),

  -- ===== YOUR visibility (permission-based, parent-dominant) =====
  c_from_l AS (SELECT DISTINCT L.CID FROM Locations  L JOIN g_l ON g_l.LID=L.LID),
  c_from_f AS (SELECT DISTINCT F.CID FROM Fleets     F JOIN g_f ON g_f.FID=F.FID),
  c_from_a AS (SELECT DISTINCT A.CID FROM Assets     A JOIN g_a ON g_a.AID=A.AID),
  c_from_v AS (SELECT DISTINCT A.CID FROM Variables  V JOIN Assets A ON A.AID=V.AID JOIN g_v ON g_v.VID=V.VID),

  your_companies AS (
    SELECT DISTINCT CID FROM g_c
    UNION SELECT CID FROM c_from_l
    UNION SELECT CID FROM c_from_f
    UNION SELECT CID FROM c_from_a
    UNION SELECT CID FROM c_from_v
  ),

  l_from_c AS (SELECT DISTINCT L.LID FROM Locations L JOIN your_companies C ON C.CID=L.CID),
  l_from_f AS (SELECT DISTINCT L.LID FROM Fleets F JOIN Locations L ON L.LID=F.LID JOIN g_f ON g_f.FID=F.FID),
  l_from_a AS (SELECT DISTINCT L.LID FROM Assets A JOIN Locations L ON L.LID=A.LID JOIN g_a ON g_a.AID=A.AID),
  l_from_v AS (
    SELECT DISTINCT L.LID
    FROM Variables V JOIN Assets A ON A.AID=V.AID
    JOIN Locations L ON L.LID=A.LID
    JOIN g_v ON g_v.VID=V.VID
  ),
  your_locations AS (
    SELECT DISTINCT LID FROM g_l
    UNION SELECT LID FROM l_from_c
    UNION SELECT LID FROM l_from_f
    UNION SELECT LID FROM l_from_a
    UNION SELECT LID FROM l_from_v
  ),

  f_from_c AS (SELECT DISTINCT F.FID FROM Fleets F JOIN your_companies C ON C.CID=F.CID),
  f_from_l AS (SELECT DISTINCT F.FID FROM Fleets F JOIN your_locations L ON L.LID=F.LID),
  f_from_a AS (
    SELECT DISTINCT F.FID FROM Assets A JOIN Fleets F ON F.FID=A.FID JOIN g_a ON g_a.AID=A.AID
  ),
  f_from_v AS (
    SELECT DISTINCT F.FID
    FROM Variables V JOIN Assets A ON A.AID=V.AID
    JOIN Fleets F ON F.FID=A.FID
    JOIN g_v ON g_v.VID=V.VID
  ),
  your_fleets AS (
    SELECT DISTINCT FID FROM g_f
    UNION SELECT FID FROM f_from_c
    UNION SELECT FID FROM f_from_l
    UNION SELECT FID FROM f_from_a
    UNION SELECT FID FROM f_from_v
  ),

  a_from_c AS (SELECT DISTINCT A.AID FROM Assets A JOIN your_companies C ON C.CID=A.CID),
  a_from_l AS (SELECT DISTINCT A.AID FROM Assets A JOIN your_locations L ON L.LID=A.LID),
  a_from_f AS (SELECT DISTINCT A.AID FROM Assets A JOIN your_fleets    F ON F.FID=A.FID),
  a_from_v AS (
    SELECT DISTINCT A.AID FROM Variables V JOIN Assets A ON A.AID=V.AID JOIN g_v ON g_v.VID=V.VID
  ),
  your_assets AS (
    SELECT DISTINCT AID FROM g_a
    UNION SELECT AID FROM a_from_c
    UNION SELECT AID FROM a_from_l
    UNION SELECT AID FROM a_from_f
    UNION SELECT AID FROM a_from_v
  ),

  v_from_a AS (SELECT DISTINCT V.VID FROM Variables V JOIN your_assets A ON A.AID=V.AID),
  your_variables AS (
    SELECT DISTINCT VID FROM g_v
    UNION SELECT VID FROM v_from_a
  ),

  your_oracles AS (SELECT DISTINCT OID FROM g_o),

  -- ===== PUBLIC visibility (IsPublic=1, ignore ancestors) =====
  public_companies  AS (SELECT CID FROM Companies  WHERE Privacy=0),
  public_locations  AS (SELECT LID FROM Locations  WHERE Privacy=0),
  public_fleets     AS (SELECT FID FROM Fleets     WHERE Privacy=0),
  public_assets     AS (SELECT AID FROM Assets     WHERE Privacy=0),
  public_variables  AS (SELECT VID FROM Variables  WHERE Privacy=0),
  public_oracles    AS (SELECT OID FROM Oracles    WHERE Privacy=0)

SELECT
  (SELECT COUNT(*) FROM your_companies)  AS your_companies,
  (SELECT COUNT(*) FROM your_locations)  AS your_locations,
  (SELECT COUNT(*) FROM your_fleets)     AS your_fleets,
  (SELECT COUNT(*) FROM your_assets)     AS your_assets,
  (SELECT COUNT(*) FROM your_variables)  AS your_variables,
  (SELECT COUNT(*) FROM your_oracles)    AS your_oracles,

  (SELECT COUNT(*) FROM public_companies) AS pub_companies,
  (SELECT COUNT(*) FROM public_locations) AS pub_locations,
  (SELECT COUNT(*) FROM public_fleets)    AS pub_fleets,
  (SELECT COUNT(*) FROM public_assets)    AS pub_assets,
  (SELECT COUNT(*) FROM public_variables) AS pub_variables,
  (SELECT COUNT(*) FROM public_oracles)   AS pub_oracles
;`;

  const row = await ctx.env.DB.prepare(SQL).bind(uid, uid, uid, uid, uid, uid).first();

  const your = {
    companies:  Number(row?.your_companies ?? 0),
    locations:  Number(row?.your_locations ?? 0),
    fleets:     Number(row?.your_fleets ?? 0),
    assets:     Number(row?.your_assets ?? 0),
    variables:  Number(row?.your_variables ?? 0),
    oracles:    Number(row?.your_oracles ?? 0),
  };
  const pub = {
    companies:  Number(row?.pub_companies ?? 0),
    locations:  Number(row?.pub_locations ?? 0),
    fleets:     Number(row?.pub_fleets ?? 0),
    assets:     Number(row?.pub_assets ?? 0),
    variables:  Number(row?.pub_variables ?? 0),
    oracles:    Number(row?.pub_oracles ?? 0),
  };

  return Response.json({
    user: { uid },
    sections: [
      {
        key: "your",
        label: "Your Network",
        groups: [
          { key: "data", label: "Data", items: [
            { key: "variables",  label: "Variables",  count: your.variables, icon: "Sliders" },
            { key: "dashboards", label: "Dashboards", count: 0,              icon: "LayoutDashboard" },
          ]},
          { key: "hardware", label: "Hardware", items: [
            { key: "oracles",  label: "Oracles",  count: your.oracles, icon: "Antenna" },
          ]},
          { key: "hierarchy", label: "Hierarchy", items: [
            { key: "companies", label: "Companies", count: your.companies, icon: "Building2" },
            { key: "locations", label: "Locations", count: your.locations, icon: "MapPin" },
            { key: "fleets",    label: "Fleets",    count: your.fleets,    icon: "Truck", disabled: your.fleets === 0 },
            { key: "assets",    label: "Assets",    count: your.assets,    icon: "Boxes" },
            { key: "variables_h", label: "Variables", count: your.variables, icon: "Sliders" },
          ]},
        ],
      },
      {
        key: "public",
        label: "Public Network",
        groups: [
          { key: "data_pub", label: "Data", items: [
            { key: "variables_pub",  label: "Variables",  count: pub.variables, icon: "Sliders" },
            { key: "dashboards_pub", label: "Dashboards", count: 0,              icon: "LayoutDashboard" },
          ]},
          { key: "hierarchy_pub", label: "Hierarchy", items: [
            { key: "companies_pub", label: "Companies", count: pub.companies, icon: "Building2" },
            { key: "locations_pub", label: "Locations", count: pub.locations, icon: "MapPin" },
            { key: "fleets_pub",    label: "Fleets",    count: pub.fleets,    icon: "Truck" },
            { key: "assets_pub",    label: "Assets",    count: pub.assets,    icon: "Boxes" },
            { key: "variables_pub2", label: "Variables", count: pub.variables, icon: "Sliders" },
          ]},
        ],
      },
    ],
  });
};

