import { buildWeeklyReport, buildWeeklyReportHTML, WeeklyReportData } from './weeklyReport';

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
    trend: null,
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
    aiTeacherNote: null,
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

const DUAL_AI = [
    '## BÖLÜM 1: MAARİF MODELİ PEDAGOJİK ANALİZ',
    '',
    'MAB.2 alanında yükselen trend.',
    '',
    '---',
    '',
    '## BÖLÜM 2: VELİ BİLGİLENDİRME NOTU',
    '',
    'Değerli Velimiz,',
    '',
    'Çocuğunuz sayılarda gelişiyor.',
    '',
    'Saygılarımızla,',
    'ChildhoodTech Ekibi',
].join('\n');

describe('kümülatif yapay zekâ notu hedef kitleye göre ayrılır', () => {
    const data = buildWeeklyReport('Deniz', 54, [], DUAL_AI);

    it('veri: aiNote yalnız veli notu, aiTeacherNote yalnız akademik kısım', () => {
        expect(data.aiNote).toContain('Değerli Velimiz');
        expect(data.aiNote).not.toContain('MAB.2');
        expect(data.aiTeacherNote).toContain('MAB.2');
        expect(data.aiTeacherNote).not.toContain('Değerli Velimiz');
    });

    it('veli PDF çıktısı yalnız veli notunu içerir (Maarif kodu / akademik metin yok)', () => {
        const html = buildWeeklyReportHTML(data, true, 'parent');
        expect(html).toContain('Uzman Değerlendirme Notu');
        expect(html).toContain('Değerli Velimiz');
        expect(html).not.toContain('MAB.2');
        expect(html).not.toContain('Yapay Zekâ Akademik Notu');
    });

    it('uzman notu, son 12 oyuna dayandığını ve haftalık pencereden farklı olabileceğini belirtir', () => {
        // Gerçek bir raporda AI notu (son 12 oyun) ve haftalık istatistikler (son 7 gün) farklı
        // oyunlara işaret edebiliyordu (bkz. kullanıcı ekran görüntüsü: not, o haftanın oyun
        // listesinde olmayan oyunlardan bahsediyordu) — bu netleştirme metni o karışıklığı önler.
        const html = buildWeeklyReportHTML(data, true, 'parent');
        expect(html).toContain('son 12 oyun');
        expect(html).toContain('yalnızca bu haftaya değil');
    });

    it('öğretmen özeti yalnız akademik notu içerir (veli notu yok) ve yapay zekâ uyarısını taşır', () => {
        const html = buildWeeklyReportHTML(data, true, 'teacher');
        expect(html).toContain('Yapay Zekâ Akademik Notu');
        expect(html).toContain('MAB.2');
        expect(html).toContain('uzman değerlendirmesi yerine geçmez');
        expect(html).not.toContain('Değerli Velimiz');
        expect(html).not.toContain('Saygılarımızla');
    });

    it('AI notu yoksa iki PDF de o bölümü göstermez', () => {
        const none = buildWeeklyReport('Deniz', 54, [], null);
        expect(buildWeeklyReportHTML(none, true, 'parent')).not.toContain('Uzman Değerlendirme Notu');
        expect(buildWeeklyReportHTML(none, true, 'teacher')).not.toContain('Yapay Zekâ Akademik Notu');
    });
});

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

describe('geçen haftayla karşılaştırma (trend)', () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
    const game = (created_at: string, correct_answers: number) => ({ created_at, oyun_turu: 'hafiza', correct_answers, hata_sayisi: 0 });

    it('iki haftalık veri varsa (ve daha eski bir kayıt önceki haftayı da doğruluyorsa) trend hesaplanır', () => {
        const scores = [
            game(daysAgo(0), 8), game(daysAgo(1), 8), game(daysAgo(2), 8),   // bu hafta: 3 oyun, %80
            game(daysAgo(8), 5), game(daysAgo(9), 5),                        // geçen hafta: 2 oyun, %50
            game(daysAgo(20), 5),                                            // yalnızca "geçen haftadan önce de veri var" görünürlüğü için
        ];
        const r = buildWeeklyReport('Deniz', 54, scores);
        expect(r.trend).not.toBeNull();
        expect(r.trend!.gamesDelta).toBe(1);        // 3 - 2
        expect(r.trend!.successDelta).toBe(30);     // 80 - 50
        expect(r.trend!.activeDaysDelta).toBe(1);   // 3 - 2
        expect(r.trend!.prevGamesCount).toBe(2);
        expect(r.trend!.prevAvgSuccess).toBe(50);
    });

    it('önceki haftaya dair hiç görünürlük yoksa (veri yalnız bu haftayı kapsıyorsa) trend null döner', () => {
        // "geçen hafta 0 oyun" demek, veri eksikliğini gerçek bir düşüş gibi göstermemeli.
        const scores = [game(daysAgo(0), 8), game(daysAgo(1), 8)];
        const r = buildWeeklyReport('Deniz', 54, scores);
        expect(r.trend).toBeNull();
    });

    it('bu hafta hiç oyun yoksa (son-12-oyun yedeğine düşülse bile) trend null döner', () => {
        // hasWeekData=false iken source "bu hafta" değildir — farklı iki pencereyi karşılaştırmamalı.
        const scores = [game(daysAgo(10), 8), game(daysAgo(11), 8), game(daysAgo(20), 5)];
        const r = buildWeeklyReport('Deniz', 54, scores);
        expect(r.hasWeekData).toBe(false);
        expect(r.trend).toBeNull();
    });

    it('PDF, trend varsa değişim okunu ve geçen-hafta açıklamasını gösterir', () => {
        const scores = [
            game(daysAgo(0), 8), game(daysAgo(1), 8), game(daysAgo(2), 8),
            game(daysAgo(8), 5), game(daysAgo(9), 5),
            game(daysAgo(20), 5),
        ];
        const r = buildWeeklyReport('Deniz', 54, scores);
        const html = buildWeeklyReportHTML(r, true, 'parent');
        expect(html).toContain('▲ +1');
        expect(html).toContain('önceki 7 güne göre değişimi gösterir');
    });

    it('trend yoksa PDF hiçbir değişim okunu / açıklamasını göstermez', () => {
        // .stat-trend CSS kuralı stil sayfasında HER ZAMAN vardır (kullanılsa da kullanılmasa da);
        // asıl kanıt gövdede gerçek bir ok/rakam elementinin (class="stat-trend ...") olmamasıdır.
        const html = buildWeeklyReportHTML(sample, true);
        expect(html).not.toContain('class="stat-trend');
        expect(html).not.toContain('önceki 7 güne göre değişimi gösterir');
    });
});
