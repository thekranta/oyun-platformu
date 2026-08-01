import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Score {
    id: number;
    created_at: string;
    oyun_turu: string;
    hamle_sayisi: number;
    hata_sayisi: number;
    sure?: number;
}

interface StudentStatsModalProps {
    visible: boolean;
    onClose: () => void;
    studentName: string;
    studentAge: number;
    scores: Score[];
}

// Oyun türü isimleri ve renkleri
const GAME_INFO: Record<string, { name: string; icon: string; color: string }> = {
    'hafiza': { name: 'Çiftini Bul!', icon: '🧠', color: '#9C27B0' },
    'siralama': { name: 'Sıralama', icon: '📊', color: '#2196F3' },
    'gruplama': { name: 'Gruplama', icon: '📦', color: '#4CAF50' },
    'diziyi-tamamla': { name: 'Diziyi Tamamla', icon: '🔢', color: '#FF9800' },
    'bunu-soyle': { name: 'Bunu Söyle!', icon: '🎤', color: '#E91E63' },
    'ceviz_macera': { name: 'Ceviz Macerası', icon: '🌰', color: '#795548' },
    'aile-sepeti': { name: 'Aile Sepeti', icon: '👨‍👩‍👧', color: '#FF5722' },
    'yaratici-cizim': { name: 'Hayal Defteri', icon: '🎨', color: '#00BCD4' },
    'eksik-sayi-bul': { name: 'Eksik Sayıyı Bul', icon: '❓', color: '#3F51B5' },
    'kodlama': { name: 'Minik Kaşif', icon: '🧩', color: '#009688' },
    'rakam-yazma': { name: 'Rakam Yazma', icon: '✏️', color: '#607D8B' },
    'rakam-yazma-2': { name: 'Rakam Yazma 6-10', icon: '🔟', color: '#26A69A' },
    'yapboz': { name: 'Yapboz', icon: '🧩', color: '#8BC34A' },
    'sayilari-birlestir': { name: 'Sayıları Birleştir', icon: '🔗', color: '#CDDC39' },
    'kutuyu-bul': { name: 'Kutuyu Bul!', icon: '📦', color: '#FFC107' },
};

// Circular Progress Component
const CircularStat = ({ value, label, color, icon, subtitle }: { value: string | number; label: string; color: string; icon: string; subtitle?: string }) => (
    <View style={[styles.circularStat, { borderColor: color }]}>
        <Text style={styles.circularIcon}>{icon}</Text>
        <Text style={[styles.circularValue, { color }]}>{value}</Text>
        <Text style={styles.circularLabel}>{label}</Text>
        {subtitle && <Text style={styles.circularSubtitle}>{subtitle}</Text>}
    </View>
);

// Progress Ring (mini circular progress)
const ProgressRing = ({ value, maxValue, size = 40, color }: { value: number; maxValue: number; size?: number; color: string }) => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: '#e0e0e0' }} />
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color, borderTopColor: 'transparent', borderRightColor: percentage > 25 ? color : 'transparent', borderBottomColor: percentage > 50 ? color : 'transparent', transform: [{ rotate: '-90deg' }] }} />
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#333' }}>{value}</Text>
        </View>
    );
};

export default function StudentStatsModal({ visible, onClose, studentName, studentAge, scores }: StudentStatsModalProps) {
    // Prepare data
    const sortedScores = [...scores].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const durationData = sortedScores.map(s => s.sure || 0);
    const movesData = sortedScores.map(s => s.hamle_sayisi);
    const errorsData = sortedScores.map(s => s.hata_sayisi);

    // Statistics
    const totalGames = scores.length;
    const avgDuration = durationData.length > 0
        ? Math.round(durationData.reduce((a, b) => a + b, 0) / durationData.length)
        : 0;
    const avgMoves = movesData.length > 0
        ? Math.round(movesData.reduce((a, b) => a + b, 0) / movesData.length)
        : 0;
    const avgErrors = errorsData.length > 0
        ? (errorsData.reduce((a, b) => a + b, 0) / errorsData.length).toFixed(1)
        : '0';
    const totalErrors = errorsData.reduce((a, b) => a + b, 0);
    const bestTime = durationData.length > 0 ? Math.min(...durationData.filter(d => d > 0)) : 0;

    // Game type breakdown
    const gameTypeCounts: Record<string, number> = {};
    scores.forEach(s => {
        gameTypeCounts[s.oyun_turu] = (gameTypeCounts[s.oyun_turu] || 0) + 1;
    });

    // Recent games (last 5)
    const recentGames = sortedScores.slice(-5).reverse();

    // Performance trend
    const recentErrors = errorsData.slice(-3);
    const olderErrors = errorsData.slice(0, -3);
    const recentAvg = recentErrors.length > 0 ? recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length : 0;
    const olderAvg = olderErrors.length > 0 ? olderErrors.reduce((a, b) => a + b, 0) / olderErrors.length : 0;
    const isImproving = olderErrors.length > 0 && recentAvg < olderAvg;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{studentName}</Text>
                        <Text style={styles.headerSubtitle}>{studentAge} Ay • {totalGames} Oyun Tamamlandı</Text>
                    </View>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>📊</Text>
                    </View>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {/* Key Stats Grid */}
                    <View style={styles.statsGrid}>
                        <CircularStat value={totalGames} label="Toplam Oyun" color="#2196F3" icon="🎮" />
                        <CircularStat value={`${avgDuration}s`} label="Ort. Süre" color="#4CAF50" icon="⏱️" subtitle={bestTime > 0 ? `En iyi: ${bestTime}s` : undefined} />
                        <CircularStat value={avgErrors} label="Ort. Hata" color={parseFloat(avgErrors) <= 2 ? '#4CAF50' : '#FF9800'} icon="🎯" />
                        <CircularStat value={avgMoves} label="Ort. Hamle" color="#9C27B0" icon="👆" />
                    </View>

                    {/* Performance Trend */}
                    {olderErrors.length > 0 && (
                        <View style={[styles.trendCard, { backgroundColor: isImproving ? '#e8f5e9' : '#fff3e0' }]}>
                            <Text style={styles.trendIcon}>{isImproving ? '📈' : '📊'}</Text>
                            <View style={styles.trendContent}>
                                <Text style={[styles.trendTitle, { color: isImproving ? '#2e7d32' : '#e65100' }]}>
                                    {isImproving ? 'Gelişim Gösteriyor!' : 'Gelişim Sürecinde'}
                                </Text>
                                <Text style={styles.trendSubtitle}>
                                    {isImproving
                                        ? `Son oyunlarda hata oranı ${((olderAvg - recentAvg) / olderAvg * 100).toFixed(0)}% azaldı`
                                        : 'Düzenli pratikle performans artacaktır'
                                    }
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Game Types */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎮 Oynanan Oyunlar</Text>
                        <View style={styles.gameTypesGrid}>
                            {Object.entries(gameTypeCounts).map(([type, count]) => {
                                const info = GAME_INFO[type] || { name: type, icon: '🎯', color: '#607D8B' };
                                return (
                                    <View key={type} style={[styles.gameTypeCard, { borderLeftColor: info.color }]}>
                                        <Text style={styles.gameTypeIcon}>{info.icon}</Text>
                                        <View style={styles.gameTypeInfo}>
                                            <Text style={styles.gameTypeName}>{info.name}</Text>
                                            <Text style={[styles.gameTypeCount, { color: info.color }]}>{count} kez</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Recent Games Timeline */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📅 Son Oyunlar</Text>
                        {recentGames.map((game, index) => {
                            const info = GAME_INFO[game.oyun_turu] || { name: game.oyun_turu, icon: '🎯', color: '#607D8B' };
                            const date = new Date(game.created_at);
                            return (
                                <View key={game.id} style={styles.timelineItem}>
                                    <View style={[styles.timelineDot, { backgroundColor: info.color }]} />
                                    {index < recentGames.length - 1 && <View style={styles.timelineLine} />}
                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineHeader}>
                                            <Text style={styles.timelineIcon}>{info.icon}</Text>
                                            <Text style={styles.timelineTitle}>{info.name}</Text>
                                        </View>
                                        <Text style={styles.timelineDate}>
                                            {date.toLocaleDateString('tr-TR')} • {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <View style={styles.timelineStats}>
                                            <ProgressRing value={game.sure || 0} maxValue={120} size={36} color="#2196F3" />
                                            <Text style={styles.timelineStatLabel}>süre</Text>
                                            <ProgressRing value={game.hamle_sayisi} maxValue={50} size={36} color="#4CAF50" />
                                            <Text style={styles.timelineStatLabel}>hamle</Text>
                                            <ProgressRing value={game.hata_sayisi} maxValue={10} size={36} color={game.hata_sayisi <= 2 ? '#4CAF50' : '#FF9800'} />
                                            <Text style={styles.timelineStatLabel}>hata</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: {
        backgroundColor: '#1a1a2e',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: { padding: 8, marginRight: 12 },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#a0a0a0', marginTop: 4 },
    headerBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerBadgeText: { fontSize: 22 },

    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },

    // Stats Grid
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
    circularStat: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    circularIcon: { fontSize: 28, marginBottom: 8 },
    circularValue: { fontSize: 28, fontWeight: 'bold' },
    circularLabel: { fontSize: 12, color: '#666', marginTop: 4 },
    circularSubtitle: { fontSize: 10, color: '#999', marginTop: 2 },

    // Trend Card
    trendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    trendIcon: { fontSize: 32, marginRight: 12 },
    trendContent: { flex: 1 },
    trendTitle: { fontSize: 16, fontWeight: 'bold' },
    trendSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },

    // Section
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },

    // Game Types
    gameTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gameTypeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderLeftWidth: 4,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    gameTypeIcon: { fontSize: 20, marginRight: 10 },
    gameTypeInfo: { flexDirection: 'column' },
    gameTypeName: { fontSize: 13, fontWeight: '600', color: '#333' },
    gameTypeCount: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },

    // Timeline
    timelineItem: { flexDirection: 'row', marginBottom: 16, paddingLeft: 20 },
    timelineDot: { position: 'absolute', left: 0, top: 4, width: 12, height: 12, borderRadius: 6 },
    timelineLine: { position: 'absolute', left: 5, top: 18, width: 2, height: '100%', backgroundColor: '#e0e0e0' },
    timelineContent: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1 },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    timelineIcon: { fontSize: 18, marginRight: 8 },
    timelineTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
    timelineDate: { fontSize: 11, color: '#999', marginBottom: 10 },
    timelineStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timelineStatLabel: { fontSize: 9, color: '#999', marginRight: 10 },
});
