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
    ogrenci_adi: string; // Fixed column name
    ogrenci_yasi: number; // Fixed column name
    oyun_turu: string;    // Fixed column name
    hamle_sayisi: number;
    hata_sayisi: number;
    yapay_zeka_yorumu?: string; // Added AI comment
    sure?: number; // Some records might not have this if not saved
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
        </DynamicBackground >
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
