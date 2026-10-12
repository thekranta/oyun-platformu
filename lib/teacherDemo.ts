// Öğretmen paneli SATIŞ DEMOSU verisi (teacherId === 'demo-teacher'): sunucu çağrısı yok, hepsi uydurma.
// Tutarlılık kuralları (testli, bkz. lib/teacherDemo.test.ts):
//   * sınıf kartındaki çocuk sayısı = o sınıfın öğrenci listesinin uzunluğu;
//   * her öğrencinin "🎮 N" oyun sayısı = geçmişte görünen kayıt sayısı (en çok 20, gerçek panelle aynı sınır);
//   * geçmiş yeterince uzun/çeşitli: hata dağılımı grafiği (≥3 kayıt) görünür.

export interface DemoClass { id: string; name: string; emoji: string; size: number }
export interface DemoStudent { id: string; child_name: string; child_age_months: number; email: string; gameCount: number }
export interface DemoScore {
    id: number;
    created_at: string;
    oyun_turu: string;
    hamle_sayisi: number;
    hata_sayisi: number;
    sure: number;
    correct_answers: number;
}

export const DEMO_CLASSES: DemoClass[] = [
    { id: 'demo-class-1', name: 'Papatyalar', emoji: '🌸', size: 12 },
    { id: 'demo-class-2', name: 'Kelebekler', emoji: '🦋', size: 8 },
    { id: 'demo-class-3', name: 'Yıldızlar', emoji: '⭐', size: 15 },
];

const NAMES = [
    'Ahmet Yılmaz', 'Ayşe Demir', 'Mehmet Kaya', 'Zeynep Şahin', 'Elif Çelik', 'Mert Aydın', 'Defne Arslan',
    'Kerem Doğan', 'Ada Kılıç', 'Yusuf Aslan', 'Nehir Polat', 'Emir Koç', 'Asya Kurt', 'Berat Özdemir',
    'Ecrin Yıldız', 'Kaan Erdem', 'Melis Güneş', 'Alp Aksoy', 'İpek Tunç', 'Çınar Bulut', 'Su Karaca',
    'Ege Yalçın', 'Mira Taş', 'Deniz Özkan', 'Lina Avcı', 'Arda Korkmaz', 'Nil Uçar', 'Bora Sezer',
    'Hira Türk', 'Tuna Alkan', 'Beren Işık', 'Eymen Çakır', 'Duru Önal', 'Atlas Bayram', 'Lara Eren',
];

// Geçmişte görünecek oyunlar (katalogdaki gerçek oyun kimlikleri; adları maarifMap'ten gelir).
const GAMES = ['hafiza-2', 'siralama', 'eksik-sayi-bul', 'ilk-harf', 'duygu-yuzleri', 'yapboz', 'diziyi-tamamla-3', 'davul-ustasi'];

/** Küçük, deterministik sözde rastgele sayı üreteci (aynı tohum = aynı demo). */
function rng(seed: number): () => number {
    let s = (seed * 9301 + 49297) % 233280;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

function slugEmail(name: string): string {
    const map: Record<string, string> = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'İ': 'i' };
    const ascii = name.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (c) => map[c] || c).replace(/\s+/g, '.');
    return ascii + '@ornek.com';
}

/** Bir demo sınıfının öğrenci listesi; boyutu DEMO_CLASSES'taki size ile aynıdır. */
export function demoRoster(classId: string): DemoStudent[] {
    let offset = 0;
    for (const c of DEMO_CLASSES) {
        if (c.id === classId) {
            return Array.from({ length: c.size }, (_, k) => {
                const i = offset + k;
                const r = rng(i + 3);
                return {
                    id: 'demo-s-' + i,
                    child_name: NAMES[i % NAMES.length],
                    child_age_months: 40 + ((i * 7) % 27),
                    email: slugEmail(NAMES[i % NAMES.length]),
                    gameCount: 5 + Math.floor(r() * 14),
                };
            });
        }
        offset += c.size;
    }
    return [];
}

/** Tüm demo sınıflarındaki toplam oyun sayısı (üstteki "Oyun" sayacı için). */
export function demoTotalGames(): number {
    return DEMO_CLASSES.reduce((sum, c) => sum + demoRoster(c.id).reduce((s, st) => s + st.gameCount, 0), 0);
}

/** Bir öğrencinin oyun geçmişi: kayıt sayısı = gameCount (en çok 20), en yeni başta. */
export function demoScores(student: Pick<DemoStudent, 'id' | 'gameCount'>, now: number = Date.now()): DemoScore[] {
    const n = Math.min(Math.max(student.gameCount, 0), 20);
    const seed = Number(String(student.id).replace(/\D/g, '')) || 1;
    const r = rng(seed + 11);
    const errMax = 1 + (seed % 4);     // öğrenci başına farklı zorlanma düzeyi: bazıları neredeyse hatasız, bazıları desteğe açık
    return Array.from({ length: n }, (_, k) => {
        const hata = Math.floor(r() * (errMax + 1));
        return {
            id: seed * 100 + k,
            created_at: new Date(now - Math.floor((k * 14) / Math.max(n, 1)) * 86400000 - k * 3600000).toISOString(),
            oyun_turu: GAMES[(seed + k * 3) % GAMES.length],
            hamle_sayisi: 8 + Math.floor(r() * 13),
            hata_sayisi: hata,
            sure: 25 + Math.floor(r() * 90),
            correct_answers: Math.max(0, 10 - hata),
        };
    });
}

/** "Öğrenci Ekle" demosu: ağ çağrısı yapılmaz, yazılan e-posta için sabit bir çocuk önizlemesi döner. */
export function demoPreview(email: string): { child_name: string; child_age_months: number; email: string } {
    return { child_name: 'Elif Demir', child_age_months: 50, email: email.trim() };
}

/** "AI Analiz" demosu: oturum/sunucu gerekmez; sonuca göre kısa, gerçekçi bir pedagojik yorum. */
export function demoAnalysis(childName: string | undefined, score: { hamle_sayisi: number; hata_sayisi: number; sure?: number }): string {
    const first = (childName || 'Çocuk').trim().split(/\s+/)[0] || 'Çocuk';
    const sure = score.sure && score.sure > 0 ? score.sure + ' saniyede' : 'kısa sürede';
    if (score.hata_sayisi <= 1) {
        return first + ' bu oyunu ' + sure + ' ve çok az hatayla tamamladı. Dikkatini sürdürme ve kuralı uygulama becerisi yaşına göre güçlü görünüyor. '
            + 'Bir sonraki adımda biraz daha zorlayıcı bir seviye sunmak merakını ve özgüvenini destekleyebilir.';
    }
    if (score.hata_sayisi <= 3) {
        return first + ' oyunu ' + sure + ' tamamladı; birkaç yanlışı kendi başına düzeltti. Dikkat ve deneme-yanılma becerisi gelişiyor. '
            + 'Aynı oyunu birkaç gün tekrar oynatmak ve doğru seçimlerini sözlü olarak pekiştirmek faydalı olur.';
    }
    return first + ' bu oyunda zorlandı ve ' + score.hata_sayisi + ' hata yaptı. Bu, yeni bir beceriyle tanışırken beklenen bir durumdur. '
        + 'Kısa oturumlarla, önce kolay örneklerden başlayarak ve yönergeyi birlikte tekrar ederek ilerlemek önerilir.';
}
