import { GameData, ReportEngine } from './ReportEngine';

// Supabase, ölçülmeyen sütunları undefined değil null döndürür (services/gameResults.ts `?? null` yazar).
// Gerçek satırlar bu şekildedir; rapor motoru null'ı "ölçülmüş 0" saymamalı.
const row = (over: Partial<GameData> = {}): GameData => ({
    created_at: '2026-09-18T10:00:00.000Z',
    oyun_turu: 'hafiza',
    correct_answers: 8,
    hata_sayisi: 2,
    sure: 60,
    response_time: null,
    visual_attention_score: null,
    ...over,
});

const value = (games: GameData[], category: string) =>
    ReportEngine.generateParentReport('Deniz', games).radarChartData.find(d => d.category === category)!.value;

describe('ReportEngine.generateParentReport — null ölçümler', () => {
    const nullRows = [row(), row(), row(), row()];

    it('görsel dikkat ölçülmemişse 0 değil hata oranına dayalı değeri kullanır', () => {
        // 4 oyun × (8 doğru, 2 hata) → hata oranı %20 → 80
        expect(value(nullRows, 'visualAttention')).toBe(80);
    });

    it('tepki süresi ölçülmemişse varsayılan 3 sn ile hesaplar (100 = "çok hızlı" sahte güçlü yön olmaz)', () => {
        // varsayılan 3000 ms → 100 - 3000/50 = 40
        expect(value(nullRows, 'responseSpeed')).toBe(40);
    });

    it('null ölçümlü verilerde Tepki Hızı en güçlü yön olarak öne çıkmaz', () => {
        const { strengths } = ReportEngine.generateParentReport('Deniz', nullRows);
        expect(strengths.join(' ')).not.toContain('Tepki Hızı');
    });

    it('gerçek ölçümler hâlâ kullanılır (0 geçerli bir ölçümdür)', () => {
        expect(value([row({ visual_attention_score: 90 }), row({ visual_attention_score: 70 })], 'visualAttention')).toBe(80);
        expect(value([row({ visual_attention_score: 0 })], 'visualAttention')).toBe(0);
        expect(value([row({ response_time: 1000 }), row({ response_time: 1000 })], 'responseSpeed')).toBe(80);
    });

    it('ölçülenle ölçülmeyen karışık satırlarda yalnız ölçülenler ortalamaya girer', () => {
        // null satır sayılmaz: sadece 1000 ms → 100 - 20 = 80
        expect(value([row({ response_time: 1000 }), row()], 'responseSpeed')).toBe(80);
    });

    it('seviye null ise problem çözme varsayılan 50 kalır', () => {
        expect(value([row({ seviye: null as unknown as undefined })], 'problemSolving')).toBe(50);
    });
});
