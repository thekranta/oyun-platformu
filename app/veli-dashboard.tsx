import DynamicBackground from '@/components/DynamicBackground';
import VeliDashboard from '@/components/VeliDashboard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: Array<{ text: string, onPress?: () => void, style?: 'cancel' | 'default' | 'destructive' }>) => {
    if (Platform.OS === 'web') {
        if (buttons && buttons.length > 1) {
            // Two buttons: use confirm dialog
            // First button (cancel) = Cancel button, Second button = OK button
            const cancelButton = buttons.find(b => b.style === 'cancel');
            const actionButton = buttons.find(b => b.style !== 'cancel');
            const result = window.confirm(`${title}\n\n${message}\n\n[OK = ${actionButton?.text || 'Yes'}, Cancel = ${cancelButton?.text || 'Cancel'}]`);
            if (result && actionButton?.onPress) {
                actionButton.onPress();
            }
            // If result is false (Cancel clicked), do nothing
        } else {
            // Single button or no buttons: just show alert
            window.alert(`${title}\n\n${message}`);
        }
    } else {
        Alert.alert(title, message, buttons);
    }
};

interface ProfileData {
    email: string;
    parent_name: string;
    child_name: string;
    child_age_months: number;
    subscription_tier: 'free' | 'standard' | 'premium';
}

export default function VeliDashboardPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);

    // Test modu için demo profili
    const useDemoProfile = () => {
        setProfile({
            email: 'demo@test.com',
            parent_name: 'Demo Veli',
            child_name: 'Demo Çocuk',
            child_age_months: 60,
            subscription_tier: 'premium',
        });
    };

    // Profili supabase istemcisiyle çek — oturum jetonu otomatik eklenir (RLS ile uyumlu).
    const loadProfile = async (emailValue: string): Promise<boolean> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('email, parent_name, child_name, child_age_months, subscription_tier')
            .eq('email', emailValue)
            .limit(1);
        if (error) {
            showAlert('Hata', `Profil yüklenemedi: ${error.message}`);
            return false;
        }
        if (data && data.length > 0) {
            setProfile(data[0] as ProfileData);
            return true;
        }
        showAlert(
            'Kayıt Bulunamadı',
            'Bu hesaba bağlı profil bulunamadı.\n\nÖnce ana ekrandan "Kayıt Ol" ile kayıt olun veya Demo ile devam edin.',
            [
                { text: 'Kapat', style: 'cancel' },
                { text: 'Demo Giriş', onPress: useDemoProfile }
            ]
        );
        return false;
    };

    // Aktif oturum varsa doğrudan panele geç (parola tekrar sorulmaz).
    useEffect(() => {
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const sessionEmail = data.session?.user?.email;
                if (sessionEmail) await loadProfile(sessionEmail);
            } catch {
                // sessiz: oturum yoksa giriş formu gösterilir
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            showAlert('Hata', 'Lütfen e-posta ve şifrenizi girin');
            return;
        }

        setLoading(true);
        try {
            const emailValue = email.trim();
            const { error } = await supabase.auth.signInWithPassword({
                email: emailValue,
                password,
            });
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    showAlert('Hata', 'Hatalı e-posta veya şifre.');
                } else {
                    showAlert('Hata', `Giriş başarısız: ${error.message}`);
                }
                return;
            }
            await loadProfile(emailValue);
        } catch (error) {
            showAlert('Hata', `Giriş sırasında bir hata oluştu: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            showAlert('Hata', 'Şifre sıfırlama bağlantısı için önce e-postanızı girin');
            return;
        }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'https://oyun-platformu.vercel.app/reset-password',
            });
            if (error) throw error;
            showAlert('Gönderildi', 'Şifre sıfırlama bağlantısı e-postanıza gönderildi.');
        } catch (error: any) {
            showAlert('Hata', error.message || 'Bağlantı gönderilemedi.');
        }
    };

    // Show dashboard if profile is loaded
    if (profile) {
        return (
            <VeliDashboard
                childName={profile.child_name}
                childAge={profile.child_age_months}
                email={profile.email}
                subscriptionTier={profile.subscription_tier}
                onClose={() => router.back()}
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
                    >
                        <Ionicons name="arrow-back" size={24} color="#1E88E5" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={[styles.header, isLandscape && styles.headerLandscape]}>
                        <Text style={[styles.emoji, isSmallScreen && { fontSize: 40 }]}>👨‍👩‍👧</Text>
                        <Text style={[styles.title, isSmallScreen && { fontSize: 22 }]}>Veli Paneli</Text>
                        <Text style={styles.subtitle}>
                            Çocuğunuzun gelişimini takip edin
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
                            Kayıt olurken kullandığınız e-posta ve şifrenizle giriş yapın
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
                                placeholder="Şifreniz"
                                placeholderTextColor="#9E9E9E"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
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
                                <Ionicons name="flash" size={18} color="#4CAF50" />
                                <Text style={styles.demoButtonText}>Demo</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                            <Text style={styles.forgotLinkText}>Şifremi unuttum</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info */}
                    <View style={styles.info}>
                        <Ionicons name="information-circle-outline" size={16} color="#607D8B" />
                        <Text style={styles.infoText}>
                            Hesabınız yok mu? Ana ekrandan kayıt olabilirsiniz.
                        </Text>
                    </View>
                </ScrollView>
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
        backgroundColor: '#9C27B0',
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
        backgroundColor: '#E8F5E9',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        gap: 6,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    demoButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4CAF50',
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
});
