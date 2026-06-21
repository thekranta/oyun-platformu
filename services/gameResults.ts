import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { slugifyName } from '../lib/menuHelpers';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const DRAWING_BUCKET = 'cizimler';

export interface GameResultExtraData {
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
}

export interface SaveGameResultParams {
  oyunAdi: string;
  sure: number;
  finalHamle: number;
  finalHata: number;
  algilananKelime?: string;
  extraData?: GameResultExtraData;
  ad: string;
  yas: string;
  email: string;
}

/**
 * Oyun sonucunu (ve varsa cizimi) Supabase'e kaydeder.
 * UI state'inden bagimsizdir; cagiran taraf yukleniyor gostergesini yonetir.
 */
export async function saveGameResult({
  oyunAdi,
  sure,
  finalHamle,
  finalHata,
  algilananKelime,
  extraData,
  ad,
  yas,
  email,
}: SaveGameResultParams): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authToken = sessionData.session?.access_token || SUPABASE_KEY || '';

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
        Authorization: `Bearer ${authToken}`,
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
      // Sihirli Tuval specific column
      visual_attention_score: extraData?.visual_attention_score ?? null,
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
        Authorization: `Bearer ${authToken}`,
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
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(kayitVerisiCizimsiz),
        });
      }
      if (responseText.includes("Could not find the 'email' column")) {
        const { email: _email, ...kayitVerisiEmailsiz } = kayitVerisi;
        supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY || '',
            Authorization: `Bearer ${authToken}`,
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
  }
}
