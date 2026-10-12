import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
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
import InAppNotice from '../components/InAppNotice';
import TeacherDashboard from '../components/TeacherDashboard';
import { supabase } from '../lib/supabase';
import { AUTH_MESSAGES, EMAIL_CONFIRM_REDIRECT, ensureTeacherFromMetadata, isEmailNotConfirmed, needsEmailConfirmation, PASSWORD_RESET_REDIRECT } from '../lib/authFlow';
import { rememberResetReturn } from '../lib/resetReturn';
import { OgretmenTier } from '../lib/subscriptionTiers';

interface TeacherProfile {
    id: string;
    email: string;
    name: string;
    school_name?: string;
    subscription_tier: OgretmenTier;
    package_expires_at: string | null;
}

export default function TeacherDashboardPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [notice, setNotice] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<TeacherProfile | null>(null);
    // NOT: Kurum paneli ogretmen panelinin icinde DEGIL; yalniz ayri /kurum girisinden acilir (app/kurum.tsx).

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
            subscription_tier: 'mese',
            package_expires_at: null,
        });
    };

    // Kayıt fonksiyonu
    const handleRegister = async () => {
        if (!regName.trim()) { setNotice(t('teacherAuth.needName')); return; }
        if (!regEmail.trim()) { setNotice(t('teacherAuth.needEmail')); return; }
        if (!regEmail.includes('@')) { setNotice(t('teacherAuth.validEmail')); return; }
        if (regPassword.trim().length < 6) { setNotice(t('teacherAuth.shortPassword')); return; }

        setIsRegistering(true);
        try {
            // 1. Supabase Auth kullanicisi olustur (otomatik oturum acar)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: regEmail.trim(),
                password: regPassword,
                options: {
                    emailRedirectTo: EMAIL_CONFIRM_REDIRECT,
                    // E-posta doğrulaması açıksa öğretmen satırı şimdi yazılamaz; ilk girişte bu bilgilerden oluşturulur.
                    data: { teacher_signup: true, teacher_name: regName.trim(), school_name: regSchool.trim() || null },
                },
            });

            if (authError || !authData.user) {
                // Ham (İngilizce) sunucu mesajı kullanıcıya gösterilmez.
                const raw = String(authError?.message || '').toLowerCase();
                setNotice(raw.includes('already') || raw.includes('registered') ? t('teacherAuth.alreadyRegistered') : t('teacherAuth.signupFailed'));
                return;
            }

            if (needsEmailConfirmation(authData)) {
                setNotice(AUTH_MESSAGES.confirmSent);
                setShowRegister(false);
                setEmail(regEmail.trim());
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
                setNotice(t('teacherAuth.profileFailed'));
            } else {
                setNotice(t('teacherAuth.signupDone'));
                setShowRegister(false);
                setEmail(regEmail.trim());
                setRegName('');
                setRegEmail('');
                setRegPassword('');
                setRegSchool('');
            }
        } catch (error) {
            console.error('Kayıt hatası:', error);
            setNotice(t('teacherAuth.networkError'));
        } finally {
            setIsRegistering(false);
        }
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setNotice(t('teacherAuth.needLogin'));
            return;
        }

        setLoading(true);
        try {
            // 1. Supabase Auth ile giris
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (isEmailNotConfirmed(authError)) {
                setNotice(AUTH_MESSAGES.notConfirmed);
                return;
            }
            if (authError || !authData.user) {
                setNotice(t('teacherAuth.loginFailed'));
                return;
            }

            // Kayıt, e-posta doğrulamasından önce yapıldıysa öğretmen satırı ilk girişte oluşturulur.
            await ensureTeacherFromMetadata(authData.user);

            // 2. teachers tablosundan profil bilgilerini cek (user_id = auth.uid())
            const { data: teacherRow, error: teacherError } = await supabase
                .from('teachers')
                .select('name, email, school_name, subscription_tier, package_expires_at')
                .eq('user_id', authData.user.id)
                .single();

            if (teacherError || !teacherRow) {
                setNotice(t('teacherAuth.noAccess'));
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
                package_expires_at: teacherRow.package_expires_at,
            });
            setPassword('');
        } catch (error) {
            console.error('Giriş hatası:', error);
            setNotice(t('teacherAuth.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setNotice(t('teacherAuth.resetNeedEmail'));
            return;
        }
        try {
            rememberResetReturn('/teacher-dashboard');
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: PASSWORD_RESET_REDIRECT,
            });
            if (error) throw error;
            setNotice(t('teacherAuth.resetSent'));
        } catch {
            setNotice(t('teacherAuth.resetFailed'));
        }
    };

    // Panel kapanınca (geri düğmesi / çıkış) gerçek hesapta oturum da kapanır: ortak okul tabletlerinde sonraki kişi
    // açık öğretmen hesabını görmesin. Demo profilde sunucu oturumu yoktur.
    const closePanel = async () => {
        const wasDemo = profile?.id === 'demo-teacher';
        setProfile(null);
        setPassword('');
        if (!wasDemo) {
            try { await supabase.auth.signOut(); } catch { /* oturum zaten yok */ }
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
                packageExpiresAt={profile.package_expires_at}
                onClose={closePanel}
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
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
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
                        accessibilityRole="button"
                        accessibilityLabel={t('teacherAuth.back')}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FF9800" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={[styles.header, isLandscape && styles.headerLandscape]}>
                        <Text style={[styles.emoji, isSmallScreen && { fontSize: 40 }]}>👩‍🏫</Text>
                        <Text style={[styles.title, isSmallScreen && { fontSize: 22 }]}>{t('teacherAuth.title')}</Text>
                        <Text style={styles.subtitle}>
                            {t('teacherAuth.subtitle')}
                        </Text>
                    </View>

                    {/* Login Card */}
                    <View style={[
                        styles.card,
                        isLandscape && styles.cardLandscape,
                        { maxWidth: isLandscape ? 400 : undefined }
                    ]}>
                        <Text style={styles.cardTitle}>{t('teacherAuth.cardTitle')}</Text>
                        <Text style={styles.cardSubtitle}>
                            {t('teacherAuth.cardSubtitle')}
                        </Text>

                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('teacherAuth.emailPlaceholder')}
                                accessibilityLabel={t('teacherAuth.emailPlaceholder')}
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
                                placeholder={t('teacherAuth.passwordPlaceholder')}
                                accessibilityLabel={t('teacherAuth.passwordPlaceholder')}
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
                                        <Text style={styles.loginButtonText}>{t('teacherAuth.login')}</Text>
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
                                <Text style={styles.demoButtonText}>{t('teacherAuth.demo')}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                            <Text style={styles.forgotLinkText}>{t('teacherAuth.forgot')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info */}
                    <View style={styles.info}>
                        <TouchableOpacity onPress={() => setShowRegister(true)}>
                            <Text style={styles.infoText}>
                                {t('teacherAuth.noAccount')} <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>{t('teacherAuth.signUp')}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Kayıt Modal */}
                <Modal visible={showRegister} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <InAppNotice message={notice} onDismiss={() => setNotice(null)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{'👩‍🏫 ' + t('teacherAuth.regTitle')}</Text>
                                <TouchableOpacity onPress={() => setShowRegister(false)} accessibilityRole="button" accessibilityLabel={t('teacherAuth.close')}>
                                    <Ionicons name="close" size={24} color="#607D8B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('teacherAuth.regName')}
                                    accessibilityLabel={t('teacherAuth.regName')}
                                    placeholderTextColor="#9E9E9E"
                                    value={regName}
                                    onChangeText={setRegName}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#607D8B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('teacherAuth.regEmail')}
                                    accessibilityLabel={t('teacherAuth.regEmail')}
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
                                    placeholder={t('teacherAuth.regPassword')}
                                    accessibilityLabel={t('teacherAuth.regPassword')}
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
                                    placeholder={t('teacherAuth.regSchool')}
                                    accessibilityLabel={t('teacherAuth.regSchool')}
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
                                    <Text style={styles.loginButtonText}>{'🚀 ' + t('teacherAuth.regButton')}</Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.registerNote}>
                                {t('teacherAuth.regNote')}
                            </Text>
                        </View>
                    </View>
                </Modal>
                {!showRegister && <InAppNotice message={notice} onDismiss={() => setNotice(null)} />}
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
    forgotLink: {
        alignSelf: 'center',
        marginTop: 14,
        padding: 4,
    },
    forgotLinkText: {
        fontSize: 13,
        color: '#1E88E5',
        textDecorationLine: 'underline',
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
