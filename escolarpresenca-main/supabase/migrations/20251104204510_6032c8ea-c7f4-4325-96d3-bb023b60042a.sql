-- Recriar views com SECURITY INVOKER explícito (mais seguro)
DROP VIEW IF EXISTS public.profiles_safe;
DROP VIEW IF EXISTS public.attendances_safe;

-- View segura de perfis sem dados biométricos
CREATE VIEW public.profiles_safe 
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  registration_number,
  email,
  class_id,
  created_at,
  updated_at,
  NULL::text as face_photo_url,
  NULL::jsonb as face_descriptors
FROM public.profiles;

-- View segura de attendances sem coordenadas GPS
CREATE VIEW public.attendances_safe 
WITH (security_invoker = on) AS
SELECT 
  id,
  student_id,
  attendance_date,
  attendance_time,
  is_valid,
  distance_meters,
  created_at,
  NULL::double precision as latitude,
  NULL::double precision as longitude
FROM public.attendances;

-- Recriar permissões
GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.attendances_safe TO authenticated;

-- Recriar comentários
COMMENT ON VIEW public.profiles_safe IS 
  'View segura de perfis sem dados biométricos - Use para exibir dados de alunos para professores';

COMMENT ON VIEW public.attendances_safe IS 
  'View segura de presenças sem coordenadas GPS precisas - Use para listagens gerais de presença';