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

export default function StudentStatsModal({ visible, onClose, studentName, studentAge, scores }: StudentStatsModalProps) {
    // Prepare data for charts
    const sortedScores = [...scores].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const durationData = sortedScores.map(s => s.sure || 0);
    const movesData = sortedScores.map(s => s.hamle_sayisi);
    const errorsData = sortedScores.map(s => s.hata_sayisi);

    // Calculate statistics
    const avgDuration = durationData.length > 0
        ? (durationData.reduce((a, b) => a + b, 0) / durationData.length).toFixed(1)
        : '0';
    const avgMoves = movesData.length > 0
        ? (movesData.reduce((a, b) => a + b, 0) / movesData.length).toFixed(1)
        : '0';
    const avgErrors = errorsData.length > 0
        ? (errorsData.reduce((a, b) => a + b, 0) / errorsData.length).toFixed(1)
        : '0';

    // Simple Bar Chart Component
    const BarChart = ({ data, label, color }: { data: number[], label: string, color: string }) => {
        if (data.length === 0) return null;
        const maxValue = Math.max(...data, 1);

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{label}</Text>
                <View style={styles.barsContainer}>
                    {data.map((value, index) => (
                        <View key={index} style={styles.barWrapper}>
                            <View style={styles.barColumn}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            height: `${(value / maxValue) * 100}%`,
                                            backgroundColor: color
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.barLabel}>Oyun {index + 1}</Text>
                            <Text style={styles.barValue}>{value}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{studentName} - İstatistikler</Text>
                        <Text style={styles.headerSubtitle}>{studentAge} Ay • {scores.length} Oyun</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {/* Summary Cards */}
                    <View style={styles.summaryContainer}>
                        <View style={[styles.summaryCard, { backgroundColor: '#2196F3' }]}>
                            <Ionicons name="time-outline" size={32} color="#fff" />
                            <Text style={styles.summaryValue}>{avgDuration} sn</Text>
                            <Text style={styles.summaryLabel}>Ort. Süre</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#4CAF50' }]}>
                            <Ionicons name="finger-print-outline" size={32} color="#fff" />
                            <Text style={styles.summaryValue}>{avgMoves}</Text>
                            <Text style={styles.summaryLabel}>Ort. Hamle</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#FF9800' }]}>
                            <Ionicons name="alert-circle-outline" size={32} color="#fff" />
                            <Text style={styles.summaryValue}>{avgErrors}</Text>
                            <Text style={styles.summaryLabel}>Ort. Hata</Text>
                        </View>
                    </View>

                    {/* Charts */}
                    <BarChart data={durationData} label="⏱️ Süre Trendi (saniye)" color="#2196F3" />
                    <BarChart data={movesData} label="👆 Hamle Sayısı Trendi" color="#4CAF50" />
                    <BarChart data={errorsData} label="❌ Hata Trendi" color="#FF9800" />

                    {/* Game Types Breakdown */}
                    <View style={styles.breakdownContainer}>
                        <Text style={styles.breakdownTitle}>🎮 Oyun Türleri</Text>
                        {['hafiza', 'siralama', 'gruplama', 'diziyi-tamamla'].map(type => {
                            const count = scores.filter(s => s.oyun_turu === type).length;
                            const typeNames: { [key: string]: string } = {
                                'hafiza': 'Çiftini Bul!',
                                'siralama': 'Sayı Sıralama',
                                'gruplama': 'Gruplama',
                                'diziyi-tamamla': 'Diziyi Tamamla'
                            };
                            if (count === 0) return null;
                            return (
                                <View key={type} style={styles.breakdownItem}>
                                    <Text style={styles.breakdownLabel}>{typeNames[type] || type}</Text>
                                    <Text style={styles.breakdownValue}>{count} Oyun</Text>
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
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#2196F3',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#E3F2FD',
        marginTop: 4,
    },
    closeButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 4,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#fff',
        marginTop: 4,
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 200,
        paddingHorizontal: 8,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 2,
    },
    barColumn: {
        width: '100%',
        height: 150,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: '80%',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    barValue: {
        fontSize: 9,
        color: '#999',
        marginTop: 2,
    },
    breakdownContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    breakdownTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#666',
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196F3',
    },
});
