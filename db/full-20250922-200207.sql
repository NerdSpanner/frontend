PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE Companies (
  CID TEXT PRIMARY KEY,
  CIDparent TEXT NULL,
  Name TEXT NOT NULL,
  Country TEXT NOT NULL,
  Description TEXT, "Privacy" NOT NULL DEFAULT 1,
  FOREIGN KEY (CIDparent) REFERENCES Companies (CID) -- Corrected from Locations → Companies
);
INSERT INTO Companies VALUES('437d00a6-2773-4d7e-a307-8932c43949dc',NULL,'Hills Educational Foundation','AU',NULL,1);
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
INSERT INTO Locations VALUES('e9e2a9d0-3c55-4d56-90af-a8a6a04501ac',NULL,NULL,'Westoff Property','Jimboomba',NULL,-27.852483398463132,153.0151352277671,10,1);
INSERT INTO Locations VALUES('a04c35ac-bb56-4981-986b-b2f2da5a8901','e9e2a9d0-3c55-4d56-90af-a8a6a04501ac',NULL,'House','Jimboomba',NULL,-27.852483398463132,153.0151352277671,10,1);
INSERT INTO Locations VALUES('da3f56b2-9709-46fe-a5ed-1a86d426b49a','e9e2a9d0-3c55-4d56-90af-a8a6a04501ac',NULL,'Back Yard','Jimboomba',NULL,-27.852483398463132,153.0151352277671,10,1);
INSERT INTO Locations VALUES('37d34bc8-15b4-4d37-afab-2317e9084f33','da3f56b2-9709-46fe-a5ed-1a86d426b49a',NULL,'Rotunda','Jimboomba',NULL,-27.852483398463132,153.0151352277671,10,1);
INSERT INTO Locations VALUES('82c00aed-3e79-4138-afd3-b94c63f9fb2c','da3f56b2-9709-46fe-a5ed-1a86d426b49a',NULL,'Water Tank','Jimboomba',NULL,-27.852483398463132,153.0151352277671,10,1);
INSERT INTO Locations VALUES('8e32ac66-32e2-4a82-b4a2-6b5539d571e0',NULL,'437d00a6-2773-4d7e-a307-8932c43949dc','Campus West','Jimboomba',NULL,-27.816725401691343,153.014161994757,10,1);
INSERT INTO Locations VALUES('2a388af3-b71b-478f-a115-cb71785817e3','8e32ac66-32e2-4a82-b4a2-6b5539d571e0',NULL,'Solar Farm','Jimboomba',NULL,-27.816706477219455,153.0135543495567,10,1);
INSERT INTO Locations VALUES('4b3932e4-7573-4c2a-aec9-b3e9eda6c04c','8e32ac66-32e2-4a82-b4a2-6b5539d571e0',NULL,'Cafeteria','Jimboomba',NULL,-27.816663942902586,153.01519418878036,10,1);
INSERT INTO Locations VALUES('2afbe2a5-bec9-426a-b341-b15f706c6d04','8e32ac66-32e2-4a82-b4a2-6b5539d571e0',NULL,'Allen Hall','Jimboomba',NULL,-27.817377719076095,153.01510455402027,10,1);
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
INSERT INTO Fleets VALUES('888cb371-ec2d-49a7-9bed-3b3a07abdb34','2a388af3-b71b-478f-a115-cb71785817e3',NULL,'Bifacial Array',NULL,'Solar',0);
INSERT INTO Fleets VALUES('89ace2e6-bec0-4398-a45b-0603ab78a1c9','2a388af3-b71b-478f-a115-cb71785817e3',NULL,'2-Axis Array',NULL,'Solar',1);
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
INSERT INTO Assets VALUES('f03d6252-a96a-4950-b42f-6bc1f3d7bc9e',NULL,'a04c35ac-bb56-4981-986b-b2f2da5a8901',NULL,'Main DB',NULL,'power_electrical',NULL,'',NULL,NULL,1);
INSERT INTO Assets VALUES('ba471f63-63fa-487e-98f1-75a380086ab8',NULL,'da3f56b2-9709-46fe-a5ed-1a86d426b49a',NULL,'Water Tank','','res_water',NULL,NULL,NULL,NULL,1);
INSERT INTO Assets VALUES('1379056d-b90f-40d1-862f-7df4cf7a62f7',NULL,'37d34bc8-15b4-4d37-afab-2317e9084f33',NULL,'Battery System',NULL,'power_electrical',NULL,NULL,NULL,NULL,1);
INSERT INTO Assets VALUES('71b14517-c7f8-47d6-bbe5-a7b5346c8d0d','888cb371-ec2d-49a7-9bed-3b3a07abdb34',NULL,NULL,'Inverter East',NULL,'power_electrical',NULL,'Sungrow','SG15',NULL,1);
INSERT INTO Assets VALUES('6adc9cf6-f9b1-4340-b428-3f3e2e057a34','888cb371-ec2d-49a7-9bed-3b3a07abdb34',NULL,NULL,'Inverter West',NULL,'power_electrical',NULL,'Sungrow','SG15',NULL,1);
CREATE TABLE Oracles (
  OID TEXT PRIMARY KEY,
  Name TEXT NOT NULL,
  Description TEXT,
  Hardware TEXT,
  Software TEXT,
  Connectivity TEXT NOT NULL DEFAULT 'WiFi',
  Hostname TEXT NOT NULL DEFAULT '0.0.0.0'
, "Privacy" NOT NULL DEFAULT 1);
INSERT INTO Oracles VALUES('6c82fc52-173b-4137-bb8d-9d7b130c5868','DB Modbus Wifi','Modbus wifi logger in the db bouard','RpiZeroW','5','Wifi','0.0.0.0',1);
INSERT INTO Oracles VALUES('9b4bafe7-22b6-4e94-88d1-709f80d0a8a6','Tank Level ADC','16bit ADC on industrial water level transducer','RpiZeroW','5','WiFi','0.0.0.0',1);
INSERT INTO Oracles VALUES('6c923664-3f5d-464e-8254-a9639b77f7e1','Bifacial Test Wall','Custom logger & kiosk display on the equipment wall','Rpi CM4','5','WiFi','0.0.0.0',0);
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
INSERT INTO Variables VALUES('9fdac15e-0eb6-4b48-abb0-4105b5ec4043','6c82fc52-173b-4137-bb8d-9d7b130c5868','f03d6252-a96a-4950-b42f-6bc1f3d7bc9e',NULL,NULL,NULL,'Consumption',NULL,'Watt','W',0,0,1);
INSERT INTO Variables VALUES('f67e72f6-9dec-447d-b8ed-a1726c030494','6c82fc52-173b-4137-bb8d-9d7b130c5868','f03d6252-a96a-4950-b42f-6bc1f3d7bc9e',NULL,NULL,NULL,'Voltage',NULL,'Volt','V',0,0,1);
INSERT INTO Variables VALUES('3e5ee25d-6be9-4e90-8ff5-18cf1baf8331','6c82fc52-173b-4137-bb8d-9d7b130c5868','f03d6252-a96a-4950-b42f-6bc1f3d7bc9e',NULL,NULL,NULL,'PF',NULL,'PF','NULL',0,0,1);
INSERT INTO Variables VALUES('e440cb2e-ad65-4843-b6e2-10b8a03f488d','6c82fc52-173b-4137-bb8d-9d7b130c5868','f03d6252-a96a-4950-b42f-6bc1f3d7bc9e',NULL,NULL,NULL,'Energy',NULL,'Energy','Wh',0,0,1);
INSERT INTO Variables VALUES('bc356bf1-1f85-42cc-a864-4f8640636a3a','6c82fc52-173b-4137-bb8d-9d7b130c5868','f03d6252-a96a-4950-b42f-6bc1f3d7bc9e',NULL,NULL,NULL,'Current',NULL,'Amp','A',0,0,1);
INSERT INTO Variables VALUES('b0a0bce9-058e-480e-a6ce-59fc4cebe702','6c82fc52-173b-4137-bb8d-9d7b130c5868','f03d6252-a96a-4950-b42f-6bc1f3d7bc9e',NULL,NULL,NULL,'Frequency',NULL,'Hertz','Hz',0,0,1);
INSERT INTO Variables VALUES('57b11712-1e09-44d3-b997-f637fbbfbe95','6c82fc52-173b-4137-bb8d-9d7b130c5868','1379056d-b90f-40d1-862f-7df4cf7a62f7',NULL,NULL,NULL,'SOC',NULL,'SOC','%',0,0,1);
INSERT INTO Variables VALUES('992df311-7619-40bd-9c09-3728c3e4c35a','6c82fc52-173b-4137-bb8d-9d7b130c5868','1379056d-b90f-40d1-862f-7df4cf7a62f7',NULL,NULL,NULL,'Power',NULL,'Watt','W',0,0,1);
INSERT INTO Variables VALUES('754dea7c-059a-4d73-80b6-0d49a8dc40cc','6c82fc52-173b-4137-bb8d-9d7b130c5868','1379056d-b90f-40d1-862f-7df4cf7a62f7',NULL,NULL,NULL,'Current',NULL,'Amp','A',0,0,1);
INSERT INTO Variables VALUES('b8ddcecf-4e73-4a7f-9c8c-a2fe37b712b5','6c82fc52-173b-4137-bb8d-9d7b130c5868','1379056d-b90f-40d1-862f-7df4cf7a62f7',NULL,NULL,NULL,'Voltage',NULL,'Volt','V',0,0,1);
INSERT INTO Variables VALUES('fb7e959b-2c29-44e0-9c9c-ce652a288f9d','9b4bafe7-22b6-4e94-88d1-709f80d0a8a6','ba471f63-63fa-487e-98f1-75a380086ab8',NULL,NULL,NULL,'Level','','Millimeter','mm',0,0,1);
INSERT INTO Variables VALUES('002eacb4-d929-11ed-b078-560003a6a899','6c923664-3f5d-464e-8254-a9639b77f7e1',NULL,'888cb371-ec2d-49a7-9bed-3b3a07abdb34',NULL,NULL,'Power Output','','Watt','W',0,0,1);
INSERT INTO Variables VALUES('00a3b4e3-b048-4e9e-84a2-cc1b18e2c4ba','6c923664-3f5d-464e-8254-a9639b77f7e1','6adc9cf6-f9b1-4340-b428-3f3e2e057a34',NULL,NULL,NULL,'Power Output',NULL,'Watt','W',0,0,1);
INSERT INTO Variables VALUES('cc6ad2e1-8d88-473e-ada5-8165a90a24ba','6c923664-3f5d-464e-8254-a9639b77f7e1','71b14517-c7f8-47d6-bbe5-a7b5346c8d0d',NULL,NULL,NULL,'Power Output',NULL,'Watt','W',0,0,1);
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
INSERT INTO Permissions VALUES('825bb963-637e-48e2-a796-090a4ab205bb','69','LID','e9e2a9d0-3c55-4d56-90af-a8a6a04501ac');
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
