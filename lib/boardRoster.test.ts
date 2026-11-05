import { readFileSync } from 'fs';
import { join } from 'path';
import {
    ageParts,
    buildPlayers,
    firstNameOf,
    loadBoardClasses,
    loadBoardRoster,
    pickClassId,
    playerAgeMonths,
    type RosterRow,
} from './boardRoster';
import { OGRETMEN_TIER_FLAGS } from './subscriptionTiers';

const satir = (id: string, ad: string | null, ek: Partial<RosterRow> = {}): RosterRow => ({
    student_id: id,
    status: 'accepted',
    child_name: ad,
    child_age_months: 50,
    hidden: false,
    ...ek,
});

describe('firstNameOf', () => {
    it('yalnız ilk sözcüğü alır; fazla boşluk, sekme ve satır sonunu yok sayar', () => {
        expect(firstNameOf('Elif Yılmaz')).toBe('Elif');
        expect(firstNameOf('  Ayşe   Nur ')).toBe('Ayşe');
        expect(firstNameOf('Elif\tYılmaz')).toBe('Elif');
        expect(firstNameOf('Mert\nDemir')).toBe('Mert');
    });

    it('boş ya da bilinmeyen addan boş metin döner', () => {
        expect(firstNameOf('')).toBe('');
        expect(firstNameOf('   ')).toBe('');
        expect(firstNameOf(null)).toBe('');
        expect(firstNameOf(undefined)).toBe('');
    });

    it('uzun adı 14 karakterde keser; emoji gibi çift kodlu karakterleri ortadan bölmez', () => {
        expect(Array.from(firstNameOf('Abdurrahmanhasanefendi')).length).toBe(14);
        const emoji = firstNameOf('😀'.repeat(20));
        expect(Array.from(emoji).length).toBe(14);
        expect(emoji).toBe('😀'.repeat(14));
    });
});

describe('buildPlayers', () => {
    it('yalnız onaylı, kardeşli olmayan, adı ve kimliği olan çocukları alır; kalanını sayar', () => {
        const { players, excluded } = buildPlayers([
            satir('a', 'Elif Yılmaz'),
            satir('b', 'Veli Bekleyen', { status: 'pending' }),
            satir('c', 'Askıdaki', { status: 'suspended' }),
            satir('d', 'Kardeşli', { hidden: true }),
            satir('e', null),
            satir('f', '   '),
            { status: 'accepted', child_name: 'Kimliksiz', child_age_months: 50 },
            satir('g', 'Mert Demir'),
        ]);
        expect(players.map((p) => p.id).sort()).toEqual(['a', 'g']);
        expect(excluded).toBe(6);
    });

    it('tahta belleğine yalnız kimlik, ilk ad ve yaş girer (e-posta, soyad, oyun sayısı yok)', () => {
        const { players } = buildPlayers([{ ...satir('a', 'Elif Yılmaz'), student_email: 'veli@ornek.com', game_count: 12 } as RosterRow]);
        expect(players).toEqual([{ id: 'a', name: 'Elif', ageMonths: 50 }]);
        expect(Object.keys(players[0]).sort()).toEqual(['ageMonths', 'id', 'name']);
        expect(JSON.stringify(players)).not.toMatch(/veli@|Yılmaz/);
    });

    it('aynı ilk ad: ikinci sözcüğün baş harfi eklenir; yetmezse sıra numarası', () => {
        const baş = buildPlayers([satir('1', 'Elif Yılmaz'), satir('2', 'Elif Kaya')]).players.map((p) => p.name);
        expect(baş).toEqual(['Elif K.', 'Elif Y.']);

        const ayniBas = buildPlayers([satir('1', 'Elif Yılmaz'), satir('2', 'Elif Yıldız')]).players;
        expect(ayniBas.map((p) => p.name)).toEqual(['Elif (1)', 'Elif (2)']);
        expect(new Set(ayniBas.map((p) => p.id)).size).toBe(2);

        expect(buildPlayers([satir('1', 'Elif'), satir('2', 'Elif Kaya')]).players.map((p) => p.name)).toEqual(['Elif', 'Elif K.']);
        expect(buildPlayers([satir('1', 'Elif'), satir('2', 'Elif')]).players.map((p) => p.name)).toEqual(['Elif (1)', 'Elif (2)']);
    });

    it('aynı ilk adı büyük/küçük harften bağımsız eşleştirir ve farklı adlara ek getirmez', () => {
        expect(buildPlayers([satir('1', 'elif Kaya'), satir('2', 'Elif Demir')]).players.map((p) => p.name).sort()).toEqual(['Elif D.', 'elif K.']);
        expect(buildPlayers([satir('1', 'Elif Kaya'), satir('2', 'Mert Kaya')]).players.map((p) => p.name)).toEqual(['Elif', 'Mert']);
    });

    it('Türkçe alfabe sırasıyla dizer', () => {
        const adlar = buildPlayers([satir('1', 'Zeynep'), satir('2', 'Ömer'), satir('3', 'Çağan'), satir('4', 'Ahmet')]).players.map((p) => p.name);
        expect(adlar).toEqual(['Ahmet', 'Çağan', 'Ömer', 'Zeynep']);
    });

    it('yaş: geçerli sayı yuvarlanır; sıfır, negatif, bozuk ya da eksik yaş null olur', () => {
        const yas = (v: unknown) => buildPlayers([satir('1', 'Elif', { child_age_months: v as number })]).players[0].ageMonths;
        expect(yas(52)).toBe(52);
        expect(yas(52.6)).toBe(53);
        for (const bozuk of [0, -3, Number.NaN, Number.POSITIVE_INFINITY, null, undefined, '50']) expect(yas(bozuk)).toBeNull();
    });

    it('boş listeden boş sonuç', () => {
        expect(buildPlayers([])).toEqual({ players: [], excluded: 0 });
    });
});

describe('playerAgeMonths / ageParts', () => {
    it('çocuğun yaşı oyunların desteklediği aralığa (36-72 ay) çekilir; yaş yoksa sınıfın yaş grubu kullanılır', () => {
        expect(playerAgeMonths({ ageMonths: 52 }, 4)).toBe(52);
        expect(playerAgeMonths({ ageMonths: 30 }, 4)).toBe(36);
        expect(playerAgeMonths({ ageMonths: 90 }, 4)).toBe(72);
        expect(playerAgeMonths({ ageMonths: null }, 4)).toBe(54);
        expect(playerAgeMonths(null, 5)).toBe(66);
        expect(playerAgeMonths(null, 3)).toBe(42);
    });

    it('ayı yıl + aya böler ve bozuk girdide sıfıra düşer', () => {
        expect(ageParts(54)).toEqual({ years: 4, months: 6 });
        expect(ageParts(48)).toEqual({ years: 4, months: 0 });
        expect(ageParts(0)).toEqual({ years: 0, months: 0 });
        expect(ageParts(Number.NaN)).toEqual({ years: 0, months: 0 });
        expect(ageParts(-5)).toEqual({ years: 0, months: 0 });
    });
});

describe('pickClassId', () => {
    const siniflar = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    it('hatırlanan sınıf listedeyse o; yoksa ilk sınıf; sınıf yoksa null', () => {
        expect(pickClassId(siniflar, 'b')).toBe('b');
        expect(pickClassId(siniflar, 'silinmis')).toBe('a');
        expect(pickClassId(siniflar, null)).toBe('a');
        expect(pickClassId(siniflar, undefined)).toBe('a');
        expect(pickClassId([], 'a')).toBeNull();
    });
});

describe('sunucudan okuma', () => {
    function sinifIstemcisi(sonuc: { data?: unknown; error?: unknown; throws?: boolean }) {
        const cagrilar: unknown[][] = [];
        const sorgu: Record<string, unknown> = {
            select: (c: string) => { cagrilar.push(['select', c]); return sorgu; },
            eq: (c: string, v: unknown) => { cagrilar.push(['eq', c, v]); return sorgu; },
            order: (c: string, o: unknown) => {
                cagrilar.push(['order', c, o]);
                if (sonuc.throws) throw new Error('ağ');
                return Promise.resolve({ data: sonuc.data ?? null, error: sonuc.error ?? null });
            },
        };
        return {
            cagrilar,
            client: { from: (t: string) => { cagrilar.push(['from', t]); return sorgu; }, rpc: () => { throw new Error('kullanılmamalı'); } },
        };
    }

    function rpcIstemcisi(sonuc: { data?: unknown; error?: unknown; throws?: boolean }) {
        const cagrilar: unknown[][] = [];
        return {
            cagrilar,
            client: {
                from: () => { throw new Error('kullanılmamalı'); },
                rpc: (fn: string, args: unknown) => {
                    cagrilar.push([fn, args]);
                    if (sonuc.throws) throw new Error('ağ');
                    return Promise.resolve({ data: sonuc.data ?? null, error: sonuc.error ?? null });
                },
            },
        };
    }

    it('sınıflar: öğretmenin KENDİ kullanıcı kimliğiyle süzülür, eskiden yeniye sıralanır, adlar kırpılır', async () => {
        const { client, cagrilar } = sinifIstemcisi({ data: [{ id: 'c1', name: '  Papatyalar ' }, { id: 'c2', name: null }, { name: 'kimliksiz' }, null] });
        expect(await loadBoardClasses(client, 'u1')).toEqual([{ id: 'c1', name: 'Papatyalar' }, { id: 'c2', name: '' }]);
        expect(cagrilar).toContainEqual(['from', 'classes']);
        expect(cagrilar).toContainEqual(['eq', 'teacher_id', 'u1']);
        expect(cagrilar).toContainEqual(['order', 'created_at', { ascending: true }]);
    });

    it('sınıflar: hata, dizi olmayan yanıt ya da ağ hatasında null (boş liste DEĞİL: yeniden denenebilsin)', async () => {
        expect(await loadBoardClasses(sinifIstemcisi({ error: { message: 'x' } }).client, 'u1')).toBeNull();
        expect(await loadBoardClasses(sinifIstemcisi({ data: { a: 1 } }).client, 'u1')).toBeNull();
        expect(await loadBoardClasses(sinifIstemcisi({ throws: true }).client, 'u1')).toBeNull();
        expect(await loadBoardClasses(sinifIstemcisi({ data: [] }).client, 'u1')).toEqual([]);
    });

    it('çocuklar: yalnız sunucu fonksiyonu çağrılır ve sonuç süzülerek okunur', async () => {
        const { client, cagrilar } = rpcIstemcisi({
            data: [
                { student_id: 's1', student_email: 'veli@ornek.com', status: 'accepted', child_name: 'Elif Yılmaz', child_age_months: 52, game_count: 4, hidden: false },
                { student_id: 's2', student_email: 'baska@ornek.com', status: 'pending', child_name: null, child_age_months: null, game_count: null, hidden: false },
            ],
        });
        const sonuc = await loadBoardRoster(client, 'c1');
        expect(sonuc).toEqual({ players: [{ id: 's1', name: 'Elif', ageMonths: 52 }], excluded: 1 });
        expect(cagrilar).toEqual([['teacher_class_roster', { p_class_id: 'c1' }]]);
        expect(JSON.stringify(sonuc)).not.toContain('ornek.com');
    });

    it('çocuklar: hata, dizi olmayan yanıt ya da ağ hatasında null', async () => {
        expect(await loadBoardRoster(rpcIstemcisi({ error: { message: 'x' } }).client, 'c1')).toBeNull();
        expect(await loadBoardRoster(rpcIstemcisi({ data: 'x' }).client, 'c1')).toBeNull();
        expect(await loadBoardRoster(rpcIstemcisi({ throws: true }).client, 'c1')).toBeNull();
    });
});

describe('paket bayrağı', () => {
    it('çocuk seçimi yalnız sınıf paketinde (Sınıf Bahçesi ile aynı sınır)', () => {
        expect(OGRETMEN_TIER_FLAGS.free.canUseBoardStudents).toBe(false);
        expect(OGRETMEN_TIER_FLAGS.cinar.canUseBoardStudents).toBe(true);
        expect(OGRETMEN_TIER_FLAGS.mese.canUseBoardStudents).toBe(true);
        for (const tier of ['free', 'cinar', 'mese'] as const) {
            expect(OGRETMEN_TIER_FLAGS[tier].canUseBoardStudents).toBe(OGRETMEN_TIER_FLAGS[tier].canUseRewardBoard);
        }
    });
});

describe('çocuk seçimi kaynak değişmezleri', () => {
    const oku = (yol: string) => readFileSync(join(__dirname, '..', yol), 'utf8');

    it('sınıf listesi yalnız sunucu fonksiyonundan okunur; ham öğrenci/skor tablosuna dokunulmaz, e-posta belleğe alınmaz', () => {
        const k = oku('lib/boardRoster.ts');
        expect(k).toContain("rpc('teacher_class_roster'");
        for (const yasak of ['oyun_skorlari', "from('class_students')", 'student_email', 'child_email', 'rest/v1']) expect(k).not.toContain(yasak);
        for (const yol of ['components/board/PlayerSheet.tsx', 'components/board/BoardPicker.tsx', 'components/board/BoardStage.web.tsx', 'app/tahta.tsx']) {
            const d = oku(yol);
            for (const yasak of ['student_email', 'child_email', 'oyun_skorlari', 'saveGameResult']) expect(d).not.toContain(yasak);
        }
    });

    it('sahte sınıf (?dev=1) yalnız __DEV__ sürümünde kullanılır', () => {
        const k = oku('lib/boardRoster.ts');
        expect(k).toContain('__DEV__ && dev ? devClasses()');
        expect(k).toContain('__DEV__ && dev ? devRoster(classId)');
        expect(oku('app/tahta.tsx')).toContain("const dev = __DEV__ && params.dev === '1'");
    });

    it('çocuk seçimi yalnız sınıf paketinde yüklenir (ücretsiz öğretmende hiçbir şey okunmaz)', () => {
        expect(oku('app/tahta.tsx')).toContain("enabled: access.phase === 'ready' && access.students && prefsReady");
        expect(oku('lib/boardRoster.ts')).toContain('if (!enabled) return;');
    });
});
