import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
});
