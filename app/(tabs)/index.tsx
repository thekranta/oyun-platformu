import React, { useState, useEffect, useRef } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';

// === 1. BURAYA KENDİ GEMINI ANAHTARINIZI YAPIŞTIRIN ===
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAKI5RchgXPPMAhnK7R0_NedukptcoUHeo";
// ======================================================

const SUPABASE_URL = "https://rcphrqnrkcntuluwkmzg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGhycW5ya2NudHVsdXdrbXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjI0NTUsImV4cCI6MjA3OTMzODQ1NX0.BR7elCLuxZR5ns1kTb_NKPm6Q4-repiaWwMaxuhEg8E";

// OYUN VERİLERİ
const HAFIZA_KARTLARI = ['🐶', '🐱', '🐭', '🐹', '🐶', '🐱', '🐭', '🐹'];
const SIRALAMA_SAYILARI = [1, 2, 3, 4, 5]; 

// GRUPLAMA OYUNU VERİLERİ
const GRUPLAMA_SORULARI = [
  { nesne: '🍎', kategori: 'Meyve' },
  { nesne: '🐶', kategori: 'Hayvan' },
  { nesne: '🍌', kategori: 'Meyve' },
  { nesne: '🐱', kategori: 'Hayvan' },
  { nesne: '🍇', kategori: 'Meyve' },
  { nesne: '🐭', kategori: 'Hayvan' },
];

export default function App() {
  const [asama, setAsama] = useState('giris'); 
  const [secilenOyun, setSecilenOyun] = useState('');
  const [ad, setAd] = useState('');
  const [yas, setYas] = useState('');

  // ORTAK STATE'LER
  const [hamle, setHamle] = useState(0);      
  const [hataSayisi, setHataSayisi] = useState(0); 
  const [yukleniyor, setYukleniyor] = useState(false);
  const baslangicZamani = useRef(null);

  // HAFIZA STATE
  const [kartlar, setKartlar] = useState([]);
  const [secilenler, setSecilenler] = useState([]);
  const [eslesenler, setEslesenler] = useState([]);

  // SIRALAMA STATE
  const [karisikSayilar, setKarisikSayilar] = useState([]);
  const [beklenenSayi, setBeklenenSayi] = useState(1);

  // GRUPLAMA STATE (YENİ)
  const [suankiSoruIndex, setSuankiSoruIndex] = useState(0);
  const [dogruSayisi, setDogruSayisi] = useState(0);

  const girisYap = () => {
    if (ad.trim() === '' || yas.trim() === '') {
      alert("Lütfen isim ve yaş giriniz.");
      return;
    }
    setAsama('menu');
  };

  const oyunuBaslat = (oyunTipi) => {
    setSecilenOyun(oyunTipi);
    setYukleniyor(false);
    setHamle(0);
    setHataSayisi(0);
    baslangicZamani.current = new Date();

    if (oyunTipi === 'hafiza') {
      const karisik = [...HAFIZA_KARTLARI].sort(() => Math.random() - 0.5)
        .map((emoji, index) => ({ id: index, emoji, acik: false }));
      setKartlar(karisik);
      setSecilenler([]);
      setEslesenler([]);
      setAsama('hafiza');
    } 
    else if (oyunTipi === 'siralama') {
      const karisik = [...SIRALAMA_SAYILARI].sort(() => Math.random() - 0.5)
        .map((sayi, index) => ({ id: index, sayi, tiklandi: false }));
      setKarisikSayilar(karisik);
      setBeklenenSayi(1);
      setAsama('siralama');
    }
    else if (oyunTipi === 'gruplama') {
      // Soruları karıştır
      GRUPLAMA_SORULARI.sort(() => Math.random() - 0.5);
      setSuankiSoruIndex(0);
      setDogruSayisi(0);
      setAsama('gruplama');
    }
  };

  // === HAFIZA MANTIĞI ===
  const kartSec = (index) => {
    if (secilenler.length === 2 || eslesenler.includes(index)) return;
    if (kartlar[index].acik) return;

    const yeniKartlar = [...kartlar];
    yeniKartlar[index].acik = true;
    setKartlar(yeniKartlar);
    const yeniSecilenler = [...secilenler, { index, emoji: kartlar[index].emoji }];
    setSecilenler(yeniSecilenler);

    if (yeniSecilenler.length === 2) {
      const yeniHamle = hamle + 1;
      setHamle(yeniHamle);
      
      if (yeniSecilenler[0].emoji === yeniSecilenler[1].emoji) {
        const yeniEslesenler = [...eslesenler, yeniSecilenler[0].index, yeniSecilenler[1].index];
        setEslesenler(yeniEslesenler);
        setSecilenler([]);
        if (yeniEslesenler.length === HAFIZA_KARTLARI.length) oyunuBitir(yeniHamle, hataSayisi);
      } else {
        const yeniHata = hataSayisi + 1;
        setHataSayisi(yeniHata);
        setTimeout(() => {
          const resetKartlar = [...kartlar];
          if (resetKartlar[yeniSecilenler[0].index]) resetKartlar[yeniSecilenler[0].index].acik = false;
          if (resetKartlar[yeniSecilenler[1].index]) resetKartlar[yeniSecilenler[1].index].acik = false;
          setKartlar(resetKartlar);
          setSecilenler([]);
        }, 1000);
      }
    }
  };

  // === SIRALAMA MANTIĞI ===
  const sayiSec = (index, sayi) => {
    if (karisikSayilar[index].tiklandi) return;
    const yeniHamle = hamle + 1;
    setHamle(yeniHamle);

    if (sayi === beklenenSayi) {
      const yeniSayilar = [...karisikSayilar];
      yeniSayilar[index].tiklandi = true;
      setKarisikSayilar(yeniSayilar);
      if (beklenenSayi === 5) oyunuBitir(yeniHamle, hataSayisi);
      else setBeklenenSayi(b => b + 1);
    } else {
      const yeniHata = hataSayisi + 1;
      setHataSayisi(yeniHata);
      alert("Dikkat! Sıradaki sayı bu değil.");
    }
  };

  // === GRUPLAMA MANTIĞI (YENİ) ===
  const kategoriSec = (secilenKategori) => {
    const mevcutSoru = GRUPLAMA_SORULARI[suankiSoruIndex];
    const yeniHamle = hamle + 1;
    setHamle(yeniHamle);

    if (secilenKategori === mevcutSoru.kategori) {
      // Doğru
      const yeniDogru = dogruSayisi + 1;
      setDogruSayisi(yeniDogru);
      
      if (suankiSoruIndex + 1 < GRUPLAMA_SORULARI.length) {
        setSuankiSoruIndex(i => i + 1);
      } else {
        oyunuBitir(yeniHamle, hataSayisi);
      }
    } else {
      // Yanlış
      const yeniHata = hataSayisi + 1;
      setHataSayisi(yeniHata);
      alert("Yanlış kutu! Tekrar dene.");
    }
  };

  // === BİTİŞ ===
  const oyunuBitir = (finalHamle, finalHata) => {
    const bitisZamani = new Date();
    const sure = Math.round((bitisZamani - baslangicZamani.current) / 1000);
    setAsama('sonuc');
    sessizceAnalizEtVeKaydet(sure, finalHamle, finalHata);
  };

  const sessizceAnalizEtVeKaydet = async (sure, finalHamle, finalHata) => {
    setYukleniyor(true);
    
    let oyunAdiTR = '';
    let analizPrompt = '';

    if (secilenOyun === 'hafiza') {
      oyunAdiTR = 'Hafıza Kartları';
      analizPrompt = 'Görsel bellek ve dikkat';
    } else if (secilenOyun === 'siralama') {
      oyunAdiTR = 'Sayı Sıralama';
      analizPrompt = 'Sayısal algı ve sıralama becerisi';
    } else {
      oyunAdiTR = 'Gruplama (Kategorizasyon)';
      analizPrompt = 'Kavram bilgisi ve soyut düşünme (Meyve/Hayvan ayrımı)';
    }
    
    const prompt = `
      Öğrenci (${yas} ay): ${oyunAdiTR} oyununu oynadı.
      Toplam Süre: ${sure} saniye.
      Toplam Hamle: ${finalHamle}.
      Yapılan Hata: ${finalHata}.
      GÖREV: Çocuğun ${analizPrompt} performansı hakkında öğretmene hitaben 1-2 cümlelik akademik Türkçe değerlendirme yap.
    `;

    let yapayZekaYorumu = "Yorum alınamadı";

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        yapayZekaYorumu = data.candidates[0].content.parts[0].text;
      }
    } catch (error) {
      console.log("AI Hatası:", error);
    }

    try {
      const kayitVerisi = {
        oyun_turu: secilenOyun,
        hamle_sayisi: finalHamle,
        hata_sayisi: finalHata,
        yapay_zeka_yorumu: yapayZekaYorumu,
        ogrenci_adi: ad,
        ogrenci_yasi: parseInt(yas)
      };

      await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(kayitVerisi)
      });
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
        <TextInput style={styles.input} placeholder="Yaş (Ay)" value={yas} onChangeText={setYas} keyboardType="numeric"/>
        <TouchableOpacity style={styles.buton} onPress={girisYap}><Text style={styles.butonYazi}>Giriş Yap 🚀</Text></TouchableOpacity>
      </View>
    );
  }

  if (asama === 'menu') {
    return (
      <View style={styles.merkezContainer}>
        <Text style={styles.baslik}>Merhaba {ad} 👋</Text>
        <Text style={styles.bilgi}>Hangi oyunu oynayalım?</Text>
        
        <TouchableOpacity style={[styles.oyunKarti, {backgroundColor: '#42A5F5'}]} onPress={() => oyunuBaslat('hafiza')}>
          <Text style={styles.oyunBaslik}>🧠 Hafıza</Text>
          <Text style={styles.oyunAciklama}>Kartları eşleştir.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.oyunKarti, {backgroundColor: '#FFA726'}]} onPress={() => oyunuBaslat('siralama')}>
          <Text style={styles.oyunBaslik}>🔢 Sıralama</Text>
          <Text style={styles.oyunAciklama}>Sayıları diz.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.oyunKarti, {backgroundColor: '#66BB6A'}]} onPress={() => oyunuBaslat('gruplama')}>
          <Text style={styles.oyunBaslik}>🍎 Gruplama</Text>
          <Text style={styles.oyunAciklama}>Meyve mi, Hayvan mı?</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (asama === 'hafiza') {
    return (
      <ScrollView contentContainerStyle={styles.oyunContainer}>
        <View style={styles.header}><Text style={styles.baslik}>🧠 Hafıza</Text></View>
        <View style={styles.oyunAlani}>
          {kartlar.map((kart, index) => (
            <TouchableOpacity key={index} style={[styles.kart, (kart.acik || eslesenler.includes(index)) ? styles.kartAcik : styles.kartKapali]} onPress={() => kartSec(index)}>
              <Text style={styles.emoji}>{(kart.acik || eslesenler.includes(index)) ? kart.emoji : '❓'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (asama === 'siralama') {
    return (
      <ScrollView contentContainerStyle={styles.oyunContainer}>
        <View style={styles.header}><Text style={styles.baslik}>🔢 Sıralama</Text></View>
        <Text style={styles.bilgi}>Sıradaki: {beklenenSayi}</Text>
        <View style={styles.oyunAlani}>
          {karisikSayilar.map((item, index) => (
            <TouchableOpacity key={index} style={[styles.sayiKutu, item.tiklandi ? styles.sayiSecildi : styles.sayiSecilmedi]} onPress={() => sayiSec(index, item.sayi)} disabled={item.tiklandi}>
              <Text style={styles.sayiYazi}>{item.sayi}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // YENİ OYUN EKRANI: GRUPLAMA
  if (asama === 'gruplama') {
    const soru = GRUPLAMA_SORULARI[suankiSoruIndex];
    return (
      <View style={styles.merkezContainer}>
        <View style={styles.header}><Text style={styles.baslik}>🍎 Gruplama</Text></View>
        <Text style={styles.bilgi}>Bu nesne hangisi?</Text>
        
        {/* Ortadaki Nesne */}
        <View style={styles.buyukNesneKutusu}>
          <Text style={{fontSize: 80}}>{soru.nesne}</Text>
        </View>

        {/* Şıklar */}
        <View style={styles.secenekContainer}>
          <TouchableOpacity style={[styles.secenekButon, {backgroundColor: '#EF5350'}]} onPress={() => kategoriSec('Meyve')}>
            <Text style={styles.secenekYazi}>🍎 Meyve</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secenekButon, {backgroundColor: '#8D6E63'}]} onPress={() => kategoriSec('Hayvan')}>
            <Text style={styles.secenekYazi}>🐶 Hayvan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (asama === 'sonuc') {
    return (
      <View style={styles.merkezContainer}>
        <Text style={{fontSize: 80}}>🌟</Text>
        <Text style={styles.sonucBaslik}>AFERİN SANA!</Text>
        <Text style={styles.baslik}>{ad}, Harika İş Çıkardın!</Text>
        {yukleniyor && <ActivityIndicator size="small" color="#999" style={{marginTop: 20}} />}
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
  oyunContainer: { flexGrow: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#fff' },
  header: { marginBottom: 20 },
  girisBaslik: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#1565C0', textAlign: 'center' },
  baslik: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  bilgi: { fontSize: 18, marginBottom: 20, color: '#555' },
  input: { width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  buton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, marginTop: 30, width: 220, alignItems: 'center' },
  butonYazi: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  oyunKarti: { width: '100%', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 3 },
  oyunBaslik: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  oyunAciklama: { color: 'white', fontSize: 12 },
  oyunAlani: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 320 },
  kart: { width: 70, height: 70, margin: 5, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  kartKapali: { backgroundColor: '#2196F3' },
  kartAcik: { backgroundColor: 'white', borderWidth: 2, borderColor: '#2196F3' },
  emoji: { fontSize: 32 },
  sayiKutu: { width: 60, height: 60, margin: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 30, borderWidth: 2 },
  sayiSecilmedi: { backgroundColor: 'white', borderColor: '#FFA726' },
  sayiSecildi: { backgroundColor: '#ddd', borderColor: '#ccc' },
  sayiYazi: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  sonucBaslik: { fontSize: 36, fontWeight: 'bold', color: '#e65100', marginVertical: 10 },
  buyukNesneKutusu: { width: 150, height: 150, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom: 40, elevation: 5 },
  secenekContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  secenekButon: { flex: 0.48, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3 },
  secenekYazi: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});