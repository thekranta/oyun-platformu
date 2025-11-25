import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DynamicBackground from '../components/DynamicBackground';
import { useSound } from '../components/SoundContext';
import StudentStatsModal from '../components/StudentStatsModal';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

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
    email?: string;
}

interface StudentGroup {
    id: string; // Unique ID based on name-age
    name: string;
    age: number;
    scores: Score[];
}

export default function AdminPanel() {
    const router = useRouter();
    const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const { isMuted, toggleMute } = useSound();

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

            const data: Score[] = await response.json();
            groupScoresByStudent(data);
        } catch (error) {
            console.error(error);
            alert('Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const groupScoresByStudent = (scores: Score[]) => {
        const groups: { [key: string]: StudentGroup } = {};

        scores.forEach(score => {
            const key = `${score.ogrenci_adi}-${score.ogrenci_yasi}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    name: score.ogrenci_adi,
                    age: score.ogrenci_yasi,
                    scores: []
                };
            }
            groups[key].scores.push(score);
        });

        const groupArray = Object.values(groups).sort((a, b) => {
            const dateA = new Date(a.scores[0].created_at).getTime();
            const dateB = new Date(b.scores[0].created_at).getTime();
            return dateB - dateA;
        });

        setStudentGroups(groupArray);
    };

    const analyzeGame = async (score: Score) => {
        setProcessingId(score.id);
        try {
            let oyunAdiTR = '';
            if (score.oyun_turu === 'hafiza') oyunAdiTR = 'Hafıza Kartları';
            else if (score.oyun_turu === 'siralama') oyunAdiTR = 'Sayı Sıralama';
            else if (score.oyun_turu === 'gruplama') oyunAdiTR = 'Gruplama (Kategorizasyon)';
            else if (score.oyun_turu === 'diziyi-tamamla') oyunAdiTR = 'Diziyi Tamamla';
            else if (score.oyun_turu === 'bunu-soyle') oyunAdiTR = 'Bunu Söyle (Telaffuz)';
            else oyunAdiTR = score.oyun_turu;

            const prompt = `
                Sen bir okul öncesi eğitim uzmanısın. Aşağıdaki verilere göre çocuğun gelişimini değerlendir.
                
                Öğrenci: ${score.ogrenci_adi} (${score.ogrenci_yasi} yaşında)
                Oyun: ${oyunAdiTR}
                
                Performans Verileri:
                - Süre: ${score.sure || '?'} saniye
                - Hamle: ${score.hamle_sayisi}
                - Hata: ${score.hata_sayisi}
                
                Lütfen çocuğun dikkat, hafıza veya mantık becerileri hakkında yapıcı, motive edici ve ebeveyne yönelik kısa bir yorum yaz.
            `;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY?.trim()}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                }
            );

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0) {
                const aiComment = data.candidates[0].content.parts[0].text;

                // Update Supabase
                await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${score.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ yapay_zeka_yorumu: aiComment })
                });

                // Update state directly instead of refetching
                setStudentGroups(prevGroups =>
                    prevGroups.map(group => ({
                        ...group,
                        scores: group.scores.map(s =>
                            s.id === score.id ? { ...s, yapay_zeka_yorumu: aiComment } : s
                        )
                    }))
                );
                console.log('✅ Analiz tamamlandı ve kaydedildi!', { scoreId: score.id, aiComment });
            } else {
                console.error('❌ Yapay zeka yanıt veremedi.');
            }
        } catch (error) {
            console.error('❌ Analiz sırasında hata:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const sendEmail = async (score: Score) => {
        if (!score.email) {
            console.warn('⚠️ Bu kayıt için ebeveyn e-postası bulunamadı.', { scoreId: score.id });
            return;
        }
        setProcessingId(score.id);
        try {
            let oyunAdiTR = '';
            if (score.oyun_turu === 'hafiza') oyunAdiTR = 'Hafıza Kartları';
            else if (score.oyun_turu === 'siralama') oyunAdiTR = 'Sayı Sıralama';
            else if (score.oyun_turu === 'gruplama') oyunAdiTR = 'Gruplama (Kategorizasyon)';
            else if (score.oyun_turu === 'diziyi-tamamla') oyunAdiTR = 'Diziyi Tamamla';
            else if (score.oyun_turu === 'bunu-soyle') oyunAdiTR = 'Bunu Söyle (Telaffuz)';
            else oyunAdiTR = score.oyun_turu;

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: score.email,
                    subject: `🎮 ${score.ogrenci_adi} - ${oyunAdiTR} Raporu`,
                    message: `Merhaba, ${score.ogrenci_adi} az önce ${oyunAdiTR} oyununu tamamladı. İşte sonuçlar:`,
                    gameDetails: {
                        game: oyunAdiTR,
                        duration: score.sure,
                        moves: score.hamle_sayisi,
                        errors: score.hata_sayisi,
                        aiComment: score.yapay_zeka_yorumu
                    }
                })
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const result = await response.json();
                if (response.ok) {
                    console.log('✅ E-posta başarıyla gönderildi!', { email: score.email, scoreId: score.id });
                } else {
                    console.error('❌ E-posta hatası:', result.error || 'Bilinmeyen sunucu hatası');
                }
            } else {
                const text = await response.text();
                console.error("❌ API Yanıtı (JSON değil):", text);
                console.error(`Sunucu Hatası: ${response.status} ${response.statusText}`);
            }

        } catch (error: any) {
            console.error("❌ E-posta gönderilirken hata:", error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const StudentCard = ({ student }: { student: StudentGroup }) => {
        const [expanded, setExpanded] = useState(false);
        const [showStats, setShowStats] = useState(false);

        return (
            <>
                <StudentStatsModal
                    visible={showStats}
                    onClose={() => setShowStats(false)}
                    studentName={student.name}
                    studentAge={student.age}
                    scores={student.scores}
                />
                <View style={styles.studentCard}>
                    <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.studentHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.studentName}>{student.name}</Text>
                                <Text style={styles.studentAge}>{student.age} Ay • {student.scores.length} Oyun</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowStats(true)} style={{ padding: 4 }}>
                                <Ionicons name="stats-chart" size={20} color="#2196F3" />
                            </TouchableOpacity>
                            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={24} color="#555" />
                        </View>
                    </TouchableOpacity>

                    {expanded && (
                        <View style={styles.gamesList}>
                            {student.scores.map((score, index) => (
                                <GameRow key={score.id} score={score} isLast={index === student.scores.length - 1} />
                            ))}
                        </View>
                    )}
                </View>
            </>
        );
    };

    const GameRow = ({ score, isLast }: { score: Score, isLast: boolean }) => {
        const [showComment, setShowComment] = useState(false);
        const isProcessing = processingId === score.id;

        return (
            <View style={[styles.gameRow, !isLast && styles.gameRowBorder]}>
                <View style={styles.gameHeader}>
                    <Text style={styles.gameTypeBadge}>{score.oyun_turu.toUpperCase()}</Text>
                    <Text style={styles.gameDate}>{new Date(score.created_at).toLocaleDateString('tr-TR')} {new Date(score.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text style={styles.statValue}>{score.sure || '?'} sn</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="finger-print-outline" size={14} color="#666" />
                        <Text style={styles.statValue}>{score.hamle_sayisi} Hamle</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="alert-circle-outline" size={14} color="#666" />
                        <Text style={styles.statValue}>{score.hata_sayisi} Hata</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    {!score.yapay_zeka_yorumu ? (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                            onPress={() => analyzeGame(score)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>🤖 Analiz Et</Text>}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setShowComment(!showComment)} style={styles.aiToggle}>
                                <Text style={styles.aiToggleText}>🤖 Yorumu {showComment ? 'Gizle' : 'Göster'}</Text>
                            </TouchableOpacity>

                            {score.email && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#4CAF50', paddingVertical: 4, paddingHorizontal: 8 }]}
                                    onPress={() => sendEmail(score)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>📧 Mail Gönder</Text>}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {showComment && score.yapay_zeka_yorumu && (
                    <View style={styles.aiCommentBox}>
                        <Text style={styles.aiCommentText}>{score.yapay_zeka_yorumu}</Text>
                    </View>
                )}
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
                    <Text style={styles.title}>Öğrenci Gelişim Takibi 📊</Text>
                    <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={studentGroups}
                        renderItem={({ item }) => <StudentCard student={item} />}
                        keyExtractor={(item) => item.id}
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
    title: { flex: 1, fontSize: 22, fontWeight: 'bold', color: '#333' },
    soundButton: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 20, marginLeft: 15 },
    listContent: { padding: 15, paddingBottom: 100 },
    emptyText: { textAlign: 'center', fontSize: 16, color: '#777', marginTop: 50 },

    // Student Card Styles
    studentCard: { backgroundColor: 'white', borderRadius: 15, marginBottom: 15, elevation: 3, overflow: 'hidden' },
    studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: '#2196F3' },
    studentName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    studentAge: { fontSize: 14, color: '#666' },

    // Game List Styles
    gamesList: { backgroundColor: '#F5F5F5', borderTopWidth: 1, borderTopColor: '#eee' },
    gameRow: { padding: 15, backgroundColor: '#fff' },
    gameRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    gameTypeBadge: { fontSize: 12, fontWeight: 'bold', color: '#FF9800', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    gameDate: { fontSize: 12, color: '#999' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    statItem: { flexDirection: 'row', alignItems: 'center' },
    statValue: { marginLeft: 5, fontSize: 13, color: '#444', fontWeight: '500' },

    // Action Buttons
    actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    actionButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
    actionButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    // AI Toggle & Comment
    aiToggle: { paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#E3F2FD', borderRadius: 6 },
    aiToggleText: { fontSize: 12, color: '#2196F3', fontWeight: 'bold' },
    aiCommentBox: { marginTop: 8, backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8 },
    aiCommentText: { fontSize: 13, color: '#2E7D32', fontStyle: 'italic', lineHeight: 18 },

    // Login Styles
    loginBox: { width: '100%', maxWidth: 350, backgroundColor: 'white', padding: 30, borderRadius: 20, elevation: 5 },
    loginTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    input: { width: '100%', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    loginButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    backButtonSimple: { marginTop: 15, alignItems: 'center' },
});
