-- Add company_link column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS company_link TEXT;

-- Update the column comment for documentation
COMMENT ON COLUMN opportunities.company_link IS 'Link to company website or social media profile';