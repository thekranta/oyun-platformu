// Sihirli Şişeler — seslendirilen metinler (klip üretimi + test için tek kaynak).
//
// Çocuk okuma bilmediği için oyunun nasıl oynandığı SESLE anlatılır (Oyun_Test_Listesi #59):
//  - giriş yönergesi mevcut klibi kullanır;
//  - HOW_TO_TEXT geri sayımdan sonra bir kez çalar (iki dokunuşlu mekanik: önce şişe, sonra hedef);
//  - INVALID_TEXT ilk geçersiz hamlede bir kez çalar (her seferinde tekrar yorar);
//  - 'Aferin!' şişe tamamlanınca, 'Tebrikler!' bulmaca bitince.

export const INTRO_TEXT = 'Sihirli Şişeler oyununa hoş geldin! Aynı renk sıvıları birleştir!';
export const HOW_TO_TEXT = 'Bir şişeye dokun, sonra sıvıyı dökmek istediğin şişeye dokun.';
export const INVALID_TEXT = 'Olmadı. Aynı renge ya da boş şişeye dökebilirsin.';
export const COMPLETE_TEXT = 'Aferin!';
export const WIN_TEXT = 'Tebrikler!';

/** Oyunun seslendirdiği bütün metinler. */
export const ALL_SIHIRLI_SISELER_KLIPLERI: string[] = [INTRO_TEXT, HOW_TO_TEXT, INVALID_TEXT, COMPLETE_TEXT, WIN_TEXT];

/** Yalnız bu oyun için üretilmesi gereken YENİ klipler (diğerleri zaten var). */
export const NEW_SIHIRLI_SISELER_KLIPLERI: string[] = [HOW_TO_TEXT, INVALID_TEXT];
