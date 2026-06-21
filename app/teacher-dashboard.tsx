import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DynamicBackground from '../components/DynamicBackground';
import TeacherDashboard from '../components/TeacherDashboard';
import { supabase } from '../lib/supabase';

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: Array<{ text: string, onPress?: () => void, style?: 'cancel' | 'default' | 'destructive' }>) => {
    if (Platform.OS === 'web') {
        if (buttons && buttons.length > 1) {
            const cancelButton = buttons.find(b => b.style === 'cancel');
            const actionButton = buttons.find(b => b.style !== 'cancel');
            const result = window.confirm(`${title}\n\n${message}\n\n[OK = ${actionButton?.text || 'Yes'}, Cancel = ${cancelButton?.text || 'Cancel'}]`);
            if (result && actionButton?.onPress) {
                actionButton.onPress();
            }
        } else {
            window.alert(`${title}\n\n${message}`);
        }
    } else {
        Alert.alert(title, message, buttons);
    }
};

interface TeacherProfile {
    id: string;
    email: string;
    name: string;
    school_name?: string;
    subscription_tier: 'free' | 'premium';
}

export default function TeacherDashboardPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<TeacherProfile | null>(null);

    // Registration states
    const [showRegister, setShowRegister] = useState(false);
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regSchool, setRegSchool] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    // Demo profili
    const useDemoProfile = () => {
        setProfile({
            id: 'demo-teacher',
            email: 'demo@okul.com',
            name: 'Demo Öğretmen',
            school_name: 'Demo Anaokulu',
            subscription_tier: 'premium',
        });
    };

    // Kayıt fonksiyonu
    const handleRegister = async () => {
        if (!regName.trim()) {
            showAlert('Hata', 'Lütfen adınızı girin');
            return;
        }
        if (!regEmail.trim()) {
            showAlert('Hata', 'Lütfen email adresinizi girin');
            return;
        }
        if (!regEmail.includes('@')) {
            showAlert('Hata', 'Geçerli bir email adresi girin');
            return;
        }
        if (regPassword.trim().length < 6) {
            showAlert('Hata', 'Şifre en az 6 karakter olmalıdır');
            return;
        }

        setIsRegistering(true);
        try {
            // 1. Supabase Auth kullanicisi olustur (otomatik oturum acar)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: regEmail.trim(),
                password: regPassword,
            });

            if (authError || !authData.user) {
                showAlert('Hata', `Kayıt hatası: ${authError?.message || 'Bilinmeyen hata'}`);
                setIsRegistering(false);
                return;
            }

            // 2. teachers tablosuna auth kullanicisina bagli kayit ekle
            const { error: insertError } = await supabase.from('teachers').insert([{
                user_id: authData.user.id,
                name: regName.trim(),
                email: regEmail.trim(),
                school_name: regSchool.trim() || null,
                subscription_tier: 'free',
            }]);

            if (insertError) {
                console.error('Öğretmen profili oluşturma hatası:', insertError);
                showAlert('Hata', 'Hesap oluşturuldu ancak profil kaydedilemedi.');
            } else {
                showAlert('Başarılı', 'Kayıt tamamlandı! Artık giriş yapabilirsiniz.');
                setShowRegister(false);
                setEmail(regEmail.trim());
                setRegName('');
                setRegEmail('');
                setRegPassword('');
                setRegSchool('');
            }
        } catch (error) {
            console.error('Kayıt hatası:', error);
            showAlert('Hata', `Kayıt sırasında bir hata oluştu: ${error}`);
        } finally {
            setIsRegistering(false);
        }
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            showAlert('Hata', 'Lütfen email ve şifrenizi girin');
            return;
        }

        setLoading(true);
        try {
            // 1. Supabase Auth ile giris
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (authError || !authData.user) {
                showAlert('Giriş Başarısız', 'Hatalı e-posta veya şifre.');
                return;
            }

            // 2. teachers tablosundan profil bilgilerini cek (user_id = auth.uid())
            const { data: teacherRow, error: teacherError } = await supabase
                .from('teachers')
                .select('name, email, school_name, subscription_tier')
                .eq('user_id', authData.user.id)
                .single();

            if (teacherError || !teacherRow) {
                showAlert('Yetki Yok', 'Bu hesabın öğretmen paneline erişim yetkisi yok.');
                await supabase.auth.signOut();
                return;
            }

            // teacherId olarak auth UUID kullaniliyor; classes.teacher_id bununla eslesir (RLS).
            setProfile({
                id: authData.user.id,
                email: teacherRow.email,
                name: teacherRow.name,
                school_name: teacherRow.school_name,
                subscription_tier: teacherRow.subscription_tier,
            });
        } catch (error) {
            console.error('Giriş hatası:', error);
            showAlert('Hata', `Giriş sırasında bir hata oluştu: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // Show dashboard if profile is loaded
    if (profile) {
        return (
            <TeacherDashboard
                teacherId={profile.id}
                teacherName={profile.name}
                teacherEmail={profile.email}
                schoolName={profile.school_name}
                subscriptionTier={profile.subscription_tier}
                onClose={() => setProfile(null)}
            />
        );
    }

    // Show login form
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    const isSmallScreen = height < 500;

    return (
        <DynamicBackground>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        isLandscape && styles.contentLandscape,
                        isSmallScreen && styles.contentCompact
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={[styles.backButton, isLandscape && styles.backButtonLandscape]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FF9800" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={[styles.header, isLandscape && styles.headerLandscape]}>
                        <Text style={[styles.emoji, isSmallScreen && { fontSize: 40 }]}>👩‍🏫</Text>
                        <Text style={[styles.title, isSmallScreen && { fontSize: 22 }]}>Öğretmen Paneli</Text>
                        <Text style={styles.subtitle}>
                            Öğrencilerinizin gelişimini takip edin
                        </Text>
                    </View>

                    {/* Login Card */}
                    <View style={[
                        styles.card,
                        isLandscape && styles.cardLandscape,
                        { maxWidth: isLandscape ? 400 : undefined }
                    ]}>
                        <Text style={styles.cardTitle}>Giriş Yapın</Text>
                        <Text style={styles.cardSubtitle}>
                            Kayıtlı öğretmen email adresinizi girin
                        </Text>

                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email adresiniz"
                                placeholderTextColor="#9E9E9E"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Şifre"
                                placeholderTextColor="#9E9E9E"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                onSubmitEditing={handleLogin}
                            />
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.loginButton, styles.loginButtonFlex, loading && styles.loginButtonDisabled]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.loginButtonText}>Giriş Yap</Text>
                                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Demo Login Button */}
                            <TouchableOpacity
                                style={styles.demoButton}
                                onPress={useDemoProfile}
                            >
                                <Ionicons name="flash" size={18} color="#FF9800" />
                                <Text style={styles.demoButtonText}>Demo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Info */}
                    <View style={styles.info}>
                        <TouchableOpacity onPress={() => setShowRegister(true)}>
                            <Text style={styles.infoText}>
                                Hesabınız yok mu? <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>Kayıt Olun</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Kayıt Modal */}
                <Modal visible={showRegister} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>👩‍🏫 Öğretmen Kayıt</Text>
                                <TouchableOpacity onPress={() => setShowRegister(false)}>
                                    <Ionicons name="close" size={24} color="#607D8B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Adınız Soyadınız *"
                                    placeholderTextColor="#9E9E9E"
                                    value={regName}
                                    onChangeText={setRegName}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email Adresiniz *"
                                    placeholderTextColor="#9E9E9E"
                                    value={regEmail}
                                    onChangeText={setRegEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Şifre (en az 6 karakter) *"
                                    placeholderTextColor="#9E9E9E"
                                    value={regPassword}
                                    onChangeText={setRegPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="business-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Okul Adı (opsiyonel)"
                                    placeholderTextColor="#9E9E9E"
                                    value={regSchool}
                                    onChangeText={setRegSchool}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.loginButton, isRegistering && styles.loginButtonDisabled]}
                                onPress={handleRegister}
                                disabled={isRegistering}
                            >
                                {isRegistering ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.loginButtonText}>🚀 Kayıt Ol</Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.registerNote}>
                                Kayıt olduktan sonra Free plana dahil olursunuz.
                                Premium özellikler için bizimle iletişime geçin.
                            </Text>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentLandscape: {
        flexDirection: 'column',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 40,
    },
    contentCompact: {
        paddingVertical: 12,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
    },
    backButtonLandscape: {
        top: 12,
        left: 12,
        width: 38,
        height: 38,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    headerLandscape: {
        marginBottom: 12,
        marginTop: 20,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#263238',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        color: '#607D8B',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        width: '100%',
        maxWidth: 420,
    },
    cardLandscape: {
        padding: 20,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#263238',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#607D8B',
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 56,
        fontSize: 16,
        color: '#263238',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF9800',
        borderRadius: 16,
        height: 52,
        gap: 8,
    },
    loginButtonFlex: {
        flex: 1,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E0',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        gap: 6,
        borderWidth: 2,
        borderColor: '#FF9800',
    },
    demoButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF9800',
    },
    info: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 20,
        gap: 6,
    },
    infoText: {
        fontSize: 13,
        color: '#607D8B',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 420,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#263238',
    },
    registerNote: {
        marginTop: 16,
        fontSize: 12,
        color: '#9E9E9E',
        textAlign: 'center',
        lineHeight: 18,
    },
});
