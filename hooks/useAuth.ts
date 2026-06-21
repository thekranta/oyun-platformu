import { useState } from 'react';
import { calculateAgeInMonths } from '../lib/menuHelpers';
import { supabase } from '../lib/supabase';

export interface ChildProfile {
  id: string;
  child_name: string;
  child_age_months: number;
  email: string;
}

type ToastType = 'success' | 'error' | 'info';

export interface UseAuthArgs {
  email: string;
  setEmail: (value: string) => void;
  setAd: (value: string) => void;
  setYas: (value: string) => void;
  setAsama: (value: string) => void;
  showToast: (message: string, type?: ToastType) => void;
  resumeAfterInteraction: () => Promise<void> | void;
}

/**
 * Giris, sifre sifirlama, kayit ve cocuk secimi mantigini ve bu akislara ozel
 * form/state'leri tasir. Oturum kimligi (ad/yas/email/asama) cagiran component'te
 * kalir; hook bunlari setter olarak alir.
 */
export function useAuth({
  email,
  setEmail,
  setAd,
  setYas,
  setAsama,
  showToast,
  resumeAfterInteraction,
}: UseAuthArgs) {
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Registration states
  const [showRegistration, setShowRegistration] = useState(false);
  const [regAd, setRegAd] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCinsiyet, setRegCinsiyet] = useState<'erkek' | 'kiz' | null>(null);
  const [yasInputMode, setYasInputMode] = useState<'ay' | 'tarih'>('ay');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [regYasAy, setRegYasAy] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Child selection state (for duplicate name+age)
  const [matchingChildren, setMatchingChildren] = useState<ChildProfile[]>([]);
  const [showChildSelection, setShowChildSelection] = useState(false);

  // Turnstile CAPTCHA token state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [regTurnstileToken, setRegTurnstileToken] = useState<string | null>(null);

  const girisYap = async () => {
    if (email.trim() === '' || password.trim() === '') {
      showToast('Lütfen e-posta ve şifrenizi giriniz.', 'error');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showToast('Hatalı e-posta veya şifre.', 'error');
        } else {
          showToast('Giriş başarısız: ' + error.message, 'error');
        }
        return;
      }

      if (data.user) {
        // Profil bilgisini çek
        const { data: profiles } = await supabase
          .from('profiles')
          .select('child_name, child_age_months')
          .eq('email', email.trim())
          .single();

        if (profiles) {
          setAd(profiles.child_name);
          setYas(profiles.child_age_months.toString());
        }

        await resumeAfterInteraction();
        setAsama('menu');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      showToast('Beklenmedik bir hata oluştu.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const sifremiUnuttum = async () => {
    if (email.trim() === '') {
      showToast('Lütfen şifre sıfırlama bağlantısı için e-postanızı giriniz.', 'error');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://oyun-platformu.vercel.app/reset-password',
      });
      if (error) throw error;
      showToast('Şifre sıfırlama bağlantısı e-postanıza gönderildi.', 'success');
    } catch (error: any) {
      showToast('Hata: ' + error.message, 'error');
    }
  };

  // Çocuk seçildiğinde giriş yap
  const selectChild = async (child: ChildProfile) => {
    setEmail(child.email);
    setAd(child.child_name);
    setYas(child.child_age_months.toString());
    setShowChildSelection(false);
    await resumeAfterInteraction();
    setAsama('menu');
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
    if (regPassword.trim().length < 6) {
      showToast('Şifre en az 6 karakter olmalıdır.', 'error');
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
      // 1. Supabase Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
      });

      if (authError) {
        showToast('Kayıt hatası: ' + authError.message, 'error');
        setIsRegistering(false);
        return;
      }

      if (authData.user) {
        // 2. Profiles tablosuna kaydet
        const profileData = {
          child_name: regAd.trim(),
          email: regEmail.trim(),
          child_age_months: finalYasAy,
          gender: regCinsiyet,
          created_at: new Date().toISOString(),
          subscription_tier: 'free'
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (profileError) {
          console.error('Profil oluşturma hatası:', profileError);
          showToast('Hesap oluşturuldu ancak profil kaydedilemedi.', 'error');
        } else {
          showToast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
          setRegAd('');
          setRegEmail('');
          setRegPassword('');
          setRegYasAy('');
          setDogumTarihi('');
          setShowRegistration(false);
        }
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      showToast('Kayıt sırasında bir hata oluştu.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return {
    // Login form
    password,
    setPassword,
    isLoggingIn,
    focusedInput,
    setFocusedInput,
    girisYap,
    sifremiUnuttum,
    // Registration
    showRegistration,
    setShowRegistration,
    regAd,
    setRegAd,
    regEmail,
    setRegEmail,
    regPassword,
    setRegPassword,
    regCinsiyet,
    setRegCinsiyet,
    yasInputMode,
    setYasInputMode,
    dogumTarihi,
    setDogumTarihi,
    regYasAy,
    setRegYasAy,
    isRegistering,
    kayitOl,
    // Child selection
    matchingChildren,
    setMatchingChildren,
    showChildSelection,
    setShowChildSelection,
    selectChild,
    // Turnstile
    turnstileToken,
    setTurnstileToken,
    regTurnstileToken,
    setRegTurnstileToken,
  };
}
