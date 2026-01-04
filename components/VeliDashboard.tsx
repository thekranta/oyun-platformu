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

// Fun color palette inspired by Pıtır, Filo, Maviş
const COLORS = {
    primary: '#1E88E5',      // Bright Blue (Maviş)
    secondary: '#FFB300',    // Warm Yellow (Pıtır)
    accent: '#66BB6A',       // Fresh Green
    premium: '#9C27B0',      // Vibrant Purple
    pink: '#EC407A',         // Fun Pink
    orange: '#FF7043',       // Playful Orange
    card: '#FFFFFF',
    text: '#263238',
    textLight: '#607D8B',
    gradient1: '#667eea',
    gradient2: '#764ba2',
};

export default function VeliDashboard({ childName, childAge, email, onClose }: VeliDashboardProps) {
    const { width } = Dimensions.get('window');
    const isTablet = width >= 768;

    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<GameScore[]>([]);
    const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'standard' | 'premium'>('free');
    const [generatingPDF, setGeneratingPDF] = useState(false);

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
            const scoresResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/oyun_skorlari?ogrenci_adi=eq.${encodeURIComponent(childName)}&order=created_at.desc&limit=50`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const scoresData = await scoresResponse.json();
            setScores(scoresData || []);

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
            if (profileData && profileData.length > 0) {
                setSubscriptionTier(profileData[0].subscription_tier || 'free');
            }
        } catch (error) {
            console.error('Dashboard veri çekme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    const miktarAvcisiScores = scores.filter(s => s.oyun_turu === 'miktar-avcisi');

    const avgCorrectAnswers = miktarAvcisiScores.length > 0
        ? Math.round(miktarAvcisiScores.reduce((a, b) => a + (b.correct_answers || 0), 0) / miktarAvcisiScores.length)
        : 0;

    const avgCognitiveSpeed = miktarAvcisiScores.length > 0
        ? Math.round(miktarAvcisiScores.reduce((a, b) => a + (b.cognitive_speed_score || 0), 0) / miktarAvcisiScores.length)
        : 0;

    const avgDistanceEffect = miktarAvcisiScores.length > 0
        ? (miktarAvcisiScores.reduce((a, b) => a + (b.distance_effect || 0), 0) / miktarAvcisiScores.length).toFixed(1)
        : '0';

    const avgResponseTime = miktarAvcisiScores.length > 0
        ? Math.round(miktarAvcisiScores.reduce((a, b) => a + (b.response_time || 0), 0) / miktarAvcisiScores.length)
        : 0;

    const latestAIComment = scores.find(s => s.yapay_zeka_yorumu)?.yapay_zeka_yorumu || null;
    const isPremium = subscriptionTier === 'premium';
    const successRate = avgCorrectAnswers * 10;

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
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>📊 Veli Paneli</Text>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                onPress={handleDownloadPDF}
                                style={[styles.pdfButton, !isPremium && styles.pdfButtonDisabled]}
                                disabled={generatingPDF}
                            >
                                {generatingPDF ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="download-outline" size={18} color="#fff" />
                                        <Text style={styles.pdfButtonText}>PDF</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tier Badge */}
                    <View style={styles.tierBadgeContainer}>
                        <View style={[styles.tierBadge, { backgroundColor: isPremium ? COLORS.premium : COLORS.textLight }]}>
                            <Text style={styles.tierBadgeText}>
                                {isPremium ? '👑 Premium' : subscriptionTier === 'standard' ? '⭐ Standard' : '🆓 Free'}
                            </Text>
                        </View>
                    </View>

                    {/* Child Profile Hero */}
                    <Animated.View style={[
                        styles.heroCard,
                        { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
                    ]}>
                        <View style={styles.heroGradient}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarTextLarge}>{childName.charAt(0).toUpperCase()}</Text>
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

                    {/* Metrics Grid */}
                    <Text style={styles.sectionTitle}>🎯 Performans Metrikleri</Text>
                    <View style={[styles.metricsGrid, isTablet && styles.metricsGridTablet]}>
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
                        <View style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}>
                            {latestAIComment ? (
                                <Text style={styles.aiText}>{latestAIComment.substring(0, 300)}...</Text>
                            ) : (
                                <Text style={styles.aiPlaceholder}>
                                    Henüz bir AI analizi yok. Oyun oynandıktan sonra analiz yapılacak! 🎮
                                </Text>
                            )}
                        </View>
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

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerEmoji}>🎓</Text>
                        <Text style={styles.footerText}>ChildhoodTech Akademi</Text>
                        <Text style={styles.footerSubtext}>Çocuğunuzun gelişimini birlikte takip ediyoruz 💜</Text>
                    </View>
                </ScrollView>
            </Animated.View>
        </DynamicBackground>
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
    heroGradient: {
        backgroundColor: COLORS.primary,
        padding: 28,
        alignItems: 'center',
        ...Platform.select({
            web: { background: `linear-gradient(135deg, ${COLORS.gradient1} 0%, ${COLORS.gradient2} 100%)` } as any,
            default: {},
        }),
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
    premiumOverlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        alignItems: 'center',
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
});
