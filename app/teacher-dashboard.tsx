import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import DynamicBackground from '../components/DynamicBackground';
import TeacherDashboard from '../components/TeacherDashboard';

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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

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
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<TeacherProfile | null>(null);

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

    const handleLogin = async () => {
        if (!email.trim()) {
            showAlert('Hata', 'Lütfen email adresinizi girin');
            return;
        }

        setLoading(true);
        try {
            const emailValue = email.trim();
            const queryUrl = `${SUPABASE_URL}/rest/v1/teachers?email=eq.${encodeURIComponent(emailValue)}`;

            const response = await fetch(queryUrl, {
                headers: {
                    'apikey': SUPABASE_KEY!,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data && Array.isArray(data) && data.length > 0) {
                setProfile(data[0]);
            } else if (data && data.message) {
                console.error('Supabase error:', data.message);
                showAlert('API Hatası', `Supabase: ${data.message}`);
            } else {
                showAlert(
                    'Kayıt Bulunamadı',
                    `"${emailValue}" ile kayıtlı öğretmen hesabı bulunamadı.\n\nDemo ile devam edebilirsiniz.`,
                    [
                        { text: 'Kapat', style: 'cancel' },
                        { text: 'Demo Giriş', onPress: useDemoProfile }
                    ]
                );
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
            showAlert('Hata', `Profil yüklenirken bir hata oluştu: ${error}`);
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
                        <Ionicons name="information-circle-outline" size={16} color="#607D8B" />
                        <Text style={styles.infoText}>
                            Öğretmen hesabı için okul yöneticinize başvurun.
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
});
