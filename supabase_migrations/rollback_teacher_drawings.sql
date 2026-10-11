-- add_teacher_drawings.sql GERİ ALMA: öğretmenler çizim göremez olur; admin okuması ve veriler etkilenmez.
DROP POLICY IF EXISTS "teacher_read_cizimler" ON storage.objects;
DROP FUNCTION IF EXISTS public.teacher_student_drawings(uuid, integer);
DROP FUNCTION IF EXISTS private.teacher_can_read_drawing(text);
DROP FUNCTION IF EXISTS private.drawing_owned_by(text, text);
DROP FUNCTION IF EXISTS private.drawing_path_of(jsonb);
NOTIFY pgrst, 'reload schema';
