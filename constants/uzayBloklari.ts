// Uzay Blokları — seslendirilen metinler (klip üretimi + test için tek kaynak).
//
// Çocuk okuma bilmediği için oyunun nasıl oynandığı SESLE anlatılır (Oyun_Test_Listesi #30):
//  - giriş yönergesi mevcut klibi kullanır;
//  - HOW_TO_TEXT geri sayımdan sonra bir kez çalar ve "Tekrar Dinle" düğmesi onu yineler
//    (sürükle-bırak + dokununca dön: ikisi de ekranda yazıyla anlatılamaz);
//  - DEAD_END_TEXT bir tahtada en çok bir kez çalar (kalan parçalar artık sığmayacaksa);
//  - 'Aferin!' her tahta bitince, 'Tebrikler!' üç tahta bitince.

export const INTRO_TEXT = 'Uzay Blokları oyununa hoş geldin! Blokları yerleştirmeme yardım eder misin?';
export const HOW_TO_TEXT = 'Parçayı sürükleyip boşluğa koy! Parçaya dokunursan döner.';
export const DEAD_END_TEXT = 'Sıkıştık! Bir parçayı geri alıp başka yere koyalım.';
export const COMPLETE_TEXT = 'Aferin!';
export const WIN_TEXT = 'Tebrikler!';

/** Oyunun seslendirdiği bütün metinler. */
export const ALL_UZAY_BLOKLARI_KLIPLERI: string[] = [INTRO_TEXT, HOW_TO_TEXT, DEAD_END_TEXT, COMPLETE_TEXT, WIN_TEXT];

/** Yalnız bu oyun için üretilmesi gereken YENİ klipler (diğerleri zaten var). */
export const NEW_UZAY_BLOKLARI_KLIPLERI: string[] = [HOW_TO_TEXT, DEAD_END_TEXT];
