-- GERİ ALMA: add_web_siparisleri.sql
--
-- DİKKAT: Bu tablo ödeme kayıtlarını tutar (muhasebe / iade için paymentId gerekir). Silmeden ÖNCE dışa aktarın:
--   select * from public.web_siparisleri order by olusturma_zamani;
-- Özellikle durum = 'atama_bekliyor' satırları PARASI ALINMIŞ ama paketi açılmamış siparişlerdir; elle çözülmeden silmeyin.
--
-- Önce web ödeme uç noktalarını (api/iyzico-*) kapatın; yoksa yeni sipariş yazılamaz ve 5xx döner.
-- profiles üzerinde açılmış paketlere DOKUNULMAZ (geri alma yalnız sipariş tablosunu kaldırır).

drop table if exists public.web_siparisleri;
