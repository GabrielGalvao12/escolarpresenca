-- Atualizar política de attendances para professores verem apenas presenças de suas turmas
DROP POLICY IF EXISTS "Teachers can view all attendances" ON public.attendances;

CREATE POLICY "Teachers can view attendances of their students"
  ON public.attendances
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1
      FROM public.teacher_classes tc
      JOIN public.profiles p ON p.class_id = tc.class_id
      WHERE tc.teacher_id = auth.uid()
        AND p.id = attendances.student_id
    )
  );

-- Adicionar política para admins verem todas as attendances
CREATE POLICY "Admins can view all attendances"
  ON public.attendances
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));