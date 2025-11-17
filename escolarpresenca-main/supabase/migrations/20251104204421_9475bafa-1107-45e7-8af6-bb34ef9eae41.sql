-- 1. Restringir acesso público às classes - exigir autenticação
DROP POLICY IF EXISTS "Everyone can view classes" ON public.classes;

CREATE POLICY "Authenticated users can view classes"
  ON public.classes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Criar view segura de perfis sem dados biométricos para professores
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id,
  full_name,
  registration_number,
  email,
  class_id,
  created_at,
  updated_at,
  -- face_photo_url e face_descriptors são omitidos intencionalmente
  NULL::text as face_photo_url,
  NULL::jsonb as face_descriptors
FROM public.profiles;

-- Permitir professores verem apenas a view segura
GRANT SELECT ON public.profiles_safe TO authenticated;

-- 3. Criar view segura de attendances que oculta coordenadas precisas
CREATE OR REPLACE VIEW public.attendances_safe AS
SELECT 
  id,
  student_id,
  attendance_date,
  attendance_time,
  is_valid,
  distance_meters,
  created_at,
  -- latitude e longitude são omitidos
  NULL::double precision as latitude,
  NULL::double precision as longitude
FROM public.attendances;

-- Permitir acesso à view segura
GRANT SELECT ON public.attendances_safe TO authenticated;

-- 4. Criar função para verificar se usuário pode ver dados biométricos
CREATE OR REPLACE FUNCTION public.can_view_biometric_data(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Apenas o próprio usuário ou admins podem ver dados biométricos
    auth.uid() = profile_id 
    OR public.has_role(auth.uid(), 'admin')
$$;

-- 5. Criar função para verificar se usuário pode ver coordenadas GPS
CREATE OR REPLACE FUNCTION public.can_view_location_data(attendance_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Apenas admins podem ver coordenadas precisas
    public.has_role(auth.uid(), 'admin')
$$;

-- 6. Adicionar comentários de segurança
COMMENT ON VIEW public.profiles_safe IS 
  'View segura de perfis sem dados biométricos - Use para exibir dados de alunos para professores';

COMMENT ON VIEW public.attendances_safe IS 
  'View segura de presenças sem coordenadas GPS precisas - Use para listagens gerais de presença';

COMMENT ON FUNCTION public.can_view_biometric_data IS
  'Verifica se o usuário atual tem permissão para ver dados biométricos (face_descriptors, face_photo_url)';

COMMENT ON FUNCTION public.can_view_location_data IS
  'Verifica se o usuário atual tem permissão para ver coordenadas GPS precisas';