// Yıldız Çerçevesi (onluk-cerceve-2): her tur başında hedef sayı sesle söylenir ("Altı yıldız koy!"; test listesi 15-K1).
// Çocuk rakamı okuyamasa da kaç yıldız koyacağını duyar. Cümleler önceden üretilmiş kliplerdir (lib/ttsAssets.ts);
// hedef aralığı genişlerse ve klip eklenmezse lib/yildizCercevesiKlipleri.test.ts kırılır (klipsiz tur sessiz kalmasın).

/** Söylenen sayı sözcükleri (rakam TTS'te bozuk okunabildiği için sözcükle). */
export const TARGET_WORDS: Record<number, string> = {
    1: 'Bir', 2: 'İki', 3: 'Üç', 4: 'Dört', 5: 'Beş',
    6: 'Altı', 7: 'Yedi', 8: 'Sekiz', 9: 'Dokuz', 10: 'On',
};

/** "<Sayı> <nesne> koy!" (ör. 'Altı yıldız koy!'). */
export function targetPhrase(n: number, word: string): string {
    return `${TARGET_WORDS[n] ?? String(n)} ${word} koy!`;
}
