import DiziyiTamamla from '@/components/DiziyiTamamla';
import DynamicBackground from '@/components/DynamicBackground';
import GruplamaOyunu from '@/components/GruplamaOyunu';
import HafizaOyunu from '@/components/HafizaOyunu';
import SiralamaOyunu from '@/components/SiralamaOyunu';
import Toast from '@/components/Toast';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// === 1. BURAYA KENDİ GEMINI ANAHTARINIZI YAPIŞTIRIN ===
// BU KOD ARTIK EXPO'NUN GÜVENLİK KURALINA UYUYOR
// === BU KOD GİZLİ KALMALIDIR! SADECE VERCEL'DEN OKUNACAKTIR. ===
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
// ================================================================// ======================================================

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export default function App() {
  const router = useRouter();
  const [asama, setAsama] = useState('giris');
  const [secilenOyun, setSecilenOyun] = useState('');
  const [ad, setAd] = useState('');
  const [yas, setYas] = useState('');
  const [email, setEmail] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const girisYap = () => {
    if (ad.trim() === '' || yas.trim() === '') {
      showToast("Lütfen isim ve yaş giriniz.", "error");
      return;
    }
    if (!/^\d+$/.test(yas)) {
      showToast("Lütfen yaş alanına sadece rakam giriniz.", "error");
      return;
    }
    const yasNum = parseInt(yas);
    if (yasNum < 24 || yasNum > 75) {
      showToast("Yaş 24 ile 75 ay arasında olmalıdır.", "error");
      return;
    }
    setAsama('menu');
  };

  const oyunuBaslat = (oyunTipi: string) => {
    setSecilenOyun(oyunTipi);
    setYukleniyor(false);
    setAsama(oyunTipi);
  };

  const oyunuBitir = (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => {
    setAsama('sonuc');
    sessizceAnalizEtVeKaydet(oyunAdi, sure, finalHamle, finalHata);
  };

  const cikisYap = () => {
    setAd('');
    setYas('');
    setEmail('');
    setAsama('giris');
  };

  const sessizceAnalizEtVeKaydet = async (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => {
    setYukleniyor(true);

    // 1. Supabase Kaydı (Sadece ham veri ve email kaydedilir)
    try {
      const kayitVerisi = {
        oyun_turu: oyunAdi,
        hamle_sayisi: finalHamle,
        hata_sayisi: finalHata,
        // yapay_zeka_yorumu: ..., // Artık admin panelinde yapılacak
        ogrenci_adi: ad,
        ogrenci_yasi: parseInt(yas),
        sure: sure,
        email: email // Ebeveyn emaili kaydediliyor
      };

      console.log("Supabase Request Body:", JSON.stringify(kayitVerisi, null, 2));

      let supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        } as any,
        body: JSON.stringify(kayitVerisi)
      });

      // Eğer email sütunu yoksa hata verir, bu durumda emailsiz tekrar deneriz
      if (!supabaseResponse.ok) {
        const responseText = await supabaseResponse.text();
        if (responseText.includes("Could not find the 'email' column")) {
          console.warn("Email sütunu eksik, emailsiz kayıt deneniyor...");
          const { email, ...kayitVerisiEmailsiz } = kayitVerisi;

          supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY || '',
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            } as any,
            body: JSON.stringify(kayitVerisiEmailsiz)
          });
        } else {
          throw new Error(`Supabase Hatası: ${supabaseResponse.status} - ${responseText}`);
        }
      }

      if (!supabaseResponse.ok) {
        const responseText = await supabaseResponse.text();
        throw new Error(`Supabase Hatası (Tekrar): ${supabaseResponse.status} - ${responseText}`);
      }

      console.log("Kayıt Başarılı");
    } catch (error) {
      console.log("Kayıt Hatası:", error);
    } finally {
      setYukleniyor(false);
    }
  };

  // === EKRANLAR ===
  if (asama === 'giris') {
    return (
      <DynamicBackground>
        <View style={styles.merkezContainer}>
          <Text style={styles.girisBaslik}>🎓 Okul Öncesi Akademi</Text>
          <TextInput style={styles.input} placeholder="İsim (Örn: Ali)" value={ad} onChangeText={setAd} />
          <TextInput style={styles.input} placeholder="Yaş (Ay)" value={yas} onChangeText={setYas} keyboardType="numeric" />
          <TextInput
            style={styles.input}
            placeholder="Ebeveyn E-posta (İsteğe Bağlı)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.buton} onPress={girisYap}><Text style={styles.butonYazi}>Giriş Yap 🚀</Text></TouchableOpacity>

          <TouchableOpacity
            style={[styles.buton, { backgroundColor: '#607D8B', marginTop: 20, paddingVertical: 10 }]}
            onPress={() => router.push('/admin' as any)}
          >
            <Text style={[styles.butonYazi, { fontSize: 14 }]}>Admin Paneli 🔒</Text>
          </TouchableOpacity>
        </View>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ ...toast, visible: false })}
        />
      </DynamicBackground >
    );
  }

  if (asama === 'menu') {
    return (
      <View style={styles.merkezContainer}>
        <Text style={styles.baslik}>Merhaba {ad} 👋</Text>
        <Text style={styles.bilgi}>Hangi oyunu oynayalım?</Text>

        <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#42A5F5' }]} onPress={() => oyunuBaslat('hafiza')}>
          <Text style={styles.oyunBaslik}>🧠 Çiftini Bul!</Text>
          <Text style={styles.oyunAciklama}>Kartları eşleştir.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#FFA726' }]} onPress={() => oyunuBaslat('siralama')}>
          <Text style={styles.oyunBaslik}>🔢 Sıralama</Text>
          <Text style={styles.oyunAciklama}>Sayıları diz.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#66BB6A' }]} onPress={() => oyunuBaslat('gruplama')}>
          <Text style={styles.oyunBaslik}>🍎 Gruplama</Text>
          <Text style={styles.oyunAciklama}>Meyve mi, Hayvan mı?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#AB47BC' }]} onPress={() => oyunuBaslat('diziyi-tamamla')}>
          <Text style={styles.oyunBaslik}>🧩 Diziyi Tamamla</Text>
          <Text style={styles.oyunAciklama}>Örüntüyü devam ettir!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.buton, { backgroundColor: '#FF5252', marginTop: 20 }]} onPress={cikisYap}>
          <Text style={styles.butonYazi}>Çıkış Yap 🚪</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (asama === 'hafiza') {
    return <HafizaOyunu onGameEnd={oyunuBitir} onExit={cikisYap} />;
  }

  if (asama === 'siralama') {
    return <SiralamaOyunu onGameEnd={oyunuBitir} onExit={cikisYap} />;
  }

  if (asama === 'gruplama') {
    return <GruplamaOyunu onGameEnd={oyunuBitir} onExit={cikisYap} />;
  }

  if (asama === 'diziyi-tamamla') {
    return <DiziyiTamamla onGameEnd={oyunuBitir} />;
  }

  // ... (inside sonuc view)
  if (asama === 'sonuc') {
    return (
      <View style={styles.merkezContainer}>
        <Text style={{ fontSize: 80 }}>🌟</Text>
        <Text style={styles.sonucBaslik}>AFERİN SANA!</Text>
        <Text style={styles.baslik}>{ad}, Harika İş Çıkardın!</Text>
        {yukleniyor && <ActivityIndicator size="small" color="#999" style={{ marginTop: 20 }} />}

        <TouchableOpacity style={styles.buton} onPress={() => setAsama('menu')}>
          <Text style={styles.butonYazi}>Başka Oyun Oyna 🎮</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.buton, { backgroundColor: '#FF5252', marginTop: 15 }]} onPress={cikisYap}>
          <Text style={styles.butonYazi}>Oturumu Kapat 🚪</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  merkezContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#e3f2fd' },
  girisBaslik: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#1565C0', textAlign: 'center' },
  baslik: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  bilgi: { fontSize: 18, marginBottom: 20, color: '#555' },
  input: { width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  buton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, marginTop: 30, width: 220, alignItems: 'center' },
  butonYazi: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  oyunKarti: { width: '100%', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 3 },
  oyunBaslik: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  oyunAciklama: { color: 'white', fontSize: 12 },
  sonucBaslik: { fontSize: 36, fontWeight: 'bold', color: '#e65100', marginVertical: 10 },
});