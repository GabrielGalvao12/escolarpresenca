-- Habilitar extensão de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remover política pública de school_location
DROP POLICY IF EXISTS "Everyone can view school location" ON public.school_location;

-- Criar políticas restritas para school_location
CREATE POLICY "Authenticated users can view school location"
  ON public.school_location
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update school location"
  ON public.school_location
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar comentários de segurança
COMMENT ON COLUMN public.profiles.face_descriptors IS 
  'Dados biométricos sensíveis - Acesso restrito por RLS apenas ao dono do perfil, admins e processos de reconhecimento facial autorizados. Considere criptografia adicional em nível de aplicação.';

COMMENT ON TABLE public.school_location IS 
  'Localização física da escola - Acesso restrito apenas a usuários autenticados para prevenir ameaças de segurança física.';