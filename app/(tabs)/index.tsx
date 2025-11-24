import GruplamaOyunu from '@/components/GruplamaOyunu';
import HafizaOyunu from '@/components/HafizaOyunu';
import SiralamaOyunu from '@/components/SiralamaOyunu';
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
  const [asama, setAsama] = useState('giris');
  const [secilenOyun, setSecilenOyun] = useState('');
  const [ad, setAd] = useState('');
  const [yas, setYas] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const girisYap = () => {
    if (ad.trim() === '' || yas.trim() === '') {
      alert("Lütfen isim ve yaş giriniz.");
      return;
    }
    if (!/^\d+$/.test(yas)) {
      alert("Lütfen yaş alanına sadece rakam giriniz.");
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

  const sessizceAnalizEtVeKaydet = async (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => {
    setYukleniyor(true);

    let oyunAdiTR = '';
    let analizPrompt = '';

    if (oyunAdi === 'hafiza') {
      oyunAdiTR = 'Hafıza Kartları';
      analizPrompt = 'Görsel bellek ve dikkat';
    } else if (oyunAdi === 'siralama') {
      oyunAdiTR = 'Sayı Sıralama';
      analizPrompt = 'Sayısal algı ve sıralama becerisi';
    } else {
      oyunAdiTR = 'Gruplama (Kategorizasyon)';
      analizPrompt = 'Kavram bilgisi ve soyut düşünme (Meyve/Hayvan ayrımı)';
    }

    const prompt = `
      Sen bir okul öncesi eğitim uzmanısın. Aşağıdaki verilere göre çocuğun gelişimini değerlendir.
      
      Öğrenci: ${ad} (${yas} yaşında)
      Oyun: ${oyunAdi}
      
      Performans Verileri (5 Aşamalı Kümülatif Toplam):
      - Toplam Süre: ${sure} saniye
      - Toplam Hamle: ${finalHamle}
      - Toplam Hata: ${finalHata}
      
      Lütfen çocuğun dikkat, hafıza veya mantık becerileri hakkında yapıcı, motive edici ve ebeveyne yönelik kısa bir yorum yaz.
      Bu verilerin 5 farklı zorluk seviyesinin toplamı olduğunu unutma, yani süre ve hamle sayıları tek bir oyun için değil, tüm oturum içindir.
      Çocuğun odaklanma süresini ve hata oranını (Hata/Hamle) dikkate al.
    `;

    let yapayZekaYorumu = "Yorum alınamadı";

    try {
      if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY eksik!");
        return;
      }

      console.log("AI İsteği Gönderiliyor... (Model: gemini-2.0-flash)", { oyun: oyunAdiTR, sure, hamle: finalHamle, hata: finalHata });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );

      const data = await response.json();
      console.log("AI Yanıtı:", JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates.length > 0) {
        yapayZekaYorumu = data.candidates[0].content.parts[0].text;
        console.log("Yorum Alındı:", yapayZekaYorumu);
      } else {
        console.warn("AI Yanıtında aday yok:", data);
      }
    } catch (error) {
      console.error("AI Hatası:", error);
    }

    try {
      const kayitVerisi = {
        oyun_turu: oyunAdi,
        hamle_sayisi: finalHamle,
        hata_sayisi: finalHata,
        yapay_zeka_yorumu: yapayZekaYorumu,
        ogrenci_adi: ad,
        ogrenci_yasi: parseInt(yas)
      };

      console.log("SUPABASE URL:", SUPABASE_URL);
      console.log("SUPABASE KEY:", SUPABASE_KEY ? "Mevcut (Gizli)" : "Eksik!");
      console.log("Supabase Request Body:", JSON.stringify(kayitVerisi, null, 2));

      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(kayitVerisi)
      });

      console.log("Supabase Response Status:", supabaseResponse.status);
      const responseText = await supabaseResponse.text();
      console.log("Supabase Response:", responseText);

      if (!supabaseResponse.ok) {
        throw new Error(`Supabase Hatası: ${supabaseResponse.status} - ${responseText}`);
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
      <View style={styles.merkezContainer}>
        <Text style={styles.girisBaslik}>🎓 Okul Öncesi Akademi</Text>
        <TextInput style={styles.input} placeholder="İsim (Örn: Ali)" value={ad} onChangeText={setAd} />
        <TextInput style={styles.input} placeholder="Yaş (Ay)" value={yas} onChangeText={setYas} keyboardType="numeric" />
        <TouchableOpacity style={styles.buton} onPress={girisYap}><Text style={styles.butonYazi}>Giriş Yap 🚀</Text></TouchableOpacity>
      </View>
    );
  }

  if (asama === 'menu') {
    return (
      <View style={styles.merkezContainer}>
        <Text style={styles.baslik}>Merhaba {ad} 👋</Text>
        <Text style={styles.bilgi}>Hangi oyunu oynayalım?</Text>

        <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#42A5F5' }]} onPress={() => oyunuBaslat('hafiza')}>
          <Text style={styles.oyunBaslik}>🧠 Hafıza</Text>
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
      </View>
    );
  }

  if (asama === 'hafiza') {
    return <HafizaOyunu onGameEnd={oyunuBitir} />;
  }

  if (asama === 'siralama') {
    return <SiralamaOyunu onGameEnd={oyunuBitir} />;
  }

  if (asama === 'gruplama') {
    return <GruplamaOyunu onGameEnd={oyunuBitir} />;
  }

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