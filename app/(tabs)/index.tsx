import BunuSoyle from '@/components/BunuSoyle';
import CevizMacera from '@/components/CevizMacera';
import DiziyiTamamla from '@/components/DiziyiTamamla';
import DynamicBackground from '@/components/DynamicBackground';
import GruplamaOyunu from '@/components/GruplamaOyunu';
import HafizaOyunu from '@/components/HafizaOyunu';
import KodlamaOyunu from '@/components/KodlamaOyunu';
import SiralamaOyunu from '@/components/SiralamaOyunu';
import { useSound } from '@/components/SoundContext';
import YaraticiCizim from '@/components/YaraticiCizim';
import Toast from '@/components/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const DRAWING_BUCKET = 'cizimler';

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
  const { isMuted, toggleMute } = useSound();
  const [asama, setAsama] = useState('giris');
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
      showToast('L\u00fctfen isim ve ya\u015f giriniz.', 'error');
      return;
    }
    if (!/^\d+$/.test(yas)) {
      showToast('L\u00fctfen ya\u015f alan\u0131na sadece rakam giriniz.', 'error');
      return;
    }
    const yasNum = parseInt(yas);
    if (yasNum < 24 || yasNum > 75) {
      showToast('Ya\u015f 24 ile 75 ay aras\u0131nda olmal\u0131d\u0131r.', 'error');
      return;
    }
    setAsama('menu');
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
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg' },
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
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg' },
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

  const [activeTab, setActiveTab] = useState<'bilissel' | 'sosyal' | 'yaratici'>('bilissel');

  // === EKRANLAR ===
  if (asama === 'giris') {
    return (
      <DynamicBackground>
        <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.merkezContainer}>
          <View style={styles.card}>
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
            <TouchableOpacity style={styles.buton} onPress={girisYap}>
              <Text style={styles.butonYazi}>Giriş Yap 🚀</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buton, { backgroundColor: '#90A4AE', marginTop: 20, paddingVertical: 10 }]}
              onPress={() => router.push('/admin' as any)}
            >
              <Text style={[styles.butonYazi, { fontSize: 14 }]}>Admin Paneli 🔑</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ ...toast, visible: false })}
        />
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
              </>
            )}

            {activeTab === 'sosyal' && (
              <>
                <TouchableOpacity style={[styles.oyunKarti, { backgroundColor: '#795548' }]} onPress={() => oyunuBaslat('ceviz-macera')}>
                  <Ionicons name="leaf" size={40} color="white" style={{ marginBottom: 10 }} />
                  <Text style={styles.oyunBaslik}>Ceviz Macerası</Text>
                  <Text style={styles.oyunAciklama}>Pıtırcık'ın Macerası</Text>
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

  if (asama === 'ceviz-macera') {
    return <CevizMacera onExit={() => setAsama('menu')} userId={ad} userEmail={email} userAge={parseInt(yas)} />;
  }

  if (asama === 'yaratici-cizim') {
    return <YaraticiCizim onGameEnd={oyunuBitir} onExit={() => setAsama('menu')} />;
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
  girisBaslik: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#1565C0', textAlign: 'center' },
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

  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 10, flexWrap: 'wrap' },
  tabButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 2, borderColor: 'transparent' },
  activeTabButton: { backgroundColor: '#FFF', borderColor: '#4CAF50', elevation: 2 },
  tabText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  activeTabText: { color: '#2E7D32' },
});
