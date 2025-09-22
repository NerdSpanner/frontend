PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE Companies (
  CID TEXT PRIMARY KEY,
  CIDparent TEXT NULL,
  Name TEXT NOT NULL,
  Country TEXT NOT NULL,
  Description TEXT, "Privacy" NOT NULL DEFAULT 1,
  FOREIGN KEY (CIDparent) REFERENCES Companies (CID) -- Corrected from Locations → Companies
);
CREATE TABLE Locations (
  LID TEXT PRIMARY KEY,
  LIDparent TEXT NULL,
  CID TEXT NULL,
  Name TEXT NOT NULL,
  Town TEXT NOT NULL,
  Description TEXT,
  Lat REAL NOT NULL,
  Lon REAL NOT NULL,
  MapZoom INTEGER NOT NULL DEFAULT 10, "Privacy" NOT NULL DEFAULT 1,
  FOREIGN KEY (CID) REFERENCES Companies (CID),
  FOREIGN KEY (LIDparent) REFERENCES Locations (LID)
);
CREATE TABLE Assets (
  AID TEXT PRIMARY KEY,
  FID TEXT NULL,
  LID TEXT NULL,
  CID TEXT NULL,
  Name TEXT NOT NULL,
  Description TEXT,
  Type TEXT NOT NULL,
  IconMDI TEXT NULL,
  Brand TEXT NULL,
  Model TEXT NULL,
  Serial TEXT NULL, "Privacy" NOT NULL DEFAULT 1,
  FOREIGN KEY (FID) REFERENCES Fleets (FID),
  FOREIGN KEY (LID) REFERENCES Locations (LID),
  FOREIGN KEY (CID) REFERENCES Companies (CID)
);
CREATE TABLE Oracles (
  OID TEXT PRIMARY KEY,
  Name TEXT NOT NULL,
  Description TEXT,
  Hardware TEXT,
  Software TEXT,
  Connectivity TEXT NOT NULL DEFAULT 'WiFi',
  Hostname TEXT NOT NULL DEFAULT '0.0.0.0'
, "Privacy" NOT NULL DEFAULT 1);
CREATE TABLE Variables (
  VID TEXT PRIMARY KEY,
  OID TEXT NOT NULL,
  AID TEXT,
  FID TEXT,
  LID TEXT,
  CID TEXT,
  Name TEXT NOT NULL,
  Description TEXT,
  VarName TEXT NOT NULL,
  VarUnit TEXT NOT NULL,
  VarOrder INTEGER NOT NULL DEFAULT 0,
  Aggregate INTEGER NOT NULL DEFAULT 0, "Privacy" NOT NULL DEFAULT 1,
  FOREIGN KEY (OID) REFERENCES Oracles (OID),
  FOREIGN KEY (AID) REFERENCES Assets (AID),
  FOREIGN KEY (FID) REFERENCES Fleets (FID),
  FOREIGN KEY (LID) REFERENCES Locations (LID),
  FOREIGN KEY (CID) REFERENCES Companies (CID)
);
CREATE TABLE Dashboards (
  DID TEXT PRIMARY KEY,
  OID TEXT,
  AID TEXT,
  FID TEXT,
  LID TEXT,
  CID TEXT,
  Name TEXT NOT NULL,
  GrafanaURL TEXT,
  Description TEXT, "Privacy" NOT NULL DEFAULT 1,
  FOREIGN KEY (OID) REFERENCES Oracles (OID),
  FOREIGN KEY (AID) REFERENCES Assets (AID),
  FOREIGN KEY (FID) REFERENCES Fleets (FID),
  FOREIGN KEY (LID) REFERENCES Locations (LID),
  FOREIGN KEY (CID) REFERENCES Companies (CID)
);
CREATE TABLE Permissions (
  PID TEXT PRIMARY KEY,
  UID TEXT NOT NULL,         -- Hashed Auth0 sub
  TargetType TEXT NOT NULL,  -- e.g. 'CID', 'AID', etc.
  TargetID TEXT NOT NULL,    -- UUID of the target
  UNIQUE (UID, TargetType, TargetID)
);
CREATE TABLE Fleets (
  FID TEXT PRIMARY KEY,
  LID TEXT NULL,
  CID TEXT NULL,
  Name TEXT NOT NULL,
  Description TEXT,
  Type TEXT, "Privacy" NOT NULL DEFAULT 1,
  FOREIGN KEY (LID) REFERENCES Locations (LID),
  FOREIGN KEY (CID) REFERENCES Companies (CID)
);
CREATE INDEX idx_permissions_lookup ON Permissions(UID, TargetType, TargetID);
CREATE INDEX idx_permissions_target ON Permissions(TargetType, TargetID);
CREATE INDEX idx_locations_parent  ON Locations(LIDparent);
CREATE INDEX idx_dashboards_fk
  ON Dashboards(CID, LID, FID, AID, OID);
CREATE INDEX idx_fleets_fk ON Fleets(CID, LID);
CREATE INDEX idx_assets_fk
  ON Assets(CID, LID, FID);
CREATE INDEX idx_variables_fk
  ON Variables(CID, LID, FID, AID, OID);
CREATE INDEX idx_permissions_uid
  ON Permissions(UID);
CREATE INDEX idx_companies_parent  ON Companies(CIDparent);
