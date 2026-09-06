import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import DynamicBackground from '../components/DynamicBackground';
import { asset } from '../lib/assetMap';
import StudentStatsModal from '../components/StudentStatsModal';
import BucketTabs from '../components/admin/BucketTabs';
import ClaimColumn from '../components/admin/ClaimColumn';
import DecisionBar from '../components/admin/DecisionBar';
import EvidenceColumn from '../components/admin/EvidenceColumn';
import FlagStrip from '../components/admin/FlagStrip';
import JunkBanner from '../components/admin/JunkBanner';
import QueueRow from '../components/admin/QueueRow';
import ReviewHeader from '../components/admin/ReviewHeader';
import { C, F, S } from '../components/admin/theme';
import UndoStrip from '../components/admin/UndoStrip';
import { getMaarif } from '../constants/maarifMap';
import { getGameDisplay, normalizeOyunTuru } from '../lib/gameDisplay';
import { supabase } from '../lib/supabase';
import { requestGeminiAnalysis } from '../services/geminiClient';
import { ayristirAnaliz } from '../lib/admin/parseAnalysis';
import { hesaplaBayraklar, normalizeVotes, OySonucu } from '../lib/admin/flags';
import {
  altKovalaraAyir, BucketKey, fetchAgirAlanlar, fetchAllForStudent, fetchAyniHesap, fetchBucket,
  fetchSonUcKiyas, hideAccount, KuyrukKaydi, setGizli,
} from '../lib/admin/queueQuery';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || SUPABASE_KEY || '';
};

const PAGE_SIZE = 25;

export default function AdminPanel() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const dar = width < 1024;

  // ---- Giriş ----
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (email.trim() === '' || password.trim() === '') {
      alert('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        const m = error?.message || '';
        if (m.includes('Email not confirmed')) alert('E-posta adresin henüz doğrulanmamış. Gelen kutundaki doğrulama bağlantısına tıkla.');
        else if (m.includes('Invalid login credentials')) alert('Hatalı e-posta veya şifre.');
        else alert(`Giriş yapılamadı: ${m || 'bilinmeyen hata'}`);
        return;
      }
      const { data: adminRow, error: adminError } = await supabase.from('admins').select('display_name').eq('user_id', data.user.id).maybeSingle();
      if (adminError) {
        alert(
          'Uzman yetkisi kontrol edilemedi (kurulum eksik olabilir).\n\n' +
          `Teknik detay: ${adminError.message}\n\n` +
          'Çözüm: supabase_migrations/admin_teshis.sql dosyasını Supabase SQL Editor\'da çalıştır.'
        );
        await supabase.auth.signOut();
        return;
      }
      if (!adminRow) {
        alert(
          'Bu hesap geçerli ama uzman yetkisi yok.\n\n' +
          `Hesap: ${data.user.email}\n\n` +
          'Çözüm: supabase_migrations/admin_teshis.sql dosyasını aç, en üstteki TEK ' +
          'e-posta satırını yukarıdaki hesapla değiştir, Supabase SQL Editor\'da çalıştır.'
        );
        await supabase.auth.signOut();
        return;
      }
      setLoggedInUser(adminRow.display_name);
      setIsAuthenticated(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ---- Kuyruk ----
  const [bucket, setBucket] = useState<BucketKey>('beklemede');
  const [kayitlar, setKayitlar] = useState<KuyrukKaydi[]>([]);
  const [toplam, setToplam] = useState(0);
  const [denemeToplam, setDenemeToplam] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'eski' | 'yeni'>('eski');
  const [loading, setLoading] = useState(true);
  const [oturumOnaySayaci, setOturumOnaySayaci] = useState(0);
  const [junkBannerKapatildi, setJunkBannerKapatildi] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const yukleKuyruk = useCallback(async (b: BucketKey, off: number, s: string, srt: 'eski' | 'yeni') => {
    setLoading(true);
    try {
      const r = await fetchBucket({ bucket: b, benimAdim: loggedInUser, limit: PAGE_SIZE, offset: off, search: s, sort: srt });
      setKayitlar(r.kayitlar);
      setToplam(r.toplam);
      setSelectedIdx(0);
    } catch (e) {
      console.error('Kuyruk yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }, [loggedInUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const t = setTimeout(() => yukleKuyruk(bucket, offset, search, sort), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [isAuthenticated, bucket, offset, sort, search, yukleKuyruk]);

  // Çöp-kayıt önerisi sayacı — bir kez, arka planda (D3: yalnız SAYIYI gösterir, hiçbir şeyi otomatik gizlemez).
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBucket({ bucket: 'deneme', benimAdim: loggedInUser, limit: 1 }).then((r) => setDenemeToplam(r.toplam)).catch(() => { });
  }, [isAuthenticated, loggedInUser]);

  const secili = kayitlar[selectedIdx] || null;

  // ---- Seçili kayda bağlı veriler ----
  const [sonUcKiyas, setSonUcKiyas] = useState<{ created_at: string; sure?: number; hata_sayisi?: number }[]>([]);
  const [ayniHesap, setAyniHesap] = useState<{ id: number; oyun_turu: string; created_at: string }[]>([]);
  const [agirAlanlar, setAgirAlanlar] = useState<{ cizim_verisi?: string; algilanan_kelime?: string } | null>(null);
  const [isleniyor, setIsleniyor] = useState(false);
  const [undoMesaj, setUndoMesaj] = useState<string | null>(null);
  const undoActionRef = useRef<(() => void) | null>(null);
  const [statsFor, setStatsFor] = useState<{ name: string; age: number; scores: any[] } | null>(null);
  const [vurgulananBolum, setVurgulananBolum] = useState<string | null>(null);
  const claimScrollRef = useRef<any>(null);
  const bolumYRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!secili) { setSonUcKiyas([]); setAyniHesap([]); setAgirAlanlar(null); return; }
    let cancelled = false;
    fetchSonUcKiyas(secili.email, secili.oyun_turu, secili.id).then((r) => { if (!cancelled) setSonUcKiyas(r); });
    fetchAyniHesap(secili.email, secili.id).then((r) => { if (!cancelled) setAyniHesap(r); });
    if (secili.oyun_turu === 'yaratici-cizim' || secili.oyun_turu === 'bunu-soyle') {
      fetchAgirAlanlar(secili.id).then((r) => { if (!cancelled) setAgirAlanlar(r); });
    } else {
      setAgirAlanlar(null);
    }
    return () => { cancelled = true; };
  }, [secili?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const maarif = secili ? getMaarif(normalizeOyunTuru(secili.oyun_turu)) : null;
  const analiz = useMemo(() => ayristirAnaliz(secili?.yapay_zeka_yorumu), [secili?.yapay_zeka_yorumu]);
  const bayraklar = useMemo(() => {
    if (!maarif) return [];
    return hesaplaBayraklar({ analiz, beklenenKod: maarif.cikti, gelisimGecmisiVarMi: sonUcKiyas.length > 0, gercekSure: secili?.sure });
  }, [analiz, maarif, sonUcKiyas.length, secili?.sure]);

  // ---- Seçili kaydı yerel state'te güncelle (yeniden çekmeden) ----
  const guncelleYerel = (id: number, patch: Partial<KuyrukKaydi>) => {
    setKayitlar((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  };

  const siradakineGec = () => {
    if (selectedIdx < kayitlar.length - 1) setSelectedIdx((i) => i + 1);
  };

  // ---- Oylama ----
  const onOy = async (oy: OySonucu, gerekce?: string) => {
    if (!secili) return;
    setIsleniyor(true);
    try {
      const mevcut = normalizeVotes(secili.uzman_oylamalari);
      const yeniOylar = { ...mevcut, [loggedInUser]: { oy, gerekce, tarih: new Date().toISOString() } };
      const onaySayisi = Object.values(yeniOylar).filter((v) => v.oy === 'onay').length;
      const reddetSayisi = Object.values(yeniOylar).filter((v) => v.oy === 'reddet').length;
      const revizeVar = Object.values(yeniOylar).some((v) => v.oy === 'revize');
      let yeniDurum: 'beklemede' | 'onaylandi' | 'reddedildi' = 'beklemede';
      if (!revizeVar && Object.keys(yeniOylar).length >= 3) {
        yeniDurum = onaySayisi > reddetSayisi ? 'onaylandi' : 'reddedildi';
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${secili.id}`, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ uzman_oylamalari: yeniOylar, onay_durumu: yeniDurum, uzman_onayi: yeniDurum === 'onaylandi' }),
      });
      if (!res.ok) { setUndoMesaj('❌ Oy kaydedilemedi, tekrar dene'); return; }

      guncelleYerel(secili.id, { uzman_oylamalari: yeniOylar, onay_durumu: yeniDurum });

      if (yeniDurum === 'onaylandi') {
        setOturumOnaySayaci((n) => n + 1);
        setUndoMesaj(`✅ Onaylandı: ${secili.ogrenci_adi} — ${getGameDisplay(secili.oyun_turu).name}`);
        undoActionRef.current = () => geriAlOnay(secili.id, mevcut);
      } else if (yeniDurum === 'reddedildi') {
        setUndoMesaj('🔁 Reddedildi — AI yeniden analiz edilecek');
        undoActionRef.current = null;
        yenidenAnalizeSokKuyrukta({ ...secili, algilanan_kelime: agirAlanlar?.algilanan_kelime });
      } else if (revizeVar) {
        setUndoMesaj(`✎ Revize kaydedildi — kayıt kilitlendi`);
        undoActionRef.current = null;
      } else {
        setOturumOnaySayaci((n) => n + 1);
        setUndoMesaj(`${oy === 'onay' ? '✅' : '✕'} Oyun kaydedildi (${Object.keys(yeniOylar).length}/3)`);
        undoActionRef.current = null;
      }
      siradakineGec();
    } finally {
      setIsleniyor(false);
    }
  };

  const geriAlOnay = async (id: number, oncekiOylar: ReturnType<typeof normalizeVotes>) => {
    await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ uzman_oylamalari: oncekiOylar, onay_durumu: 'beklemede', uzman_onayi: false }),
    });
    guncelleYerel(id, { uzman_oylamalari: oncekiOylar as any, onay_durumu: 'beklemede' });
    setUndoMesaj(null);
  };

  // ---- İtiraz Et / Kilidi Aç (D2) — teyit adımı DecisionBar içinde tutulur ----
  const onItirazEt = async () => {
    if (!secili) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${secili.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ uzman_oylamalari: {}, onay_durumu: 'beklemede', uzman_onayi: false }),
    });
    if (res.ok) {
      setUndoMesaj('🔓 Kilit açıldı — rapor veliden kaldırıldı, yeniden oylanacak');
      undoActionRef.current = null;
      yukleKuyruk(bucket, offset, search, sort);
    }
  };

  // ---- Deneme kaydı gizle/geri al ----
  const onGizle = async () => {
    if (!secili) return;
    const id = secili.id;
    const r = await setGizli(id, true);
    if (!r.ok) { alert(r.hata); return; }
    setKayitlar((prev) => prev.filter((k) => k.id !== id));
    setUndoMesaj('🗑 Deneme kaydına taşındı');
    undoActionRef.current = async () => { await setGizli(id, false); yukleKuyruk(bucket, offset, search, sort); };
  };
  const onHesabiGizle = async () => {
    if (!secili?.email) return;
    const r = await hideAccount(secili.email);
    if (!r.ok) { alert(r.hata); return; }
    setUndoMesaj(`🗑 ${secili.email} hesabının tüm kayıtları gizlendi`);
    undoActionRef.current = null;
    yukleKuyruk(bucket, offset, search, sort);
  };

  // ---- İstatistikler ----
  const onIstatistik = async () => {
    if (!secili) return;
    const scores = secili.email ? await fetchAllForStudent(secili.email) : [secili];
    setStatsFor({ name: secili.ogrenci_adi, age: secili.ogrenci_yasi, scores });
  };

  // ---- Bayrak tıklama → İDDİA sütununda ilgili bölüme kaydır ----
  const onBayrakPress = (hedefBolum?: string) => {
    if (!hedefBolum) return;
    setVurgulananBolum(hedefBolum);
    const y = bolumYRef.current[hedefBolum];
    if (y != null && claimScrollRef.current?.scrollTo) claimScrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setTimeout(() => setVurgulananBolum(null), 1400);
  };

  // ============================================================
  // AI ANALİZİ — analyzeGame ve alt mantığı olduğu gibi korunur
  // (dört farklı prompt dalı iyi ayarlanmış; yalnız gelişim-geçmişi
  // sorgusu ogrenci_adi yerine email'e düzeltildi — doğrulanmış hata).
  // ============================================================
  const [analizIsleniyor, setAnalizIsleniyor] = useState(false);
  const analyzeGame = async (score: KuyrukKaydi & { algilanan_kelime?: string }) => {
    if (score.oyun_turu === 'yaratici-cizim') { alert('Yaratıcı çizim için yapay zeka yorumu oluşturulmaz.'); return; }
    setAnalizIsleniyor(true);
    try {
      const oyunBilgisi = getMaarif(normalizeOyunTuru(score.oyun_turu));
      const oyunAdiTR = oyunBilgisi.displayName || score.oyun_turu;
      const yasAy = score.ogrenci_yasi;
      let gelisimselDonem = '';
      if (yasAy < 36) gelisimselDonem = 'Erken Çocukluk (24-36 ay)';
      else if (yasAy < 48) gelisimselDonem = 'Okul Öncesi Erken Dönem (36-48 ay)';
      else if (yasAy < 60) gelisimselDonem = 'Okul Öncesi Geç Dönem (48-60 ay)';
      else gelisimselDonem = 'Okula Hazırlık Dönemi (60+ ay)';

      let performansEgilimi = '';
      const sure = score.sure || 0;
      const hata = score.hata_sayisi || 0;
      if (hata <= 2 && sure > 60) performansEgilimi = 'Titiz ve Kontrollü';
      else if (hata > 3 && sure < 30) performansEgilimi = 'Hızlı Karar Veren (Dürtüsel eğilim)';
      else if (hata <= 2 && sure <= 60) performansEgilimi = 'Dengeli ve Başarılı';
      else performansEgilimi = 'Gelişim Sürecinde';

      let gelisimGecmisi = '';
      try {
        const oncekiSkorlar = score.email ? await fetchSonUcKiyas(score.email, score.oyun_turu, score.id) : [];
        if (oncekiSkorlar && oncekiSkorlar.length > 0) {
          gelisimGecmisi = oncekiSkorlar.map((s: { created_at: string; sure?: number; hata_sayisi?: number }) => {
            const gun = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
            return `- ${gun} gün önce: ${s.sure || '?'} sn, ${s.hata_sayisi || 0} hata`;
          }).join('\n');
        }
      } catch (e) { console.log('Gelişim geçmişi alınamadı:', e); }

      const zorluk = score.zorluk_seviyesi || 1;
      let scaffoldingNotu = '';
      if (zorluk >= 4) {
        scaffoldingNotu = `
## İSKELE KURMA (SCAFFOLDING) ANALİZİ:
- Zorluk Seviyesi: ${zorluk}/5 (Yüksek)
- Maarif Modeli "Bireysel Farklılıklara Uygunluk" ilkesine göre değerlendir.
- Eğer zorlanma belirtisi varsa, veliye şu önerileri sun:
  * Materyalin somutlaştırılarak sunulması (fiziksel objeler kullanma)
  * Basitleştirilmiş iskele kurma (adım adım yönlendirme)
  * Görsel destekleyiciler ekleme`;
      }

      let teknikHataNotu = '';
      if (score.oyun_turu === 'bunu-soyle') {
        const algilananKelime = score.algilanan_kelime || '';
        if (!algilananKelime || algilananKelime.trim() === '' || algilananKelime === 'hata') {
          teknikHataNotu = `
## TEKNİK LİMİTASYON NOTU:
- Algılanan Kelime: Boş veya hatalı
- ÖNEMLİ: Bu durumu çocuğun başarısızlığı olarak DEĞERLENDİRME!
- "Dijital ses işleme sınırlılığı" olarak kabul et.
- Analizi çocuğun "Deneme yapma isteği" ve "Özgüven" eğilimine yönlendir.
- Veliye: "Çocuğunuz cesurca denedi, teknolojik sınırlılıklar bazen ses algılamayı zorlaştırabilir" mesajı ver.`;
        }
      }

      const toplamTur = score.toplam_tur_sayisi || 0;
      const mevcutTur = score.mevcut_tur || 0;
      let turAnaliziNotu = '';
      if (toplamTur > 0 && mevcutTur > 0) {
        if (mevcutTur <= 2) {
          turAnaliziNotu = `
## TUR ANALİZİ:
- Mevcut Tur: ${mevcutTur}/${toplamTur} (Erken Tur - Temel Beceri Değerlendirmesi)
- Bu turlardaki performans çocuğun "Temel Beceri" düzeyini gösterir.
- Hata ve süre verilerini başlangıç referansı olarak kullan.`;
        } else if (mevcutTur >= toplamTur - 1) {
          turAnaliziNotu = `
## TUR ANALİZİ:
- Mevcut Tur: ${mevcutTur}/${toplamTur} (Son Turlar - Bilişsel Yük Değerlendirmesi)
- Son turlardaki performans "Bilişsel Yük Yönetimi" ve "Dikkat Sürdürülebilirliği" göstergesidir.
- Eğer bu turlarda hata artışı veya süre uzaması varsa:
  * "Yorulma" belirtisi olarak değerlendir
  * "Karmaşık görevlerde iskele kurma (scaffolding) ihtiyacı" olarak tanımla
  * Veliye: "Oyun süresi arttıkça kısa molalar verilebilir" önerisinde bulun`;
        } else {
          turAnaliziNotu = `
## TUR ANALİZİ:
- Mevcut Tur: ${mevcutTur}/${toplamTur} (Orta Turlar)
- Performans artışı "Öğrenme eğrisi" göstergesidir.
- Performans düşüşü varsa "Dikkat dağılması" olarak değerlendir.`;
        }
      }

      let prompt = '';
      const gelisimBolumu = gelisimGecmisi ? `
## GELİŞİM GEÇMİŞİ (Son Oyunlar):
${gelisimGecmisi}
- Bugün: ${sure} sn, ${hata} hata

Gemini olarak bu verileri kıyasla ve "Gelişim Seyri" analizi yap.
` : '';

      const GECERLI_KODLAR = `
## KRİTİK - GEÇERLİ MAARİF KODLARI (SADECE BUNLARI KULLAN):
FAB (Fen), MAB (Matematik), HSAB (Hareket/Sağlık), SAB (Sosyal),
TADB (Dinleme/İzleme), TAKB (Konuşma), TAEOB (Erken Okuryazarlık), TAOB (Okuma),
MDB/MSB/MÇB/MHB/MYB (Müzik), SNAB (Sanat)
⚠️ BU KODLAR DIŞINDA KOD KULLANMA! SDB veya başka kod UYDURMA!`;

      if (oyunBilgisi.isValueStory) {
        // NOT (bilinen, şemasız-faz dokunmuyor): değer-hikayesi oyunları seçilen yolu
        // GEÇİCİ olarak yapay_zeka_yorumu'na yazıyor; bu analiz o alanın üzerine yazar.
        // Kalıcı çözüm (ayrı secilen_yol kolonu) A3 şema turunda yapılacak.
        const secilenYol = score.yapay_zeka_yorumu || 'Bilinmiyor';
        prompt = `
Sen, Türkiye Yüzyılı Maarif Modeli'ne hakim bir Okul Öncesi Eğitim Danışmanısın.

## VERİLER:
- Öğrenci: ${score.ogrenci_adi} (${yasAy} Ay - ${gelisimselDonem})
- Oyun: ${oyunAdiTR}
- Seçilen Yol: ${secilenYol}
- Süre: ${sure} saniye
${gelisimBolumu}
## MAARİF MODELİ REFERANSI:
- Alan: ${oyunBilgisi.alan} | Süreç: ${oyunBilgisi.surec}
- Öğrenme Çıktısı: ${oyunBilgisi.cikti} - ${oyunBilgisi.ciktiAciklama}
- Değer: ${oyunBilgisi.deger || 'Belirtilmemiş'}
${GECERLI_KODLAR}

## ÇIKTI KURALLARI:
1. ASLA giriş cümlesi kullanma (ör: "Harika bir senaryo", "İşte rapor").
2. Doğrudan rapor içeriğiyle başla.
3. Aşağıdaki formatı BİREBİR uygula:

---

**MAARİF MODELİ PEDAGOJİK ANALİZ**

**Öğrenme Çıktısı:** ${oyunBilgisi.cikti} - ${oyunBilgisi.ciktiAciklama}

**Süreç Analizi:** [Çocuğun "${oyunBilgisi.surec}" sürecindeki performansını veriyle açıkla]

**Gelişimsel Değerlendirme:** [${gelisimselDonem} bağlamında Erdem-Değer-Eylem ilişkisini yorumla]
${gelisimGecmisi ? '\n**Gelişim Seyri:** [Önceki oyunlarla karşılaştır, ilerleme veya gerileme analizi yap]' : ''}

---

**VELİ BİLGİLENDİRME NOTU**

Değerli Velimiz,

[${score.ogrenci_adi}'nin oyundaki seçimlerini samimi ama profesyonel bir dille açıkla.]

**Evde İskele Kurma Önerileri:**
- Hikaye okuma sırasında "Sen olsaydın ne yapardın?" soruları
- Günlük durumlarla değer bağlantısı kurma
- Rol yapma oyunlarıyla empati geliştirme

Saygılarımızla,
ChildhoodTech Ekibi
        `;
      } else if (score.oyun_turu === 'sihirli-tuval') {
        prompt = `
Sen, Türkiye Yüzyılı Maarif Modeli'ne hakim bir Okul Öncesi Eğitim Danışmanısın.
Bu oyun bir "Görsel Dikkat ve Sembolik Eşleme" görevidir, sadece boyama değil!

## VERİLER:
- Öğrenci: ${score.ogrenci_adi} (${yasAy} Ay - ${gelisimselDonem})
- Oyun: Sihirli Tuval: Sayılarla Boyama
- Süre: ${sure} sn | Hamle: ${score.hamle_sayisi} | Hata: ${hata}
- Performans Eğilimi: ${performansEgilimi}
${gelisimBolumu}
## MAARİF MODELİ REFERANSI (raw_curriculum.txt'ye göre):
- Alan: Matematik | Süreç: Matematiksel Temsil
- Öğrenme Çıktısı: MAB.9 - Farklı matematiksel temsillerden yararlanabilme (Çeşitli semboller arasından belirtilen matematiksel temsilleri gösterir)
${GECERLI_KODLAR}

## ANALİZ KRİTERLERİ (ÖNEMLİ):
1. **Görsel Tarama Hızı:** Çocuğun alttaki rakamı seçtikten sonra tuval üzerindeki doğru rakamı bulma süresini "Görsel Tarama Hızı" olarak yorumla.
2. **Hata Analizi (KRİTİK):** Eğer yanlış bir rakama dokunmuşsa bunu ASLA "sayı bilmeme" olarak DEĞERLENDİRME!
   - Bunun yerine "Görsel Ayırt Etme Karışıklığı" (benzer şekiller) veya
   - "Dürtüsellik" (hızlıca dokunma isteği) olarak analiz et.
3. **Beceri Odağı:** Bu oyun sayı sayma değil, "sembol-mekan eşlemesi" becerisi geliştirir.

---

**MAARİF MODELİ PEDAGOJİK ANALİZ**

**Akademik Karşılık:** MAB.9 - Matematiksel Temsil
**Beceri Karşılığı:** Görsel Odaklanma ve Sembol Eşleştirme

**Görsel Tarama Analizi:** [Çocuğun görsel tarama yoluyla sembol-temsil ilişkisi kurma becerisini değerlendir]

**Performans Değerlendirmesi:** [${hata} hata için "Görsel Ayırt Etme" veya "Dürtüsellik" bağlamında analiz yap. ASLA "sayı bilmiyor" deme!]

**Gelişimsel Değerlendirme:** [${gelisimselDonem} bağlamında görsel-motor koordinasyon becerilerini değerlendir]
${gelisimGecmisi ? '\n**Gelişim Seyri:** [Önceki oyunlarla karşılaştır]' : ''}

---

**VELİ BİLGİLENDİRME NOTU**

Değerli Velimiz,

[${score.ogrenci_adi}'nin görsel tarama ve sembol eşleme becerisini samimi bir dille açıkla.]

**Evde İskele Kurma Önerileri:**
- Dergilerden sayı bulma ve boyama oyunları
- Renk-sayı eşleme kartlarıyla pratik
- "Bu sayıyı evde kaç yerde görüyorsun?" oyunu

Saygılarımızla,
ChildhoodTech Ekibi
        `;
      } else if (score.oyun_turu === 'uzay-bloklari') {
        prompt = `
Sen, Türkiye Yüzyılı Maarif Modeli'ne hakim bir Okul Öncesi Eğitim Danışmanısın.

## VERİLER:
- Öğrenci: ${score.ogrenci_adi} (${yasAy} Ay - ${gelisimselDonem})
- Oyun: Uzay Blokları: Yıldız Mimarı
- Süre: ${sure} sn | Hamle: ${score.hamle_sayisi} | Hata: ${hata}
- Performans Eğilimi: ${performansEgilimi}
${gelisimBolumu}
## MAARİF MODELİ REFERANSI (raw_curriculum.txt'ye göre):
- Alan: Matematik | Süreç: Matematiksel Muhakeme
- Öğrenme Çıktısı: MAB.2 - Bir bütünü oluşturan parçaları gösterir, parçalar arasındaki ilişki/ilişkisizlik durumlarını açıklar
${GECERLI_KODLAR}

## ANALİZ KRİTERLERİ (ÖNEMLİ):
1. **Parça-Bütün İlişkisi:** Çocuğun blok parçalarını bütün içinde doğru pozisyona yerleştirme becerisini değerlendir.
2. **Problem Çözme:** Hatadan sonra strateji değiştirip değiştirmediğini değerlendir.
3. **Uzamsal Farkındalık:** Karmaşık şekilleri boşluğa sığdırma ve döndürme becerisini yorumla.

---

**MAARİF MODELİ PEDAGOJİK ANALİZ**

**Akademik Karşılık:** MAB.2 - Matematiksel Muhakeme (Parça-Bütün İlişkisi)
**Beceri Karşılığı:** Parçaları gösterme ve ilişkileri açıklama

**Parça-Bütün Analizi:** [Çocuğun blokları yerleştirme süresi (${sure} sn) ve hata sayısı (${hata}) üzerinden parça-bütün ilişkisi kurma becerisini değerlendir]

**Problem Çözme Stratejisi:** [Hata yaptıktan sonraki düzeltme hızı ve yaklaşımını analiz et]

**Gelişimsel Değerlendirme:** [${gelisimselDonem} bağlamında parça-bütün ilişkisi kurma becerisini değerlendir]
${gelisimGecmisi ? '\n**Gelişim Seyri:** [Önceki oyunlarla karşılaştır]' : ''}

---

**VELİ BİLGİLENDİRME NOTU**

Değerli Velimiz,

[${score.ogrenci_adi}'nin parça-bütün ilişkisi kurma ve uzamsal düşünme becerisini samimi bir dille açıkla.]

**Evde İskele Kurma Önerileri:**
- Lego veya blok oyunlarıyla şekil oluşturma
- Basit yapbozu birlikte tamamlama
- "Bu kutu bu boşluğa sığar mı?" tahmin oyunları

Saygılarımızla,
ChildhoodTech Ekibi
        `;
      } else {
        prompt = `
Sen, Türkiye Yüzyılı Maarif Modeli'ne hakim bir Okul Öncesi Eğitim Danışmanısın.

## VERİLER:
- Öğrenci: ${score.ogrenci_adi} (${yasAy} Ay - ${gelisimselDonem})
- Oyun: ${oyunAdiTR} | Zorluk: ${zorluk}
- Süre: ${sure} sn | Hamle: ${score.hamle_sayisi} | Hata: ${hata}
- Performans Eğilimi: ${performansEgilimi}
${toplamTur > 0 ? `- Tur Bilgisi: ${mevcutTur}/${toplamTur}` : ''}
${gelisimBolumu}${scaffoldingNotu}${teknikHataNotu}${turAnaliziNotu}
## MAARİF MODELİ REFERANSI:
- Alan: ${oyunBilgisi.alan} | Süreç: ${oyunBilgisi.surec}
- Öğrenme Çıktısı: ${oyunBilgisi.cikti} - ${oyunBilgisi.ciktiAciklama}
${GECERLI_KODLAR}

## DEĞERLENDİRME KURALLARI:
- Sayı oyunları 1-5 aralığındadır (MAB.1 Sayı Duyusu).
- ${yasAy < 48 ? '36-48 ay: somut işlemler gelişim aşamasında, hatalar doğaldır.' : '48-60 ay: soyut düşünme becerileri gelişmektedir.'}

## ÇIKTI KURALLARI:
1. ASLA giriş cümlesi kullanma (ör: "Harika", "İşte rapor").
2. Doğrudan rapor içeriğiyle başla.
3. Aşağıdaki formatı BİREBİR uygula:

---

**MAARİF MODELİ PEDAGOJİK ANALİZ**

**Öğrenme Çıktısı:** ${oyunBilgisi.cikti} - ${oyunBilgisi.ciktiAciklama}

**Süreç Analizi:** [Çocuğun "${oyunBilgisi.surec}" sürecindeki performansını ${score.hamle_sayisi} hamle ve ${hata} hata verisiyle açıkla]

**Gelişimsel Değerlendirme:** [${gelisimselDonem} ve performans eğilimi (${performansEgilimi}) bağlamında değerlendir]
${gelisimGecmisi ? '\n**Gelişim Seyri:** [Önceki oyunlarla karşılaştır, yüzdelik ilerleme/gerileme analizi yap]' : ''}
${zorluk >= 4 ? '\n**İskele Kurma Önerisi:** [Yüksek zorluk için somutlaştırma ve scaffolding önerileri]' : ''}

---

**VELİ BİLGİLENDİRME NOTU**

Değerli Velimiz,

[${score.ogrenci_adi}'nin performansını samimi ama profesyonel bir dille açıkla.]

**Evde İskele Kurma Önerileri:**
- Oyundaki beceriyi destekleyen günlük aktiviteler öner
- Somut materyallerle pratik yapma fırsatları
- Teşvik edici ve eğlenceli yaklaşımlar

Saygılarımızla,
ChildhoodTech Ekibi
        `;
      }

      let aiComment: string;
      try {
        aiComment = await requestGeminiAnalysis(prompt);
      } catch (e: any) {
        alert(`API Hatası: ${e.message}`);
        return;
      }

      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${score.id}`, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ yapay_zeka_yorumu: aiComment }),
      });
      if (!supabaseResponse.ok) throw new Error('Analiz kaydedilirken bir hata oluştu.');

      guncelleYerel(score.id, { yapay_zeka_yorumu: aiComment });
      setUndoMesaj(`🤖 ${score.ogrenci_adi} için analiz üretildi`);
    } catch (error: any) {
      console.error('❌ Analiz sırasında hata:', error);
      alert(`Analiz hatası: ${error.message}`);
    } finally {
      setAnalizIsleniyor(false);
    }
  };

  // Ret sonrası: AI'yı tekrar çağırır (3 oyun tamamı bir kez daha reddederse süreç tekrar eder).
  const yenidenAnalizeSokKuyrukta = (score: KuyrukKaydi & { algilanan_kelime?: string }) => {
    setTimeout(() => analyzeGame(score), 400);
  };

  // ---- E-posta ----
  const sendEmail = async (score: KuyrukKaydi) => {
    if (!score.email) return;
    try {
      const oyunAdiTR = getGameDisplay(score.oyun_turu).name;
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: score.email,
          subject: `🎮 ${score.ogrenci_adi} - ${oyunAdiTR} Raporu`,
          message: `Merhaba, ${score.ogrenci_adi} az önce ${oyunAdiTR} oyununu tamamladı. İşte sonuçlar:`,
          gameDetails: { game: oyunAdiTR, duration: score.sure, moves: score.hamle_sayisi, errors: score.hata_sayisi, aiComment: score.yapay_zeka_yorumu },
        }),
      });
      setUndoMesaj(res.ok ? '📧 E-posta gönderildi' : '❌ E-posta gönderilemedi');
    } catch (e: any) {
      console.error('E-posta hatası:', e.message);
    }
  };

  // ---- Klavye kısayolları (yalnız web) ----
  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); siradakineGec(); }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); setSelectedIdx((i) => Math.max(0, i - 1)); }
      if (e.key === '/') { e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const sayaclar = useMemo(() => {
    const { sonOySende, banaDusen, baskasiniBekliyor } = bucket === 'beklemede' ? altKovalaraAyir(kayitlar, loggedInUser) : { sonOySende: [], banaDusen: [], baskasiniBekliyor: [] };
    return {
      banaDusen: banaDusen.length, sonOySende: sonOySende.length, baskasiniBekliyor: baskasiniBekliyor.length,
      beklemede: bucket === 'beklemede' ? toplam : 0,
      onayli: bucket === 'onayli' ? toplam : 0,
      reddedildi: bucket === 'reddedildi' ? toplam : 0,
      deneme: denemeToplam,
    };
  }, [kayitlar, bucket, toplam, denemeToplam, loggedInUser]);

  // ============================================================
  // GİRİŞ EKRANI
  // ============================================================
  if (!isAuthenticated) {
    return (
      <DynamicBackground>
        <View style={st.centerContainer}>
          <View style={st.loginBox}>
            <Image source={asset('/images/icon.png')} style={st.loginLogo} resizeMode="contain" />
            <Text style={st.loginTitle}>Uzman Girişi 🔒</Text>
            <TextInput style={st.input} placeholder="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.inkLight} />
            <TextInput style={st.input} placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={C.inkLight} />
            <TouchableOpacity style={st.loginButton} onPress={handleLogin} disabled={isLoggingIn}>
              {isLoggingIn ? <ActivityIndicator size="small" color="white" /> : <Text style={st.loginButtonText}>Giriş Yap</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 14, alignItems: 'center' }} onPress={() => router.back()}>
              <Text style={{ color: C.inkMid }}>Geri Dön</Text>
            </TouchableOpacity>
          </View>
        </View>
      </DynamicBackground>
    );
  }

  // ============================================================
  // İNCELEME MASASI
  // ============================================================
  return (
    <View style={st.app}>
      <View style={st.topbar}>
        <Text style={st.brand}>İnceleme Masası</Text>
        <Text style={st.brandSub}>· Oyun analizi incelemesi</Text>
        <Text style={st.stat}>Bu oturum: {oturumOnaySayaci} karar</Text>
        <View style={{ flex: 1 }} />
        <Text style={st.who}>{loggedInUser}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 12 }}><Text style={st.who}>Çıkış</Text></TouchableOpacity>
      </View>

      <View style={st.stage}>
        <View style={[st.rail, railCollapsed && { width: 64 }]}>
          {!railCollapsed && (
            <>
              <JunkBanner
                sayi={denemeToplam}
                gorunur={!junkBannerKapatildi && bucket !== 'deneme'}
                onIncele={() => { setBucket('deneme'); setOffset(0); }}
                onKapat={() => setJunkBannerKapatildi(true)}
              />
              <BucketTabs
                aktif={bucket}
                onSec={(b) => { setBucket(b); setOffset(0); }}
                sayaclar={sayaclar}
                search={search}
                onSearch={(v) => { setSearch(v); setOffset(0); }}
                sort={sort}
                onSort={(s) => { setSort(s); setOffset(0); }}
              />
              <ScrollView style={{ flex: 1 }}>
                {loading ? (
                  <ActivityIndicator style={{ marginTop: 30 }} color={C.accent} />
                ) : kayitlar.length === 0 ? (
                  <Text style={st.emptyText}>Bu kovada kayıt yok.</Text>
                ) : (
                  kayitlar.map((k, i) => (
                    <QueueRow key={k.id} kayit={k} secili={i === selectedIdx} benimAdim={loggedInUser} onPress={() => setSelectedIdx(i)} />
                  ))
                )}
              </ScrollView>
              <View style={st.railFoot}>
                <Text style={st.pg}>{toplam === 0 ? '0' : `${offset + 1}–${Math.min(offset + PAGE_SIZE, toplam)}`} / {toplam}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity disabled={offset === 0} onPress={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}><Text style={[st.pglink, offset === 0 && { opacity: 0.3 }]}>‹</Text></TouchableOpacity>
                  <TouchableOpacity disabled={offset + PAGE_SIZE >= toplam} onPress={() => setOffset((o) => o + PAGE_SIZE)}><Text style={[st.pglink, offset + PAGE_SIZE >= toplam && { opacity: 0.3 }]}>›</Text></TouchableOpacity>
                </View>
              </View>
            </>
          )}
          <TouchableOpacity style={st.collapseBtn} onPress={() => setRailCollapsed((v) => !v)}>
            <Text style={st.collapseBtnText}>{railCollapsed ? '»' : '« daralt'}</Text>
          </TouchableOpacity>
        </View>

        <View style={st.desk}>
          {!secili ? (
            <View style={st.centerContainer}><Text style={st.emptyText}>{loading ? '' : 'Gösterilecek kayıt yok.'}</Text></View>
          ) : bucket === 'deneme' ? (
            // Basitleştirilmiş görünüm — AI metni hiç render edilmez (D3).
            <View style={{ padding: S.xl, gap: S.md }}>
              <Text style={st.brand}>{secili.ogrenci_adi} · {secili.ogrenci_yasi} ay</Text>
              <Text style={{ color: C.inkMid }}>{secili.email || '(e-posta yok)'} · {getGameDisplay(secili.oyun_turu).name} · {new Date(secili.created_at).toLocaleDateString('tr-TR')}</Text>
              <Text style={{ color: C.inkMid }}>{secili.sure ?? '—'} sn · {secili.hamle_sayisi} hamle · {secili.hata_sayisi} hata</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={[st.dbtnLike, { backgroundColor: C.retBg }]} onPress={onGizle}>
                  <Text style={{ color: C.ret, fontWeight: '700' }}>🗑 Gizle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.dbtnLike, { backgroundColor: C.onayBg }]} onPress={siradakineGec}>
                  <Text style={{ color: C.onay, fontWeight: '700' }}>✓ Gerçek kayıt</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.dbtnLike, { backgroundColor: C.panelAlt }]} onPress={siradakineGec}>
                  <Text style={{ color: C.inkMid, fontWeight: '700' }}>Atla</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <ReviewHeader
                kayit={secili}
                navIndex={offset + selectedIdx + 1}
                navTotal={toplam}
                onPrev={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                onNext={siradakineGec}
                onGizle={onGizle}
                onHesabiGizle={onHesabiGizle}
                onIstatistik={onIstatistik}
                onMail={() => sendEmail(secili)}
              />
              <FlagStrip bayraklar={bayraklar} onBayrakPress={onBayrakPress} />

              {!secili.yapay_zeka_yorumu ? (
                <View style={st.centerContainer}>
                  <TouchableOpacity style={[st.dbtnLike, { backgroundColor: C.accent }]} onPress={() => analyzeGame({ ...secili, algilanan_kelime: agirAlanlar?.algilanan_kelime })} disabled={analizIsleniyor}>
                    {analizIsleniyor ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>🤖 Analiz Et</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[st.body, dar && { flexDirection: 'column' }]}>
                  <EvidenceColumn
                    kayit={secili}
                    analiz={analiz}
                    sonUcKiyas={sonUcKiyas}
                    ayniHesap={ayniHesap}
                    agirAlanlar={agirAlanlar}
                    onAyniCocukMu={onIstatistik}
                  />
                  <ClaimColumn
                    analiz={analiz}
                    bayraklar={bayraklar}
                    maarifKod={maarif?.cikti || ''}
                    onFlagSection={onBayrakPress}
                    vurgulananBolum={vurgulananBolum}
                    scrollRef={claimScrollRef}
                    bolumRefs={bolumYRef}
                    sure={secili.sure}
                    hamleSayisi={secili.hamle_sayisi}
                    hataSayisi={secili.hata_sayisi}
                  />
                </View>
              )}

              <DecisionBar kayit={secili} benimAdim={loggedInUser} isleniyor={isleniyor} onOy={onOy} onItirazEt={onItirazEt} />
            </>
          )}
        </View>
      </View>

      <UndoStrip
        mesaj={undoMesaj}
        onGeriAl={() => { undoActionRef.current?.(); setUndoMesaj(null); }}
        onKapan={() => setUndoMesaj(null)}
      />

      {statsFor && (
        <StudentStatsModal
          visible={!!statsFor}
          onClose={() => setStatsFor(null)}
          studentName={statsFor.name}
          studentAge={statsFor.age}
          scores={statsFor.scores}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginBox: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, gap: 12 },
  loginLogo: { width: 56, height: 56, borderRadius: 14, alignSelf: 'center', marginBottom: 10 },
  loginTitle: { fontSize: F.screen, fontWeight: '700', color: C.ink, textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: F.small + 1, color: C.ink },
  loginButton: { backgroundColor: C.accent, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  loginButtonText: { color: '#fff', fontWeight: '700', fontSize: F.small + 1 },

  topbar: { height: 56, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.line },
  brand: { fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  brandSub: { fontSize: F.meta + 1, color: C.inkMid },
  stat: { fontSize: F.meta, color: C.inkMid },
  who: { fontSize: F.small - 1, fontWeight: '700', color: C.ink },

  stage: { flex: 1, flexDirection: 'row', minHeight: 0 },
  rail: { width: 340, flexShrink: 0, backgroundColor: C.panel, borderRightWidth: 1, borderRightColor: C.line },
  railFoot: { flexShrink: 0, padding: S.md, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pg: { fontSize: F.meta, color: C.inkMid },
  pglink: { fontSize: F.small + 2, color: C.inkMid, paddingHorizontal: 6, fontWeight: '700' },
  collapseBtn: { padding: 8, borderTopWidth: 1, borderTopColor: C.line, alignItems: 'center' },
  collapseBtnText: { fontSize: F.meta, color: C.inkMid, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: C.inkLight, marginTop: 30, fontSize: F.small },

  desk: { flex: 1, minWidth: 0 },
  body: { flex: 1, flexDirection: 'row', minHeight: 0 },
  dbtnLike: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 },
});
