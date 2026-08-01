import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';
import { requestGeminiAnalysis } from '../services/geminiClient';
import { ReportEngine } from '../services/ReportEngine';
import { buildWeeklyReport, buildWeeklyReportHTML } from '../services/weeklyReport';
import DynamicBackground from './DynamicBackground';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Cumulative AI Analysis Function - Sends last 12 games to Gemini for trend analysis
// Generates DUAL structure: 1) Teacher/Academic section with Maarif codes, 2) Parent section with scaffolding
const analyzeWithGemini = async (childName: string, childAge: number, games: GameScore[]): Promise<string | null> => {
    if (games.length === 0) return null;

    const last12Games = games.slice(0, 12);
    const gamesData = last12Games.map((g, idx) => ({
        oyun: idx + 1,
        oyun_turu: g.oyun_turu,
        tarih: new Date(g.created_at).toLocaleDateString('tr-TR'),
        dogru_cevap: g.correct_answers ?? (10 - (g.hata_sayisi || 0)),
        hata_sayisi: g.hata_sayisi,
        sure_saniye: g.sure || Math.round((g.response_time || 0) / 1000),
        bilisselHiz: g.cognitive_speed_score || 0,
    }));

    // Gelişimsel dönem belirleme
    let gelisimselDonem = '';
    if (childAge < 36) gelisimselDonem = 'Erken Çocukluk (24-36 ay)';
    else if (childAge < 48) gelisimselDonem = 'Okul Öncesi Erken Dönem (36-48 ay)';
    else if (childAge < 60) gelisimselDonem = 'Okul Öncesi Geç Dönem (48-60 ay)';
    else gelisimselDonem = 'Okula Hazırlık Dönemi (60-72 ay)';

    const prompt = `Sen bir okul öncesi eğitim uzmanısın ve Türkiye Yüzyılı Maarif Modeli'ne hakimsin.
${childName} (${childAge} aylık - ${gelisimselDonem}) isimli çocuğun son ${last12Games.length} oyunluk performans verilerini analiz et.

VERİLER (JSON):
${JSON.stringify(gamesData, null, 2)}

GÖREV: Aşağıdaki iki bölümlü yapıda rapor oluştur.

## BÖLÜM 1: MAARİF MODELİ PEDAGOJİK ANALİZ (Öğretmen/Akademisyen İçin)

ÖNEMLİ - SADECE AŞAĞIDAKİ MAARİF PROGRAM KODLARINI KULLAN:
- FAB: Fen Alanı Becerileri (FAB.1, FAB.2, FAB.3 vb.)
- MAB: Matematik Alanı Becerileri (MAB.1, MAB.2, MAB.3 vb.)
- HSAB: Hareket ve Sağlık Alanı Becerileri
- SAB: Sosyal Alan Becerileri
- TADB: Türkçe Dinleme/İzleme Becerileri
- TAKB: Türkçe Konuşma Becerileri
- TAEOB: Türkçe Erken Okuryazarlık Becerileri
- TAOB: Türkçe Okuma Becerileri
- MDB/MSB/MÇB/MHB/MYB: Müzik Alanı Becerileri
- SNAB: Sanat Alanı Becerileri

BU KODLAR DIŞINDA KOD KULLANMA! Olmayan kod uydurma!

Bu bölümde şunları yap:
1. İLK oyundan SON oyuna kadar TREND ANALİZİ yap
2. Her oyun türünü ilgili Maarif öğrenme çıktısıyla eşleştir
3. Gelişim alanlarını akademik terminolojiyle değerlendir
4. Performans yüzdelikleri ve karşılaştırmalar sun

---

## BÖLÜM 2: VELİ BİLGİLENDİRME NOTU

Değerli Velimiz,

Bu bölümde:
1. Samimi ve anlaşılır bir dille çocuğun gelişimini açıkla
2. Güçlü yönlerini vurgula
3. EVDE YAPILABİLECEK AKTİVİTELER öner (iskele kurma/scaffolding)
   - Somut, yaşa uygun etkinlikler
   - Günlük rutine entegre edilebilir öneriler
4. Olumlu ve teşvik edici bir ton kullan

Raporun MUTLAKA şu imzayla bitmeli:

Saygılarımızla,
ChildhoodTech Ekibi

ÖNEMLİ: Raporu Türkçe yaz. Giriş cümlesi kullanma, doğrudan içerikle başla.`;

    try {
        return await requestGeminiAnalysis(prompt, { temperature: 0.7, maxOutputTokens: 2048 });
    } catch (error) {
        console.error('Gemini analiz hatası:', error);
        return null;
    }
};

interface VeliDashboardProps {
    childName: string;
    childAge: number;
    email: string;
    subscriptionTier?: 'free' | 'standard' | 'premium';
    onClose: () => void;
}

interface GameScore {
    id: number;
    created_at: string;
    oyun_turu: string;
    correct_answers: number | null;
    cognitive_speed_score: number | null;
    distance_effect: number | null;
    response_time: number | null;
    yapay_zeka_yorumu: string | null;
    kumulatif_ai_yorumu: string | null;  // Separate column for cumulative AI reports
    hata_sayisi: number;
    sure: number;
    visual_attention_score: number | null;  // Sihirli Tuval specific - Görsel Dikkat Skoru
    onay_durumu?: 'beklemede' | 'onaylandi' | 'reddedildi';  // Multi-expert approval status
}

// Pastel color palette - soft and child-friendly
const COLORS = {
    // Backgrounds
    background: '#FFF9E6',      // Soft cream yellow
    backgroundAlt: '#E3F2FD',   // Baby blue
    backgroundGradient1: '#FFECD2', // Peach
    backgroundGradient2: '#FCB69F', // Soft coral

    // Primary colors  
    primary: '#1E88E5',         // Bright Blue (Maviş)
    secondary: '#FFB300',       // Warm Yellow (Pıtır)
    accent: '#66BB6A',          // Fresh Green (Filo)
    premium: '#9C27B0',         // Vibrant Purple

    // Accent colors
    pink: '#F8BBD9',            // Soft Pink
    orange: '#FFCCBC',          // Soft Orange
    mint: '#B2DFDB',            // Soft Mint
    lavender: '#E1BEE7',        // Soft Lavender

    // Text and UI
    card: 'rgba(255,255,255,0.95)',
    cardAlt: 'rgba(255,243,224,0.9)',
    text: '#263238',
    textLight: '#607D8B',
    gradient1: '#667eea',
    gradient2: '#764ba2',

    // Chart colors
    chartBlue: '#42A5F5',
    chartGreen: '#66BB6A',
    chartOrange: '#FF7043',
};

// Character emojis for fun UI
const CHARACTERS = {
    pitir: '🐿️',  // Squirrel
    filo: '🦊',   // Fox
    mavis: '🐦',  // Bird
};

// Helper: Format milliseconds to readable time (e.g., "84sn" or "1dk 24sn")
const formatTime = (ms: number | null): string => {
    if (!ms || ms <= 0) return 'Analiz Ediliyor...';
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}sn`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}dk ${seconds}sn` : `${minutes}dk`;
};

// Helper: Calculate cognitive speed score with new formula
// Formula: (correct_answers / response_time_seconds) * difficulty_multiplier
const calculateCognitiveSpeed = (correctAnswers: number, responseTimeMs: number, difficultyLevel: number = 1): number => {
    if (!responseTimeMs || responseTimeMs <= 0) return 0;
    const responseTimeSeconds = responseTimeMs / 1000;
    const difficultyMultiplier = 1 + (difficultyLevel * 0.1);
    const score = (correctAnswers / responseTimeSeconds) * difficultyMultiplier * 100;
    return Math.round(Math.min(100, score)); // Cap at 100
};

export default function VeliDashboard({ childName, childAge, email, subscriptionTier: initialTier, onClose }: VeliDashboardProps) {
    const { width, height } = Dimensions.get('window');
    const isTablet = width >= 768;
    const isLandscape = width > height;
    const isCompact = isLandscape && height < 500;

    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<GameScore[]>([]);
    const [activeTab, setActiveTab] = useState<'ozet' | 'gelisim' | 'gecmis'>('ozet');
    const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'standard' | 'premium'>(initialTier || 'free');
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [aiReportExpanded, setAiReportExpanded] = useState(false);
    const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null);

    const [showTimeline, setShowTimeline] = useState(true);

    // Cumulative AI Analysis state
    const [cumulativeReport, setCumulativeReport] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Handler for generating cumulative AI report
    const handleGenerateCumulativeReport = async () => {
        if (isAnalyzing || scores.length === 0) return;
        setIsAnalyzing(true);
        try {
            const report = await analyzeWithGemini(childName, childAge, scores);
            if (report) {
                setCumulativeReport(report);

                // Save to Supabase - Update the latest score with cumulative report
                if (scores.length > 0 && scores[0].id) {
                    try {
                        await fetch(
                            `${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${scores[0].id}`,
                            {
                                method: 'PATCH',
                                headers: {
                                    'apikey': SUPABASE_KEY || '',
                                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=minimal',
                                },
                                body: JSON.stringify({ kumulatif_ai_yorumu: report }),
                            }
                        );
                        console.log('💾 Cumulative report saved to Supabase');
                    } catch (saveError) {
                        console.error('Failed to save report to Supabase:', saveError);
                    }
                }

                Alert.alert('✅ Analiz Tamamlandı', 'Kümülatif AI raporu oluşturuldu ve kaydedildi!');
            } else {
                Alert.alert('⚠️ Hata', 'Analiz oluşturulamadı. Lütfen tekrar deneyin.');
            }
        } catch (error) {
            console.error('Cumulative analysis error:', error);
            Alert.alert('❌ Hata', 'Bir sorun oluştu.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        fetchData();
        // Entrance animations
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        ]).start();

        // Continuous pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Helper to normalize game names from DB
    const normalizeGameName = (name: string) => {
        if (!name) return 'bilinmeyen-oyun';
        return name.toLowerCase()
            .trim()
            .replace(/_/g, '-')
            .replace(/\s+/g, '-')
            .replace(/ı/g, 'i').replace(/İ/g, 'i')
            .replace(/ş/g, 's').replace(/Ş/g, 's')
            .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
            .replace(/ü/g, 'u').replace(/Ü/g, 'u')
            .replace(/ö/g, 'o').replace(/Ö/g, 'o')
            .replace(/ç/g, 'c').replace(/Ç/g, 'c');
    };

    // Game Labels Mapping (Updated with DB variations)
    const gameLabels: Record<string, { emoji: string, name: string }> = {
        'miktar-avcisi': { emoji: '🎯', name: 'Miktar Avcısı' },
        'golge-dedektifi': { emoji: '🔍', name: 'Gölge Dedektifi' },
        'diziyi-tamamla': { emoji: '🔢', name: 'Diziyi Tamamla' },
        'dizi-tamamla': { emoji: '🔢', name: 'Dizi Tamamla' },
        'rakam-yazma': { emoji: '✏️', name: 'Rakam Yazma' },
        'yapboz': { emoji: '🧩', name: 'Yapboz' },
        'ceviz-macera': { emoji: '🌰', name: 'Ceviz Macerası' },
        'aile-sepeti': { emoji: '🧱', name: 'Aile Sepeti' },
        'sayi-komsulari': { emoji: '🔗', name: 'Sayı Komşuları' },
        'sayilari-birlestir': { emoji: '🔗', name: 'Sayıları Birleştir' },
        'tarti-dengesi': { emoji: '⚖️', name: 'Tartı Dengesi' },
        'onluk-cerceve': { emoji: '🧮', name: 'Onluk Çerçeve' },
        'bunu-soyle': { emoji: '🗣️', name: 'Bunu Söyle' },
        'eslestirme': { emoji: '🃏', name: 'Eşleştirme' },
        'ritmik-sayma': { emoji: '🔢', name: 'Ritmik Sayma' },
        'sihirli-tuval': { emoji: '🎨', name: 'Sihirli Tuval' },
        'sihirli-siseler': { emoji: '✨', name: 'Sihirli Şişeler' },
        'uzay-bloklari': { emoji: '🌌', name: 'Uzay Blokları' },
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // First try with childName
            console.log('🔍 Fetching scores for childName:', childName);
            let scoresData: GameScore[] = [];

            const scoresResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/oyun_skorlari?ogrenci_adi=eq.${encodeURIComponent(childName)}&order=created_at.desc&limit=50`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            scoresData = await scoresResponse.json();
            console.log('📦 Scores by childName:', scoresData?.length || 0);

            // If no scores found by childName, try by email
            if (!scoresData || scoresData.length === 0) {
                console.log('🔄 No scores by childName, trying by email:', email);
                const emailScoresResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/oyun_skorlari?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=50`,
                    {
                        headers: {
                            'apikey': SUPABASE_KEY || '',
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                        },
                    }
                );
                scoresData = await emailScoresResponse.json();
                console.log('📦 Scores by email:', scoresData?.length || 0);
            }

            setScores(Array.isArray(scoresData) ? scoresData : []);
            console.log('✅ Total scores loaded:', Array.isArray(scoresData) ? scoresData.length : 0);

            // Cache check: If the latest score has a cumulative AI report, use it
            if (Array.isArray(scoresData) && scoresData.length > 0) {
                const latestScore = scoresData[0];
                // Check for existing cumulative report in dedicated column
                if (latestScore.kumulatif_ai_yorumu) {
                    console.log('📋 Using cached cumulative report from Supabase');
                    setCumulativeReport(latestScore.kumulatif_ai_yorumu);
                }
            }

            const profileResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=subscription_tier`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const profileData = await profileResponse.json();
            // Only update if we got data AND we didn't receive a prop value
            if (profileData && profileData.length > 0 && !initialTier) {
                setSubscriptionTier(profileData[0].subscription_tier || 'free');
            }
        } catch (error) {
            console.error('❌ Dashboard veri çekme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get miktar avcisi specific scores
    const miktarAvcisiScores = scores.filter(s => s.oyun_turu === 'miktar-avcisi');

    // Calculate averages from miktar avcisi if available, otherwise from all scores
    const avgCorrectAnswers = miktarAvcisiScores.length > 0
        ? Math.round(miktarAvcisiScores.reduce((a, b) => a + (b.correct_answers || 0), 0) / miktarAvcisiScores.length)
        : scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + ((10 - (b.hata_sayisi || 0))), 0) / scores.length)
            : 0;

    const avgCognitiveSpeed = miktarAvcisiScores.length > 0
        ? Math.round(miktarAvcisiScores.reduce((a, b) => a + (b.cognitive_speed_score || 0), 0) / miktarAvcisiScores.length)
        : 0;

    const avgDistanceEffect = miktarAvcisiScores.length > 0
        ? (miktarAvcisiScores.reduce((a, b) => a + (b.distance_effect || 0), 0) / miktarAvcisiScores.length).toFixed(1)
        : '0';

    const avgResponseTime = miktarAvcisiScores.length > 0
        ? Math.round(miktarAvcisiScores.reduce((a, b) => a + (b.response_time || 0), 0) / miktarAvcisiScores.length)
        : scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + ((b.sure || 0) * 1000), 0) / scores.length)
            : 0;

    // Recalculated cognitive speed with new formula
    const recalculatedCognitiveSpeed = miktarAvcisiScores.length > 0
        ? Math.round(
            miktarAvcisiScores.reduce((a, b) => {
                const correct = b.correct_answers || (10 - (b.hata_sayisi || 0));
                return a + calculateCognitiveSpeed(correct, b.response_time || (b.sure || 0) * 1000, 1);
            }, 0) / miktarAvcisiScores.length
        )
        : scores.length > 0
            ? Math.round(
                scores.reduce((a, b) => {
                    const correct = 10 - (b.hata_sayisi || 0);
                    return a + calculateCognitiveSpeed(correct, (b.sure || 0) * 1000, 1);
                }, 0) / scores.length
            )
            : 0;

    // Get scores that have Visual Attention Score (Sihirli Tuval + Uzay Blokları)
    const visualAttentionGameScores = scores.filter(s => (s.oyun_turu === 'sihirli-tuval' || s.oyun_turu === 'uzay-bloklari') && s.visual_attention_score !== undefined);

    // Calculate average Visual Attention Score
    const avgVisualAttentionScore = visualAttentionGameScores.length > 0
        ? Math.round(visualAttentionGameScores.reduce((a, b) => a + (b.visual_attention_score || 0), 0) / visualAttentionGameScores.length)
        : 0;

    // Get all AI comments - ONLY show approved ones (2/3 majority)
    const allAIComments = scores
        .filter(s => s.yapay_zeka_yorumu && s.onay_durumu === 'onaylandi')
        .map(s => ({
            oyun: s.oyun_turu,
            tarih: s.created_at,
            yorum: s.yapay_zeka_yorumu
        }));

    // Latest APPROVED AI comment only
    const latestAIComment = scores.find(s => s.yapay_zeka_yorumu && s.onay_durumu === 'onaylandi')?.yapay_zeka_yorumu || null;

    // For unapproved AI comments, show pending message
    const hasPendingReports = scores.some(s => s.yapay_zeka_yorumu && s.onay_durumu !== 'onaylandi');

    const isPremium = subscriptionTier === 'premium';
    const successRate = avgCorrectAnswers * 10;

    // Selected game's AI comment for timeline - only if approved
    const selectedGameAIComment = selectedGameIndex !== null &&
        scores[selectedGameIndex]?.yapay_zeka_yorumu &&
        scores[selectedGameIndex]?.onay_durumu === 'onaylandi'
        ? scores[selectedGameIndex].yapay_zeka_yorumu
        : latestAIComment;

    // Time series data for charts - works with all game types
    const getTimeSeriesData = (field: 'score' | 'time') => {
        let filteredScores = [...scores];

        // If a game is selected, filter charts to show only that game type's history
        if (selectedGameIndex !== null && scores[selectedGameIndex]) {
            const selectedType = normalizeGameName(scores[selectedGameIndex].oyun_turu);
            filteredScores = filteredScores.filter(s => normalizeGameName(s.oyun_turu) === selectedType);
        }

        return filteredScores
            .reverse()
            .slice(-15) // Last 15 games
            .map((s, idx) => {
                // Calculate score from various fields
                let value = 0;
                if (field === 'score') {
                    // Try correct_answers first, then derive from hata_sayisi
                    if (s.correct_answers !== null && s.correct_answers > 0) {
                        value = s.correct_answers;
                    } else if (s.hata_sayisi !== null && s.hata_sayisi !== undefined) {
                        value = Math.max(0, 10 - s.hata_sayisi); // Assume 10 questions
                    }
                } else if (field === 'time') {
                    // Response time in seconds
                    if (s.response_time !== null && s.response_time > 0) {
                        value = Math.round(s.response_time / 1000); // Convert ms to seconds
                    } else if (s.sure !== null && s.sure > 0) {
                        value = s.sure; // Already in seconds
                    }
                }

                return {
                    index: idx,
                    value,
                    date: new Date(s.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                    hasData: value > 0
                };
            })
            .filter(d => d.hasData);
    };

    // Best achievement detection
    const getBestAchievement = () => {
        if (scores.length === 0) return { title: 'Başlangıç Yolcusu', emoji: '🚀', description: 'İlk oyununu oynamaya hazır!' };

        if (avgCorrectAnswers >= 9) return { title: 'Bilgi Şampiyonu', emoji: '🏆', description: 'Neredeyse hatasız performans!' };
        if (avgCognitiveSpeed >= 80) return { title: 'Hız Ustası', emoji: '⚡', description: 'Çok hızlı düşünme yeteneği!' };
        if (successRate >= 80) return { title: 'Yıldız Öğrenci', emoji: '🌟', description: 'Harika bir başarı oranı!' };
        if (scores.length >= 10) return { title: 'Azimli Kaşif', emoji: '🎯', description: 'Düzenli pratik yapıyor!' };

        return { title: 'Gelişen Yetenek', emoji: '🌱', description: 'Her gün biraz daha iyi!' };
    };

    const bestAchievement = getBestAchievement();

    // Fun emoji based on performance
    const getPerformanceEmoji = () => {
        if (successRate >= 80) return '🌟';
        if (successRate >= 60) return '⭐';
        if (successRate >= 40) return '👍';
        return '💪';
    };

    // Haftalık Gelişim Raporu verisi (tamamen yerel hesaplanır — AI olmasa da çalışır)
    const weekly = buildWeeklyReport(childName, childAge, scores, cumulativeReport);

    // Haftalık Gelişim Raporu — güvenilir yazdırma tabanlı PDF (tarayıcı motoru).
    // jsPDF/CDN yerine tarayıcının kendi yazdırma motorunu kullanır: Türkçe + emoji
    // kusursuz, çevrimdışı çalışır, "PDF olarak kaydet" ile indirilir.
    const handleDownloadPDF = async () => {
        if (Platform.OS !== 'web') {
            Alert.alert('Bilgi', 'Rapor çıktısı/PDF web sürümünde kullanılabilir. Mobil cihazda gelişimi panelden takip edebilirsiniz.');
            return;
        }
        if (scores.length === 0) {
            Alert.alert('Bilgi', 'Rapor oluşturmak için önce birkaç oyun oynanmalıdır.');
            return;
        }
        setGeneratingPDF(true);
        try {
            const html = buildWeeklyReportHTML(weekly, isPremium);
            const win = window.open('', '_blank', 'width=920,height=1000');
            if (!win) {
                Alert.alert('Açılır Pencere Engellendi', 'Raporu görüntülemek için tarayıcınızda açılır pencerelere (popup) izin verin, sonra tekrar deneyin.');
                return;
            }
            win.document.open();
            win.document.write(html);
            win.document.close();
        } catch (error) {
            console.error('Rapor oluşturma hatası:', error);
            Alert.alert('Hata', 'Rapor oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.');
        } finally {
            setGeneratingPDF(false);
        }
    };

    // Generate shareable achievement image (1080x1080 square for social media)
    const handleGenerateShareImage = async () => {
        if (Platform.OS !== 'web') {
            Alert.alert('Bilgi', 'Bu ozellik sadece web uzerinde kullanilabilir.');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1080, 1080);

            // White card in center
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(80, 80, 920, 920, 40);
            ctx.fill();

            // Child name
            ctx.fillStyle = '#263238';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(childName, 540, 200);

            // Age
            ctx.font = '32px Arial';
            ctx.fillStyle = '#607D8B';
            ctx.fillText(`${childAge} Aylik`, 540, 260);

            // Achievement badge
            ctx.fillStyle = '#FFB300';
            ctx.beginPath();
            ctx.roundRect(240, 320, 600, 120, 20);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 48px Arial';
            ctx.fillText(bestAchievement.emoji, 320, 395);
            ctx.font = 'bold 36px Arial';
            ctx.fillText(bestAchievement.title, 580, 390);

            // Stats
            ctx.fillStyle = '#263238';
            ctx.font = 'bold 120px Arial';
            ctx.fillText(`%${successRate}`, 540, 600);
            ctx.font = '28px Arial';
            ctx.fillStyle = '#607D8B';
            ctx.fillText('Basari Orani', 540, 650);

            // Games played
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#1E88E5';
            ctx.fillText(`${scores.length}`, 300, 780);
            ctx.font = '24px Arial';
            ctx.fillStyle = '#607D8B';
            ctx.fillText('Oyun', 300, 820);

            // Correct answers
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#66BB6A';
            ctx.fillText(`${avgCorrectAnswers}/10`, 780, 780);
            ctx.font = '24px Arial';
            ctx.fillStyle = '#607D8B';
            ctx.fillText('Dogru Cevap', 780, 820);

            // Branding - ChildhoodTech Ekibi
            ctx.fillStyle = '#9C27B0';
            ctx.font = 'bold 32px Arial';
            ctx.fillText('ChildhoodTech Ekibi', 540, 920);
            ctx.font = '22px Arial';
            ctx.fillStyle = '#607D8B';
            ctx.fillText('childhoodtech.com', 540, 960);

            // Download
            const link = document.createElement('a');
            link.download = `${childName}_Basari_Karti.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (error) {
            console.error('Share image error:', error);
            Alert.alert('Hata', 'Gorsel olusturulurken bir hata olustu.');
        }
    };

    // Simple line chart using View elements (no external library needed)
    const SimpleLineChart = ({ data, color, label }: { data: Array<{ index: number, value: number, date: string }>, color: string, label: string }) => {
        if (data.length === 0) {
            return (
                <View style={styles.chartEmpty}>
                    <Text style={styles.chartEmptyEmoji}>📊</Text>
                    <Text style={styles.chartEmptyText}>Analiz Bekleniyor...</Text>
                </View>
            );
        }

        const maxValue = Math.max(...data.map(d => d.value), 10);
        const chartWidth = width - 80;
        const chartHeight = 120;
        const pointSpacing = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartLabel}>{label}</Text>
                <View style={[styles.chartArea, { height: chartHeight }]}>
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((pct, i) => (
                        <View key={i} style={[styles.chartGridLine, { bottom: chartHeight * pct / 100 }]} />
                    ))}

                    {/* Data points and lines */}
                    {data.map((point, idx) => {
                        const x = idx * pointSpacing;
                        const y = (point.value / maxValue) * (chartHeight - 20);

                        return (
                            <View key={idx}>
                                {/* Line to next point */}
                                {idx < data.length - 1 && (
                                    <View style={[
                                        styles.chartLine,
                                        {
                                            left: x + 6,
                                            bottom: y + 6,
                                            width: pointSpacing,
                                            backgroundColor: color,
                                            transform: [{
                                                rotate: `${Math.atan2(
                                                    ((data[idx + 1].value / maxValue) * (chartHeight - 20)) - y,
                                                    pointSpacing
                                                ) * 180 / Math.PI}deg`
                                            }],
                                        }
                                    ]} />
                                )}
                                {/* Point */}
                                <View style={[
                                    styles.chartPoint,
                                    { left: x, bottom: y, backgroundColor: color }
                                ]}>
                                    <Text style={styles.chartPointValue}>{point.value}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
                {/* X-axis labels */}
                <View style={styles.chartXAxis}>
                    {data.slice(0, 5).map((point, idx) => (
                        <Text key={idx} style={styles.chartXLabel}>{point.date}</Text>
                    ))}
                </View>
            </View>
        );
    };

    // Timeline item for game history
    const TimelineItem = ({ game, index, isSelected }: { game: GameScore, index: number, isSelected: boolean }) => {
        const normalizedType = normalizeGameName(game.oyun_turu);
        const gameInfo = gameLabels[normalizedType] || { emoji: '🎮', name: game.oyun_turu?.replace(/-/g, ' ') || 'Oyun' };

        const gameDate = new Date(game.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <TouchableOpacity
                style={[
                    styles.timelineItem,
                    isSelected && styles.timelineItemSelected
                ]}
                onPress={() => setSelectedGameIndex(index)}
            >
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                    <Text style={styles.timelineEmoji}>{gameInfo.emoji}</Text>
                    <View style={styles.timelineInfo}>
                        <Text style={styles.timelineGameName}>{gameInfo.name}</Text>
                        <Text style={styles.timelineDate}>{gameDate}</Text>
                    </View>
                    {game.yapay_zeka_yorumu && (
                        <View style={styles.timelineAIBadge}>
                            <Text style={styles.timelineAIBadgeText}>AI</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // Fun metric card with animation
    const MetricCard = ({ emoji, title, value, subtitle, color, delay = 0 }: {
        emoji: string;
        title: string;
        value: string | number;
        subtitle: string;
        color: string;
        delay?: number;
    }) => {
        const cardAnim = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            Animated.timing(cardAnim, {
                toValue: 1,
                duration: 500,
                delay,
                useNativeDriver: true,
            }).start();
        }, []);

        return (
            <Animated.View style={[
                styles.metricCard,
                {
                    opacity: cardAnim,
                    transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                    borderTopColor: color,
                }
            ]}>
                <Text style={styles.metricEmoji}>{emoji}</Text>
                <Text style={styles.metricTitle}>{title}</Text>
                <Text style={[styles.metricValue, { color }]}>{value}</Text>
                <Text style={styles.metricSubtitle}>{subtitle}</Text>
            </Animated.View>
        );
    };

    if (loading) {
        return (
            <DynamicBackground>
                <View style={styles.loadingContainer}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Text style={styles.loadingEmoji}>🎓</Text>
                    </Animated.View>
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 16 }} />
                    <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
                </View>
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        isCompact && styles.scrollContentCompact
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>📊 Veli Paneli</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    {/* Child Profile Hero */}
                    <Animated.View style={[
                        styles.heroCard,
                        isCompact && styles.heroCardCompact,
                        { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
                    ]}>
                        <View style={[styles.heroGradient, isCompact && styles.heroGradientCompact]}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarTextLarge}>{childName.charAt(0).toUpperCase()}</Text>
                            </View>
                            {/* Premium Badge - Prominent Position */}
                            <View style={styles.heroPremiumBadge}>
                                <Text style={styles.heroPremiumBadgeText}>
                                    {isPremium ? '👑 Premium' : subscriptionTier === 'standard' ? '⭐ Standard' : '🆓 Free'}
                                </Text>
                            </View>
                            <Text style={styles.heroName}>{childName}</Text>
                            <Text style={styles.heroAge}>{childAge} Aylık • Küçük Kaşif 🔍</Text>
                            <View style={styles.heroStats}>
                                <View style={styles.heroStatItem}>
                                    <Text style={styles.heroStatValue}>{scores.length}</Text>
                                    <Text style={styles.heroStatLabel}>Oyun</Text>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStatItem}>
                                    <Text style={styles.heroStatValue}>{getPerformanceEmoji()}</Text>
                                    <Text style={styles.heroStatLabel}>Seviye</Text>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStatItem}>
                                    <Text style={styles.heroStatValue}>{successRate}%</Text>
                                    <Text style={styles.heroStatLabel}>Başarı</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Tab Navigation - Simplified to 2 tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tabButton, activeTab === 'ozet' && styles.tabButtonActive]} onPress={() => setActiveTab('ozet')}>
                            <Ionicons name="home-outline" size={18} color={activeTab === 'ozet' ? '#fff' : COLORS.textLight} />
                            <Text style={[styles.tabText, activeTab === 'ozet' && styles.tabTextActive]}>Özet</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tabButton, activeTab === 'gecmis' && styles.tabButtonActive]} onPress={() => setActiveTab('gecmis')}>
                            <Ionicons name="folder-outline" size={18} color={activeTab === 'gecmis' ? '#fff' : COLORS.textLight} />
                            <Text style={[styles.tabText, activeTab === 'gecmis' && styles.tabTextActive]}>Arşiv</Text>
                        </TouchableOpacity>
                    </View>

                    {/* OZET TAB */}
                    {activeTab === 'ozet' && (
                        <Animated.View style={{ opacity: fadeAnim }}>
                            {/* ================== HAFTALIK GELİŞİM RAPORU (Headline) ================== */}
                            <View style={styles.weeklyReportCard}>
                                <View style={styles.weeklyReportHeader}>
                                    <Text style={{ fontSize: 26, marginRight: 10 }}>🗂️</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.weeklyReportTitle}>Haftalık Gelişim Raporu</Text>
                                        <Text style={styles.weeklyReportRange}>{weekly.rangeLabel}</Text>
                                    </View>
                                </View>

                                {weekly.gamesCount === 0 && (
                                    <Text style={styles.weeklyEmptyText}>
                                        Bu hafta henüz oyun oynanmadı. Rapor, en son oynanan oyunlardan derlenmiş bir gelişim özeti sunar.
                                    </Text>
                                )}

                                {/* Özet istatistik kutucukları */}
                                <View style={styles.weeklyStatRow}>
                                    {[
                                        { e: '🎮', v: `${weekly.gamesCount}`, l: weekly.hasWeekData ? 'Oyun' : 'Son Oyun', c: COLORS.primary },
                                        { e: '📅', v: `${weekly.activeDays}/7`, l: 'Aktif Gün', c: COLORS.accent },
                                        { e: '⏱️', v: `${weekly.totalMinutes}dk`, l: 'Süre', c: COLORS.orange },
                                        { e: '⭐', v: `%${weekly.avgSuccess}`, l: 'Başarı', c: COLORS.secondary },
                                    ].map((t, i) => (
                                        <View key={i} style={styles.weeklyStatTile}>
                                            <Text style={{ fontSize: 20 }}>{t.e}</Text>
                                            <Text style={[styles.weeklyStatValue, { color: t.c }]}>{t.v}</Text>
                                            <Text style={styles.weeklyStatLabel}>{t.l}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Premium: çalışılan gelişim alanları (Maarif) */}
                                {isPremium && weekly.skillAreas.length > 0 && (
                                    <View style={{ marginTop: 14 }}>
                                        <Text style={styles.weeklySubTitle}>📚 Çalışılan Gelişim Alanları</Text>
                                        <View style={styles.skillChipWrap}>
                                            {weekly.skillAreas.slice(0, 6).map((a, i) => (
                                                <View key={i} style={styles.skillChip}>
                                                    <Text style={styles.skillChipText}>{a.area}</Text>
                                                    <View style={styles.skillChipCount}>
                                                        <Text style={styles.skillChipCountText}>{a.count}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Ücretsiz: kilitli premium ipucu */}
                                {!isPremium && (
                                    <View style={styles.weeklyLockBox}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                            <Ionicons name="lock-closed" size={15} color="#A07D2F" />
                                            <Text style={styles.weeklyLockTitle}>Premium raporda ayrıca</Text>
                                        </View>
                                        <Text style={styles.weeklyLockText}>
                                            Maarif kazanım analizi · gelişim profili · en çok oynanan oyunlar · güçlü yönler · eve özel etkinlik önerileri · uzman notu
                                        </Text>
                                    </View>
                                )}

                                {/* PDF / Yazdır butonu — herkese açık */}
                                <TouchableOpacity
                                    style={styles.weeklyDownloadBtn}
                                    onPress={handleDownloadPDF}
                                    disabled={generatingPDF}
                                    activeOpacity={0.85}
                                >
                                    {generatingPDF ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="document-text" size={20} color="#fff" />
                                            <Text style={styles.weeklyDownloadBtnText}>
                                                {isPremium ? 'Detaylı Raporu İndir (PDF)' : 'Özet Raporu İndir (PDF)'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                {Platform.OS === 'web' && (
                                    <Text style={styles.weeklyHint}>
                                        Açılan pencerede “Hedef → PDF olarak kaydet” seçerek cihazınıza indirebilirsiniz.
                                    </Text>
                                )}
                            </View>

                            {/* Best Achievement Badge */}
                            <View style={styles.achievementCard}>
                                <Text style={styles.achievementEmoji}>{bestAchievement.emoji}</Text>
                                <Text style={styles.achievementTitle}>{bestAchievement.title}</Text>
                                <Text style={styles.achievementDescription}>{bestAchievement.description}</Text>
                                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                    <Text style={styles.achievementEmoji}>{CHARACTERS.pitir}</Text>
                                    <Text style={styles.achievementEmoji}>{CHARACTERS.filo}</Text>
                                    <Text style={styles.achievementEmoji}>{CHARACTERS.mavis}</Text>
                                </View>
                            </View>

                            {/* Metrics Grid */}
                            <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>🎯 Performans Metrikleri</Text>
                            <View style={[styles.metricsGrid, isTablet && styles.metricsGridTablet, isCompact && styles.metricsGridCompact]}>
                                <MetricCard
                                    emoji="✅"
                                    title="Doğru Cevaplar"
                                    value={`${avgCorrectAnswers}/10`}
                                    subtitle="Genel Ort."
                                    color={COLORS.accent}
                                    delay={100}
                                />
                                <MetricCard
                                    emoji="⚡"
                                    title="Bilişsel Hız"
                                    value={recalculatedCognitiveSpeed > 0 ? recalculatedCognitiveSpeed : 'Analiz Ediliyor...'}
                                    subtitle="Puan"
                                    color={COLORS.secondary}
                                    delay={200}
                                />
                                <MetricCard
                                    emoji="⏱️"
                                    title="Tepki Süresi"
                                    value={formatTime(avgResponseTime)}
                                    subtitle="Ortalama"
                                    color={COLORS.orange}
                                    delay={400}
                                />
                            </View>

                            {/* GAME DISTRIBUTION CHART */}
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionTitle}>🎮 Oyun Dağılımı</Text>
                                <View style={styles.chartCard}>
                                    {(() => {
                                        const gameTypes = scores.reduce((acc: Record<string, number>, s) => {
                                            const type = s.oyun_turu || 'diger';
                                            acc[type] = (acc[type] || 0) + 1;
                                            return acc;
                                        }, {});
                                        const total = scores.length || 1;
                                        const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.orange, COLORS.pink];

                                        return Object.entries(gameTypes).slice(0, 5).map(([type, count], index) => {
                                            const percent = Math.round((count / total) * 100);
                                            const normalizedType = normalizeGameName(type);
                                            const info = gameLabels[normalizedType] || { emoji: '🎮', name: type };

                                            return (
                                                <View key={type} style={styles.distributionRow}>
                                                    <View style={styles.distributionLabel}>
                                                        <Text style={styles.distributionEmoji}>{info.emoji}</Text>
                                                        <Text style={styles.distributionName}>{info.name}</Text>
                                                    </View>
                                                    <View style={styles.distributionBarContainer}>
                                                        <View style={[styles.distributionBar, { width: `${percent}%`, backgroundColor: colors[index] }]} />
                                                    </View>
                                                    <Text style={styles.distributionPercent}>{percent}%</Text>
                                                </View>
                                            );
                                        });
                                    })()}
                                </View>
                            </View>

                            {/* WEEKLY ACTIVITY CHART */}
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionTitle}>📅 Son 7 Gün Aktivite</Text>
                                <View style={styles.chartCard}>
                                    <View style={styles.weeklyChart}>
                                        {(() => {
                                            const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
                                            const today = new Date();
                                            const last7Days = Array.from({ length: 7 }, (_, i) => {
                                                const d = new Date(today);
                                                d.setDate(d.getDate() - (6 - i));
                                                return d;
                                            });

                                            return last7Days.map((date, index) => {
                                                const dayScores = scores.filter(s => {
                                                    const scoreDate = new Date(s.created_at);
                                                    return scoreDate.toDateString() === date.toDateString();
                                                });
                                                const count = dayScores.length;
                                                const maxHeight = 60;
                                                const height = Math.min(count * 15, maxHeight);
                                                const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];

                                                return (
                                                    <View key={index} style={styles.weeklyDayContainer}>
                                                        <View style={styles.weeklyBarOuter}>
                                                            <View style={[styles.weeklyBar, { height, backgroundColor: count > 0 ? COLORS.primary : '#E0E0E0' }]}>
                                                                {count > 0 && <Text style={styles.weeklyBarCount}>{count}</Text>}
                                                            </View>
                                                        </View>
                                                        <Text style={styles.weeklyDayLabel}>{dayName}</Text>
                                                    </View>
                                                );
                                            });
                                        })()}
                                    </View>
                                    <Text style={styles.chartHint}>Son 7 gündeki oyun aktivitesi</Text>
                                </View>
                            </View>

                            {/* VISUAL ATTENTION TREND CHART */}
                            {visualAttentionGameScores.length >= 2 && (
                                <View style={[styles.chartCard, { marginBottom: 20 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                                        <Text style={{ fontSize: 20, marginRight: 10 }}>👁️</Text>
                                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Görsel Dikkat Trendi</Text>
                                    </View>

                                    {(() => {
                                        const chartData = [...visualAttentionGameScores].reverse().slice(-10); // Last 10 games chronological
                                        const scores = chartData.map(d => d.visual_attention_score || 0);
                                        const chartHeight = 150;
                                        const screenWidth = Dimensions.get('window').width;
                                        const chartWidth = Math.min(screenWidth - 80, 500); // Max width for web
                                        const maxScore = 100;

                                        const points = scores.map((score, index) => {
                                            const x = (index / (scores.length - 1)) * chartWidth;
                                            const y = chartHeight - (score / maxScore) * chartHeight;
                                            return `${x},${y}`;
                                        }).join(' ');

                                        return (
                                            <View style={{ alignItems: 'center' }}>
                                                <Svg height={chartHeight + 10} width={chartWidth + 10} style={{ overflow: 'visible' }}>
                                                    {/* Background Lines */}
                                                    {[0, 25, 50, 75, 100].map(val => (
                                                        <Line
                                                            key={val}
                                                            x1="0"
                                                            y1={chartHeight - (val / 100) * chartHeight}
                                                            x2={chartWidth}
                                                            y2={chartHeight - (val / 100) * chartHeight}
                                                            stroke="#f0f0f0"
                                                            strokeWidth="1"
                                                        />
                                                    ))}

                                                    {/* Trend Line - GREEN */}
                                                    <Polyline
                                                        points={points}
                                                        fill="none"
                                                        stroke="#4CAF50"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />

                                                    {/* Points */}
                                                    {scores.map((score, index) => {
                                                        const x = (index / (scores.length - 1)) * chartWidth;
                                                        const y = chartHeight - (score / maxScore) * chartHeight;
                                                        return (
                                                            <Circle
                                                                key={index}
                                                                cx={x}
                                                                cy={y}
                                                                r="4"
                                                                fill="#FFF"
                                                                stroke="#4CAF50"
                                                                strokeWidth="2"
                                                            />
                                                        );
                                                    })}
                                                </Svg>

                                                {/* Labels */}
                                                <View style={{ width: chartWidth, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                                    <Text style={{ fontSize: 10, color: '#999' }}>
                                                        {new Date(chartData[0].created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                    </Text>
                                                    <Text style={{ fontSize: 10, color: '#999' }}>
                                                        {new Date(chartData[chartData.length - 1].created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}
                            {/* CUMULATIVE AI ANALYSIS - Main Feature (Premium/Standard only) */}
                            <View style={[styles.chartCard, { marginBottom: 20, borderWidth: 2, borderColor: subscriptionTier === 'free' ? '#E0E0E0' : COLORS.premium }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={{ fontSize: 24, marginRight: 10 }}>🧠</Text>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Kümülatif AI Analizi</Text>
                                    {subscriptionTier === 'free' && (
                                        <View style={{ marginLeft: 8, backgroundColor: '#FFE082', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                            <Text style={{ fontSize: 10, color: '#F57C00', fontWeight: 'bold' }}>PREMIUM</Text>
                                        </View>
                                    )}
                                </View>

                                {subscriptionTier === 'free' ? (
                                    /* FREE TIER - Show locked message */
                                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
                                        <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                                            AI Gelişim Analizi Premium Özelliğidir
                                        </Text>
                                        <Text style={{ color: COLORS.textLight, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
                                            Gemini AI ile çocuğunuzun tüm oyun verilerinin kümülatif analizini alın,
                                            gelişim trendlerini görün ve kişiselleştirilmiş öneriler alın.
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.analyzeButton, { backgroundColor: COLORS.premium }]}
                                            onPress={() => Alert.alert('🚀 Premium\'a Yükselt', 'Premium üyelik ile AI analizi ve PDF rapor özelliklerine erişin!')}
                                        >
                                            <Ionicons name="diamond" size={18} color="#fff" />
                                            <Text style={styles.analyzeButtonText}>Premium'a Yükselt</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    /* PREMIUM/STANDARD TIER - Show AI analysis */
                                    <>
                                        <Text style={{ color: COLORS.textLight, fontSize: 13, marginBottom: 12 }}>
                                            Tüm oyun verileri Gemini AI tarafından analiz edilir.
                                        </Text>

                                        {cumulativeReport ? (
                                            <View>
                                                <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 22 }}>
                                                    {cumulativeReport}
                                                </Text>
                                                <Text style={{ color: COLORS.textLight, fontSize: 11, marginTop: 10, fontStyle: 'italic' }}>
                                                    ℹ️ Yeni oyun oynanırsa analiz otomatik güncellenir.
                                                </Text>
                                                {Platform.OS === 'web' && (
                                                    <TouchableOpacity
                                                        style={[styles.analyzeButton, { backgroundColor: COLORS.primary, marginTop: 10 }]}
                                                        onPress={handleDownloadPDF}
                                                    >
                                                        <Ionicons name="document-text" size={16} color="#fff" />
                                                        <Text style={styles.analyzeButtonText}>PDF İndir</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.analyzeButton, { backgroundColor: COLORS.premium }]}
                                                onPress={handleGenerateCumulativeReport}
                                                disabled={isAnalyzing || scores.length === 0}
                                            >
                                                {isAnalyzing ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="sparkles" size={18} color="#fff" />
                                                        <Text style={styles.analyzeButtonText}>
                                                            {scores.length === 0 ? 'Veri Bekleniyor...' : 'AI Analiz Yap'}
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                        <Text style={{ color: '#888', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                            Gemini 2.0 Flash
                                        </Text>
                                    </>
                                )}
                            </View>

                            {/* ================== GELİŞİM RADAR CHART ================== */}
                            {scores.length >= 3 && (
                                <View style={styles.chartCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                                        <Text style={{ fontSize: 22, marginRight: 10 }}>🎯</Text>
                                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Gelişim Radar Grafiği</Text>
                                    </View>

                                    {(() => {
                                        // ReportEngine'den radar verisi al
                                        const report = ReportEngine.generateParentReport(childName, scores as any);
                                        const radarData = report.radarChartData;

                                        if (radarData.length === 0) return null;

                                        const size = 180;
                                        const center = size / 2;
                                        const radius = 70;
                                        const levels = 4;

                                        // Her kategori için açı hesapla
                                        const angleStep = (2 * Math.PI) / radarData.length;

                                        // Veri noktalarını hesapla
                                        const dataPoints = radarData.map((point, i) => {
                                            const angle = i * angleStep - Math.PI / 2;
                                            const value = (point.value / 100) * radius;
                                            return {
                                                x: center + value * Math.cos(angle),
                                                y: center + value * Math.sin(angle),
                                                label: point.label,
                                                value: point.value,
                                            };
                                        });

                                        // Polygon noktaları
                                        const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

                                        return (
                                            <View style={{ alignItems: 'center' }}>
                                                <Svg height={size + 40} width={size + 60}>
                                                    {/* Arka plan çemberleri */}
                                                    {Array.from({ length: levels }, (_, i) => (
                                                        <Circle
                                                            key={i}
                                                            cx={center + 30}
                                                            cy={center + 20}
                                                            r={radius * ((i + 1) / levels)}
                                                            fill="none"
                                                            stroke="#E0E0E0"
                                                            strokeWidth="1"
                                                        />
                                                    ))}

                                                    {/* Eksen çizgileri */}
                                                    {radarData.map((_, i) => {
                                                        const angle = i * angleStep - Math.PI / 2;
                                                        const endX = center + 30 + radius * Math.cos(angle);
                                                        const endY = center + 20 + radius * Math.sin(angle);
                                                        return (
                                                            <Line
                                                                key={i}
                                                                x1={center + 30}
                                                                y1={center + 20}
                                                                x2={endX}
                                                                y2={endY}
                                                                stroke="#E0E0E0"
                                                                strokeWidth="1"
                                                            />
                                                        );
                                                    })}

                                                    {/* Veri alanı */}
                                                    <Polygon
                                                        points={dataPoints.map(p => `${p.x + 30},${p.y + 20}`).join(' ')}
                                                        fill="rgba(30, 136, 229, 0.3)"
                                                        stroke="#1E88E5"
                                                        strokeWidth="2"
                                                    />

                                                    {/* Veri noktaları */}
                                                    {dataPoints.map((point, i) => (
                                                        <Circle
                                                            key={i}
                                                            cx={point.x + 30}
                                                            cy={point.y + 20}
                                                            r="5"
                                                            fill="#1E88E5"
                                                            stroke="#FFF"
                                                            strokeWidth="2"
                                                        />
                                                    ))}
                                                </Svg>

                                                {/* Etiketler */}
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                                                    {radarData.map((point, i) => (
                                                        <View key={i} style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            marginHorizontal: 8,
                                                            marginVertical: 4,
                                                            backgroundColor: 'rgba(30, 136, 229, 0.1)',
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 4,
                                                            borderRadius: 12,
                                                        }}>
                                                            <View style={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: 5,
                                                                backgroundColor: '#1E88E5',
                                                                marginRight: 6
                                                            }} />
                                                            <Text style={{ fontSize: 11, color: COLORS.text }}>
                                                                {point.label}: {point.value}%
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}

                            {/* ================== EVDE NE YAPMALI? ================== */}
                            {scores.length >= 3 && (
                                <View style={[styles.chartCard, { borderLeftWidth: 4, borderLeftColor: COLORS.accent }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                                        <Text style={{ fontSize: 22, marginRight: 10 }}>🏠</Text>
                                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Evde Ne Yapmalı?</Text>
                                    </View>

                                    {(() => {
                                        const report = ReportEngine.generateParentReport(childName, scores as any);
                                        const activities = report.homeActivities;

                                        return (
                                            <View>
                                                {activities.map((activity, i) => (
                                                    <View key={i} style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'flex-start',
                                                        marginBottom: 16,
                                                        backgroundColor: 'rgba(102, 187, 106, 0.1)',
                                                        padding: 12,
                                                        borderRadius: 12,
                                                    }}>
                                                        <Text style={{ fontSize: 28, marginRight: 12 }}>{activity.emoji}</Text>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>
                                                                    {activity.title}
                                                                </Text>
                                                                <View style={{
                                                                    marginLeft: 8,
                                                                    backgroundColor: '#E8F5E9',
                                                                    paddingHorizontal: 6,
                                                                    paddingVertical: 2,
                                                                    borderRadius: 8
                                                                }}>
                                                                    <Text style={{ fontSize: 10, color: COLORS.accent, fontWeight: '600' }}>
                                                                        {activity.duration}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 18 }}>
                                                                {activity.description}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ))}

                                                {/* Özendirici mesaj */}
                                                <View style={{
                                                    backgroundColor: 'rgba(255, 179, 0, 0.15)',
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    marginTop: 8,
                                                }}>
                                                    <Text style={{ fontSize: 14, color: COLORS.text, textAlign: 'center', lineHeight: 20 }}>
                                                        {report.encouragingMessage}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}

                            {/* FREE TIER BANNER */}
                            {!isPremium && (
                                <View style={styles.freeBanner}>
                                    <View style={styles.freeBannerContent}>
                                        <Text style={styles.freeBannerEmoji}>🆓</Text>
                                        <View style={styles.freeBannerText}>
                                            <Text style={styles.freeBannerTitle}>Ücretsiz Plan</Text>
                                            <Text style={styles.freeBannerSubtitle}>Premium ile tüm özelliklere erişin!</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.freeBannerButton}>
                                        <Text style={styles.freeBannerButtonText}>Yükselt 🚀</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    )}

                    {/* GECMIS TAB */}
                    {activeTab === 'gecmis' && (
                        <Animated.View style={{ opacity: fadeAnim }}>

                            {/* Game History Timeline */}
                            {scores.length > 0 && (
                                <View style={styles.timelineSidebar}>
                                    <Text style={styles.timelineSidebarTitle}>📅 Oyun Geçmişi</Text>
                                    <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 12, paddingHorizontal: 4 }}>
                                        Detaylı analiz ve grafik filtrelemek için bir oyuna dokunun 👇
                                    </Text>
                                    {scores.slice(0, 50).map((score, index) => (
                                        <TimelineItem
                                            key={score.id}
                                            game={score}
                                            index={index}
                                            isSelected={selectedGameIndex === index}
                                        />
                                    ))}
                                </View>
                            )}

                            {/* AI Report Section */}
                            <View style={styles.aiSection}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        🤖 AI Analiz Raporu
                                    </Text>
                                    {selectedGameIndex !== null && scores[selectedGameIndex] && (
                                        <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 }}>
                                            <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>
                                                {gameLabels[normalizeGameName(scores[selectedGameIndex].oyun_turu)]?.name || 'Seçili Oyun'}
                                            </Text>
                                        </View>
                                    )}
                                    {!isPremium && (
                                        <View style={styles.lockIcon}>
                                            <Ionicons name="lock-closed" size={16} color="#fff" />
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
                                    onPress={() => isPremium && selectedGameAIComment && setAiReportExpanded(!aiReportExpanded)}
                                    activeOpacity={isPremium && selectedGameAIComment ? 0.7 : 1}
                                >
                                    {selectedGameAIComment ? (
                                        <>
                                            <Text style={styles.aiText}>
                                                {aiReportExpanded ? selectedGameAIComment : selectedGameAIComment.substring(0, 300) + (selectedGameAIComment.length > 300 ? '...' : '')}
                                            </Text>
                                            {isPremium && selectedGameAIComment.length > 300 && (
                                                <View style={styles.aiExpandButton}>
                                                    <Ionicons
                                                        name={aiReportExpanded ? "chevron-up" : "chevron-down"}
                                                        size={20}
                                                        color={COLORS.primary}
                                                    />
                                                    <Text style={styles.aiExpandText}>
                                                        {aiReportExpanded ? 'Küçült' : 'Tamamını Göster'}
                                                    </Text>
                                                </View>
                                            )}
                                        </>
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={styles.aiPlaceholder}>
                                                {selectedGameIndex !== null
                                                    ? 'Bu oyun için henüz AI analizi bulunmuyor veya analiz devam ediyor.'
                                                    : 'Lütfen analizini görmek istediğiniz oyunu yukarıdaki listeden seçin.'}
                                            </Text>
                                            {isPremium && selectedGameIndex !== null && !scores[selectedGameIndex]?.yapay_zeka_yorumu && (
                                                <TouchableOpacity
                                                    style={styles.analyzeButton}
                                                    onPress={() => {
                                                        Alert.alert('Analiz', 'Talep alındı! AI asistanımız bu oyun için analiz hazırlıyor.');
                                                    }}
                                                >
                                                    <Ionicons name="sparkles" size={16} color="#fff" />
                                                    <Text style={styles.analyzeButtonText}>Şimdi Analiz Et</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* GAME HISTORY TABLE */}
                            <View style={styles.historySection}>
                                <Text style={styles.sectionTitle}>📋 Detaylı Liste</Text>
                                <View style={styles.historyCard}>
                                    {/* Header Row */}
                                    <View style={styles.historyHeader}>
                                        <Text style={[styles.historyHeaderText, { flex: 2 }]}>Oyun</Text>
                                        <Text style={[styles.historyHeaderText, { flex: 1 }]}>Tarih</Text>
                                        <Text style={[styles.historyHeaderText, { flex: 1 }]}>Skor</Text>
                                        <Text style={[styles.historyHeaderText, { flex: 1 }]}>Süre</Text>
                                    </View>
                                    {/* Game Rows */}
                                    {scores.slice(0, 20).map((score, index) => {
                                        const date = new Date(score.created_at);
                                        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
                                        const info = gameLabels[normalizeGameName(score.oyun_turu)] || { emoji: '🎮', name: score.oyun_turu };

                                        const scoreEmoji = (score.correct_answers || 0) >= 8 ? '🌟' :
                                            (score.correct_answers || 0) >= 5 ? '⭐' : '💪';
                                        return (
                                            <View key={index} style={[styles.historyRow, index % 2 === 0 && styles.historyRowAlt]}>
                                                <Text
                                                    style={[styles.historyCell, { flex: 2 }]}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {info.name}
                                                </Text>
                                                <Text style={[styles.historyCell, { flex: 1 }]}>{formattedDate}</Text>
                                                <Text style={[styles.historyCell, { flex: 1 }]}>
                                                    {score.correct_answers !== null ? `${score.correct_answers}/10 ${scoreEmoji}` : `${10 - (score.hata_sayisi || 0)}/10`}
                                                </Text>
                                                <Text style={[styles.historyCell, { flex: 1 }]}>{score.sure || Math.round((score.response_time || 0) / 1000)}s</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </Animated.View>
                    )}


                    {/* PDF DOWNLOAD CARD - Haftalık Gelişim Raporu (herkese açık) */}
                    <View style={styles.pdfSection}>
                        <TouchableOpacity
                            style={styles.pdfCard}
                            onPress={handleDownloadPDF}
                            disabled={generatingPDF}
                        >
                            <View style={styles.pdfCardGradient}>
                                {generatingPDF ? (
                                    <ActivityIndicator size="large" color="#fff" />
                                ) : (
                                    <>
                                        <View style={styles.pdfIconContainer}>
                                            <Ionicons name="document-text" size={32} color="#fff" />
                                        </View>
                                        <Text style={styles.pdfCardTitle}>
                                            📄 Haftalık Gelişim Raporu
                                        </Text>
                                        <Text style={styles.pdfCardSubtitle}>
                                            Çocuğunuzun bu haftaki gelişimini profesyonel bir raporla PDF olarak kaydedin veya yazdırın
                                        </Text>
                                        <View style={styles.pdfCardButton}>
                                            <Ionicons name="download" size={20} color={COLORS.primary} />
                                            <Text style={styles.pdfCardButtonText}>
                                                PDF İndir / Yazdır
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Share Image Button - Instagram Ready */}
                        {isPremium && Platform.OS === 'web' && (
                            <TouchableOpacity
                                style={styles.shareImageButton}
                                onPress={handleGenerateShareImage}
                            >
                                <View style={styles.shareImageGradient}>
                                    <Ionicons name="share-social" size={24} color="#fff" />
                                    <Text style={styles.shareImageText}>📸 Başarı Kartı Oluştur</Text>
                                    <Text style={styles.shareImageSubtext}>Instagram'da paylaş!</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerEmoji}>🎓</Text>
                        <Text style={styles.footerText}>ChildhoodTech Akademi</Text>
                        <Text style={styles.footerSubtext}>Çocuğunuzun gelişimini birlikte takip ediyoruz 💜</Text>
                    </View>
                </ScrollView>
            </Animated.View >
        </DynamicBackground >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 60,
    },
    scrollContentCompact: {
        padding: 12,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingEmoji: {
        fontSize: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textLight,
        fontWeight: '500',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingVertical: 8,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            default: { elevation: 4 },
        }),
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    tierBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tierBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

    // Hero Card
    heroCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        ...Platform.select({
            web: { boxShadow: '0 8px 32px rgba(30, 136, 229, 0.2)' },
            default: { elevation: 8 },
        }),
    },
    heroCardCompact: {
        marginBottom: 16,
        borderRadius: 20,
    },
    heroGradient: {
        backgroundColor: COLORS.primary,
        padding: 28,
        alignItems: 'center',
        ...Platform.select({
            web: { background: `linear-gradient(135deg, ${COLORS.gradient1} 0%, ${COLORS.gradient2} 100%)` } as any,
            default: {},
        }),
    },
    heroGradientCompact: {
        padding: 16,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarTextLarge: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    heroPremiumBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    heroPremiumBadgeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    heroName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
    },
    heroAge: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
    },
    heroStats: {
        flexDirection: 'row',
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 16,
    },
    heroStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    heroStatValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    heroStatLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    heroStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 16,
    },

    // Section Title
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 14,
        marginTop: 8,
    },
    sectionTitleCompact: {
        fontSize: 15,
        marginBottom: 10,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    // Metrics Grid
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    metricsGridCompact: {
        gap: 8,
        marginBottom: 16,
    },
    metricsGridTablet: {
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '47%',
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderTopWidth: 4,
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
            default: { elevation: 4 },
        }),
    },
    metricEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    metricTitle: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    metricValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    metricSubtitle: {
        fontSize: 11,
        color: COLORS.textLight,
    },

    // Progress Section
    progressSection: {
        marginBottom: 24,
    },
    progressCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
            default: { elevation: 4 },
        }),
    },
    progressRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    progressRingFill: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 8,
        borderColor: COLORS.accent,
    },
    progressRingInner: {
        alignItems: 'center',
    },
    progressRingValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    progressRingLabel: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    progressInfo: {
        flex: 1,
    },
    progressInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressInfoEmoji: {
        fontSize: 20,
        marginRight: 10,
    },
    progressInfoText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },

    // Timeline Section
    timelineSection: {
        marginBottom: 24,
    },
    timelineCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
            default: { elevation: 4 },
        }),
    },
    timelineChart: {
        flexDirection: 'row',
        height: 120,
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    timelineBarContainer: {
        alignItems: 'center',
        flex: 1,
    },
    timelineBar: {
        width: 28,
        borderRadius: 8,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 4,
        minHeight: 20,
    },
    timelineBarText: {
        fontSize: 9,
        color: '#fff',
        fontWeight: 'bold',
    },
    timelineBarLabel: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 6,
    },
    timelineHint: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 8,
    },

    // AI Section
    aiSection: {
        marginBottom: 24,
        position: 'relative',
        minHeight: 200,
    },
    lockIcon: {
        backgroundColor: COLORS.premium,
        borderRadius: 12,
        padding: 6,
    },
    aiCard: {
        backgroundColor: '#F3E5F5',
        borderRadius: 20,
        padding: 20,
        minHeight: 140,
    },
    aiCardBlurred: {
        ...Platform.select({
            web: { filter: 'blur(5px)' } as any,
            default: { opacity: 0.25 },
        }),
    },
    aiText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 22,
    },
    aiPlaceholder: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 30,
    },
    aiExpandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    aiExpandText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        marginLeft: 6,
    },
    premiumOverlay: {
        position: 'absolute',
        top: 40,
        left: 10,
        right: 10,
        alignItems: 'center',
        zIndex: 10,
    },
    premiumBox: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        ...Platform.select({
            web: { boxShadow: '0 12px 40px rgba(156, 39, 176, 0.25)' },
            default: { elevation: 10 },
        }),
    },
    premiumEmoji: {
        fontSize: 40,
    },
    premiumTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.premium,
        marginTop: 10,
    },
    premiumText: {
        fontSize: 13,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    premiumButton: {
        backgroundColor: COLORS.premium,
        paddingVertical: 14,
        paddingHorizontal: 36,
        borderRadius: 28,
        marginTop: 16,
    },
    premiumButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },

    // Footer
    footer: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 20,
    },
    footerEmoji: {
        fontSize: 32,
    },
    footerText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: 8,
    },
    footerSubtext: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 4,
    },

    // Free Banner
    freeBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#FFB74D',
        borderStyle: 'dashed',
    },
    freeBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    freeBannerEmoji: {
        fontSize: 32,
        marginRight: 12,
    },
    freeBannerText: {
        flex: 1,
    },
    freeBannerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#E65100',
    },
    freeBannerSubtitle: {
        fontSize: 12,
        color: '#F57C00',
        marginTop: 2,
    },
    freeBannerButton: {
        backgroundColor: '#FF9800',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    freeBannerButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },

    // History Section
    historySection: {
        marginBottom: 24,
    },
    historyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
            default: { elevation: 4 },
        }),
    },
    historyHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    historyHeaderText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    historyRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    historyRowAlt: {
        backgroundColor: '#FAFAFA',
    },
    historyCell: {
        fontSize: 13,
        color: COLORS.text,
    },
    historyEmpty: {
        padding: 40,
        alignItems: 'center',
    },
    historyEmptyText: {
        fontSize: 14,
        color: COLORS.textLight,
    },

    // Chart Sections
    chartSection: {
        marginBottom: 24,
    },
    chartCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
            default: { elevation: 4 },
        }),
    },
    chartHint: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 12,
    },

    // Line Chart
    lineChartContainer: {
        flexDirection: 'row',
        height: 120,
    },
    lineChartYAxis: {
        width: 25,
        justifyContent: 'space-between',
        paddingRight: 8,
    },
    lineChartYLabel: {
        fontSize: 10,
        color: COLORS.textLight,
    },
    lineChartArea: {
        flex: 1,
        position: 'relative',
    },
    lineChartGridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    lineChartPoints: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
    },
    lineChartPointContainer: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        position: 'relative',
    },
    lineChartPoint: {
        width: 14,
        height: 14,
        borderRadius: 7,
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#fff',
    },
    lineChartPointLabel: {
        position: 'absolute',
        bottom: -18,
        fontSize: 10,
        color: COLORS.textLight,
    },

    // Distribution Chart
    distributionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    distributionLabel: {
        width: 100,
        flexDirection: 'row',
        alignItems: 'center',
    },
    distributionEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    distributionName: {
        fontSize: 11,
        color: COLORS.text,
    },
    distributionBarContainer: {
        flex: 1,
        height: 16,
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        marginHorizontal: 10,
        overflow: 'hidden',
    },
    distributionBar: {
        height: '100%',
        borderRadius: 8,
    },
    distributionPercent: {
        width: 35,
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'right',
    },

    // Weekly Activity Chart
    weeklyChart: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 100,
    },
    weeklyDayContainer: {
        alignItems: 'center',
        flex: 1,
    },
    weeklyBarOuter: {
        height: 70,
        justifyContent: 'flex-end',
    },
    weeklyBar: {
        width: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 8,
    },
    weeklyBarCount: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    weeklyDayLabel: {
        marginTop: 6,
        fontSize: 11,
        color: COLORS.textLight,
        fontWeight: '500',
    },

    // PDF Button
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.premium,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        gap: 4,
    },
    pdfButtonDisabled: {
        backgroundColor: COLORS.textLight,
    },
    pdfButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    tierBadgeContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },

    // PDF Download Card
    pdfSection: {
        marginBottom: 24,
    },
    pdfCard: {
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 8px 24px rgba(156, 39, 176, 0.25)' },
            default: { elevation: 8 },
        }),
    },
    pdfCardLocked: {
        opacity: 0.85,
    },
    pdfCardGradient: {
        backgroundColor: COLORS.premium,
        padding: 28,
        alignItems: 'center',
        ...Platform.select({
            web: { background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` } as any,
            default: {},
        }),
    },
    pdfIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    pdfCardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    pdfCardSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    pdfCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 28,
        gap: 8,
    },
    pdfCardButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
    },

    // Chart styles
    chartContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    chartArea: {
        position: 'relative',
        backgroundColor: COLORS.backgroundAlt,
        borderRadius: 12,
        overflow: 'hidden',
    },
    chartGridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    chartLine: {
        position: 'absolute',
        height: 3,
        borderRadius: 2,
        transformOrigin: 'left center',
    },
    chartPoint: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartPointValue: {
        fontSize: 8,
        color: '#fff',
        fontWeight: 'bold',
    },
    chartXAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 8,
    },
    chartXLabel: {
        fontSize: 10,
        color: COLORS.textLight,
    },
    chartEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 16,
    },
    chartEmptyEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    chartEmptyText: {
        fontSize: 14,
        color: COLORS.textLight,
    },

    // Timeline styles
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    timelineItemSelected: {
        backgroundColor: COLORS.backgroundAlt,
        borderLeftColor: COLORS.accent,
        borderLeftWidth: 4,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginRight: 12,
    },
    timelineContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineEmoji: {
        fontSize: 20,
        marginRight: 10,
    },
    timelineInfo: {
        flex: 1,
    },
    timelineGameName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    timelineDate: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 2,
    },
    timelineAIBadge: {
        backgroundColor: COLORS.premium,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    timelineAIBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },

    // Timeline sidebar
    timelineSidebar: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
    },
    timelineSidebarTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
    },

    // Achievement badge
    achievementCard: {
        backgroundColor: COLORS.secondary,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(255,179,0,0.3)' },
            default: { elevation: 4 },
        }),
    },
    achievementEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    achievementTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    achievementDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginTop: 4,
    },

    // Share Image Button Styles
    shareImageButton: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 16,
    },
    shareImageGradient: {
        backgroundColor: '#E91E63',
        padding: 20,
        alignItems: 'center',
        borderRadius: 20,
    },
    shareImageText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 8,
    },
    shareImageSubtext: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },

    // Analyze Button Styles
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 12,
    },
    analyzeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 4,
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
            default: { elevation: 2 },
        }),
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6
    },
    tabButtonActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#ffffff',
    },

    // ================== Haftalık Gelişim Raporu Kartı ==================
    weeklyReportCard: {
        backgroundColor: COLORS.card,
        borderRadius: 22,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(102,126,234,0.18)',
        borderTopWidth: 5,
        borderTopColor: COLORS.gradient1,
        ...Platform.select({
            web: { boxShadow: '0 6px 22px rgba(102,126,234,0.14)' },
            default: { elevation: 5 },
        }),
    },
    weeklyReportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    weeklyReportTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    weeklyReportRange: {
        fontSize: 12.5,
        color: COLORS.textLight,
        marginTop: 2,
        fontWeight: '600',
    },
    weeklyEmptyText: {
        fontSize: 12.5,
        color: '#8D5A00',
        backgroundColor: '#FFF3E0',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        lineHeight: 18,
    },
    weeklyStatRow: {
        flexDirection: 'row',
        gap: 8,
    },
    weeklyStatTile: {
        flex: 1,
        backgroundColor: '#F7F8FC',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ECEFF1',
    },
    weeklyStatValue: {
        fontSize: 19,
        fontWeight: '800',
        marginTop: 3,
    },
    weeklyStatLabel: {
        fontSize: 10.5,
        color: COLORS.textLight,
        marginTop: 2,
        fontWeight: '600',
    },
    weeklySubTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    skillChipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    skillChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30,136,229,0.10)',
        borderRadius: 20,
        paddingLeft: 12,
        paddingRight: 5,
        paddingVertical: 5,
    },
    skillChipText: {
        fontSize: 12.5,
        color: COLORS.primary,
        fontWeight: '700',
        marginRight: 6,
    },
    skillChipCount: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    skillChipCountText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '800',
    },
    weeklyDownloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.gradient2,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 16,
        ...Platform.select({
            web: { background: `linear-gradient(135deg, ${COLORS.gradient1} 0%, ${COLORS.gradient2} 100%)` } as any,
            default: {},
        }),
    },
    weeklyDownloadBtnText: {
        color: '#fff',
        fontSize: 15.5,
        fontWeight: '800',
    },
    weeklyHint: {
        fontSize: 11,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 15,
    },
    weeklyLockBox: {
        marginTop: 14,
        backgroundColor: '#FBF6E8',
        borderWidth: 1,
        borderColor: '#E6D9B8',
        borderRadius: 12,
        padding: 12,
    },
    weeklyLockTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#8A6D2F',
        marginLeft: 6,
    },
    weeklyLockText: {
        fontSize: 12,
        color: '#8A6D2F',
        lineHeight: 18,
    },
});
