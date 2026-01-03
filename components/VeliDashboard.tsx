import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

interface ProfileData {
    subscription_tier: 'free' | 'standard' | 'premium';
}

// Renk paleti (Pıtır, Filo, Maviş karakterleri)
const COLORS = {
    primary: '#1976D2',      // Mavi (Maviş)
    secondary: '#FFB74D',    // Sarı/Turuncu (Pıtır)
    accent: '#4CAF50',       // Yeşil
    premium: '#7B1FA2',      // Mor (Premium)
    background: '#F5F7FA',
    card: '#FFFFFF',
    text: '#37474F',
    textLight: '#78909C',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
};

export default function VeliDashboard({ childName, childAge, email, onClose }: VeliDashboardProps) {
    const { width } = Dimensions.get('window');
    const isTablet = width >= 768;

    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<GameScore[]>([]);
    const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'standard' | 'premium'>('free');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch game scores
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

            // Fetch profile with subscription tier
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

    // Miktar Avcısı verilerini filtrele
    const miktarAvcisiScores = scores.filter(s => s.oyun_turu === 'miktar-avcisi');

    // Ortalama hesaplamaları
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

    // Son AI yorumu
    const latestAIComment = scores.find(s => s.yapay_zeka_yorumu)?.yapay_zeka_yorumu || null;

    const isPremium = subscriptionTier === 'premium';

    // Progress bar component
    const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
        const percentage = Math.min((value / max) * 100, 100);
        return (
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        );
    };

    // Stat card component
    const StatCard = ({ icon, label, value, subLabel, color }: {
        icon: string;
        label: string;
        value: string | number;
        subLabel?: string;
        color: string;
    }) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                {subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
            </View>
        </View>
    );

    if (loading) {
        return (
            <DynamicBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
                </View>
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Veli Paneli</Text>
                        <View style={[styles.tierBadge, { backgroundColor: isPremium ? COLORS.premium : COLORS.textLight }]}>
                            <Text style={styles.tierBadgeText}>
                                {subscriptionTier === 'premium' ? '👑 Premium' : subscriptionTier === 'standard' ? '⭐ Standard' : '🆓 Free'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Child Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{childName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.childName}>{childName}</Text>
                        <Text style={styles.childAge}>{childAge} Ay • {miktarAvcisiScores.length} Oyun Kaydı</Text>
                    </View>
                </View>

                {/* Akademik Gelişim Radarı */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="analytics" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Akademik Gelişim Radarı</Text>
                    </View>
                    <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
                        <StatCard
                            icon="checkmark-circle"
                            label="Doğru Cevap Ortalaması"
                            value={`${avgCorrectAnswers}/10`}
                            subLabel="Miktar Avcısı"
                            color={COLORS.success}
                        />
                        <StatCard
                            icon="flash"
                            label="Bilişsel Hız Skoru"
                            value={avgCognitiveSpeed}
                            subLabel="Puan"
                            color={COLORS.secondary}
                        />
                    </View>
                    <View style={styles.progressSection}>
                        <Text style={styles.progressLabel}>Başarı Oranı</Text>
                        <ProgressBar value={avgCorrectAnswers} max={10} color={COLORS.success} />
                        <Text style={styles.progressValue}>{avgCorrectAnswers * 10}%</Text>
                    </View>
                </View>

                {/* Mesafe Etkisi Analizi */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="resize" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Mesafe Etkisi Analizi</Text>
                    </View>
                    <View style={styles.distanceCard}>
                        <View style={styles.distanceValueContainer}>
                            <Text style={styles.distanceValue}>{avgDistanceEffect}</Text>
                            <Text style={styles.distanceUnit}>ort. fark</Text>
                        </View>
                        <View style={styles.distanceExplanation}>
                            <Text style={styles.distanceTitle}>Miktar Algısı Derinliği</Text>
                            <Text style={styles.distanceText}>
                                {parseFloat(avgDistanceEffect) >= 3
                                    ? '✅ Çocuğunuz büyük farkları kolayca ayırt edebiliyor.'
                                    : parseFloat(avgDistanceEffect) >= 2
                                        ? '📊 Normal seviye - Yakın miktarları ayırt etme becerisi gelişiyor.'
                                        : '🎯 Güçlü miktar algısı - Küçük farkları bile hızlıca ayırt edebiliyor.'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tepki Süresi Grafiği */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="timer" size={22} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Tepki Süresi Analizi</Text>
                    </View>
                    <View style={styles.responseTimeCard}>
                        <View style={styles.responseTimeMain}>
                            <Text style={styles.responseTimeValue}>{avgResponseTime}</Text>
                            <Text style={styles.responseTimeUnit}>ms</Text>
                        </View>
                        <Text style={styles.responseTimeLabel}>Ortalama Tepki Süresi</Text>
                        <View style={styles.responseTimeBar}>
                            {miktarAvcisiScores.slice(0, 7).reverse().map((score, index) => (
                                <View key={index} style={styles.responseTimeBarItem}>
                                    <View
                                        style={[
                                            styles.responseTimeBarFill,
                                            {
                                                height: `${Math.min(((score.response_time || 0) / 5000) * 100, 100)}%`,
                                                backgroundColor: (score.response_time || 0) < 2000 ? COLORS.success : (score.response_time || 0) < 3500 ? COLORS.secondary : COLORS.error
                                            }
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>
                        <Text style={styles.responseTimeHint}>Son 7 oyun</Text>
                    </View>
                </View>

                {/* AI Pedagojik Rapor */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="school" size={22} color={COLORS.premium} />
                        <Text style={styles.sectionTitle}>AI Pedagojik Rapor</Text>
                        {!isPremium && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={14} color="#fff" /></View>}
                    </View>
                    <View style={[styles.aiReportCard, !isPremium && styles.aiReportBlurred]}>
                        {latestAIComment ? (
                            <Text style={styles.aiReportText}>{latestAIComment}</Text>
                        ) : (
                            <Text style={styles.aiReportPlaceholder}>Henüz bir AI analizi bulunmuyor.</Text>
                        )}
                    </View>
                    {!isPremium && (
                        <View style={styles.premiumOverlay}>
                            <View style={styles.premiumCard}>
                                <Ionicons name="diamond" size={32} color={COLORS.premium} />
                                <Text style={styles.premiumTitle}>Detaylı Akademik Analiz</Text>
                                <Text style={styles.premiumText}>
                                    Yapay zeka destekli pedagojik değerlendirmeler için Premium'a geçin.
                                </Text>
                                <TouchableOpacity style={styles.premiumButton}>
                                    <Text style={styles.premiumButtonText}>Premium'a Geç 👑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>ChildhoodTech Akademi © 2026</Text>
                </View>
            </ScrollView>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textLight,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
            default: { elevation: 3 },
        }),
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    tierBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 4,
    },
    tierBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    // Profile Card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
            default: { elevation: 4 },
        }),
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileInfo: {
        marginLeft: 16,
    },
    childName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    childAge: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 4,
    },

    // Section
    sectionContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
            default: { elevation: 4 },
        }),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
    },

    // Stats Grid
    statsGrid: {
        gap: 12,
    },
    statsGridTablet: {
        flexDirection: 'row',
    },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 16,
        borderLeftWidth: 4,
        flex: 1,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statContent: {
        marginLeft: 14,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statSubLabel: {
        fontSize: 11,
        color: COLORS.textLight,
    },

    // Progress
    progressSection: {
        marginTop: 16,
    },
    progressLabel: {
        fontSize: 13,
        color: COLORS.textLight,
        marginBottom: 8,
    },
    progressBarContainer: {
        height: 10,
        backgroundColor: '#E0E0E0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    progressValue: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'right',
        marginTop: 4,
    },

    // Distance Effect
    distanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        borderRadius: 14,
        padding: 20,
    },
    distanceValueContainer: {
        alignItems: 'center',
        marginRight: 20,
    },
    distanceValue: {
        fontSize: 42,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    distanceUnit: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    distanceExplanation: {
        flex: 1,
    },
    distanceTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 6,
    },
    distanceText: {
        fontSize: 13,
        color: COLORS.textLight,
        lineHeight: 20,
    },

    // Response Time
    responseTimeCard: {
        alignItems: 'center',
        padding: 16,
    },
    responseTimeMain: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    responseTimeValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    responseTimeUnit: {
        fontSize: 18,
        color: COLORS.textLight,
        marginLeft: 4,
    },
    responseTimeLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 4,
    },
    responseTimeBar: {
        flexDirection: 'row',
        height: 80,
        gap: 8,
        marginTop: 20,
        alignItems: 'flex-end',
    },
    responseTimeBarItem: {
        width: 24,
        height: '100%',
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    responseTimeBarFill: {
        width: '100%',
        borderRadius: 4,
    },
    responseTimeHint: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 8,
    },

    // AI Report
    aiReportCard: {
        backgroundColor: '#F3E5F5',
        borderRadius: 14,
        padding: 20,
        minHeight: 150,
    },
    aiReportBlurred: {
        ...Platform.select({
            web: { filter: 'blur(6px)' } as any,
            default: { opacity: 0.3 },
        }),
    },
    aiReportText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 22,
    },
    aiReportPlaceholder: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 40,
    },
    premiumOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    premiumCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '85%',
        ...Platform.select({
            web: { boxShadow: '0 8px 24px rgba(123, 31, 162, 0.2)' },
            default: { elevation: 8 },
        }),
    },
    premiumTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.premium,
        marginTop: 12,
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
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        marginTop: 16,
    },
    premiumButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    lockBadge: {
        backgroundColor: COLORS.premium,
        borderRadius: 10,
        padding: 4,
    },

    // Footer
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 12,
        color: COLORS.textLight,
    },
});
