import DynamicBackground from '@/components/DynamicBackground';
import Toast from '@/components/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export default function SignUp() {
    const router = useRouter();
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
    const [dataConsent, setDataConsent] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ visible: true, message, type });
    };

    // Validation
    const validateForm = (): boolean => {
        if (!parentName.trim()) {
            showToast('Lütfen ebeveyn adını giriniz.', 'error');
            return false;
        }
        if (!email.trim()) {
            showToast('Lütfen e-posta adresini giriniz.', 'error');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('Geçerli bir e-posta adresi giriniz.', 'error');
            return false;
        }
        if (password.length < 6) {
            showToast('Şifre en az 6 karakter olmalıdır.', 'error');
            return false;
        }
        if (!childName.trim()) {
            showToast('Lütfen çocuğun adını giriniz.', 'error');
            return false;
        }
        const age = parseInt(childAge);
        if (!childAge || isNaN(age) || age < 36 || age > 72) {
            showToast('Çocuğun yaşı 36-72 ay arasında olmalıdır.', 'error');
            return false;
        }
        if (!dataConsent) {
            showToast('Lütfen veri kullanım iznini onaylayınız.', 'error');
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
            const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
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
                    throw new Error('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta kullanın.');
                }

                // Check for invalid email format
                if (authData.msg?.includes('invalid') || authData.error_description?.includes('invalid')) {
                    throw new Error('Geçersiz e-posta formatı. Lütfen kontrol edin.');
                }

                // Check for weak password
                if (authData.msg?.includes('password') || authData.error_description?.includes('password')) {
                    throw new Error('Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.');
                }

                // Generic error
                throw new Error(authData.msg || authData.error_description || authData.message || 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.');
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

                const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY || '',
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
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
            showToast(`🎉 Hoş geldin ${childName.trim()}! Kayıt başarılı.`, 'success');

            // 4. Redirect to game selection after short delay
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 1800);

        } catch (error: any) {
            console.error('Kayıt hatası:', error);
            showToast(error.message || 'Kayıt sırasında beklenmedik bir hata oluştu.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Age picker buttons (36-72 months)
    const ageOptions = [36, 42, 48, 54, 60, 66, 72];

    return (
        <DynamicBackground>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                            <Text style={styles.title}>Kayıt Ol</Text>
                        </View>
                        <Text style={styles.subtitle}>Bulutların Üzerinde Akademi'ye hoş geldiniz!</Text>

                        {/* Parent Section */}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person" size={20} color="#1565C0" />
                            <Text style={styles.sectionTitle}>Ebeveyn Bilgileri</Text>
                        </View>

                        {/* Parent Name */}
                        <View style={[
                            styles.inputContainer,
                            focusedInput === 'parentName' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>👤</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder="Ad Soyad *"
                                placeholderTextColor="#9E9E9E"
                                value={parentName}
                                onChangeText={setParentName}
                                onFocus={() => setFocusedInput('parentName')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        {/* Email */}
                        <View style={[
                            styles.inputContainer,
                            focusedInput === 'email' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>✉️</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder="E-posta *"
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
                        <View style={[
                            styles.inputContainer,
                            focusedInput === 'password' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>🔒</Text>
                            <TextInput
                                style={[styles.inputModern, { flex: 1 }]}
                                placeholder="Şifre (min. 6 karakter) *"
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
                            <Text style={styles.sectionTitle}>Çocuk Bilgileri</Text>
                        </View>

                        {/* Child Name */}
                        <View style={[
                            styles.inputContainer,
                            focusedInput === 'childName' && styles.inputContainerFocused
                        ]}>
                            <Text style={styles.inputIcon}>👶</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder="Çocuğun Adı *"
                                placeholderTextColor="#9E9E9E"
                                value={childName}
                                onChangeText={setChildName}
                                onFocus={() => setFocusedInput('childName')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        {/* Child Age */}
                        <Text style={styles.fieldLabel}>Yaş (Ay) *</Text>
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
                        <Text style={styles.ageHint}>veya</Text>
                        <View style={[
                            styles.inputContainer,
                            focusedInput === 'childAge' && styles.inputContainerFocused,
                            { marginBottom: 16 }
                        ]}>
                            <Text style={styles.inputIcon}>📅</Text>
                            <TextInput
                                style={styles.inputModern}
                                placeholder="Yaş girin (36-72 ay)"
                                placeholderTextColor="#9E9E9E"
                                value={childAge}
                                onChangeText={setChildAge}
                                keyboardType="numeric"
                                onFocus={() => setFocusedInput('childAge')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        {/* Data Consent */}
                        <View style={styles.consentSection}>
                            <TouchableOpacity
                                style={styles.consentContainer}
                                onPress={() => setDataConsent(!dataConsent)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, dataConsent && styles.checkboxChecked]}>
                                    {dataConsent && <Ionicons name="checkmark" size={16} color="#fff" />}
                                </View>
                                <Text style={styles.consentText}>
                                    Verilerimin akademik araştırma kapsamında anonim olarak kullanılmasına izin veriyorum.
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowConsentModal(true)}>
                                <Text style={styles.learnMoreLink}>Daha Fazla Öğren</Text>
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
                                    <Text style={styles.submitButtonText}>Kayıt Yapılıyor...</Text>
                                </View>
                            ) : (
                                <Text style={styles.submitButtonText}>Kayıt Ol ✨</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back to Login */}
                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={18} color="#1976D2" />
                            <Text style={styles.backLinkText}>Giriş ekranına dön</Text>
                        </TouchableOpacity>

                        <Text style={styles.requiredNote}>* Zorunlu alanlar</Text>
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
                            <Text style={styles.modalTitle}>📋 BİLGİLENDİRİLMİŞ GÖNÜLLÜ OLUR FORMU</Text>
                            <Text style={styles.modalSubtitle}>(Aydınlatılmış Onam)</Text>

                            <Text style={styles.modalParagraph}>
                                <Text style={styles.modalBold}>Değerli Ebeveyn,</Text>{"\n\n"}
                                Bu platform, okul öncesi dönemdeki çocukların bilişsel, matematiksel ve sosyal-duygusal becerilerini oyun temelli bir ortamda analiz etmek amacıyla geliştirilmiş akademik tabanlı bir eğitim teknolojisi projesidir. Çocuğunuzun platform üzerindeki etkileşimleri, bir yapay zeka modeli (Gemini AI) tarafından Milli Eğitim Bakanlığı "Türkiye Yüzyılı Maarif Modeli" göstergeleri doğrultusunda değerlendirilmektedir.
                            </Text>

                            <Text style={styles.modalSectionTitle}>📊 Verilerin Kullanım Amacı</Text>
                            <Text style={styles.modalParagraph}>
                                Platform üzerinden toplanan oyun verileri (tamamlama süresi, hata sayısı, çözümleme stratejileri vb.) şu amaçlarla kullanılacaktır:{"\n\n"}
                                • Çocuğun gelişimsel seyrini takip ederek ebeveyne pedagojik geri bildirim sunmak.{"\n"}
                                • Yapay zeka modelinin eğitimsel analiz doğruluğunu ölçmek.{"\n"}
                                • Elde edilen anonim verileri bilimsel makale, bildiri ve akademik yayınlarda istatistiksel veri olarak kullanmak.
                            </Text>

                            <Text style={styles.modalSectionTitle}>🔒 Gizlilik ve Güvenlik</Text>
                            <Text style={styles.modalParagraph}>
                                <Text style={styles.modalBold}>Anonimleştirme:</Text> Çocuğunuzun gerçek ismi ve sizin iletişim bilgileriniz akademik yayınlarda kesinlikle kullanılmayacaktır. Veriler, "Öğrenci A", "44 Aylık Katılımcı" gibi anonim kodlarla raporlanacaktır.{"\n\n"}
                                <Text style={styles.modalBold}>Veri Koruma:</Text> Toplanan veriler güvenli bulut sunucularında (Supabase) saklanmakta ve üçüncü şahıslarla ticari amaçla paylaşılmamaktadır.{"\n\n"}
                                <Text style={styles.modalBold}>Gönüllülük Esası:</Text> Bu çalışmaya katılım tamamen gönüllülük esasına dayanır. İstediğiniz zaman kaydınızı silme ve verilerinizin kullanım onayını geri çekme hakkına sahipsiniz.
                            </Text>

                            <Text style={styles.modalSectionTitle}>✅ Onayınızın Önemi</Text>
                            <Text style={styles.modalParagraph}>
                                Kayıt ekranındaki kutucuğu işaretleyerek; yukarıdaki bilgilendirmeyi okuduğunuzu, verilerin akademik araştırma kapsamında kullanılmasını kabul ettiğinizi ve platformun kullanım şartlarına onay verdiğinizi beyan etmiş olursunuz.
                            </Text>

                            <Text style={styles.modalSectionTitle}>📧 İletişim</Text>
                            <Text style={styles.modalParagraph}>
                                Araştırma süreci veya verilerin kullanımıyla ilgili her türlü sorunuz için ChildhoodTech Ekibi ve ilgili araştırmacılarla e-posta yoluyla iletişime geçebilirsiniz.
                            </Text>

                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowConsentModal(false)}
                            >
                                <Text style={styles.modalCloseButtonText}>Kapat</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
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
