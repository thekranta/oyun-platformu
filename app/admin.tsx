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
    // Multi-expert voting system
    uzman_oylamalari?: Record<string, 'onay' | 'revize' | 'reddet'>;
    onay_durumu?: 'beklemede' | 'onaylandi' | 'reddedildi';
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

// MAB Alan Renkleri - Maarif Modeline Göre
// MAB: Matematik (Mavi), FAB: Fen (Yeşil), TAKB: Türkçe (Kırmızı/Turuncu), SDB: Sosyal-Duygusal (Mor)
const ALAN_COLORS: Record<string, string> = {
    'Matematik': '#1976D2',     // MAB - Mavi
    'Fen': '#388E3C',           // FAB - Yeşil
    'Türkçe': '#D32F2F',         // TAKB - Kırmızı
    'Sanat': '#7B1FA2',         // SNAB - Mor
    'Sosyal-Duygusal Gelişim': '#8E24AA', // SDB - Mor
    'Genel Gelişim': '#607D8B',
};

// Kod prefiksi ile renk eşleştirme
const getCodeColor = (code: string) => {
    if (code.startsWith('MAB')) return '#1976D2';  // Mavi
    if (code.startsWith('FAB')) return '#388E3C';  // Yeşil
    if (code.startsWith('TAKB') || code.startsWith('TAEOB')) return '#D32F2F'; // Kırmızı
    if (code.startsWith('SDB')) return '#8E24AA';  // Mor
    if (code.startsWith('SNAB')) return '#7B1FA2'; // Mor
    return '#607D8B'; // Gri
};

// Circular Progress Component
const CircularProgress = ({ value, maxValue, size = 50, color, label }: { value: number; maxValue: number; size?: number; color: string; label: string }) => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={{ alignItems: 'center', margin: 4 }}>
            <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: '#e0e0e0' }} />
                <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color, borderTopColor: 'transparent', borderRightColor: percentage > 25 ? color : 'transparent', borderBottomColor: percentage > 50 ? color : 'transparent', transform: [{ rotate: '-90deg' }] }} />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#333' }}>{value}</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{label}</Text>
        </View>
    );
};

// MAB Skill Badge Component - Renkli yuvarlatılmış kutucuk
const SkillBadge = ({ code, alan }: { code: string; alan: string }) => {
    const color = getCodeColor(code);
    return (
        <View style={{
            backgroundColor: color,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 14,
            marginRight: 8,
            shadowColor: color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 3,
        }}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 }}>{code}</Text>
        </View>
    );
};

export default function AdminPanel() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const numColumns = isLandscape ? (width > 1200 ? 3 : 2) : 1;
    const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false); // Global loading state for Gemini API

    // UI State
    const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
    const [visibleCommentIds, setVisibleCommentIds] = useState<Set<number>>(new Set());

    // Login State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loggedInUser, setLoggedInUser] = useState('');

    // Toggle detail visibility
    const toggleDetailVisibility = (scoreId: number) => {
        setExpandedDetails(prev => {
            const next = new Set(prev);
            if (next.has(scoreId)) next.delete(scoreId);
            else next.add(scoreId);
            return next;
        });
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchScores();
        }
    }, [isAuthenticated]);

    const handleLogin = () => {
        // Valid users: admin/12, fatih/123, türker/123
        const validUsers: Record<string, { password: string; displayName: string }> = {
            'admin': { password: '12', displayName: 'Admin' },
            'fatih': { password: '123', displayName: 'Fatih' },
            'türker': { password: '123', displayName: 'Türker' },
        };

        const user = validUsers[username.toLowerCase()];
        if (user && user.password === password) {
            setLoggedInUser(user.displayName);
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

    // === 4. ÇOKLU UZMAN OY SİSTEMİ ===
    const submitVote = async (score: Score, voteType: 'onay' | 'revize' | 'reddet') => {
        setProcessingId(score.id);
        try {
            // Mevcut oyları al veya boş obje oluştur
            const currentVotes = score.uzman_oylamalari || {};

            // Giriş yapan uzmanın oyunu ekle
            const updatedVotes = {
                ...currentVotes,
                [loggedInUser]: voteType
            };

            // Onay sayısını hesapla
            const voteValues = Object.values(updatedVotes);
            const onayCount = voteValues.filter(v => v === 'onay').length;
            const reddetCount = voteValues.filter(v => v === 'reddet').length;

            // Onay durumunu belirle
            let newOnayDurumu: 'beklemede' | 'onaylandi' | 'reddedildi' = 'beklemede';
            if (onayCount >= 2) {
                newOnayDurumu = 'onaylandi';
            } else if (reddetCount >= 2) {
                newOnayDurumu = 'reddedildi';
            }

            // Onaylayan uzmanları listele (geriye uyumluluk için)
            const approvedExperts = Object.entries(updatedVotes)
                .filter(([_, v]) => v === 'onay')
                .map(([name, _]) => name)
                .join(', ');

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
                        uzman_oylamalari: updatedVotes,
                        onay_durumu: newOnayDurumu,
                        uzman_onayi: newOnayDurumu === 'onaylandi',
                        onaylayan_uzman: approvedExperts || null
                    }),
                }
            );

            if (response.ok) {
                // Lokal state güncelle
                setStudentGroups(prev => prev.map(group => ({
                    ...group,
                    scores: group.scores.map(s =>
                        s.id === score.id ? {
                            ...s,
                            uzman_oylamalari: updatedVotes,
                            onay_durumu: newOnayDurumu,
                            uzman_onayi: newOnayDurumu === 'onaylandi',
                            onaylayan_uzman: approvedExperts || undefined
                        } : s
                    )
                })));

                // Duruma göre mesaj göster
                if (newOnayDurumu === 'onaylandi') {
                    alert('✅ 2/3 çoğunluk sağlandı! Rapor onaylandı ve veliye görünür.');
                } else if (newOnayDurumu === 'reddedildi') {
                    alert('🔄 2/3 ret oyu verildi. AI analizi yeniden yapılacak...');
                    // AI yeniden analiz yap
                    setTimeout(() => analyzeGame(score), 500);
                } else {
                    const voteEmoji = voteType === 'onay' ? '✅' : voteType === 'revize' ? '📝' : '❌';
                    alert(`${voteEmoji} ${loggedInUser} oyunu kaydedildi. (${onayCount}/3 onay)`);
                }
            } else {
                alert('❌ Oy kaydedilemedi.');
            }
        } catch (error) {
            console.error('Oylama hatası:', error);
            alert('Bir hata oluştu.');
        } finally {
            setProcessingId(null);
        }
    };

    const analyzeGame = async (score: Score) => {
        // Ücretli katman: Paralel isteklere izin ver (rate-limit koruması kaldırıldı)
        if (score.oyun_turu === 'yaratici-cizim') {
            alert('Yaratıcı çizim için yapay zeka yorumu oluşturulmaz.');
            return;
        }
        if (!GEMINI_API_KEY) {
            alert('Gemini API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
            return;
        }

        setIsAnalyzing(true); // Block all other analysis requests
        setProcessingId(score.id);
        console.log('Gemini isteği gönderildi', { scoreId: score.id, oyunTuru: score.oyun_turu });
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
                // Yeni Oyunlar
                'golge-dedektifi': { alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme' },
                // Yeni Bilişsel Oyunlar (Ocak 2026)
                'onluk-cerceve': { alan: 'Matematik', surec: 'Sayısal Temsil', cikti: 'MAB.1', ciktiAciklama: 'Sayıları modellerle ifade etme ve çözümleme (1-10)' },
                'sayi-komsulari': { alan: 'Matematik', surec: 'Sıralama', cikti: 'MAB.4', ciktiAciklama: 'Sayılar arasındaki ardışıklık ve konum ilişkisini belirleme' },
                'tarti-dengesi': { alan: 'Matematik', surec: 'Eşitlik ve Denge', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel eşitlik durumlarını kavrama ve dengeyi sağlama' },
                // Sihirli Tuval - Görsel-Uzamsal Analiz
                'sihirli-tuval': {
                    alan: 'Matematik',
                    surec: 'Görsel-Uzamsal Analiz',
                    cikti: 'MAB.2.1',
                    ciktiAciklama: 'Nesneleri özelliklerine göre eşleştirme ve görsel dikkat - Görsel tarama yoluyla nesne-sembol ilişkisi kurma'
                },
                // Uzay Blokları: Yıldız Mimarı - Problem Çözme ve Uzamsal Algı
                'uzay-bloklari': {
                    alan: 'Bilişsel Gelişim',
                    surec: 'Problem Çözme ve Uzamsal Algı',
                    cikti: 'KB.2.4',
                    ciktiAciklama: 'Görsel-Uzamsal becerileri kullanır (Şekil döndürme, bütünleştirme, yerleştirme)'
                },
            };

            const oyunBilgisi = maarifMatrisi[score.oyun_turu] || {
                // Bilinmeyen oyunlar için varsayılan: Matematik - Muhakeme (en genel bilişsel beceri)
                alan: 'Matematik',
                surec: 'Matematiksel Muhakeme',
                cikti: 'MAB.2',
                ciktiAciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme'
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
                'golge-dedektifi': 'Gölge Dedektifi',
                'onluk-cerceve': 'Onluk Çerçeve',
                'sayi-komsulari': 'Sayı Komşuları',
                'tarti-dengesi': 'Tartı Dengesi',
                'miktar-avcisi': 'Miktar Avcısı',
                'sihirli-tuval': 'Sihirli Tuval: Sayılarla Boyama',
                'uzay-bloklari': 'Uzay Blokları: Yıldız Mimarı',
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
            } else if (score.oyun_turu === 'sihirli-tuval') {
                // === SİHİRLİ TUVAL - GÖRSEL-UZAMSAL ANALİZ ===
                prompt = `
Sen, Türkiye Yüzyılı Maarif Modeli'ne hakim bir Okul Öncesi Eğitim Danışmanısın.
Bu oyun bir "Görsel Dikkat ve Sembolik Eşleme" görevidir, sadece boyama değil!

## VERİLER:
- Öğrenci: ${score.ogrenci_adi} (${yasAy} Ay - ${gelisimselDonem})
- Oyun: Sihirli Tuval: Sayılarla Boyama
- Süre: ${sure} sn | Hamle: ${score.hamle_sayisi} | Hata: ${hata}
- Performans Eğilimi: ${performansEgilimi}
${gelisimBolumu}
## MAARİF MODELİ REFERANSI:
- Alan: Matematik | Süreç: Görsel-Uzamsal Analiz
- Öğrenme Çıktısı: MAB.2.1 - Nesneleri özelliklerine göre eşleştirme ve görsel dikkat

## ANALİZ KRİTERLERİ (ÖNEMLİ):
1. **Görsel Tarama Hızı:** Çocuğun alttaki rakamı seçtikten sonra tuval üzerindeki doğru rakamı bulma süresini "Görsel Tarama Hızı" olarak yorumla.
2. **Hata Analizi (KRİTİK):** Eğer yanlış bir rakama dokunmuşsa bunu ASLA "sayı bilmeme" olarak DEĞERLENDİRME!
   - Bunun yerine "Görsel Ayırt Etme Karışıklığı" (benzer şekiller) veya
   - "Dürtüsellik" (hızlıca dokunma isteği) olarak analiz et.
3. **Beceri Odağı:** Bu oyun sayı sayma değil, "sembol-mekan eşlemesi" becerisi geliştirir.

## VELİ PANELİ İÇİN BAŞLIKLAR:
- Akademik Karşılık: MAB.2.1 - Matematiksel Nesne Çözümleme
- Beceri Karşılığı: Görsel Odaklanma ve Sayı Eşleştirme

## ÇIKTI KURALLARI:
1. ASLA giriş cümlesi kullanma.
2. Doğrudan rapor içeriğiyle başla.
3. Aşağıdaki formatı BİREBİR uygula:

---

**MAARİF MODELİ PEDAGOJİK ANALİZ**

**Akademik Karşılık:** MAB.2.1 - Matematiksel Nesne Çözümleme
**Beceri Karşılığı:** Görsel Odaklanma ve Sayı Eşleştirme

**Görsel Tarama Analizi:** [Çocuğun görsel tarama yoluyla nesne-sembol ilişkisi kurma becerisini değerlendir]

**Performans Değerlendirmesi:** [${hata} hata için "Görsel Ayırt Etme" veya "Dürtüsellik" bağlamında analiz yap. ASLA "sayı bilmiyor" deme!]

**Gelişimsel Değerlendirme:** [${gelisimselDonem} bağlamında görsel-motor koordinasyon becerilerini değerlendir]
${gelisimGecmisi ? '\n**Gelişim Seyri:** [Önceki oyunlarla karşılaştır]' : ''}

---

**VELİ BİLGİLENDİRME NOTU**

Değerli Velimiz,

[${score.ogrenci_adi}'nin görsel tarama ve sembol eşleme becerisini samimi bir dille açıkla. Evde yapılabilecek "renk-sayı eşleme" etkinliği öner.]

Saygılarımızla,
ChildhoodTech Ekibi
                `;
            } else if (score.oyun_turu === 'uzay-bloklari') {
                // === UZAY BLOKLARI - PROBLEM ÇÖZME VE UZAMSAL ALGI ===
                prompt = `
Sen, Türkiye Yüzyılı Maarif Modeli'ne hakim bir Okul Öncesi Eğitim Danışmanısın.

## VERİLER:
- Öğrenci: ${score.ogrenci_adi} (${yasAy} Ay - ${gelisimselDonem})
- Oyun: Uzay Blokları: Yıldız Mimarı
- Süre: ${sure} sn | Hamle: ${score.hamle_sayisi} | Hata: ${hata}
- Performans Eğilimi: ${performansEgilimi}
${gelisimBolumu}
## MAARİF MODELİ REFERANSI:
- Alan: Bilişsel Gelişim | Süreç: Problem Çözme ve Uzamsal Algı
- Öğrenme Çıktısı: KB.2.4 - Görsel-Uzamsal becerileri kullanır (Şekil döndürme, yerleştirme)

## ANALİZ KRİTERLERİ (ÖNEMLİ):
1. **Uzamsal Planlama:** Çocuğun blokları yerleştirmeden önce zihninde döndürüp döndüremediğini (deneme-yanılma sayısı ile) analiz et.
2. **Problem Çözme:** Hatadan sonra strateji değiştirip değiştirmediğini değerlendir.
3. **Parça-Bütün İlişkisi:** Karmaşık şekilleri boşluğa sığdırma becerisini yorumla.

## VELİ PANELİ İÇİN BAŞLIKLAR:
- Akademik Karşılık: KB.2.4 - Uzamsal Düşünme ve Şekil Algısı
- Beceri Karşılığı: Problem Çözme ve Parça-Bütün İlişkisi

## ÇIKTI KURALLARI:
1. ASLA giriş cümlesi kullanma.
2. Doğrudan rapor içeriğiyle başla.
3. Aşağıdaki formatı BİREBİR uygula:

---

**MAARİF MODELİ PEDAGOJİK ANALİZ**

**Akademik Karşılık:** KB.2.4 - Uzamsal Düşünme ve Şekil Algısı
**Beceri Karşılığı:** Problem Çözme ve Parça-Bütün İlişkisi

**Uzamsal Planlama Analizi:** [Çocuğun blokları yerleştirme süresi (${sure} sn) ve hata sayısı (${hata}) üzerinden zihinsel rotasyon becerisini değerlendir]

**Problem Çözme Stratejisi:** [Hata yaptıktan sonraki düzeltme hızı ve yaklaşımını analiz et]

**Gelişimsel Değerlendirme:** [${gelisimselDonem} bağlamında parça-bütün ilişkisi kurma becerisini değerlendir]
${gelisimGecmisi ? '\n**Gelişim Seyri:** [Önceki oyunlarla karşılaştır]' : ''}

---

**VELİ BİLGİLENDİRME NOTU**

Değerli Velimiz,

[${score.ogrenci_adi}'nin problem çözme ve uzamsal algı becerisini samimi bir dille açıkla. Evde yapılabilecek "lego/blok" veya "kutu yerleştirme" etkinliği öner.]

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

            // Model fallback mekanizması - birden fazla model dene
            const models = [
                { name: 'gemini-2.0-flash', version: 'v1' },
                { name: 'gemini-1.5-flash', version: 'v1' },
                { name: 'gemini-1.5-pro', version: 'v1' },
                { name: 'gemini-pro', version: 'v1beta' },
            ];

            let response: Response | null = null;
            let lastError = '';

            for (const model of models) {
                try {
                    console.log(`🔄 Deneniyor: ${model.name} (${model.version})`);
                    response = await fetch(
                        `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${GEMINI_API_KEY?.trim()}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                        }
                    );

                    if (response.ok) {
                        console.log(`✅ Başarılı model: ${model.name}`);
                        break;
                    }

                    const errorData = await response.json();
                    lastError = errorData.error?.message || `Status: ${response.status}`;
                    console.log(`❌ ${model.name} başarısız: ${lastError}`);

                    // Sadece model bulunamadı hatalarında diğer modeli dene
                    if (response.status !== 404 && response.status !== 400) {
                        break; // Quota veya başka hata - döngüden çık
                    }
                    response = null;
                } catch (e: any) {
                    lastError = e.message;
                    console.error(`❌ ${model.name} hata:`, e);
                }
            }

            if (!response || !response.ok) {
                alert(`API Hatası: ${lastError}`);
                return;
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
            setIsAnalyzing(false); // Release the global lock
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

    // Maarif Matrisi yardımcı fonksiyonu
    const getOyunBilgisi = (oyunTuru: string) => {
        const maarifMatrisi: Record<string, { alan: string; cikti: string }> = {
            'hafiza': { alan: 'Matematik', cikti: 'MAB.2' },
            'yapboz': { alan: 'Matematik', cikti: 'MAB.2' },
            'sayilari-birlestir': { alan: 'Matematik', cikti: 'MAB.1' },
            'siralama': { alan: 'Matematik', cikti: 'MAB.4' },
            'diziyi-tamamla': { alan: 'Matematik', cikti: 'MAB.4' },
            'eksik-sayi-bul': { alan: 'Matematik', cikti: 'MAB.5' },
            'kodlama': { alan: 'Matematik', cikti: 'MAB.7' },
            'kutuyu-bul': { alan: 'Matematik', cikti: 'MAB.2' },
            'gruplama': { alan: 'Fen', cikti: 'FAB.2' },
            'bunu-soyle': { alan: 'Türkçe', cikti: 'TAKB.2' },
            'rakam-yazma': { alan: 'Türkçe', cikti: 'TAEOB.6' },
            'yaratici-cizim': { alan: 'Sanat', cikti: 'SNAB4' },
            'ceviz_macera': { alan: 'Sosyal-Duygusal Gelişim', cikti: 'SDB.3' },
            'aile-sepeti': { alan: 'Sosyal-Duygusal Gelişim', cikti: 'SDB.2.1' },
            'golge-dedektifi': { alan: 'Matematik', cikti: 'MAB.2' },
            // Yeni Matematik Oyunları
            'onluk-cerceve': { alan: 'Matematik', cikti: 'MAB.1' },
            'sayi-komsulari': { alan: 'Matematik', cikti: 'MAB.4' },
            'tarti-dengesi': { alan: 'Matematik', cikti: 'MAB.1' },
            'miktar-avcisi': { alan: 'Matematik', cikti: 'MAB.1' },
            'sihirli-tuval': { alan: 'Matematik', cikti: 'MAB.2.1' },
            'sihirli-siseler': { alan: 'Matematik', cikti: 'MAB.2' },
        };
        // Bilinmeyen oyunlar için varsayılan: MAB.2 (Matematik - Muhakeme)
        // ASLA GB.1 veya 'Genel Gelişim' kullanma!
        return maarifMatrisi[oyunTuru] || { alan: 'Matematik', cikti: 'MAB.2' };
    };

    // Özet çıkarma fonksiyonu
    const getSummary = (text: string) => {
        if (!text) return { summary: '', details: '' };
        const sentences = text.split(/(?<=[.!?])\s+/);
        const summary = sentences.slice(0, 2).join(' ');
        const details = sentences.slice(2).join(' ');
        return { summary, details };
    };

    // Markdown bold text renderer
    const renderMarkdown = (text: string) => {
        if (!text) return null;
        return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <Text key={index} style={{ fontWeight: 'bold', color: '#1a1a2e' }}>{part.slice(2, -2)}</Text>;
            }
            return <Text key={index}>{part}</Text>;
        });
    };

    const GameRow = ({ score, isLast }: { score: Score, isLast: boolean }) => {
        const showComment = visibleCommentIds.has(score.id);
        const showDetails = expandedDetails.has(score.id);
        const isProcessing = processingId === score.id;
        const isDrawing = score.oyun_turu === 'yaratici-cizim';
        const oyunBilgisi = getOyunBilgisi(score.oyun_turu);
        const { summary, details } = getSummary(score.yapay_zeka_yorumu || '');

        // Hata rengi hesaplama
        const hataRenk = score.hata_sayisi <= 2 ? '#4CAF50' : score.hata_sayisi <= 5 ? '#FF9800' : '#f44336';
        const sureRenk = (score.sure || 0) <= 60 ? '#4CAF50' : (score.sure || 0) <= 120 ? '#2196F3' : '#FF9800';

        return (
            <View style={[styles.gameRow, !isLast && styles.gameRowBorder]}>
                {/* Uzman Onay Rozeti - Sağ üst köşede */}
                {score.uzman_onayi && (
                    <View style={styles.approvalCornerBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#fff" />
                        <Text style={styles.approvalCornerText}>Onaylı</Text>
                    </View>
                )}

                {/* Header with MAB Badge */}
                <View style={styles.gameHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <SkillBadge code={oyunBilgisi.cikti} alan={oyunBilgisi.alan} />
                        <Text style={styles.gameTypeBadge}>{score.oyun_turu.replace(/-/g, ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.gameDate}>{new Date(score.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>

                {/* Circular Progress Stats */}
                <View style={styles.circularStatsRow}>
                    <CircularProgress value={score.sure || 0} maxValue={120} size={52} color={sureRenk} label="Süre (sn)" />
                    <CircularProgress value={score.hamle_sayisi} maxValue={50} size={52} color="#2196F3" label="Hamle" />
                    <CircularProgress value={score.hata_sayisi} maxValue={10} size={52} color={hataRenk} label="Hata" />
                </View>

                {score.cizim_verisi && (
                    <View style={styles.drawingPreviewWrap}>
                        <Text style={styles.drawingLabel}>Çizim</Text>
                        <DrawingPreview data={score.cizim_verisi} />
                    </View>
                )}

                {/* Bunu Söyle - Telaffuz Sonuçları */}
                {score.oyun_turu === 'bunu-soyle' && score.algilanan_kelime && (() => {
                    try {
                        const pronunciationData = JSON.parse(score.algilanan_kelime);
                        if (pronunciationData.results && Array.isArray(pronunciationData.results)) {
                            return (
                                <View style={styles.pronunciationBox}>
                                    <Text style={styles.pronunciationTitle}>🎙️ Telaffuz Analizi</Text>
                                    <View style={styles.pronunciationHeader}>
                                        <Text style={styles.pronunciationHeaderText}>Beklenen</Text>
                                        <Text style={styles.pronunciationHeaderText}>Algılanan</Text>
                                        <Text style={styles.pronunciationHeaderText}>Sonuç</Text>
                                    </View>
                                    {pronunciationData.results.map((r: any, idx: number) => (
                                        <View key={idx} style={styles.pronunciationRow}>
                                            <Text style={styles.pronunciationExpected}>{r.expected}</Text>
                                            <Text style={[
                                                styles.pronunciationTranscribed,
                                                !r.isCorrect && styles.pronunciationError
                                            ]}>{r.transcribed}</Text>
                                            <View style={[
                                                styles.pronunciationBadge,
                                                r.isCorrect ? styles.pronunciationCorrect : styles.pronunciationWrong
                                            ]}>
                                                <Text style={styles.pronunciationBadgeText}>
                                                    {r.isCorrect ? '✓' : '✗'}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                    <View style={styles.pronunciationSummary}>
                                        <Text style={styles.pronunciationSummaryText}>
                                            Doğruluk: {pronunciationData.accuracy}% ({pronunciationData.totalCorrect}/{pronunciationData.totalStages})
                                        </Text>
                                    </View>
                                </View>
                            );
                        }
                    } catch (e) {
                        // JSON parse hatası - eski format olabilir
                    }
                    return null;
                })()}

                {isDrawing ? (
                    <Text style={styles.infoNote}>Yaratıcı çizimde yapay zeka yorumu oluşturulmaz.</Text>
                ) : (
                    <View style={styles.actionRow}>
                        {(!score.yapay_zeka_yorumu || score.yapay_zeka_yorumu.includes('-Cozum-')) ? (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: isAnalyzing ? '#9E9E9E' : '#2196F3' }]}
                                    onPress={() => analyzeGame(score)}
                                    disabled={isProcessing || isAnalyzing}
                                >
                                    {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>{isAnalyzing ? '⏳ Bekleyin...' : '🤖 Analiz Et'}</Text>}
                                </TouchableOpacity>
                                {score.email && (
                                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} onPress={() => sendEmail(score)} disabled={isProcessing}>
                                        {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>📧 Mail</Text>}
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                                <TouchableOpacity onPress={() => toggleCommentVisibility(score.id)} style={styles.aiToggle}>
                                    <Text style={styles.aiToggleText}>🤖 {showComment ? 'Gizle' : 'Göster'}</Text>
                                </TouchableOpacity>
                                {score.email && (
                                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} onPress={() => sendEmail(score)} disabled={isProcessing}>
                                        <Text style={styles.actionButtonText}>📧 Mail</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* AI Comment with Summary-Detail Separation */}
                {showComment && score.yapay_zeka_yorumu && (
                    <View style={styles.aiCommentBox}>
                        {/* Öne Çıkan Not */}
                        <View style={styles.highlightNote}>
                            <Text style={styles.highlightNoteTitle}>📌 Öne Çıkan Not</Text>
                            <Text style={styles.highlightNoteText}>{renderMarkdown(summary)}</Text>
                        </View>

                        {/* Detayları Gör Butonu */}
                        {details && (
                            <TouchableOpacity onPress={() => toggleDetailVisibility(score.id)} style={styles.detailsToggle}>
                                <Text style={styles.detailsToggleText}>{showDetails ? '▲ Detayları Gizle' : '▼ Detayları Gör'}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Detaylı Analiz */}
                        {showDetails && details && (
                            <View style={styles.detailsBox}>
                                <Text style={styles.aiCommentText}>
                                    {renderMarkdown(details)}
                                </Text>
                            </View>
                        )}

                        {/* Çoklu Uzman Oylama Sistemi */}
                        <View style={styles.certContainer}>
                            {/* Mevcut Oyları Göster */}
                            {score.uzman_oylamalari && Object.keys(score.uzman_oylamalari).length > 0 && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, justifyContent: 'center', gap: 8 }}>
                                    {Object.entries(score.uzman_oylamalari).map(([expert, vote]) => (
                                        <View
                                            key={expert}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: vote === 'onay' ? '#e8f5e9' : vote === 'revize' ? '#fff3e0' : '#ffebee',
                                                paddingHorizontal: 10,
                                                paddingVertical: 5,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: vote === 'onay' ? '#4caf50' : vote === 'revize' ? '#ff9800' : '#f44336'
                                            }}
                                        >
                                            <Text style={{ fontWeight: 'bold', marginRight: 4 }}>{expert}:</Text>
                                            <Text>{vote === 'onay' ? '✅' : vote === 'revize' ? '📝' : '❌'}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Onay Durumu Göstergesi */}
                            {score.onay_durumu === 'onaylandi' ? (
                                <View style={styles.certApproved}>
                                    <View style={styles.certSeal}>
                                        <Ionicons name="shield-checkmark" size={28} color="#2e7d32" />
                                    </View>
                                    <View style={styles.certContent}>
                                        <Text style={styles.certTitle}>Pedagojik Olarak Doğrulanmıştır</Text>
                                        <Text style={styles.certSubtitle}>Bu rapor AI tarafından oluşturulmuş ve 2/3 uzman onayından geçmiştir.</Text>
                                        <Text style={styles.certSigner}>✍️ {score.onaylayan_uzman || 'Uzmanlar'}</Text>
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    {/* Oy Sayısı */}
                                    <View style={{ alignItems: 'center', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 13, color: '#666' }}>
                                            {(() => {
                                                const votes = score.uzman_oylamalari || {};
                                                const onayCount = Object.values(votes).filter(v => v === 'onay').length;
                                                return `${onayCount}/3 Onay (2 gerekli)`;
                                            })()}
                                        </Text>
                                    </View>

                                    {/* Oylama Butonları */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <TouchableOpacity
                                            style={[styles.voteButton, { backgroundColor: '#4CAF50' }]}
                                            onPress={() => submitVote(score, 'onay')}
                                            disabled={processingId === score.id}
                                        >
                                            {processingId === score.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.voteButtonText}>✅ Onay</Text>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.voteButton, { backgroundColor: '#FF9800' }]}
                                            onPress={() => submitVote(score, 'revize')}
                                            disabled={processingId === score.id}
                                        >
                                            <Text style={styles.voteButtonText}>📝 Revize</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.voteButton, { backgroundColor: '#f44336' }]}
                                            onPress={() => submitVote(score, 'reddet')}
                                            disabled={processingId === score.id}
                                        >
                                            <Text style={styles.voteButtonText}>❌ Reddet</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Giriş yapan uzmanın mevcut oyu */}
                                    {score.uzman_oylamalari?.[loggedInUser] && (
                                        <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#888' }}>
                                            Sizin oyunuz: {score.uzman_oylamalari[loggedInUser] === 'onay' ? '✅ Onay' :
                                                score.uzman_oylamalari[loggedInUser] === 'revize' ? '📝 Revize' : '❌ Reddet'}
                                        </Text>
                                    )}
                                </View>
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
                        numColumns={numColumns}
                        key={numColumns}
                        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
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

    // Student Card Styles - Gelişmiş gölgeleme
    studentCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 12,
        marginHorizontal: 6,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        overflow: 'hidden',
        minWidth: 280,
        maxWidth: 600,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
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
    aiCommentBox: { marginTop: 10, backgroundColor: '#f8fffe', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
    aiCommentText: { fontSize: 13, color: '#333', lineHeight: 20 },
    infoNote: { marginTop: 6, color: '#666', fontSize: 12 },
    drawingPreviewWrap: { marginTop: 10, gap: 6 },
    drawingLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
    drawingBox: { borderRadius: 12, backgroundColor: '#fdfaf3', borderWidth: 1, borderColor: '#e0d6c8', overflow: 'hidden' },
    drawingImage: { width: '100%', height: 160 },
    drawingError: { fontSize: 12, color: '#d32f2f' },

    // Grid Layout
    gridRow: { justifyContent: 'space-between', paddingHorizontal: 8 },

    // Circular Stats
    circularStatsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10, gap: 8 },

    // Highlight Note (Summary)
    highlightNote: { backgroundColor: '#fff9e6', padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ffc107' },
    highlightNoteTitle: { fontSize: 12, fontWeight: 'bold', color: '#f57c00', marginBottom: 4 },
    highlightNoteText: { fontSize: 14, color: '#333', lineHeight: 20, fontWeight: '500' },

    // Details Toggle
    detailsToggle: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#f0f0f0', borderRadius: 20, marginBottom: 10 },
    detailsToggleText: { fontSize: 12, color: '#666', fontWeight: '600' },
    detailsBox: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 10 },

    // Certificate Styles
    certContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
    certApproved: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 12, borderRadius: 10, borderWidth: 2, borderColor: '#a5d6a7' },
    certSeal: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#c8e6c9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    certContent: { flex: 1 },
    certTitle: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32', marginBottom: 2 },
    certSubtitle: { fontSize: 11, color: '#558b2f', lineHeight: 16 },
    certSigner: { fontSize: 10, color: '#689f38', marginTop: 4, fontStyle: 'italic' },
    certPending: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff3e0', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ffcc80', alignSelf: 'flex-start' },
    certPendingText: { fontSize: 12, color: '#e65100', fontWeight: 'bold' },

    // Approval Corner Badge - Sağ üst köşe rozeti
    approvalCornerBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2e7d32',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        zIndex: 100,
        shadowColor: '#2e7d32',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    approvalCornerText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Login Styles
    loginBox: { width: '100%', maxWidth: 350, backgroundColor: 'white', padding: 30, borderRadius: 25, elevation: 5 },
    loginTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    input: { width: '100%', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    loginButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    backButtonSimple: { marginTop: 15, alignItems: 'center' },

    // Pronunciation Analysis Styles (Bunu Söyle)
    pronunciationBox: {
        marginTop: 10,
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    pronunciationTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10
    },
    pronunciationHeader: {
        flexDirection: 'row',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        marginBottom: 6
    },
    pronunciationHeaderText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        textAlign: 'center'
    },
    pronunciationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    pronunciationExpected: {
        flex: 1,
        fontSize: 13,
        color: '#333',
        textAlign: 'center',
        fontWeight: '500'
    },
    pronunciationTranscribed: {
        flex: 1,
        fontSize: 13,
        color: '#333',
        textAlign: 'center'
    },
    pronunciationError: {
        color: '#d32f2f',
        fontWeight: '600'
    },
    pronunciationBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8
    },
    pronunciationCorrect: {
        backgroundColor: '#4CAF50'
    },
    pronunciationWrong: {
        backgroundColor: '#f44336'
    },
    pronunciationBadgeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold'
    },
    pronunciationSummary: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center'
    },
    pronunciationSummaryText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2196F3'
    },
    // Multi-expert voting button styles
    voteButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    voteButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
});



