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

type TabType = 'dashboard' | 'classes' | 'students' | 'reports';

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
    const isWeb = Platform.OS === 'web';

    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
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
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

    const isPremium = subscriptionTier === 'premium';

    // Stats
    const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
    const totalGames = students.reduce((sum, s) => sum + s.gameCount, 0);

    useEffect(() => {
        if (teacherId === 'demo-teacher') {
            setClasses([
                { id: 'demo-class-1', name: 'Papatyalar Sınıfı', studentCount: 12 },
                { id: 'demo-class-2', name: 'Laleler Sınıfı', studentCount: 8 },
                { id: 'demo-class-3', name: 'Güller Sınıfı', studentCount: 15 },
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
                const classesWithCount = await Promise.all(data.map(async (c: any) => {
                    const countResp = await fetch(
                        `${SUPABASE_URL}/rest/v1/class_students?class_id=eq.${c.id}&select=id`,
                        { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
                    );
                    const countData = await countResp.json();
                    return {
                        id: c.id,
                        name: c.name,
                        studentCount: Array.isArray(countData) ? countData.length : 0,
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
                { id: '1', child_name: 'Ahmet Yılmaz', child_age_months: 48, email: 'ahmet@test.com', gameCount: 15 },
                { id: '2', child_name: 'Ayşe Kaya', child_age_months: 52, email: 'ayse@test.com', gameCount: 23 },
                { id: '3', child_name: 'Mehmet Demir', child_age_months: 45, email: 'mehmet@test.com', gameCount: 8 },
                { id: '4', child_name: 'Zeynep Çelik', child_age_months: 60, email: 'zeynep@test.com', gameCount: 31 },
            ]);
            return;
        }

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/class_students?class_id=eq.${classId}&select=child_email`,
                { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
            );
            const classStudents = await response.json();

            if (Array.isArray(classStudents) && classStudents.length > 0) {
                const emails = classStudents.map((s: any) => s.child_email);
                const profilesResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/profiles?email=in.(${emails.map(e => `"${e}"`).join(',')})`,
                    { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
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
                { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
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
                { id: 3, created_at: new Date(Date.now() - 172800000).toISOString(), oyun_turu: 'gruplama', hamle_sayisi: 15, hata_sayisi: 3, sure: 60 },
            ]);
            return;
        }

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/oyun_skorlari?ogrenci_adi=eq.${encodeURIComponent(studentName)}&ogrenci_yasi=eq.${studentAge}&order=created_at.desc&limit=20`,
                { headers: { 'apikey': SUPABASE_KEY!, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
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
        if (isMobile) setActiveTab('students');
    };

    const handleStudentSelect = (student: StudentData) => {
        setSelectedStudent(student);
        fetchStudentScores(student.child_name, student.child_age_months);
    };

    const handleAddClass = async () => {
        if (!newClassName.trim()) return;
        if (!isPremium && classes.length >= 1) {
            alert('Free hesapla sadece 1 sınıf oluşturabilirsiniz.');
            return;
        }

        if (teacherId === 'demo-teacher') {
            setClasses([...classes, { id: `demo-${Date.now()}`, name: newClassName, studentCount: 0 }]);
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
                body: JSON.stringify({ teacher_id: teacherId, name: newClassName }),
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
        if (!studentPreview) {
            alert('Bu email ile kayıtlı öğrenci bulunamadı.');
            return;
        }
        if (!isPremium && students.length >= 10) {
            alert('Free hesapla sınıfa en fazla 10 öğrenci ekleyebilirsiniz.');
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
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
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

    const analyzeScore = async (score: GameScore) => {
        if (!isPremium) {
            alert('AI Analizi sadece Premium hesaplar için.');
            return;
        }
        setAnalyzingId(score.id);
        try {
            const prompt = `Sen okul öncesi eğitim uzmanısın. Öğrenci: ${selectedStudent?.child_name} (${selectedStudent?.child_age_months} ay). Oyun: ${score.oyun_turu}, Süre: ${score.sure}sn, Hamle: ${score.hamle_sayisi}, Hata: ${score.hata_sayisi}. Kısa pedagojik analiz yap.`;
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
                    }),
                }
            );
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Analiz yapılamadı.';
            setStudentScores(prev => prev.map(s => s.id === score.id ? { ...s, yapay_zeka_yorumu: text } : s));
        } catch (error) {
            console.error('AI hatası:', error);
        } finally {
            setAnalyzingId(null);
        }
    };

    const getOyunAdi = (turu: string): string => {
        const map: Record<string, string> = {
            'hafiza': 'Çiftini Bul!', 'siralama': 'Sıralama', 'gruplama': 'Gruplama',
            'kodlama': 'Minik Kaşif', 'yapboz': 'Yapboz', 'bunu-soyle': 'Bunu Söyle!',
            'golge-dedektifi': 'Gölge Dedektifi', 'sihirli-tuval': 'Sihirli Tuval',
            'uzay-bloklari': 'Uzay Blokları',
        };
        return map[turu] || turu;
    };

    const getAgeText = (months: number) => {
        const years = Math.floor(months / 12);
        const m = months % 12;
        return `${years} yaş ${m > 0 ? `${m} ay` : ''}`;
    };

    // Sidebar Component
    const renderSidebar = () => (
        <View style={[styles.sidebar, !sidebarOpen && styles.sidebarClosed]}>
            <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarLogo}>🎓</Text>
                <Text style={styles.sidebarTitle}>Öğretmen Portalı</Text>
            </View>

            <View style={styles.sidebarMenu}>
                {[
                    { id: 'dashboard', icon: 'grid-outline', label: 'Dashboard' },
                    { id: 'classes', icon: 'school-outline', label: 'Sınıflarım' },
                    { id: 'students', icon: 'people-outline', label: 'Öğrencilerim' },
                    { id: 'reports', icon: 'bar-chart-outline', label: 'Raporlar' },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.sidebarItem, activeTab === item.id && styles.sidebarItemActive]}
                        onPress={() => setActiveTab(item.id as TabType)}
                    >
                        <Ionicons
                            name={item.icon as any}
                            size={22}
                            color={activeTab === item.id ? '#fff' : '#94A3B8'}
                        />
                        <Text style={[styles.sidebarItemText, activeTab === item.id && styles.sidebarItemTextActive]}>
                            {item.label}
                        </Text>
                        {item.id === 'reports' && !isPremium && (
                            <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PRO</Text></View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.sidebarFooter}>
                <TouchableOpacity style={styles.logoutButton} onPress={onClose}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Çıkış Yap</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Dashboard Tab
    const renderDashboard = () => (
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
                <View style={styles.welcomeGradient}>
                    <View style={styles.welcomeContent}>
                        <Text style={styles.welcomeEmoji}>👋</Text>
                        <View style={styles.welcomeText}>
                            <Text style={styles.welcomeTitle}>Hoş Geldiniz, {teacherName}!</Text>
                            <Text style={styles.welcomeSubtitle}>{schoolName || 'Öğretmen Portalı'}</Text>
                        </View>
                    </View>
                    <View style={[styles.tierChip, isPremium && styles.tierChipPremium]}>
                        <Ionicons name={isPremium ? 'star' : 'star-outline'} size={14} color={isPremium ? '#F59E0B' : '#64748B'} />
                        <Text style={[styles.tierChipText, isPremium && styles.tierChipTextPremium]}>
                            {isPremium ? 'Premium' : 'Free'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
                    <View style={[styles.statIconBox, { backgroundColor: '#6366F1' }]}>
                        <Ionicons name="school" size={24} color="#fff" />
                    </View>
                    <Text style={styles.statValue}>{classes.length}</Text>
                    <Text style={styles.statLabel}>Sınıf</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                    <View style={[styles.statIconBox, { backgroundColor: '#22C55E' }]}>
                        <Ionicons name="people" size={24} color="#fff" />
                    </View>
                    <Text style={styles.statValue}>{totalStudents}</Text>
                    <Text style={styles.statLabel}>Öğrenci</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
                    <View style={[styles.statIconBox, { backgroundColor: '#F97316' }]}>
                        <Ionicons name="game-controller" size={24} color="#fff" />
                    </View>
                    <Text style={styles.statValue}>{totalGames}</Text>
                    <Text style={styles.statLabel}>Oyun</Text>
                </View>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickAction} onPress={() => setShowAddClassModal(true)}>
                    <View style={[styles.quickActionIcon, { backgroundColor: '#6366F1' }]}>
                        <Ionicons name="add" size={28} color="#fff" />
                    </View>
                    <Text style={styles.quickActionText}>Sınıf Oluştur</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => {
                        if (selectedClass) setShowAddStudentModal(true);
                        else setActiveTab('classes');
                    }}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#22C55E' }]}>
                        <Ionicons name="person-add" size={24} color="#fff" />
                    </View>
                    <Text style={styles.quickActionText}>Öğrenci Ekle</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('reports')}>
                    <View style={[styles.quickActionIcon, { backgroundColor: '#F97316' }]}>
                        <Ionicons name="stats-chart" size={24} color="#fff" />
                    </View>
                    <Text style={styles.quickActionText}>Raporlar</Text>
                </TouchableOpacity>
            </View>

            {/* Classes Preview */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sınıflarım</Text>
                <TouchableOpacity onPress={() => setActiveTab('classes')}>
                    <Text style={styles.seeAllText}>Tümünü Gör →</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classesRow}>
                {classes.slice(0, 4).map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        style={[styles.classPreviewCard, selectedClass?.id === c.id && styles.classPreviewCardActive]}
                        onPress={() => handleClassSelect(c)}
                    >
                        <Text style={styles.classPreviewIcon}>🏫</Text>
                        <Text style={styles.classPreviewName}>{c.name}</Text>
                        <Text style={styles.classPreviewCount}>{c.studentCount} öğrenci</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </ScrollView>
    );

    // Classes Tab
    const renderClasses = () => (
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>📚 Sınıflarım</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowAddClassModal(true)}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Yeni Sınıf</Text>
                </TouchableOpacity>
            </View>

            {classes.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🏫</Text>
                    <Text style={styles.emptyTitle}>Henüz sınıf yok</Text>
                    <Text style={styles.emptyText}>İlk sınıfınızı oluşturarak başlayın</Text>
                </View>
            ) : (
                <View style={styles.classesGrid}>
                    {classes.map((c) => (
                        <TouchableOpacity
                            key={c.id}
                            style={[styles.classCard, selectedClass?.id === c.id && styles.classCardSelected]}
                            onPress={() => handleClassSelect(c)}
                        >
                            <View style={styles.classCardHeader}>
                                <Text style={styles.classCardIcon}>🏫</Text>
                                <View style={styles.classCardBadge}>
                                    <Text style={styles.classCardBadgeText}>{c.studentCount}</Text>
                                </View>
                            </View>
                            <Text style={styles.classCardName}>{c.name}</Text>
                            <Text style={styles.classCardSubtext}>{c.studentCount} öğrenci</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </ScrollView>
    );

    // Students Tab
    const renderStudents = () => (
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
            {selectedClass ? (
                <>
                    <View style={styles.pageHeader}>
                        <View>
                            <Text style={styles.pageTitle}>👨‍👩‍👧‍👦 {selectedClass.name}</Text>
                            <Text style={styles.pageSubtitle}>{students.length} öğrenci</Text>
                        </View>
                        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddStudentModal(true)}>
                            <Ionicons name="person-add" size={18} color="#fff" />
                            <Text style={styles.addButtonText}>Öğrenci Ekle</Text>
                        </TouchableOpacity>
                    </View>

                    {students.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>👦</Text>
                            <Text style={styles.emptyTitle}>Henüz öğrenci yok</Text>
                            <Text style={styles.emptyText}>Sınıfa öğrenci ekleyerek başlayın</Text>
                        </View>
                    ) : (
                        <View style={styles.studentsList}>
                            {students.map((s) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.studentCard, selectedStudent?.id === s.id && styles.studentCardSelected]}
                                    onPress={() => handleStudentSelect(s)}
                                >
                                    <View style={styles.studentAvatar}>
                                        <Text style={styles.studentAvatarText}>
                                            {s.child_name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.studentInfo}>
                                        <Text style={styles.studentName}>{s.child_name}</Text>
                                        <Text style={styles.studentAge}>{getAgeText(s.child_age_months)}</Text>
                                    </View>
                                    <View style={styles.studentStats}>
                                        <Ionicons name="game-controller-outline" size={16} color="#6366F1" />
                                        <Text style={styles.studentStatsText}>{s.gameCount}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Student Detail */}
                    {selectedStudent && (
                        <View style={styles.studentDetail}>
                            <Text style={styles.detailTitle}>📊 {selectedStudent.child_name} - Oyun Geçmişi</Text>
                            {studentScores.length === 0 ? (
                                <Text style={styles.noScores}>Henüz oyun kaydı yok</Text>
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
                                                <Text style={styles.scoreStatValue}>{score.sure || 0}s</Text>
                                                <Text style={styles.scoreStatLabel}>Süre</Text>
                                            </View>
                                            <View style={styles.scoreStat}>
                                                <Text style={styles.scoreStatValue}>{score.hamle_sayisi}</Text>
                                                <Text style={styles.scoreStatLabel}>Hamle</Text>
                                            </View>
                                            <View style={styles.scoreStat}>
                                                <Text style={[styles.scoreStatValue, score.hata_sayisi > 3 && { color: '#EF4444' }]}>
                                                    {score.hata_sayisi}
                                                </Text>
                                                <Text style={styles.scoreStatLabel}>Hata</Text>
                                            </View>
                                        </View>
                                        {isPremium && (
                                            <TouchableOpacity
                                                style={styles.analyzeBtn}
                                                onPress={() => analyzeScore(score)}
                                                disabled={analyzingId === score.id}
                                            >
                                                {analyzingId === score.id ? (
                                                    <ActivityIndicator size="small" color="#6366F1" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="sparkles" size={16} color="#6366F1" />
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
                </>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📚</Text>
                    <Text style={styles.emptyTitle}>Sınıf Seçin</Text>
                    <Text style={styles.emptyText}>Öğrencileri görmek için bir sınıf seçin</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={() => setActiveTab('classes')}>
                        <Text style={styles.emptyButtonText}>Sınıflara Git</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );

    // Reports Tab
    const renderReports = () => (
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>📊 Raporlar</Text>
            </View>

            {!isPremium ? (
                <View style={styles.premiumWall}>
                    <Text style={styles.premiumWallIcon}>🔒</Text>
                    <Text style={styles.premiumWallTitle}>Premium Özellik</Text>
                    <Text style={styles.premiumWallText}>
                        AI destekli raporlar, gelişim grafikleri ve detaylı analizler için Premium'a yükseltin.
                    </Text>
                    <TouchableOpacity style={styles.premiumButton}>
                        <Ionicons name="star" size={18} color="#fff" />
                        <Text style={styles.premiumButtonText}>Premium'a Yükselt</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.reportsGrid}>
                    <View style={styles.reportCard}>
                        <Ionicons name="trending-up" size={32} color="#22C55E" />
                        <Text style={styles.reportCardTitle}>Gelişim Raporu</Text>
                        <Text style={styles.reportCardText}>Tüm öğrencilerin haftalık gelişim analizi</Text>
                    </View>
                    <View style={styles.reportCard}>
                        <Ionicons name="analytics" size={32} color="#6366F1" />
                        <Text style={styles.reportCardTitle}>Sınıf Performansı</Text>
                        <Text style={styles.reportCardText}>Sınıf bazlı karşılaştırmalı analiz</Text>
                    </View>
                </View>
            )}
        </ScrollView>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Mobile Header */}
            {isMobile && (
                <View style={styles.mobileHeader}>
                    <TouchableOpacity onPress={() => setSidebarOpen(!sidebarOpen)}>
                        <Ionicons name="menu" size={28} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.mobileTitle}>Öğretmen Portalı</Text>
                    <View style={[styles.tierChip, isPremium && styles.tierChipPremium]}>
                        <Text style={[styles.tierChipText, isPremium && styles.tierChipTextPremium]}>
                            {isPremium ? '⭐' : 'Free'}
                        </Text>
                    </View>
                </View>
            )}

            <View style={styles.mainLayout}>
                {/* Sidebar */}
                {(sidebarOpen || !isMobile) && renderSidebar()}

                {/* Main Content */}
                <View style={styles.contentArea}>
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'classes' && renderClasses()}
                    {activeTab === 'students' && renderStudents()}
                    {activeTab === 'reports' && renderReports()}
                </View>
            </View>

            {/* Add Class Modal */}
            <Modal visible={showAddClassModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🏫 Yeni Sınıf Oluştur</Text>
                            <TouchableOpacity onPress={() => setShowAddClassModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Sınıf adı (ör: Papatyalar Sınıfı)"
                            placeholderTextColor="#94A3B8"
                            value={newClassName}
                            onChangeText={setNewClassName}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddClassModal(false)}>
                                <Text style={styles.modalCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddClass}>
                                <Text style={styles.modalConfirmText}>Oluştur</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Student Modal */}
            <Modal visible={showAddStudentModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>👦 Öğrenci Ekle</Text>
                            <TouchableOpacity onPress={() => { setShowAddStudentModal(false); setStudentPreview(null); setNewStudentEmail(''); }}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>Velinin sisteme kayıt olduğu email adresini girin</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="ornek@email.com"
                            placeholderTextColor="#94A3B8"
                            value={newStudentEmail}
                            onChangeText={(text) => {
                                setNewStudentEmail(text);
                                if (text.includes('@') && text.length > 5) {
                                    searchStudentByEmail(text);
                                } else {
                                    setStudentPreview(null);
                                }
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {searchingStudent && (
                            <View style={styles.searchingBox}>
                                <ActivityIndicator size="small" color="#6366F1" />
                                <Text style={styles.searchingText}>Aranıyor...</Text>
                            </View>
                        )}
                        {studentPreview && (
                            <View style={styles.previewBox}>
                                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                                <View style={styles.previewInfo}>
                                    <Text style={styles.previewName}>{studentPreview.child_name}</Text>
                                    <Text style={styles.previewAge}>{getAgeText(studentPreview.child_age_months)}</Text>
                                </View>
                            </View>
                        )}
                        {newStudentEmail.includes('@') && !searchingStudent && !studentPreview && newStudentEmail.length > 5 && (
                            <View style={styles.notFoundBox}>
                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                                <Text style={styles.notFoundText}>Bu email ile kayıtlı öğrenci bulunamadı</Text>
                            </View>
                        )}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddStudentModal(false); setStudentPreview(null); setNewStudentEmail(''); }}>
                                <Text style={styles.modalCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, !studentPreview && styles.modalConfirmBtnDisabled]}
                                onPress={handleAddStudent}
                                disabled={!studentPreview}
                            >
                                <Text style={styles.modalConfirmText}>Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },

    // Mobile Header
    mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    mobileTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },

    // Layout
    mainLayout: { flex: 1, flexDirection: 'row' },

    // Sidebar
    sidebar: { width: 260, backgroundColor: '#1E293B', paddingTop: Platform.OS === 'web' ? 0 : 50 },
    sidebarClosed: { display: 'none' },
    sidebarHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155', gap: 12 },
    sidebarLogo: { fontSize: 32 },
    sidebarTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    sidebarMenu: { flex: 1, paddingVertical: 16 },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
    sidebarItemActive: { backgroundColor: '#6366F1', marginHorizontal: 12, borderRadius: 12 },
    sidebarItemText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
    sidebarItemTextActive: { color: '#fff' },
    premiumBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    premiumBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    sidebarFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#334155' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoutText: { fontSize: 14, color: '#EF4444', fontWeight: '500' },

    // Content Area
    contentArea: { flex: 1, backgroundColor: '#F8FAFC' },
    mainContent: { flex: 1, padding: 24 },

    // Welcome Card
    welcomeCard: { backgroundColor: '#6366F1', borderRadius: 20, marginBottom: 24, overflow: 'hidden' },
    welcomeGradient: { padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    welcomeContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    welcomeEmoji: { fontSize: 48 },
    welcomeText: {},
    welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
    welcomeSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    tierChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    tierChipPremium: { backgroundColor: '#FEF3C7' },
    tierChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    tierChipTextPremium: { color: '#D97706' },

    // Stats
    statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 28 },
    statCard: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center' },
    statIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 28, fontWeight: '700', color: '#1E293B' },
    statLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },

    // Quick Actions
    quickActions: { flexDirection: 'row', gap: 16, marginBottom: 28 },
    quickAction: { flex: 1, alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    quickActionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    quickActionText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

    // Section
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    seeAllText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },

    // Classes Row
    classesRow: { marginBottom: 24 },
    classPreviewCard: { width: 140, padding: 20, backgroundColor: '#fff', borderRadius: 16, marginRight: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    classPreviewCardActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
    classPreviewIcon: { fontSize: 36, marginBottom: 10 },
    classPreviewName: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
    classPreviewCount: { fontSize: 12, color: '#64748B', marginTop: 4 },

    // Page Header
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    pageTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
    pageSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
    addButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },

    // Empty State
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
    emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
    emptyButton: { marginTop: 20, backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },

    // Classes Grid
    classesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    classCard: { width: '48%', padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    classCardSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
    classCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    classCardIcon: { fontSize: 40 },
    classCardBadge: { backgroundColor: '#6366F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    classCardBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    classCardName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    classCardSubtext: { fontSize: 13, color: '#64748B', marginTop: 4 },

    // Students List
    studentsList: { gap: 12 },
    studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    studentCardSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
    studentAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    studentAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
    studentInfo: { flex: 1 },
    studentName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    studentAge: { fontSize: 13, color: '#64748B', marginTop: 2 },
    studentStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6, marginRight: 12 },
    studentStatsText: { fontSize: 13, fontWeight: '600', color: '#6366F1' },

    // Student Detail
    studentDetail: { marginTop: 24, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
    detailTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
    noScores: { textAlign: 'center', color: '#94A3B8', paddingVertical: 24 },

    // Score Card
    scoreCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12 },
    scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    scoreGame: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    scoreDate: { fontSize: 12, color: '#94A3B8' },
    scoreStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
    scoreStat: { alignItems: 'center' },
    scoreStatValue: { fontSize: 20, fontWeight: '700', color: '#6366F1' },
    scoreStatLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
    analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', padding: 10, borderRadius: 10, gap: 8 },
    analyzeBtnText: { fontSize: 13, fontWeight: '600', color: '#6366F1' },
    aiResult: { marginTop: 12, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#6366F1' },
    aiResultTitle: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
    aiResultText: { fontSize: 13, color: '#475569', lineHeight: 20 },

    // Premium Wall
    premiumWall: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    premiumWallIcon: { fontSize: 64, marginBottom: 16 },
    premiumWallTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
    premiumWallText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
    premiumButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, gap: 10 },
    premiumButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

    // Reports Grid
    reportsGrid: { flexDirection: 'row', gap: 16 },
    reportCard: { flex: 1, backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    reportCardTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 12, marginBottom: 6 },
    reportCardText: { fontSize: 13, color: '#64748B', textAlign: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
    modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 16 },
    modalInput: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 16, color: '#1E293B', marginBottom: 16 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center' },
    modalCancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
    modalConfirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center' },
    modalConfirmBtnDisabled: { opacity: 0.5 },
    modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },

    // Search/Preview
    searchingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    searchingText: { fontSize: 14, color: '#64748B' },
    previewBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 14, borderRadius: 12, gap: 12, marginBottom: 16 },
    previewInfo: {},
    previewName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    previewAge: { fontSize: 13, color: '#64748B', marginTop: 2 },
    notFoundBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, gap: 12, marginBottom: 16 },
    notFoundText: { fontSize: 14, color: '#DC2626' },
});
