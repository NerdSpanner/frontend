// functions/api/sidebar.ts
// Sidebar data with counts for Your/Public scopes and hardware split:
// - Loggers inherit privacy (via variables/asset public chain OR logger Privacy=0)
// - Oracles & Nodes are ALWAYS public (ignore Privacy)
// Also returns bottom metrics: totals for each hardware type, and "online" if a heartbeat table is present.

type Env = { DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const uid = ctx.data?.uid as string | undefined;
  if (!uid) return new Response("Unauthorized", { status: 401 });

  // Try to detect a heartbeat table for "online" counts (optional).
  // If you add one later (e.g., OracleHeartbeats(OID TEXT, LastSeen INTEGER)), this will auto-light up.
  let hasHeartbeat = false;
  try {
    const t = await ctx.env.DB
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='OracleHeartbeats'`)
      .first();
    hasHeartbeat = Boolean(t?.name);
  } catch {
    hasHeartbeat = false;
  }

  const SQL = `
WITH
  -- ===== direct grants =====
  g_c AS (SELECT TargetID AS CID FROM Permissions WHERE UID=? AND TargetType='CID'),
  g_l AS (SELECT TargetID AS LID FROM Permissions WHERE UID=? AND TargetType='LID'),
  g_f AS (SELECT TargetID AS FID FROM Permissions WHERE UID=? AND TargetType='FID'),
  g_a AS (SELECT TargetID AS AID FROM Permissions WHERE UID=? AND TargetType='AID'),
  g_v AS (SELECT TargetID AS VID FROM Permissions WHERE UID=? AND TargetType='VID'),
  g_o AS (SELECT TargetID AS OID FROM Permissions WHERE UID=? AND TargetType='OID'),
  g_d AS (SELECT TargetID AS DID FROM Permissions WHERE UID=? AND TargetType='DID'),

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
  f_from_a AS (SELECT DISTINCT F.FID FROM Assets A JOIN Fleets F ON F.FID=A.FID JOIN g_a ON g_a.AID=A.AID),
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
  a_from_v AS (SELECT DISTINCT A.AID FROM Variables V JOIN Assets A ON A.AID=V.AID JOIN g_v ON g_v.VID=V.VID),
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

  -- oracles visible to you: direct grants OR via your variables
  o_from_v AS (
    SELECT DISTINCT V.OID AS OID
    FROM Variables V
    JOIN your_variables YV ON YV.VID = V.VID
    WHERE V.OID IS NOT NULL
  ),
  your_oracles AS (
    SELECT DISTINCT OID FROM g_o
    UNION SELECT OID FROM o_from_v
  ),

  -- dashboards visible to you: direct DID grants OR attached to any your_* parent OR your_oracles
  your_dashboards AS (
    SELECT DISTINCT DID FROM g_d
    UNION
    SELECT DISTINCT D.DID
    FROM Dashboards D
    LEFT JOIN your_companies  YC ON YC.CID = D.CID
    LEFT JOIN your_locations  YL ON YL.LID = D.LID
    LEFT JOIN your_fleets     YF ON YF.FID = D.FID
    LEFT JOIN your_assets     YA ON YA.AID = D.AID
    LEFT JOIN your_oracles    YO ON YO.OID = D.OID
    WHERE YC.CID IS NOT NULL
       OR YL.LID IS NOT NULL
       OR YF.FID IS NOT NULL
       OR YA.AID IS NOT NULL
       OR YO.OID IS NOT NULL
  ),

  -- ===== PUBLIC visibility with propagation for hierarchy & data =====
  RECURSIVE pub_company_roots(CID) AS (
    SELECT CID FROM Companies WHERE Privacy=0
  ),
  RECURSIVE pub_companies_all(CID) AS (
    SELECT CID FROM pub_company_roots
    UNION
    SELECT C.CID FROM Companies C JOIN pub_companies_all P ON C.CIDParent = P.CID
  ),

  RECURSIVE pub_location_roots(LID) AS (
    SELECT LID FROM Locations WHERE Privacy=0
  ),
  RECURSIVE pub_locations_all(LID) AS (
    SELECT LID FROM pub_location_roots
    UNION
    SELECT L.LID FROM Locations L JOIN pub_locations_all P ON L.LIDParent = P.LID
    UNION
    SELECT L.LID FROM Locations L JOIN pub_companies_all PC ON L.CID = PC.CID
  ),

  pub_fleets_all(FID) AS (
    SELECT FID FROM Fleets WHERE Privacy=0
    UNION
    SELECT F.FID FROM Fleets F JOIN pub_locations_all L ON F.LID=L.LID
    UNION
    SELECT F.FID FROM Fleets F JOIN pub_companies_all C ON F.CID=C.CID
  ),

  pub_assets_all(AID) AS (
    SELECT AID FROM Assets WHERE Privacy=0
    UNION
    SELECT A.AID FROM Assets A JOIN pub_fleets_all F ON A.FID=F.FID
    UNION
    SELECT A.AID FROM Assets A JOIN pub_locations_all L ON A.LID=L.LID
    UNION
    SELECT A.AID FROM Assets A JOIN pub_companies_all C ON A.CID=C.CID
  ),

  pub_variables_all(VID) AS (
    SELECT VID FROM Variables WHERE Privacy=0
    UNION
    SELECT V.VID FROM Variables V JOIN pub_assets_all A ON V.AID=A.AID
  ),

  -- ===== Hardware type splits (from Oracles.Software) =====
  all_oracles AS (
    SELECT OID, Software, "Privacy" AS Privacy FROM Oracles
  ),
  logger_oids AS (SELECT OID FROM all_oracles WHERE Software LIKE '5%'),
  node_oids   AS (SELECT OID FROM all_oracles WHERE Software LIKE '7%'),
  oracle_oids AS (SELECT OID FROM all_oracles WHERE Software LIKE '3%'),

  -- YOUR hardware counts (based on your_oracles intersect)
  your_loggers AS (
    SELECT DISTINCT Y.OID FROM your_oracles Y JOIN logger_oids L ON L.OID = Y.OID
  ),
  your_nodes AS (
    SELECT DISTINCT Y.OID FROM your_oracles Y JOIN node_oids N ON N.OID = Y.OID
  ),
  your_oracles_split AS (
    SELECT DISTINCT Y.OID FROM your_oracles Y JOIN oracle_oids O ON O.OID = Y.OID
  ),

  -- PUBLIC hardware:
  -- * Oracles & Nodes are ALWAYS public (ignore Privacy)
  pub_oracles_all AS (SELECT OID FROM oracle_oids),
  pub_nodes_all   AS (SELECT OID FROM node_oids),

  -- * Loggers inherit privacy: public if Oracles.Privacy=0 OR there exists a public variable attached
  pub_loggers_all AS (
    SELECT DISTINCT O.OID
    FROM Oracles O
    LEFT JOIN Variables V ON V.OID = O.OID
    LEFT JOIN pub_variables_all PV ON PV.VID = V.VID
    WHERE O.Software LIKE '5%'
      AND (O.Privacy=0 OR PV.VID IS NOT NULL)
  ),

  -- Dashboards public if Privacy=0 OR attached to any public parent (CID/LID/FID/AID) OR a public oracle/node/logger
  pub_dashboards_all(DID) AS (
    SELECT DID FROM Dashboards WHERE Privacy=0
    UNION
    SELECT D.DID FROM Dashboards D JOIN pub_companies_all  C ON C.CID = D.CID
    UNION
    SELECT D.DID FROM Dashboards D JOIN pub_locations_all  L ON L.LID = D.LID
    UNION
    SELECT D.DID FROM Dashboards D JOIN pub_fleets_all     F ON F.FID = D.FID
    UNION
    SELECT D.DID FROM Dashboards D JOIN pub_assets_all     A ON A.AID = D.AID
    UNION
    SELECT D.DID FROM Dashboards D JOIN pub_oracles_all    OO ON OO.OID = D.OID
    UNION
    SELECT D.DID FROM Dashboards D JOIN pub_nodes_all      NN ON NN.OID = D.OID
    UNION
    SELECT D.DID FROM Dashboards D JOIN pub_loggers_all    LL ON LL.OID = D.OID
  )

SELECT
  -- YOUR counts
  (SELECT COUNT(*) FROM your_companies)        AS your_companies,
  (SELECT COUNT(*) FROM your_locations)        AS your_locations,
  (SELECT COUNT(*) FROM your_fleets)           AS your_fleets,
  (SELECT COUNT(*) FROM your_assets)           AS your_assets,
  (SELECT COUNT(*) FROM your_variables)        AS your_variables,
  (SELECT COUNT(*) FROM your_oracles_split)    AS your_oracles,
  (SELECT COUNT(*) FROM your_loggers)          AS your_loggers,
  (SELECT COUNT(*) FROM your_nodes)            AS your_nodes,
  (SELECT COUNT(*) FROM your_dashboards)       AS your_dashboards,

  -- PUBLIC counts
  (SELECT COUNT(*) FROM pub_companies_all)     AS pub_companies,
  (SELECT COUNT(*) FROM pub_locations_all)     AS pub_locations,
  (SELECT COUNT(*) FROM pub_fleets_all)        AS pub_fleets,
  (SELECT COUNT(*) FROM pub_assets_all)        AS pub_assets,
  (SELECT COUNT(*) FROM pub_variables_all)     AS pub_variables,
  (SELECT COUNT(*) FROM pub_oracles_all)       AS pub_oracles,
  (SELECT COUNT(*) FROM pub_loggers_all)       AS pub_loggers,
  (SELECT COUNT(*) FROM pub_nodes_all)         AS pub_nodes,
  (SELECT COUNT(*) FROM pub_dashboards_all)    AS pub_dashboards,

  -- TOTALS (regardless of privacy)
  (SELECT COUNT(*) FROM Oracles WHERE Software LIKE '3%') AS total_oracles,
  (SELECT COUNT(*) FROM Oracles WHERE Software LIKE '5%') AS total_loggers,
  (SELECT COUNT(*) FROM Oracles WHERE Software LIKE '7%') AS total_nodes
;`;

  const row = await ctx.env.DB
    .prepare(SQL)
    .bind(uid, uid, uid, uid, uid, uid, uid)
    .first();

  const your = {
    companies:  Number(row?.your_companies ?? 0),
    locations:  Number(row?.your_locations ?? 0),
    fleets:     Number(row?.your_fleets ?? 0),
    assets:     Number(row?.your_assets ?? 0),
    variables:  Number(row?.your_variables ?? 0),
    oracles:    Number(row?.your_oracles ?? 0),
    loggers:    Number(row?.your_loggers ?? 0),
    nodes:      Number(row?.your_nodes ?? 0),
    dashboards: Number(row?.your_dashboards ?? 0),
  };

  const pub = {
    companies:  Number(row?.pub_companies ?? 0),
    locations:  Number(row?.pub_locations ?? 0),
    fleets:     Number(row?.pub_fleets ?? 0),
    assets:     Number(row?.pub_assets ?? 0),
    variables:  Number(row?.pub_variables ?? 0),
    oracles:    Number(row?.pub_oracles ?? 0),
    loggers:    Number(row?.pub_loggers ?? 0),
    nodes:      Number(row?.pub_nodes ?? 0),
    dashboards: Number(row?.pub_dashboards ?? 0),
  };

  const metrics = {
    totals: {
      oracles: Number(row?.total_oracles ?? 0),
      loggers: Number(row?.total_loggers ?? 0),
      nodes:   Number(row?.total_nodes ?? 0),
    },
    // Online is unknown without a heartbeat table; will be filled if you add OracleHeartbeats
    online: { oracles: null as number | null, loggers: null as number | null, nodes: null as number | null },
  };

  if (hasHeartbeat) {
    try {
      // Example logic: consider online if heartbeat within last 10 minutes.
      // Adjust table/column names to your eventual schema.
      const rs = await ctx.env.DB.prepare(`
        WITH hb AS (
          SELECT OID, MAX(LastSeen) AS ls FROM OracleHeartbeats GROUP BY OID
        ),
        online_oids AS (
          SELECT OID FROM hb WHERE ls >= strftime('%s','now') - 600
        ),
        all_oracles AS (SELECT OID, Software FROM Oracles),
        online_oracles AS (SELECT oo.OID FROM online_oids oo JOIN all_oracles ao ON ao.OID=oo.OID WHERE ao.Software LIKE '3%'),
        online_loggers AS (SELECT oo.OID FROM online_oids oo JOIN all_oracles ao ON ao.OID=oo.OID WHERE ao.Software LIKE '5%'),
        online_nodes   AS (SELECT oo.OID FROM online_oids oo JOIN all_oracles ao ON ao.OID=oo.OID WHERE ao.Software LIKE '7%')
        SELECT
          (SELECT COUNT(*) FROM online_oracles) AS o,
          (SELECT COUNT(*) FROM online_loggers) AS l,
          (SELECT COUNT(*) FROM online_nodes)   AS n
      `).first();
      metrics.online = {
        oracles: Number(rs?.o ?? 0),
        loggers: Number(rs?.l ?? 0),
        nodes:   Number(rs?.n ?? 0),
      };
    } catch {
      // keep nulls if structure doesn't match
    }
  }

  return Response.json({
    user: { uid },
    metrics,
    sections: [
      {
        key: "your",
        label: "Your Network",
        groups: [
          { key: "ynHome", label: "Home", items: [
            { key: "home", label: "Overview", icon: "Home" },
          ]},
          { key: "ynDashboards", label: "Dashboards", items: [
            { key: "dashboards", label: "Dashboards", count: your.dashboards, icon: "LayoutDashboard" },
          ]},
          { key: "ynHardware", label: "Hardware", icon: "Database", items: [
            // Oracles & Nodes are always public → show as locked/disabled in Private
            { key: "oracles", label: "Oracles", count: your.oracles, icon: "Link", disabled: true },
            { key: "loggers", label: "Loggers", count: your.loggers, icon: "Wifi" },
            { key: "nodes",   label: "Nodes",   count: your.nodes,   icon: "Server", disabled: true },
          ]},
          { key: "ynVariables", label: "Variables", items: [
            { key: "variables", label: "Variables", count: your.variables, icon: "Sliders" },
          ]},
          { key: "ynHierarchy", label: "Hierarchy", items: [
            { key: "companies", label: "Companies", count: your.companies, icon: "Building2" },
            { key: "locations", label: "Locations", count: your.locations, icon: "MapPin" },
            { key: "fleets",    label: "Fleets",    count: your.fleets,    icon: "Truck" },
            { key: "assets",    label: "Assets",    count: your.assets,    icon: "Boxes" },
          ]},
        ],
      },
      {
        key: "public",
        label: "Public Network",
        groups: [
          { key: "pnHome", label: "Home", items: [
            { key: "home_pub", label: "Overview", icon: "Home" },
          ]},
          { key: "pnDashboards", label: "Dashboards", items: [
            { key: "dashboards_pub", label: "Dashboards", count: pub.dashboards, icon: "LayoutDashboard" },
          ]},
          { key: "pnHardware", label: "Hardware", icon: "Database", items: [
            { key: "oracles_pub", label: "Oracles", count: pub.oracles, icon: "Link" },
            { key: "loggers_pub", label: "Loggers", count: pub.loggers, icon: "Wifi" },
            { key: "nodes_pub",   label: "Nodes",   count: pub.nodes,   icon: "Server" },
          ]},
          { key: "pnVariables", label: "Variables", items: [
            { key: "variables_pub", label: "Variables", count: pub.variables, icon: "Sliders" },
          ]},
          { key: "pnHierarchy", label: "Hierarchy", items: [
            { key: "companies_pub", label: "Companies", count: pub.companies, icon: "Building2" },
            { key: "locations_pub", label: "Locations", count: pub.locations, icon: "MapPin" },
            { key: "fleets_pub",    label: "Fleets",    count: pub.fleets,    icon: "Truck" },
            { key: "assets_pub",    label: "Assets",    count: pub.assets,    icon: "Boxes" },
          ]},
        ],
      },
    ],
  });
};
