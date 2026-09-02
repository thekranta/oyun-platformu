import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase';
import { requestGeminiAnalysis } from '../services/geminiClient';
import { asset } from '../lib/assetMap';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// RLS'in auth.uid() gormesi icin REST cagrilarinda anon key yerine oturum jetonu kullan.
// Jeton yoksa anon key'e duser (akis kirilmaz).
const getSessionToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || SUPABASE_KEY || '';
};

// Web-compatible alert
const showAlert = (title: string, message: string, buttons?: Array<{ text: string, onPress?: () => void, style?: string }>) => {
    if (Platform.OS === 'web') {
        if (buttons && buttons.length > 1) {
            const result = window.confirm(`${title}\n\n${message}`);
            if (result) {
                const action = buttons.find(b => b.style !== 'cancel');
                action?.onPress?.();
            }
        } else {
            window.alert(`${title}\n\n${message}`);
        }
    } else {
        Alert.alert(title, message, buttons as any);
    }
};

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
    emoji: string;
}

interface StudentData {
    id: string;
    child_name: string;
    child_age_months: number;
    email: string;
    gameCount: number;
}

interface StudentPreview {
    child_name: string;
    child_age_months: number;
    email: string;
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

const CLASS_EMOJIS = ['🌸', '🌺', '🌻', '🌷', '🌹', '🍀', '🦋', '🐝', '🌈', '⭐'];

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
    const [studentPreview, setStudentPreview] = useState<StudentPreview | null>(null);
    const [searchingStudent, setSearchingStudent] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);

    const isPremium = subscriptionTier === 'premium';
    const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);

    useEffect(() => {
        if (teacherId === 'demo-teacher') {
            setClasses([
                { id: 'demo-class-1', name: 'Papatyalar', studentCount: 12, emoji: '🌸' },
                { id: 'demo-class-2', name: 'Kelebekler', studentCount: 8, emoji: '🦋' },
                { id: 'demo-class-3', name: 'Yıldızlar', studentCount: 15, emoji: '⭐' },
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
                { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` } }
            );
            const data = await response.json();
            if (Array.isArray(data)) {
                const classesWithCount = await Promise.all(data.map(async (c: any, idx: number) => {
                    const countResp = await fetch(
                        `${SUPABASE_URL}/rest/v1/class_students?class_id=eq.${c.id}&select=id`,
                        { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` } }
                    );
                    const countData = await countResp.json();
                    return {
                        id: c.id,
                        name: c.name,
                        studentCount: Array.isArray(countData) ? countData.length : 0,
                        emoji: CLASS_EMOJIS[idx % CLASS_EMOJIS.length],
                    };
                }));
                setClasses(classesWithCount);
            }
        } catch (error) {
            console.error('Sınıflar yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (classId: string) => {
        if (teacherId === 'demo-teacher') {
            setStudents([
                { id: '1', child_name: 'Ahmet', child_age_months: 48, email: 'ahmet@test.com', gameCount: 15 },
                { id: '2', child_name: 'Ayşe', child_age_months: 52, email: 'ayse@test.com', gameCount: 23 },
                { id: '3', child_name: 'Mehmet', child_age_months: 45, email: 'mehmet@test.com', gameCount: 8 },
                { id: '4', child_name: 'Zeynep', child_age_months: 60, email: 'zeynep@test.com', gameCount: 31 },
            ]);
            return;
        }

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/class_students?class_id=eq.${classId}&select=child_email`,
                { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` } }
            );
            const classStudents = await response.json();

            if (Array.isArray(classStudents) && classStudents.length > 0) {
                const emails = classStudents.map((s: any) => s.child_email);
                const profilesResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/profiles?email=in.(${emails.map(e => `"${e}"`).join(',')})`,
                    { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` } }
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
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error('Öğrenciler yüklenirken hata:', error);
        }
    };

    const searchStudentByEmail = async (email: string) => {
        if (!email.includes('@')) {
            setStudentPreview(null);
            return;
        }
        setSearchingStudent(true);
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`,
                { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` } }
            );
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                setStudentPreview({
                    child_name: data[0].child_name,
                    child_age_months: data[0].child_age_months,
                    email: data[0].email,
                });
            } else {
                setStudentPreview(null);
            }
        } catch (error) {
            console.error('Öğrenci aranırken hata:', error);
        } finally {
            setSearchingStudent(false);
        }
    };

    const fetchStudentScores = async (studentName: string, studentAge: number) => {
        if (teacherId === 'demo-teacher') {
            setStudentScores([
                { id: 1, created_at: new Date().toISOString(), oyun_turu: 'hafiza', hamle_sayisi: 12, hata_sayisi: 2, sure: 45 },
                { id: 2, created_at: new Date(Date.now() - 86400000).toISOString(), oyun_turu: 'siralama', hamle_sayisi: 8, hata_sayisi: 1, sure: 32 },
            ]);
            return;
        }

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/oyun_skorlari?ogrenci_adi=eq.${encodeURIComponent(studentName)}&ogrenci_yasi=eq.${studentAge}&order=created_at.desc&limit=20`,
                { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` } }
            );
            const data = await response.json();
            if (Array.isArray(data)) setStudentScores(data);
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
            showAlert('Premium Gerekli', 'Free hesapla sadece 1 sınıf oluşturabilirsiniz.');
            return;
        }

        if (teacherId === 'demo-teacher') {
            const newClass = {
                id: `demo-${Date.now()}`,
                name: newClassName,
                studentCount: 0,
                emoji: CLASS_EMOJIS[classes.length % CLASS_EMOJIS.length],
            };
            setClasses([...classes, newClass]);
            setNewClassName('');
            setShowAddClassModal(false);
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/classes`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY!,
                    'Authorization': `Bearer ${await getSessionToken()}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({ teacher_id: teacherId, name: newClassName }),
            });

            if (response.ok) {
                fetchClasses();
                setNewClassName('');
                setShowAddClassModal(false);
            }
        } catch (error) {
            console.error('Sınıf oluşturulurken hata:', error);
        }
    };

    const handleDeleteClass = (classData: ClassData) => {
        showAlert(
            'Sınıfı Sil',
            `"${classData.name}" sınıfını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        if (teacherId === 'demo-teacher') {
                            setClasses(classes.filter(c => c.id !== classData.id));
                            if (selectedClass?.id === classData.id) {
                                setSelectedClass(null);
                                setStudents([]);
                            }
                            return;
                        }

                        try {
                            await fetch(`${SUPABASE_URL}/rest/v1/classes?id=eq.${classData.id}`, {
                                method: 'DELETE',
                                headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` },
                            });
                            fetchClasses();
                            if (selectedClass?.id === classData.id) {
                                setSelectedClass(null);
                                setStudents([]);
                            }
                        } catch (error) {
                            console.error('Sınıf silinirken hata:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleAddStudent = async () => {
        if (!newStudentEmail.trim() || !selectedClass) return;
        if (!studentPreview) {
            showAlert('Hata', 'Bu email ile kayıtlı öğrenci bulunamadı.');
            return;
        }
        if (!isPremium && students.length >= 10) {
            showAlert('Premium Gerekli', 'Free hesapla sınıfa en fazla 10 öğrenci ekleyebilirsiniz.');
            return;
        }

        if (teacherId === 'demo-teacher') {
            setStudents([...students, {
                id: `demo-${Date.now()}`,
                child_name: studentPreview.child_name,
                child_age_months: studentPreview.child_age_months,
                email: studentPreview.email,
                gameCount: 0,
            }]);
            setNewStudentEmail('');
            setStudentPreview(null);
            setShowAddStudentModal(false);
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/class_students`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY!,
                    'Authorization': `Bearer ${await getSessionToken()}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({ class_id: selectedClass.id, child_email: newStudentEmail }),
            });

            if (response.ok) {
                fetchStudents(selectedClass.id);
                setNewStudentEmail('');
                setStudentPreview(null);
                setShowAddStudentModal(false);
            }
        } catch (error) {
            console.error('Öğrenci eklenirken hata:', error);
        }
    };

    const handleRemoveStudent = (student: StudentData) => {
        showAlert(
            'Öğrenciyi Çıkar',
            `"${student.child_name}" adlı öğrenciyi sınıftan çıkarmak istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Çıkar',
                    style: 'destructive',
                    onPress: async () => {
                        if (teacherId === 'demo-teacher') {
                            setStudents(students.filter(s => s.id !== student.id));
                            if (selectedStudent?.id === student.id) {
                                setSelectedStudent(null);
                                setStudentScores([]);
                            }
                            return;
                        }

                        try {
                            await fetch(
                                `${SUPABASE_URL}/rest/v1/class_students?class_id=eq.${selectedClass?.id}&child_email=eq.${encodeURIComponent(student.email)}`,
                                {
                                    method: 'DELETE',
                                    headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${await getSessionToken()}` },
                                }
                            );
                            if (selectedClass) fetchStudents(selectedClass.id);
                            if (selectedStudent?.id === student.id) {
                                setSelectedStudent(null);
                                setStudentScores([]);
                            }
                        } catch (error) {
                            console.error('Öğrenci çıkarılırken hata:', error);
                        }
                    },
                },
            ]
        );
    };

    const analyzeScore = async (score: GameScore) => {
        if (!isPremium) {
            showAlert('Premium Özellik', 'AI Analizi sadece Premium hesaplar için kullanılabilir.');
            return;
        }
        setAnalyzingId(score.id);
        try {
            const prompt = `Sen okul öncesi eğitim uzmanısın. Öğrenci: ${selectedStudent?.child_name} (${selectedStudent?.child_age_months} ay). Oyun: ${score.oyun_turu}, Süre: ${score.sure}sn, Hamle: ${score.hamle_sayisi}, Hata: ${score.hata_sayisi}. Kısa pedagojik analiz yap (3-4 cümle).`;
            const text = await requestGeminiAnalysis(prompt, { temperature: 0.7, maxOutputTokens: 256 })
                .catch(() => 'Analiz yapılamadı.');
            setStudentScores(prev => prev.map(s => s.id === score.id ? { ...s, yapay_zeka_yorumu: text } : s));
        } catch (error) {
            console.error('AI hatası:', error);
        } finally {
            setAnalyzingId(null);
        }
    };

    const getOyunAdi = (turu: string): string => {
        const map: Record<string, string> = {
            'hafiza': '🧠 Çiftini Bul', 'siralama': '🔢 Sıralama', 'gruplama': '📦 Gruplama',
            'kodlama': '🚀 Minik Kaşif', 'yapboz': '🧩 Yapboz', 'bunu-soyle': '🎤 Bunu Söyle',
            'golge-dedektifi': '🔍 Gölge Dedektifi', 'sihirli-tuval': '🎨 Sihirli Tuval',
            'uzay-bloklari': '🌟 Uzay Blokları',
        };
        return map[turu] || turu;
    };

    const getAgeText = (months: number) => {
        const years = Math.floor(months / 12);
        const m = months % 12;
        return m > 0 ? `${years} yaş ${m} ay` : `${years} yaş`;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Image source={asset('/images/icon.png')} style={styles.loadingLogo} resizeMode="contain" />
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FF6B6B" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerEmoji}>👩‍🏫</Text>
                    <View>
                        <Text style={styles.headerName}>Merhaba, {teacherName.split(' ')[0]}!</Text>
                        <Text style={styles.headerSchool}>{schoolName || 'Öğretmen Paneli'}</Text>
                    </View>
                </View>
                <View style={[styles.tierBadge, isPremium && styles.tierBadgePremium]}>
                    <Text style={styles.tierEmoji}>{isPremium ? '⭐' : '🆓'}</Text>
                    <Text style={[styles.tierText, isPremium && styles.tierTextPremium]}>
                        {isPremium ? 'Premium' : 'Free'}
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, styles.statCardPink]}>
                        <Text style={styles.statEmoji}>🏫</Text>
                        <Text style={styles.statValue}>{classes.length}</Text>
                        <Text style={styles.statLabel}>Sınıf</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardBlue]}>
                        <Text style={styles.statEmoji}>👦</Text>
                        <Text style={styles.statValue}>{totalStudents}</Text>
                        <Text style={styles.statLabel}>Öğrenci</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardGreen]}>
                        <Text style={styles.statEmoji}>🎮</Text>
                        <Text style={styles.statValue}>{students.reduce((s, st) => s + st.gameCount, 0)}</Text>
                        <Text style={styles.statLabel}>Oyun</Text>
                    </View>
                </View>

                {/* Classes Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🌈 Sınıflarım</Text>
                        <TouchableOpacity style={styles.addClassBtn} onPress={() => setShowAddClassModal(true)}>
                            <Ionicons name="add-circle" size={32} color="#FF6B6B" />
                        </TouchableOpacity>
                    </View>

                    {classes.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyEmoji}>🏫</Text>
                            <Text style={styles.emptyTitle}>Henüz sınıf yok</Text>
                            <Text style={styles.emptyText}>İlk sınıfınızı oluşturun!</Text>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classesScroll}>
                            {classes.map((c) => (
                                <View key={c.id} style={styles.classCardWrapper}>
                                    <TouchableOpacity
                                        style={[styles.classCard, selectedClass?.id === c.id && styles.classCardSelected]}
                                        onPress={() => handleClassSelect(c)}
                                    >
                                        <Text style={styles.classEmoji}>{c.emoji}</Text>
                                        <Text style={styles.className}>{c.name}</Text>
                                        <Text style={styles.classCount}>{c.studentCount} çocuk</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteClassBtn}
                                        onPress={() => handleDeleteClass(c)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Students Section */}
                {selectedClass && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {selectedClass.emoji} {selectedClass.name} Öğrencileri
                            </Text>
                            <TouchableOpacity style={styles.addStudentBtn} onPress={() => setShowAddStudentModal(true)}>
                                <Ionicons name="person-add" size={24} color="#4ECDC4" />
                            </TouchableOpacity>
                        </View>

                        {students.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyEmoji}>👦</Text>
                                <Text style={styles.emptyTitle}>Henüz öğrenci yok</Text>
                                <Text style={styles.emptyText}>Sınıfa öğrenci ekleyin!</Text>
                            </View>
                        ) : (
                            <View style={styles.studentsList}>
                                {students.map((s) => (
                                    <View key={s.id} style={styles.studentCardWrapper}>
                                        <TouchableOpacity
                                            style={[styles.studentCard, selectedStudent?.id === s.id && styles.studentCardSelected]}
                                            onPress={() => handleStudentSelect(s)}
                                        >
                                            <View style={styles.studentAvatar}>
                                                <Text style={styles.studentAvatarText}>
                                                    {s.child_age_months < 48 ? '👶' : s.child_age_months < 60 ? '👦' : '🧒'}
                                                </Text>
                                            </View>
                                            <View style={styles.studentInfo}>
                                                <Text style={styles.studentName}>{s.child_name}</Text>
                                                <Text style={styles.studentAge}>{getAgeText(s.child_age_months)}</Text>
                                            </View>
                                            <View style={styles.gamesBadge}>
                                                <Text style={styles.gamesBadgeText}>🎮 {s.gameCount}</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.removeStudentBtn}
                                            onPress={() => handleRemoveStudent(s)}
                                        >
                                            <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Student Details */}
                {selectedStudent && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📊 {selectedStudent.child_name} - Oyun Geçmişi</Text>

                        {!isPremium && (
                            <View style={styles.premiumBanner}>
                                <Text style={styles.premiumBannerEmoji}>🔒</Text>
                                <Text style={styles.premiumBannerText}>AI Analizi için Premium'a yükseltin!</Text>
                            </View>
                        )}

                        {studentScores.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyEmoji}>🎮</Text>
                                <Text style={styles.emptyText}>Henüz oyun kaydı yok</Text>
                            </View>
                        ) : (
                            studentScores.map((score) => (
                                <View key={score.id} style={styles.scoreCard}>
                                    <View style={styles.scoreHeader}>
                                        <Text style={styles.scoreGame}>{getOyunAdi(score.oyun_turu)}</Text>
                                        <Text style={styles.scoreDate}>
                                            {new Date(score.created_at).toLocaleDateString('tr-TR')}
                                        </Text>
                                    </View>
                                    <View style={styles.scoreStats}>
                                        <View style={styles.scoreStat}>
                                            <Text style={styles.scoreStatEmoji}>⏱️</Text>
                                            <Text style={styles.scoreStatValue}>{score.sure || 0}s</Text>
                                        </View>
                                        <View style={styles.scoreStat}>
                                            <Text style={styles.scoreStatEmoji}>👆</Text>
                                            <Text style={styles.scoreStatValue}>{score.hamle_sayisi}</Text>
                                        </View>
                                        <View style={styles.scoreStat}>
                                            <Text style={styles.scoreStatEmoji}>❌</Text>
                                            <Text style={[styles.scoreStatValue, score.hata_sayisi > 3 && styles.errorText]}>
                                                {score.hata_sayisi}
                                            </Text>
                                        </View>
                                    </View>
                                    {isPremium && (
                                        <TouchableOpacity
                                            style={styles.analyzeBtn}
                                            onPress={() => analyzeScore(score)}
                                            disabled={analyzingId === score.id}
                                        >
                                            {analyzingId === score.id ? (
                                                <ActivityIndicator size="small" color="#FF6B6B" />
                                            ) : (
                                                <>
                                                    <Text style={styles.analyzeBtnEmoji}>✨</Text>
                                                    <Text style={styles.analyzeBtnText}>AI Analiz</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    {score.yapay_zeka_yorumu && (
                                        <View style={styles.aiResult}>
                                            <Text style={styles.aiResultTitle}>🎓 Pedagojik Analiz</Text>
                                            <Text style={styles.aiResultText}>{score.yapay_zeka_yorumu}</Text>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* ================== ERROR DISTRIBUTION CHART ================== */}
                {selectedStudent && studentScores.length >= 3 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📊 Hata Dağılımı Analizi</Text>

                        {(() => {
                            // Calculate error distribution per game type
                            const errorByGame: Record<string, { total: number; errors: number; count: number }> = {};

                            studentScores.forEach(score => {
                                const game = score.oyun_turu || 'diger';
                                if (!errorByGame[game]) {
                                    errorByGame[game] = { total: 0, errors: 0, count: 0 };
                                }
                                errorByGame[game].errors += score.hata_sayisi || 0;
                                errorByGame[game].total += score.hamle_sayisi || 0;
                                errorByGame[game].count += 1;
                            });

                            const gameEntries = Object.entries(errorByGame)
                                .map(([game, data]) => ({
                                    game,
                                    errorRate: data.total > 0 ? Math.round((data.errors / data.total) * 100) : 0,
                                    avgErrors: Math.round(data.errors / data.count * 10) / 10,
                                    count: data.count,
                                }))
                                .sort((a, b) => b.errorRate - a.errorRate);

                            const maxRate = Math.max(...gameEntries.map(e => e.errorRate), 1);
                            const colors = ['#FF6B6B', '#F7B731', '#4ECDC4', '#A8E6CF', '#9B59B6'];

                            return (
                                <View style={styles.errorChartCard}>
                                    {gameEntries.slice(0, 5).map((entry, idx) => {
                                        const barWidth = (entry.errorRate / maxRate) * 100;
                                        const gameName = getOyunAdi(entry.game);

                                        return (
                                            <View key={entry.game} style={styles.errorBarRow}>
                                                <View style={styles.errorBarLabel}>
                                                    <Text style={styles.errorBarGame}>{gameName}</Text>
                                                    <Text style={styles.errorBarCount}>({entry.count} oyun)</Text>
                                                </View>
                                                <View style={styles.errorBarContainer}>
                                                    <View style={[
                                                        styles.errorBar,
                                                        {
                                                            width: `${barWidth}%`,
                                                            backgroundColor: entry.errorRate > 30 ? '#FF6B6B' : entry.errorRate > 15 ? '#F7B731' : '#4ECDC4'
                                                        }
                                                    ]} />
                                                </View>
                                                <View style={styles.errorBarValue}>
                                                    <Text style={[
                                                        styles.errorBarPercent,
                                                        entry.errorRate > 30 && { color: '#FF6B6B' }
                                                    ]}>
                                                        {entry.errorRate}%
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}

                                    {/* Legend */}
                                    <View style={styles.errorLegend}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
                                            <Text style={styles.legendText}>Düşük (0-15%)</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#F7B731' }]} />
                                            <Text style={styles.legendText}>Orta (15-30%)</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                                            <Text style={styles.legendText}>Yüksek (30%+)</Text>
                                        </View>
                                    </View>

                                    {/* Intervention Hint */}
                                    {gameEntries.find(e => e.errorRate > 30) && (
                                        <View style={styles.interventionHint}>
                                            <Text style={styles.interventionEmoji}>💡</Text>
                                            <Text style={styles.interventionText}>
                                                Yüksek hata oranı, zorluk seviyesi ayarı veya ek destek gerektirebilir.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })()}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Class Modal */}
            <Modal visible={showAddClassModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalEmoji}>🏫</Text>
                        <Text style={styles.modalTitle}>Yeni Sınıf Oluştur</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Sınıf adı (ör: Kelebekler)"
                            placeholderTextColor="#999"
                            value={newClassName}
                            onChangeText={setNewClassName}
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddClassModal(false)}>
                                <Text style={styles.modalCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddClass}>
                                <Text style={styles.modalConfirmText}>✨ Oluştur</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Student Modal */}
            <Modal visible={showAddStudentModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalEmoji}>👦</Text>
                        <Text style={styles.modalTitle}>Öğrenci Ekle</Text>
                        <Text style={styles.modalSubtitle}>Velinin sisteme kayıt olduğu email</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="ornek@email.com"
                            placeholderTextColor="#999"
                            value={newStudentEmail}
                            onChangeText={(text) => {
                                setNewStudentEmail(text);
                                if (text.includes('@') && text.length > 5) searchStudentByEmail(text);
                                else setStudentPreview(null);
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {searchingStudent && (
                            <View style={styles.searchingRow}>
                                <ActivityIndicator size="small" color="#4ECDC4" />
                                <Text style={styles.searchingText}>Aranıyor...</Text>
                            </View>
                        )}
                        {studentPreview && (
                            <View style={styles.previewCard}>
                                <Text style={styles.previewEmoji}>✅</Text>
                                <View>
                                    <Text style={styles.previewName}>{studentPreview.child_name}</Text>
                                    <Text style={styles.previewAge}>{getAgeText(studentPreview.child_age_months)}</Text>
                                </View>
                            </View>
                        )}
                        {newStudentEmail.includes('@') && !searchingStudent && !studentPreview && newStudentEmail.length > 5 && (
                            <View style={styles.notFoundCard}>
                                <Text style={styles.notFoundEmoji}>❌</Text>
                                <Text style={styles.notFoundText}>Kayıtlı öğrenci bulunamadı</Text>
                            </View>
                        )}
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => { setShowAddStudentModal(false); setStudentPreview(null); setNewStudentEmail(''); }}
                            >
                                <Text style={styles.modalCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, !studentPreview && styles.modalConfirmBtnDisabled]}
                                onPress={handleAddStudent}
                                disabled={!studentPreview}
                            >
                                <Text style={styles.modalConfirmText}>➕ Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF9F0' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF9F0' },
    loadingEmoji: { fontSize: 64, marginBottom: 20 },
    loadingLogo: { width: 80, height: 80, borderRadius: 18, marginBottom: 20 },
    loadingText: { marginTop: 16, fontSize: 18, color: '#666', fontWeight: '500' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        paddingTop: Platform.OS === 'web' ? 20 : 54,
        backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#FFE5E5',
    },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 12 },
    headerEmoji: { fontSize: 40 },
    headerName: { fontSize: 20, fontWeight: '700', color: '#333' },
    headerSchool: { fontSize: 14, color: '#888' },
    tierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
    tierBadgePremium: { backgroundColor: '#FFF3CD' },
    tierEmoji: { fontSize: 16 },
    tierText: { fontSize: 13, fontWeight: '600', color: '#666' },
    tierTextPremium: { color: '#D4A000' },

    content: { flex: 1, padding: 16 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' },
    statCardPink: { backgroundColor: '#FFE5E5' },
    statCardBlue: { backgroundColor: '#E5F3FF' },
    statCardGreen: { backgroundColor: '#E5FFE5' },
    statEmoji: { fontSize: 28, marginBottom: 6 },
    statValue: { fontSize: 28, fontWeight: '800', color: '#333' },
    statLabel: { fontSize: 13, color: '#666', marginTop: 2 },

    // Section
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
    addClassBtn: { padding: 4 },
    addStudentBtn: { padding: 4 },

    // Classes
    classesScroll: { marginHorizontal: -8 },
    classCardWrapper: { position: 'relative', marginHorizontal: 8 },
    classCard: {
        width: 130, padding: 18, backgroundColor: '#fff', borderRadius: 24,
        alignItems: 'center', borderWidth: 3, borderColor: '#FFE5E5',
        shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
    classCardSelected: { borderColor: '#FF6B6B', backgroundColor: '#FFF5F5' },
    classEmoji: { fontSize: 40, marginBottom: 8 },
    className: { fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' },
    classCount: { fontSize: 13, color: '#888', marginTop: 4 },
    deleteClassBtn: {
        position: 'absolute', top: -6, right: -6, width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFE5E5',
    },

    // Students
    studentsList: { gap: 10 },
    studentCardWrapper: { position: 'relative' },
    studentCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14,
        borderRadius: 18, borderWidth: 2, borderColor: '#E5F3FF',
        shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    studentCardSelected: { borderColor: '#4ECDC4', backgroundColor: '#F0FFFF' },
    studentAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFE5E5', justifyContent: 'center', alignItems: 'center' },
    studentAvatarText: { fontSize: 26 },
    studentInfo: { flex: 1, marginLeft: 14 },
    studentName: { fontSize: 17, fontWeight: '600', color: '#333' },
    studentAge: { fontSize: 13, color: '#888', marginTop: 2 },
    gamesBadge: { backgroundColor: '#E5FFE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
    gamesBadgeText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
    removeStudentBtn: { position: 'absolute', top: -8, right: -8 },

    // Empty
    emptyCard: { backgroundColor: '#fff', padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 2, borderColor: '#F0F0F0', borderStyle: 'dashed' },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
    emptyText: { fontSize: 14, color: '#888' },

    // Premium Banner
    premiumBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3CD', padding: 14, borderRadius: 16, marginBottom: 16, gap: 10 },
    premiumBannerEmoji: { fontSize: 20 },
    premiumBannerText: { fontSize: 14, color: '#856404', fontWeight: '500' },

    // Score Card
    scoreCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 2, borderColor: '#F0F0F0' },
    scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    scoreGame: { fontSize: 16, fontWeight: '600', color: '#333' },
    scoreDate: { fontSize: 13, color: '#999' },
    scoreStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
    scoreStat: { alignItems: 'center' },
    scoreStatEmoji: { fontSize: 20, marginBottom: 4 },
    scoreStatValue: { fontSize: 20, fontWeight: '700', color: '#333' },
    errorText: { color: '#FF6B6B' },
    analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F0', padding: 12, borderRadius: 14, gap: 8 },
    analyzeBtnEmoji: { fontSize: 18 },
    analyzeBtnText: { fontSize: 15, fontWeight: '600', color: '#FF6B6B' },
    aiResult: { marginTop: 14, padding: 14, backgroundColor: '#F8F9FA', borderRadius: 14, borderLeftWidth: 4, borderLeftColor: '#4ECDC4' },
    aiResultTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    aiResultText: { fontSize: 14, color: '#555', lineHeight: 22 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center' },
    modalEmoji: { fontSize: 56, marginBottom: 12 },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
    modalInput: { width: '100%', backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, fontSize: 16, color: '#333', marginBottom: 16, borderWidth: 2, borderColor: '#F0F0F0' },
    modalBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
    modalCancelBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#F0F0F0', alignItems: 'center' },
    modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
    modalConfirmBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#FF6B6B', alignItems: 'center' },
    modalConfirmBtnDisabled: { opacity: 0.5 },
    modalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },

    // Search
    searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    searchingText: { fontSize: 14, color: '#888' },
    previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5FFE5', padding: 14, borderRadius: 16, gap: 12, marginBottom: 16, width: '100%' },
    previewEmoji: { fontSize: 24 },
    previewName: { fontSize: 16, fontWeight: '600', color: '#333' },
    previewAge: { fontSize: 13, color: '#666', marginTop: 2 },
    notFoundCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE5E5', padding: 14, borderRadius: 16, gap: 12, marginBottom: 16, width: '100%' },
    notFoundEmoji: { fontSize: 24 },
    notFoundText: { fontSize: 14, color: '#D32F2F' },

    // Error Distribution Chart
    errorChartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#F0F0F0' },
    errorBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    errorBarLabel: { width: 100, flexShrink: 0 },
    errorBarGame: { fontSize: 12, fontWeight: '600', color: '#333' },
    errorBarCount: { fontSize: 10, color: '#999' },
    errorBarContainer: { flex: 1, height: 20, backgroundColor: '#F0F0F0', borderRadius: 10, overflow: 'hidden' },
    errorBar: { height: '100%', borderRadius: 10 },
    errorBarValue: { width: 50, alignItems: 'flex-end' },
    errorBarPercent: { fontSize: 14, fontWeight: '700', color: '#333' },
    errorLegend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 20, gap: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 6 },
    legendText: { fontSize: 12, color: '#666' },
    interventionHint: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF3CD', padding: 14, borderRadius: 14, marginTop: 16, gap: 10 },
    interventionEmoji: { fontSize: 20 },
    interventionText: { flex: 1, fontSize: 13, color: '#856404', lineHeight: 20 },
});
