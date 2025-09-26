-- Migration: Enhanced deliverable management features
-- Date: 2025-09-26

-- Add new fields to project_deliverables table for enhanced management
ALTER TABLE project_deliverables 
ADD COLUMN IF NOT EXISTS depends_on uuid REFERENCES project_deliverables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_id text,
ADD COLUMN IF NOT EXISTS estimated_hours integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_project_deliverables_depends_on 
  ON project_deliverables(depends_on);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_template_id 
  ON project_deliverables(template_id);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_estimated_hours 
  ON project_deliverables(estimated_hours);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_tags 
  ON project_deliverables USING gin(tags);

-- Add comments for documentation
COMMENT ON COLUMN project_deliverables.depends_on IS 'Reference to another deliverable this one depends on';
COMMENT ON COLUMN project_deliverables.template_id IS 'Template name used to create this deliverable';
COMMENT ON COLUMN project_deliverables.estimated_hours IS 'Estimated hours to complete this deliverable';
COMMENT ON COLUMN project_deliverables.tags IS 'JSON array of tags for categorization';

-- Create function to prevent circular dependencies
CREATE OR REPLACE FUNCTION check_deliverable_dependency_cycle()
RETURNS TRIGGER AS $$
DECLARE
    current_id uuid;
    visited_ids uuid[];
BEGIN
    -- If depends_on is null, no need to check
    IF NEW.depends_on IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Start with the dependency we're trying to create
    current_id := NEW.depends_on;
    visited_ids := ARRAY[NEW.id];
    
    -- Follow the dependency chain
    WHILE current_id IS NOT NULL LOOP
        -- Check if we've seen this ID before (cycle detected)
        IF current_id = ANY(visited_ids) THEN
            RAISE EXCEPTION 'Circular dependency detected: deliverable % cannot depend on % (would create a cycle)', NEW.id, NEW.depends_on;
        END IF;
        
        -- Add current ID to visited list
        visited_ids := array_append(visited_ids, current_id);
        
        -- Get the next dependency in the chain
        SELECT depends_on INTO current_id 
        FROM project_deliverables 
        WHERE id = current_id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for circular dependencies
DROP TRIGGER IF EXISTS trigger_check_deliverable_dependency_cycle ON project_deliverables;
CREATE TRIGGER trigger_check_deliverable_dependency_cycle
    BEFORE INSERT OR UPDATE OF depends_on ON project_deliverables
    FOR EACH ROW
    EXECUTE FUNCTION check_deliverable_dependency_cycle();

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Analysts can manage deliverables for their opportunities" ON project_deliverables;
CREATE POLICY "Analysts can manage deliverables for their opportunities"
  ON project_deliverables
  FOR ALL
  TO authenticated
  USING (
    analyst_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = project_deliverables.opportunity_id 
      AND opportunities.created_by = auth.uid()
    )
  )
  WITH CHECK (
    analyst_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = project_deliverables.opportunity_id 
      AND opportunities.created_by = auth.uid()
    )
  );

-- Create view for deliverables with dependency information
CREATE OR REPLACE VIEW deliverables_with_dependencies AS
SELECT 
    pd.*,
    dep.title as depends_on_title,
    dep.status as depends_on_status,
    CASE 
        WHEN pd.depends_on IS NOT NULL AND dep.status != 'approved' THEN true
        ELSE false
    END as is_blocked_by_dependency
FROM project_deliverables pd
LEFT JOIN project_deliverables dep ON pd.depends_on = dep.id;

-- Grant access to the view
GRANT SELECT ON deliverables_with_dependencies TO authenticated;

-- Create function to get deliverable chain
CREATE OR REPLACE FUNCTION get_deliverable_chain(deliverable_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    status text,
    level integer
) AS $$
WITH RECURSIVE deliverable_chain AS (
    -- Base case: start with the given deliverable
    SELECT 
        pd.id,
        pd.title,
        pd.status::text,
        0 as level
    FROM project_deliverables pd
    WHERE pd.id = deliverable_id
    
    UNION ALL
    
    -- Recursive case: find dependencies
    SELECT 
        pd.id,
        pd.title,
        pd.status::text,
        dc.level + 1
    FROM project_deliverables pd
    INNER JOIN deliverable_chain dc ON pd.id = dc.id
    INNER JOIN project_deliverables pd_dep ON pd_dep.depends_on = pd.id
    WHERE dc.level < 10 -- Prevent infinite recursion
)
SELECT * FROM deliverable_chain ORDER BY level DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_deliverable_chain(uuid) TO authenticated;