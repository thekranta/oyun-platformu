-- Teacher Dashboard için gerekli tablolar
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- 1. classes tablosu
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. class_students tablosu
CREATE TABLE IF NOT EXISTS class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    child_email TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, child_email)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);

-- RLS Politikaları
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_class_students" ON class_students FOR ALL USING (true) WITH CHECK (true);
