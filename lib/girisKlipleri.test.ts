import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Giriş yönergesi (CountdownOverlay) ve 'Tekrar Dinle' metinlerinin hazır klibi (klon ses) olmalı; klip yoksa konuşma
// sessiz kalır ya da yabancı (canlı proxy) sese düşer, çocuk yönergeyi duymaz. Oyun kayıtlarına/bileşenlere yazılan
// sabit metinler kaynak koddan taranır ve lib/ttsAssets.ts anahtarlarıyla karşılaştırılır.

// services/speechService.ts ttsSlug kuralının test kopyası (o modül expo-av'a bağlı).
const slug = (t: string) =>
    t
        .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's').replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u').replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const ROOT = join(__dirname, '..');
const oku = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8').split('\r\n').join('\n');

interface Bulunan { dosya: string; metin: string; tur: string }

function girisMetinleri(): Bulunan[] {
    const out: Bulunan[] = [];
    const reg = oku('components', 'gameRegistry.tsx');
    for (const m of reg.matchAll(/introMessage="([^"]+)"/g)) out.push({ dosya: 'gameRegistry.tsx', metin: m[1], tur: 'introMessage' });
    for (const f of readdirSync(join(ROOT, 'components')).filter((x) => x.endsWith('.tsx'))) {
        const s = oku('components', f);
        for (const m of s.matchAll(/<CountdownOverlay[\s\S]*?message=(?:"([^"]+)"|\{?'([^']+)'\}?)/g)) {
            out.push({ dosya: f, metin: (m[1] ?? m[2]) as string, tur: 'CountdownOverlay' });
        }
        for (const m of s.matchAll(/introMessage\s*=\s*'([^']+)'/g)) out.push({ dosya: f, metin: m[1], tur: 'varsayılan' });
    }
    return out;
}

describe('giriş yönergesi klipleri', () => {
    const anahtarlar = new Set(
        [...oku('lib', 'ttsAssets.ts').matchAll(/^\s*'([^']+)':\s*require/gm)].map((m) => m[1]),
    );

    it('kaynak koddan metinler bulunuyor (tarama bozulmadı)', () => {
        expect(girisMetinleri().length).toBeGreaterThan(80);
    });

    it('her giriş / Tekrar Dinle metninin hazır klibi var', () => {
        const eksik = girisMetinleri()
            .filter((x) => !anahtarlar.has(slug(x.metin)))
            .map((x) => `${x.dosya} [${x.tur}]: ${x.metin}`);
        expect(eksik).toEqual([]);
    });
});
