import { buildWeeklyReportHTML, WeeklyReportData } from './weeklyReport';

const sample: WeeklyReportData = {
    childName: 'Deniz',
    childAge: 54,
    ageLabel: '54 aylık',
    period: 'haftalık',
    rangeLabel: '13 Eylül – 19 Eylül 2026',
    generatedLabel: '19 Eylül 2026',
    gamesCount: 3,
    activeDays: 2,
    totalMinutes: 12,
    avgSuccess: 70,
    hasWeekData: true,
    sourceCount: 3,
    skillAreas: [],
    topGames: [],
    dimensions: [],
    dailyActivity: [{ label: 'Pzt', count: 1 }],
    strengths: [],
    homeActivities: [],
    encouragingMessage: 'Harika gidiyorsun!',
    highlight: { emoji: '⭐', title: 'Başlık', description: 'Açıklama' },
    maarifNote: '',
    aiNote: null,
};

const rich: WeeklyReportData = {
    ...sample,
    skillAreas: [{ area: 'Matematik', count: 4, pct: 100, codes: ['MAB.2', 'MAB.5'] }],
    topGames: [{ key: 'hafiza', name: 'Hafıza Oyunu', emoji: '🧠', count: 3, success: 80 }],
    dimensions: [{ label: 'Dikkat', value: 72 }],
    strengths: ['Dikkat alanında güçlü performans gösteriyor!'],
    homeActivities: [{ title: 'Eşya Sayma Oyunu', description: 'Mutfakta kaşıkları sayın.', emoji: '🥄', duration: '10 dk' }],
    aiNote: 'Bu haftaki çalışmalar dikkat becerisini destekledi.',
};

describe('buildWeeklyReportHTML — öğretmen paylaşımı', () => {
    const html = buildWeeklyReportHTML(rich, true, 'teacher');

    it('öğretmene yönelik başlık ve etiketi taşır', () => {
        expect(html).toContain('Öğretmen İçin Gelişim Özeti');
        expect(html).toContain('Veli Paylaşımı');
        expect(html).not.toContain('Haftalık Gelişim Raporu');
    });

    it('Maarif alanlarını + kodlarını, gelişim profilini, oyunları ve güçlü yönleri içerir', () => {
        expect(html).toContain('Maarif Modeli');
        expect(html).toContain('MAB.2');
        expect(html).toContain('Gelişim Profili');
        expect(html).toContain('Hafıza Oyunu');
        expect(html).toContain('Güçlü Yönler');
    });

    it('veliye dönük içeriği (evde etkinlik, AI notu, teşvik, öne çıkan kutu) dışarıda bırakır', () => {
        expect(html).not.toContain('Evde Ne Yapabilirsiniz');
        expect(html).not.toContain('Eşya Sayma Oyunu');
        expect(html).not.toContain('Uzman Değerlendirme Notu');
        expect(html).not.toContain('Bu haftaki çalışmalar dikkat becerisini');
        expect(html).not.toContain('Harika gidiyorsun');
        expect(html).not.toContain('class="hl"');
        expect(html).not.toContain('class="encourage"');
    });

    it('paylaşım/gizlilik notunu ekler; "Premium" ya da kilitli bölüm içermez', () => {
        expect(html).toContain('Paylaşım Notu');
        expect(html).toContain('velinin izni olmadan');
        // Başarı yüzdeleri raporda var (tek oynanan oyunda yüzde o oturumun skorudur) → "ham skor yok" denemez.
        expect(html).toContain('başarı yüzdeleri');
        expect(html).toContain('oturum bazlı ayrıntılı kayıt');
        expect(html).not.toContain('ham skor');
        expect(html).not.toContain('Premium');
        expect(html).not.toContain('Filiz ve Üzeri Paketlerde');
    });

    it('premium=false verilse bile öğretmen özeti tam ayrıntıyı gösterir (erişimi çağıran kısıtlar)', () => {
        const locked = buildWeeklyReportHTML(rich, false, 'teacher');
        expect(locked).toContain('MAB.2');
        expect(locked).not.toContain('Filiz ve Üzeri Paketlerde');
    });

    it('çocuk adı HTML kaçışlıdır', () => {
        const evil = buildWeeklyReportHTML({ ...rich, childName: '<img src=x onerror=alert(1)>' }, true, 'teacher');
        expect(evil).not.toContain('<img src=x');
        expect(evil).toContain('&lt;img src=x');
    });

    it('varsayılan (veli) rapor değişmez: evde etkinlik + AI notu + teşvik var', () => {
        const parent = buildWeeklyReportHTML(rich, true);
        expect(parent).toContain('Haftalık Gelişim Raporu');
        expect(parent).toContain('Evde Ne Yapabilirsiniz');
        expect(parent).toContain('Uzman Değerlendirme Notu');
        expect(parent).toContain('Harika gidiyorsun');
        expect(parent).not.toContain('Paylaşım Notu');
    });
});

describe('buildWeeklyReportHTML — paket adları', () => {
    it('özet rapor (Tohum) kilitli bölümde "Premium" değil gerçek paket adlarını söyler', () => {
        const html = buildWeeklyReportHTML(sample, false);
        expect(html).not.toContain('Premium');
        expect(html).toContain('Filiz ve Üzeri Paketlerde');
        expect(html).toContain('Filiz, Fidan ve Orman');
        expect(html).toContain('childhoodtech.com');
    });

    it('detaylı rapor (Filiz+) etiketinde "Premium" geçmez', () => {
        const html = buildWeeklyReportHTML(sample, true);
        expect(html).not.toContain('Premium');
        expect(html).toContain('Detaylı Rapor');
    });
});
