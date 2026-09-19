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
