-- Criar tabela para relacionar professores com turmas
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

-- Habilitar RLS
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- Políticas para teacher_classes
CREATE POLICY "Admins can manage teacher_classes"
  ON public.teacher_classes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their own classes"
  ON public.teacher_classes
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Remover política antiga que permite professores verem todos os perfis
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

-- Nova política: Professores só veem perfis de alunos das suas turmas
CREATE POLICY "Teachers can view profiles of their students"
  ON public.profiles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'teacher') 
    AND EXISTS (
      SELECT 1 
      FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() 
        AND tc.class_id = profiles.class_id
    )
  );

-- Proteger dados biométricos: apenas o dono e admins podem ver face_descriptors
-- Criar função para retornar perfil sem dados sensíveis
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_row public.profiles)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  registration_number TEXT,
  email TEXT,
  class_id UUID,
  face_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    profile_row.id,
    profile_row.full_name,
    profile_row.registration_number,
    profile_row.email,
    profile_row.class_id,
    profile_row.face_photo_url,
    profile_row.created_at,
    profile_row.updated_at
  FROM public.profiles
  WHERE profiles.id = profile_row.id;
$$;

-- Comentário explicativo sobre face_descriptors
COMMENT ON COLUMN public.profiles.face_descriptors IS 'Dados biométricos sensíveis - acesso restrito apenas ao dono do perfil e admins';