import DynamicBackground from '@/components/DynamicBackground';
import { GAME_RENDERERS } from '@/components/gameRegistry';
import { SONGS } from '@/components/MuzikCalar';
import { useSound } from '@/components/SoundContext';
import Toast from '@/components/Toast';
import { GAME_CATALOG, GameCatalogItem, GameCatalogStatus } from '@/constants/gameCatalog';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  createDailyGamePlan,
  GAME_CARD_META,
  getCatalogGames,
  getTodayKey,
} from '../../lib/menuHelpers';
import { useAuth } from '../../hooks/useAuth';
import { GameResultExtraData, saveGameResult } from '../../services/gameResults';

// Cloudflare Turnstile Sitekey
const TURNSTILE_SITE_KEY = '0x4AAAAAACKOXlQA9AJnb7EV';

export default function App() {
  const router = useRouter();
  const { isMuted, toggleMute, resumeAfterInteraction } = useSound();
  const [asama, setAsama] = useState('giris');
  const [ad, setAd] = useState('');
  const [yas, setYas] = useState('');
  const [email, setEmail] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const {
    password, setPassword, isLoggingIn, focusedInput, setFocusedInput,
    girisYap, sifremiUnuttum,
    showRegistration, setShowRegistration,
    regAd, setRegAd, regEmail, setRegEmail,
    regCinsiyet, setRegCinsiyet, yasInputMode, setYasInputMode,
    dogumTarihi, setDogumTarihi, regYasAy, setRegYasAy, isRegistering,
    kayitOl,
    matchingChildren, showChildSelection, setShowChildSelection, selectChild,
  } = useAuth({ email, setEmail, setAd, setYas, setAsama, showToast, resumeAfterInteraction });

  const oyunuBaslat = (oyunTipi: string) => {
    if (dailyPlanRoutes.includes(oyunTipi)) {
      setActiveDailyRoute(oyunTipi);
    } else {
      setActiveDailyRoute(null);
    }
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
      // Miktar Avcısı specific fields
      distance_effect?: number;
      response_time?: number;
      round_history?: any;
      correct_answers?: number;
      cognitive_speed_score?: number;
      // Sihirli Tuval specific field
      visual_attention_score?: number;
    },
  ) => {
    if (activeDailyRoute) {
      setDailyCompletedRoutes((prev) => {
        if (prev.includes(activeDailyRoute)) return prev;
        return [...prev, activeDailyRoute];
      });
      setActiveDailyRoute(null);
    }
    setAsama('sonuc');
    sessizceAnalizEtVeKaydet(oyunAdi, sure, finalHamle, finalHata, algilananKelime, extraData);
  };

  const cikisYap = () => {
    setAd('');
    setYas('');
    setEmail('');
    setActiveDailyRoute(null);
    setDailyCompletedRoutes([]);
    setDailyPlanRoutes([]);
    setDailyPlanDate('');
    setAsama('giris');
  };

  const sessizceAnalizEtVeKaydet = async (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: GameResultExtraData,
  ) => {
    setYukleniyor(true);
    try {
      await saveGameResult({
        oyunAdi,
        sure,
        finalHamle,
        finalHata,
        algilananKelime,
        extraData,
        ad,
        yas,
        email,
      });
    } finally {
      setYukleniyor(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'bilissel' | 'sosyal' | 'yaratici' | 'muzikler'>('bilissel');
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0);
  const [dailyPlanDate, setDailyPlanDate] = useState<string>('');
  const [dailyPlanRoutes, setDailyPlanRoutes] = useState<string[]>([]);
  const [dailyCompletedRoutes, setDailyCompletedRoutes] = useState<string[]>([]);
  const [activeDailyRoute, setActiveDailyRoute] = useState<string | null>(null);

  const parsedAgeMonths = parseInt(yas, 10) || 48;
  const nextDailyRoute = dailyPlanRoutes.find((route) => !dailyCompletedRoutes.includes(route)) || null;
  const isDailyPlanComplete = dailyPlanRoutes.length > 0 && dailyCompletedRoutes.length >= dailyPlanRoutes.length;

  const getGameTitleByRoute = (routeKey: string) => {
    const game = GAME_CATALOG.find((item) => item.routeKey === routeKey);
    return game?.title || routeKey;
  };

  const ensureDailyPlan = useCallback(() => {
    const todayKey = getTodayKey();
    if (dailyPlanDate === todayKey && dailyPlanRoutes.length === 3) return;

    const plan = createDailyGamePlan(parsedAgeMonths, todayKey);
    setDailyPlanDate(todayKey);
    setDailyPlanRoutes(plan);
    setDailyCompletedRoutes([]);
    setActiveDailyRoute(null);
  }, [dailyPlanDate, dailyPlanRoutes.length, parsedAgeMonths]);

  const startDailyFlow = () => {
    ensureDailyPlan();
    const nextRoute = (dailyPlanDate === getTodayKey() && dailyPlanRoutes.length > 0)
      ? (dailyPlanRoutes.find((route) => !dailyCompletedRoutes.includes(route)) || dailyPlanRoutes[0])
      : createDailyGamePlan(parsedAgeMonths, getTodayKey())[0];

    if (nextRoute) {
      setActiveDailyRoute(nextRoute);
      oyunuBaslat(nextRoute);
    }
  };

  useEffect(() => {
    if (asama === 'menu') {
      ensureDailyPlan();
    }
  }, [asama, ensureDailyPlan]);

  const renderCatalogCard = (game: GameCatalogItem, compact = false) => {
    const meta = GAME_CARD_META[game.id] || {
      color: '#607D8B',
      icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
      displayTitle: game.title,
      subtitle: game.skillFocus,
    };

    return (
      <TouchableOpacity
        key={game.id}
        style={[
          styles.oyunKarti,
          styles.catalogGameCard,
          compact && styles.catalogGameCardCompact,
          { backgroundColor: meta.color },
        ]}
        onPress={() => oyunuBaslat(game.routeKey)}
      >
        <Ionicons name={meta.icon} size={compact ? 26 : 34} color="white" style={{ marginBottom: compact ? 5 : 8 }} />
        <Text style={[styles.oyunBaslik, compact && styles.catalogGameTitleCompact]} numberOfLines={2}>
          {meta.displayTitle || game.title}
        </Text>
        <Text style={[styles.oyunAciklama, compact && styles.catalogGameSubtitleCompact]} numberOfLines={2}>
          {meta.subtitle || game.skillFocus}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCatalogSection = (title: string, status: GameCatalogStatus, compact = false) => {
    const games = getCatalogGames(status);
    if (games.length === 0) return null;

    return (
      <View style={styles.catalogSection}>
        <Text style={styles.catalogSectionTitle}>{title}</Text>
        <View style={styles.catalogGrid}>
          {games.map((game) => renderCatalogCard(game, compact))}
        </View>
      </View>
    );
  };


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

            {/* Email Input with Icon */}
            <View style={[
              styles.inputContainer,
              focusedInput === 'email' && styles.inputContainerFocused
            ]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.inputModern}
                placeholder="E-posta Adresi"
                placeholderTextColor="#9E9E9E"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                returnKeyType="next"
                onSubmitEditing={() => { }}
              />
            </View>

            {/* Password Input with Icon */}
            <View style={[
              styles.inputContainer,
              focusedInput === 'password' && styles.inputContainerFocused
            ]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.inputModern}
                placeholder="Şifre"
                placeholderTextColor="#9E9E9E"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                returnKeyType="go"
                onSubmitEditing={girisYap}
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
              <TouchableOpacity onPress={sifremiUnuttum}>
                <Text style={styles.linkText}>Şifremi Unuttum</Text>
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              <TouchableOpacity onPress={() => router.push('/signup' as any)}>
                <Text style={styles.linkText}>Henüz üye değil misin? <Text style={styles.linkBold}>Kayıt Ol</Text></Text>
              </TouchableOpacity>

            </View>
          </View>

          {/* Bottom Buttons Container */}
          <View style={{ position: 'absolute', bottom: 30, flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
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

            <TouchableOpacity
              style={[styles.adminButtonBottom, { backgroundColor: 'rgba(255, 152, 0, 0.25)', borderColor: 'rgba(255, 152, 0, 0.4)' }]}
              onPress={() => router.push('/teacher-dashboard' as any)}
            >
              <Text style={[styles.adminButtonText, { color: '#E65100' }]}>👩‍🏫 Öğretmen</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ ...toast, visible: false })}
        />

        {/* Child Selection Modal - for duplicate name+age */}
        <Modal
          visible={showChildSelection}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowChildSelection(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isMobile ? '95%' : 400 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>👶 Çocuk Seçin</Text>
                <TouchableOpacity onPress={() => setShowChildSelection(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ textAlign: 'center', marginBottom: 15, color: '#666', fontSize: 14 }}>
                Aynı isim ve yaşta birden fazla çocuk bulundu. Lütfen seçin:
              </Text>

              <ScrollView style={{ maxHeight: 300 }}>
                {matchingChildren.map((child, index) => (
                  <TouchableOpacity
                    key={child.id || index}
                    style={{
                      backgroundColor: '#f5f5f5',
                      padding: 15,
                      borderRadius: 12,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#e0e0e0',
                    }}
                    onPress={() => selectChild(child)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                      {child.child_name} ({child.child_age_months} ay)
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      📧 {child.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

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
    // Classic tab view
    return (
      <DynamicBackground>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.baslik}>Merhaba {ad} 👋</Text>
            <Text style={styles.bilgi}>Bugün ne oynamak istersin?</Text>
          </View>

          <View style={styles.catalogShowcase}>
            <View style={styles.catalogShowcaseHeader}>
              <Text style={styles.catalogEyebrow}>Öğrenme Yolu</Text>
              <Text style={styles.catalogTitle}>Öne Çıkan Oyunlar</Text>
              <Text style={styles.catalogSubtitle}>
                Az seçenekle başla; tüm oyunlar aşağıdaki klasik menüde korunuyor.
              </Text>
            </View>
            <View style={styles.dailyPlanCard}>
              <View style={styles.dailyPlanHeader}>
                <Text style={styles.dailyPlanTitle}>Bugünün 3 Oyunu</Text>
                <Text style={styles.dailyPlanCounter}>{dailyCompletedRoutes.length}/3 tamamlandı</Text>
              </View>
              <View style={styles.dailyPlanSteps}>
                {dailyPlanRoutes.map((route, index) => {
                  const done = dailyCompletedRoutes.includes(route);
                  return (
                    <View key={route} style={[styles.dailyPlanStep, done && styles.dailyPlanStepDone]}>
                      <Text style={[styles.dailyPlanStepIndex, done && styles.dailyPlanStepIndexDone]}>{index + 1}</Text>
                      <Text style={[styles.dailyPlanStepLabel, done && styles.dailyPlanStepLabelDone]} numberOfLines={1}>
                        {getGameTitleByRoute(route)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.dailyPlanAction, isDailyPlanComplete && styles.dailyPlanActionComplete]}
                onPress={startDailyFlow}
              >
                <Text style={styles.dailyPlanActionText}>
                  {isDailyPlanComplete ? 'Tekrar Oyna' : nextDailyRoute ? 'Sıradaki Oyunu Başlat' : 'Günlük Akışı Başlat'}
                </Text>
              </TouchableOpacity>
            </View>
            {renderCatalogSection('Bugünün çekirdek oyunları', 'core')}
            {renderCatalogSection('Hikaye ve ifade alanları', 'story', true)}
            {renderCatalogSection('Yaratıcılık', 'creative', true)}
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

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#4CAF50' }]} onPress={() => oyunuBaslat('sihirli-siseler')}>
                  <Ionicons name="flask-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Sihirli Şişeler</Text>
                  <Text style={styles.oyunAciklama}>Renkleri Grupla</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#3F51B5' }]} onPress={() => oyunuBaslat('sihirli-tuval')}>
                  <Ionicons name="color-palette-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Sihirli Tuval</Text>
                  <Text style={styles.oyunAciklama}>Uzay Boyama</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#1a1a4e' }]} onPress={() => oyunuBaslat('uzay-bloklari')}>
                  <Ionicons name="planet-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Uzay Blokları</Text>
                  <Text style={styles.oyunAciklama}>Yıldız Mimarı</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#6366F1' }]} onPress={() => oyunuBaslat('renkli-baglantalar')}>
                  <Ionicons name="git-merge-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Renkli Bağlantılar</Text>
                  <Text style={styles.oyunAciklama}>Dot Connect</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#FF6B6B' }]} onPress={() => oyunuBaslat('mutfak-dedektifi')}>
                  <Ionicons name="restaurant-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Mutfak Dedektifi</Text>
                  <Text style={styles.oyunAciklama}>Sınıflandırma</Text>
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

                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#9C27B0' }]} onPress={() => oyunuBaslat('adalet-hikayesi')}>
                  <Ionicons name="scale-outline" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Adalet Hikayesi</Text>
                  <Text style={styles.oyunAciklama}>Doğru Olan Nedir?</Text>
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
                {/* 0. Yeni Sarkilar */}
                <Text style={styles.sectionTitle}>Yeni Sarkilar</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, justifyContent: 'flex-start' }}>
                  {SONGS.filter(s => s.category === 'yeniler').map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, {
                        backgroundColor: song.coverColor,
                        margin: 6,
                        width: 105,
                        height: 115,
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                      }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={28} color="white" style={{ marginBottom: 6 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 12 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 9 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* 1. Matematik Şarkıları */}
                <Text style={styles.sectionTitle}>🔢 Matematik Şarkıları</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, justifyContent: 'flex-start' }}>
                  {SONGS.filter(s => s.artist.includes('Matematik')).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, {
                        backgroundColor: song.coverColor,
                        margin: 6,
                        width: 105,
                        height: 115,
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                      }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={28} color="white" style={{ marginBottom: 6 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 12 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 9 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2. Fen Eğitimi Şarkıları */}
                <Text style={styles.sectionTitle}>🔬 Fen Eğitimi Şarkıları</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, justifyContent: 'flex-start' }}>
                  {SONGS.filter(s => s.artist.includes('Fen')).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, {
                        backgroundColor: song.coverColor,
                        margin: 6,
                        width: 105,
                        height: 115,
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                      }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={28} color="white" style={{ marginBottom: 6 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 12 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 9 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 3. Değerler Eğitimi */}
                <Text style={styles.sectionTitle}>🌟 Değerler Eğitimi</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, justifyContent: 'flex-start' }}>
                  {SONGS.filter(s => !s.artist.includes('Matematik') && !s.artist.includes('Fen') && !s.title.includes('ChildhoodTech')).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, {
                        backgroundColor: song.coverColor,
                        margin: 6,
                        width: 105,
                        height: 115,
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                      }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={28} color="white" style={{ marginBottom: 6 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 12 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 9 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 4. Özel Koleksiyon */}
                <Text style={styles.sectionTitle}>🎵 Özel Koleksiyon (ChildhoodTech)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, justifyContent: 'flex-start' }}>
                  {SONGS.filter(s => s.title.includes('ChildhoodTech')).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, {
                        backgroundColor: song.coverColor,
                        margin: 6,
                        width: 105,
                        height: 115,
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                      }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={28} color="white" style={{ marginBottom: 6 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 12 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 9 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              
                {/* 5. Tum Sarkilar */}
                <Text style={styles.sectionTitle}>Tum Sarkilar</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, justifyContent: 'flex-start' }}>
                  {SONGS.map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={[styles.oyunKarti, {
                        backgroundColor: song.coverColor,
                        margin: 6,
                        width: 105,
                        height: 115,
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                      }]}
                      onPress={() => {
                        const realIndex = SONGS.findIndex(s => s.id === song.id);
                        setSelectedSongIndex(realIndex);
                        oyunuBaslat('muzik-calar');
                      }}
                    >
                      <Ionicons name={song.icon} size={28} color="white" style={{ marginBottom: 6 }} />
                      <Text style={[styles.oyunBaslik, { fontSize: 12 }]} numberOfLines={2}>{song.title}</Text>
                      <Text style={[styles.oyunAciklama, { fontSize: 9 }]} numberOfLines={1}>{song.artist}</Text>
                    </TouchableOpacity>
                  ))}
                </View></View>
            )}
          </View>
          <TouchableOpacity style={[styles.buton, { backgroundColor: '#FF5252', marginTop: 30, alignSelf: 'center' }]} onPress={cikisYap}>
            <Text style={styles.butonYazi}>Çıkış Yap 🚪</Text>
          </TouchableOpacity>
        </ScrollView>
      </DynamicBackground>
    );
  }

  // Oyun ekranlari: routeKey -> bilesen eslesmesi components/gameRegistry.tsx'te.
  // Yeni oyun eklemek icin index.tsx'e dokunmaya gerek yok (bkz. gameRegistry).
  const gameRenderer = GAME_RENDERERS[asama];
  if (gameRenderer) {
    return gameRenderer({
      onGameEnd: oyunuBitir,
      onExit: () => setAsama('menu'),
      ad,
      yas,
      email,
      selectedSongIndex,
    });
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

            {nextDailyRoute && (
              <TouchableOpacity
                style={[styles.buton, { backgroundColor: '#1E88E5' }]}
                onPress={() => {
                  setActiveDailyRoute(nextDailyRoute);
                  oyunuBaslat(nextDailyRoute);
                }}
              >
                <Text style={styles.butonYazi}>Siradaki Gunluk Oyun</Text>
              </TouchableOpacity>
            )}

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
  catalogShowcase: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    marginBottom: 26,
    paddingHorizontal: 14,
  },
  catalogShowcaseHeader: {
    marginBottom: 14,
    alignItems: 'center',
  },
  catalogEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1976D2',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  catalogTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#263238',
    textAlign: 'center',
  },
  catalogSubtitle: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 560,
  },
  catalogSection: {
    marginTop: 14,
  },
  catalogSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#37474F',
    marginBottom: 10,
    textAlign: 'left',
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  catalogGameCard: {
    width: 136,
    height: 134,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  catalogGameCardCompact: {
    width: 132,
    height: 124,
  },
  catalogGameTitleCompact: {
    fontSize: 15,
  },
  catalogGameSubtitleCompact: {
    fontSize: 11,
  },
  dailyPlanCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(30, 136, 229, 0.18)',
    marginBottom: 16,
  },
  dailyPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  dailyPlanTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  dailyPlanCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E88E5',
  },
  dailyPlanSteps: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dailyPlanStep: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  dailyPlanStepDone: {
    backgroundColor: '#DCFCE7',
  },
  dailyPlanStepIndex: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E88E5',
    marginBottom: 2,
  },
  dailyPlanStepIndexDone: {
    color: '#16A34A',
  },
  dailyPlanStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  dailyPlanStepLabelDone: {
    color: '#166534',
  },
  dailyPlanAction: {
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dailyPlanActionComplete: {
    backgroundColor: '#10B981',
  },
  dailyPlanActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  sonucBaslik: { fontSize: 36, fontWeight: 'bold', color: '#FF9800', marginVertical: 10, textAlign: 'center' },
  soundButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 25, zIndex: 10 },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(100, 181, 246, 0.3)',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  tabButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: 155,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  activeTabButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === 'web' ? {
      transform: [{ scale: 1.02 }],
    } : {}),
  },
  tabText: { fontSize: 15, fontWeight: '700', color: '#546E7A', letterSpacing: 0.3 },
  activeTabText: { color: '#FFFFFF', fontWeight: '800' },

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



