import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DynamicBackground from './DynamicBackground';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

interface TeacherDashboardProps {
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    schoolName?: string;
    subscriptionTier: 'free' | 'premium';
    onClose: () => void;
}

interface ClassData {
    id: string;
    name: string;
    studentCount: number;
}

interface StudentData {
    id: string;
    child_name: string;
    child_age_months: number;
    email: string;
    gameCount: number;
}

interface GameScore {
    id: number;
    created_at: string;
    oyun_turu: string;
    hamle_sayisi: number;
    hata_sayisi: number;
    sure?: number;
    yapay_zeka_yorumu?: string;
}

export default function TeacherDashboard({
    teacherId,
    teacherName,
    teacherEmail,
    schoolName,
    subscriptionTier,
    onClose,
}: TeacherDashboardProps) {
    const { width } = Dimensions.get('window');
    const isMobile = width < 768;

    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
    const [students, setStudents] = useState<StudentData[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [studentScores, setStudentScores] = useState<GameScore[]>([]);
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);

    const isPremium = subscriptionTier === 'premium';

    // Demo için örnek veriler
    useEffect(() => {
        if (teacherId === 'demo-teacher') {
            // Demo sınıflar
            setClasses([
                { id: 'demo-class-1', name: 'A Sınıfı', studentCount: 3 },
                { id: 'demo-class-2', name: 'B Sınıfı', studentCount: 2 },
            ]);
            setLoading(false);
        } else {
            fetchClasses();
        }
    }, [teacherId]);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/classes?teacher_id=eq.${teacherId}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY!,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const data = await response.json();
            if (Array.isArray(data)) {
                setClasses(data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    studentCount: 0, // Will be calculated later
                })));
            }
        } catch (error) {
            console.error('Sınıflar yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (classId: string) => {
        if (teacherId === 'demo-teacher') {
            // Demo öğrenciler
            setStudents([
                { id: '1', child_name: 'Ahmet', child_age_months: 48, email: 'ahmet@test.com', gameCount: 5 },
                { id: '2', child_name: 'Ayşe', child_age_months: 52, email: 'ayse@test.com', gameCount: 3 },
                { id: '3', child_name: 'Mehmet', child_age_months: 45, email: 'mehmet@test.com', gameCount: 7 },
            ]);
            return;
        }

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/class_students?class_id=eq.${classId}&select=child_email`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY!,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const classStudents = await response.json();

            if (Array.isArray(classStudents)) {
                const emails = classStudents.map((s: any) => s.child_email);
                // profiles tablosundan öğrenci bilgilerini al
                const profilesResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/profiles?email=in.(${emails.map(e => `"${e}"`).join(',')})`,
                    {
                        headers: {
                            'apikey': SUPABASE_KEY!,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                        },
                    }
                );
                const profiles = await profilesResponse.json();
                if (Array.isArray(profiles)) {
                    setStudents(profiles.map((p: any) => ({
                        id: p.id || p.email,
                        child_name: p.child_name,
                        child_age_months: p.child_age_months,
                        email: p.email,
                        gameCount: 0,
                    })));
                }
            }
        } catch (error) {
            console.error('Öğrenciler yüklenirken hata:', error);
        }
    };

    const fetchStudentScores = async (studentName: string, studentAge: number) => {
        if (teacherId === 'demo-teacher') {
            // Demo skorlar
            setStudentScores([
                { id: 1, created_at: new Date().toISOString(), oyun_turu: 'hafiza', hamle_sayisi: 12, hata_sayisi: 2, sure: 45 },
                { id: 2, created_at: new Date().toISOString(), oyun_turu: 'siralama', hamle_sayisi: 8, hata_sayisi: 1, sure: 32 },
                { id: 3, created_at: new Date().toISOString(), oyun_turu: 'gruplama', hamle_sayisi: 15, hata_sayisi: 3, sure: 60 },
            ]);
            return;
        }

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/oyun_skorlari?ogrenci_adi=eq.${encodeURIComponent(studentName)}&ogrenci_yasi=eq.${studentAge}&order=created_at.desc&limit=20`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY!,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const data = await response.json();
            if (Array.isArray(data)) {
                setStudentScores(data);
            }
        } catch (error) {
            console.error('Skorlar yüklenirken hata:', error);
        }
    };

    const handleClassSelect = (classData: ClassData) => {
        setSelectedClass(classData);
        setSelectedStudent(null);
        setStudentScores([]);
        fetchStudents(classData.id);
    };

    const handleStudentSelect = (student: StudentData) => {
        setSelectedStudent(student);
        fetchStudentScores(student.child_name, student.child_age_months);
    };

    const handleAddClass = async () => {
        if (!newClassName.trim()) return;

        if (!isPremium && classes.length >= 1) {
            alert('Free hesapla sadece 1 sınıf oluşturabilirsiniz. Premium\'a yükseltin!');
            return;
        }

        if (teacherId === 'demo-teacher') {
            setClasses([...classes, {
                id: `demo-class-${Date.now()}`,
                name: newClassName,
                studentCount: 0,
            }]);
            setNewClassName('');
            setShowAddClassModal(false);
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/classes`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY!,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                    teacher_id: teacherId,
                    name: newClassName,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setClasses([...classes, { id: data[0].id, name: data[0].name, studentCount: 0 }]);
                setNewClassName('');
                setShowAddClassModal(false);
            }
        } catch (error) {
            console.error('Sınıf oluşturulurken hata:', error);
        }
    };

    const handleAddStudent = async () => {
        if (!newStudentEmail.trim() || !selectedClass) return;

        if (!isPremium && students.length >= 10) {
            alert('Free hesapla sınıfa en fazla 10 öğrenci ekleyebilirsiniz. Premium\'a yükseltin!');
            return;
        }

        if (teacherId === 'demo-teacher') {
            setStudents([...students, {
                id: `demo-student-${Date.now()}`,
                child_name: newStudentEmail.split('@')[0],
                child_age_months: 48,
                email: newStudentEmail,
                gameCount: 0,
            }]);
            setNewStudentEmail('');
            setShowAddStudentModal(false);
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/class_students`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY!,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    child_email: newStudentEmail,
                }),
            });

            if (response.ok) {
                fetchStudents(selectedClass.id);
                setNewStudentEmail('');
                setShowAddStudentModal(false);
            }
        } catch (error) {
            console.error('Öğrenci eklenirken hata:', error);
        }
    };

    const analyzeScore = async (score: GameScore) => {
        if (!isPremium) {
            alert('AI Analizi sadece Premium hesaplar için kullanılabilir.');
            return;
        }

        if (!GEMINI_API_KEY) {
            alert('Gemini API anahtarı bulunamadı.');
            return;
        }

        setAnalyzingId(score.id);

        try {
            // Öğretmen/Akademisyen odaklı prompt
            const prompt = `
Sen, Türkiye Yüzyılı Maarif Modeli'ne hakim bir Okul Öncesi Eğitim Uzmanısın.
Bu analiz bir ÖĞRETMEN için hazırlanıyor. Veli bilgilendirme notu EKLEME.

## VERİLER:
- Öğrenci: ${selectedStudent?.child_name} (${selectedStudent?.child_age_months} ay)
- Oyun: ${score.oyun_turu}
- Süre: ${score.sure || 0} sn | Hamle: ${score.hamle_sayisi} | Hata: ${score.hata_sayisi}

## ÇIKTI FORMATI (Akademik):

**PEDAGOJİK ANALİZ**

**Maarif Kodu:** [Uygun MAB/FAB/TAKB kodu]

**Bilişsel Süreç Değerlendirmesi:**
[Çocuğun bilişsel süreçlerini analiz et]

**Sınıf İçi Öneriler:**
- [Öğretmenin sınıfta yapabileceği müdahaleler]
- [Bireysel çalışma önerileri]

**Gelişimsel Not:**
[Kısa gelişimsel değerlendirme]
            `;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
                    }),
                }
            );

            const data = await response.json();
            const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Analiz yapılamadı.';

            // Skoru güncelle
            setStudentScores(prev => prev.map(s =>
                s.id === score.id ? { ...s, yapay_zeka_yorumu: analysisText } : s
            ));

            // Supabase'e kaydet (opsiyonel, demo için atla)
            if (teacherId !== 'demo-teacher') {
                await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${score.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY!,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ yapay_zeka_yorumu: analysisText }),
                });
            }
        } catch (error) {
            console.error('AI Analizi hatası:', error);
            alert('Analiz sırasında bir hata oluştu.');
        } finally {
            setAnalyzingId(null);
        }
    };

    const getOyunAdi = (oyunTuru: string): string => {
        const oyunMap: Record<string, string> = {
            'hafiza': 'Çiftini Bul!',
            'siralama': 'Sıralama',
            'gruplama': 'Gruplama',
            'kodlama': 'Minik Kaşif',
            'yapboz': 'Yapboz',
            'bunu-soyle': 'Bunu Söyle!',
            'golge-dedektifi': 'Gölge Dedektifi',
            'sihirli-tuval': 'Sihirli Tuval',
            'uzay-bloklari': 'Uzay Blokları',
        };
        return oyunMap[oyunTuru] || oyunTuru;
    };

    // Render functions
    const renderClassCard = (classData: ClassData) => (
        <TouchableOpacity
            key={classData.id}
            style={[
                styles.classCard,
                selectedClass?.id === classData.id && styles.classCardSelected
            ]}
            onPress={() => handleClassSelect(classData)}
        >
            <Text style={styles.classIcon}>🏫</Text>
            <Text style={styles.className}>{classData.name}</Text>
            <Text style={styles.classStudentCount}>{classData.studentCount} öğrenci</Text>
        </TouchableOpacity>
    );

    const renderStudentRow = (student: StudentData) => (
        <TouchableOpacity
            key={student.id}
            style={[
                styles.studentRow,
                selectedStudent?.id === student.id && styles.studentRowSelected
            ]}
            onPress={() => handleStudentSelect(student)}
        >
            <Text style={styles.studentEmoji}>{student.child_age_months < 48 ? '👶' : '👦'}</Text>
            <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.child_name}</Text>
                <Text style={styles.studentAge}>{student.child_age_months} ay</Text>
            </View>
            <View style={styles.studentGameCount}>
                <Text style={styles.gameCountText}>{student.gameCount} oyun</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
        </TouchableOpacity>
    );

    const renderScoreCard = (score: GameScore) => (
        <View key={score.id} style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
                <Text style={styles.scoreGameName}>{getOyunAdi(score.oyun_turu)}</Text>
                <Text style={styles.scoreDate}>
                    {new Date(score.created_at).toLocaleDateString('tr-TR')}
                </Text>
            </View>

            <View style={styles.scoreStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{score.sure || 0}s</Text>
                    <Text style={styles.statLabel}>Süre</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{score.hamle_sayisi}</Text>
                    <Text style={styles.statLabel}>Hamle</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, score.hata_sayisi > 3 && { color: '#F44336' }]}>
                        {score.hata_sayisi}
                    </Text>
                    <Text style={styles.statLabel}>Hata</Text>
                </View>
            </View>

            {/* AI Analiz Butonu */}
            {isPremium && (
                <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={() => analyzeScore(score)}
                    disabled={analyzingId === score.id}
                >
                    {analyzingId === score.id ? (
                        <ActivityIndicator size="small" color="#FF9800" />
                    ) : (
                        <>
                            <Ionicons name="sparkles" size={16} color="#FF9800" />
                            <Text style={styles.analyzeButtonText}>AI Analiz</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {/* AI Yorumu */}
            {score.yapay_zeka_yorumu && (
                <View style={styles.aiCommentBox}>
                    <Text style={styles.aiCommentTitle}>🎓 Pedagojik Analiz</Text>
                    <Text style={styles.aiCommentText}>{score.yapay_zeka_yorumu}</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <DynamicBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF9800" />
                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="arrow-back" size={24} color="#FF9800" />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>👩‍🏫 {teacherName}</Text>
                        <Text style={styles.headerSubtitle}>{schoolName || teacherEmail}</Text>
                    </View>
                    <View style={[styles.tierBadge, isPremium && styles.tierBadgePremium]}>
                        <Text style={[styles.tierText, isPremium && styles.tierTextPremium]}>
                            {isPremium ? '⭐ Premium' : 'Free'}
                        </Text>
                    </View>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Sınıflar Bölümü */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>📚 Sınıflarım</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => setShowAddClassModal(true)}
                            >
                                <Ionicons name="add-circle" size={28} color="#FF9800" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classesRow}>
                            {classes.map(renderClassCard)}
                        </ScrollView>
                    </View>

                    {/* Öğrenciler Bölümü */}
                    {selectedClass && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    👨‍👩‍👧‍👦 {selectedClass.name} Öğrencileri
                                </Text>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => setShowAddStudentModal(true)}
                                >
                                    <Ionicons name="person-add" size={24} color="#FF9800" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.studentsList}>
                                {students.length === 0 ? (
                                    <Text style={styles.emptyText}>Henüz öğrenci eklenmemiş</Text>
                                ) : (
                                    students.map(renderStudentRow)
                                )}
                            </View>
                        </View>
                    )}

                    {/* Öğrenci Detayları */}
                    {selectedStudent && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                📊 {selectedStudent.child_name}'in Oyun Geçmişi
                            </Text>

                            {!isPremium && (
                                <View style={styles.premiumBanner}>
                                    <Ionicons name="lock-closed" size={20} color="#FF9800" />
                                    <Text style={styles.premiumBannerText}>
                                        AI Analizi ve detaylı grafikler için Premium'a yükseltin
                                    </Text>
                                </View>
                            )}

                            <View style={styles.scoresList}>
                                {studentScores.length === 0 ? (
                                    <Text style={styles.emptyText}>Henüz oyun kaydı yok</Text>
                                ) : (
                                    studentScores.map(renderScoreCard)
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Sınıf Ekleme Modal */}
                <Modal visible={showAddClassModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>🏫 Yeni Sınıf Oluştur</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Sınıf adı (ör: A Sınıfı)"
                                value={newClassName}
                                onChangeText={setNewClassName}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowAddClassModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>İptal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalConfirmButton}
                                    onPress={handleAddClass}
                                >
                                    <Text style={styles.modalConfirmText}>Oluştur</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Öğrenci Ekleme Modal */}
                <Modal visible={showAddStudentModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>👦 Öğrenci Ekle</Text>
                            <Text style={styles.modalSubtitle}>
                                Velinin kayıt olduğu email adresini girin
                            </Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Veli email adresi"
                                value={newStudentEmail}
                                onChangeText={setNewStudentEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowAddStudentModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>İptal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalConfirmButton}
                                    onPress={handleAddStudent}
                                >
                                    <Text style={styles.modalConfirmText}>Ekle</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#607D8B',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'web' ? 16 : 50,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#263238',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#607D8B',
    },
    tierBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#E0E0E0',
    },
    tierBadgePremium: {
        backgroundColor: '#FFF3E0',
    },
    tierText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#757575',
    },
    tierTextPremium: {
        color: '#FF9800',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#263238',
    },
    addButton: {
        padding: 4,
    },
    classesRow: {
        flexDirection: 'row',
    },
    classCard: {
        width: 120,
        padding: 16,
        marginRight: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    classCardSelected: {
        borderColor: '#FF9800',
        backgroundColor: '#FFF3E0',
    },
    classIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    className: {
        fontSize: 14,
        fontWeight: '600',
        color: '#263238',
    },
    classStudentCount: {
        fontSize: 12,
        color: '#607D8B',
        marginTop: 4,
    },
    studentsList: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    studentRowSelected: {
        backgroundColor: '#FFF3E0',
    },
    studentEmoji: {
        fontSize: 28,
        marginRight: 12,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#263238',
    },
    studentAge: {
        fontSize: 13,
        color: '#607D8B',
    },
    studentGameCount: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        marginRight: 8,
    },
    gameCountText: {
        fontSize: 12,
        color: '#1976D2',
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9E9E9E',
        padding: 24,
    },
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    premiumBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#E65100',
    },
    scoresList: {
        gap: 12,
    },
    scoreCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    scoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    scoreGameName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#263238',
    },
    scoreDate: {
        fontSize: 12,
        color: '#9E9E9E',
    },
    scoreStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    statLabel: {
        fontSize: 12,
        color: '#607D8B',
    },
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E0',
        padding: 10,
        borderRadius: 12,
        gap: 6,
    },
    analyzeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF9800',
    },
    aiCommentBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#FF9800',
    },
    aiCommentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#263238',
        marginBottom: 8,
    },
    aiCommentText: {
        fontSize: 13,
        color: '#424242',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#263238',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#607D8B',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#757575',
    },
    modalConfirmButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#FF9800',
        alignItems: 'center',
    },
    modalConfirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
