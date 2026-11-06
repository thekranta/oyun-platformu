-- ============================================================================
-- ACİL GERİ ALMA: add_board_results.sql
-- ============================================================================
-- NE YAPAR: tahta kayıt fonksiyonunu (teacher_save_board_result) KALDIRIR. Öğretmenler tahtadan artık kayıt yazamaz;
-- yeni istemci "Kayıt özelliği henüz açık değil" der ve kayıt sorusunu bırakır (çökmez).
--
-- NE YAPMAZ: oyun_skorlari'ndaki kaynak / kaydeden_ogretmen sütunlarını ve şimdiye dek yazılmış tahta satırlarını
-- SİLMEZ (bunlar çocuğun verisidir). Tetikleyicideki kaynak koruması ve teacher_student_scores'taki kaynak sütunu
-- zararsızdır, olduğu gibi kalır; eski ve yeni istemci bunlarla sorunsuz çalışır.
-- ============================================================================

DROP FUNCTION IF EXISTS public.teacher_save_board_result(
  uuid, text, integer, integer, integer, integer, integer, text, integer, numeric, numeric, numeric, numeric, text
);

NOTIFY pgrst, 'reload schema';

-- Yazılmış tahta satırlarını da silmek istenirse (GERİ DÖNÜŞÜ YOK; önce `SELECT count(*) FROM public.oyun_skorlari
-- WHERE kaynak = 'tahta'` ile bakın) aşağıdaki satırın başındaki -- işaretlerini kaldırıp çalıştırın:
-- DELETE FROM public.oyun_skorlari WHERE kaynak = 'tahta';
--
-- Satırları SİLMEDEN "sınıfta" etiketini kaldırmak istenirse (SQL Editor güvenilir bağlamdır, tetikleyici izin verir):
-- UPDATE public.oyun_skorlari SET kaynak = NULL, kaydeden_ogretmen = NULL WHERE kaynak = 'tahta';
