import { readFileSync } from 'fs';
import { join } from 'path';
import {
    EN_ALKISLAR,
    EN_BOYA_NESNELERI,
    enKlipMetinleri,
    boyaGorevi,
} from '../constants/ingilizceKelimeler';
import {
    EN_BOYA_GIRIS_MESAJI,
    EN_BOYA_KAZANIM_ODAGI,
    EN_BOYA_OYUN_ADI,
    EN_BOYA_TUR_SAYISI,
    TR_YONERGELER,
    alkisSec,
    buildRounds,
    degerlendir,
    renkBul,
    seededRng,
} from './enBoya';

const KAYNAK = readFileSync(join(__dirname, '..', 'components', 'EnglishBoya.tsx'), 'utf8').replace(/\r\n/g, '\n');
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

describe('Boya: tur kurulumu', () => {
    it('tur sayısı 6-8 aralığında ve varsayılan 8', () => {
        expect(EN_BOYA_TUR_SAYISI).toBeGreaterThanOrEqual(6);
        expect(EN_BOYA_TUR_SAYISI).toBeLessThanOrEqual(8);
        expect(buildRounds(seededRng(1))).toHaveLength(EN_BOYA_TUR_SAYISI);
    });

    it('aynı nesne art arda gelmez (300 tohum)', () => {
        for (const s of SEEDS) {
            const t = buildRounds(seededRng(s));
            for (let i = 1; i < t.length; i++) expect(t[i].nesne.id).not.toBe(t[i - 1].nesne.id);
        }
    });

    it('nesneler dengeli dağılır: 6 nesnenin hepsi çıkar, hiçbiri 2 kereden fazla değil', () => {
        for (const s of SEEDS) {
            const sayim = new Map<string, number>();
            for (const x of buildRounds(seededRng(s))) sayim.set(x.nesne.id, (sayim.get(x.nesne.id) ?? 0) + 1);
            expect(sayim.size).toBe(EN_BOYA_NESNELERI.length);
            for (const n of sayim.values()) expect(n).toBeLessThanOrEqual(2);
        }
    });

    it('aynı (nesne, hedef renk) çifti bir oyunda tekrarlanmaz', () => {
        for (const s of SEEDS) {
            const ciftler = buildRounds(seededRng(s)).map((x) => `${x.nesne.id}/${x.hedef.id}`);
            expect(new Set(ciftler).size).toBe(ciftler.length);
        }
    });

    it('palet = nesnenin 3 rengi (hedef dahil, tekrarsız); görev cümlesi veri dosyasındaki cümle', () => {
        for (const s of SEEDS) {
            for (const x of buildRounds(seededRng(s))) {
                expect(x.secenekler).toHaveLength(3);
                expect(x.secenekler.map((r) => r.id).sort()).toEqual([...x.nesne.renkler].sort());
                expect(x.secenekler.map((r) => r.id)).toContain(x.hedef.id);
                expect(x.gorev).toBe(boyaGorevi(x.nesne, x.hedef));
                for (const r of x.secenekler) expect(r.hex).toMatch(/^#[0-9A-F]{6}$/i);
            }
        }
    });

    it('hedefin paletteki konumu rastgele: üç konum da kullanılır, hepsi makul sıklıkta', () => {
        const konum = [0, 0, 0];
        let toplam = 0;
        for (const s of SEEDS) {
            for (const x of buildRounds(seededRng(s))) {
                konum[x.secenekler.findIndex((r) => r.id === x.hedef.id)]++;
                toplam++;
            }
        }
        for (const k of konum) expect(k / toplam).toBeGreaterThan(0.22);
    });

    it('hedef renk bir önceki turdakiyle (mümkünse) aynı olmaz: 300 oyunda ardışık aynı renk azınlıkta', () => {
        let ayni = 0;
        let cift = 0;
        for (const s of SEEDS) {
            const t = buildRounds(seededRng(s));
            for (let i = 1; i < t.length; i++) { cift++; if (t[i].hedef.id === t[i - 1].hedef.id) ayni++; }
        }
        expect(ayni / cift).toBeLessThan(0.15);
    });

    it('aynı tohum aynı oyunu, farklı tohum farklı oyunu verir (test edilebilir RNG)', () => {
        const a = buildRounds(seededRng(42)).map((x) => x.gorev).join('|');
        expect(buildRounds(seededRng(42)).map((x) => x.gorev).join('|')).toBe(a);
        const farkli = new Set(SEEDS.map((s) => buildRounds(seededRng(s)).map((x) => x.gorev).join('|')));
        expect(farkli.size).toBeGreaterThan(200);
    });

    it('RNG uç değerlerinde (0 ve 0.999999) çökmez, geçerli tur verir', () => {
        for (const v of [0, 0.999999]) {
            const t = buildRounds(() => v);
            expect(t).toHaveLength(EN_BOYA_TUR_SAYISI);
            for (let i = 1; i < t.length; i++) expect(t[i].nesne.id).not.toBe(t[i - 1].nesne.id);
        }
    });
});

describe('Boya: değerlendirme ve söylenen metinler', () => {
    it('yalnız hedef renk doğru; diğer ikisi yanlış', () => {
        const [x] = buildRounds(seededRng(7));
        for (const r of x.secenekler) expect(degerlendir(x, r.id)).toBe(r.id === x.hedef.id ? 'dogru' : 'yanlis');
    });

    it('söylenen tüm İngilizce metinlerin klibi veri dosyasının klip listesinde (görev, renk adı, alkış)', () => {
        const klipler = new Set(enKlipMetinleri());
        for (const s of SEEDS.slice(0, 50)) {
            for (const x of buildRounds(seededRng(s))) {
                expect(klipler.has(x.gorev)).toBe(true);
                expect(klipler.has(x.hedef.en)).toBe(true);
            }
        }
        for (const a of EN_ALKISLAR) expect(klipler.has(a)).toBe(true);
    });

    it('alkış her zaman veri dosyasındaki listeden; liste uçlarına ulaşılır', () => {
        expect(EN_ALKISLAR).toContain(alkisSec());
        expect(alkisSec(() => 0)).toBe(EN_ALKISLAR[0]);
        expect(alkisSec(() => 0.999999)).toBe(EN_ALKISLAR[EN_ALKISLAR.length - 1]);
    });

    it('renkBul bilinmeyen rengi sessizce yutmaz', () => {
        expect(renkBul('red').hex).toBeTruthy();
        expect(() => renkBul('turkuaz')).toThrow();
    });
});

describe('Boya: kurallar (Maarif dışı ek etkinlik, çocuğa yazı/puan yok)', () => {
    it('oyun adı en-boya; kazanimOdagi Maarif kodu içermez ve belirlenen biçimde', () => {
        expect(EN_BOYA_OYUN_ADI).toBe('en-boya');
        expect(EN_BOYA_KAZANIM_ODAGI.startsWith('Ek etkinlik (Maarif dışı): İngilizce — ')).toBe(true);
        expect(EN_BOYA_KAZANIM_ODAGI).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,6}\.\d/);
    });

    it('TR_YONERGELER dışa aktarılır, giriş mesajıyla aynıdır ve "zorlaşır" demez', () => {
        expect(TR_YONERGELER).toEqual([EN_BOYA_GIRIS_MESAJI]);
        expect(TR_YONERGELER.join(' ')).not.toMatch(/zorla|başardıkça/i);
        expect(KAYNAK).toMatch(/export \{ TR_YONERGELER \};/);
    });

    it('CountdownOverlay mesajı lib sabitiyle birebir aynı (klip üretimi bu metne bağlanır)', () => {
        expect(KAYNAK).toContain(`message="${EN_BOYA_GIRIS_MESAJI}"`);
    });

    it('bileşen oyunu kazanım kodu olmadan kaydeder (kazanimOdagi sabitten)', () => {
        expect(KAYNAK).toContain('kazanimOdagi: EN_BOYA_KAZANIM_ODAGI');
        expect(KAYNAK).not.toMatch(/\b(MAB|TAEOB|SDB|TADB|FAB|SAB|TAKB|MSB|HSAB)\.\d/);
    });

    it('çocuğa yazı yok: nesne/renk adları ve Türkçe karşılıklar JSX\'e girmez; tek <Text> yalnız ⭐', () => {
        expect(KAYNAK).not.toMatch(/\.tr\b/);
        expect(KAYNAK).not.toMatch(/\.emoji\b/);
        expect(KAYNAK).not.toMatch(/nesne\.en|hedef\.en\s*\}/);
        const metinler = KAYNAK.match(/<Text[\s>]/g) ?? [];
        expect(metinler).toHaveLength(1);
        expect(KAYNAK).toMatch(/<Text style=\{styles\.yildiz\}>⭐<\/Text>/);
    });

    it('hedef renk ekranda gösterilmez: görev cümlesi ve hedef yalnız speak/speakThenWait içinde kullanılır', () => {
        for (const m of KAYNAK.matchAll(/\btur\.(gorev|hedef)\b[^\n]*/g)) {
            const satir = m[0];
            const baglam = KAYNAK.slice(Math.max(0, m.index! - 120), m.index! + satir.length);
            const sesli = /speak(ThenWait)?\(/.test(baglam) || /degerlendir\(/.test(baglam);
            expect(sesli).toBe(true);
        }
    });

    it('çift dokunuş kilidi: lockRef kontrolü ve kapatma, hamle sayımından ve her işlemden ÖNCE', () => {
        const govde = KAYNAK.slice(KAYNAK.indexOf('const renkSec = '), KAYNAK.indexOf('const gorevTekrar = '));
        const kontrol = govde.indexOf('lockRef.current || finishedRef.current) return;');
        const kilit = govde.indexOf('lockRef.current = true;');
        const hamle = govde.indexOf('movesRef.current += 1;');
        expect(kontrol).toBeGreaterThan(-1);
        expect(kilit).toBeGreaterThan(kontrol);
        expect(hamle).toBeGreaterThan(kilit);
        // Doğru yolda kilit AÇILMAZ (yeni tur efekti açar); yanlış yolda zamanlayıcıyla açılır.
        expect(govde.match(/lockRef\.current = false;/g)).toHaveLength(1);
    });

    it('bitiş: onGameEnd yalnız finishedRef bayrağıyla ve yalnız son turda (tek çağrı yeri)', () => {
        expect(KAYNAK.match(/onGameEnd\(/g)).toHaveLength(1);
        expect(KAYNAK).toMatch(/if \(finishedRef\.current\) return;\s*finishedRef\.current = true;/);
        expect(KAYNAK).toMatch(/if \(bitisSirasi\) bitir\(\);/);
        // Bitiş tebriği kesilmesin: söküm yalnız bitmemişse konuşmayı keser.
        expect(KAYNAK).toMatch(/if \(!finishedRef\.current\) stopSpeech\(\);/);
    });

    it('her nesne için SVG çizimi var (Govde içinde case)', () => {
        const govde = KAYNAK.slice(KAYNAK.indexOf('function Govde('), KAYNAK.indexOf('function Arka('));
        for (const n of EN_BOYA_NESNELERI) expect(govde).toContain(`case '${n.id}':`);
    });
});
