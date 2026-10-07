-- AlterTable
ALTER TABLE "PartyStashItem" ADD COLUMN     "retainedQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CastleUpgrade" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "legacy" BOOLEAN NOT NULL DEFAULT false,
    "personName" TEXT,
    "personDescription" TEXT,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastleUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastleDiscovery" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "identified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastleDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastleOccasion" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastleOccasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastlePurchase" (
    "id" TEXT NOT NULL,
    "occasionId" TEXT NOT NULL,
    "upgradeId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "paidCost" INTEGER NOT NULL,
    "dice" INTEGER NOT NULL,
    "rolls" JSONB NOT NULL,
    "successes" INTEGER NOT NULL,
    "overrideReason" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastlePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastleThreat" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "countdown" JSONB NOT NULL DEFAULT '[]',
    "step" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastleThreat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastleFact" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "CastleFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastleDevelopmentReview" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "mysteryId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "points" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastleDevelopmentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastleSession" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "mysteryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastleBenefitUse" (
    "id" TEXT NOT NULL,
    "upgradeId" TEXT NOT NULL,
    "mysteryId" TEXT NOT NULL,
    "characterId" TEXT,
    "sessionId" TEXT,
    "channel" TEXT NOT NULL,
    "useKey" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "effects" JSONB NOT NULL DEFAULT '{}',
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CastleBenefitUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastlePreparedItem" (
    "id" TEXT NOT NULL,
    "useId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CastlePreparedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CastleUpgrade_headquartersId_key_ordinal_key" ON "CastleUpgrade"("headquartersId", "key", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "CastleDiscovery_headquartersId_key_key" ON "CastleDiscovery"("headquartersId", "key");

-- CreateIndex
CREATE INDEX "CastleOccasion_headquartersId_closedAt_idx" ON "CastleOccasion"("headquartersId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CastlePurchase_upgradeId_key" ON "CastlePurchase"("upgradeId");

-- CreateIndex
CREATE UNIQUE INDEX "CastlePurchase_requestId_key" ON "CastlePurchase"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "CastleThreat_purchaseId_key" ON "CastleThreat"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "CastleFact_headquartersId_key_key" ON "CastleFact"("headquartersId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CastleDevelopmentReview_mysteryId_key" ON "CastleDevelopmentReview"("mysteryId");

-- CreateIndex
CREATE UNIQUE INDEX "CastleSession_headquartersId_mysteryId_name_key" ON "CastleSession"("headquartersId", "mysteryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CastleBenefitUse_requestId_key" ON "CastleBenefitUse"("requestId");

-- CreateIndex
CREATE INDEX "CastleBenefitUse_characterId_mysteryId_idx" ON "CastleBenefitUse"("characterId", "mysteryId");

-- CreateIndex
CREATE UNIQUE INDEX "CastleBenefitUse_upgradeId_mysteryId_channel_useKey_key" ON "CastleBenefitUse"("upgradeId", "mysteryId", "channel", "useKey");

-- CreateIndex
CREATE UNIQUE INDEX "CastlePreparedItem_useId_characterId_itemId_key" ON "CastlePreparedItem"("useId", "characterId", "itemId");

-- AddForeignKey
ALTER TABLE "CastleUpgrade" ADD CONSTRAINT "CastleUpgrade_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleDiscovery" ADD CONSTRAINT "CastleDiscovery_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleOccasion" ADD CONSTRAINT "CastleOccasion_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastlePurchase" ADD CONSTRAINT "CastlePurchase_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "CastleOccasion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastlePurchase" ADD CONSTRAINT "CastlePurchase_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "CastleUpgrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleThreat" ADD CONSTRAINT "CastleThreat_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleThreat" ADD CONSTRAINT "CastleThreat_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CastlePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleFact" ADD CONSTRAINT "CastleFact_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleDevelopmentReview" ADD CONSTRAINT "CastleDevelopmentReview_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleDevelopmentReview" ADD CONSTRAINT "CastleDevelopmentReview_mysteryId_fkey" FOREIGN KEY ("mysteryId") REFERENCES "Mystery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleSession" ADD CONSTRAINT "CastleSession_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleSession" ADD CONSTRAINT "CastleSession_mysteryId_fkey" FOREIGN KEY ("mysteryId") REFERENCES "Mystery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleBenefitUse" ADD CONSTRAINT "CastleBenefitUse_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "CastleUpgrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleBenefitUse" ADD CONSTRAINT "CastleBenefitUse_mysteryId_fkey" FOREIGN KEY ("mysteryId") REFERENCES "Mystery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleBenefitUse" ADD CONSTRAINT "CastleBenefitUse_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastleBenefitUse" ADD CONSTRAINT "CastleBenefitUse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CastleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastlePreparedItem" ADD CONSTRAINT "CastlePreparedItem_useId_fkey" FOREIGN KEY ("useId") REFERENCES "CastleBenefitUse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastlePreparedItem" ADD CONSTRAINT "CastlePreparedItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastlePreparedItem" ADD CONSTRAINT "CastlePreparedItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep original JSON intact for audit. Canonical entries retain ownership without repricing.
WITH catalogue(name,key,category) AS (VALUES ('Armory', 'armory', 'facilities'),
('Butterfly House', 'butterfly-house', 'facilities'),
('Carp Pond', 'carp-pond', 'facilities'),
('Infirmary', 'infirmary', 'facilities'),
('Kennel', 'kennel', 'facilities'),
('Library', 'library', 'facilities'),
('Local Tavern', 'local-tavern', 'facilities'),
('Map Room', 'map-room', 'facilities'),
('Observatory', 'observatory', 'facilities'),
('Pigeon Loft', 'pigeon-loft', 'facilities'),
('Seance Parlor', 'seance-parlor', 'facilities'),
('Shooting Range', 'shooting-range', 'facilities'),
('Stable', 'stable', 'facilities'),
('The Annals of the Society', 'annals', 'facilities'),
('Weapons Corridor', 'weapons-corridor', 'facilities'),
('Workshop', 'workshop', 'facilities'),
('Botanical Garden', 'botanical-garden', 'discovered'),
('Cellar Vault', 'cellar-vault', 'discovered'),
('Chapel', 'chapel', 'discovered'),
('Difference Engine', 'difference-engine', 'discovered'),
('Dungeon', 'dungeon', 'discovered'),
('Forgotten Gallery', 'forgotten-gallery', 'discovered'),
('Gymnasium', 'gymnasium', 'discovered'),
('Occult Archive', 'occult-archive', 'discovered'),
('Occult Library', 'occult-library', 'discovered'),
('Occult Temple', 'occult-temple', 'discovered'),
('Occult Workshop', 'occult-workshop', 'discovered'),
('Self-Flagellation Tools', 'self-flagellation-tools', 'discovered'),
('Treasure Chamber', 'treasure-chamber', 'discovered'),
('Banker', 'banker', 'contacts'),
('Fixer', 'fixer', 'contacts'),
('Journalist', 'journalist', 'contacts'),
('Patron', 'patron', 'contacts'),
('Police Constable', 'police-constable', 'contacts'),
('Professor', 'professor', 'contacts'),
('Psychiatrist', 'psychiatrist', 'contacts'),
('Butler Algot Frisk', 'algot-frisk', 'personnel'),
('Caretaker', 'caretaker', 'personnel'),
('Chef', 'chef', 'personnel'),
('Coachman', 'coachman', 'personnel'),
('Gamekeeper', 'gamekeeper', 'personnel'),
('Gardener', 'gardener', 'personnel'),
('Guard', 'guard', 'personnel'),
('House Physician', 'house-physician', 'personnel'),
('Inventor', 'inventor', 'personnel'),
('Mystic', 'mystic', 'personnel'),
('Quartermaster', 'quartermaster', 'personnel'),
('Recruit', 'recruit', 'personnel'),
('Stable Boy', 'stable-boy', 'personnel')),
legacy AS (
 SELECT h.id AS hq, x.entry, x.category, x.position
 FROM "Headquarters" h CROSS JOIN LATERAL (VALUES ('facilities',h.facilities),('contacts',h.contacts),('personnel',h.personnel)) AS bucket(category,data)
 CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(bucket.data)='array' THEN bucket.data ELSE '[]'::jsonb END) WITH ORDINALITY AS xentry(entry,position)
 CROSS JOIN LATERAL (SELECT xentry.entry,xentry.position,bucket.category) x
 WHERE jsonb_typeof(x.entry)='object' AND x.entry->>'name' IS NOT NULL
), mapped AS (
 SELECT l.*,c.key AS canonical,COALESCE(c.key,'legacy-'||md5(l.category||':'||(l.entry->>'name'))) AS key,COALESCE(c.category,l.category) AS finalcategory
 FROM legacy l LEFT JOIN catalogue c ON c.name=l.entry->>'name'
), ranked AS (SELECT *,row_number() OVER (PARTITION BY hq,key ORDER BY position) AS ordinal FROM mapped)
INSERT INTO "CastleUpgrade" (id,"headquartersId",key,ordinal,name,category,description,status,legacy,"acquiredAt",stats)
SELECT md5(hq||':'||key||':'||ordinal)::uuid::text,hq,key,ordinal,"entry"->>'name',finalcategory,COALESCE(entry->>'description',''),CASE WHEN canonical IS NULL THEN 'REVIEW' ELSE 'ACTIVE' END,true,now(),'{}'::jsonb FROM ranked;
INSERT INTO "CastleUpgrade" (id,"headquartersId",key,ordinal,name,category,description,status,legacy,"acquiredAt",stats,"personName","personDescription")
SELECT md5(h.id||':'||v.key)::uuid::text,h.id,v.key,1,v.name,v.category,'Starting asset','ACTIVE',false,now(),'{}'::jsonb,v.person,v.description
FROM "Headquarters" h CROSS JOIN (VALUES ('library','Library','facilities',NULL::text,NULL::text),('algot-frisk','Butler Algot Frisk','personnel','Algot Frisk','The Society castle steward')) v(key,name,category,person,description)
ON CONFLICT ("headquartersId",key,ordinal) DO NOTHING;
INSERT INTO "CastleThreat" (id,"headquartersId",title,description,status,countdown,step,"createdAt")
SELECT md5(h.id||':threat:'||t.pos)::uuid::text,h.id,COALESCE(t.entry->>'title','Legacy threat'),COALESCE(t.entry->>'description',''),CASE WHEN t.entry->>'status'='RESOLVED' THEN 'RESOLVED' ELSE 'ACTIVE' END,'[]'::jsonb,0,now()
FROM "Headquarters" h CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(h.threats)='array' THEN h.threats ELSE '[]'::jsonb END) WITH ORDINALITY t(entry,pos);
CREATE UNIQUE INDEX "CastleOccasion_one_open_per_headquarters" ON "CastleOccasion"("headquartersId") WHERE "closedAt" IS NULL;
ALTER TABLE "CastleUpgrade" ADD CONSTRAINT "CastleUpgrade_status_check" CHECK (status IN ('ACTIVE','DAMAGED','REVIEW'));
ALTER TABLE "CastleThreat" ADD CONSTRAINT "CastleThreat_status_check" CHECK (status IN ('PENDING','ACTIVE','RESOLVED'));
ALTER TABLE "CastleBenefitUse" ADD CONSTRAINT "CastleBenefitUse_channel_check" CHECK (channel IN ('function','asset'));

ALTER TABLE "PartyStashItem" ADD CONSTRAINT "PartyStashItem_retention_check" CHECK ("retainedQuantity" >= 0 AND "retainedQuantity" <= quantity);
ALTER TABLE "CastleUpgrade" ADD COLUMN "motivation" TEXT, ADD COLUMN "darkSecret" TEXT, ADD COLUMN "relationships" TEXT;
