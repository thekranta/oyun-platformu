import AileSepetiMacerasi from '@/components/AileSepetiMacerasi';
import BunuSoyle from '@/components/BunuSoyle';
import CevizMacera from '@/components/CevizMacera';
import DiziyiTamamla from '@/components/DiziyiTamamla';
import DynamicBackground from '@/components/DynamicBackground';
import EksikSayiBul from '@/components/EksikSayiBul';
import GruplamaOyunu from '@/components/GruplamaOyunu';
import HafizaOyunu from '@/components/HafizaOyunu';
import KodlamaOyunu from '@/components/KodlamaOyunu';
import KutuyuBul from '@/components/KutuyuBul';
import MuzikCalar, { SONGS } from '@/components/MuzikCalar';
import OnlukCerceve from '@/components/OnlukCerceve';
import QuantityComparison from '@/components/QuantityComparison';
import RakamYazma from '@/components/RakamYazma';
import SayiKomsulari from '@/components/SayiKomsulari';
import SayilariBirlestir from '@/components/SayilariBirlestir';
import ShadowDetective from '@/components/ShadowDetective';
import SiralamaOyunu from '@/components/SiralamaOyunu';
import { useSound } from '@/components/SoundContext';
import TartiDengesi from '@/components/TartiDengesi';
import Toast from '@/components/Toast';
import YapbozOyunu from '@/components/YapbozOyunu';
import YaraticiCizim from '@/components/YaraticiCizim';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const DRAWING_BUCKET = 'cizimler';

// Cloudflare Turnstile Sitekey
const TURNSTILE_SITE_KEY = '0x4AAAAAACKOXlQA9AJnb7EV';

const slugifyName = (name: string) => {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'ogrenci';
};

export default function App() {
  const router = useRouter();
  const { isMuted, toggleMute, resumeAfterInteraction } = useSound();
  const [asama, setAsama] = useState('giris');
  const [ad, setAd] = useState('');
  const [yas, setYas] = useState('');
  const [email, setEmail] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

  // Registration states
  const [showRegistration, setShowRegistration] = useState(false);
  const [regAd, setRegAd] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCinsiyet, setRegCinsiyet] = useState<'erkek' | 'kiz' | null>(null);
  const [yasInputMode, setYasInputMode] = useState<'ay' | 'tarih'>('ay');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [regYasAy, setRegYasAy] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Turnstile CAPTCHA token state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [regTurnstileToken, setRegTurnstileToken] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const girisYap = async () => {
    // Throttle: prevent double-clicks
    if (isLoggingIn) return;

    if (ad.trim() === '' || yas.trim() === '') {
      showToast('Lütfen isim ve yaş giriniz.', 'error');
      return;
    }
    if (email.trim() === '') {
      showToast('Lütfen e-posta giriniz.', 'error');
      return;
    }
    if (!/^\d+$/.test(yas)) {
      showToast('Lütfen yaş alanına sadece rakam giriniz.', 'error');
      return;
    }
    const yasNum = parseInt(yas);
    if (yasNum < 24 || yasNum > 75) {
      showToast('Yaş 24 ile 75 ay arasında olmalıdır.', 'error');
      return;
    }

    // Turnstile CAPTCHA doğrulama (geçici olarak devre dışı)
    // if (Platform.OS === 'web' && !turnstileToken) {
    //   showToast('Lütfen güvenlik doğrulamasını tamamlayın.', 'error');
    //   return;
    // }

    setIsLoggingIn(true);
    try {
      // Start background music after first user interaction
      await resumeAfterInteraction();
      setAsama('menu');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Hızlı Test Girişi - Doğrudan oyunlara git
  const hizliTestGiris = async () => {
    setAd('Test');
    setYas('60');
    setEmail('test@test.com');
    await resumeAfterInteraction();
    setAsama('menu');
  };

  // Calculate age in months from birth date
  const calculateAgeInMonths = (dateString: string): number | null => {
    // Expected format: DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
    let day, month, year;

    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      }
    } else if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
          day = parseInt(parts[2]);
        } else {
          // DD-MM-YYYY format
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
          year = parseInt(parts[2]);
        }
      }
    }

    if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();

    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 +
      (today.getMonth() - birthDate.getMonth());

    return months;
  };

  // Registration function
  const kayitOl = async () => {
    if (isRegistering) return;

    if (regAd.trim() === '') {
      showToast('Lütfen çocuğun adını giriniz.', 'error');
      return;
    }
    if (regEmail.trim() === '') {
      showToast('Lütfen e-posta adresini giriniz.', 'error');
      return;
    }
    if (!regCinsiyet) {
      showToast('Lütfen cinsiyet seçiniz.', 'error');
      return;
    }

    let finalYasAy: number;
    if (yasInputMode === 'tarih') {
      const calculated = calculateAgeInMonths(dogumTarihi);
      if (calculated === null || calculated < 24 || calculated > 75) {
        showToast('Geçerli bir doğum tarihi giriniz (24-75 ay arası).', 'error');
        return;
      }
      finalYasAy = calculated;
    } else {
      if (!/^\d+$/.test(regYasAy) || parseInt(regYasAy) < 24 || parseInt(regYasAy) > 75) {
        showToast('Yaş 24 ile 75 ay arasında olmalıdır.', 'error');
        return;
      }
      finalYasAy = parseInt(regYasAy);
    }

    setIsRegistering(true);
    try {
      // Save to Supabase
      const kayitVerisi = {
        ogrenci_adi: regAd.trim(),
        email: regEmail.trim(),
        ogrenci_yasi: finalYasAy,
        cinsiyet: regCinsiyet,
        kayit_tarihi: new Date().toISOString(),
      };

      // For now, we'll use this data directly for login
      // In a real app, this would be saved to a users table
      setAd(regAd.trim());
      setYas(finalYasAy.toString());
      setEmail(regEmail.trim());

      showToast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
      setShowRegistration(false);

      // Reset registration form
      setRegAd('');
      setRegEmail('');
      setRegCinsiyet(null);
      setDogumTarihi('');
      setRegYasAy('');
    } catch (error) {
      showToast('Kayıt sırasında bir hata oluştu.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const oyunuBaslat = (oyunTipi: string) => {
    setYukleniyor(false);
    setAsama(oyunTipi);
  };

  const oyunuBitir = (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: {
      cizimVerisi?: string;
      cizimResimBase64?: string;
      cizimResimFormat?: 'png' | 'jpeg';
      zorlukSeviyesi?: number;
      kazanimOdagi?: string;
      denemeNo?: number;
    },
  ) => {
    setAsama('sonuc');
    sessizceAnalizEtVeKaydet(oyunAdi, sure, finalHamle, finalHata, algilananKelime, extraData);
  };

  const cikisYap = () => {
    setAd('');
    setYas('');
    setEmail('');
    setAsama('giris');
  };

  const sessizceAnalizEtVeKaydet = async (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: {
      cizimVerisi?: string;
      cizimResimBase64?: string;
      cizimResimFormat?: 'png' | 'jpeg';
      zorlukSeviyesi?: number;
      kazanimOdagi?: string;
      denemeNo?: number;
      // Miktar Avcısı specific fields
      distance_effect?: number;
      response_time?: number;
      round_history?: any;
      correct_answers?: number;
      cognitive_speed_score?: number;
    },
  ) => {
    setYukleniyor(true);
    try {
      const uploadDrawingImage = async () => {
        if (!extraData?.cizimResimBase64 || !SUPABASE_URL || !SUPABASE_KEY) return null;
        const format = extraData.cizimResimFormat || 'png';
        // Base64 string'den data URL prefix'ini temizle (varsa)
        const cleanBase64 = extraData.cizimResimBase64.includes(',')
          ? extraData.cizimResimBase64.split(',')[1]
          : extraData.cizimResimBase64;
        const safeName = slugifyName(ad);
        const fileName = `${safeName}-${yas}-${Date.now()}.${format}`;
        const filePath = `${safeName}/${fileName}`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${DRAWING_BUCKET}/${filePath}`;
        const headers = {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': `image/${format}`,
          'x-upsert': 'true',
        };

        if (Platform.OS === 'web') {
          const blob = await fetch(`data:image/${format};base64,${cleanBase64}`).then(res => res.blob());
          const response = await fetch(uploadUrl, { method: 'POST', headers, body: blob });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Cizim yukleme hatasi: ${errText}`);
          }
        } else {
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, cleanBase64, { encoding: FileSystem.EncodingType.Base64 });
          const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers,
          });
          if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error(`Cizim yukleme hatasi: ${uploadResult.body || uploadResult.status}`);
          }
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }

        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${DRAWING_BUCKET}/${filePath}`;
        return { imageUrl, filePath, format };
      };

      let uploadResult: { imageUrl: string; filePath: string; format: string } | null = null;
      try {
        uploadResult = await uploadDrawingImage();
      } catch (error) {
        console.error('Cizim yukleme hatasi:', error);
      }

      const kayitVerisi: Record<string, any> = {
        oyun_turu: oyunAdi,
        hamle_sayisi: finalHamle,
        hata_sayisi: finalHata,
        ogrenci_adi: ad,
        ogrenci_yasi: parseInt(yas),
        sure,
        email,
        algilanan_kelime: algilananKelime || '',
        zorluk_seviyesi: extraData?.zorlukSeviyesi ?? null,
        kazanim_odagi: extraData?.kazanimOdagi ?? null,
        deneme_no: extraData?.denemeNo ?? null,
        // Miktar Avcısı specific columns
        distance_effect: extraData?.distance_effect ?? null,
        response_time: extraData?.response_time ?? null,
        round_history: extraData?.round_history ? JSON.stringify(extraData.round_history) : null,
        correct_answers: extraData?.correct_answers ?? null,
        cognitive_speed_score: extraData?.cognitive_speed_score ?? null,
      };

      if (extraData?.cizimVerisi || uploadResult?.imageUrl) {
        let cizimPayload: Record<string, any> | string = extraData?.cizimVerisi || '';
        try {
          if (extraData?.cizimVerisi) {
            cizimPayload = JSON.parse(extraData.cizimVerisi);
          }
        } catch {
          cizimPayload = { raw: extraData?.cizimVerisi || '' };
        }
        if (uploadResult?.imageUrl) {
          if (typeof cizimPayload !== 'object' || cizimPayload === null) {
            cizimPayload = { raw: extraData?.cizimVerisi || '' };
          }
          cizimPayload.imageUrl = uploadResult.imageUrl;
          cizimPayload.imagePath = uploadResult.filePath;
          cizimPayload.imageFormat = uploadResult.format;
        }
        kayitVerisi.cizim_verisi = JSON.stringify(cizimPayload);
      }

      let supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY || '',
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(kayitVerisi),
      });

      if (!supabaseResponse.ok) {
        const responseText = await supabaseResponse.text();
        console.error('Supabase Kayıt Hatası:', responseText);
        if (responseText.includes('cizim_verisi')) {
          const { cizim_verisi, ...kayitVerisiCizimsiz } = kayitVerisi;
          supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY || '',
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(kayitVerisiCizimsiz),
          });
        }
        if (responseText.includes("Could not find the 'email' column")) {
          const { email, ...kayitVerisiEmailsiz } = kayitVerisi;
          supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY || '',
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(kayitVerisiEmailsiz),
          });
          if (supabaseResponse.ok) {
            console.log('✅ Veri başarıyla kaydedildi (Email sütunu olmadan).');
          }
        }
      } else {
        console.log('✅ Veri başarıyla kaydedildi.');
      }
    } catch (error) {
      console.log('Kayıt Hatası:', error);
    } finally {
      setYukleniyor(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'bilissel' | 'sosyal' | 'yaratici' | 'muzikler'>('bilissel');
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0);

  // === EKRANLAR ===
  if (asama === 'giris') {
    const windowWidth = Dimensions.get('window').width;
    const isMobile = windowWidth < 768;

    return (
      <DynamicBackground>
        <View style={styles.merkezContainer}>
          <View style={[
            styles.card,
            styles.glassCard,
            { width: isMobile ? '90%' : undefined, maxWidth: 420 }
          ]}>
            {/* Title with Icon */}
            <View style={styles.titleContainer}>
              <Text style={styles.titleEmoji}>🎓</Text>
              <Text style={styles.girisBaslik}>Okul Öncesi Akademi</Text>
              <Text style={styles.titleEmoji}>✏️</Text>
            </View>
            <Text style={styles.welcomeSubtitle}>Hoş geldin, küçük kaşif! 🌟</Text>

            {/* Name Input with Icon */}
            <View style={[
              styles.inputContainer,
              focusedInput === 'ad' && styles.inputContainerFocused
            ]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.inputModern}
                placeholder="İsim (Örn: Ali)"
                placeholderTextColor="#9E9E9E"
                value={ad}
                onChangeText={setAd}
                onFocus={() => setFocusedInput('ad')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Age Input with Icon */}
            <View style={[
              styles.inputContainer,
              focusedInput === 'yas' && styles.inputContainerFocused
            ]}>
              <Text style={styles.inputIcon}>📅</Text>
              <TextInput
                style={styles.inputModern}
                placeholder="Yaş (Ay cinsinden)"
                placeholderTextColor="#9E9E9E"
                value={yas}
                onChangeText={setYas}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('yas')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Email Input with Icon - REQUIRED */}
            <View style={[
              styles.inputContainer,
              focusedInput === 'email' && styles.inputContainerFocused
            ]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.inputModern}
                placeholder="Ebeveyn E-posta (Zorunlu)"
                placeholderTextColor="#9E9E9E"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Gradient Login Button with Spinner */}
            <TouchableOpacity
              style={[
                styles.gradientButton,
                isLoggingIn && styles.buttonDisabled
              ]}
              onPress={girisYap}
              disabled={isLoggingIn}
              activeOpacity={0.8}
            >
              {isLoggingIn ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                  <Text style={styles.gradientButtonText}>Giriş Yapılıyor...</Text>
                </View>
              ) : (
                <Text style={styles.gradientButtonText}>Giriş Yap 🚀</Text>
              )}
            </TouchableOpacity>

            {/* Helper Links */}
            <View style={styles.linksContainer}>
              <TouchableOpacity>
                <Text style={styles.linkText}>Şifremi Unuttum</Text>
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              <TouchableOpacity onPress={() => router.push('/signup' as any)}>
                <Text style={styles.linkText}>Henüz üye değil misin? <Text style={styles.linkBold}>Kayıt Ol</Text></Text>
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              {/* Hızlı Test Girişi */}
              <TouchableOpacity onPress={hizliTestGiris}>
                <Text style={[styles.linkText, { color: '#4CAF50', fontWeight: 'bold' }]}>⚡ Hızlı Test</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Buttons Container */}
          <View style={{ position: 'absolute', bottom: 30, flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={styles.adminButtonBottom}
              onPress={() => router.push('/admin' as any)}
            >
              <Text style={styles.adminButtonText}>🔑 Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adminButtonBottom, { backgroundColor: 'rgba(123, 31, 162, 0.25)', borderColor: 'rgba(123, 31, 162, 0.4)' }]}
              onPress={() => router.push('/veli-dashboard' as any)}
            >
              <Text style={[styles.adminButtonText, { color: '#7B1FA2' }]}>👨‍👩‍👧 Veli Paneli</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ ...toast, visible: false })}
        />

        {/* Registration Modal */}
        <Modal
          visible={showRegistration}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRegistration(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isMobile ? '95%' : 420 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🌟 Kayıt Ol</Text>
                <TouchableOpacity onPress={() => setShowRegistration(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Child Name */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'regAd' && styles.inputContainerFocused
              ]}>
                <Text style={styles.inputIcon}>👶</Text>
                <TextInput
                  style={styles.inputModern}
                  placeholder="Çocuğun Adı *"
                  placeholderTextColor="#9E9E9E"
                  value={regAd}
                  onChangeText={setRegAd}
                  onFocus={() => setFocusedInput('regAd')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Email - Required */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'regEmail' && styles.inputContainerFocused
              ]}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.inputModern}
                  placeholder="Ebeveyn E-posta *"
                  placeholderTextColor="#9E9E9E"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedInput('regEmail')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Gender Selection - Required */}
              <Text style={styles.fieldLabel}>Cinsiyet *</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    regCinsiyet === 'erkek' && styles.genderButtonSelected
                  ]}
                  onPress={() => setRegCinsiyet('erkek')}
                >
                  <Text style={styles.genderEmoji}>👦</Text>
                  <Text style={[
                    styles.genderText,
                    regCinsiyet === 'erkek' && styles.genderTextSelected
                  ]}>Erkek</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    regCinsiyet === 'kiz' && styles.genderButtonSelected
                  ]}
                  onPress={() => setRegCinsiyet('kiz')}
                >
                  <Text style={styles.genderEmoji}>👧</Text>
                  <Text style={[
                    styles.genderText,
                    regCinsiyet === 'kiz' && styles.genderTextSelected
                  ]}>Kız</Text>
                </TouchableOpacity>
              </View>

              {/* Age Input Mode Toggle */}
              <Text style={styles.fieldLabel}>Yaş Bilgisi *</Text>
              <View style={styles.ageModeContainer}>
                <TouchableOpacity
                  style={[
                    styles.ageModeButton,
                    yasInputMode === 'ay' && styles.ageModeButtonSelected
                  ]}
                  onPress={() => setYasInputMode('ay')}
                >
                  <Text style={[
                    styles.ageModeText,
                    yasInputMode === 'ay' && styles.ageModeTextSelected
                  ]}>Ay Olarak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.ageModeButton,
                    yasInputMode === 'tarih' && styles.ageModeButtonSelected
                  ]}
                  onPress={() => setYasInputMode('tarih')}
                >
                  <Text style={[
                    styles.ageModeText,
                    yasInputMode === 'tarih' && styles.ageModeTextSelected
                  ]}>Doğum Tarihi</Text>
                </TouchableOpacity>
              </View>

              {/* Age Input based on mode */}
              {yasInputMode === 'ay' ? (
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'regYas' && styles.inputContainerFocused
                ]}>
                  <Text style={styles.inputIcon}>📅</Text>
                  <TextInput
                    style={styles.inputModern}
                    placeholder="Yaş (24-75 ay)"
                    placeholderTextColor="#9E9E9E"
                    value={regYasAy}
                    onChangeText={setRegYasAy}
                    keyboardType="numeric"
                    onFocus={() => setFocusedInput('regYas')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              ) : (
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'regTarih' && styles.inputContainerFocused
                ]}>
                  <Text style={styles.inputIcon}>🎂</Text>
                  <TextInput
                    style={styles.inputModern}
                    placeholder="Doğum Tarihi (GG/AA/YYYY)"
                    placeholderTextColor="#9E9E9E"
                    value={dogumTarihi}
                    onChangeText={setDogumTarihi}
                    onFocus={() => setFocusedInput('regTarih')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              )}

              {/* Register Button */}
              <TouchableOpacity
                style={[
                  styles.gradientButton,
                  { marginTop: 20 },
                  isRegistering && styles.buttonDisabled
                ]}
                onPress={kayitOl}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                    <Text style={styles.gradientButtonText}>Kayıt Yapılıyor...</Text>
                  </View>
                ) : (
                  <Text style={styles.gradientButtonText}>Kayıt Ol ✨</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.requiredNote}>* Zorunlu alanlar</Text>
            </View>
          </View>
        </Modal>
      </DynamicBackground>
    );
  }

  if (asama === 'menu') {
    return (
      <DynamicBackground>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.baslik}>Merhaba {ad} 👋</Text>
            <Text style={styles.bilgi}>Bugün ne oynamak istersin?</Text>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'bilissel' && styles.activeTabButton]}
              onPress={() => setActiveTab('bilissel')}
            >
              <Text style={[styles.tabText, activeTab === 'bilissel' && styles.activeTabText]}>🧠 Bilişsel Beceriler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'sosyal' && styles.activeTabButton]}
              onPress={() => setActiveTab('sosyal')}
            >
              <Text style={[styles.tabText, activeTab === 'sosyal' && styles.activeTabText]}>🤝 Sosyal-Duygusal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'yaratici' && styles.activeTabButton]}
              onPress={() => setActiveTab('yaratici')}
            >
              <Text style={[styles.tabText, activeTab === 'yaratici' && styles.activeTabText]}>🎨 Yaratıcılık</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'muzikler' && styles.activeTabButton]}
              onPress={() => setActiveTab('muzikler')}
            >
              <Text style={[styles.tabText, activeTab === 'muzikler' && styles.activeTabText]}>🎵 Müzik Kutusu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridContainer}>
            {activeTab === 'bilissel' && (
              <>
                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#64B5F6' }]} onPress={() => oyunuBaslat('hafiza')}>
                  <Ionicons name="grid" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Çiftini Bul!</Text>
                  <Text style={styles.oyunAciklama}>Hafıza Oyunu</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#FFB74D' }]} onPress={() => oyunuBaslat('siralama')}>
                  <Ionicons name="list" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Sıralama</Text>
                  <Text style={styles.oyunAciklama}>Sayıları Diz</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#FF8A65' }]} onPress={() => oyunuBaslat('eksik-sayi-bul')}>
                  <Ionicons name="help-circle" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Eksik Sayiyi Bul</Text>
                  <Text style={styles.oyunAciklama}>Eksik rakami tamamla</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#81C784' }]} onPress={() => oyunuBaslat('gruplama')}>
                  <Ionicons name="basket" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Gruplama</Text>
                  <Text style={styles.oyunAciklama}>Meyve mi Hayvan mı?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#BA68C8' }]} onPress={() => oyunuBaslat('diziyi-tamamla')}>
                  <Ionicons name="extension-puzzle" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Diziyi Tamamla</Text>
                  <Text style={styles.oyunAciklama}>Örüntü Oyunu</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#F06292' }]} onPress={() => oyunuBaslat('bunu-soyle')}>
                  <Ionicons name="mic" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Bunu Söyle!</Text>
                  <Text style={styles.oyunAciklama}>Kelime Oyunu</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#00ACC1' }]} onPress={() => oyunuBaslat('kodlama')}>
                  <Ionicons name="map" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Minik Kaşif</Text>
                  <Text style={styles.oyunAciklama}>Kodlama Oyunu</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#4DB6AC' }]} onPress={() => oyunuBaslat('rakam-yazma')}>
                  <Ionicons name="pencil" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Rakam Yazma</Text>
                  <Text style={styles.oyunAciklama}>1'den 5'e Yaz</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#7E57C2' }]} onPress={() => oyunuBaslat('kutuyu-bul')}>
                  <Ionicons name="cube" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Kutuyu Bul!</Text>
                  <Text style={styles.oyunAciklama}>Doğru Kutuyu Seç</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#26A69A' }]} onPress={() => oyunuBaslat('sayilari-birlestir')}>
                  <Ionicons name="git-network" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Sayıları Birleştir</Text>
                  <Text style={styles.oyunAciklama}>Meyveleri Sırayla Bağla</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#E91E63' }]} onPress={() => oyunuBaslat('yapboz')}>
                  <Ionicons name="apps" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Yapboz</Text>
                  <Text style={styles.oyunAciklama}>3x3 Puzzle Oyunu</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#1565C0' }]} onPress={() => oyunuBaslat('golge-dedektifi')}>
                  <Ionicons name="eye-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Gölge Dedektifi</Text>
                  <Text style={styles.oyunAciklama}>Nesneleri Eşleştir</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#FF7043' }]} onPress={() => oyunuBaslat('onluk-cerceve')}>
                  <Ionicons name="grid-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Onluk Çerçeve</Text>
                  <Text style={styles.oyunAciklama}>Sayıları Tamamla</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#FFA726' }]} onPress={() => oyunuBaslat('sayi-komsulari')}>
                  <Ionicons name="train-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Sayı Komşuları</Text>
                  <Text style={styles.oyunAciklama}>Eksik Sayıyı Bul</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#AB47BC' }]} onPress={() => oyunuBaslat('tarti-dengesi')}>
                  <Ionicons name="color-filter-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Tartı Dengesi</Text>
                  <Text style={styles.oyunAciklama}>Eşitliği Sağla</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#1E88E5' }]} onPress={() => oyunuBaslat('miktar-karsilastirma')}>
                  <Ionicons name="bar-chart-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Miktar Avcısı</Text>
                  <Text style={styles.oyunAciklama}>Hangisi Daha Çok?</Text>
                </TouchableOpacity>
              </>
            )}

            {activeTab === 'sosyal' && (
              <>
                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#795548' }]} onPress={() => oyunuBaslat('ceviz-macera')}>
                  <Ionicons name="leaf" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Ceviz Macerası</Text>
                  <Text style={styles.oyunAciklama}>Pıtırcık'ın Macerası</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#8D6E63' }]} onPress={() => oyunuBaslat('aile-sepeti-macerasi')}>
                  <Ionicons name="basket-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Aile Sepeti</Text>
                  <Text style={styles.oyunAciklama}>Piknik Macerası</Text>
                </TouchableOpacity>
              </>
            )}

            {activeTab === 'yaratici' && (
              <>
                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#ff9f1c' }]} onPress={() => oyunuBaslat('yaratici-cizim')}>
                  <Ionicons name="brush" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Hayal Defteri</Text>
                  <Text style={styles.oyunAciklama}>Boş sayfada çizim yap</Text>
                </TouchableOpacity>
              </>
            )}

            {activeTab === 'muzikler' && (
              <View style={{ width: '100%', paddingBottom: 40 }}>
                {/* 1. Matematik Şarkıları */}
                <Text style={styles.sectionTitle}>🔢 Matematik Şarkıları</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 15 }}>
                  {SONGS.filter(s => s.artist.includes('Matematik')).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, { backgroundColor: song.coverColor, marginRight: 15, width: 150, height: 160 }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={36} color="white" style={{ marginBottom: 10 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 16 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 11 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 2. Değerler Eğitimi */}
                <Text style={styles.sectionTitle}>🌟 Değerler Eğitimi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 15 }}>
                  {SONGS.filter(s => !s.artist.includes('Matematik') && !s.title.includes('ChildhoodTech')).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, { backgroundColor: song.coverColor, marginRight: 15, width: 150, height: 160 }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={36} color="white" style={{ marginBottom: 10 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 16 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 11 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 3. Özel Koleksiyon */}
                <Text style={styles.sectionTitle}>🎵 Özel Koleksiyon (ChildhoodTech)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 15 }}>
                  {SONGS.filter(s => s.title.includes('ChildhoodTech')).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, { backgroundColor: song.coverColor, marginRight: 15, width: 150, height: 160 }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={36} color="white" style={{ marginBottom: 10 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 16 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 11 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.buton, { backgroundColor: '#FF5252', marginTop: 30, alignSelf: 'center' }]} onPress={cikisYap}>
            <Text style={styles.butonYazi}>Çıkış Yap 🚪</Text>
          </TouchableOpacity>
        </ScrollView>
      </DynamicBackground>
    );
  }

  if (asama === 'hafiza') {
    return <HafizaOyunu onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'siralama') {
    return <SiralamaOyunu onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'eksik-sayi-bul') {
    return <EksikSayiBul onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'gruplama') {
    return <GruplamaOyunu onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'diziyi-tamamla') {
    return <DiziyiTamamla onGameEnd={oyunuBitir} onLogout={() => setAsama('menu')} />;
  }

  if (asama === 'bunu-soyle') {
    return <BunuSoyle onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'kodlama') {
    return <KodlamaOyunu onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'rakam-yazma') {
    return <RakamYazma onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'kutuyu-bul') {
    return <KutuyuBul onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'sayilari-birlestir') {
    return <SayilariBirlestir onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'yapboz') {
    return <YapbozOyunu onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'golge-dedektifi') {
    return (
      <ShadowDetective
        config={{ level: 1, itemCount: 3, hasDistractors: false, assets: { objects: [], shadows: [] } }}
        onGameEnd={oyunuBitir}
        onExit={() => setAsama('menu')}
      />
    );
  }

  if (asama === 'onluk-cerceve') {
    return <OnlukCerceve onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'sayi-komsulari') {
    return <SayiKomsulari onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'tarti-dengesi') {
    return <TartiDengesi onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'miktar-karsilastirma') {
    return <QuantityComparison onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'ceviz-macera') {
    return <CevizMacera onExit={() => setAsama('menu')} userId={ad} userEmail={email} userAge={parseInt(yas)} />;
  }

  if (asama === 'aile-sepeti-macerasi') {
    return <AileSepetiMacerasi onExit={() => setAsama('menu')} userId={ad} userEmail={email} userAge={parseInt(yas)} />;
  }

  if (asama === 'yaratici-cizim') {
    return <YaraticiCizim onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
  }

  if (asama === 'muzik-calar') {
    return <MuzikCalar onExit={() => setAsama('menu')} initialSongIndex={selectedSongIndex} />;
  }

  if (asama === 'sonuc') {
    return (
      <DynamicBackground>
        <View style={styles.merkezContainer}>
          <View style={styles.card}>
            <Text style={{ fontSize: 80, textAlign: 'center' }}>🎉</Text>
            <Text style={styles.sonucBaslik}>AFERİN SANA!</Text>
            <Text style={[styles.baslik, { textAlign: 'center' }]}>{ad}, Harika iş çıkardın!</Text>
            {yukleniyor && <ActivityIndicator size="small" color="#999" style={{ marginTop: 20 }} />}

            <TouchableOpacity style={styles.buton} onPress={() => setAsama('menu')}>
              <Text style={styles.butonYazi}>Başka Oyun Oyna 🎮</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.buton, { backgroundColor: '#FF5252', marginTop: 15 }]} onPress={cikisYap}>
              <Text style={styles.butonYazi}>Oturumu Kapat 🚪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </DynamicBackground>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  merkezContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
  card: { backgroundColor: 'white', padding: 30, borderRadius: 25, width: '100%', maxWidth: 400, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },

  // Glassmorphism Card Style
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 35,
    padding: 35,
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

  // Title Styles
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  titleEmoji: {
    fontSize: 32,
    marginHorizontal: 8,
  },
  girisBaslik: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1565C0',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#78909C',
    marginBottom: 25,
    textAlign: 'center',
  },

  // Modern Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputContainerFocused: {
    borderColor: '#B2DFDB', // Mint green on focus
    backgroundColor: '#FFFFFF',
    shadowColor: '#B2DFDB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  inputModern: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    color: '#37474F',
    ...(Platform.OS === 'web' ? {
      outline: 'none',
    } : {}),
  },

  // Gradient Button Style
  gradientButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 50%, #2E7D32 100%)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
  gradientButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Helper Links
  linksContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#78909C',
    marginVertical: 6,
  },
  linkBold: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  linkDivider: {
    width: 60,
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },

  // Admin Button at Bottom
  adminButtonBottom: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(144, 164, 174, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(144, 164, 174, 0.4)',
  },
  adminButtonText: {
    fontSize: 13,
    color: '#546E7A',
    fontWeight: '600',
  },

  baslik: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, color: '#37474F' },
  bilgi: { fontSize: 18, marginBottom: 20, color: '#546E7A' },
  input: { width: '100%', backgroundColor: '#F5F5F5', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  buton: { backgroundColor: '#66BB6A', padding: 15, borderRadius: 15, marginTop: 20, width: 220, alignItems: 'center', elevation: 3 },
  butonYazi: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  oyunKarti: { width: 160, height: 160, padding: 15, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 3 },
  oyunBaslik: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 5 },
  oyunAciklama: { color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' },

  sonucBaslik: { fontSize: 36, fontWeight: 'bold', color: '#FF9800', marginVertical: 10, textAlign: 'center' },
  soundButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 25, zIndex: 10 },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 150,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: { fontSize: 15, fontWeight: '700', color: '#546E7A', letterSpacing: 0.2 },
  activeTabText: { color: '#1B5E20' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 25,
    maxHeight: '90%',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#37474F',
    marginLeft: 10,
    marginBottom: 10,
    marginTop: 10,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },

  // Field Label
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },

  // Gender Selection
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  genderButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  genderEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  genderTextSelected: {
    color: '#2E7D32',
  },

  // Age Mode Toggle
  ageModeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    width: '100%',
  },
  ageModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  ageModeButtonSelected: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  ageModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  ageModeTextSelected: {
    color: '#1565C0',
  },

  // Required Note
  requiredNote: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 15,
    textAlign: 'center',
  },
});


