import DynamicBackground from '@/components/DynamicBackground';
import Toast from '@/components/Toast';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// SSR-safe Supabase client initialization
let supabase: SupabaseClient;
if (typeof window !== 'undefined') {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true, // Important for handling the reset link
        },
    });
} else {
    supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
        auth: {
            persistSession: false,
        },
    });
}

export default function ResetPassword() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [sessionValid, setSessionValid] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ visible: true, message, type });
    };

    useEffect(() => {
        // Check if we have a valid session from the password reset link
        const checkSession = async () => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                // Extract the hash parameters from the URL
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');

                if (type === 'recovery' && accessToken) {
                    // Set the session using the tokens from the URL
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (error) {
                        console.error('Session error:', error);
                        showToast('Oturum doğrulanamadı. Lütfen şifre sıfırlama bağlantısını tekrar isteyin.', 'error');
                        setSessionValid(false);
                    } else {
                        setSessionValid(true);
                    }
                } else {
                    // Check for existing session
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        setSessionValid(true);
                    } else {
                        showToast('Geçersiz veya süresi dolmuş bağlantı. Lütfen tekrar şifre sıfırlama bağlantısı isteyin.', 'error');
                        setSessionValid(false);
                    }
                }
            }
            setIsCheckingSession(false);
        };

        checkSession();
    }, []);

    const handleResetPassword = async () => {
        if (newPassword.trim().length < 6) {
            showToast('Şifre en az 6 karakter olmalıdır.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Şifreler eşleşmiyor.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                throw error;
            }

            showToast('Şifreniz başarıyla güncellendi!', 'success');

            // Redirect to login after a short delay
            setTimeout(() => {
                router.replace('/');
            }, 2000);
        } catch (error: any) {
            console.error('Password reset error:', error);
            showToast('Şifre güncellenirken bir hata oluştu: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const windowWidth = Dimensions.get('window').width;
    const isMobile = windowWidth < 768;

    if (isCheckingSession) {
        return (
            <DynamicBackground>
                <View style={styles.merkezContainer}>
                    <View style={[styles.card, styles.glassCard, { width: isMobile ? '90%' : undefined, maxWidth: 420 }]}>
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text style={styles.loadingText}>Oturum doğrulanıyor...</Text>
                    </View>
                </View>
            </DynamicBackground>
        );
    }

    if (!sessionValid) {
        return (
            <DynamicBackground>
                <View style={styles.merkezContainer}>
                    <View style={[styles.card, styles.glassCard, { width: isMobile ? '90%' : undefined, maxWidth: 420 }]}>
                        <Text style={styles.errorEmoji}>⚠️</Text>
                        <Text style={styles.errorTitle}>Geçersiz Bağlantı</Text>
                        <Text style={styles.errorText}>
                            Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
                        </Text>
                        <TouchableOpacity
                            style={styles.gradientButton}
                            onPress={() => router.replace('/')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.gradientButtonText}>Giriş Sayfasına Dön</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Toast
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    onHide={() => setToast({ ...toast, visible: false })}
                />
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground>
            <View style={styles.merkezContainer}>
                <View style={[styles.card, styles.glassCard, { width: isMobile ? '90%' : undefined, maxWidth: 420 }]}>
                    {/* Title with Icon */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleEmoji}>🔐</Text>
                        <Text style={styles.girisBaslik}>Yeni Şifre Belirle</Text>
                    </View>
                    <Text style={styles.welcomeSubtitle}>Yeni şifrenizi giriniz</Text>

                    {/* New Password Input */}
                    <View style={[
                        styles.inputContainer,
                        focusedInput === 'newPassword' && styles.inputContainerFocused
                    ]}>
                        <Text style={styles.inputIcon}>🔒</Text>
                        <TextInput
                            style={styles.inputModern}
                            placeholder="Yeni Şifre"
                            placeholderTextColor="#9E9E9E"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            onFocus={() => setFocusedInput('newPassword')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>

                    {/* Confirm Password Input */}
                    <View style={[
                        styles.inputContainer,
                        focusedInput === 'confirmPassword' && styles.inputContainerFocused
                    ]}>
                        <Text style={styles.inputIcon}>🔒</Text>
                        <TextInput
                            style={styles.inputModern}
                            placeholder="Yeni Şifre (Tekrar)"
                            placeholderTextColor="#9E9E9E"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            onFocus={() => setFocusedInput('confirmPassword')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>

                    {/* Password Requirements */}
                    <View style={styles.requirementsContainer}>
                        <Text style={[
                            styles.requirementText,
                            newPassword.length >= 6 && styles.requirementMet
                        ]}>
                            {newPassword.length >= 6 ? '✅' : '○'} En az 6 karakter
                        </Text>
                        <Text style={[
                            styles.requirementText,
                            newPassword === confirmPassword && newPassword.length > 0 && styles.requirementMet
                        ]}>
                            {newPassword === confirmPassword && newPassword.length > 0 ? '✅' : '○'} Şifreler eşleşiyor
                        </Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.gradientButton,
                            isLoading && styles.buttonDisabled
                        ]}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <View style={styles.buttonContent}>
                                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                                <Text style={styles.gradientButtonText}>Güncelleniyor...</Text>
                            </View>
                        ) : (
                            <Text style={styles.gradientButtonText}>Şifreyi Güncelle ✨</Text>
                        )}
                    </TouchableOpacity>

                    {/* Back to Login Link */}
                    <TouchableOpacity
                        style={styles.backLink}
                        onPress={() => router.replace('/')}
                    >
                        <Text style={styles.backLinkText}>← Giriş Sayfasına Dön</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    merkezContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        padding: 32,
        width: 420,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        gap: 8,
    },
    titleEmoji: {
        fontSize: 28,
    },
    girisBaslik: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1A1A2E',
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        borderRadius: 14,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        transition: 'all 0.2s ease',
    },
    inputContainerFocused: {
        borderColor: '#6366F1',
        backgroundColor: '#FFFFFF',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    inputIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    inputModern: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: '#1A1A2E',
        outlineStyle: 'none',
    },
    requirementsContainer: {
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    requirementText: {
        fontSize: 14,
        color: '#999',
        marginBottom: 6,
    },
    requirementMet: {
        color: '#22C55E',
        fontWeight: '500',
    },
    gradientButton: {
        backgroundColor: '#6366F1',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    backLink: {
        marginTop: 20,
        alignItems: 'center',
    },
    backLinkText: {
        color: '#6366F1',
        fontSize: 15,
        fontWeight: '500',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    errorEmoji: {
        fontSize: 48,
        textAlign: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A2E',
        textAlign: 'center',
        marginBottom: 12,
    },
    errorText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
});
