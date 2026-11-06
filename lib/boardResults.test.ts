import { readFileSync } from 'fs';
import { join } from 'path';
import { sanitizeBoardResult, type BoardResult } from './boardMode';
import { devSaveOutcome, outcomeOf, saveBoardResult, saveRpcArgs } from './boardResults';

const sonuc: BoardResult = sanitizeBoardResult({
    oyunAdi: 'akilli-cikarma', sure: 30, hamle: 10, hata: 2, correct: 8, zorluk: 2, kazanim: 'MAB.1', deneme: 1, roundHistory: '[1]',
})!;

describe('saveRpcArgs', () => {
    it('yalnız sınıf kaydının kimliği + sonuç gider; çocuğun adı/e-postası/yaşı istemciden GÖNDERİLMEZ', () => {
        const args = saveRpcArgs('sid-1', sonuc);
        expect(args).toEqual({
            p_student_id: 'sid-1', p_oyun_turu: 'akilli-cikarma', p_sure: 30, p_hamle: 10, p_hata: 2, p_correct_answers: 8, p_zorluk: 2,
            p_kazanim: 'MAB.1', p_deneme: 1, p_distance_effect: null, p_response_time: null, p_cognitive_speed: null, p_visual_attention: null,
            p_round_history: '[1]',
        });
        expect(Object.keys(args).join(' ')).not.toMatch(/email|name|p_ad\b|yas|cizim/);
    });

    it('parametre adları sunucu fonksiyonuyla (add_board_results.sql) birebir ve aynı sırada', () => {
        const sql = readFileSync(join(__dirname, '..', 'supabase_migrations', 'add_board_results.sql'), 'utf8');
        const imza = sql.match(/FUNCTION public\.teacher_save_board_result\(([\s\S]*?)\)\s*RETURNS bigint/)![1];
        const sunucu = [...imza.matchAll(/\b(p_[a-z_]+)\s/g)].map((m) => m[1]);
        expect(sunucu).toHaveLength(14);
        expect(Object.keys(saveRpcArgs('x', sonuc))).toEqual(sunucu);
    });
});

describe('outcomeOf', () => {
    it('sunucu yanıtını kullanıcıya gösterilecek sonuca çevirir', () => {
        expect(outcomeOf(null)).toBe('saved');
        expect(outcomeOf(undefined)).toBe('saved');
        expect(outcomeOf({ code: 'PGRST202', message: 'x' })).toBe('unavailable');
        expect(outcomeOf({ message: 'Could not find the function public.teacher_save_board_result in the schema cache' })).toBe('unavailable');
        expect(outcomeOf({ message: 'rate_limited' })).toBe('limit');
        expect(outcomeOf({ message: 'not_found' })).toBe('denied');
        expect(outcomeOf({ message: 'invalid_argument' })).toBe('error');
        expect(outcomeOf({ code: '08006', message: 'connection failure' })).toBe('error');
    });
});

describe('saveBoardResult', () => {
    const fake = (res: { error?: unknown } | 'throw') => {
        const calls: [string, unknown][] = [];
        return {
            calls,
            client: {
                rpc: (fn: string, args: unknown) => {
                    calls.push([fn, args]);
                    if (res === 'throw') throw new Error('ağ');
                    return Promise.resolve({ data: 1, error: res.error ?? null });
                },
            },
        };
    };

    it('doğru fonksiyonu doğru argümanlarla çağırır ve sonucu çevirir; ağ hatası error olur', async () => {
        const f = fake({});
        expect(await saveBoardResult(f.client, 'sid-1', sonuc)).toBe('saved');
        expect(f.calls).toEqual([['teacher_save_board_result', saveRpcArgs('sid-1', sonuc)]]);
        expect(await saveBoardResult(fake({ error: { message: 'not_found' } }).client, 'sid-1', sonuc)).toBe('denied');
        expect(await saveBoardResult(fake({ error: { message: 'rate_limited' } }).client, 'sid-1', sonuc)).toBe('limit');
        expect(await saveBoardResult(fake({ error: { code: 'PGRST202', message: '' } }).client, 'sid-1', sonuc)).toBe('unavailable');
        expect(await saveBoardResult(fake('throw').client, 'sid-1', sonuc)).toBe('error');
    });
});

describe('devSaveOutcome (yalnız geliştirme)', () => {
    it('sahte sınıfta her durumu bir çocukla canlandırır; ilk hata ikinci denemede düzelir', () => {
        expect(devSaveOutcome('d1-1', 0)).toBe('saved');
        expect(devSaveOutcome('d1-3', 0)).toBe('error');
        expect(devSaveOutcome('d1-3', 1)).toBe('saved');
        expect(devSaveOutcome('d1-4', 0)).toBe('denied');
        expect(devSaveOutcome('d1-5', 0)).toBe('limit');
        expect(devSaveOutcome('d1-6', 0)).toBe('unavailable');
    });
});
