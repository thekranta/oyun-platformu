import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from '../components/DynamicBackground';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

interface Score {
    id: number;
    created_at: string;
    oyuncu_adi: string;
    oyuncu_yasi: string;
    oyun_adi: string;
    sure: number;
    hamle_sayisi: number;
    hata_sayisi: number;
}

export default function AdminPanel() {
    const router = useRouter();
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchScores();
    }, []);

    const fetchScores = async () => {
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

            const data = await response.json();
            setScores(data);
        } catch (error) {
            console.error(error);
            alert('Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Score }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.playerName}>{item.oyuncu_adi || 'İsimsiz'} ({item.oyuncu_yasi || '?'} Ay)</Text>
                <Text style={styles.gameName}>{(item.oyun_adi || 'Bilinmeyen Oyun').toUpperCase()}</Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.stat}>
                    <Ionicons name="time-outline" size={16} color="#555" />
                    <Text style={styles.statText}>{item.sure || 0} sn</Text>
                </View>
                <View style={styles.stat}>
                    <Ionicons name="finger-print-outline" size={16} color="#555" />
                    <Text style={styles.statText}>{item.hamle_sayisi || 0} Hamle</Text>
                </View>
                <View style={styles.stat}>
                    <Ionicons name="alert-circle-outline" size={16} color="#555" />
                    <Text style={styles.statText}>{item.hata_sayisi || 0} Hata</Text>
                </View>
            </View>
            <Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : 'Tarih Yok'}</Text>
        </View>
    );

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Admin Paneli 📊</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={scores}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={<Text style={styles.emptyText}>Henüz kayıt yok.</Text>}
                    />
                )}
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 8,
        borderRadius: 20,
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
    },
    playerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    gameName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF9800',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        marginLeft: 5,
        fontSize: 14,
        color: '#555',
    },
    date: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#777',
        marginTop: 50,
    },
});
