import DynamicBackground from '@/components/DynamicBackground';
import Toast from '@/components/Toast';
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
    View,
} from 'react-native';

import { EMAIL_CONFIRM_REDIRECT, resendConfirmation } from '../lib/authFlow';
import { LEGAL_URLS, openExternalLink } from '../lib/externalLink';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

const openPrivacy = () => { openExternalLink(LEGAL_URLS.privacy); };
const openTerms = () => { openExternalLink(LEGAL_URLS.terms); };

export default function SignUp() {
    const router = useRouter();
    const { t } = useTranslation();
    const windowWidth = Dimensions.get('window').width;
    const isMobile = windowWidth < 768;

    // Parent fields
    const [parentName, setParentName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Child fields
    const [childName, setChildName] = useState('');
    const [childAge, setChildAge] = useState('');

    // State
    // Zorunlu onay: kullanım şartları + veli olarak çocuğun bilgilerinin hizmet için işlenmesi.
    // İsteğe bağlı (varsayılan KAPALI): akademik araştırma izni. Kayıt, araştırma izni verilmeden de tamamlanır.
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [dataConsent, setDataConsent] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // E-posta doğrulaması açıksa kayıt, bağlantıya tıklanana kadar oturum DÖNDÜRMEZ: bu durumda bu e-posta gösterilir.
    const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ visible: true, message, type });
    };

    // Validation
    const validateForm = (): boolean => {
        if (!parentName.trim()) {
            showToast(t('signup.errors.needParentName'), 'error');
            return false;
        }
        if (!email.trim()) {
            showToast(t('signup.errors.needEmail'), 'error');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast(t('signup.errors.validEmail'), 'error');
            return false;
        }
        if (password.length < 6) {
            showToast(t('signup.errors.shortPassword'), 'error');
            return false;
        }
        if (!childName.trim()) {
            showToast(t('signup.errors.needChildName'), 'error');
            return false;
        }
        const age = parseInt(childAge);
        if (!childAge || isNaN(age) || age < 36 || age > 72) {
            showToast(t('signup.errors.ageRange'), 'error');
            return false;
        }
        if (!termsAccepted) {
            showToast(t('signup.errors.needTerms'), 'error');
            return false;
        }
        return true;
    };

    // Sign up function
    const handleSignUp = async () => {
        if (isLoading) return;
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // 1. Create user in Supabase Auth
            const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(EMAIL_CONFIRM_REDIRECT)}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY || '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password: password,
                    data: {
                        parent_name: parentName.trim(),
                        child_name: childName.trim(),
                        // Doğrulama açıksa profil kayıt anında yazılamaz; bu bilgiler ilk girişte profile dönüştürülür (lib/authFlow.ts).
                        child_age_months: parseInt(childAge),
                        data_consent: dataConsent,
                    }
                }),
            });

            const authData = await authResponse.json();

            // Handle specific error cases
            if (!authResponse.ok) {
                // Check for duplicate email
                if (authData.msg?.includes('already registered') ||
                    authData.error_description?.includes('already registered') ||
                    authData.message?.includes('already registered')) {
                    throw new Error(t('signup.errors.alreadyRegistered'));
                }

                // Check for invalid email format
                if (authData.msg?.includes('invalid') || authData.error_description?.includes('invalid')) {
                    throw new Error(t('signup.errors.invalidEmailFormat'));
                }

                // Check for weak password
                if (authData.msg?.includes('password') || authData.error_description?.includes('password')) {
                    throw new Error(t('signup.errors.weakPassword'));
                }

                // Generic error
                throw new Error(authData.msg || authData.error_description || authData.message || t('signup.errors.signupFailed'));
            }

            // E-posta doğrulaması açık: hesap oluştu ama oturum yok → kullanıcıya bağlantıyı onaylamasını söyle.
            if (!(authData.access_token || authData.session?.access_token)) {
                setAwaitingEmail(email.trim().toLowerCase());
                return;
            }

            // Get the user ID from auth response
            const userId = authData.id || authData.user?.id;

            if (!userId) {
                console.warn('User ID alınamadı, profil kaydı atlanıyor');
            }

            // 2. Create profile in profiles table
            if (userId) {
                const profileData = {
                    user_id: userId,
                    parent_name: parentName.trim(),
                    email: email.trim().toLowerCase(),
                    child_name: childName.trim(),
                    child_age_months: parseInt(childAge),
                    data_consent: dataConsent,
                    created_at: new Date().toISOString(),
                };

                // RLS (own_insert_profiles: email = auth.email()) icin kayittan donen
                // oturum jetonunu kullan; e-posta dogrulamasi acikken jeton gelmez —
                // o durumda anon key'e duser ve profil kaydi girin sonrasina kalir.
                const signupToken: string | undefined = authData.access_token || authData.session?.access_token;
                const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${signupToken || SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify(profileData),
                });

                if (!profileResponse.ok) {
                    const profileError = await profileResponse.text();
                    console.warn('Profil kaydı hatası:', profileError);
                    // Don't throw - auth is successful, just log the profile error
                }
            }

            // 3. Show success message with child's name
            showToast(t('signup.success', { name: childName.trim() }), 'success');

            // 4. Redirect to game selection after short delay
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 1800);

        } catch (error: any) {
            console.error('Kayıt hatası:', error);
            showToast(error.message || t('signup.errors.unexpected'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Age picker buttons (36-72 months)
    const ageOptions = [36, 42, 48, 54, 60, 66, 72];

    if (awaitingEmail) {
        return (
            <DynamicBackground>
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, styles.glassCard, { width: isMobile ? '95%' : 450, maxWidth: 500, alignItems: 'center' }]}>
                        <Text style={styles.titleEmoji}>✉️</Text>
                        <Text style={styles.title}>{t('signup.confirm.title')}</Text>
                        <Text style={[styles.subtitle, { textAlign: 'center' }]}>{awaitingEmail}</Text>
                        <Text style={styles.confirmText}>{t('signup.confirm.sent')}</Text>
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={async () => {
                                const ok = await resendConfirmation(awaitingEmail);
                                showToast(ok ? t('signup.confirm.resendOk') : t('signup.confirm.resendFail'), ok ? 'success' : 'error');
                            }}
                            accessibilityRole="button"
                        >
                            <Text style={styles.confirmBtnText}>{t('signup.confirm.resend')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmLink} onPress={() => router.replace('/(tabs)')} accessibilityRole="button">
                            <Text style={styles.confirmLinkText}>{t('signup.confirm.backToLogin')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[
                        styles.card,
                        styles.glassCard,
                        { width: isMobile ? '95%' : 450, maxWidth: 500 }
                    ]}>
                        {/* Header */}
                        <View style={styles.headerContainer}>
                            <Text style={styles.titleEmoji}>🌟</Text>
                            <Text style={styles.title}>{t('signup.title')}</Text>
                        </View>
                        <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>

                        {/* Parent Section */}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person" size={20} color="#1565C0" />
                            <Text style={styles.sectionTitle}>{t('signup.parentSection')}</Text>
                        </View>

                        {/* Parent Name */}
                        <View collapsable={false} style={[
                            styles.inputContainer,
                            focusedInput === 'parentName' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>👤</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder={t('signup.parentNamePlaceholder')}
                                placeholderTextColor="#9E9E9E"
                                value={parentName}
                                onChangeText={setParentName}
                                onFocus={() => setFocusedInput('parentName')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        {/* Email */}
                        <View collapsable={false} style={[
                            styles.inputContainer,
                            focusedInput === 'email' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>✉️</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder={t('signup.emailPlaceholder')}
                                placeholderTextColor="#9E9E9E"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocusedInput('email')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        {/* Password */}
                        <View collapsable={false} style={[
                            styles.inputContainer,
                            focusedInput === 'password' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>🔒</Text>
                            <TextInput
                                style={[styles.inputModern, { flex: 1 }]}
                                placeholder={t('signup.passwordPlaceholder')}
                                placeholderTextColor="#9E9E9E"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onFocus={() => setFocusedInput('password')}
                                onBlur={() => setFocusedInput(null)}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={22}
                                    color="#78909C"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Child Section */}
                        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                            <Ionicons name="happy" size={20} color="#1565C0" />
                            <Text style={styles.sectionTitle}>{t('signup.childSection')}</Text>
                        </View>

                        {/* Child Name */}
                        <View collapsable={false} style={[
                            styles.inputContainer,
                            focusedInput === 'childName' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>👶</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder={t('signup.childNamePlaceholder')}
                                placeholderTextColor="#9E9E9E"
                                value={childName}
                                onChangeText={setChildName}
                                onFocus={() => setFocusedInput('childName')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        {/* Child Age */}
                        <Text style={styles.fieldLabel}>{t('signup.ageLabel')}</Text>
                        <View style={styles.agePickerContainer}>
                            {ageOptions.map((age) => (
                                <TouchableOpacity
                                    key={age}
                                    style={[
                                        styles.ageButton,
                                        childAge === age.toString() && styles.ageButtonSelected
                                    ]}
                                    onPress={() => setChildAge(age.toString())}
                                >
                                    <Text style={[
                                        styles.ageButtonText,
                                        childAge === age.toString() && styles.ageButtonTextSelected
                                    ]}>
                                        {age}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.ageHint}>{t('signup.ageOr')}</Text>
                        <View collapsable={false} style={[
                            styles.inputContainer,
                            focusedInput === 'childAge' && styles.inputContainerFocused,
                            { marginBottom: 16 }
                        ]}>
                            <Text style={styles.inputIcon}>📅</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder={t('signup.agePlaceholder')}
                                placeholderTextColor="#9E9E9E"
                                value={childAge}
                                onChangeText={setChildAge}
                                keyboardType="numeric"
                                onFocus={() => setFocusedInput('childAge')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        {/* Zorunlu onay (şartlar + çocuk bilgisinin işlenmesi) ve isteğe bağlı araştırma izni */}
                        <View style={styles.consentSection}>
                            <TouchableOpacity
                                style={styles.consentContainer}
                                onPress={() => setTermsAccepted(!termsAccepted)}
                                activeOpacity={0.7}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: termsAccepted }}
                            >
                                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                                    {termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
                                </View>
                                <Text style={styles.consentText}>{t('signup.termsLabel')}</Text>
                            </TouchableOpacity>
                            <View style={styles.legalLinksRow}>
                                <TouchableOpacity onPress={openPrivacy}>
                                    <Text style={styles.legalLinkText}>{t('signup.privacyLink')}</Text>
                                </TouchableOpacity>
                                <Text style={styles.legalLinkDivider}>·</Text>
                                <TouchableOpacity onPress={openTerms}>
                                    <Text style={styles.legalLinkText}>{t('signup.termsLink')}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.consentContainer, { marginTop: 14 }]}
                                onPress={() => setDataConsent(!dataConsent)}
                                activeOpacity={0.7}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: dataConsent }}
                            >
                                <View style={[styles.checkbox, dataConsent && styles.checkboxChecked]}>
                                    {dataConsent && <Ionicons name="checkmark" size={16} color="#fff" />}
                                </View>
                                <Text style={styles.consentText}>{t('signup.researchLabel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowConsentModal(true)}>
                                <Text style={styles.learnMoreLink}>{t('signup.learnMore')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                            onPress={handleSignUp}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <View style={styles.buttonContent}>
                                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                                    <Text style={styles.submitButtonText}>{t('signup.submitting')}</Text>
                                </View>
                            ) : (
                                <Text style={styles.submitButtonText}>{t('signup.submit')}</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back to Login */}
                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={18} color="#1976D2" />
                            <Text style={styles.backLinkText}>{t('signup.backToLogin')}</Text>
                        </TouchableOpacity>

                        <Text style={styles.requiredNote}>{t('signup.requiredNote')}</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />

            {/* Consent Info Modal */}
            <Modal
                visible={showConsentModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConsentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { width: isMobile ? '95%' : 550 }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>{t('signup.modal.title')}</Text>
                            <Text style={styles.modalSubtitle}>{t('signup.modal.subtitle')}</Text>

                            <Text style={styles.modalParagraph}>
                                <Text style={styles.modalBold}>{t('signup.modal.greeting')}</Text>{"\n\n"}
                                {t('signup.modal.intro')}
                            </Text>

                            <Text style={styles.modalSectionTitle}>{t('signup.modal.purposeTitle')}</Text>
                            <Text style={styles.modalParagraph}>
                                {t('signup.modal.purposeIntro')}{"\n\n"}
                                {t('signup.modal.purpose1')}{"\n"}
                                {t('signup.modal.purpose2')}{"\n"}
                                {t('signup.modal.purpose3')}
                            </Text>

                            <Text style={styles.modalSectionTitle}>{t('signup.modal.privacyTitle')}</Text>
                            <Text style={styles.modalParagraph}>
                                <Text style={styles.modalBold}>{t('signup.modal.anonLabel')}</Text> {t('signup.modal.anonText')}{"\n\n"}
                                <Text style={styles.modalBold}>{t('signup.modal.protectLabel')}</Text> {t('signup.modal.protectText')}{"\n\n"}
                                <Text style={styles.modalBold}>{t('signup.modal.voluntaryLabel')}</Text> {t('signup.modal.voluntaryText')}
                            </Text>

                            <Text style={styles.modalSectionTitle}>{t('signup.modal.consentTitle')}</Text>
                            <Text style={styles.modalParagraph}>
                                {t('signup.modal.consentText')}
                            </Text>

                            <Text style={styles.modalSectionTitle}>{t('signup.modal.contactTitle')}</Text>
                            <Text style={styles.modalParagraph}>
                                {t('signup.modal.contactText')}
                            </Text>

                            <Text style={styles.modalSectionTitle}>{t('signup.modal.legalTitle')}</Text>
                            <View style={[styles.legalLinksRow, { marginLeft: 0 }]}>
                                <TouchableOpacity onPress={openPrivacy}>
                                    <Text style={styles.legalLinkText}>{t('signup.privacyLink')}</Text>
                                </TouchableOpacity>
                                <Text style={styles.legalLinkDivider}>·</Text>
                                <TouchableOpacity onPress={openTerms}>
                                    <Text style={styles.legalLinkText}>{t('signup.termsLink')}</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowConsentModal(false)}
                            >
                                <Text style={styles.modalCloseButtonText}>{t('signup.modal.close')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    confirmText: { fontSize: 15, color: '#37474F', textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 18, paddingHorizontal: 8 },
    confirmBtn: { backgroundColor: '#1E88E5', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20, alignSelf: 'stretch', alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    confirmLink: { paddingVertical: 14 },
    confirmLinkText: { color: '#1565C0', fontSize: 15, fontWeight: '700' },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingVertical: 40,
    },
    card: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 25,
        alignItems: 'center',
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        borderRadius: 30,
        padding: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        } : {}),
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleEmoji: {
        fontSize: 32,
        marginRight: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1565C0',
    },
    subtitle: {
        fontSize: 15,
        color: '#78909C',
        marginBottom: 24,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1565C0',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E8E8E8',
        paddingHorizontal: 16,
        minHeight: 52, // Touch-friendly height (h-12/h-14)
    },
    inputContainerFocused: {
        borderColor: '#B2DFDB',
        backgroundColor: '#FFFFFF',
        shadowColor: '#B2DFDB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    inputModern: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 14,
        color: '#37474F',
        ...(Platform.OS === 'web' ? {
            outline: 'none',
        } : {}),
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#546E7A',
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    agePickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
        width: '100%',
        justifyContent: 'center',
    },
    ageButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#FAFAFA',
        minWidth: 52,
        alignItems: 'center',
    },
    ageButtonSelected: {
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E9',
    },
    ageButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    ageButtonTextSelected: {
        color: '#2E7D32',
    },
    ageHint: {
        fontSize: 12,
        color: '#9E9E9E',
        marginBottom: 8,
    },
    consentContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
        marginTop: 8,
        marginBottom: 16,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#BDBDBD',
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    consentText: {
        flex: 1,
        fontSize: 13,
        color: '#546E7A',
        lineHeight: 20,
    },
    submitButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 18,
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        ...(Platform.OS === 'web' ? {
            background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 50%, #2E7D32 100%)',
            transition: 'transform 0.2s ease',
        } : {}),
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
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
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        gap: 6,
    },
    backLinkText: {
        fontSize: 14,
        color: '#1976D2',
        fontWeight: '500',
    },
    requiredNote: {
        fontSize: 12,
        color: '#9E9E9E',
        marginTop: 16,
    },

    // Consent Section
    consentSection: {
        width: '100%',
        marginBottom: 8,
    },
    learnMoreLink: {
        fontSize: 13,
        color: '#1976D2',
        fontWeight: '600',
        marginTop: 8,
        marginLeft: 36,
        textDecorationLine: 'underline',
    },
    legalLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        marginLeft: 36,
    },
    legalLinkText: {
        fontSize: 12,
        color: '#78909C',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    legalLinkDivider: {
        fontSize: 12,
        color: '#B0BEC5',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1565C0',
        textAlign: 'center',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#78909C',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2E7D32',
        marginTop: 16,
        marginBottom: 8,
    },
    modalParagraph: {
        fontSize: 14,
        color: '#37474F',
        lineHeight: 22,
        textAlign: 'justify',
    },
    modalBold: {
        fontWeight: '700',
        color: '#1a1a2e',
    },
    modalCloseButton: {
        backgroundColor: '#1976D2',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 12,
        marginTop: 24,
        alignSelf: 'center',
    },
    modalCloseButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
