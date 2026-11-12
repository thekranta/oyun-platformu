import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { asset } from '@/lib/assetMap';
import { changeLanguage } from '@/lib/i18n';

/**
 * Mobil (iOS/Android) giriş ekranı: WelcomeLogin.web.tsx'in dar-ekran görünümüyle AYNI tasarım (Bilimo).
 * Web ve mobil giriş ekranı birbirinden ayrışmasın diye renkler/metinler/yerleşim oradan alınmıştır;
 * biri değişirse diğeri de güncellenmeli.
 *
 * Android IME dersleri (bkz. index.tsx GirisFormu notları) AYNEN korunur:
 * - Girdiler KONTROLSÜZ: metnin sahibi native alan (defaultValue + ref); yazarken render yok, silme çalışır.
 * - Girdi kapsayıcısı collapsable={false}; odakta YALNIZ kenarlık RENGİ değişir — gölge/elevation eklenip
 *   çıkarılırsa Fabric kapsayıcıyı yeniden oluşturup TextInput'u söküyordu.
 * - Klavye açılınca hiçbir şey ağaçtan kaldırılmaz; üst bölüm yalnız yüksekliği 0'a iner.
 */

export type WelcomeLoginProps = {
  isLoggingIn: boolean; initialEmail: string;
  onLogin: (email: string, password: string) => void;
  onForgot: (email: string) => void; onSignup: () => void;
  onAdmin: () => void; onVeli: () => void; onOgretmen: () => void; onKurum: () => void;
};

const C = {
  bg: '#fcf7ed', ink: '#344f4b', muted: '#7d8478', soft: '#8d8c6b',
  door: '#fffdf8', doorLine: '#eee4d5', field: '#faf9f1', fieldLine: '#e5e4d8', fieldFocus: '#5a9789',
  green: '#387f71', greenEdge: '#286457', coral: '#d77c60',
};

function WelcomeLoginNative(p: WelcomeLoginProps) {
  const { t, i18n } = useTranslation();
  const en = i18n.language.startsWith('en');
  const insets = useSafeAreaInsets();
  const emailRef = useRef(p.initialEmail);
  const passwordRef = useRef('');
  const passwordInputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const keyboardOpen = kbHeight > 0;
  const submit = () => { if (!p.isLoggingIn) p.onLogin(emailRef.current.trim(), passwordRef.current); };

  const adults: { label: string; onPress: () => void; bg: string; line: string; ink: string }[] = [
    { label: en ? 'Parent panel' : 'Veli paneli', onPress: p.onVeli, bg: '#eef3e9', line: '#d8e3d7', ink: '#415e50' },
    { label: en ? 'Teacher login' : 'Öğretmen girişi', onPress: p.onOgretmen, bg: '#fff0d8', line: '#eddbbb', ink: '#80602b' },
    { label: en ? 'Institution login' : 'Kurum girişi', onPress: p.onKurum, bg: '#e7f2ef', line: '#cde2db', ink: '#3c6b60' },
    { label: en ? 'Specialist login' : 'Uzman girişi', onPress: p.onAdmin, bg: '#f2eaf3', line: '#e3d5e6', ink: '#785580' },
  ];

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 6, paddingBottom: 20 + kbHeight, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.column}>
          <View style={s.header}>
            <View style={s.brand}>
              <View style={s.brandMark}>
                <Image source={asset('/branding/mascot/el-sallar.webp')} style={s.fill} resizeMode="contain" accessibilityLabel="Bilimo" />
              </View>
              <Text style={s.brandName}>Bilimo</Text>
            </View>
            <View style={s.langWrap} accessibilityRole="tablist">
              {(['tr', 'en'] as const).map((lang) => {
                const active = i18n.language.startsWith(lang);
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[s.langBtn, active && s.langBtnActive]}
                    onPress={() => changeLanguage(lang)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    hitSlop={4}
                  >
                    <Text style={[s.langText, active && s.langTextActive]}>{lang.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Karşılama: klavye açılınca yalnız yüksekliği 0'a iner (ağaçtan kalkmaz). */}
          <View style={[s.hero, keyboardOpen && s.heroHidden]} pointerEvents="none">
            <View style={s.heroText}>
              <Text style={s.headline}>
                {en ? 'A little play.' : 'Biraz oyun.'}{'\n'}
                <Text style={s.headlineEm}>{en ? 'A world of discovery.' : 'Kocaman bir dünya.'}</Text>
              </Text>
            </View>
            <Image source={asset('/branding/mascot/el-sallar.webp')} style={s.heroMascot} resizeMode="contain" />
          </View>

          <View style={s.door}>
            <Text style={s.eyebrow}>{en ? 'WELCOME TO BILIMO' : 'BİLİMO’YA HOŞ GELDİN'}</Text>
            <Text style={s.doorTitle} accessibilityRole="header">{en ? 'Ready to explore?' : 'Keşfe hazır mısın?'}</Text>
            <Text style={s.note}>{en ? 'Sign in with a grown-up. Then let the play begin!' : 'Bir büyüğünle giriş yap, oyunlar başlasın!'}</Text>

            <Text style={s.label}>{en ? 'Email address' : 'E-posta adresi'}</Text>
            <View collapsable={false} style={[s.field, focused === 'email' && s.fieldFocused]}>
              <TextInput
                style={s.input}
                placeholder={en ? 'Your email address' : 'E-posta adresiniz'}
                placeholderTextColor="#9a9a8c"
                defaultValue={p.initialEmail}
                onChangeText={(v) => { emailRef.current = v; }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
                disableFullscreenUI
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View style={s.labelRow}>
              <Text style={[s.label, s.labelInRow]}>{en ? 'Password' : 'Şifre'}</Text>
              <TouchableOpacity onPress={() => p.onForgot(emailRef.current.trim())} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.forgot}>{t('login.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>
            <View collapsable={false} style={[s.field, focused === 'password' && s.fieldFocused]}>
              <TextInput
                ref={passwordInputRef}
                style={s.input}
                placeholder={en ? 'Your password' : 'Şifreniz'}
                placeholderTextColor="#9a9a8c"
                onChangeText={(v) => { passwordRef.current = v; }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
                disableFullscreenUI
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            </View>

            <TouchableOpacity style={[s.primary, p.isLoggingIn && s.disabled]} onPress={submit} disabled={p.isLoggingIn} activeOpacity={0.85} accessibilityRole="button">
              {p.isLoggingIn ? (
                <View style={s.rowCenter}>
                  <ActivityIndicator size="small" color="#fffaf0" style={{ marginRight: 10 }} />
                  <Text style={s.primaryText}>{t('login.loggingIn')}</Text>
                </View>
              ) : (
                <>
                  <Text style={s.primaryText}>{en ? 'Sign in & start playing' : 'Giriş yap, oyuna katıl'}</Text>
                  <Text style={s.primaryText}>→</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={s.signup}>
              <Text style={s.signupAsk}>{en ? 'New to Bilimo?' : 'Bilimo’ya yeni mi geldiniz?'}</Text>
              <TouchableOpacity style={s.signupBtn} onPress={p.onSignup} activeOpacity={0.85} accessibilityRole="button">
                <Text style={s.signupText}>{en ? 'Create an account' : 'Hesap oluştur'}</Text>
                <Text style={s.signupText}>↗</Text>
              </TouchableOpacity>
            </View>

            <View style={s.adults}>
              <Text style={s.adultsTitle}>{en ? 'GROWN-UP ENTRANCES' : 'YETİŞKİN GİRİŞLERİ'}</Text>
              <View style={s.adultsGrid}>
                {adults.map((a) => (
                  <TouchableOpacity key={a.label} style={[s.adultBtn, { backgroundColor: a.bg, borderColor: a.line }]} onPress={a.onPress} activeOpacity={0.8} accessibilityRole="button">
                    <Text style={[s.adultText, { color: a.ink }]} numberOfLines={1}>{a.label}</Text>
                    <Text style={[s.adultText, { color: a.ink }]}>↗</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={s.footer}>{en ? 'Every child is a whole world of possibilities.' : 'Her çocuk, keşfedilmeyi bekleyen kocaman bir dünya.'} ✦</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default React.memo(WelcomeLoginNative);

// Gölge/elevation KULLANILMAZ (Android IME dersi); web'deki "düğme kenar gölgesi" alt kenarlıkla verilir.
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  column: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  fill: { width: '100%', height: '100%' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FBE1CC', borderWidth: 1, borderColor: '#F0C8A8', padding: 3, overflow: 'hidden' },
  brandName: { fontSize: 23, fontWeight: '800', letterSpacing: -0.8, color: C.ink },
  langWrap: { flexDirection: 'row', gap: 4, backgroundColor: '#eeeadd', padding: 4, borderRadius: 30 },
  langBtn: { minWidth: 42, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 22, paddingHorizontal: 8 },
  langBtnActive: { backgroundColor: '#fffdf8' },
  langText: { fontSize: 13, fontWeight: '700', color: '#64796e' },
  langTextActive: { color: C.ink },

  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 96, marginTop: 6, marginBottom: 6, overflow: 'hidden' },
  heroHidden: { height: 0, marginTop: 0, marginBottom: 0 },
  heroText: { flex: 1, paddingRight: 8 },
  headline: { fontSize: 27, fontWeight: '800', letterSpacing: -1, lineHeight: 33, color: C.ink },
  headlineEm: { color: C.coral },
  heroMascot: { width: 92, height: 88 },

  door: { backgroundColor: C.door, borderWidth: 1, borderColor: C.doorLine, borderBottomWidth: 4, borderRadius: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  eyebrow: { textAlign: 'center', fontSize: 9, fontWeight: '800', letterSpacing: 2, color: C.soft },
  doorTitle: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: -0.8, color: C.ink, marginTop: 8, marginBottom: 5 },
  note: { textAlign: 'center', fontSize: 13, lineHeight: 20, color: C.muted, marginBottom: 16 },

  label: { fontSize: 12, fontWeight: '700', color: '#56675d', marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  labelInRow: { marginBottom: 0 },
  forgot: { fontSize: 12, color: '#8b8875' },
  // Kenarlık kalınlığı SABİT; odakta yalnız renk değişir.
  field: { minHeight: 50, borderWidth: 1.5, borderColor: C.fieldLine, borderRadius: 14, backgroundColor: C.field, justifyContent: 'center' },
  fieldFocused: { borderColor: C.fieldFocus },
  input: { fontSize: 15, color: C.ink, paddingHorizontal: 15, paddingVertical: 10, minHeight: 47 },

  primary: { minHeight: 54, marginTop: 18, borderRadius: 16, backgroundColor: C.green, borderBottomWidth: 4, borderBottomColor: C.greenEdge, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fffaf0' },
  disabled: { opacity: 0.6 },

  signup: { marginTop: 18, marginBottom: 6, gap: 10 },
  signupAsk: { textAlign: 'center', fontSize: 13, color: '#6c7568' },
  signupBtn: { minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#d99071', borderBottomWidth: 4, borderBottomColor: '#e7c7ac', backgroundColor: '#fae6d6', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signupText: { fontSize: 17, fontWeight: '800', color: '#88492f' },

  adults: { marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e4dfcf' },
  adultsTitle: { textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: '#677567' },
  adultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  adultBtn: { width: '48%', flexGrow: 1, minHeight: 52, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  adultText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },

  footer: { textAlign: 'center', fontSize: 11, color: '#999b87', marginTop: 14, paddingHorizontal: 8 },
});
