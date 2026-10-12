// Öğretmen paneli SATIŞ DEMOSU verisi (teacherId === 'demo-teacher'): sunucu çağrısı yok, hepsi uydurma.
// Tutarlılık kuralları (testli, bkz. lib/teacherDemo.test.ts):
//   * sınıf kartındaki çocuk sayısı = o sınıfın öğrenci listesinin uzunluğu;
//   * her öğrencinin "🎮 N" oyun sayısı = geçmişte görünen kayıt sayısı (en çok 20, gerçek panelle aynı sınır);
//   * geçmiş yeterince uzun/çeşitli: hata dağılımı grafiği (≥3 kayıt) görünür.

import { gameStats, selectSummaryGames } from './teacherSummary';

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

/** "Gelişim Özeti" demosu: oturum/sunucu gerekmez; öğrencinin gerçek (demo) geçmişinden hesaplanan kısa özet. */
export function demoSummary(scores: DemoScore[]): string {
    const stats = gameStats(selectSummaryGames(scores));
    const best = stats[0];
    const weak = stats.length > 1 ? stats[stats.length - 1] : null;
    const n = Math.min(scores.length, 12);
    const half = Math.floor(n / 2);
    const recent = scores.slice(0, half), earlier = scores.slice(half, n);
    const avg = (a: DemoScore[]) => (a.length ? a.reduce((x, g) => x + g.hata_sayisi, 0) / a.length : 0);
    const trend = avg(recent) < avg(earlier) - 0.2 ? 'Son oyunlarda hata sayısı ilk oyunlara göre azalıyor; gelişim yönü olumlu.'
        : avg(recent) > avg(earlier) + 0.2 ? 'Son oyunlarda hata sayısı biraz artmış; yeni ve daha zor içerikle karşılaşmış olabilir.'
            : 'Hata düzeyi oyunlar boyunca dengeli seyrediyor.';
    return 'Genel görünüm: Son ' + n + ' oyun birlikte değerlendirildi. ' + trend + '\n'
        + 'Güçlü yönler: ' + best.name + ' oyununda en az hatayı yapıyor (' + best.area + ', ' + best.code + '). Kuralı anlama ve dikkatini sürdürme becerisi bu alanda belirgin.\n'
        + 'Desteklenecek alanlar: ' + (weak ? weak.name + ' (' + weak.area + ', ' + weak.code + ') oyununda daha çok yanlış yapıyor; bu alan kısa tekrarlarla desteklenebilir.' : 'Daha fazla oyun çeşidi denendikçe destek gerektiren alanlar netleşecek.') + '\n'
        + 'Sınıfta öneriler: ' + (weak ? weak.area + ' alanında 5-10 dakikalık küçük grup etkinliği; ' : '') + 'çocuğun güçlü olduğu oyunu arkadaşına anlatmasını isteme; haftalık kısa tekrar oyunu.';
}
