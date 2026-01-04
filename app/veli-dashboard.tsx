import DynamicBackground from '@/components/DynamicBackground';
import VeliDashboard from '@/components/VeliDashboard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

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
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);

    const handleLogin = async () => {
        if (!email.trim()) {
            Alert.alert('Hata', 'Lütfen email adresinizi girin');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email.trim())}`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY!,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                setProfile(data[0]);
            } else {
                Alert.alert(
                    'Kayıt Bulunamadı',
                    'Bu email ile kayıtlı bir hesap bulunamadı. Lütfen kayıt olduğunuz email adresini girin.',
                    [{ text: 'Tamam' }]
                );
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
            Alert.alert('Hata', 'Profil yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    // Show dashboard if profile is loaded
    if (profile) {
        return (
            <VeliDashboard
                childName={profile.child_name}
                childAge={profile.child_age_months}
                email={profile.email}
                onClose={() => setProfile(null)} // Go back to login
            />
        );
    }

    // Show login form
    return (
        <DynamicBackground>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.content}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1E88E5" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.emoji}>👨‍👩‍👧</Text>
                        <Text style={styles.title}>Veli Paneli</Text>
                        <Text style={styles.subtitle}>
                            Çocuğunuzun gelişimini takip edin
                        </Text>
                    </View>

                    {/* Login Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Giriş Yapın</Text>
                        <Text style={styles.cardSubtitle}>
                            Kayıt olurken kullandığınız email adresini girin
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

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
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
                    </View>

                    {/* Info */}
                    <View style={styles.info}>
                        <Ionicons name="information-circle-outline" size={16} color="#607D8B" />
                        <Text style={styles.infoText}>
                            Hesabınız yok mu? Ana ekrandan kayıt olabilirsiniz.
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
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
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#263238',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#607D8B',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
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
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#9C27B0',
        borderRadius: 16,
        height: 56,
        gap: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    info: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        gap: 6,
    },
    infoText: {
        fontSize: 13,
        color: '#607D8B',
    },
});
