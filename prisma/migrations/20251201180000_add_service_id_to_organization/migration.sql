-- Add serviceId column to Organization table
ALTER TABLE "Organization" ADD COLUMN "serviceId" TEXT;

-- Generate service IDs for existing organizations
-- Using a function to generate unique IDs
DO $$
DECLARE
  org_record RECORD;
  new_service_id TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INTEGER;
  exists_check INTEGER;
BEGIN
  FOR org_record IN SELECT id FROM "Organization" WHERE "serviceId" IS NULL LOOP
    -- Generate a unique service ID
    LOOP
      new_service_id := 'SVC-';
      FOR i IN 1..5 LOOP
        new_service_id := new_service_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
      -- Check if this service ID already exists
      SELECT COUNT(*) INTO exists_check FROM "Organization" WHERE "serviceId" = new_service_id;
      
      -- If unique, break the loop
      IF exists_check = 0 THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- Update the organization with the new service ID
    UPDATE "Organization" SET "serviceId" = new_service_id WHERE id = org_record.id;
  END LOOP;
END $$;

-- Make serviceId required and unique
ALTER TABLE "Organization" ALTER COLUMN "serviceId" SET NOT NULL;
CREATE UNIQUE INDEX "Organization_serviceId_key" ON "Organization"("serviceId");
CREATE INDEX "Organization_serviceId_idx" ON "Organization"("serviceId");

