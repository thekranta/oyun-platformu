import DynamicBackground from '@/components/DynamicBackground';
import { GAME_RENDERERS } from '@/components/gameRegistry';
import GameErrorBoundary from '@/components/GameErrorBoundary';
import { useSound } from '@/components/SoundContext';
import Toast from '@/components/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  createDailyGamePlan,
  GAME_CARD_META,
  GAME_EMOJI,
  getGamesByForestCategory,
  getTodayKey,
} from '../../lib/menuHelpers';
import { useAuth } from '../../hooks/useAuth';
import { asset } from '../../lib/assetMap';
import { supabase } from '../../lib/supabase';
import { flushPendingResults, GameResultExtraData, saveGameResult } from '../../services/gameResults';
import { DISCOVERY_FOREST_CATEGORIES } from '../../constants/discoveryForestCategories';
import { ForestCategoryCard } from '../../components/forest';

// Cloudflare Turnstile Sitekey
const TURNSTILE_SITE_KEY = '0x4AAAAAACKOXlQA9AJnb7EV';

const USE_NATIVE = Platform.OS !== 'web';

// Web'de CSS gradient, native'de duz renk (RN gradient'i CSS gibi desteklemez).
const gradientStyle = (from: string, to: string, fallback: string): any =>
  Platform.OS === 'web'
    ? { background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }
    : { backgroundColor: fallback };

// Acilista tek tek "pop" ile giren, basinca hafif kuculen oyuncakli kart.
function BouncyCard({
  delay = 0,
  onPress,
  style,
  children,
}: {
  delay?: number;
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 70, delay, useNativeDriver: USE_NATIVE }).start();
  }, [anim, delay]);

  const scale = Animated.multiply(anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), press);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={() => Animated.spring(press, { toValue: 0.93, useNativeDriver: USE_NATIVE }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start()}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Hafifce sallanan buton (gunluk macera "Basla").
function WiggleButton({ onPress, style, children }: { onPress: () => void; style?: any; children: React.ReactNode }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rot, { toValue: 1, duration: 900, useNativeDriver: USE_NATIVE }),
        Animated.timing(rot, { toValue: -1, duration: 900, useNativeDriver: USE_NATIVE }),
        Animated.timing(rot, { toValue: 0, duration: 900, useNativeDriver: USE_NATIVE }),
      ]),
    ).start();
  }, [rot]);
  const rotate = rot.interpolate({ inputRange: [-1, 1], outputRange: ['-2.5deg', '2.5deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={style}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Surekli hafifce zıplayan emoji (oyun/kategori kartlarindaki canli gorsel).
function BobbingEmoji({ emoji, delay = 0, size = 44, style }: { emoji: string; delay?: number; size?: number; style?: any }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1150, delay, useNativeDriver: USE_NATIVE }),
        Animated.timing(y, { toValue: 0, duration: 1150, useNativeDriver: USE_NATIVE }),
      ]),
    ).start();
  }, [y, delay]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  return <Animated.Text style={[{ fontSize: size }, style, { transform: [{ translateY }] }]}>{emoji}</Animated.Text>;
}

// Yumusakca yukari-asagi suzulen dekoratif emoji.
function FloatingDeco({ emoji, style, delay = 0 }: { emoji: string; style?: any; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 2600, delay, useNativeDriver: USE_NATIVE }),
        Animated.timing(y, { toValue: 0, duration: 2600, useNativeDriver: USE_NATIVE }),
      ]),
    ).start();
  }, [y, delay]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  return (
    <Animated.Text style={[style, { position: 'absolute', transform: [{ translateY }] }]} pointerEvents="none">
      {emoji}
    </Animated.Text>
  );
}

// Hangi APK'nin calistigini ekranda kanitlar (yanlis surum test edilmesin diye).
const BUILD_ETIKET = 'b7-tani';

/**
 * Giris formu — KONTROLSUZ (uncontrolled) girdiler + izole bilesen.
 *
 * Android'de `value` + state ile kontrollu TextInput klasik bir hataya yol acar:
 * her tusta JS'e gidip donen deger native alanin metnini ezer; yavas cihazda
 * (ve emulatorde) tus olaylari duser, imlec basa/sona atlar ve OZELLIKLE silme
 * (backspace) calismaz. Cozum: metnin sahibi native alan olsun —
 * `defaultValue` + ref. Yazarken HIC render olmaz, JS metne karismaz.
 * Deger yalnizca gonderimde (submit) okunur.
 */
const GirisFormu = React.memo(function GirisFormu({
  isMobile,
  isLoggingIn,
  initialEmail,
  decorAcik,
  onToggleDecor,
  onLogin,
  onForgot,
  onSignup,
  onAdmin,
  onVeli,
  onOgretmen,
}: {
  isMobile: boolean;
  isLoggingIn: boolean;
  initialEmail: string;
  decorAcik: boolean;
  onToggleDecor: () => void;
  onLogin: (email: string, password: string) => void;
  onForgot: (email: string) => void;
  onSignup: () => void;
  onAdmin: () => void;
  onVeli: () => void;
  onOgretmen: () => void;
}) {
  // Metin state'te DEGIL — native alanda. JS yalnizca son degeri saklar.
  const emailRef = useRef(initialEmail);
  const passwordRef = useRef('');
  const passwordInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  // Klavye yuksekligi: edge-to-edge/Android surumune gore pencere her zaman
  // yeniden boyutlanmayabiliyor; bosluğu kendimiz birakiyoruz (deterministik).
  const [kbHeight, setKbHeight] = useState(0);

  // ---- TANI GOSTERGESI (yalniz bu ic-test surumunde) ----
  // ONEMLI: tus basina setState YAPILMAZ — olcum sistemi bozmasin diye degerler
  // ref'te birikir ve saniyede bir ekrana kopyalanir.
  //
  // KRITIK DUZELTME: bu zamanlayici DAHA ONCE odak varken bile her saniye
  // setState cagirip GirisFormu'yu (TextInput'larin da icinde oldugu bilesen)
  // yeniden render ediyordu. Ilk tani turunda blur:39 / degisim:0 / e:0 gozlendi
  // — yani alan odaga girip 39 kez odagi kaybetmis ama TEK KARAKTER bile
  // girmemis. Bu, tanı aracının olcmeye calistigi sorunu kendisinin yaratma/
  // agirlastirma ihtimalini gosteriyor. Simdi zamanlayici ODAKLIYKEN durur,
  // blur oldugu AN anlik yenilenir (boylece test sonrasi sayilar yine gorunur).
  const hudRef = useRef({ eLen: 0, pLen: 0, lastKey: '-', delta: '-', blur: 0, degisim: 0, jsFps: 0 });
  const [hud, setHud] = useState(hudRef.current);
  const focusedRef = useRef(false);
  const renderSayaci = useRef(0);
  renderSayaci.current += 1;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    // JS thread canliligi: saniyedeki kare sayisi. Dekor acik/kapali farki
    // burada gorunur — kok neden animasyon yuku ise bu sayi dramatik degisir.
    let kare = 0;
    let raf = requestAnimationFrame(function tick() { kare += 1; raf = requestAnimationFrame(tick); });
    const iv = setInterval(() => {
      hudRef.current.jsFps = kare; kare = 0;
      // ODAKLIYKEN setState YOK: input'un ustundeki bileseni saniyede bir
      // yeniden render etmek odak/klavye ile catisiyor olabilir.
      if (!focusedRef.current) setHud({ ...hudRef.current });
    }, 1000);
    return () => { show.remove(); hide.remove(); cancelAnimationFrame(raf); clearInterval(iv); };
  }, []);

  const submit = () => onLogin(emailRef.current.trim(), passwordRef.current);

  const keyboardOpen = kbHeight > 0;
  const win = Dimensions.get('window');

  return (
    // KeyboardAvoidingView KULLANILMIYOR: davranisi platform/edge-to-edge'e gore
    // degisiyordu. Bunun yerine klavye yuksekligi kadar alt bosluk birakip icerigi
    // yukari hizaliyoruz — her Android surumunde ayni sonucu verir.
    // keyboardShouldPersistTaps olmadan ilk dokunus yalnizca klavyeyi kapatir.
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            alignItems: 'center',
            // SABIT hizalama: klavye acilinca 'center'->'flex-start' atlamasi
            // gorsel sicramaya yol aciyordu. Denge padding ile kuruluyor.
            justifyContent: 'flex-start',
            paddingTop: keyboardOpen ? 8 : 36,
            paddingBottom: 24 + kbHeight,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.card,
          styles.glassCard,
          { width: isMobile ? '90%' : undefined, maxWidth: 420 }
        ]}>
          <View style={styles.titleContainer}>
            <Image source={asset('/images/icon.png')} style={styles.logoImage} />
            <Text style={styles.girisBaslik}>Okul Öncesi Akademi</Text>
            {/* A/B ANAHTARI: kalemE dokunmak arka plan animasyonlarini acip kapatir.
                Kapatinca yazma/silme duzeliyorsa kok neden kesinlesir. */}
            <Text style={styles.titleEmoji} onPress={onToggleDecor} suppressHighlighting>✏️</Text>
          </View>
          <Text style={styles.welcomeSubtitle}>Hoş geldin, küçük kaşif! 🌟</Text>

          <View style={[
            styles.inputContainer,
            focusedInput === 'email' && styles.inputContainerFocused
          ]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.inputModern}
              placeholder="E-posta Adresi"
              placeholderTextColor="#9E9E9E"
              defaultValue={initialEmail}
              onChangeText={(t) => {
                const d = t.length - emailRef.current.length;
                emailRef.current = t;
                hudRef.current.eLen = t.length;
                hudRef.current.delta = d > 0 ? `+${d}` : String(d);
                hudRef.current.degisim += 1;
              }}
              onKeyPress={(e) => { hudRef.current.lastKey = e.nativeEvent.key; }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              // Autofill balonu olcumu kirletmesin (bu ic-test surumunde kapali)
              autoComplete="off"
              importantForAutofill="no"
              // BlueStacks/kisa pencerede IME kendi tam-ekran metin kutusunu aciyordu
              // ("hizli bir gecis" tarifine birebir uyar) — kapatiliyor.
              disableFullscreenUI
              onFocus={() => {
                focusedRef.current = true;
                setFocusedInput('email');
                requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
              }}
              onBlur={() => {
                focusedRef.current = false;
                setFocusedInput(null);
                hudRef.current.blur += 1;
                setHud({ ...hudRef.current }); // aninda yenile — test sonrasi sayilar hemen gorunsun
              }}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </View>

          <View style={[
            styles.inputContainer,
            focusedInput === 'password' && styles.inputContainerFocused
          ]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              ref={passwordInputRef}
              style={styles.inputModern}
              placeholder="Şifre"
              placeholderTextColor="#9E9E9E"
              onChangeText={(t) => {
                passwordRef.current = t;
                hudRef.current.pLen = t.length;
                hudRef.current.degisim += 1;
              }}
              onKeyPress={(e) => { hudRef.current.lastKey = e.nativeEvent.key; }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              disableFullscreenUI
              onFocus={() => {
                focusedRef.current = true;
                setFocusedInput('password');
                requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 70, animated: true }));
              }}
              onBlur={() => {
                focusedRef.current = false;
                setFocusedInput(null);
                hudRef.current.blur += 1;
                setHud({ ...hudRef.current });
              }}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </View>

          <TouchableOpacity
            style={[styles.gradientButton, isLoggingIn && styles.buttonDisabled]}
            onPress={submit}
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

          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => onForgot(emailRef.current.trim())}>
              <Text style={styles.linkText}>Şifremi Unuttum</Text>
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity onPress={onSignup}>
              <Text style={styles.linkText}>Henüz üye değil misin? <Text style={styles.linkBold}>Kayıt Ol</Text></Text>
            </TouchableOpacity>
          </View>

          {/* ---- TANI GOSTERGESI ----
              YALNIZCA native (Android tani APK'si) icin. Web'de gosterilmez:
              hata Android'e ozgu ve canli sitede kirmizi olcum satiri rahatsiz edici. */}
          {Platform.OS !== 'web' && (
            <Text style={styles.taniHud}>
              {`odak:${focusedInput ?? 'YOK'}  e:${hud.eLen}  s:${hud.pLen}  Δ:${hud.delta}  tus:${hud.lastKey}`}
              {'\n'}
              {`kb:${kbHeight}  pencere:${Math.round(win.width)}x${Math.round(win.height)}  blur:${hud.blur}  degisim:${hud.degisim}`}
              {'\n'}
              {`render:${renderSayaci.current}  jsFPS:${hud.jsFps}  DEKOR:${decorAcik ? 'ACIK' : 'KAPALI'}  ${BUILD_ETIKET}`}
            </Text>
          )}
        </View>

        {/* Alt butonlar artik ScrollView ICINDE ve kosullu KALDIRILMIYOR —
            klavye acilinca agactan view silinmesi sicramaya yol aciyordu. */}
        <View style={{ marginTop: 18, marginBottom: 8, flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <TouchableOpacity style={styles.adminButtonBottom} onPress={onAdmin}>
            <Text style={styles.adminButtonText}>🔑 Uzman</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminButtonBottom, { backgroundColor: 'rgba(123, 31, 162, 0.25)', borderColor: 'rgba(123, 31, 162, 0.4)' }]}
            onPress={onVeli}
          >
            <Text style={[styles.adminButtonText, { color: '#7B1FA2' }]}>👨‍👩‍👧 Veli Paneli</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminButtonBottom, { backgroundColor: 'rgba(255, 152, 0, 0.25)', borderColor: 'rgba(255, 152, 0, 0.4)' }]}
            onPress={onOgretmen}
          >
            <Text style={[styles.adminButtonText, { color: '#E65100' }]}>👩‍🏫 Öğretmen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
});

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

  // NOT: password/focus artik GirisFormu'nun yerel state'inde; kayit ve cocuk-secimi
  // alanlari da kullanilmiyor (o Modal'lar olu koddu, kaldirildi — kayit /signup rotasinda).
  const {
    isLoggingIn,
    girisYap, sifremiUnuttum,
  } = useAuth({ email, setEmail, setAd, setYas, setAsama, showToast, resumeAfterInteraction });

  // Kalıcı Supabase oturumu varsa yenilemede giriş ekranını atla (sessiz geri yükleme);
  // ayrıca çevrimdışı kalmış oyun sonuçlarını arka planda gönder.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionEmail = data.session?.user?.email;
        if (!sessionEmail || cancelled) return;
        const { data: profiles } = await supabase
          .from('profiles')
          .select('child_name, child_age_months')
          .eq('email', sessionEmail)
          .limit(1);
        if (cancelled || !profiles || profiles.length === 0) return;
        setEmail(sessionEmail);
        setAd(profiles[0].child_name);
        setYas(String(profiles[0].child_age_months));
        setAsama((prev) => (prev === 'giris' ? 'menu' : prev));
        flushPendingResults();
      } catch {
        // sessiz: oturum geri yüklenemezse giriş ekranı kalır
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    // Açık çıkış: kalıcı oturumu da kapat ki yenilemede otomatik girilmesin.
    supabase.auth.signOut().catch(() => { });
    setAd('');
    setYas('');
    setEmail('');
    setActiveDailyRoute(null);
    setDailyCompletedRoutes([]);
    setDailyPlanRoutes([]);
    setDailyPlanDate('');
    setSelectedCategory(null);
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

  // GirisFormu React.memo ile sarili — prop kimlikleri sabit kalsin ki App yeniden
  // render olsa bile (ör. toast) form yeniden render edilip yazi kaybolmasin.
  const authActionsRef = useRef({ girisYap, sifremiUnuttum });
  authActionsRef.current = { girisYap, sifremiUnuttum };
  const handleLogin = useCallback((mail: string, pass: string) => { authActionsRef.current.girisYap(mail, pass); }, []);
  const handleForgot = useCallback((mail: string) => { authActionsRef.current.sifremiUnuttum(mail); }, []);
  const handleSignup = useCallback(() => router.push('/signup' as any), [router]);
  const handleAdmin = useCallback(() => router.push('/admin' as any), [router]);
  const handleVeli = useCallback(() => router.push('/veli-dashboard' as any), [router]);
  const handleOgretmen = useCallback(() => router.push('/teacher-dashboard' as any), [router]);
  // Giris ekraninda arka plan animasyonlarini ac/kapa (Android IME tanisi icin A/B).
  const [decorAcik, setDecorAcik] = useState(true);
  const handleToggleDecor = useCallback(() => setDecorAcik((v) => !v), []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSongIndex] = useState<number>(0);
  const [dailyPlanDate, setDailyPlanDate] = useState<string>('');
  const [dailyPlanRoutes, setDailyPlanRoutes] = useState<string[]>([]);
  const [dailyCompletedRoutes, setDailyCompletedRoutes] = useState<string[]>([]);
  const [activeDailyRoute, setActiveDailyRoute] = useState<string | null>(null);

  const parsedAgeMonths = parseInt(yas, 10) || 48;
  const nextDailyRoute = dailyPlanRoutes.find((route) => !dailyCompletedRoutes.includes(route)) || null;
  const isDailyPlanComplete = dailyPlanRoutes.length > 0 && dailyCompletedRoutes.length >= dailyPlanRoutes.length;


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

  // === EKRANLAR ===
  if (asama === 'giris') {
    const windowWidth = Dimensions.get('window').width;
    const isMobile = windowWidth < 768;

    return (
      <DynamicBackground decor={decorAcik}>
        <GirisFormu
          isMobile={isMobile}
          isLoggingIn={isLoggingIn}
          initialEmail={email}
          decorAcik={decorAcik}
          onToggleDecor={handleToggleDecor}
          onLogin={handleLogin}
          onForgot={handleForgot}
          onSignup={handleSignup}
          onAdmin={handleAdmin}
          onVeli={handleVeli}
          onOgretmen={handleOgretmen}
        />
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ ...toast, visible: false })}
        />

        {/* Child Selection Modal - for duplicate name+age */}
        {/* NOT: Cocuk secimi ve kayit Modal'lari KALDIRILDI — setShowChildSelection(true)/
            setShowRegistration(true) kod tabaninda hic cagrilmiyordu (olu kod). Kayit akisi
            router.push('/signup') uzerinden yurur. Android'de Modal ayri bir pencere actigi
            icin agacta durmalari IME davranisi acisindan da gereksiz bir degiskendi. */}
      </DynamicBackground>
    );
  }

  if (asama === 'menu') {
    const activeCategory = selectedCategory ? DISCOVERY_FOREST_CATEGORIES.find((c) => c.id === selectedCategory) : null;
    const categoryGames = selectedCategory ? getGamesByForestCategory(selectedCategory) : [];

    return (
      <DynamicBackground>
        {/* Uçuşan dekorlar */}
        <FloatingDeco emoji="☁️" style={styles.decoCloud} />
        <FloatingDeco emoji="⭐" style={styles.decoStar} delay={800} />
        <FloatingDeco emoji="🌈" style={styles.decoRainbow} delay={400} />
        <FloatingDeco emoji="✨" style={styles.decoSparkle} delay={1200} />

        <ScrollView contentContainerStyle={styles.menuScroll}>
          <View style={styles.menuHeader}>
            <Text style={styles.greetBig}>Merhaba {ad || 'küçük kaşif'}! 👋</Text>
            <Text style={styles.greetSub}>Bugün hangi maceraya atılalım?</Text>
          </View>

          {/* Bugünün Macerası */}
          <View style={[styles.adventureCard, gradientStyle('#FF9A3C', '#FF3D81', '#FF5E7E')]}>
            <Text style={styles.adventureTitle}>🚀 Bugünün Macerası</Text>
            <View style={styles.adventureStars}>
              {[0, 1, 2].map((i) => {
                const route = dailyPlanRoutes[i];
                const done = route ? dailyCompletedRoutes.includes(route) : false;
                return (
                  <View key={i} style={[styles.advStar, done && styles.advStarDone]}>
                    <Text style={styles.advStarText}>{done ? '⭐' : '🎯'}</Text>
                  </View>
                );
              })}
            </View>
            <WiggleButton onPress={startDailyFlow} style={styles.adventureBtn}>
              <Text style={styles.adventureBtnText}>
                {isDailyPlanComplete ? 'Tekrar Oyna 🔁' : dailyCompletedRoutes.length > 0 ? 'Devam Et ▶️' : 'Hadi Başla! ▶️'}
              </Text>
            </WiggleButton>
          </View>

          {/* Keşif Ormanı — grid değil, kıvrılan bir patika: sola/ortaya/sağa kayan
              düğümler + aralarında iz noktaları + hafif eğim, "macera haritası" hissi versin. */}
          <View style={styles.forestHeader}>
            <Text style={styles.forestTitle}>🌲 Keşif Ormanı</Text>
            <Text style={styles.forestSubtitle}>Bugün hangi patikaya gidelim?</Text>
          </View>
          <View style={styles.pathWrap}>
            {(() => {
              const ALIGN: ('flex-start' | 'center' | 'flex-end')[] = ['center', 'flex-end', 'center', 'flex-start'];
              const ROT = [-3, 2, -2, 3, -1.5, 2.5];
              let nodeIndex = 0;
              return DISCOVERY_FOREST_CATEGORIES.map((cat, i) => {
                const count = getGamesByForestCategory(cat.id).length;
                if (count === 0) return null;
                const n = nodeIndex++;
                const align = ALIGN[n % ALIGN.length];
                const rotate = `${ROT[n % ROT.length]}deg`;
                const big = count >= 15;
                return (
                  <React.Fragment key={cat.id}>
                    {n > 0 && (
                      <View style={styles.pathConnector}>
                        {Array.from({ length: 7 }).map((_, d) => (
                          <View key={d} style={styles.pathDash} />
                        ))}
                      </View>
                    )}
                    <View style={[styles.pathRow, { justifyContent: align }]}>
                      <View style={{ transform: [{ rotate }] }}>
                        <ForestCategoryCard
                          category={cat}
                          delay={n * 90}
                          gameCount={count}
                          size={big ? 172 : 140}
                          onPress={() => setSelectedCategory(cat.id)}
                        />
                      </View>
                    </View>
                  </React.Fragment>
                );
              });
            })()}
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={cikisYap} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Çıkış Yap 🚪</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Kategori oyunları - modal sheet */}
        <Modal
          visible={!!selectedCategory}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedCategory(null)}
        >
          <View style={styles.sheetOverlay}>
            <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setSelectedCategory(null)} />
            <View style={styles.sheet}>
              <View style={[styles.sheetHeader, { backgroundColor: activeCategory?.accentColor || '#7E57C2' }]}>
                <View>
                  <Text style={styles.sheetTitle}>{activeCategory?.forestName}</Text>
                  <Text style={styles.sheetSubtitle}>{activeCategory?.maarifArea}</Text>
                </View>
                <TouchableOpacity style={styles.sheetClose} onPress={() => setSelectedCategory(null)} activeOpacity={0.7}>
                  <Ionicons name="close" size={26} color="#2D3142" />
                </TouchableOpacity>
              </View>
              {categoryGames.some(g => g.adaptive) && (
                <View style={styles.adaptiveLegend}>
                  <Text style={styles.adaptiveBadgeText}>📈</Text>
                  <Text style={styles.adaptiveLegendText}>= Akıllı zorluk: çocuğa göre uyarlanır</Text>
                </View>
              )}
              <ScrollView contentContainerStyle={styles.sheetGrid}>
                {categoryGames.map((game, i) => {
                  const meta = GAME_CARD_META[game.id] || {
                    color: '#607D8B',
                    icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
                    displayTitle: game.title,
                    subtitle: game.skillFocus,
                  };
                  return (
                    <BouncyCard
                      key={game.id}
                      delay={i * 45}
                      onPress={() => { const rk = game.routeKey; setSelectedCategory(null); oyunuBaslat(rk); }}
                      style={[styles.gameCard, { backgroundColor: meta.color }]}
                    >
                      {game.adaptive && (
                        <View style={styles.adaptiveBadge}>
                          <Text style={styles.adaptiveBadgeText}>📈</Text>
                        </View>
                      )}
                      <View style={styles.gameEmojiBadge}>
                        <BobbingEmoji emoji={GAME_EMOJI[game.id] || '🎮'} size={46} delay={i * 120} />
                      </View>
                      <Text style={styles.gameCardTitle} numberOfLines={2}>{meta.displayTitle || game.title}</Text>
                    </BouncyCard>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </DynamicBackground>
    );
  }

  // Oyun ekranlari: routeKey -> bilesen eslesmesi components/gameRegistry.tsx'te.
  // Yeni oyun eklemek icin index.tsx'e dokunmaya gerek yok (bkz. gameRegistry).
  const gameRenderer = GAME_RENDERERS[asama];
  if (gameRenderer) {
    // ErrorBoundary: bir oyun çökerse tüm uygulama yerine sadece o oyun düşer,
    // çocuk "Menüye Dön" ile devam eder. key={asama} => her oyuna taze sınır.
    return (
      <GameErrorBoundary key={asama} gameName={asama} onExit={() => setAsama('menu')}>
        {gameRenderer({
          onGameEnd: oyunuBitir,
          onExit: () => setAsama('menu'),
          ad,
          yas,
          email,
          selectedSongIndex,
        })}
      </GameErrorBoundary>
    );
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
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
  // Tani gostergesi — yalniz ic-test surumunde gorunur, kucuk ve dikkat cekmeyen.
  taniHud: {
    marginTop: 10,
    fontSize: 10,
    lineHeight: 14,
    color: '#B71C1C',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
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

  // ===== Eğlenceli menü (kategori hub) =====
  menuScroll: { flexGrow: 1, paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center' },
  menuHeader: { alignItems: 'center', marginBottom: 18, marginTop: 6 },
  greetBig: { fontSize: 30, fontWeight: '900', color: '#0B3D66', textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  greetSub: { fontSize: 16, fontWeight: '700', color: '#0B3D66', opacity: 0.75, marginTop: 4, textAlign: 'center' },

  adventureCard: { width: '100%', maxWidth: 560, borderRadius: 26, padding: 18, marginBottom: 24, backgroundColor: '#FF5E7E', shadowColor: '#D6336C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 1, elevation: 8 },
  adventureTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  adventureStars: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  advStar: { flex: 1, height: 58, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  advStarDone: { backgroundColor: '#fff', borderStyle: 'solid' },
  advStarText: { fontSize: 26 },
  adventureBtn: { backgroundColor: '#fff', borderRadius: 18, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 1, elevation: 4 },
  adventureBtnText: { color: '#FF3D81', fontSize: 20, fontWeight: '900' },

  forestHeader: { alignItems: 'center', marginBottom: 14 },
  forestTitle: { fontSize: 20, fontWeight: '900', color: '#1B5E20', textAlign: 'center' },
  forestSubtitle: { fontSize: 13, fontWeight: '600', color: '#0B3D66', opacity: 0.7, marginTop: 2, textAlign: 'center' },
  pathWrap: { width: '100%', maxWidth: 440, marginBottom: 4 },
  pathRow: { flexDirection: 'row', width: '100%', marginVertical: -6 },
  pathConnector: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 2 },
  pathDash: { width: 6, height: 11, borderRadius: 3, backgroundColor: '#C99A5B', opacity: 0.55 },

  logoutBtn: { marginTop: 26, backgroundColor: 'rgba(255,82,82,0.92)', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 22, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Kategori oyunları modal sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: '#F5F7FF', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '86%', overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 22, backgroundColor: '#7E57C2' },
  sheetTitle: { color: '#2D3142', fontSize: 22, fontWeight: '900' },
  sheetSubtitle: { color: '#2D3142', opacity: 0.7, fontSize: 13, fontWeight: '700', marginTop: 2 },
  sheetClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, padding: 20, paddingBottom: 40 },
  gameCard: { width: 150, height: 158, borderRadius: 26, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#607D8B', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 5 },
  gameEmojiBadge: { width: 82, height: 82, borderRadius: 41, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 1, elevation: 2 },
  adaptiveBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, zIndex: 5, elevation: 3 },
  adaptiveBadgeText: { fontSize: 14 },
  adaptiveLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12, paddingBottom: 2 },
  adaptiveLegendText: { color: '#607D8B', fontSize: 12, fontWeight: '600' },
  gameCardTitle: { color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  gameCardSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11, textAlign: 'center', marginTop: 2 },

  // Uçuşan dekorlar
  decoCloud: { top: 14, left: 16, fontSize: 40, zIndex: 0 },
  decoStar: { top: 44, right: 20, fontSize: 30, zIndex: 0 },
  decoRainbow: { bottom: 30, left: 22, fontSize: 30, zIndex: 0 },
  decoSparkle: { bottom: 84, right: 18, fontSize: 26, zIndex: 0 },

  // Kategori hub
  hubHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#37474F',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 720,
    alignSelf: 'center',
    marginBottom: 10,
  },
  categoryCard: {
    width: 200,
    height: 150,
    borderRadius: 26,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'transform 0.15s ease' } : {}),
  },
  categoryEmoji: {
    fontSize: 46,
    marginBottom: 8,
  },
  categoryLabel: {
    color: 'white',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  categoryCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  backToCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 18,
    marginLeft: 6,
    elevation: 2,
  },
  backToCategoriesText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#37474F',
  },

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



