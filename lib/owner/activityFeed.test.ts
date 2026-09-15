import {
    activeActorCount,
    mergeAndSort,
    ogrenciEklendiToEvent,
    ogretmenKayitToEvent,
    oyunSkoruToEvent,
    profilToEvent,
    sinifToEvent,
    uzmanKararlariniCikar,
} from './activityFeed';

describe('activityFeed dönüştürme fonksiyonları', () => {
    describe('oyunSkoruToEvent', () => {
        it('oyun_skorlari satırını cocuk_veli olayına çevirir', () => {
            const event = oyunSkoruToEvent({
                id: 1,
                created_at: '2026-09-10T10:00:00Z',
                ogrenci_adi: 'Ayşe',
                ogrenci_yasi: 48,
                email: 'veli@test.com',
                oyun_turu: 'hafiza',
                sure: 42,
                hata_sayisi: 2,
            });
            expect(event.role).toBe('cocuk_veli');
            expect(event.type).toBe('oyun_oynadi');
            expect(event.actorKey).toBe('veli@test.com');
            expect(event.title).toContain('Ayşe');
            expect(event.title).toContain('hafiza');
            expect(event.subtitle).toBe('42 sn · 2 hata');
        });
    });

    describe('uzmanKararlariniCikar', () => {
        it('her uzman oyunu ayrı bir uzman olayına çevirir', () => {
            const events = uzmanKararlariniCikar({
                id: 5,
                created_at: '2026-09-10T10:00:00Z',
                ogrenci_adi: 'Mehmet',
                uzman_oylamalari: {
                    'Ayşe Hoca': { oy: 'onay', tarih: '2026-09-11T09:00:00Z' },
                    'Can Hoca': { oy: 'revize', gerekce: 'kod yanlış', tarih: '2026-09-11T10:00:00Z' },
                },
            });
            expect(events).toHaveLength(2);
            expect(events[0].role).toBe('uzman');
            expect(events[0].actorLabel).toBe('Ayşe Hoca');
            expect(events[0].title).toContain('onayladı');
            expect(events[1].actorLabel).toBe('Can Hoca');
            expect(events[1].title).toContain('revize istedi');
            expect(events[1].subtitle).toBe('kod yanlış');
        });

        it('eski (bare string) oy biçimini de destekler ama tarih olmadığı için atlar', () => {
            const events = uzmanKararlariniCikar({
                id: 6,
                created_at: '2026-09-10T10:00:00Z',
                uzman_oylamalari: { 'Eski Uzman': 'onay' as any },
            });
            expect(events).toHaveLength(0);
        });

        it('uzman_oylamalari boşsa boş dizi döner', () => {
            expect(uzmanKararlariniCikar({ id: 7, created_at: '2026-09-10T10:00:00Z' })).toEqual([]);
        });
    });

    describe('profilToEvent', () => {
        it('created_at yoksa null döner (savunmacı)', () => {
            expect(profilToEvent({ email: 'x@test.com' })).toBeNull();
        });

        it('created_at varsa veli_kayit_oldu olayı üretir', () => {
            const event = profilToEvent({
                email: 'veli@test.com',
                child_name: 'Zeynep',
                parent_name: 'Fatma',
                child_age_months: 36,
                created_at: '2026-09-01T00:00:00Z',
            });
            expect(event?.role).toBe('cocuk_veli');
            expect(event?.type).toBe('veli_kayit_oldu');
            expect(event?.title).toContain('Fatma');
            expect(event?.title).toContain('Zeynep');
        });
    });

    describe('sinifToEvent', () => {
        it('created_at yoksa null döner', () => {
            expect(sinifToEvent({ id: 'c1', name: 'Kelebekler', teacher_id: 't1' })).toBeNull();
        });

        it('öğretmen adı verilirse başlığa yansır', () => {
            const event = sinifToEvent(
                { id: 'c1', name: 'Kelebekler', teacher_id: 't1', created_at: '2026-09-05T00:00:00Z' },
                'Ali Öğretmen'
            );
            expect(event?.role).toBe('ogretmen');
            expect(event?.title).toContain('Ali Öğretmen');
            expect(event?.title).toContain('Kelebekler');
        });
    });

    describe('ogrenciEklendiToEvent', () => {
        it('added_at yoksa null döner', () => {
            expect(ogrenciEklendiToEvent({ id: 's1', class_id: 'c1', child_email: 'a@test.com' }, {})).toBeNull();
        });

        it('çocuk adı biliniyorsa başlıkta gösterir', () => {
            const event = ogrenciEklendiToEvent(
                { id: 's1', class_id: 'c1', child_email: 'a@test.com', added_at: '2026-09-06T00:00:00Z' },
                { className: 'Kelebekler', teacherId: 't1', ogretmenAdi: 'Ali Öğretmen', childName: 'Ahmet' }
            );
            expect(event?.role).toBe('ogretmen');
            expect(event?.title).toContain('Ahmet');
            expect(event?.title).toContain('Kelebekler');
        });
    });

    describe('ogretmenKayitToEvent', () => {
        it('created_at yoksa null döner (teachers.created_at belirsizliği)', () => {
            expect(ogretmenKayitToEvent({ user_id: 't1', name: 'Ali' })).toBeNull();
        });
    });

    describe('mergeAndSort', () => {
        it('birden çok listeyi birleştirir, en yeni önce sıralar, null değerleri atar', () => {
            const older = oyunSkoruToEvent({ id: 1, created_at: '2026-09-01T00:00:00Z', ogrenci_adi: 'A' });
            const newer = oyunSkoruToEvent({ id: 2, created_at: '2026-09-10T00:00:00Z', ogrenci_adi: 'B' });
            const result = mergeAndSort([older], [newer, null]);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('skor:2'); // en yeni once
            expect(result[1].id).toBe('skor:1');
        });
    });

    describe('activeActorCount', () => {
        it('sadece belirtilen rol ve zaman aralığındaki benzersiz actorKey sayısını sayar', () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-09-15T00:00:00Z'));
            const events = [
                oyunSkoruToEvent({ id: 1, created_at: '2026-09-14T00:00:00Z', email: 'a@test.com' }), // 1 gün önce
                oyunSkoruToEvent({ id: 2, created_at: '2026-09-14T00:00:00Z', email: 'a@test.com' }), // aynı kişi tekrar
                oyunSkoruToEvent({ id: 3, created_at: '2026-08-01T00:00:00Z', email: 'b@test.com' }), // çok eski
            ];
            expect(activeActorCount(events, 'cocuk_veli', 7)).toBe(1);
            jest.useRealTimers();
        });
    });
});
