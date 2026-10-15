// Minik Müze "Tablo Yapbozu" sesli metinleri. Her biri için VoiceBox klibi üretilir (slug = metin; bkz. allMuseumTexts).
// "Yanlış yer" ve "yardım" cümleleri Detay Avı ile ortaktır (constants/minikMuzeHunt.ts: HUNT_WRONG, HUNT_HELP);
// parça yerine oturunca mevcut "Aferin!" klibi kullanılır. Metinler 3-6 yaş için KISA ve rakamsızdır.

export const PUZZLE_INTRO = 'Tablonun parçalarını yerine koy! Önce bir parçaya, sonra yerine dokun.';
export const PUZZLE_HARDER = 'Şimdi daha çok parçalı bir yapboz deneyelim!';
export const PUZZLE_DONE = 'Harika! Tabloyu tamamladın. Çok güzel oldu!';

/** Yapbozda okunacak yeni metinler (üretim listesi + test için). */
export const allPuzzleTexts = (): string[] => [PUZZLE_INTRO, PUZZLE_HARDER, PUZZLE_DONE];
