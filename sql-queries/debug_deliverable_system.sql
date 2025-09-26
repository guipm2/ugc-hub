-- Debug script para sistema de deliverables
-- Verificar aplicações aprovadas, deliverables e inconsistências

-- 1. Verificar applications aprovadas
SELECT 
  'APPROVED_APPLICATIONS' as section,
  oa.id,
  oa.opportunity_id,
  oa.creator_id,
  oa.status,
  o.title as opportunity_title,
  o.company,
  o.content_type,
  o.created_by as analyst_id,
  p.name as creator_name
FROM opportunity_applications oa
JOIN opportunities o ON oa.opportunity_id = o.id
JOIN profiles p ON oa.creator_id = p.id
WHERE oa.status = 'approved'
ORDER BY oa.created_at DESC
LIMIT 10;

-- 2. Verificar deliverables existentes
SELECT 
  'EXISTING_DELIVERABLES' as section,
  pd.*,
  p.name as creator_name,
  o.title as opportunity_title
FROM project_deliverables pd
LEFT JOIN profiles p ON pd.creator_id = p.id
LEFT JOIN opportunities o ON pd.opportunity_id = o.id
ORDER BY pd.created_at DESC
LIMIT 10;

-- 3. Verificar se há problemas de foreign keys
SELECT 
  'FK_ISSUES' as section,
  pd.id as deliverable_id,
  pd.application_id,
  pd.opportunity_id,
  pd.creator_id,
  pd.analyst_id,
  CASE 
    WHEN oa.id IS NULL THEN 'Missing application'
    WHEN o.id IS NULL THEN 'Missing opportunity'
    WHEN cp.id IS NULL THEN 'Missing creator'
    WHEN ap.id IS NULL THEN 'Missing analyst'
    ELSE 'OK'
  END as status
FROM project_deliverables pd
LEFT JOIN opportunity_applications oa ON pd.application_id = oa.id
LEFT JOIN opportunities o ON pd.opportunity_id = o.id
LEFT JOIN profiles cp ON pd.creator_id = cp.id
LEFT JOIN profiles ap ON pd.analyst_id = ap.id
WHERE oa.id IS NULL 
   OR o.id IS NULL 
   OR cp.id IS NULL 
   OR ap.id IS NULL;

-- 4. Contar por status
SELECT 
  'STATUS_COUNTS' as section,
  status,
  COUNT(*) as count
FROM project_deliverables
GROUP BY status;

-- 5. Verificar templates mais usados
SELECT 
  'TEMPLATE_USAGE' as section,
  template_id,
  COUNT(*) as usage_count
FROM project_deliverables
WHERE template_id IS NOT NULL
GROUP BY template_id
ORDER BY usage_count DESC;