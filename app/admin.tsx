import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DynamicBackground from '../components/DynamicBackground';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

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
}

export default function AdminPanel() {
    const router = useRouter();
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);

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
        if (username === 'admin' && password === '123456') {
            setIsAuthenticated(true);
        } else {
            alert('Hatalı kullanıcı adı veya şifre!');
        }
    };

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

    const ScoreCard = ({ item }: { item: Score }) => {
        const [expanded, setExpanded] = useState(false);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.playerName}>{item.ogrenci_adi || 'İsimsiz'} ({item.ogrenci_yasi || '?'} Ay)</Text>
                    <Text style={styles.gameName}>{(item.oyun_turu || 'Bilinmeyen Oyun').toUpperCase()}</Text>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.stat}>
                        <Ionicons name="time-outline" size={16} color="#555" />
                        <Text style={styles.statText}>{item.sure || '?'} sn</Text>
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

                {item.yapay_zeka_yorumu && (
                    <View>
                        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.aiHeader}>
                            <Text style={styles.aiCommentTitle}>🤖 AI Yorumu {expanded ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {expanded && (
                            <View style={styles.aiCommentBox}>
                                <Text style={styles.aiCommentText}>{item.yapay_zeka_yorumu}</Text>
                            </View>
                        )}
                    </View>
                )}

                <Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : 'Tarih Yok'}</Text>
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
                        renderItem={({ item }) => <ScoreCard item={item} />}
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
    container: { flex: 1, paddingTop: 50 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    backButton: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 20, marginRight: 15 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    playerName: { fontSize: 18, fontWeight: 'bold', color: '#2196F3' },
    gameName: { fontSize: 14, fontWeight: 'bold', color: '#FF9800', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    stat: { flexDirection: 'row', alignItems: 'center' },
    statText: { marginLeft: 5, fontSize: 14, color: '#555' },
    date: { fontSize: 12, color: '#999', textAlign: 'right' },
    emptyText: { textAlign: 'center', fontSize: 16, color: '#777', marginTop: 50 },

    // Login Styles
    loginBox: { width: '100%', maxWidth: 350, backgroundColor: 'white', padding: 30, borderRadius: 20, elevation: 5 },
    loginTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    input: { width: '100%', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    loginButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    backButtonSimple: { marginTop: 15, alignItems: 'center' },

    // AI Comment Styles
    aiHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
    aiCommentBox: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 10, marginBottom: 10 },
    aiCommentTitle: { fontWeight: 'bold', color: '#2E7D32', marginRight: 5 },
    aiCommentText: { fontSize: 14, color: '#333', fontStyle: 'italic' }
});
