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
import DynamicBackground from './DynamicBackground';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

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
    hata_sayisi: number;
    sure: number;
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

export default function VeliDashboard({ childName, childAge, email, subscriptionTier: initialTier, onClose }: VeliDashboardProps) {
    const { width, height } = Dimensions.get('window');
    const isTablet = width >= 768;
    const isLandscape = width > height;
    const isCompact = isLandscape && height < 500;

    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<GameScore[]>([]);
    const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'standard' | 'premium'>(initialTier || 'free');
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [aiReportExpanded, setAiReportExpanded] = useState(false);
    const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null);
    const [showTimeline, setShowTimeline] = useState(true);

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

    // Get all AI comments
    const allAIComments = scores.filter(s => s.yapay_zeka_yorumu).map(s => ({
        oyun: s.oyun_turu,
        tarih: s.created_at,
        yorum: s.yapay_zeka_yorumu
    }));
    const latestAIComment = scores.find(s => s.yapay_zeka_yorumu)?.yapay_zeka_yorumu || null;
    const isPremium = subscriptionTier === 'premium';
    const successRate = avgCorrectAnswers * 10;

    // Selected game's AI comment for timeline
    const selectedGameAIComment = selectedGameIndex !== null && scores[selectedGameIndex]?.yapay_zeka_yorumu
        ? scores[selectedGameIndex].yapay_zeka_yorumu
        : latestAIComment;

    // Time series data for charts (reverse to show oldest first)
    const getTimeSeriesData = (field: 'cognitive_speed_score' | 'correct_answers') => {
        return [...scores]
            .reverse()
            .map((s, idx) => ({
                index: idx,
                value: s[field] || 0,
                date: new Date(s.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                hasData: (s[field] || 0) > 0
            }))
            .filter(d => d.hasData); // Filter out zero values
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

    // PDF Generation Function - Uses CDN to avoid Metro bundler issues
    const handleDownloadPDF = async () => {
        if (!isPremium) {
            Alert.alert(
                '🔒 Premium Özellik',
                'Tam rapor çıktısı almak için paketinizi yükseltin!',
                [
                    { text: 'Tamam', style: 'cancel' },
                    { text: 'Premium\'a Geç', onPress: () => { /* Navigate to upgrade */ } }
                ]
            );
            return;
        }

        if (Platform.OS !== 'web') {
            Alert.alert('Bilgi', 'PDF indirme şu an sadece web versiyonunda desteklenmektedir.');
            return;
        }

        setGeneratingPDF(true);
        try {
            // Load jsPDF from CDN at runtime (avoids Metro bundler issues)
            const loadJsPDF = (): Promise<any> => {
                return new Promise((resolve, reject) => {
                    if ((window as any).jspdf) {
                        resolve((window as any).jspdf.jsPDF);
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.onload = () => resolve((window as any).jspdf.jsPDF);
                    script.onerror = () => reject(new Error('jsPDF yüklenemedi'));
                    document.head.appendChild(script);
                });
            };

            const jsPDF = await loadJsPDF();
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 20;
            let yPos = margin;

            // Header
            doc.setFillColor(30, 136, 229);
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('childhoodtech.com', pageWidth / 2, 15, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Akademik Gelisim Raporu', pageWidth / 2, 25, { align: 'center' });

            const today = new Date();
            const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
            doc.setFontSize(10);
            doc.text(dateStr, pageWidth / 2, 35, { align: 'center' });

            yPos = 55;

            // Child Info
            doc.setTextColor(38, 50, 56);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`Ogrenci: ${childName}`, margin, yPos);
            yPos += 8;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Yas: ${childAge} aylik`, margin, yPos);
            yPos += 15;

            // Performance Summary
            doc.setFillColor(232, 245, 233);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(46, 125, 50);
            doc.text('Performans Ozeti', margin + 5, yPos + 10);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(38, 50, 56);
            doc.text(`Dogru Cevap Ortalamasi: ${avgCorrectAnswers}/10`, margin + 5, yPos + 20);
            doc.text(`Bilissel Hiz Skoru: ${avgCognitiveSpeed}`, margin + 5, yPos + 28);
            doc.text(`Ortalama Tepki Suresi: ${avgResponseTime}ms`, margin + 100, yPos + 20);
            doc.text(`Mesafe Etkisi: ${avgDistanceEffect}`, margin + 100, yPos + 28);

            yPos += 45;

            // Pedagojik Rapor
            doc.setFillColor(243, 229, 245);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 15, 3, 3, 'F');
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(123, 31, 162);
            doc.text('Pedagojik Rapor (AI Analizi)', margin + 5, yPos + 10);
            yPos += 20;

            if (latestAIComment) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(38, 50, 56);

                // Clean Turkish characters for basic PDF font
                const cleanText = latestAIComment
                    .replace(/ş/g, 's').replace(/Ş/g, 'S')
                    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
                    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
                    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
                    .replace(/ı/g, 'i').replace(/İ/g, 'I')
                    .replace(/ç/g, 'c').replace(/Ç/g, 'C');

                const lines = doc.splitTextToSize(cleanText, pageWidth - 2 * margin - 5);
                lines.forEach((line: string) => {
                    if (yPos > pageHeight - 40) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(line, margin + 2, yPos);
                    yPos += 6;
                });
            } else {
                doc.setFontSize(11);
                doc.setTextColor(96, 125, 139);
                doc.text('Henuz bir AI analizi bulunmamaktadir.', margin + 5, yPos);
                yPos += 10;
            }

            // Footer
            yPos = pageHeight - 25;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 8;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 144, 156);
            doc.text('Bu rapor Turkiye Yuzyili Maarif Modeli kriterlerine gore hazirlanmistir.', pageWidth / 2, yPos, { align: 'center' });
            yPos += 6;
            doc.text('childhoodtech.com - Erken Cocukluk Egitim Teknolojileri', pageWidth / 2, yPos, { align: 'center' });

            // Download
            doc.save(`${childName}_Akademik_Rapor_${dateStr.replace(/\//g, '-')}.pdf`);

        } catch (error) {
            console.error('PDF olusturma hatasi:', error);
            Alert.alert('Hata', 'PDF olusturulurken bir hata olustu.');
        } finally {
            setGeneratingPDF(false);
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
        const gameLabels: Record<string, { emoji: string, name: string }> = {
            'miktar-avcisi': { emoji: '🎯', name: 'Miktar Avcısı' },
            'golge-dedektifi': { emoji: '🔍', name: 'Gölge Dedektifi' },
            'diziyi-tamamla': { emoji: '🔢', name: 'Diziyi Tamamla' },
            'rakam-yazma': { emoji: '✏️', name: 'Rakam Yazma' },
            'yapboz': { emoji: '🧩', name: 'Yapboz' },
        };

        const gameInfo = gameLabels[game.oyun_turu] || { emoji: '🎮', name: game.oyun_turu };
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

                    {/* Game History Timeline */}
                    {scores.length > 0 && (
                        <View style={styles.timelineSidebar}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                onPress={() => setShowTimeline(!showTimeline)}
                            >
                                <Text style={styles.timelineSidebarTitle}>📅 Oyun Geçmişi ({scores.length})</Text>
                                <Ionicons name={showTimeline ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textLight} />
                            </TouchableOpacity>
                            {showTimeline && scores.slice(0, 10).map((score, index) => (
                                <TimelineItem
                                    key={score.id}
                                    game={score}
                                    index={index}
                                    isSelected={selectedGameIndex === index}
                                />
                            ))}
                        </View>
                    )}

                    {/* Time Series Charts */}
                    <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>📈 Gelişim Grafikleri</Text>
                    <SimpleLineChart
                        data={getTimeSeriesData('correct_answers')}
                        color={COLORS.chartGreen}
                        label="🎯 Doğru Cevap Trendi"
                    />
                    <SimpleLineChart
                        data={getTimeSeriesData('cognitive_speed_score')}
                        color={COLORS.chartBlue}
                        label="⚡ Bilişsel Hız Trendi"
                    />

                    {/* Metrics Grid */}
                    <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>🎯 Performans Metrikleri</Text>
                    <View style={[styles.metricsGrid, isTablet && styles.metricsGridTablet, isCompact && styles.metricsGridCompact]}>
                        <MetricCard
                            emoji="✅"
                            title="Doğru Cevaplar"
                            value={`${avgCorrectAnswers}/10`}
                            subtitle="Miktar Avcısı"
                            color={COLORS.accent}
                            delay={100}
                        />
                        <MetricCard
                            emoji="⚡"
                            title="Bilişsel Hız"
                            value={avgCognitiveSpeed}
                            subtitle="Puan"
                            color={COLORS.secondary}
                            delay={200}
                        />
                        <MetricCard
                            emoji="🎯"
                            title="Mesafe Algısı"
                            value={avgDistanceEffect}
                            subtitle="Ort. Fark"
                            color={COLORS.primary}
                            delay={300}
                        />
                        <MetricCard
                            emoji="⏱️"
                            title="Tepki Süresi"
                            value={`${avgResponseTime}ms`}
                            subtitle="Ortalama"
                            color={COLORS.orange}
                            delay={400}
                        />
                    </View>

                    {/* Progress Ring Section */}
                    <View style={styles.progressSection}>
                        <Text style={styles.sectionTitle}>📈 Gelişim Durumu</Text>
                        <View style={styles.progressCard}>
                            <View style={styles.progressRing}>
                                <View style={[styles.progressRingFill, {
                                    borderColor: successRate >= 70 ? COLORS.accent : successRate >= 40 ? COLORS.secondary : COLORS.orange
                                }]} />
                                <View style={styles.progressRingInner}>
                                    <Text style={styles.progressRingValue}>{successRate}%</Text>
                                    <Text style={styles.progressRingLabel}>Başarı</Text>
                                </View>
                            </View>
                            <View style={styles.progressInfo}>
                                <View style={styles.progressInfoItem}>
                                    <Text style={styles.progressInfoEmoji}>🧠</Text>
                                    <Text style={styles.progressInfoText}>
                                        {successRate >= 70 ? 'Harika ilerleme!' : successRate >= 40 ? 'İyi gidiyorsun!' : 'Devam et!'}
                                    </Text>
                                </View>
                                <View style={styles.progressInfoItem}>
                                    <Text style={styles.progressInfoEmoji}>🎮</Text>
                                    <Text style={styles.progressInfoText}>{miktarAvcisiScores.length} oyun tamamlandı</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Response Time Timeline */}
                    <View style={styles.timelineSection}>
                        <Text style={styles.sectionTitle}>⏰ Tepki Süresi Grafiği</Text>
                        <View style={styles.timelineCard}>
                            <View style={styles.timelineChart}>
                                {miktarAvcisiScores.slice(0, 7).reverse().map((score, index) => {
                                    const rt = score.response_time || 0;
                                    const height = Math.min((rt / 5000) * 100, 100);
                                    const color = rt < 2000 ? COLORS.accent : rt < 3500 ? COLORS.secondary : COLORS.orange;
                                    return (
                                        <View key={index} style={styles.timelineBarContainer}>
                                            <View style={[styles.timelineBar, { height: `${height}%`, backgroundColor: color }]}>
                                                <Text style={styles.timelineBarText}>{Math.round(rt / 1000)}s</Text>
                                            </View>
                                            <Text style={styles.timelineBarLabel}>{index + 1}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <Text style={styles.timelineHint}>📊 Son 7 oyun - Hızlı tepki = Yeşil</Text>
                        </View>
                    </View>

                    {/* SCORE TREND CHART */}
                    <View style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>📈 Başarı Trendi</Text>
                        <View style={styles.chartCard}>
                            <View style={styles.lineChartContainer}>
                                {/* Y-axis labels */}
                                <View style={styles.lineChartYAxis}>
                                    <Text style={styles.lineChartYLabel}>10</Text>
                                    <Text style={styles.lineChartYLabel}>5</Text>
                                    <Text style={styles.lineChartYLabel}>0</Text>
                                </View>
                                {/* Chart area */}
                                <View style={styles.lineChartArea}>
                                    {/* Grid lines */}
                                    <View style={[styles.lineChartGridLine, { top: '0%' }]} />
                                    <View style={[styles.lineChartGridLine, { top: '50%' }]} />
                                    <View style={[styles.lineChartGridLine, { top: '100%' }]} />
                                    {/* Data points */}
                                    <View style={styles.lineChartPoints}>
                                        {miktarAvcisiScores.slice(0, 7).reverse().map((score, index) => {
                                            const correct = score.correct_answers || 5;
                                            const bottomPercent = (correct / 10) * 100;
                                            return (
                                                <View key={index} style={styles.lineChartPointContainer}>
                                                    <View style={[styles.lineChartPoint, { bottom: `${bottomPercent - 5}%`, backgroundColor: correct >= 7 ? COLORS.accent : correct >= 5 ? COLORS.secondary : COLORS.orange }]} />
                                                    <Text style={styles.lineChartPointLabel}>{index + 1}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.chartHint}>🎯 Doğru cevap sayısı (son 7 oyun)</Text>
                        </View>
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
                                const gameEmojis: Record<string, string> = {
                                    'miktar-avcisi': '🎯',
                                    'golge-dedektifi': '👤',
                                    'dizi-tamamla': '🔢',
                                    'rakam-yazma': '✏️',
                                    'ceviz-macera': '🌰',
                                };
                                const gameLabels: Record<string, string> = {
                                    'miktar-avcisi': 'Miktar Avcısı',
                                    'golge-dedektifi': 'Gölge Dedektifi',
                                    'dizi-tamamla': 'Dizi Tamamla',
                                    'rakam-yazma': 'Rakam Yazma',
                                    'ceviz-macera': 'Ceviz Macera',
                                };
                                const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.orange, COLORS.pink];

                                return Object.entries(gameTypes).slice(0, 5).map(([type, count], index) => {
                                    const percent = Math.round((count / total) * 100);
                                    return (
                                        <View key={type} style={styles.distributionRow}>
                                            <View style={styles.distributionLabel}>
                                                <Text style={styles.distributionEmoji}>{gameEmojis[type] || '🎮'}</Text>
                                                <Text style={styles.distributionName}>{gameLabels[type] || type}</Text>
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
                            <Text style={styles.chartHint}>🕹️ Her gün kaç oyun oynandı</Text>
                        </View>
                    </View>

                    {/* FREE TIER BANNER - Only show if not premium */}
                    {!isPremium && (
                        <View style={styles.freeBanner}>
                            <View style={styles.freeBannerContent}>
                                <Text style={styles.freeBannerEmoji}>🆓</Text>
                                <View style={styles.freeBannerText}>
                                    <Text style={styles.freeBannerTitle}>Ücretsiz Plan Kullanıyorsunuz</Text>
                                    <Text style={styles.freeBannerSubtitle}>Premium ile tüm özelliklere erişin!</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.freeBannerButton}>
                                <Text style={styles.freeBannerButtonText}>Yükselt 🚀</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* GAME HISTORY TABLE */}
                    <View style={styles.historySection}>
                        <Text style={styles.sectionTitle}>📋 Oyun Geçmişi</Text>
                        <View style={styles.historyCard}>
                            {/* Header Row */}
                            <View style={styles.historyHeader}>
                                <Text style={[styles.historyHeaderText, { flex: 2 }]}>Oyun</Text>
                                <Text style={[styles.historyHeaderText, { flex: 1 }]}>Tarih</Text>
                                <Text style={[styles.historyHeaderText, { flex: 1 }]}>Skor</Text>
                                <Text style={[styles.historyHeaderText, { flex: 1 }]}>Süre</Text>
                            </View>
                            {/* Game Rows */}
                            {scores.slice(0, 10).map((score, index) => {
                                const date = new Date(score.created_at);
                                const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
                                const gameLabel = score.oyun_turu === 'miktar-avcisi' ? '🎯 Miktar' :
                                    score.oyun_turu === 'golge-dedektifi' ? '👤 Gölge' :
                                        score.oyun_turu === 'dizi-tamamla' ? '🔢 Dizi' :
                                            score.oyun_turu?.substring(0, 8) || 'Oyun';
                                const scoreEmoji = (score.correct_answers || 0) >= 8 ? '🌟' :
                                    (score.correct_answers || 0) >= 5 ? '⭐' : '💪';
                                return (
                                    <View key={index} style={[styles.historyRow, index % 2 === 0 && styles.historyRowAlt]}>
                                        <Text style={[styles.historyCell, { flex: 2 }]}>{gameLabel}</Text>
                                        <Text style={[styles.historyCell, { flex: 1 }]}>{formattedDate}</Text>
                                        <Text style={[styles.historyCell, { flex: 1 }]}>
                                            {score.correct_answers !== null ? `${score.correct_answers}/10 ${scoreEmoji}` : `${10 - score.hata_sayisi}/10`}
                                        </Text>
                                        <Text style={[styles.historyCell, { flex: 1 }]}>{score.sure}s</Text>
                                    </View>
                                );
                            })}
                            {scores.length === 0 && (
                                <View style={styles.historyEmpty}>
                                    <Text style={styles.historyEmptyText}>Henüz oyun oynamadınız 🎮</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* AI Report Section */}
                    <View style={styles.aiSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>🤖 AI Pedagojik Rapor</Text>
                            {!isPremium && (
                                <View style={styles.lockIcon}>
                                    <Ionicons name="lock-closed" size={16} color="#fff" />
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
                            onPress={() => isPremium && latestAIComment && setAiReportExpanded(!aiReportExpanded)}
                            activeOpacity={isPremium && latestAIComment ? 0.7 : 1}
                        >
                            {latestAIComment ? (
                                <>
                                    <Text style={styles.aiText}>
                                        {aiReportExpanded ? latestAIComment : latestAIComment.substring(0, 300) + (latestAIComment.length > 300 ? '...' : '')}
                                    </Text>
                                    {isPremium && latestAIComment.length > 300 && (
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
                                <Text style={styles.aiPlaceholder}>
                                    Henüz bir AI analizi yok. Oyun oynandıktan sonra analiz yapılacak! 🎮
                                </Text>
                            )}
                        </TouchableOpacity>
                        {!isPremium && (
                            <Animated.View style={[styles.premiumOverlay, { transform: [{ scale: pulseAnim }] }]}>
                                <View style={styles.premiumBox}>
                                    <Text style={styles.premiumEmoji}>👑</Text>
                                    <Text style={styles.premiumTitle}>Premium ile Daha Fazla!</Text>
                                    <Text style={styles.premiumText}>
                                        Detaylı AI analizleri ve özel öneriler için Premium'a geç!
                                    </Text>
                                    <TouchableOpacity style={styles.premiumButton}>
                                        <Text style={styles.premiumButtonText}>Premium'a Geç ✨</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}
                    </View>

                    {/* PDF DOWNLOAD CARD - Modern centered design */}
                    <View style={styles.pdfSection}>
                        <TouchableOpacity
                            style={[styles.pdfCard, !isPremium && styles.pdfCardLocked]}
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
                                            {isPremium ? '📄 Akademik Raporu İndir' : '🔒 Rapor İndirmek İçin Premium'}
                                        </Text>
                                        <Text style={styles.pdfCardSubtitle}>
                                            {isPremium
                                                ? 'Detaylı performans analizi ve AI önerilerini PDF olarak kaydedin'
                                                : 'Full PDF raporu almak için paketinizi yükseltin'
                                            }
                                        </Text>
                                        <View style={styles.pdfCardButton}>
                                            <Ionicons name={isPremium ? "download" : "lock-closed"} size={20} color={isPremium ? COLORS.primary : COLORS.textLight} />
                                            <Text style={[styles.pdfCardButtonText, !isPremium && { color: COLORS.textLight }]}>
                                                {isPremium ? 'PDF İndir' : 'Premium\'a Yükselt'}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
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
});
