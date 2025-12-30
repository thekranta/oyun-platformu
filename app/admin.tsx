import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import DynamicBackground from '../components/DynamicBackground';
import StudentStatsModal from '../components/StudentStatsModal';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

interface Score {
    id: number;
    created_at: string;
    ogrenci_adi: string;
    ogrenci_yasi: number;
    oyun_turu: string;
    hamle_sayisi: number;
    hata_sayisi: number;
    yapay_zeka_yorumu?: string;
    sure?: number;
    email?: string;
    cizim_verisi?: string;
    zorluk_seviyesi?: number;
    kazanim_odagi?: string;
    deneme_no?: number;
    algilanan_kelime?: string;
    uzman_onayi?: boolean;
    onaylayan_uzman?: string;
    toplam_tur_sayisi?: number;
    mevcut_tur?: number;
}

interface StudentGroup {
    id: string; // Unique ID based on name-age
    name: string;
    age: number;
    scores: Score[];
}

type DrawingPoint = { x: number; y: number };
type DrawingStroke = { color: string; size: number; points: DrawingPoint[] };
type DrawingPayload = {
    strokes?: DrawingStroke[];
    size?: { width: number; height: number };
    imageUrl?: string;
    imagePath?: string;
    imageFormat?: string;
    cizimResimBase64?: string;
    cizimResimFormat?: string;
};

export default function AdminPanel() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const { isMuted, toggleMute } = { isMuted: false, toggleMute: () => { } }; // Placeholder - using MusicButton instead

    // UI State - Lifted to prevent collapse on re-render
    const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
    const [visibleCommentIds, setVisibleCommentIds] = useState<Set<number>>(new Set());

    // Login State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            fetchScores();
        }
    }, [isAuthenticated]);

    const handleLogin = () => {
        if (username === 'admin' && password === '12') {
            setIsAuthenticated(true);
        } else {
            alert('Hatalı kullanıcı adı veya şifre!');
        }
    };

    const toggleGroupExpansion = (groupId: string) => {
        setExpandedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const toggleCommentVisibility = (scoreId: number) => {
        setVisibleCommentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(scoreId)) {
                newSet.delete(scoreId);
            } else {
                newSet.add(scoreId);
            }
            return newSet;
        });
    };

    const fetchScores = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?select=*&order=created_at.desc`, {
                headers: {
                    'apikey': SUPABASE_KEY || '',
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                },
            });

            if (!response.ok) {
                throw new Error('Veri çekilemedi');
            }

            const data: Score[] = await response.json();
            groupScoresByStudent(data);
        } catch (error) {
            console.error(error);
            alert('Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const groupScoresByStudent = (scores: Score[]) => {
        const groups: { [key: string]: StudentGroup } = {};

        scores.forEach(score => {
            const key = `${score.ogrenci_adi}-${score.ogrenci_yasi}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    name: score.ogrenci_adi,
                    age: score.ogrenci_yasi,
                    scores: []
                };
            }
            groups[key].scores.push(score);
        });

        const groupArray = Object.values(groups).sort((a, b) => {
            const dateA = new Date(a.scores[0].created_at).getTime();
            const dateB = new Date(b.scores[0].created_at).getTime();
            return dateB - dateA;
        });

        setStudentGroups(groupArray);
    };

    // === 4. UZMAN ONAY SİSTEMİ ===
    const approveReport = async (score: Score) => {
        setProcessingId(score.id);
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${score.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({
                        uzman_onayi: true,
                        onaylayan_uzman: 'Admin'
                    }),
                }
            );

            if (response.ok) {
                // Lokal state güncelle
                setStudentGroups(prev => prev.map(group => ({
                    ...group,
                    scores: group.scores.map(s =>
                        s.id === score.id ? { ...s, uzman_onayi: true, onaylayan_uzman: 'Admin' } : s
                    )
                })));
                alert('✅ Rapor uzman tarafından onaylandı!');
            } else {
                alert('❌ Onay kaydedilemedi.');
            }
        } catch (error) {
            console.error('Onay hatası:', error);
            alert('Bir hata oluştu.');
        } finally {
            setProcessingId(null);
        }
    };

    const analyzeGame = async (score: Score) => {
        if (score.oyun_turu === 'yaratici-cizim') {
            alert('Yaratıcı çizim için yapay zeka yorumu oluşturulmaz.');
            return;
        }
        if (!GEMINI_API_KEY) {
            alert('Gemini API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
            return;
        }

        setProcessingId(score.id);
        try {
            // Maarif Modeli Referans Matrisi - Oyun Eşleştirmeleri (raw_curriculum.txt'ye göre)
            const maarifMatrisi: Record<string, { alan: string; surec: string; cikti: string; ciktiAciklama: string; deger?: string }> = {
                // Matematik Alanı
                'hafiza': { alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme' },
                'yapboz': { alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Bir bütünü oluşturan parçaları gösterir, parçalar arası ilişkiyi açıklar' },
                'sayilari-birlestir': { alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme (1-5 arası nesne/varlık sayısını söyler)' },
                'siralama': { alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme (karşılaştırma)' },
                'diziyi-tamamla': { alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Örüntüyü kuralına uygun olarak devam ettirir' },
                'eksik-sayi-bul': { alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel durumlara ilişkin eksik/fazla/uyumsuz olan parçaları söyler' },
                'kodlama': { alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Matematiksel problemler ve çözümlerine ilişkin stratejiler geliştirebilme' },
                'kutuyu-bul': { alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme, görsel tarama' },
                // Fen Alanı
                'gruplama': { alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesne, olayları benzerlik ve farklılıklarına göre sınıflandırabilme' },
                // Türkçe Alanı
                'bunu-soyle': { alan: 'Türkçe', surec: 'Konuşma / İçerik Oluşturma', cikti: 'TAKB.2', ciktiAciklama: 'Konuşma sürecinin içeriğini oluşturabilme' },
                'rakam-yazma': { alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme (boyama ve çizgi çalışmaları)' },
                // Sanat Alanı
                'yaratici-cizim': { alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB4', ciktiAciklama: 'Sanat etkinliklerinde yaratıcı ürünler oluşturur' },
                // Sosyal-Duygusal Gelişim (Kullanıcının belirlediği kodlar)
                'ceviz_macera': { alan: 'Sosyal-Duygusal Gelişim', surec: 'Değer Kazanımı', cikti: 'SDB.3', ciktiAciklama: 'Duyarlılık ve yardımseverlik', deger: 'Yardımseverlik' },
                'aile-sepeti': { alan: 'Sosyal-Duygusal Gelişim', surec: 'Değer Kazanımı', cikti: 'SDB.2.1', ciktiAciklama: 'Aile bütünlüğü ve aidiyet duygusu', deger: 'Aile Bütünlüğü' },
            };

            const oyunBilgisi = maarifMatrisi[score.oyun_turu] || {
                alan: 'Genel Gelişim',
                surec: 'Değerlendirme',
                cikti: 'GB.1',
                ciktiAciklama: 'Genel beceri değerlendirmesi'
            };

            // Oyun adını Türkçe'ye çevir
            const oyunAdiMap: Record<string, string> = {
                'hafiza': 'Çiftini Bul!',
                'siralama': 'Sıralama',
                'eksik-sayi-bul': 'Eksik Sayıyı Bul',
                'gruplama': 'Gruplama',
                'diziyi-tamamla': 'Diziyi Tamamla',
                'bunu-soyle': 'Bunu Söyle!',
                'kodlama': 'Minik Kaşif',
                'rakam-yazma': 'Rakam Yazma',
                'ceviz_macera': 'Ceviz Macerası',
                'aile-sepeti': 'Aile Sepeti',
                'yapboz': 'Yapboz',
                'sayilari-birlestir': 'Sayıları Birleştir',
                'kutuyu-bul': 'Kutuyu Bul!',
            };
            const oyunAdiTR = oyunAdiMap[score.oyun_turu] || score.oyun_turu;

            // Gelişimsel dönem belirleme
            const yasAy = score.ogrenci_yasi;
            let gelisimselDonem = '';
            if (yasAy < 36) gelisimselDonem = 'Erken Çocukluk (24-36 ay)';
            else if (yasAy < 48) gelisimselDonem = 'Okul Öncesi Erken Dönem (36-48 ay)';
            else if (yasAy < 60) gelisimselDonem = 'Okul Öncesi Geç Dönem (48-60 ay)';
            else gelisimselDonem = 'Okula Hazırlık Dönemi (60+ ay)';

            // Hata/Süre oranı yorumu
            let performansEgilimi = '';
            const sure = score.sure || 0;
            const hata = score.hata_sayisi || 0;
            if (hata <= 2 && sure > 60) performansEgilimi = 'Titiz ve Kontrollü';
            else if (hata > 3 && sure < 30) performansEgilimi = 'Hızlı Karar Veren (Dürtüsel eğilim)';
            else if (hata <= 2 && sure <= 60) performansEgilimi = 'Dengeli ve Başarılı';
            else performansEgilimi = 'Gelişim Sürecinde';

            // === 1. GELİŞİM TAKİBİ: Son 3 skoru çek ===
            let gelisimGecmisi = '';
            try {
                const oncekiSkorlarResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/oyun_skorlari?select=created_at,sure,hata_sayisi&ogrenci_adi=eq.${encodeURIComponent(score.ogrenci_adi)}&oyun_turu=eq.${score.oyun_turu}&id=neq.${score.id}&order=created_at.desc&limit=3`,
                    {
                        headers: {
                            'apikey': SUPABASE_KEY || '',
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                        },
                    }
                );
                const oncekiSkorlar = await oncekiSkorlarResponse.json();

                if (oncekiSkorlar && oncekiSkorlar.length > 0) {
                    gelisimGecmisi = oncekiSkorlar.map((s: { created_at: string; sure?: number; hata_sayisi?: number }) => {
                        const tarih = new Date(s.created_at);
                        const gun = Math.floor((Date.now() - tarih.getTime()) / (1000 * 60 * 60 * 24));
                        return `- ${gun} gün önce: ${s.sure || '?'} sn, ${s.hata_sayisi || 0} hata`;
                    }).join('\n');
                }
            } catch (e) { console.log('Gelişim geçmişi alınamadı:', e); }

            // === 2. SCAFFOLDING ANALİZİ ===
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

            // === 3. TEKNİK HATA YÖNETİMİ ("Bunu Söyle!" Oyunu) ===
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

            // === 4. TUR ANALİZİ (Bilişsel Yük ve Dikkat Sürdürülebilirliği) ===
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

            // Gelişim geçmişi bölümü
            const gelisimBolumu = gelisimGecmisi ? `
## GELİŞİM GEÇMİŞİ (Son Oyunlar):
${gelisimGecmisi}
- Bugün: ${sure} sn, ${hata} hata

Gemini olarak bu verileri kıyasla ve "Gelişim Seyri" analizi yap.
` : '';

            if (score.oyun_turu === 'ceviz_macera' || score.oyun_turu === 'aile-sepeti') {
                // Sosyal-Duygusal oyunlar için özel prompt
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

[${score.ogrenci_adi}'nin oyundaki seçimlerini samimi ama profesyonel bir dille açıkla. Evde yapılabilecek bir etkinlik öner.]

Saygılarımızla,
ChildhoodTech Ekibi
                `;
            } else {
                // Bilişsel oyunlar için standart prompt
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

[${score.ogrenci_adi}'nin performansını samimi ama profesyonel bir dille açıkla. Evde yapılabilecek Maarif Modeli'ne uygun bir etkinlik öner.]

Saygılarımızla,
ChildhoodTech Ekibi
                `;
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY?.trim()}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API Hatası:', errorData);
                throw new Error(errorData.error?.message || 'API isteği başarısız oldu');
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0) {
                const aiComment = data.candidates[0].content.parts[0].text;

                // Update Supabase
                const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${score.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ yapay_zeka_yorumu: aiComment })
                });

                if (!supabaseResponse.ok) {
                    throw new Error('Analiz kaydedilirken bir hata oluştu.');
                }

                // Update state directly
                setStudentGroups(prevGroups =>
                    prevGroups.map(group => ({
                        ...group,
                        scores: group.scores.map(s =>
                            s.id === score.id ? { ...s, yapay_zeka_yorumu: aiComment } : s
                        )
                    }))
                );

                // Auto-show comment
                setVisibleCommentIds(prev => new Set(prev).add(score.id));

                console.log('✅ Analiz tamamlandı ve kaydedildi!', { scoreId: score.id, aiComment });
            } else {
                throw new Error('Yapay zeka uygun bir yanıt oluşturamadı.');
            }
        } catch (error: any) {
            console.error('❌ Analiz sırasında hata:', error);
            alert(`Analiz hatası: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const sendEmail = async (score: Score) => {
        if (!score.email) {
            console.warn('⚠️ Bu kayıt için ebeveyn e-postası bulunamadı.', { scoreId: score.id });
            return;
        }
        setProcessingId(score.id);
        try {
            let oyunAdiTR = '';
            if (score.oyun_turu === 'hafiza') oyunAdiTR = 'Hafıza Kartları';
            else if (score.oyun_turu === 'siralama') oyunAdiTR = 'Sayı Sıralama';
            else if (score.oyun_turu === 'eksik-sayi-bul') oyunAdiTR = 'Eksik Sayiyi Bul';
            else if (score.oyun_turu === 'gruplama') oyunAdiTR = 'Gruplama (Kategorizasyon)';
            else if (score.oyun_turu === 'diziyi-tamamla') oyunAdiTR = 'Diziyi Tamamla';
            else if (score.oyun_turu === 'yaratici-cizim') oyunAdiTR = 'Hayal Defteri';
            else if (score.oyun_turu === 'rakam-yazma') oyunAdiTR = 'Rakam Yazma';
            else oyunAdiTR = score.oyun_turu;

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: score.email,
                    subject: `🎮 ${score.ogrenci_adi} - ${oyunAdiTR} Raporu`,
                    message: `Merhaba, ${score.ogrenci_adi} az önce ${oyunAdiTR} oyununu tamamladı. İşte sonuçlar:`,
                    gameDetails: {
                        game: oyunAdiTR,
                        duration: score.sure,
                        moves: score.hamle_sayisi,
                        errors: score.hata_sayisi,
                        aiComment: score.yapay_zeka_yorumu
                    }
                })
            });

            if (response.ok) {
                console.log('✅ E-posta başarıyla gönderildi!', { email: score.email, scoreId: score.id });
                alert('E-posta gönderildi!');
            } else {
                console.error('❌ E-posta hatası');
                alert('E-posta gönderilemedi.');
            }

        } catch (error: any) {
            console.error("❌ E-posta gönderilirken hata:", error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const DrawingPreview = ({ data }: { data: string | any }) => {
        const parsed = useMemo<DrawingPayload | null>(() => {
            try {
                if (typeof data === 'object' && data !== null) {
                    return data as DrawingPayload;
                }
                if (typeof data === 'string') {
                    const obj = JSON.parse(data);
                    if (obj?.strokes || obj?.imageUrl) return obj as DrawingPayload;
                }
                return null;
            } catch {
                return null;
            }
        }, [data]);

        if (!parsed) {
            return <Text style={styles.drawingError}>Çizim yüklenemedi</Text>;
        }

        if (parsed.imageUrl) {
            return (
                <View style={styles.drawingBox}>
                    <Image source={{ uri: parsed.imageUrl }} style={styles.drawingImage} resizeMode="contain" />
                </View>
            );
        }

        if (!parsed.strokes || parsed.strokes.length === 0) {
            // Eğer resim yoksa ve strokes boşsa, base64 var mı kontrol et
            if (parsed.cizimResimBase64) {
                return (
                    <View style={styles.drawingBox}>
                        <Image
                            source={{ uri: `data:image/${parsed.cizimResimFormat || 'png'};base64,${parsed.cizimResimBase64}` }}
                            style={styles.drawingImage}
                            resizeMode="contain"
                        />
                    </View>
                );
            }
            return <Text style={styles.drawingError}>Çizim verisi eksik</Text>;
        }

        // Strokes varsa, SVG benzeri bir yapıyla çizmeye çalışalım
        // Veya daha basit, noktaları birleştirin.
        // Ancak View tabanlı çizim bazen performanslı olmayabilir veya ölçekleme sorunu olabilir.
        // Şimdilik existing mantığı koruyarak scale faktörünü ve container size'ı kontrol edelim.

        const baseW = parsed.size?.width || 320;
        const baseH = parsed.size?.height || 220;
        // Ekrana sığdırmak için scale
        const targetWidth = 200; // Sabit bir genişlik hedefleyelim
        const scale = Math.min(1, targetWidth / baseW);
        const viewW = baseW * scale;
        const viewH = baseH * scale;

        return (
            <View style={[styles.drawingBox, { width: viewW, height: viewH, overflow: 'hidden', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee' }]}>
                {parsed.strokes.map((stroke, si) => (
                    <View key={`stroke-${si}`} style={{ position: 'absolute', width: '100%', height: '100%' }}>
                        {stroke.points.map((p, pi) => (
                            <View
                                key={`${si}-${pi}`}
                                style={{
                                    position: 'absolute',
                                    left: (p.x * scale), // Merkezlemek yerine doğrudan koordinat
                                    top: (p.y * scale),
                                    width: (stroke.size || 4) * scale,
                                    height: (stroke.size || 4) * scale,
                                    borderRadius: ((stroke.size || 4) * scale) / 2,
                                    backgroundColor: stroke.color || '#000',
                                }}
                            />
                        ))}
                    </View>
                ))}
            </View>
        );
    };

    const StudentCard = ({ student }: { student: StudentGroup }) => {
        const isExpanded = expandedGroupIds.has(student.id);
        const [showStats, setShowStats] = useState(false);

        return (
            <>
                <StudentStatsModal
                    visible={showStats}
                    onClose={() => setShowStats(false)}
                    studentName={student.name}
                    studentAge={student.age}
                    scores={student.scores}
                />
                <View style={styles.studentCard}>
                    <TouchableOpacity onPress={() => toggleGroupExpansion(student.id)} style={styles.studentHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.studentName}>{student.name}</Text>
                                <Text style={styles.studentAge}>{student.age} Ay • {student.scores.length} Oyun</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowStats(true)} style={{ padding: 4 }}>
                                <Ionicons name="stats-chart" size={20} color="#2196F3" />
                            </TouchableOpacity>
                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color="#555" />
                        </View>
                    </TouchableOpacity>

                    {isExpanded && (
                        <View style={styles.gamesList}>
                            {student.scores.map((score, index) => (
                                <GameRow key={score.id} score={score} isLast={index === student.scores.length - 1} />
                            ))}
                        </View>
                    )}
                </View>
            </>
        );
    };

    const GameRow = ({ score, isLast }: { score: Score, isLast: boolean }) => {
        const showComment = visibleCommentIds.has(score.id);
        const isProcessing = processingId === score.id;
        const isDrawing = score.oyun_turu === 'yaratici-cizim';

        return (
            <View style={[styles.gameRow, !isLast && styles.gameRowBorder]}>
                <View style={styles.gameHeader}>
                    <Text style={styles.gameTypeBadge}>{score.oyun_turu.toUpperCase()}</Text>
                    <Text style={styles.gameDate}>{new Date(score.created_at).toLocaleDateString('tr-TR')} {new Date(score.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text style={styles.statValue}>{score.sure || '?'} sn</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="finger-print-outline" size={14} color="#666" />
                        <Text style={styles.statValue}>{score.hamle_sayisi} Hamle</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="alert-circle-outline" size={14} color="#666" />
                        <Text style={styles.statValue}>{score.hata_sayisi} Hata</Text>
                    </View>
                </View>

                {score.cizim_verisi && (
                    <View style={styles.drawingPreviewWrap}>
                        <Text style={styles.drawingLabel}>Çizim</Text>
                        <DrawingPreview data={score.cizim_verisi} />
                    </View>
                )}

                {isDrawing ? (
                    <Text style={styles.infoNote}>Yaratıcı çizimde yapay zeka yorumu oluşturulmaz.</Text>
                ) : (
                    <View style={styles.actionRow}>
                        {(!score.yapay_zeka_yorumu || score.yapay_zeka_yorumu.includes('-Cozum-')) ? (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                                    onPress={() => analyzeGame(score)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>🤖 Analiz Et</Text>}
                                </TouchableOpacity>
                                {score.email && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#4CAF50', paddingVertical: 4, paddingHorizontal: 8 }]}
                                        onPress={() => sendEmail(score)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>📧 Mail Gönder</Text>}
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity onPress={() => toggleCommentVisibility(score.id)} style={styles.aiToggle}>
                                    <Text style={styles.aiToggleText}>🤖 Yorumu {showComment ? 'Gizle' : 'Göster'}</Text>
                                </TouchableOpacity>

                                {score.email && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#4CAF50', paddingVertical: 4, paddingHorizontal: 8 }]}
                                        onPress={() => sendEmail(score)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>📧 Mail Gönder</Text>}
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {showComment && score.yapay_zeka_yorumu && (
                    <View style={styles.aiCommentBox}>
                        <Text style={styles.aiCommentText}>
                            {score.yapay_zeka_yorumu.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                    return <Text key={index} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
                                }
                                return <Text key={index}>{part}</Text>;
                            })}
                        </Text>

                        {/* Uzman Onay Bölümü */}
                        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 10 }}>
                            {score.uzman_onayi ? (
                                <View style={{ backgroundColor: '#e8f5e9', padding: 8, borderRadius: 6 }}>
                                    <Text style={{ color: '#2e7d32', fontSize: 12, fontStyle: 'italic' }}>
                                        ✅ Bu rapor AI tarafından oluşturulmuş ve alan uzmanı tarafından pedagojik olarak doğrulanmıştır.
                                    </Text>
                                    <Text style={{ color: '#558b2f', fontSize: 10, marginTop: 4 }}>
                                        Onaylayan: {score.onaylayan_uzman || 'Admin'}
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={{ backgroundColor: '#ff9800', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' }}
                                    onPress={() => approveReport(score)}
                                    disabled={processingId === score.id}
                                >
                                    {processingId === score.id ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✅ Uzman Onayı Ver</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (!isAuthenticated) {
        return (
            <DynamicBackground>
                <View style={styles.centerContainer}>
                    <View style={styles.loginBox}>
                        <Text style={styles.loginTitle}>Admin Girişi 🔒</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Kullanıcı Adı"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Şifre"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                            <Text style={styles.loginButtonText}>Giriş Yap</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.backButtonSimple} onPress={() => router.back()}>
                            <Text style={{ color: '#666' }}>Geri Dön</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground>
            <View style={[styles.container, isLandscape && styles.containerLandscape]}>
                <View style={[styles.header, isLandscape && styles.headerLandscape]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={[styles.title, isLandscape && styles.titleLandscape]}>Öğrenci Gelişim Takibi 📊</Text>
                    <TouchableOpacity onPress={fetchScores} style={styles.refreshButton}>
                        <Ionicons name="refresh" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={studentGroups}
                        renderItem={({ item }) => <StudentCard student={item} />}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={[styles.listContent, isLandscape && styles.listContentLandscape]}
                        ListEmptyComponent={<Text style={styles.emptyText}>Henüz kayıt yok.</Text>}
                    />
                )}
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 20 },
    containerLandscape: { maxWidth: 1400, alignSelf: 'center', width: '100%' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    headerLandscape: { maxWidth: 1400, alignSelf: 'center', width: '100%' },
    backButton: { backgroundColor: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 20, marginRight: 15 },
    refreshButton: { backgroundColor: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 20 },
    title: { flex: 1, fontSize: 22, fontWeight: 'bold', color: '#333' },
    titleLandscape: { fontSize: 24 },
    soundButton: { backgroundColor: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 20, marginLeft: 15 },
    listContent: { padding: 15, paddingBottom: 50 },
    listContentLandscape: { maxWidth: 1400, alignSelf: 'center', width: '100%' },
    emptyText: { textAlign: 'center', fontSize: 16, color: '#777', marginTop: 50 },

    // Student Card Styles
    studentCard: { backgroundColor: 'white', borderRadius: 20, marginBottom: 15, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden', maxWidth: '100%' },
    studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: '#2196F3' },
    studentName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    studentAge: { fontSize: 14, color: '#666' },

    // Game List Styles
    gamesList: { backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: '#eee' },
    gameRow: { padding: 15, backgroundColor: '#fff' },
    gameRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    gameTypeBadge: { fontSize: 12, fontWeight: 'bold', color: '#FF9800', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    gameDate: { fontSize: 12, color: '#999' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    statItem: { flexDirection: 'row', alignItems: 'center' },
    statValue: { marginLeft: 5, fontSize: 13, color: '#444', fontWeight: '500' },

    // Action Buttons
    actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    actionButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
    actionButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    // AI Toggle & Comment
    aiToggle: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#E3F2FD', borderRadius: 8 },
    aiToggleText: { fontSize: 12, color: '#2196F3', fontWeight: 'bold' },
    aiCommentBox: { marginTop: 10, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10 },
    aiCommentText: { fontSize: 13, color: '#2E7D32', fontStyle: 'italic', lineHeight: 20 },
    infoNote: { marginTop: 6, color: '#666', fontSize: 12 },
    drawingPreviewWrap: { marginTop: 10, gap: 6 },
    drawingLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
    drawingBox: { borderRadius: 12, backgroundColor: '#fdfaf3', borderWidth: 1, borderColor: '#e0d6c8', overflow: 'hidden' },
    drawingImage: { width: '100%', height: 160 },
    drawingError: { fontSize: 12, color: '#d32f2f' },

    // Login Styles
    loginBox: { width: '100%', maxWidth: 350, backgroundColor: 'white', padding: 30, borderRadius: 25, elevation: 5 },
    loginTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    input: { width: '100%', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    loginButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    backButtonSimple: { marginTop: 15, alignItems: 'center' },
});



